/*
 * Direction E — Ledger. Concept: content-addressed i18n shown as bookkeeping.
 * The text is the key, so the page treats the catalog as a ledger whose rows
 * physically move between states, and the hero hashes whatever you type.
 * The bet: if every column except "Agent output" can only move, count or
 * reject rows, visitors feel where the model's judgment stops and the
 * deterministic checks start.
 */
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/instrument-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './e.css';
import { useDirection } from '../../shared/motion.ts';
import { REPO_URL } from '../../shared/facts.ts';
import { Hero } from './Hero.tsx';
import { Ledger } from './Ledger.tsx';

export default function Page() {
  useDirection('e');
  return (
    <div className="e">
      <a className="skip-link" href="#e-main">
        Skip to content
      </a>
      <main id="e-main">
        <Hero />
        <Ledger />
      </main>
      <footer className="e-foot">
        <span>
          <code>__('')</code> duckalization
        </span>
        <a href={REPO_URL}>github.com/soska/duckalization</a>
      </footer>
    </div>
  );
}
