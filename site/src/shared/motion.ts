import { useEffect, useRef, useState, type RefObject } from 'react';

/** Live `prefers-reduced-motion: reduce`. */
export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * 0→1 progress of an element scrolling through the viewport: 0 when its top
 * reaches the viewport top, 1 when its bottom reaches the viewport bottom
 * (the usual shape for a tall section with a sticky child). Calls `onProgress`
 * on rAF without re-rendering, so callers can write transforms directly.
 *
 * With `smoothing` (a time constant in ms), the reported progress chases the
 * scroll position instead of jumping to it, so a mouse wheel's discrete steps
 * become a short glide. The page itself still scrolls natively.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  { smoothing = 0 }: { smoothing?: number } = {}
): void {
  const callback = useRef(onProgress);
  callback.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let shown = -1;
    let last = 0;
    const target = () => {
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? (rect.top <= 0 ? 1 : 0) : -rect.top / travel;
      return Math.min(1, Math.max(0, p));
    };
    const update = (now: number) => {
      frame = 0;
      const goal = target();
      if (!smoothing || shown < 0) {
        shown = goal;
      } else {
        // Frame-rate independent exponential approach; snap once sub-pixel.
        const dt = Math.min(64, now - last);
        shown += (goal - shown) * (1 - Math.exp(-dt / smoothing));
        if (Math.abs(goal - shown) < 0.0001) shown = goal;
        else frame = requestAnimationFrame(update);
      }
      last = now;
      callback.current(shown);
    };
    const schedule = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(update);
    };
    const snap = () => {
      shown = -1;
      schedule();
    };
    update(performance.now());
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', snap);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', snap);
    };
  }, [ref, smoothing]);
}

/** True once the element has entered the viewport (one-shot). */
export function useInView(ref: RefObject<Element | null>, rootMargin = '0px 0px -20% 0px'): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/** Tags <html> with the active direction so its CSS can own the page background. */
export function useDirection(name: string): void {
  useEffect(() => {
    document.documentElement.dataset.direction = name;
    return () => {
      delete document.documentElement.dataset.direction;
    };
  }, [name]);
}
