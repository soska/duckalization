import type { HTMLAttributes } from 'react';
import { cx, type Size } from './cx.ts';

/**
 * A numbered marker that pairs a line of code with the element it renders.
 * One color per number: 1 duck, 2 pond, 3 beak. Decorative (aria-hidden):
 * the pairing is also stated in text. Its hover lift uses the CSS `scale`
 * property, so callers may write `transform` inline.
 */
export function Marker({
  n,
  size = 'md',
  on = 'page',
  className,
  ...rest
}: {
  n: 1 | 2 | 3;
  /** `md` 24px, `sm` 18px. */
  size?: Size;
  /** `terminal` swaps the ink outline for a light one on dark code. */
  on?: 'page' | 'terminal';
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cx('dk-marker', className)}
      data-n={n}
      data-size={size}
      data-on={on === 'terminal' ? on : undefined}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}
