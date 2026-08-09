/* ============================================
   SENTRIX — Animated counters
   Elements [data-count="target_value"] (optionally
   [data-decimals="1"] for non-integer values) count up
   from 0 to the target value, triggered once when they
   enter the viewport. "ease-out-expo" easing - fast start,
   clear snap to the final value, matches the pace of a
   security dashboard (a reading "arriving", not smoothly
   climbing).
   ============================================ */

const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

const animateCount = el => {
	const target = parseFloat(el.dataset.count)
	const decimals = Number(el.dataset.decimals || 0)
	const duration = 1400 // ms
	const startTime = performance.now()

	const tick = now => {
		const elapsedMs = now - startTime
		const t = Math.min(elapsedMs / duration, 1)
		const eased = easeOutExpo(t)
		const value = target * eased
		el.textContent = value.toFixed(decimals)
		if (t < 1) {
			requestAnimationFrame(tick)
		} else {
			el.textContent = target.toFixed(decimals)
		}
	}

	requestAnimationFrame(tick)
}

const initCounters = () => {
	const counters = document.querySelectorAll('.js-count')
	if (!counters.length) return

	if (!('IntersectionObserver' in window)) {
		counters.forEach(el => {
			el.textContent = parseFloat(el.dataset.count).toFixed(Number(el.dataset.decimals || 0))
		})
		return
	}

	const observer = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				if (!entry.isIntersecting) return
				animateCount(entry.target)
				observer.unobserve(entry.target)
			})
		},
		{ threshold: 0.4 },
	)

	counters.forEach(el => observer.observe(el))
}

initCounters()
