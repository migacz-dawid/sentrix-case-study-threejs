/* ============================================
   SENTRIX — Network visualization engine
   Three.js: network of nodes, data pulse, attack sequence.

   File structure:
   1. Scene setup
   2. Network generation (nodes + connections)
   3. Data pulse animation (idle state)
   ============================================ */

// THREE available globally from an earlier loaded <script> (three.global.js)

// ---------- 1. SCENE SETUP ----------

export const canvas = document.getElementById('net-canvas')
export const scene = new THREE.Scene()

export const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 34)

export const renderer = new THREE.WebGLRenderer({
	canvas,
	antialias: true,
	alpha: true,
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Colors synced with design tokens (style.css :root)
export const COLOR_GREEN = new THREE.Color(0x00e5a0)
export const COLOR_RED = new THREE.Color(0xff3b3b)
export const COLOR_STEEL = new THREE.Color(0x5b7a99)
export const COLOR_STEEL_DIM = new THREE.Color(0x2a3a4a)

// ---------- 2. NETWORK GENERATION ----------

const NODE_COUNT = 120
const RADIUS = 15

// Node placement on a sphere (even distribution, "fibonacci sphere")
// -> gives an organic but ordered shape, looks good from every angle.
const fibonacciSphere = (count, radius) => {
	const points = []
	const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle
	for (let i = 0; i < count; i++) {
		const y = 1 - (i / (count - 1)) * 2 // -1..1
		const r = Math.sqrt(1 - y * y)
		const theta = phi * i
		const x = Math.cos(theta) * r
		const z = Math.sin(theta) * r
		points.push(new THREE.Vector3(x * radius, y * radius, z * radius))
	}
	return points
}

const nodePositions = fibonacciSphere(NODE_COUNT, RADIUS)

// Each node: metadata for state (normal / infected / quarantined)
export const nodes = nodePositions.map((pos, i) => ({
	id: i,
	position: pos,
	state: 'normal', // normal | infected | quarantined
	pulsePhase: Math.random() * Math.PI * 2,
	isHub: false, // set after counting connections
}))

// Connections: each node links to its 2-3 nearest neighbours
const buildConnections = (nodes, maxPerNode = 3, maxDist = 9) => {
	const connections = []
	const degree = new Array(nodes.length).fill(0)

	for (let i = 0; i < nodes.length; i++) {
		const distances = []
		for (let j = 0; j < nodes.length; j++) {
			if (i === j) continue
			const d = nodes[i].position.distanceTo(nodes[j].position)
			if (d < maxDist) distances.push({ j, d })
		}
		distances.sort((a, b) => a.d - b.d)

		let added = 0
		for (const { j } of distances) {
			if (added >= maxPerNode) break
			if (degree[i] >= maxPerNode || degree[j] >= maxPerNode + 1) continue
			// avoid duplicate connections
			const exists = connections.some(c => (c.a === i && c.b === j) || (c.a === j && c.b === i))
			if (!exists) {
				connections.push({ a: i, b: j })
				degree[i]++
				degree[j]++
				added++
			}
		}
	}
	nodes.forEach((n, i) => {
		n.isHub = degree[i] >= 4
	})
	return connections
}

export const connections = buildConnections(nodes)

// ---- Node mesh (InstancedMesh for performance) ----
const nodeGeometry = new THREE.SphereGeometry(0.18, 12, 12)
const nodeMaterial = new THREE.MeshBasicMaterial({ color: COLOR_STEEL })
export const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, NODE_COUNT)
export const dummy = new THREE.Object3D()
export const tmpColor = new THREE.Color()

nodes.forEach((node, i) => {
	dummy.position.copy(node.position)
	const scale = node.isHub ? 1.6 : 1
	dummy.scale.setScalar(scale)
	dummy.updateMatrix()
	nodeMesh.setMatrixAt(i, dummy.matrix)
	nodeMesh.setColorAt(i, COLOR_STEEL)
})
nodeMesh.instanceMatrix.needsUpdate = true
scene.add(nodeMesh)

// ---- Glow halo around nodes (sprite, adds "glow" without post-processing) ----
const makeGlowTexture = () => {
	const size = 128
	const c = document.createElement('canvas')
	c.width = c.height = size
	const ctx = c.getContext('2d')
	const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
	grad.addColorStop(0, 'rgba(255,255,255,1)')
	grad.addColorStop(0.3, 'rgba(255,255,255,0.4)')
	grad.addColorStop(1, 'rgba(255,255,255,0)')
	ctx.fillStyle = grad
	ctx.fillRect(0, 0, size, size)
	return new THREE.CanvasTexture(c)
}
const glowTexture = makeGlowTexture()
const glowMaterial = new THREE.SpriteMaterial({
	map: glowTexture,
	color: COLOR_GREEN,
	transparent: true,
	opacity: 0,
	blending: THREE.AdditiveBlending,
	depthWrite: false,
})

// One glow sprite per node (hubs only, to keep the scene light)
export const glowSprites = []
nodes.forEach(node => {
	if (!node.isHub) return
	const sprite = new THREE.Sprite(glowMaterial.clone())
	sprite.position.copy(node.position)
	sprite.scale.setScalar(2.2)
	scene.add(sprite)
	glowSprites.push({ node, sprite })
})

// ---- Connection lines ----
const linePositions = new Float32Array(connections.length * 2 * 3)
const lineColors = new Float32Array(connections.length * 2 * 3)

connections.forEach((c, i) => {
	const a = nodes[c.a].position
	const b = nodes[c.b].position
	linePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6)
	const col = COLOR_STEEL_DIM
	lineColors.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6)
})

export const lineGeometry = new THREE.BufferGeometry()
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))
const lineMaterial = new THREE.LineBasicMaterial({
	vertexColors: true,
	transparent: true,
	opacity: 0.35,
})
const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
scene.add(lineSegments)

// ---- Nodes grouped for rotating the whole scene ----
export const networkGroup = new THREE.Group()
networkGroup.add(nodeMesh, lineSegments, ...glowSprites.map(g => g.sprite))
scene.add(networkGroup)

// ---------- 3. DATA PULSE (idle state) ----------

// "Packets" travelling along random connections - small glowing dots
const PACKET_COUNT = 24
const packetGeometry = new THREE.SphereGeometry(0.09, 6, 6)
const packetMaterial = new THREE.MeshBasicMaterial({
	color: COLOR_GREEN,
	transparent: true,
	opacity: 0.9,
})
export const packetMesh = new THREE.InstancedMesh(packetGeometry, packetMaterial, PACKET_COUNT)
scene.add(packetMesh)

const spawnPacket = () => {
	const conn = connections[Math.floor(Math.random() * connections.length)]
	return {
		conn,
		t: Math.random(),
		speed: 0.15 + Math.random() * 0.25,
	}
}

const packets = Array.from({ length: PACKET_COUNT }, () => spawnPacket())

export const updatePackets = delta => {
	packets.forEach((p, i) => {
		p.t += delta * p.speed
		if (p.t >= 1) {
			Object.assign(p, spawnPacket(), { t: 0 })
		}
		const a = nodes[p.conn.a].position
		const b = nodes[p.conn.b].position
		dummy.position.lerpVectors(a, b, p.t)
		dummy.scale.setScalar(1)
		dummy.updateMatrix()
		packetMesh.setMatrixAt(i, dummy.matrix)
	})
	packetMesh.instanceMatrix.needsUpdate = true
}
