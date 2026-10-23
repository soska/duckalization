import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, FileX2, Undo2 } from 'lucide-react';
import { Button, Command, Duck, Logo, SegmentedControl, Tag, TextLink } from '../design/index.ts';
import { LLMS_URL, REPO_URL } from '../shared/facts.ts';
import { DuckProvider, useLocale } from '../shared/real.ts';
import { useDirection } from '../shared/motion.ts';
import { duck, useT } from './i18n.tsx';
import { Flow } from './Flow.tsx';
import { StyleExamples } from './StyleExamples.tsx';
import { useParallax } from './parallax.ts';
import './landing.css';

function Shell() {
  const { __, __s } = useT();
  const [locale, setLocale] = useLocale();
  const [manager, setManager] = useState('npm');
  const install = manager === 'npm' ? 'npm install' : `${manager} add`;
  const pageRef = useRef<HTMLDivElement>(null);
  useParallax(pageRef, [locale]);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);
  return (
    <div className="fk" ref={pageRef}>
      <a className="skip-link" href="#main">{__('Skip to content')}</a>
      <header className="site-header fk-wrap">
        <Logo />
        <nav aria-label={__s('Main navigation')}>
          <TextLink href={REPO_URL}>GitHub ↗</TextLink>
          <SegmentedControl label={__s('Page language')} options={[{ value: 'en', label: 'EN', lang: 'en' }, { value: 'es', label: 'ES', lang: 'es' }]} value={locale} onChange={setLocale} size="sm" />
        </nav>
      </header>
      <main id="main">
        <section className="hero fk-wrap" aria-labelledby="hero-title" data-parallax="exit">
          <p className="eyebrow">{__('Localization for the way you build now.')}</p>
          <h1 id="hero-title">{__('Write English.')}<br /><span className="hero-accent">{__('Your agent localizes.')}</span></h1>
          <p className="hero-lede">{__('No translation keys. No switching gears. Set your languages and style guide, then let your coding agent keep your app translated as you build.')}</p>
          <div className="hero-actions"><Button variant="primary" href="#see-it">{__('See it happen')} <span aria-hidden="true">↓</span></Button><TextLink href="#get-started">{__('Set it up once')} ↗</TextLink></div>
          <div className="hero-signature"><code>{"__('Make something wonderful.')"}</code><Duck mood="happy" /><span>{__('Just your words. That’s the whole idea.')}</span></div>
          <p className="hero-explanation">{__('The English inside __() is the catalog entry. There’s no key file to maintain, and the CLI refuses structurally invalid translations.')}</p>
        </section>
        <Flow />
        <section className="guardrails" aria-labelledby="guardrails-title">
          <div className="fk-wrap">
          <p className="eyebrow">{__('Trust, but verify.')}</p>
          <h2 id="guardrails-title">{__('Your agent translates. duckalization checks the work.')}</h2>
          <p className="guardrails-lede">{__('duckalization never calls a model. It hands your agent a brief, then validates every answer before a single string reaches your catalogs.')}</p>
          <ol className="guardrails-list">
            <li data-parallax="enter" data-parallax-y="40">
              <span className="guardrail-mark" data-tone="danger" aria-hidden="true"><FileX2 /></span>
              <h3>{__('A bad answer changes nothing.')}</h3>
              <p>{__('Unknown IDs, typo’d placeholders, wrong plural forms, a translated brand name: one error rejects the whole file, and nothing is written.')}</p>
              <div className="guardrail-codes" lang="en">{['unknown-id', 'unknown-placeholder', 'missing-other', 'glossary-dnt'].map((code) => <Tag key={code} tone="danger" size="sm">{code}</Tag>)}</div>
            </li>
            <li data-parallax="enter" data-parallax-y="64">
              <span className="guardrail-mark" data-tone="fallback" aria-hidden="true"><Undo2 /></span>
              <h3>{__('Missing means English, never blank.')}</h3>
              <p>{__('A string without a translation renders the English you wrote. Ship a partial catalog today, and add a CI check when you want every language complete.')}</p>
              <code className="guardrail-command">duckalize translate check</code>
            </li>
            <li data-parallax="enter" data-parallax-y="88">
              <span className="guardrail-mark" data-tone="ok" aria-hidden="true"><BadgeCheck /></span>
              <h3>{__('You approve the words that matter.')}</h3>
              <p>{__('Glossary terms need a human sign-off. Until a language’s terms are approved, the CLI won’t brief or apply it, and the agent guide tells your agent to ask you instead of approving them itself.')}</p>
              <code className="guardrail-command">duckalize glossary review es</code>
            </li>
          </ol>
          </div>
        </section>
        <section className="setup fk-wrap" id="get-started" aria-labelledby="setup-title">
          <p className="eyebrow">{__('A little setup. A lot less work.')}</p>
          <h2 id="setup-title">{__('Give your agent the guide. Then go make something.')}</h2>
          <div className="setup-grid">
            <div className="setup-copy"><p>{__('Your agent can wire up duckalization, configure your languages, and keep translations part of its development workflow. You stay focused on the app.')}</p><Button variant="primary" href={LLMS_URL}>{__('Read the agent guide')} ↗</Button><TextLink href={`${REPO_URL}#readme`}>{__('Or follow the documentation yourself')}</TextLink></div>
            <ol className="setup-steps">
              <li data-parallax="enter" data-parallax-y="32"><span>01</span><div><h3>{__('Set up the project')}</h3><p>{__('Install duckalization and ask your agent to follow the guide for your app.')}</p><div className="setup-manager"><label htmlFor="package-manager">{__('Package manager')}</label><select id="package-manager" value={manager} onChange={(event) => setManager(event.target.value)}>{['npm', 'pnpm', 'yarn', 'bun'].map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="setup-commands"><Command key={`${manager}-react`} command={`${install} @duckalization/react`} copyLabel={__('Copy')} copiedLabel={__('Copied')} size="sm" /><Command key={`${manager}-cli`} command={`${install} -D @duckalization/cli`} copyLabel={__('Copy')} copiedLabel={__('Copied')} size="sm" /></div></div></li>
              <li data-parallax="enter" data-parallax-y="40"><span>02</span><div><h3>{__('Tell it how you sound')}</h3><p>{__('Choose your languages. Define your tone, terminology, and style. Your agent receives that guidance with the strings it translates.')}</p><StyleExamples /></div></li>
              <li data-parallax="enter" data-parallax-y="48"><span>03</span><div><h3>{__('Build like you always do')}</h3><p>{__('Write English inline with __(). With the translation workflow in its instructions, your agent handles the catalogs as it works.')}</p></div></li>
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
