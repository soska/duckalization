import type { ReactNode } from 'react';
import { type Size } from './cx.ts';

/** An on/off pill (`aria-pressed`) with an indicator dot that fills when on. */
export function Toggle({
  pressed,
  onChange,
  size = 'md',
  children,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button type="button" className="dk-toggle" data-size={size} aria-pressed={pressed} onClick={() => onChange(!pressed)}>
      <span className="dk-toggle-dot" aria-hidden="true" />
      {children}
    </button>
  );
}
