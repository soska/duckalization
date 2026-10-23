import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import { useEffect } from 'react';
import { Button, Command, Duck, Logo, SegmentedControl, TextLink } from '../design/index.ts';
import { INSTALL, LLMS_URL, REPO_URL } from '../shared/facts.ts';
import { DuckProvider, useLocale } from '../shared/real.ts';
import { useDirection } from '../shared/motion.ts';
import { duck, useT } from './i18n.tsx';
import { Flow } from './Flow.tsx';
import './landing.css';

function Shell() {
  const { __, __s } = useT();
  const [locale, setLocale] = useLocale();
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return (
    <div className="fk">
      <a className="skip-link" href="#main">{__('Skip to content')}</a>
      <header className="site-header fk-wrap">
        <Logo />
        <nav aria-label={__s('Main navigation')}>
          <TextLink href={REPO_URL}>GitHub ↗</TextLink>
          <SegmentedControl label={__s('Page language')} options={[{ value: 'en', label: 'EN', lang: 'en' }, { value: 'es', label: 'ES', lang: 'es' }]} value={locale} onChange={setLocale} size="sm" />
        </nav>
      </header>
      <main id="main">
        <section className="hero fk-wrap" aria-labelledby="hero-title">
          <p className="eyebrow">{__('Localization for the way you build now.')}</p>
          <h1 id="hero-title">{__('Write English.')}<br /><span className="hero-accent">{__('Your agent localizes.')}</span></h1>
          <p className="hero-lede">{__('No translation keys. No switching gears. Set your languages and style guide, then let your coding agent keep your app translated as you build.')}</p>
          <div className="hero-actions"><Button variant="primary" href="#see-it">{__('See it happen')} <span aria-hidden="true">↓</span></Button><TextLink href="#get-started">{__('Set it up once')} ↗</TextLink></div>
          <div className="hero-signature"><code>{"__('Make something wonderful.')"}</code><Duck mood="happy" /><span>{__('Just your words. That’s the whole idea.')}</span></div>
        </section>
        <Flow />
        <section className="setup fk-wrap" id="get-started" aria-labelledby="setup-title">
          <p className="eyebrow">{__('A little setup. A lot less work.')}</p>
          <h2 id="setup-title">{__('Give your agent the guide. Then go make something.')}</h2>
          <div className="setup-grid">
            <div className="setup-copy"><p>{__('Your agent can wire up duckalization, configure your languages, and keep translations part of its development workflow. You stay focused on the app.')}</p><Button variant="primary" href={LLMS_URL}>{__('Read the agent guide')} ↗</Button><TextLink href={`${REPO_URL}#readme`}>{__('Or follow the documentation yourself')}</TextLink></div>
            <ol className="setup-steps">
              <li><span>01</span><div><h3>{__('Set up the project')}</h3><p>{__('Install duckalization and ask your agent to follow the guide for your app.')}</p><div className="setup-commands"><Command command={INSTALL.react} copyLabel={__('Copy')} copiedLabel={__('Copied')} size="sm" /><Command command={INSTALL.cli} copyLabel={__('Copy')} copiedLabel={__('Copied')} size="sm" /></div></div></li>
              <li><span>02</span><div><h3>{__('Tell it how you sound')}</h3><p>{__('Choose your languages. Define your tone, terminology, and style. Your agent receives that guidance with the strings it translates.')}</p></div></li>
              <li><span>03</span><div><h3>{__('Build like you always do')}</h3><p>{__('Write English inline with __(). With the translation workflow in its instructions, your agent handles the catalogs as it works.')}</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <footer className="site-footer fk-wrap"><div><Duck /><span>{__('This page speaks duckalization, too.')}</span></div><span>{__('Open source. MIT licensed.')}</span><TextLink href={REPO_URL}>GitHub ↗</TextLink></footer>
    </div>
  );
}

export default function Page() {
  useDirection('landing');
  return <DuckProvider duck={duck}><Shell /></DuckProvider>;
}
