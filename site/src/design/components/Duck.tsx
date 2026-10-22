import { cx } from './cx.ts';

export type DuckMood = 'idle' | 'reading' | 'reject' | 'happy';

/**
 * The mascot is the call itself: `__('')`. The parentheses are the head, the
 * two quote marks are the eyes, the underscores are the water line. Moods
 * only move glyphs with transforms. It sizes with `font-size` (set it through
 * `className`); `on="terminal"` recolors it for dark terminal panes.
 */
export function Duck({
  mood = 'idle',
  on = 'page',
  className,
}: {
  mood?: DuckMood;
  on?: 'page' | 'terminal';
  className?: string;
}) {
  return (
    <span className={cx('dk-duck', className)} data-mood={mood} data-on={on === 'terminal' ? on : undefined} aria-hidden="true">
      <span className="dk-duck-water">__</span>
      <span className="dk-duck-head">
        <span className="dk-duck-paren">(</span>
        <span className="dk-duck-eyes">
          <span className="dk-duck-eye">'</span>
          <span className="dk-duck-eye">'</span>
        </span>
        <span className="dk-duck-paren">)</span>
      </span>
    </span>
  );
}
