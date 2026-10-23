import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Light scroll parallax, declared in markup:
 *
 *   data-parallax="exit"   drifts down by data-parallax-y px (default 60) and
 *                          fades a little while it scrolls out of the top.
 *   data-parallax="enter"  starts data-parallax-y px low (default 48) and
 *                          settles at 0 by the time it reaches 60% of the
 *                          viewport (or by the end of the page, if that comes
 *                          first), so it is always aligned while being read.
 *
 * Transform and opacity only; nothing runs under prefers-reduced-motion.
 * Triggers refresh after the pinned Flow section (refreshPriority -1), and
 * again when `deps` change (e.g. a locale switch reflows the text).
 */
export function useParallax(root: RefObject<HTMLElement | null>, deps: unknown[] = []): void {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      for (const el of element.querySelectorAll<HTMLElement>('[data-parallax]')) {
        const kind = el.dataset.parallax;
        const y = Number(el.dataset.parallaxY ?? (kind === 'exit' ? 60 : 48));
        if (kind === 'exit') {
          gsap.to(el, {
            y,
            opacity: 0.55,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true, refreshPriority: -1 },
          });
        } else {
          gsap.fromTo(
            el,
            { y },
            {
              y: 0,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'clamp(top 60%)', scrub: 0.4, refreshPriority: -1 },
            }
          );
        }
      }
      ScrollTrigger.refresh();
    }, element);
    return () => media.revert();
  }, deps);
}
