/*
 * Direction B — "Session". The pitch is a recording, not a diagram: one real
 * `duckalize` session against a three-string component, replayed with you,
 * the CLI and an agent on separate panes, and every CLI line is captured
 * output. The bet is that seeing judgment stay in the agent pane while the
 * deterministic pane only checks it is more convincing than any illustration.
 */
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/instrument-sans';
import './b.css';
import { useState } from 'react';
import {
  CLAIMS,
  INSTALL,
  LICENSE,
  LLMS_URL,
  NODE_REQUIREMENT,
  REPO_URL,
  RUNTIME_GZIP,
  VERSION,
} from '../../shared/facts.ts';
import { useDirection } from '../../shared/motion.ts';
import { Session } from './Session.tsx';

function CopyLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be unavailable (insecure context); the text stays selectable.
    }
  };
  return (
    <li className="sb-install-line">
      <code>
        <span className="sb-prompt" aria-hidden="true">
          $
        </span>
        {command}
      </code>
      <button type="button" onClick={copy} aria-label={`Copy: ${command}`}>
        <span data-on={!copied || undefined}>copy</span>
        <span data-on={copied || undefined} aria-live="polite">
          {copied ? 'copied' : ''}
        </span>
      </button>
    </li>
  );
}

export default function Page() {
  useDirection('b');
  return (
    <div className="sb">
      <a className="skip-link" href="#sb-main">
        Skip to content
      </a>
      <header className="sb-top">
        <a className="sb-word" href="/b" aria-label="duckalization, home">
          <span className="sb-word-mark" aria-hidden="true">
            __('')
          </span>
          duckalization
        </a>
        <nav aria-label="Project">
          <a href={LLMS_URL}>llms.txt</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
      </header>

      <main id="sb-main">
        <section className="sb-hero" aria-labelledby="sb-title">
          <div className="sb-hero-copy">
            <p className="sb-kicker">Content-addressed i18n for TypeScript</p>
            <h1 id="sb-title">The string in your code is the message.</h1>
            <p className="sb-lede">
              {CLAIMS.noKeys} <code>duckalize</code> extracts every string into a brief, any agent translates
              it, and the CLI checks each line before it lands. It never calls a model.
            </p>
            <ul className="sb-install" aria-label="Install">
              <CopyLine command={INSTALL.react} />
              <CopyLine command={INSTALL.cli} />
            </ul>
            <p className="sb-meta">
              <span>v{VERSION}</span>
              <span>{LICENSE}</span>
              <span>{NODE_REQUIREMENT}</span>
              <span>runtime {RUNTIME_GZIP}</span>
            </p>
          </div>
          <figure className="sb-duck">
            <p className="sb-duck-face" aria-hidden="true">
              <span>__(</span>
              <span className="sb-eye">'</span>
              <span className="sb-eye">'</span>
              <span>)</span>
            </p>
            <figcaption>
              {CLAIMS.duckFace.split("__('')").map((part, i) => (
                <span key={i}>
                  {i > 0 && <code>__('')</code>}
                  {part}
                </span>
              ))}
            </figcaption>
          </figure>
        </section>

        <section className="sb-pipeline" aria-labelledby="sb-pipeline-title">
          <div className="sb-pipeline-head">
            <h2 id="sb-pipeline-title">One session, three actors.</h2>
            <p>
              A replay of a real run against a three-string component. Every line in the <b>duckalize</b> pane
              is what the CLI printed. The <b>agent</b> pane is the only place a model is involved, and you
              can swap in any agent you like.
            </p>
          </div>
          <Session />
        </section>
      </main>

      <footer className="sb-foot">
        <p>
          {LICENSE} · v{VERSION} · <a href={REPO_URL}>github.com/soska/duckalization</a>
        </p>
      </footer>
    </div>
  );
}
