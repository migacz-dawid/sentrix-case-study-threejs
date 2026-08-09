/* ============================================
   SENTRIX — Attack sequence + HUD + animation loop

   File structure:
   4. Attack sequence (dramatic event)
   5. HUD/terminal sync
   Loop / Resize
   ============================================ */

import {
	scene,
	camera,
	renderer,
	COLOR_GREEN,
	COLOR_RED,
	COLOR_STEEL,
	COLOR_STEEL_DIM,
	nodes,
	connections,
	nodeMesh,
	dummy,
	tmpColor,
	glowSprites,
	lineGeometry,
	networkGroup,
	updatePackets,
} from './network.js'

// ---------- 4. ATTACK SEQUENCE ----------

let attackState = 'idle' // idle | infecting | spreading | quarantine | recovering
let attackTimer = 0
let attackNodeIndex = -1
let infectedSet = new Set()
let waveOrigin = null
let waveRadius = 0
let sinceLastAttack = 0
const ATTACK_INTERVAL = 14 // seconds between automatic attacks (demo loop)

const statusDot = document.getElementById('statusDot')
const navStatusVal = document.querySelector('.nav__status-val')
const hudThreat = document.getElementById('hudThreat')
const terminalBody = document.getElementById('terminalBody')

const logLine = (text, type = 'info') => {
	const line = document.createElement('div')
	line.className = `terminal__line terminal__line--${type}`
	line.textContent = text
	terminalBody.prepend(line)
	while (terminalBody.children.length > 6) {
		terminalBody.removeChild(terminalBody.lastChild)
	}
}

const setThreatUI = level => {
	if (level === 'high') {
		statusDot.classList.add('alert')
		navStatusVal.textContent = 'ZAGROŻENIE WYKRYTE'
		hudThreat.textContent = 'WYSOKI'
		hudThreat.classList.add('alert')
	} else if (level === 'recovering') {
		navStatusVal.textContent = 'IZOLACJA WĘZŁA'
		hudThreat.textContent = 'ŚREDNI'
	} else {
		statusDot.classList.remove('alert')
		navStatusVal.textContent = 'MONITOROWANIE'
		hudThreat.textContent = 'NISKI'
		hudThreat.classList.remove('alert')
	}
}

const triggerAttack = () => {
	if (attackState !== 'idle') return
	attackState = 'infecting'
	attackTimer = 0
	attackNodeIndex = Math.floor(Math.random() * nodes.length)
	infectedSet = new Set([attackNodeIndex])
	waveOrigin = nodes[attackNodeIndex].position.clone()
	waveRadius = 0

	nodes[attackNodeIndex].state = 'infected'
	logLine(`> anomalia wykryta: węzeł #${String(attackNodeIndex).padStart(3, '0')}`, 'alert')
	setThreatUI('high')
}

// Find each node's neighbours (for infection propagation)
const adjacency = nodes.map(() => [])
connections.forEach(c => {
	adjacency[c.a].push(c.b)
	adjacency[c.b].push(c.a)
})

const spreadInfection = () => {
	const frontier = [...infectedSet]
	frontier.forEach(idx => {
		adjacency[idx].forEach(n => {
			if (!infectedSet.has(n) && Math.random() < 0.4) {
				infectedSet.add(n)
				nodes[n].state = 'infected'
			}
		})
	})
}

const quarantine = () => {
	infectedSet.forEach(idx => {
		nodes[idx].state = 'quarantined'
	})
	logLine(`> ${infectedSet.size} węzłów odizolowanych automatycznie`, 'resolved')
	setThreatUI('recovering')
}

const recoverAll = () => {
	infectedSet.forEach(idx => {
		nodes[idx].state = 'normal'
	})
	infectedSet.clear()
	logLine('> sieć ustabilizowana. wznowiono normalny ruch.', 'info')
	setThreatUI('normal')
	attackState = 'idle'
	attackTimer = 0
	setSimulateButtonEnabled(true)
}

// ---- "Symuluj atak" button in hero ----
// Lets a recruiter trigger the sequence immediately instead of waiting for
// the automatic cycle (ATTACK_INTERVAL). Disabled while an attack is running,
// so two sequences can't overlap on the same network.
const simulateBtn = document.getElementById('simulateAttackBtn')

const setSimulateButtonEnabled = enabled => {
	if (!simulateBtn) return
	simulateBtn.disabled = !enabled
	simulateBtn.textContent = ''
	const label = document.createElement('span')
	label.textContent = enabled ? 'Symuluj atak ' : 'Atak w toku... '
	const bolt = document.createElement('span')
	bolt.className = 'hero__cta-bolt'
	bolt.textContent = '⚡'
	simulateBtn.appendChild(label)
	simulateBtn.appendChild(bolt)
}

if (simulateBtn) {
	simulateBtn.addEventListener('click', () => {
		if (attackState !== 'idle') return // extra guard, button is disabled anyway
		setSimulateButtonEnabled(false)
		sinceLastAttack = 0 // so the automatic cycle doesn't fire right after a manual attack
		triggerAttack()
	})
}

// Attack state machine - called every frame with delta time
const ATTACK_TIMINGS = {
	infecting: 0.4,
	spreading: 2.2,
	quarantine: 1.6,
	recovering: 2.0,
}

const updateAttack = delta => {
	if (attackState === 'idle') return
	attackTimer += delta

	if (attackState === 'infecting' && attackTimer > ATTACK_TIMINGS.infecting) {
		attackState = 'spreading'
		attackTimer = 0
		logLine('> analiza wzorca... rozprzestrzenianie wykryte', 'alert')
	} else if (attackState === 'spreading') {
		waveRadius += delta * 22
		if (attackTimer > 0.5 && attackTimer < 0.6) spreadInfection()
		if (attackTimer > 1.2 && attackTimer < 1.3) spreadInfection()
		if (attackTimer > ATTACK_TIMINGS.spreading) {
			attackState = 'quarantine'
			attackTimer = 0
			quarantine()
		}
	} else if (attackState === 'quarantine') {
		if (attackTimer > ATTACK_TIMINGS.quarantine) {
			attackState = 'recovering'
			attackTimer = 0
		}
	} else if (attackState === 'recovering') {
		if (attackTimer > ATTACK_TIMINGS.recovering) {
			recoverAll()
		}
	}
}

// Applies node color based on state + pulse
const applyNodeVisuals = elapsed => {
	nodes.forEach((node, i) => {
		let color = COLOR_STEEL
		let scale = node.isHub ? 1.6 : 1

		if (node.state === 'infected') {
			const pulse = 0.6 + Math.sin(elapsed * 14 + node.pulsePhase) * 0.4
			color = tmpColor.copy(COLOR_RED).multiplyScalar(0.7 + pulse * 0.5)
			scale *= 1.4 + pulse * 0.3
		} else if (node.state === 'quarantined') {
			color = COLOR_STEEL_DIM
			scale *= 0.7
		} else {
			const idlePulse = 0.85 + Math.sin(elapsed * 1.2 + node.pulsePhase) * 0.15
			color = tmpColor.copy(COLOR_STEEL).multiplyScalar(idlePulse)
		}

		nodeMesh.setColorAt(i, color)
		dummy.position.copy(node.position)
		dummy.scale.setScalar(scale)
		dummy.updateMatrix()
		nodeMesh.setMatrixAt(i, dummy.matrix)
	})
	nodeMesh.instanceMatrix.needsUpdate = true
	if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true

	// hub glow reacts to global state (gentle breathing, stronger during an attack)
	const glowBoost = attackState !== 'idle' ? 0.5 : 0
	glowSprites.forEach(({ node, sprite }) => {
		const base = 0.15 + Math.sin(elapsed * 1.5 + node.pulsePhase) * 0.08
		sprite.material.opacity = base + glowBoost
		sprite.material.color.copy(node.state === 'infected' ? COLOR_RED : COLOR_GREEN)
	})
}

// Line color reacts to infection of adjacent nodes
const applyLineVisuals = () => {
	const colorAttr = lineGeometry.attributes.color
	connections.forEach((c, i) => {
		const aInfected = nodes[c.a].state === 'infected'
		const bInfected = nodes[c.b].state === 'infected'
		const col = aInfected || bInfected ? COLOR_RED : COLOR_STEEL_DIM
		colorAttr.setXYZ(i * 2, col.r, col.g, col.b)
		colorAttr.setXYZ(i * 2 + 1, col.r, col.g, col.b)
	})
	colorAttr.needsUpdate = true
}

// ---------- 5. HUD DATA SYNC ----------

const hudNodesEl = document.getElementById('hudNodes')
const hudThroughputEl = document.getElementById('hudThroughput')
const hudUptimeEl = document.getElementById('hudUptime')

const startTime = performance.now()

const updateHud = () => {
	const activeNodes = nodes.filter(n => n.state !== 'quarantined').length
	hudNodesEl.textContent = activeNodes

	const throughput = (4.2 + Math.sin(performance.now() * 0.0006) * 0.6).toFixed(1)
	hudThroughputEl.textContent = `${throughput} TB/h`

	const elapsedMs = performance.now() - startTime
	const totalSec = Math.floor(elapsedMs / 1000)
	const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
	const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
	const s = String(totalSec % 60).padStart(2, '0')
	hudUptimeEl.textContent = `${h}:${m}:${s}`
}

// ---------- LOOP ----------

let lastTime = performance.now()

// Users with prefers-reduced-motion: we keep the network view itself (it's the
// key content of the page, not decoration), but disable the continuous group
// rotation and the automatic attack loop - the effect runs once and stops.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const animate = () => {
	requestAnimationFrame(animate)
	const now = performance.now()
	const delta = Math.min((now - lastTime) / 1000, 0.1)
	lastTime = now
	const elapsed = now / 1000

	if (!prefersReducedMotion) {
		// slow rotation of the whole network - gives the impression of a "living", observed system
		networkGroup.rotation.y += delta * 0.045
		networkGroup.rotation.x = Math.sin(elapsed * 0.08) * 0.08
	}

	updatePackets(delta)
	updateAttack(delta)
	applyNodeVisuals(elapsed)
	applyLineVisuals()
	updateHud()

	if (!prefersReducedMotion) {
		sinceLastAttack += delta
		if (sinceLastAttack > ATTACK_INTERVAL && attackState === 'idle') {
			sinceLastAttack = 0
			triggerAttack()
		}
	}

	renderer.render(scene, camera)
}

// First attack after a short delay, so the user gets to see the idle state.
// With reduced-motion we fire it once, also delayed, but without a repeating loop.
if (prefersReducedMotion) {
	setTimeout(triggerAttack, 2500)
} else {
	setTimeout(() => {
		sinceLastAttack = ATTACK_INTERVAL - 4
	}, 100)
}

animate()

// ---------- RESIZE ----------

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
})
