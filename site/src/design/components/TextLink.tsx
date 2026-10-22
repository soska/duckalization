import type { AnchorHTMLAttributes } from 'react';
import { cx } from './cx.ts';

/** An inline link: beak-orange underline that turns to ink on hover. */
export function TextLink({ className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} className={cx('dk-link', className)} />;
}
