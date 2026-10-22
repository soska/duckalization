/*
 * Hybrid G — Scroll the replay (D + A + B).
 * The Duck's page, chrome and copy, with one merged section: scroll position
 * is the clock of the real session replay, so scrolling forward types the
 * commands and streams the agent's JSON, and scrolling back rewinds it, while
 * A-style numbered callouts explain each beat beside the panes. The bet is that
 * one pinned stage can be both the explanation and the proof; "Play at normal
 * speed" just drives the scroll for you, so there is never a second timeline
 * fighting the scrollbar.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import './g.css';
import { useEffect, useRef, useState } from 'react';
import { INSTALL, LLMS_URL, NODE_REQUIREMENT, REPO_URL, VERSION } from '../../shared/facts.ts';
import { useDirection } from '../../shared/motion.ts';
import { DuckProvider, useLocale } from '../../shared/real.ts';
import { Duck } from './Duck.tsx';
import { coverage, duck, SwapAnimationContext, useT, XrayContext } from './i18n.tsx';
import { Replay } from './Replay.tsx';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

function Toolbar({ xray, setXray, onSwitch }: { xray: boolean; setXray: (v: boolean) => void; onSwitch: () => void }) {
  const { __, __s } = useT();
  const [locale, setLocale] = useLocale();
  const missing = coverage.total - coverage.translated;
  return (
    <aside className="gk-bar" aria-label={__s('Translation demo')}>
      <div className="gk-bar-inner">
        <div className="gk-seg" role="group" aria-label={__s('Page language')}>
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
        <button type="button" className="gk-xray-toggle" aria-pressed={xray} onClick={() => setXray(!xray)}>
          <span className="gk-xray-dot" aria-hidden="true" />
          {__('Show fallbacks')}
        </button>
        <p className="gk-count">
          <span className="gk-meter" aria-hidden="true">
            <span style={{ transform: `scaleX(${coverage.translated / coverage.total})` }} />
          </span>
          <span className="gk-count-text">
            {__('{translated} of {total} strings translated', {
              translated: coverage.translated,
              total: coverage.total,
            })}
            <span className="gk-count-sub">
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
    <li className="gk-cmd">
      <code>
        <span className="gk-cmd-prompt" aria-hidden="true">$ </span>
        {command}
      </code>
      <button
        type="button"
        className="gk-copy"
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
    <header className="gk-hero">
      <div className="gk-wrap gk-hero-grid">
        <div className="gk-hero-copy">
          <p className="gk-wordmark">duckalization</p>
          <h1 className="gk-title">
            {__('Write English. An agent translates. The duck checks.')}
          </h1>
          <p className="gk-lede">
            {__(
              'No translation keys: every message’s ID is hashed from its own text. The CLI extracts your strings, hands any agent a brief, and checks every translation before it lands.'
            )}
          </p>
          <ul className="gk-install" aria-label={__s('Install')}>
            <CopyLine command={INSTALL.react} />
            <CopyLine command={INSTALL.cli} />
          </ul>
          <p className="gk-links">
            <a className="gk-btn gk-btn-primary" href={REPO_URL}>
              {__('Source on GitHub')}
            </a>
            <a className="gk-link" href={LLMS_URL}>
              {__('The guide for agents (llms.txt)')}
            </a>
          </p>
        </div>
        <figure className="gk-hero-duck">
          <Duck className="gk-duck-hero" />
          <figcaption>{__("Squint at an empty call, __(''), and it's a duck face.")}</figcaption>
        </figure>
      </div>
      <div className="gk-wrap">
        <p className="gk-demo-note">
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
    <footer className="gk-foot">
      <div className="gk-wrap gk-foot-inner">
        <Duck className="gk-duck-foot" />
        <p>
          {__('MIT licensed. Version {version}. Requires {node}.', { version: VERSION, node: NODE_REQUIREMENT })}
        </p>
        <a className="gk-link" href={REPO_URL}>
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
        <a className="skip-link" href="#gk-main">
          <SkipText />
        </a>
        <div className="gk" data-xray={xray ? '' : undefined}>
          <Toolbar xray={xray} setXray={setXray} onSwitch={() => setAnimate(true)} />
          <main id="gk-main">
            <Hero />
            <Replay />
          </main>
          <Footer />
        </div>
      </SwapAnimationContext.Provider>
    </XrayContext.Provider>
  );
}

export default function Page() {
  useDirection('g');
  return (
    <DuckProvider duck={duck}>
      <Shell />
    </DuckProvider>
  );
}
