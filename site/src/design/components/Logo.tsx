/** The wordmark: the duck-face call `__('')`, then the name. */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <a className="dk-logo" href={href}>
      <span className="dk-logo-mark" aria-hidden="true">
        __('')
      </span>
      duckalization
    </a>
  );
}
