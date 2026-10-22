import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx, type Size } from './cx.ts';

type Common = {
  /** `primary`: duck yellow. `secondary`: raised paper. */
  variant?: 'primary' | 'secondary';
  /** `md`: 20px padding, button type, 3px shadow. `sm`: 44px tall, 2px shadow. */
  size?: Size;
  /** `circle` holds a single icon (pass an `aria-label`). */
  shape?: 'pill' | 'circle';
  children: ReactNode;
};
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * The sticker button: ink outline, offset shadow, lifts on hover and presses
 * into its shadow. Renders a link when given `href`, otherwise a `<button>`.
 */
export function Button(props: AsButton | AsLink) {
  const { variant = 'secondary', size = 'md', shape = 'pill', className, children, ...rest } = props;
  const shared = {
    className: cx('dk-button', className),
    'data-variant': variant,
    'data-size': size,
    'data-shape': shape,
  };
  // A pill's label is one flex item, so text and translated spans keep their spacing.
  const content = shape === 'pill' ? <span className="dk-button-label">{children}</span> : children;
  if (rest.href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} {...shared}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} {...shared}>
      {content}
    </button>
  );
}
