import './index.css';
import { DIRECTIONS } from './directions.ts';

export function Index() {
  return (
    <main className="ix">
      <header className="ix-head">
        <p className="ix-mark" aria-hidden="true">__('')</p>
        <h1>duckalization — landing page, round 1</h1>
        <p className="ix-lede">
          Five directions, each with a hero and the pipeline section, plus hybrids (F, G) and two variants of F (H, I). Each one makes a different bet on how to show
          that the model does the judgment and deterministic code does the checking.
        </p>
      </header>
      <ol className="ix-list">
        {DIRECTIONS.map((d, i) => (
          <li key={d.path}>
            <a href={d.path}>
              <span className="ix-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
              <span className="ix-name">{d.name}</span>
              <span className="ix-concept">{d.concept}</span>
              <span className="ix-path" aria-hidden="true">{d.path} →</span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
