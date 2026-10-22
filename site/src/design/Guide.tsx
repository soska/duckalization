/*
 * /design: the site's design system on one page. Every token section reads
 * the token JSON (./tokenData.ts), and every component is the real one, in
 * each variant and in both themes. It's the reference for the Figma library.
 */
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/jetbrains-mono';
import './index.ts';
import './guide.css';
import { useEffect, useState, type ReactNode } from 'react';
import { EDITED_STRING, EDITED_TRANSCRIPT } from '../landing/script.ts';
import { INSTALL, MESSAGES, TRANSCRIPT } from '../shared/facts.ts';
import { useDirection } from '../shared/motion.ts';
import { messageId } from '../shared/real.ts';
import {
  Button,
  Command,
  Duck,
  Logo,
  Marker,
  Meter,
  Note,
  SectionTitle,
  SegmentedControl,
  Stamp,
  Tag,
  TextLink,
  Toggle,
  type DuckMood,
} from './index.ts';
import {
  cssVar,
  dark,
  effects,
  FLUID,
  leaf,
  light,
  primitives,
  px,
  refOf,
  resolve,
  STRETCH,
  typography,
  under,
  type Token,
} from './tokenData.ts';

type Theme = 'system' | 'light' | 'dark';
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/** Distinct second-level groups, in file order (`color.brown`, `color.yellow`, …). */
const groups = (tokens: Token[], depth: number) => [...new Set(tokens.map((t) => t.path.split('.').slice(0, depth).join('.')))];

const SECTIONS = [
  ['colors', 'Color primitives'],
  ['theme', 'Theme roles'],
  ['type', 'Typography'],
  ['space', 'Spacing'],
  ['shape', 'Radius, borders, shadows'],
  ['motion', 'Motion'],
  ['layout', 'Breakpoints and layers'],
  ['components', 'Components'],
] as const;

function Section({ id, title, figma, children }: { id: string; title: string; figma: ReactNode; children: ReactNode }) {
  return (
    <section className="dg-section" id={id} aria-labelledby={`${id}-h`}>
      <header className="dg-section-head">
        <h2 id={`${id}-h`} className="dk-text-heading-3">
          {title}
        </h2>
        <p className="dg-figma">{figma}</p>
      </header>
      {children}
    </section>
  );
}

/** A token's name as Figma shows it, and its CSS variable. */
function Name({ path, css = true }: { path: string; css?: boolean }) {
  return (
    <span className="dg-name">
      <b>{path.replaceAll('.', '/')}</b>
      {css && <code>{cssVar(path)}</code>}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Tokens                                                           */
/* ---------------------------------------------------------------- */

function ColorRamps() {
  const colors = under(primitives, 'color');
  return (
    <div className="dg-ramps">
      {groups(colors, 2).map((ramp) => (
        <div key={ramp} className="dg-ramp">
          <h3 className="dg-label">{leaf(ramp)}</h3>
          <ul className="dg-swatches">
            {under(colors, ramp).map((t) => (
              <li key={t.path}>
                <span className="dg-chip" style={{ background: `var(${cssVar(t.path)})` }} />
                <span className="dg-swatch-text">
                  <b>{leaf(t.path)}</b>
                  <code>{String(t.value)}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ThemeRoles() {
  const darkByPath = new Map(dark.map((t) => [t.path, t]));
  return (
    <div className="dg-roles">
      {groups(light, 2).map((group) => (
        <table key={group} className="dg-table">
          <caption className="dg-label">{leaf(group)}</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Light</th>
              <th scope="col">Dark</th>
            </tr>
          </thead>
          <tbody>
            {under(light, group).map((t) => {
              const d = darkByPath.get(t.path)!;
              return (
                <tr key={t.path}>
                  <th scope="row">
                    <Name path={t.path} />
                    {t.description && <span className="dg-desc">{t.description}</span>}
                  </th>
                  {[t, d].map((mode, i) => (
                    <td key={i} data-theme={i ? 'dark' : 'light'} className="dg-role-cell">
                      <span className="dg-chip" style={{ background: `var(${cssVar(t.path)})` }} />
                      <span className="dg-swatch-text">
                        <b>{refOf(mode.value)?.replace(/^color\./, '') ?? String(mode.value)}</b>
                        <code>{String(resolve(mode.value))}</code>
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </div>
  );
}

const fontName = (v: unknown) => {
  const r = resolve(v);
  return Array.isArray(r) ? String(r[0]).replace(' Variable', '') : String(r);
};

function TypeStyles() {
  return (
    <ul className="dg-type">
      {typography.map((t) => {
        const v = t.value as Record<string, string>;
        const name = t.path.replace(/^text\./, '');
        const fluid = t.extensions[FLUID] as { min: string; max: string } | undefined;
        const stretch = t.extensions[STRETCH];
        const mono = fontName(v.fontFamily).includes('Mono');
        const meta = [
          fontName(v.fontFamily),
          String(resolve(v.fontWeight)),
          fluid ? `${resolve(fluid.min)}–${resolve(fluid.max)} fluid` : String(resolve(v.fontSize)),
          `line ${resolve(v.lineHeight)}`,
          v.letterSpacing && `tracking ${resolve(v.letterSpacing)}`,
          stretch !== undefined && `width ${resolve(stretch)}%`,
        ].filter(Boolean);
        return (
          <li key={t.path}>
            <p className={`dk-text-${name} dg-type-sample`}>
              {mono ? "__('Welcome back, {name}')" : 'Write English. Your agent translates.'}
            </p>
            <p className="dg-type-meta">
              <b>{t.path.replaceAll('.', '/')}</b> <code>.dk-text-{name}</code> · {meta.join(' · ')}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Spacing() {
  const space = [...under(primitives, 'space')].sort((a, b) => px(a.value) - px(b.value));
  return (
    <ul className="dg-space">
      {space.map((t) => (
        <li key={t.path}>
          <Name path={t.path} />
          <span className="dg-space-bar" style={{ width: `var(${cssVar(t.path)})` }} />
          <code>{String(t.value)}</code>
        </li>
      ))}
    </ul>
  );
}

function Shape() {
  return (
    <div className="dg-shape">
      <div>
        <h3 className="dg-label">Radius</h3>
        <ul className="dg-tiles">
          {under(primitives, 'radius').map((t) => (
            <li key={t.path}>
              <span className="dg-tile" style={{ borderRadius: `var(${cssVar(t.path)})` }} />
              <Name path={t.path} css={false} />
              <code>{String(t.value)}</code>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="dg-label">Border width</h3>
        <ul className="dg-tiles">
          {under(primitives, 'borderWidth').map((t) => (
            <li key={t.path}>
              <span className="dg-tile" style={{ borderWidth: `var(${cssVar(t.path)})` }} />
              <Name path={t.path} css={false} />
              <code>{String(t.value)}</code>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="dg-label">Shadow (effect styles)</h3>
        <ul className="dg-tiles">
          {effects.map((t) => {
            const s = t.value as Record<string, string>;
            return (
              <li key={t.path}>
                <span className="dg-tile is-raised" style={{ boxShadow: `var(${cssVar(t.path)})` }} />
                <Name path={t.path} css={false} />
                <code>
                  {s.offsetX} {s.offsetY}, {refOf(s.color)}
                </code>
                {t.description && <span className="dg-desc">{t.description}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** A cubic-bezier as a curve in a 100×100 box (y up). */
function Curve({ points }: { points: number[] }) {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = points;
  const P = (x: number, y: number) => `${(x * 100).toFixed(1)},${((1 - y) * 100).toFixed(1)}`;
  return (
    <svg className="dg-curve" viewBox="-4 -4 108 108" aria-hidden="true">
      <path className="dg-curve-axis" d="M0,0 V100 H100" />
      <path className="dg-curve-handle" d={`M${P(0, 0)} L${P(x1, y1)} M${P(1, 1)} L${P(x2, y2)}`} />
      <path className="dg-curve-line" d={`M${P(0, 0)} C${P(x1, y1)} ${P(x2, y2)} ${P(1, 1)}`} />
    </svg>
  );
}

function Motion() {
  return (
    <div className="dg-motion">
      <div>
        <h3 className="dg-label">Duration</h3>
        <p className="dg-hint">Point at a row to run it.</p>
        <ul className="dg-durations">
          {under(primitives, 'duration').map((t) => (
            <li key={t.path} tabIndex={0} style={{ ['--dg-duration' as string]: `var(${cssVar(t.path)})` }}>
              <Name path={t.path} css={false} />
              <code>{String(t.value)}</code>
              <span className="dg-run" aria-hidden="true">
                <span />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="dg-label">Easing</h3>
        <ul className="dg-easings">
          {under(primitives, 'easing').map((t) => (
            <li key={t.path}>
              <Curve points={t.value as number[]} />
              <Name path={t.path} css={false} />
              <code>{(t.value as number[]).join(', ')}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <dl className="dg-defs">
      {[...under(primitives, 'breakpoint'), ...under(primitives, 'zIndex')].map((t) => (
        <div key={t.path}>
          <dt>
            <Name path={t.path} css={t.path.startsWith('zIndex')} />
          </dt>
          <dd>
            <code>{String(t.value)}</code>
          </dd>
        </div>
      ))}
      <p className="dg-hint">
        Media queries can't read custom properties, so CSS writes breakpoints as literals tagged{' '}
        <code>/* token: breakpoint.md */</code>.
      </p>
    </dl>
  );
}

/* ---------------------------------------------------------------- */
/* Components                                                       */
/* ---------------------------------------------------------------- */

const PLAY = <path d="M5 2.5v11l9-5.5z" />;
/** Specimen content is the demo's real data, not lorem ipsum. */
const RENAMED_ID = messageId(EDITED_STRING);

/** One component: its props, then its specimens in light and in dark. */
function Spec({ name, props, about, children }: { name: string; props: string; about: ReactNode; children: (mode: 'light' | 'dark') => ReactNode }) {
  return (
    <article className="dg-spec" aria-labelledby={`c-${name}`}>
      <header className="dg-spec-head">
        <h3 id={`c-${name}`} className="dk-text-heading-4">
          {name}
        </h3>
        <p className="dg-desc">{about}</p>
        <code className="dg-props">{props}</code>
      </header>
      <div className="dg-modes">
        {(['light', 'dark'] as const).map((mode) => (
          <div key={mode} className="dg-stage" data-theme={mode}>
            <span className="dg-mode">{mode}</span>
            {children(mode)}
          </div>
        ))}
      </div>
    </article>
  );
}

function Row({ label, children, terminal }: { label: string; children: ReactNode; terminal?: boolean }) {
  return (
    <div className="dg-row" data-terminal={terminal || undefined}>
      <span className="dg-row-label">{label}</span>
      <div className="dg-row-items">{children}</div>
    </div>
  );
}

function LiveSegmented({ size }: { size: 'sm' | 'md' }) {
  const [value, setValue] = useState<'en' | 'es'>('en');
  return (
    <SegmentedControl
      label={`Language (${size})`}
      size={size}
      value={value}
      onChange={setValue}
      options={[
        { value: 'en', label: 'English', lang: 'en' },
        { value: 'es', label: 'Español', lang: 'es' },
      ]}
    />
  );
}

function LiveToggle({ size, initial }: { size: 'sm' | 'md'; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <Toggle pressed={on} onChange={setOn} size={size}>
      Show fallbacks
    </Toggle>
  );
}

const MOODS: DuckMood[] = ['idle', 'reading', 'reject', 'happy'];

function Components() {
  return (
    <div className="dg-specs">
      <Spec
        name="Button"
        props="variant: primary | secondary · size: md | sm · shape: pill | circle · disabled · href → <a>"
        about="The sticker button: ink outline, offset shadow. Lifts on hover, presses into its shadow."
      >
        {() => (
          <>
            <Row label="md">
              <Button variant="primary" href="#components">
                Source on GitHub
              </Button>
              <Button>Secondary</Button>
              <Button variant="primary" shape="circle" aria-label="Play">
                <svg className="dk-button-icon" viewBox="0 0 16 16" aria-hidden="true">
                  {PLAY}
                </svg>
              </Button>
            </Row>
            <Row label="sm">
              <Button size="sm">← Previous</Button>
              <Button size="sm" disabled>
                Next →
              </Button>
              <Button size="sm" variant="primary" shape="circle" aria-label="Play">
                <svg className="dk-button-icon" viewBox="0 0 16 16" aria-hidden="true">
                  {PLAY}
                </svg>
              </Button>
            </Row>
          </>
        )}
      </Spec>

      <Spec name="TextLink" props="<a> attributes" about="Inline link with a beak-orange underline that turns to ink on hover.">
        {() => (
          <Row label="default">
            <TextLink href="#components">The guide for agents (llms.txt)</TextLink>
          </Row>
        )}
      </Spec>

      <Spec name="Logo" props="href = '/'" about="The wordmark: the duck-face call, then the name.">
        {() => (
          <Row label="default">
            <Logo href="#top" />
          </Row>
        )}
      </Spec>

      <Spec
        name="SegmentedControl"
        props="label · options: { value, label, lang? }[] · value · onChange · size: md | sm"
        about="One-of-n setting as pressed buttons (aria-pressed), not tabs."
      >
        {() => (
          <>
            <Row label="md">
              <LiveSegmented size="md" />
            </Row>
            <Row label="sm">
              <LiveSegmented size="sm" />
            </Row>
          </>
        )}
      </Spec>

      <Spec name="Toggle" props="pressed · onChange · size: md | sm" about="An on/off pill whose dot fills when on.">
        {() => (
          <>
            <Row label="md">
              <LiveToggle size="md" initial={false} />
              <LiveToggle size="md" initial />
            </Row>
            <Row label="sm">
              <LiveToggle size="sm" initial={false} />
              <LiveToggle size="sm" initial />
            </Row>
          </>
        )}
      </Spec>

      <Spec name="Meter" props="value: 0–1 · label? (makes it a role=meter)" about="A small gauge; decorative when the number is said in text beside it.">
        {() => (
          <Row label="value">
            <Meter value={0} />
            <Meter value={0.4} />
            <Meter value={1} />
          </Row>
        )}
      </Spec>

      <Spec name="Command" props="command · copyLabel · copiedLabel · size: md | sm" about="A shell command with a copy button.">
        {() => (
          <>
            <Row label="md">
              <Command command={INSTALL.react} copyLabel="Copy" copiedLabel="Copied" />
            </Row>
            <Row label="sm">
              <Command command={INSTALL.cli} copyLabel="Copy" copiedLabel="Copied" size="sm" />
            </Row>
          </>
        )}
      </Spec>

      <Spec name="SectionTitle" props="eyebrow · title · id" about="A section's mono eyebrow and its big heading.">
        {(mode) => (
          <div className="dg-free">
            <SectionTitle id={`section-title-${mode}`} eyebrow="How it works" title="How a string gets translated" />
          </div>
        )}
      </Spec>

      <Spec name="Duck" props="mood: idle | reading | reject | happy · on: page | terminal · size via font-size" about="The mascot is the call itself: __(''). Moods only move glyphs.">
        {() => (
          <>
            <Row label="page">
              {MOODS.map((m) => (
                <span key={m} className="dg-duck">
                  <Duck mood={m} />
                  <small>{m}</small>
                </span>
              ))}
            </Row>
            <Row label="terminal" terminal>
              {MOODS.map((m) => (
                <span key={m} className="dg-duck">
                  <Duck mood={m} on="terminal" />
                  <small>{m}</small>
                </span>
              ))}
            </Row>
          </>
        )}
      </Spec>

      <Spec name="Marker" props="n: 1 | 2 | 3 · size: md | sm · on: page | terminal" about="Pairs a line of code with the element it renders: same number, same color.">
        {() => (
          <>
            <Row label="md">
              <Marker n={1} />
              <Marker n={2} />
              <Marker n={3} />
            </Row>
            <Row label="sm">
              <Marker n={1} size="sm" />
              <Marker n={2} size="sm" />
              <Marker n={3} size="sm" />
            </Row>
            <Row label="terminal" terminal>
              <Marker n={1} on="terminal" />
              <Marker n={2} on="terminal" />
              <Marker n={3} on="terminal" />
            </Row>
          </>
        )}
      </Spec>

      <Spec name="Note" props="tone: default | success | danger" about="A sticker note pinned beside the thing it explains.">
        {() => (
          <div className="dg-stack">
            <Note>Exact text: no trimming, no case folding.</Note>
            <Note tone="success">Not in es.json yet, so your app renders the inline English.</Note>
            <Note tone="danger">An invented placeholder and an unknown ID.</Note>
          </div>
        )}
      </Spec>

      <Spec name="Stamp" props="tone: danger | success | warning · tilt: left | right | none" about="A line of tool output stamped on the page, in its status color.">
        {() => (
          <div className="dg-stack">
            <Stamp tone="danger">{TRANSCRIPT.rejected.at(-1)!.text}</Stamp>
            <Stamp tone="success" tilt="right">
              {TRANSCRIPT.applied.at(-1)!.text}
            </Stamp>
            <Stamp tone="warning" tilt="none">
              {EDITED_TRANSCRIPT.at(-1)!.text}
            </Stamp>
          </div>
        )}
      </Spec>

      <Spec name="Tag" props="tone: ink | danger | fallback · size: md | sm" about="A mono chip for a message ID.">
        {() => (
          <>
            <Row label="md">
              <Tag>{MESSAGES.welcome.id}</Tag>
              <Tag tone="danger">zzz123</Tag>
              <Tag tone="fallback">en · {RENAMED_ID}</Tag>
            </Row>
            <Row label="sm">
              <Tag size="sm">{MESSAGES.welcome.id}</Tag>
              <Tag tone="danger" size="sm">
                zzz123
              </Tag>
              <Tag tone="fallback" size="sm">
                en · {RENAMED_ID}
              </Tag>
            </Row>
          </>
        )}
      </Spec>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function Guide() {
  useDirection('design');
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'system') delete html.dataset.theme;
    else html.dataset.theme = theme;
    return () => {
      delete html.dataset.theme;
    };
  }, [theme]);

  return (
    <div className="dg" id="top">
      <header className="dg-bar">
        <div className="dg-wrap dg-bar-inner">
          <Logo />
          <span className="dg-bar-title">Design system</span>
          <SegmentedControl label="Page theme" options={THEMES} value={theme} onChange={setTheme} size="sm" />
        </div>
      </header>
      <main className="dg-wrap">
        <div className="dg-intro">
          <h1 className="dk-text-heading-2">Tokens and components</h1>
          <p className="dk-text-lede">
            Everything the landing page is drawn with. Token sections read{' '}
            <code>src/design/tokens/*.tokens.json</code> directly, and components are the real ones from{' '}
            <code>src/design/components</code>, each shown in light and dark.
          </p>
          <nav aria-label="Sections">
            <ul className="dg-toc">
              {SECTIONS.map(([id, title]) => (
                <li key={id}>
                  <a href={`#${id}`}>{title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Section id="colors" title="Color primitives" figma={<>Figma: variable collection <b>Primitives</b>. Raw values; components never use these directly.</>}>
          <ColorRamps />
        </Section>
        <Section id="theme" title="Theme roles" figma={<>Figma: variable collection <b>Theme</b>, modes <b>Light</b> and <b>Dark</b>.</>}>
          <ThemeRoles />
        </Section>
        <Section id="type" title="Typography" figma={<>Figma: one <b>text style</b> per token. Fluid styles store their largest size.</>}>
          <TypeStyles />
        </Section>
        <Section id="space" title="Spacing" figma={<>Figma: <b>Primitives</b> / space. A 4px grid; <code>_5</code> marks a half step.</>}>
          <Spacing />
        </Section>
        <Section id="shape" title="Radius, borders, shadows" figma={<>Figma: <b>Primitives</b> / radius, borderWidth; shadows are <b>effect styles</b> bound to color/shadow/sticker.</>}>
          <Shape />
        </Section>
        <Section id="motion" title="Motion" figma={<>Figma: <b>Primitives</b> / duration, easing (for prototypes). Only transform and opacity animate.</>}>
          <Motion />
        </Section>
        <Section id="layout" title="Breakpoints and layers" figma={<>Figma: <b>Primitives</b> / breakpoint, zIndex. Frame widths for the three layouts.</>}>
          <Layout />
        </Section>
        <Section id="components" title="Components" figma={<>Figma: one <b>component set</b> each; the props below are its properties.</>}>
          <Components />
        </Section>
      </main>
    </div>
  );
}
