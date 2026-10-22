import type { HTMLAttributes } from 'react';
import { cx } from './cx.ts';

/** A sticker note pinned beside the thing it explains. */
export function Note({
  tone = 'default',
  className,
  ...rest
}: { tone?: 'default' | 'success' | 'danger' } & HTMLAttributes<HTMLParagraphElement>) {
  return <p {...rest} className={cx('dk-note', className)} data-tone={tone} />;
}
