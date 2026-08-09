/* ============================================
   SENTRIX — Scroll reveal
   Elements marked [data-reveal="up|left|right"] in HTML
   appear (fade + short shift + unblur) when they enter
   the viewport. [data-reveal-delay] in ms lets you stagger
   cards within a group (e.g. approach-cards, arch-flow).
   Runs once per element - the portfolio wants to show this
   to a recruiter while scrolling down, not flicker every
   time they scroll back to a section.
   ============================================ */

const initScrollReveal = () => {
	const revealEls = document.querySelectorAll('[data-reveal]')
	if (!revealEls.length) return

	// No IntersectionObserver (very old browsers) - just show everything.
	if (!('IntersectionObserver' in window)) {
		revealEls.forEach(el => el.classList.add('is-visible'))
		return
	}

	const observer = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				if (!entry.isIntersecting) return
				const el = entry.target
				const delay = Number(el.dataset.revealDelay || 0)
				if (delay > 0) {
					setTimeout(() => el.classList.add('is-visible'), delay)
				} else {
					el.classList.add('is-visible')
				}
				observer.unobserve(el)
			})
		},
		{
			threshold: 0.15,
			rootMargin: '0px 0px -8% 0px',
		},
	)

	revealEls.forEach(el => observer.observe(el))
}

initScrollReveal()
