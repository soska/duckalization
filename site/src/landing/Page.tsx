/*
 * The duckalization landing page (grew out of exploration H; the round-1
 * directions live under /explore).
 * D's voice and visual system, translated with duckalization itself. "How it
 * works" keeps the rendered Cart pinned on top for all five steps and changes
 * it as you scroll: English, hashed IDs, the agent's draft, rejected, applied,
 * then a fallback. Numbered markers pair each __() line with its element. The
 * replay of a real run follows. The bet: watching one screen get translated
 * makes it obvious what the code, IDs and checks are for.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import { Button, Command, Duck, Logo, Meter, SegmentedControl, TextLink, Toggle } from '../design/index.ts';
import './landing.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { INSTALL, LLMS_URL, NODE_REQUIREMENT, REPO_URL, VERSION } from '../shared/facts.ts';
import { useDirection } from '../shared/motion.ts';
import { useControlSize } from '../shared/media.ts';
import { DuckProvider, useLocale } from '../shared/real.ts';
import { HowItWorks } from './HowItWorks.tsx';
import { coverage, duck, SwapAnimationContext, useT, XrayContext } from './i18n.tsx';
import { Replay } from './Replay.tsx';

const LOCALES = [
  { value: 'en', label: 'English', lang: 'en' },
  { value: 'es', label: 'Español', lang: 'es' },
] as const;

function Toolbar({ xray, setXray, onSwitch }: { xray: boolean; setXray: (v: boolean) => void; onSwitch: () => void }) {
  const { __, __s } = useT();
  const [locale, setLocale] = useLocale();
  const missing = coverage.total - coverage.translated;
  const size = useControlSize();
  const bar = useRef<HTMLElement>(null);
  // The sticky "How it works" stage sits below this bar, whose height changes
  // when it wraps on small screens.
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty('--fk-bar', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--fk-bar');
    };
  }, []);
  return (
    <header ref={bar} className="fk-bar">
      <div className="fk-bar-inner">
        <Logo />
        <div className="fk-bar-demo" role="group" aria-label={__s('Translation demo')}>
          <SegmentedControl
            label={__s('Page language')}
            options={LOCALES}
            value={locale as (typeof LOCALES)[number]['value']}
            size={size}
            onChange={(code) => {
              onSwitch();
              setLocale(code);
            }}
          />
          <Toggle pressed={xray} onChange={setXray} size={size}>
            {__('Show fallbacks')}
          </Toggle>
          <p className="fk-count">
            <Meter value={coverage.translated / coverage.total} />
            <span className="fk-count-text">
              {__('{translated} of {total} strings translated', {
                translated: coverage.translated,
                total: coverage.total,
              })}
              <span className="fk-count-sub">
                {__(
                  { one: '{count} is still English-only', other: '{count} are still English-only' },
                  { count: missing }
                )}
              </span>
            </span>
          </p>
        </div>
      </div>
    </header>
  );
}

function CopyLine({ command }: { command: string }) {
  const { __ } = useT();
  const size = useControlSize();
  return (
    <li>
      <Command command={command} copyLabel={__('Copy')} copiedLabel={__('Copied')} size={size} />
    </li>
  );
}

function Hero() {
  const { __, __s } = useT();
  return (
    <header className="fk-hero">
      <div className="fk-wrap">
        <div className="fk-hero-copy">
          <h1 className="fk-title">{__('Write English. Your agent translates. The duck checks.')}</h1>
          <p className="fk-lede">
            {__(
              'No translation keys: every message’s ID is hashed from its own text. The CLI extracts your strings, hands any agent a brief, and checks every translation before it lands.'
            )}
          </p>
          <ul className="fk-install" aria-label={__s('Install')}>
            <CopyLine command={INSTALL.react} />
            <CopyLine command={INSTALL.cli} />
          </ul>
          <p className="fk-links">
            <Button variant="primary" href={REPO_URL}>
              {__('Source on GitHub')}
            </Button>
            <TextLink href={LLMS_URL}>{__('The guide for agents (llms.txt)')}</TextLink>
          </p>
        </div>
      </div>
      <div className="fk-wrap">
        <p className="fk-demo-note">
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
    <footer className="fk-foot">
      <div className="fk-wrap fk-foot-inner">
        <Duck className="fk-duck-foot" />
        <p>{__('MIT licensed. Version {version}. Requires {node}.', { version: VERSION, node: NODE_REQUIREMENT })}</p>
        <TextLink href={REPO_URL}>github.com/soska/duckalization</TextLink>
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
        <a className="skip-link" href="#fk-main">
          <SkipText />
        </a>
        <div className="fk" data-xray={xray ? '' : undefined}>
          <Toolbar xray={xray} setXray={setXray} onSwitch={() => setAnimate(true)} />
          <main id="fk-main">
            <Hero />
            <HowItWorks />
            <Replay />
          </main>
          <Footer />
        </div>
      </SwapAnimationContext.Provider>
    </XrayContext.Provider>
  );
}

export default function Page() {
  useDirection('landing');
  return (
    <DuckProvider duck={duck}>
      <Shell />
    </DuckProvider>
  );
}
