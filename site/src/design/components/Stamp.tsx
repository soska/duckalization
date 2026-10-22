import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx.ts';

/**
 * A verdict stamped on the page: a line of tool output in its status color,
 * on a tinted fill, slightly askew. No outline (only the app card has one).
 */
export function Stamp({
  tone,
  tilt = 'left',
  className,
  children,
  ...rest
}: {
  tone: 'danger' | 'success' | 'warning';
  /** `left` −1.5°, `right` 1°, `none` level. */
  tilt?: 'left' | 'right' | 'none';
  children: ReactNode;
} & HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p {...rest} className={cx('dk-stamp', className)} data-tone={tone} data-tilt={tilt}>
      <code>{children}</code>
    </p>
  );
}
