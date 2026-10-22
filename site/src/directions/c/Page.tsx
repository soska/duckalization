/*
 * Direction C — Judgment / Checking.
 * Concept: the core idea made literal. The page is two worlds side by side: a
 * loose, warm side for people and models (judgment), and a rigid, ruled side
 * for duckalize (checking), with a validator gate on the seam between them.
 * The bet: letting the visitor play the agent, and watching the real
 * validateOutput() reject their work, persuades better than any diagram of it.
 */
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/martian-mono/standard.css';
import './c.css';
import { useState } from 'react';
import {
  CLAIMS,
  INSTALL,
  LICENSE,
  LLMS_URL,
  NODE_REQUIREMENT,
  REPO_URL,
  RUNTIME_GZIP,
  STORY,
  VERSION,
} from '../../shared/facts.ts';
import { useDirection } from '../../shared/motion.ts';
import { Breaker } from './Breaker.tsx';

/** Which world each beat of the story belongs to. */
const SIDE: Record<(typeof STORY)[number]['key'], 'model' | 'code'> = {
  write: 'model',
  extract: 'code',
  translate: 'model',
  validate: 'code',
  ship: 'code',
};
const WHO: Record<(typeof STORY)[number]['key'], string> = {
  write: 'you',
  extract: 'duckalize extract',
  translate: 'any agent',
  validate: 'duckalize translate apply',
  ship: '@duckalization/runtime',
};

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="c-copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        });
      }}
    >
      <span aria-hidden="true">{done ? 'copied' : 'copy'}</span>
      <span className="sr-only">{done ? 'Copied' : `Copy ${text}`}</span>
    </button>
  );
}

export default function Page() {
  useDirection('c');
  return (
    <div className="c-page">
      <a className="skip-link" href="#break">
        Skip to the demo
      </a>
      <header className="c-split c-bar">
        <div className="c-side c-model">
          <a className="c-brand" href="/">
            <span className="c-brand-mark" aria-hidden="true">
              __('')
            </span>
            duckalization
          </a>
        </div>
        <div className="c-seam" aria-hidden="true" />
        <nav className="c-side c-code c-nav" aria-label="Project">
          <a href={LLMS_URL}>llms.txt</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
      </header>

      <main>
        <section className="c-split c-hero" aria-labelledby="c-title">
          <div className="c-side c-model">
            <h1 id="c-title" className="c-title">
              duckalization <span>· content-addressed i18n for TypeScript and JavaScript</span>
            </h1>
            <p className="c-claim c-claim-model">
              The model does the <em>judgment.</em>
            </p>
            <p className="c-prose">
              Write English inline, right where it renders. Any agent turns it into Spanish, German or anything else,
              and picks the tone, the idiom and the plural grammar. That part takes taste.
            </p>
            <p className="c-duck">
              {CLAIMS.duckFace.split("__('')")[0]}
              <code className="c-duck-face">__('')</code>
              {CLAIMS.duckFace.split("__('')")[1]}
            </p>
          </div>
          <div className="c-seam c-hero-seam" aria-hidden="true">
            <span className="c-seam-label">validateOutput()</span>
          </div>
          <div className="c-side c-code">
            <p className="c-label">
              duckalize {VERSION} · {LICENSE} · {NODE_REQUIREMENT}
            </p>
            <p className="c-claim c-claim-code">
              Deterministic code does the <strong>checking.</strong>
            </p>
            <p className="c-mono-prose">
              The CLI never calls a model. It extracts and hashes every string, writes the brief, and validates what
              comes back. {CLAIMS.rejectAll}
            </p>
            <ul className="c-install" aria-label="Install">
              {[INSTALL.react, INSTALL.cli].map((cmd) => (
                <li key={cmd}>
                  <code>
                    <span aria-hidden="true">$ </span>
                    {cmd}
                  </code>
                  <Copy text={cmd} />
                </li>
              ))}
            </ul>
            <p className="c-links">
              <a className="c-button" href={REPO_URL}>
                View on GitHub
              </a>
              <a className="c-textlink" href="#break">
                Try to break it ↓
              </a>
            </p>
          </div>
        </section>

        <section className="c-story" aria-labelledby="c-story-title">
          <h2 id="c-story-title" className="sr-only">
            How it works
          </h2>
          <ol className="c-beats">
            {STORY.map((beat, i) => (
              <li key={beat.key} className={`c-split c-beat is-${SIDE[beat.key]}`}>
                <div className="c-side c-model">
                  {SIDE[beat.key] === 'model' && <Beat n={i + 1} who={WHO[beat.key]} title={beat.title} body={beat.body} />}
                </div>
                <div className="c-seam c-beat-seam" aria-hidden="true">
                  <span className="c-beat-dot" />
                </div>
                <div className="c-side c-code">
                  {SIDE[beat.key] === 'code' && <Beat n={i + 1} who={WHO[beat.key]} title={beat.title} body={beat.body} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Breaker />
      </main>

      <footer className="c-split c-foot">
        <div className="c-side c-model">
          <p className="c-hand">{CLAIMS.noKeys}</p>
        </div>
        <div className="c-seam" aria-hidden="true" />
        <div className="c-side c-code">
          <p className="c-label">
            @duckalization/runtime · {RUNTIME_GZIP} · <a href={REPO_URL}>{REPO_URL.replace('https://', '')}</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Beat({ n, who, title, body }: { n: number; who: string; title: string; body: string }) {
  return (
    <div className="c-beat-body">
      <p className="c-beat-n">
        <span>0{n}</span> {who}
      </p>
      <h3 className="c-beat-title">{title}</h3>
      <p className="c-beat-text">{body}</p>
    </div>
  );
}
