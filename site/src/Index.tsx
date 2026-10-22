import './index.css';
import { DIRECTIONS } from './directions.ts';

export function Index() {
  return (
    <main className="ix">
      <header className="ix-head">
        <p className="ix-mark" aria-hidden="true">__('')</p>
        <h1>duckalization — explorations</h1>
        <p className="ix-lede">
          The round-1 directions behind the <a href="/">landing page</a>, kept for reference. Each makes a different bet
          on how to show that the model does the judgment and deterministic code does the checking. The landing page
          grew out of H, a variant of F.
        </p>
      </header>
      <ol className="ix-list">
        {DIRECTIONS.map((d) => (
          <li key={d.path}>
            <a href={d.path}>
              <span className="ix-letter" aria-hidden="true">{d.path.slice(-1).toUpperCase()}</span>
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
