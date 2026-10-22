export type DuckMood = 'idle' | 'reading' | 'reject' | 'happy';

/**
 * The mascot is the call itself: `__('')`. The parentheses are the head, the
 * two quote marks are the eyes, the underscores are the water line. Moods
 * only move glyphs with transforms.
 */
export function Duck({ mood = 'idle', className = '' }: { mood?: DuckMood; className?: string }) {
  return (
    <span className={`fk-duck ${className}`} data-mood={mood} aria-hidden="true">
      <span className="fk-duck-water">__</span>
      <span className="fk-duck-head">
        <span className="fk-duck-paren">(</span>
        <span className="fk-duck-eyes">
          <span className="fk-duck-eye">'</span>
          <span className="fk-duck-eye">'</span>
        </span>
        <span className="fk-duck-paren">)</span>
      </span>
    </span>
  );
}
