import { useEffect, useState } from 'react';

/** Phones: the site's `breakpoint.sm` (560px), as a max-width query. */
export const PHONE = '(max-width: 559px)';

/** Live media query. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Component size for the current viewport: `sm` on phones, `md` elsewhere. */
export function useControlSize(): 'sm' | 'md' {
  return useMedia(PHONE) ? 'sm' : 'md';
}
