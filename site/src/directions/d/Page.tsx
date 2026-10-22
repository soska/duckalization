/*
 * Direction D — The Duck.
 * The page is localized with duckalization itself: every string is a real
 * `__()` call, extracted by the real CLI, rendered by the real runtime, and
 * its Spanish catalog is deliberately incomplete. The bet is that showing
 * the fallback (flip to Español, turn on x-ray, watch English survive) sells
 * "a partial catalog still ships" better than any diagram, with `__('')` as
 * the character who does the checking.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import './d.css';
import { useEffect, useRef, useState } from 'react';
import { INSTALL, LLMS_URL, NODE_REQUIREMENT, REPO_URL, VERSION } from '../../shared/facts.ts';
import { useDirection } from '../../shared/motion.ts';
import { DuckProvider, useLocale } from '../../shared/real.ts';
import { Duck } from './Duck.tsx';
import { coverage, duck, SwapAnimationContext, useT, XrayContext } from './i18n.tsx';
import { Pipeline } from './Pipeline.tsx';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

function Toolbar({ xray, setXray, onSwitch }: { xray: boolean; setXray: (v: boolean) => void; onSwitch: () => void }) {
  const { __, __s } = useT();
  const [locale, setLocale] = useLocale();
  const missing = coverage.total - coverage.translated;
  return (
    <aside className="dk-bar" aria-label={__s('Translation demo')}>
      <div className="dk-bar-inner">
        <div className="dk-seg" role="group" aria-label={__s('Page language')}>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              aria-pressed={locale === l.code}
              onClick={() => {
                if (locale === l.code) return;
                onSwitch();
                setLocale(l.code);
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button type="button" className="dk-xray-toggle" aria-pressed={xray} onClick={() => setXray(!xray)}>
          <span className="dk-xray-dot" aria-hidden="true" />
          {__('Show fallbacks')}
        </button>
        <p className="dk-count">
          <span className="dk-meter" aria-hidden="true">
            <span style={{ transform: `scaleX(${coverage.translated / coverage.total})` }} />
          </span>
          <span className="dk-count-text">
            {__('{translated} of {total} strings translated', {
              translated: coverage.translated,
              total: coverage.total,
            })}
            <span className="dk-count-sub">
              {__(
                { one: '{count} is still English-only', other: '{count} are still English-only' },
                { count: missing }
              )}
            </span>
          </span>
        </p>
      </div>
    </aside>
  );
}

function CopyLine({ command }: { command: string }) {
  const { __ } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <li className="dk-cmd">
      <code>
        <span className="dk-cmd-prompt" aria-hidden="true">$ </span>
        {command}
      </code>
      <button
        type="button"
        className="dk-copy"
        onClick={() => {
          void navigator.clipboard?.writeText(command).then(() => {
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        <span aria-live="polite">{copied ? __('Copied') : __('Copy')}</span>
      </button>
    </li>
  );
}

function Hero() {
  const { __, __s } = useT();
  return (
    <header className="dk-hero">
      <div className="dk-wrap dk-hero-grid">
        <div className="dk-hero-copy">
          <p className="dk-wordmark">duckalization</p>
          <h1 className="dk-title">
            {__('Write English. An agent translates. The duck checks.')}
          </h1>
          <p className="dk-lede">
            {__(
              'No translation keys: every message’s ID is hashed from its own text. The CLI extracts your strings, hands any agent a brief, and checks every translation before it lands.'
            )}
          </p>
          <ul className="dk-install" aria-label={__s('Install')}>
            <CopyLine command={INSTALL.react} />
            <CopyLine command={INSTALL.cli} />
          </ul>
          <p className="dk-links">
            <a className="dk-btn dk-btn-primary" href={REPO_URL}>
              {__('Source on GitHub')}
            </a>
            <a className="dk-link" href={LLMS_URL}>
              {__('The guide for agents (llms.txt)')}
            </a>
          </p>
        </div>
        <figure className="dk-hero-duck">
          <Duck className="dk-duck-hero" />
          <figcaption>{__("Squint at an empty call, __(''), and it's a duck face.")}</figcaption>
        </figure>
      </div>
      <div className="dk-wrap">
        <p className="dk-demo-note">
          <strong>{__('This page is translated with duckalization.')}</strong>{' '}
          {__(
            'Its Spanish catalog is deliberately incomplete. Switch to Español and turn on Show fallbacks to see which strings are still in English.'
          )}
        </p>
      </div>
    </header>
  );
}

function Footer() {
  const { __ } = useT();
  return (
    <footer className="dk-foot">
      <div className="dk-wrap dk-foot-inner">
        <Duck className="dk-duck-foot" />
        <p>
          {__('MIT licensed. Version {version}. Requires {node}.', { version: VERSION, node: NODE_REQUIREMENT })}
        </p>
        <a className="dk-link" href={REPO_URL}>
          github.com/soska/duckalization
        </a>
      </div>
    </footer>
  );
}

function SkipText() {
  const { __ } = useT();
  return <>{__('Skip to content')}</>;
}

function Shell() {
  const [locale] = useLocale();
  const [xray, setXray] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.lang;
    html.lang = locale;
    return () => {
      html.lang = previous;
    };
  }, [locale]);

  return (
    <XrayContext.Provider value={xray}>
      <SwapAnimationContext.Provider value={animate}>
        <a className="skip-link" href="#dk-main">
          <SkipText />
        </a>
        <div className="dk" data-xray={xray ? '' : undefined}>
          <Toolbar xray={xray} setXray={setXray} onSwitch={() => setAnimate(true)} />
          <main id="dk-main">
            <Hero />
            <Pipeline />
          </main>
          <Footer />
        </div>
      </SwapAnimationContext.Provider>
    </XrayContext.Provider>
  );
}

export default function Page() {
  useDirection('d');
  return (
    <DuckProvider duck={duck}>
      <Shell />
    </DuckProvider>
  );
}
