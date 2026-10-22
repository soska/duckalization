import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_SOURCE, ES_CATALOG } from '../../shared/facts.ts';
import { useReducedMotion, useScrollProgress } from '../../shared/motion.ts';
import { createDuck, messageId, useLocale } from '../../shared/real.ts';
import { Duck, type DuckMood } from './Duck.tsx';
import { useT } from './i18n.tsx';
import { actorAt, chapterAt, CHAPTERS, EDITED_SOURCE, EDITED_STRING, SCRIPT, type Actor, type Ev } from './script.ts';

/*
 * Scroll is the clock. The session (B's script: real CLI lines, the agent's
 * real bad and good output) is a pure function of time t, and t is a pure
 * function of how far the visitor has scrolled through the section. React
 * re-renders only when a new event or a new typed character becomes visible;
 * the progress rail is written straight to the DOM every frame.
 */

/** Scroll distance per millisecond of session: ~4,800px for the whole run. */
const MS_PER_PX = 7;
const TRAVEL = Math.round(SCRIPT.duration / MS_PER_PX);
const EVENTS = SCRIPT.events;

/** 0-based lines of DEMO_SOURCE that hold the three messages, in highlight order. */
const LINES = DEMO_SOURCE.split('\n');
const MESSAGE_LINES = LINES.flatMap((line, n) => (line.includes('__(') ? [n] : []));
const EDIT_LINE = MESSAGE_LINES[MESSAGE_LINES.length - 1]!;

/** Events are pushed in time order, so "how many are visible" is a binary search. */
function visibleCount(t: number): number {
  let lo = 0;
  let hi = EVENTS.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (EVENTS[mid]!.at <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** What the stage looks like at t, as a string: re-render only when it changes. */
function signature(t: number): string {
  const n = visibleCount(t);
  const last = EVENTS[n - 1];
  if (last?.type === 'cmd' && t < last.at + last.dur) {
    return `${n}:${Math.floor((t - last.at) / (last.dur / last.text.length))}`;
  }
  return `${n}`;
}

const shown = (ev: Ev, t: number) => ev.at <= t;
const firstEvent = (pred: (ev: Ev) => boolean) => EVENTS.find(pred)!;

/* ---------- annotations: A's numbered callouts, anchored to real lines ---------- */

type Anchor = { pane: 'you'; line: number } | { pane: 'cli' | 'agent'; key: number } | { pane: 'render' };
interface Note {
  chapter: number;
  at: number;
  anchor: Anchor;
  text: ReactNode;
}

const ev = {
  highlight0: firstEvent((e) => e.type === 'highlight' && e.index === 0),
  highlight1: firstEvent((e) => e.type === 'highlight' && e.index === 1),
  extracted: firstEvent((e) => e.type === 'out' && e.text.startsWith('✓ 3 unique')),
  briefed: firstEvent((e) => e.type === 'out' && e.text.includes('es.brief.json')),
  agentReads: firstEvent((e) => e.type === 'file' && e.verb === 'reads'),
  slip: firstEvent((e) => e.type === 'code' && e.tone === 'bad' && e.text.includes('{nombre}')),
  unknown: firstEvent((e) => e.type === 'out' && e.text.startsWith('error[unknown-placeholder]')),
  rejected: firstEvent((e) => e.type === 'out' && e.text.startsWith('✗')),
  applied: firstEvent((e) => e.type === 'out' && e.text.includes('applied')),
  edit: firstEvent((e) => e.type === 'edit'),
  orphaned: firstEvent((e) => e.type === 'out' && e.text.includes('orphaned')),
  render: firstEvent((e) => e.type === 'render'),
};

function useNotes(): Note[] {
  const { __ } = useT();
  return [
    { chapter: 0, at: ev.highlight0.at, anchor: { pane: 'you', line: MESSAGE_LINES[0]! }, text: __('The English string is the message. There is no key to invent.') },
    { chapter: 0, at: ev.highlight1.at, anchor: { pane: 'you', line: MESSAGE_LINES[1]! }, text: __('A plural is an object of CLDR forms, still inline.') },
    { chapter: 1, at: ev.extracted.at, anchor: { pane: 'cli', key: ev.extracted.key }, text: __('Every string is hashed into its ID. Repeats become one entry.') },
    { chapter: 1, at: ev.briefed.at, anchor: { pane: 'cli', key: ev.briefed.key }, text: __('The brief is self-contained: the agent needs no repo access.') },
    { chapter: 2, at: ev.agentReads.at, anchor: { pane: 'agent', key: ev.agentReads.key }, text: __('Any agent. This pane is the only place a model is involved.') },
    { chapter: 2, at: ev.slip.at, anchor: { pane: 'agent', key: ev.slip.key }, text: __('A plausible slip: it renamed {name} to {nombre}.', { name: '{name}', nombre: '{nombre}' }) },
    { chapter: 3, at: ev.unknown.at, anchor: { pane: 'cli', key: ev.unknown.key }, text: __('I check: {nombre} is not in the source message.', { nombre: '{nombre}' }) },
    { chapter: 3, at: ev.rejected.at, anchor: { pane: 'cli', key: ev.rejected.key }, text: __('One error and the whole file bounces. Nothing is written.') },
    { chapter: 3, at: ev.applied.at, anchor: { pane: 'cli', key: ev.applied.key }, text: __('The corrected file passes, and only then lands in es.json.') },
    { chapter: 4, at: ev.edit.at, anchor: { pane: 'you', line: EDIT_LINE }, text: __('Edit a string and it gets a new ID.') },
    { chapter: 4, at: ev.orphaned.at, anchor: { pane: 'cli', key: ev.orphaned.key }, text: __('The old translation is orphaned; the new string is missing.') },
    { chapter: 4, at: ev.render.at, anchor: { pane: 'render' }, text: __('Missing translations fall back to your English.') },
  ];
}

/** Callout numbers restart per chapter, like figure annotations. */
function numbered(notes: Note[]) {
  return notes.map((note) => ({ ...note, n: notes.filter((m) => m.chapter === note.chapter && m.at <= note.at).length }));
}
type NumberedNote = ReturnType<typeof numbered>[number];

function Mark({ n, on }: { n: number; on: boolean }) {
  return (
    <span className="gk-mark" data-on={on || undefined} aria-hidden="true">
      {n}
    </span>
  );
}

/** The callout numbers that belong at one anchor, for the current chapter. */
function marksAt(notes: NumberedNote[], chapter: number, t: number, match: (a: Anchor) => boolean) {
  return notes
    .filter((note) => note.chapter === chapter && match(note.anchor))
    .map((note) => <Mark key={note.n} n={note.n} on={note.at <= t} />);
}

/* ---------- panes (B's actors, in the duck's clothes) ---------- */

function useFollow(
  viewport: React.RefObject<HTMLDivElement | null>,
  inner: React.RefObject<HTMLDivElement | null>,
  lastKey: number | undefined,
  reduced: boolean,
  active: boolean,
  anchor: string | undefined
) {
  useLayoutEffect(() => {
    const vp = viewport.current;
    const el = inner.current;
    if (!vp || !el) return;
    let offset = 0;
    const top = anchor ? el.querySelector<HTMLElement>(anchor) : null;
    if (top) {
      offset = Math.max(0, top.offsetTop - 10);
    } else {
      const target = lastKey === undefined ? null : el.querySelector<HTMLElement>(`[data-key="${lastKey}"]`);
      const bottom = target ? target.offsetTop + target.offsetHeight : 0;
      offset = Math.max(0, bottom - vp.clientHeight + 18);
    }
    if (reduced) {
      el.style.transform = '';
      vp.scrollTop = offset;
    } else {
      // Transform, not scrollTop: the content glides and nothing reflows.
      el.style.transform = `translate3d(0, ${-offset}px, 0)`;
    }
  }, [viewport, inner, lastKey, reduced, active, anchor]);
}

function lastShownKey(actor: Actor, t: number): number | undefined {
  let key: number | undefined;
  for (const e of EVENTS) {
    if (e.at > t) break;
    if (e.actor === actor && e.type !== 'highlight' && e.type !== 'edit' && e.type !== 'render') key = e.key;
  }
  return key;
}

interface PaneProps {
  actor: Actor;
  label: string;
  role: string;
  speaking: boolean;
  active: boolean;
  tabbed: boolean;
  reduced: boolean;
  t: number;
  footer?: ReactNode;
  anchor?: string;
  children: ReactNode;
}

function Pane({ actor, label, role, speaking, active, tabbed, reduced, t, footer, anchor, children }: PaneProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useFollow(viewport, inner, lastShownKey(actor, t), reduced, active, anchor);
  return (
    <section
      className={`gk-pane gk-pane--${actor}`}
      data-speaking={speaking || undefined}
      aria-label={label}
      {...(tabbed && { role: 'tabpanel', id: `gk-panel-${actor}`, 'aria-labelledby': `gk-tab-${actor}`, hidden: !active })}
    >
      <header className="gk-pane-head">
        <p className="gk-pane-name">
          <span className="gk-live" aria-hidden="true" />
          {label}
        </p>
        <p className="gk-pane-role">{role}</p>
      </header>
      {/* Recorded output stays as recorded: English, untranslated. */}
      <div className="gk-viewport" ref={viewport} tabIndex={reduced ? 0 : -1} lang="en" translate="no">
        <div className="gk-inner" ref={inner}>
          {children}
        </div>
      </div>
      {footer}
    </section>
  );
}

function YouPane({ t, marks }: { t: number; marks: (line: number) => ReactNode }) {
  const highlights = EVENTS.filter((e) => e.type === 'highlight' && shown(e, t)).length;
  const edited = shown(ev.edit, t);
  const strings = (line: string, on: boolean) =>
    line.split(/('[^']*')/).map((part, i) =>
      part.startsWith("'") ? (
        <span key={i} className="gk-str" data-on={on || undefined}>
          {part}
        </span>
      ) : (
        part
      )
    );
  return (
    <ol className="gk-code">
      {LINES.map((line, n) => {
        const order = MESSAGE_LINES.indexOf(n);
        const on = order >= 0 && order < highlights;
        if (n === EDIT_LINE) {
          return (
            <li key={n} data-line={n} className="gk-swap" data-edited={edited || undefined}>
              <span className="gk-swap-a" aria-hidden={edited}>
                {strings(line, on)}
              </span>
              <span className="gk-swap-b" aria-hidden={!edited}>
                {strings(EDITED_SOURCE, true)}
              </span>
              {marks(n)}
            </li>
          );
        }
        return (
          <li key={n} data-line={n}>
            {order >= 0 ? strings(line, on) : line || ' '}
            {marks(n)}
          </li>
        );
      })}
    </ol>
  );
}

function CliPane({ t, marks }: { t: number; marks: (key: number) => ReactNode }) {
  return (
    <ol className="gk-term">
      {EVENTS.filter((e) => e.actor === 'cli').map((e) => {
        const on = shown(e, t);
        if (e.type === 'cmd') {
          const typed = Math.min(e.text.length, Math.max(0, Math.floor((t - e.at) / (e.dur / e.text.length))));
          const typing = on && typed < e.text.length;
          return (
            <li key={e.key} data-key={e.key} className="gk-line gk-cmd-line" data-on={on || undefined} aria-hidden={!on}>
              <span className="gk-prompt" aria-hidden="true">
                $
              </span>
              <span>{e.text.slice(0, typed)}</span>
              {typing && <span className="gk-caret" aria-hidden="true" />}
              <span className="gk-ghost" aria-hidden="true">
                {e.text.slice(typed)}
              </span>
            </li>
          );
        }
        if (e.type !== 'out') return null;
        return (
          <li key={e.key} data-key={e.key} className={`gk-line gk-out gk-${e.kind}`} data-on={on || undefined} aria-hidden={!on}>
            {e.text}
            {marks(e.key)}
          </li>
        );
      })}
    </ol>
  );
}

/** When the validator's errors appear, the offending agent lines get flagged. */
const CULPRITS = ['{nombre}', 'zzz123'];

function AgentPane({ t, marks, idleText, pageLang }: { t: number; marks: (key: number) => ReactNode; idleText: ReactNode; pageLang: string }) {
  const events = EVENTS.filter((e) => e.actor === 'agent');
  const idle = !events.some((e) => shown(e, t));
  return (
    <>
      <p className="gk-idle" data-on={idle || undefined} aria-hidden={!idle} lang={pageLang} translate="yes">
        {idleText}
      </p>
      <ol className="gk-agent">
        {events.map((e) => {
          const on = shown(e, t);
          const common = { 'data-key': e.key, 'data-on': on || undefined, 'aria-hidden': !on };
          if (e.type === 'note') {
            return (
              <li key={e.key} {...common} className="gk-a gk-note">
                {e.text}
                {marks(e.key)}
              </li>
            );
          }
          if (e.type === 'file') {
            return (
              <li key={e.key} {...common} className={`gk-a gk-file gk-file--${e.verb}`}>
                <span>{e.verb}</span> <code>{e.path}</code>
                {marks(e.key)}
              </li>
            );
          }
          if (e.type === 'code') {
            const culprit = e.tone === 'bad' && CULPRITS.some((c) => e.text.includes(c));
            return (
              <li
                key={e.key}
                {...common}
                className={`gk-a gk-json gk-json--${e.tone}`}
                data-flagged={(culprit && t >= ev.unknown.at) || undefined}
              >
                {e.text}
                {marks(e.key)}
              </li>
            );
          }
          return null;
        })}
      </ol>
    </>
  );
}

/** The ship beat, computed by the real runtime against a now-partial catalog. */
function useRenderedCart() {
  return useMemo(() => {
    const missing: string[] = [];
    const cart = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: (id) => missing.push(id) });
    cart.load('es', ES_CATALOG);
    const { __: t } = cart;
    return {
      heading: t('Welcome back, {name}', { name: 'Ana' }),
      items: t({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count: 3 }),
      button: t(EDITED_STRING),
      missingId: missing[0] ?? messageId(EDITED_STRING),
    };
  }, []);
}

function CartRender({ t, mark }: { t: number; mark: ReactNode }) {
  const { __ } = useT();
  const on = shown(ev.render, t);
  const cart = useRenderedCart();
  return (
    <figure className="gk-render" data-on={on || undefined} aria-hidden={!on}>
      <figcaption>
        <span>{__('Your app, in Spanish')}</span>
        <span>{__('real runtime')}</span>
      </figcaption>
      <div className="gk-cart" lang="es">
        <p className="gk-cart-h">{cart.heading}</p>
        <p className="gk-cart-p">{cart.items}</p>
        <p className="gk-cart-b">
          <span className="gk-cart-btn" lang="en">
            {cart.button}
          </span>
          <span className="gk-fallback">
            fallback · en · <code>{cart.missingId}</code>
          </span>
          {mark}
        </p>
      </div>
    </figure>
  );
}

/* ---------- the stage ---------- */

/** The five beats as real `__` calls, so they are extracted and translated. */
function useBeats() {
  const { __, __s } = useT();
  return [
    { title: __('Write English inline'), label: __s('Write English inline'), body: __('The string in your code is the message. Nothing else changes.') },
    { title: __('Extract a brief'), label: __s('Extract a brief'), body: __('The CLI hashes each string into an ID and writes a self-contained work order for an agent.') },
    { title: __('Any agent translates'), label: __s('Any agent translates'), body: __('The CLI never calls a model. Bring whichever agent you like.') },
    { title: __('Code checks the work'), label: __s('Code checks the work'), body: __('Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.') },
    { title: __('Ship a partial catalog'), label: __s('Ship a partial catalog'), body: __('Missing translations fall back to the inline English.') },
  ];
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function duckMood(t: number): DuckMood {
  if (t >= ev.unknown.at && t < ev.applied.at) return 'reject';
  if (t >= ev.applied.at && t < ev.edit.at) return 'happy';
  if (t >= ev.extracted.at - 600 && t < ev.agentReads.at) return 'reading';
  return 'idle';
}

interface StageProps {
  t: number;
  reduced: boolean;
  /** Reduced motion shows a chapter complete; otherwise the chapter follows t. */
  chapter: number;
  railRef?: React.Ref<HTMLSpanElement>;
  controls: ReactNode;
  frameLabel?: string;
}

function Stage({ t, reduced, chapter, railRef, controls, frameLabel }: StageProps) {
  const { __, __s } = useT();
  const tabbed = useMedia('(max-width: 899px)');
  const [locale] = useLocale();
  const notes = numbered(useNotes());
  const chapterNotes = notes.filter((n) => n.chapter === chapter);
  // Phones show one callout at a time: the newest visible one (or the first).
  const latestNote = chapterNotes.filter((n) => reduced || n.at <= t).at(-1)?.n ?? 1;

  // Mobile: the visible pane follows whoever is speaking, unless the visitor picked one.
  const speaking = reduced ? null : actorAt(t);
  const [pinned, setPinned] = useState<Actor | null>(null);
  useEffect(() => setPinned(null), [speaking, chapter]);
  const reducedDefault: Actor = chapter === 0 || chapter === 4 ? 'you' : chapter === 2 ? 'agent' : 'cli';
  const shownActor: Actor = pinned ?? speaking ?? reducedDefault;

  const beats = useBeats();

  const actors: { id: Actor; label: string; role: string }[] = [
    { id: 'you', label: __s('you'), role: 'src/Cart.tsx' },
    { id: 'agent', label: __s('agent'), role: __s('any model · the only judgment') },
    { id: 'cli', label: 'duckalize', role: __s('deterministic · never calls a model') },
  ];

  const youMarks = (line: number) => marksAt(notes, chapter, t, (a) => a.pane === 'you' && a.line === line);
  const keyMarks = (pane: 'cli' | 'agent') => (key: number) =>
    marksAt(notes, chapter, t, (a) => a.pane === pane && a.key === key);
  const renderMark = marksAt(notes, chapter, t, (a) => a.pane === 'render');
  const rendered = shown(ev.render, t);

  return (
    <div className="gk-stage" data-reduced={reduced || undefined}>
      <div className="gk-explain">
        <div className="gk-beat-head">
          <p className="gk-beat-n" aria-hidden="true">
            <span className="gk-beat-digits">
              {beats.map((_, i) => (
                <span key={i} data-on={chapter === i || undefined}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              ))}
            </span>
            <span className="gk-beat-of">/ 05</span>
          </p>
          <Duck mood={reduced ? 'idle' : duckMood(t)} className="gk-duck-checker" />
        </div>
        {frameLabel && <p className="gk-frame-label">{frameLabel}</p>}
        {/* All five stacked in one cell: switching beats crossfades, nothing reflows. */}
        <div className="gk-beat-copy">
          {beats.map((b, i) => (
            <div key={i} className="gk-beat" data-on={chapter === i || undefined} aria-hidden={chapter !== i}>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
        <ol className="gk-notes" aria-label={__s('Callouts')} key={chapter}>
          {chapterNotes.map((note) => (
            <li key={note.n} data-on={reduced || note.at <= t || undefined} data-latest={note.n === latestNote || undefined}>
              <span className="gk-mark gk-mark--legend" data-on="" aria-hidden="true">
                {note.n}
              </span>
              <span className="gk-note-text">{note.text}</span>
            </li>
          ))}
        </ol>
        {controls}
        <div className="gk-rail" aria-hidden="true">
          <span className="gk-rail-fill" ref={railRef} style={reduced ? { transform: `scaleX(${(chapter + 1) / 5})` } : undefined} />
          {CHAPTERS.map((c, i) => (
            <span key={c.key} className="gk-rail-tick" style={{ left: `${reduced ? (i / 5) * 100 : (c.start / SCRIPT.duration) * 100}%` }} />
          ))}
        </div>
      </div>

      <div className="gk-panes-wrap">
        {tabbed && (
          <div className="gk-tabs" role="tablist" aria-label={__s('Actors')}>
            {actors.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                id={`gk-tab-${a.id}`}
                aria-controls={`gk-panel-${a.id}`}
                aria-selected={shownActor === a.id}
                data-speaking={speaking === a.id || undefined}
                onClick={() => setPinned(a.id)}
              >
                <span className="gk-live" aria-hidden="true" />
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="gk-panes">
          {actors.map((a) => (
            <Pane
              key={a.id}
              actor={a.id}
              label={a.label}
              role={a.role}
              speaking={speaking === a.id}
              active={!tabbed || shownActor === a.id}
              tabbed={tabbed}
              reduced={reduced}
              t={t}
              footer={a.id === 'you' ? <CartRender t={t} mark={renderMark} /> : undefined}
              anchor={a.id === 'you' && rendered ? `[data-line="${MESSAGE_LINES[0]}"]` : undefined}
            >
              {a.id === 'you' && <YouPane t={t} marks={youMarks} />}
              {a.id === 'cli' && <CliPane t={t} marks={keyMarks('cli')} />}
              {a.id === 'agent' && (
                <AgentPane
                  t={t}
                  marks={keyMarks('agent')}
                  idleText={__('Waiting for a brief. The agent only sees what the CLI hands it.')}
                  pageLang={locale}
                />
              )}
            </Pane>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- scroll-driven player ---------- */

/** Keep sticky offsets honest: the toolbar wraps to two rows on phones. */
function useBarHeight() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.gk-bar');
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--gk-bar-h', `${bar.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--gk-bar-h');
    };
  }, []);
}

function ScrollPlayer() {
  const { __, __s } = useT();
  const beats = useBeats();
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState(0);
  const sig = useRef('0');
  const [playing, setPlaying] = useState(false);

  useScrollProgress(track, (p) => {
    const next = p * SCRIPT.duration;
    if (rail.current) rail.current.style.transform = `scaleX(${p})`;
    const s = signature(next);
    if (s !== sig.current) {
      sig.current = s;
      setT(next);
    }
  });

  const trackTop = () => (track.current ? track.current.getBoundingClientRect().top + window.scrollY : 0);
  const yFor = (time: number) => trackTop() + (time / SCRIPT.duration) * TRAVEL;

  const goTo = (i: number) => {
    setPlaying(false);
    window.scrollTo({ top: Math.ceil(yFor(CHAPTERS[i]!.start)) + 1, behavior: 'smooth' });
  };

  // "Play at normal speed" drives the scroll itself, so the scrollbar stays the one clock.
  useEffect(() => {
    if (!playing) return;
    const start = trackTop();
    if (window.scrollY < start || window.scrollY >= start + TRAVEL - 2) window.scrollTo(0, start);
    let expected = window.scrollY;
    let last = performance.now();
    let frame = 0;
    const stop = () => setPlaying(false);
    const tick = (now: number) => {
      // The visitor grabbed the scrollbar: hand control back.
      if (Math.abs(window.scrollY - Math.round(expected)) > 3) return stop();
      expected += Math.min(64, now - last) / MS_PER_PX;
      last = now;
      if (expected >= start + TRAVEL) {
        window.scrollTo(0, start + TRAVEL);
        return stop();
      }
      window.scrollTo(0, Math.round(expected));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const interrupt = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.target as HTMLElement).closest('.gk-play')) return;
      stop();
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('keydown', interrupt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('keydown', interrupt);
    };
  }, [playing]);

  const chapter = chapterAt(t);
  const ended = t >= SCRIPT.duration - 1;

  // Announce chapter changes (not every line, and nothing on load).
  const [announce, setAnnounce] = useState('');
  const announced = useRef(chapter);
  useEffect(() => {
    if (chapter === announced.current) return;
    announced.current = chapter;
    setAnnounce(__s('Chapter {n} of 5: {title}', { n: chapter + 1, title: beats[chapter]!.label }));
  }, [chapter, beats, __s]);

  const controls = (
    <div className="gk-controls">
      <ol className="gk-chapters" aria-label={__s('Chapters')}>
        {CHAPTERS.map((c, i) => (
          <li key={c.key}>
            <button type="button" onClick={() => goTo(i)} aria-current={chapter === i ? 'step' : undefined} data-done={chapter > i || undefined}>
              <span className="gk-ch-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="gk-ch-t">{beats[i]!.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="gk-play" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 2.5v11l9-5.5z" />}
        </svg>
        {playing ? __('Pause') : ended ? __('Play again at normal speed') : __('Play at normal speed')}
      </button>
    </div>
  );

  return (
    <>
      <div className="gk-track" ref={track} style={{ height: `calc(100dvh + ${TRAVEL}px)` }}>
        <div className="gk-sticky">
          <Stage t={t} reduced={false} chapter={chapter} railRef={rail} controls={controls} />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  );
}

/* ---------- reduced motion: frames you step through ---------- */

function Stepper() {
  const { __, __s } = useT();
  const beats = useBeats();
  const [step, setStep] = useState(0);
  const t = CHAPTERS[step]!.end - 1;
  const go = useCallback((i: number) => setStep(Math.max(0, Math.min(4, i))), []);
  const controls = (
    <div className="gk-controls gk-controls--steps">
      <button type="button" className="gk-step" onClick={() => go(step - 1)} disabled={step === 0}>
        ← {__('Previous')}
      </button>
      <ol className="gk-chapters" aria-label={__s('Chapters')}>
        {CHAPTERS.map((c, i) => (
          <li key={c.key}>
            <button type="button" onClick={() => go(i)} aria-current={step === i ? 'step' : undefined} data-done={step > i || undefined}>
              <span className="gk-ch-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="gk-ch-t">{beats[i]!.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="gk-step" onClick={() => go(step + 1)} disabled={step === 4}>
        {__('Next')} →
      </button>
    </div>
  );
  return (
    <div className="gk-frames">
      <Stage
        t={t}
        reduced
        chapter={step}
        controls={controls}
        frameLabel={__s('Frame {n} of 5, shown complete', { n: step + 1 })}
      />
      <p className="sr-only" aria-live="polite">
        {__s('Chapter {n} of 5: {title}', { n: step + 1, title: beats[step]!.label })}
      </p>
    </div>
  );
}

export function Replay() {
  const { __ } = useT();
  const reduced = useReducedMotion();
  useBarHeight();
  return (
    <section className="gk-replay" aria-labelledby="gk-replay-title">
      <div className="gk-wrap gk-replay-head">
        <h2 id="gk-replay-title">{__('How a string gets translated')}</h2>
        <p className="gk-pipe-motto">
          <Duck className="gk-duck-inline" />
          {__('It does the judgment. I do the checking.')}
        </p>
        <p className="gk-replay-intro">
          {reduced
            ? __('A real session, in five frames. Every line in the duckalize pane is what the CLI printed.')
            : __('Scroll to play a real session, and scroll back to rewind it. Every line in the duckalize pane is what the CLI printed.')}
        </p>
      </div>
      {reduced ? <Stepper /> : <ScrollPlayer />}
    </section>
  );
}
