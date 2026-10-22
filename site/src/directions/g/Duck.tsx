export type DuckMood = 'idle' | 'reading' | 'reject' | 'happy';

/**
 * The mascot is the call itself: `__('')`. The parentheses are the head, the
 * two quote marks are the eyes, the underscores are the water line. Moods
 * only move glyphs with transforms.
 */
export function Duck({ mood = 'idle', className = '' }: { mood?: DuckMood; className?: string }) {
  return (
    <span className={`gk-duck ${className}`} data-mood={mood} aria-hidden="true">
      <span className="gk-duck-water">__</span>
      <span className="gk-duck-head">
        <span className="gk-duck-paren">(</span>
        <span className="gk-duck-eyes">
          <span className="gk-duck-eye">'</span>
          <span className="gk-duck-eye">'</span>
        </span>
        <span className="gk-duck-paren">)</span>
      </span>
    </span>
  );
}
