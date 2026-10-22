import { useId, useState } from 'react';
import { CLAIMS, INSTALL, LICENSE, LLMS_URL, REPO_URL, VERSION } from '../../shared/facts.ts';
import { messageId } from '../../shared/real.ts';

const TRY = [
  { label: "'Sign in'", message: 'Sign in', context: '' },
  { label: "'Sign in ' (trailing space)", message: 'Sign in ', context: '' },
  { label: "'Book' · context verb", message: 'Book', context: 'verb' },
] as const;

/** Visible stand-ins for characters that would otherwise be invisible. */
function Canonical({ message, context }: { message: string; context: string }) {
  const visible = (s: string) =>
    s.split(/( )/).map((part, i) =>
      part === ' ' ? (
        <span key={i} className="e-ws" aria-label="space">·</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  return (
    <code className="e-canon">
      {context && (
        <>
          {visible(context)}
          <span className="e-ctl" title="U+0000 separator">␀</span>
        </>
      )}
      {message ? visible(message) : <span className="e-faint">(empty)</span>}
    </code>
  );
}

function CopyLine({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="e-install-line">
      <code>
        <span className="e-prompt" aria-hidden="true">$</span> {cmd}
      </code>
      <button
        type="button"
        className="e-copybtn"
        aria-label={`Copy “${cmd}”`}
        onClick={() => {
          void navigator.clipboard?.writeText(cmd).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          });
        }}
      >
        <span aria-hidden="true">{copied ? 'copied' : 'copy'}</span>
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied to clipboard' : ''}</span>
    </li>
  );
}

export function Hero() {
  const [message, setMessage] = useState('Sign in');
  const [context, setContext] = useState('');
  const messageField = useId();
  const contextField = useId();
  const id = messageId(message, context || undefined);

  return (
    <>
      <header className="e-top">
        <a className="e-wordmark" href="/e">
          duckalization
        </a>
        <span className="e-top-meta">
          v{VERSION} · {LICENSE}
        </span>
        <nav aria-label="Project" className="e-top-nav">
          <a href={LLMS_URL}>llms.txt</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
      </header>

      <section className="e-hero" aria-labelledby="e-title">
        <div className="e-hero-copy">
          <p className="e-kicker">Content-addressed i18n for TypeScript &amp; JavaScript</p>
          <h1 id="e-title">
            The text <em>is</em>
            <br /> the key.
          </h1>
          <p className="e-lede">
            {CLAIMS.noKeys} Write the English string in your code. That string is the message, and its hash is
            its catalog ID.
          </p>
          <ul className="e-install" aria-label="Install">
            <CopyLine cmd={INSTALL.react} />
            <CopyLine cmd={INSTALL.cli} />
          </ul>
        </div>

        <form className="e-entry" aria-labelledby="e-entry-title" onSubmit={(e) => e.preventDefault()}>
          <div className="e-entry-head">
            <h2 id="e-entry-title">Ledger entry</h2>
            <span>messageId(message, context)</span>
          </div>
          <label htmlFor={messageField}>Message</label>
          <input
            id={messageField}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <label htmlFor={contextField}>
            Context <span className="e-faint">optional</span>
          </label>
          <input
            id={contextField}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. verb"
            spellCheck={false}
            autoComplete="off"
          />
          <dl className="e-entry-out">
            <div>
              <dt>Hashed input</dt>
              <dd>
                <Canonical message={message} context={context} />
              </dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>
                <output className="e-entry-id" aria-live="polite">
                  {id}
                </output>
              </dd>
            </div>
          </dl>
          <div className="e-try" role="group" aria-label="Try an example">
            {TRY.map((t) => (
              <button
                key={t.label}
                type="button"
                aria-pressed={t.message === message && t.context === context}
                onClick={() => {
                  setMessage(t.message);
                  setContext(t.context);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </form>

        <p className="e-duck">
          <code>__('')</code> {CLAIMS.duckFace.replace(" — __('') —", '')}
        </p>
      </section>
    </>
  );
}
