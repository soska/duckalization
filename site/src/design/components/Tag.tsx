import type { ReactNode } from 'react';
import { type Size } from './cx.ts';

/** A small mono chip for a message ID: ink, danger (rejected) or fallback pink. */
export function Tag({
  tone = 'ink',
  size = 'md',
  children,
}: {
  tone?: 'ink' | 'danger' | 'fallback';
  size?: Size;
  children: ReactNode;
}) {
  return (
    <span className="dk-tag" data-tone={tone} data-size={size}>
      {children}
    </span>
  );
}
