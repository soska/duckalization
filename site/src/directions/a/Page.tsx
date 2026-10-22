/*
 * Direction A — Spec Sheet.
 * duckalization presented as a printed technical datasheet: hairline rules, a
 * visible column grid, figure numbers and marginalia, and one real message
 * followed end to end through a scroll-scrubbed, annotated figure.
 * The bet: restraint reads as rigor. If the page looks like documentation
 * someone could audit, "deterministic code does the checking" doesn't need a
 * slogan; the model gets the only loose, hand-drawn marks on the sheet.
 */
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './a.css';
import { useDirection, useReducedMotion } from '../../shared/motion.ts';
import { CALL_SHAPES, INSTALL, LICENSE, LLMS_URL, NODE_REQUIREMENT, REPO_URL, RUNTIME_GZIP, VERSION } from '../../shared/facts.ts';
import { Pipeline } from './Pipeline.tsx';

const IFACE_LABELS = ['plain', 'values', 'context', 'plural'];

export default function Page() {
  useDirection('a');
  const reduced = useReducedMotion();

  return (
    <div className="a-root">
      <a className="skip-link a-skip" href="#a-main">
        Skip to content
      </a>

      <header className="a-masthead a-wrap">
        <p className="a-masthead-name">duckalization</p>
        <dl className="a-masthead-meta">
          <div>
            <dt>Version</dt>
            <dd>{VERSION}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{LICENSE}</dd>
          </div>
          <div>
            <dt>Requires</dt>
            <dd>{NODE_REQUIREMENT}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>{RUNTIME_GZIP}</dd>
          </div>
        </dl>
        <a className="a-masthead-link" href={REPO_URL}>
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="a-main">
        <section className="a-hero a-wrap" aria-labelledby="a-title">
          <div className="a-hero-text">
            <p className="a-label">Content-addressed i18n for TypeScript / JavaScript</p>
            <h1 id="a-title" className="a-title">
              The string in your code <em>is</em> the message.
            </h1>
            <p className="a-lede">
              No translation keys. IDs are hashed from the text, so an agent can extract catalogs, translate missing
              entries, and apply the result without anyone inventing keys or renaming <code>_v2</code> strings.
            </p>
          </div>

          <figure className="a-duck" aria-labelledby="a-duck-cap">
            <p className="a-duck-glyph" aria-hidden="true">
              <span className="a-duck-u">__</span>
              <span className="a-duck-p">(</span>
              <span className="a-duck-q">''</span>
              <span className="a-duck-p">)</span>
            </p>
            <figcaption id="a-duck-cap" className="a-caption">
              <span className="a-fig">Fig. 1</span> The empty call, <code>__('')</code>. Squint at it and it's a duck
              face.
            </figcaption>
          </figure>

          <section className="a-iface" aria-labelledby="a-iface-h">
            <h2 id="a-iface-h" className="a-label">
              Interface · the four call shapes
            </h2>
            <ol className="a-iface-list">
              {CALL_SHAPES.map((shape, i) => (
                <li key={shape}>
                  <span className="a-iface-k">{IFACE_LABELS[i]}</span>
                  <code>{shape}</code>
                </li>
              ))}
            </ol>
          </section>

          <aside className="a-install" aria-labelledby="a-install-h">
            <h2 id="a-install-h" className="a-label">
              Install
            </h2>
            <ol className="a-install-list">
              <li>
                <span className="a-install-n" aria-hidden="true">
                  i
                </span>
                <code>{INSTALL.react}</code>
              </li>
              <li>
                <span className="a-install-n" aria-hidden="true">
                  ii
                </span>
                <code>{INSTALL.cli}</code>
              </li>
            </ol>
            <p className="a-note">
              Point your agent at <a href={LLMS_URL}>llms.txt</a>: call-shape rules, package APIs and how to translate a
              brief.
            </p>
          </aside>
        </section>

        <Pipeline reduced={reduced} />
      </main>

      <footer className="a-colophon a-wrap">
        <p>
          Every value in Fig. 2 is computed in this page by the library's own code: <code>messageId</code> from{' '}
          <code>@duckalization/id</code>, <code>validateOutput</code> from <code>@duckalization/translate</code>, and
          lookup with fallback from <code>@duckalization/runtime</code>. Terminal lines are verbatim output of the CLI.
        </p>
        <p>
          <a href={REPO_URL}>github.com/soska/duckalization</a> · {LICENSE} · v{VERSION}
        </p>
      </footer>
    </div>
  );
}
