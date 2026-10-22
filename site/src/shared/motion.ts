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
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void
): void {
  const callback = useRef(onProgress);
  callback.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? (rect.top <= 0 ? 1 : 0) : -rect.top / travel;
      callback.current(Math.min(1, Math.max(0, p)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
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
