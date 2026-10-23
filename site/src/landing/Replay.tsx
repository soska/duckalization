import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button, Duck, SectionTitle } from '../design/index.ts';
import { DEMO_SOURCE, ES_CATALOG, MESSAGES } from '../shared/facts.ts';
import { useMedia } from '../shared/media.ts';
import { useReducedMotion } from '../shared/motion.ts';
import { createDuck, messageId } from '../shared/real.ts';
import { useT } from './i18n.tsx';
import { actorAt, chapterAt, CHAPTERS, EDITED_SOURCE, EDITED_STRING, SCRIPT, type Actor, type Ev } from './script.ts';

/** 0-based lines of DEMO_SOURCE that hold the three messages, in highlight order. */
const MESSAGE_LINES = DEMO_SOURCE.split('\n').flatMap((line, n) => (line.includes('__(') ? [n] : []));
const EDIT_LINE = MESSAGE_LINES[MESSAGE_LINES.length - 1];
const ACTOR_IDS: Actor[] = ['you', 'cli', 'agent'];

/** The ship beat, computed by the real runtime against a now-partial catalog. */
function useRenderedCart() {
  return useMemo(() => {
    const rt = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    rt.load('es', ES_CATALOG);
    return {
      heading: rt.__('Welcome back, {name}', { name: 'Ana' }),
      items: rt.__({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count: 3 }),
      button: rt.__(EDITED_STRING),
      missingId: messageId(EDITED_STRING),
    };
  }, []);
}

/**
 * Keeps the newest revealed line in view by translating the pane's content
 * (transform only, nothing reflows). With reduced motion, panes scroll natively.
 */
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
      offset = Math.max(0, top.offsetTop - 12);
    } else {
      const target = lastKey === undefined ? null : el.querySelector<HTMLElement>(`[data-key="${lastKey}"]`);
      const bottom = target ? target.offsetTop + target.offsetHeight : 0;
      offset = Math.max(0, bottom - vp.clientHeight + 20);
    }
    if (reduced) {
      el.style.transform = '';
      vp.scrollTop = offset;
    } else {
      el.style.transform = `translate3d(0, ${-offset}px, 0)`;
    }
  }, [viewport, inner, lastKey, reduced, active, anchor]);
}

function Pane({
  actor,
  label,
  role,
  live,
  active,
  tabbed,
  lastKey,
  reduced,
  children,
  footer,
  anchor,
  outputLabel,
}: {
  actor: Actor;
  label: ReactNode;
  role: ReactNode;
  live: boolean;
  active: boolean;
  tabbed: boolean;
  lastKey: number | undefined;
  reduced: boolean;
  children: ReactNode;
  footer?: ReactNode;
  anchor?: string;
  outputLabel: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useFollow(viewport, inner, lastKey, reduced, active, anchor);
  return (
    <section
      className={`fk-pane fk-pane--${actor}`}
      data-active={active || undefined}
      data-live={live || undefined}
      aria-labelledby={`fk-pane-${actor}`}
      {...(tabbed && { role: 'tabpanel', id: `fk-panel-${actor}`, hidden: !active })}
    >
      <header className="fk-pane-head">
        <h3 id={`fk-pane-${actor}`}>
          <span className="fk-live" aria-hidden="true" />
          {label}
        </h3>
        <p>{role}</p>
      </header>
      <div className="fk-viewport" ref={viewport} tabIndex={reduced ? 0 : -1} aria-label={outputLabel}>
        <div className="fk-inner" ref={inner}>
          {children}
        </div>
      </div>
      {footer}
    </section>
  );
}

const shown = (ev: Ev, t: number) => ev.at <= t;
const renderedAt = (t: number) => SCRIPT.events.some((e) => e.type === 'render' && shown(e, t));

function CartRender({ t }: { t: number }) {
  const { __ } = useT();
  const rendered = renderedAt(t);
  const cart = useRenderedCart();
  return (
    <figure className="fk-render" data-on={rendered || undefined} aria-hidden={!rendered}>
      <figcaption>
        <span>{__('Your app, in Spanish')}</span> <span>{__('real runtime')}</span>
      </figcaption>
      <div className="fk-cart">
        <p className="fk-cart-h">{cart.heading}</p>
        <p className="fk-cart-p">{cart.items}</p>
        <p className="fk-cart-b">
          <span className="fk-cart-btn">{cart.button}</span>
          <span className="fk-fallback">
            {__('fallback')} · en · <code>{cart.missingId}</code>
          </span>
        </p>
      </div>
    </figure>
  );
}

function YouPane({ t }: { t: number }) {
  const lines = DEMO_SOURCE.split('\n');
  const highlights = SCRIPT.events.filter((e) => e.type === 'highlight' && shown(e, t)).length;
  const edited = SCRIPT.events.some((e) => e.type === 'edit' && shown(e, t));

  const strings = (line: string, on: boolean) =>
    line.split(/('[^']*')/).map((part, i) =>
      part.startsWith("'") ? (
        <span key={i} className="fk-str" data-on={on || undefined}>
          {part}
        </span>
      ) : (
        part
      )
    );

  return (
    <ol className="fk-editor" aria-label="src/Cart.tsx">
      {lines.map((line, n) => {
        const order = MESSAGE_LINES.indexOf(n);
        const on = order >= 0 && order < highlights;
        if (n === EDIT_LINE) {
          return (
            <li key={n} data-line={n} className="fk-swapline" data-edited={edited || undefined}>
              <span className="fk-swap-a" aria-hidden={edited}>
                {strings(line, on)}
              </span>
              <span className="fk-swap-b" aria-hidden={!edited}>
                {strings(EDITED_SOURCE, true)}
              </span>
            </li>
          );
        }
        return (
          <li key={n} data-line={n}>
            {order >= 0 ? strings(line, on) : line || ' '}
          </li>
        );
      })}
    </ol>
  );
}

function CliPane({ t }: { t: number }) {
  const events = SCRIPT.events.filter((e) => e.actor === 'cli');
  return (
    <ol className="fk-term">
      {events.map((ev) => {
        const on = shown(ev, t);
        if (ev.type === 'cmd') {
          const typed = Math.min(ev.text.length, Math.max(0, Math.floor((t - ev.at) / (ev.dur / ev.text.length))));
          const typing = on && typed < ev.text.length;
          return (
            <li key={ev.key} data-key={ev.key} className="fk-line fk-cmdline" data-on={on || undefined} aria-hidden={!on}>
              <span className="fk-prompt" aria-hidden="true">
                $
              </span>
              <span>{ev.text.slice(0, typed)}</span>
              {typing && <span className="fk-caret" aria-hidden="true" />}
              <span className="fk-ghost" aria-hidden="true">
                {ev.text.slice(typed)}
              </span>
            </li>
          );
        }
        if (ev.type !== 'out') return null;
        return (
          <li
            key={ev.key}
            data-key={ev.key}
            className={`fk-line fk-out fk-out--${ev.kind}`}
            data-on={on || undefined}
            aria-hidden={!on}
          >
            {ev.text}
          </li>
        );
      })}
    </ol>
  );
}

/** When the validator's errors appear, the offending agent lines get flagged. */
const CULPRITS = ['{nombre}', 'zzz123'];
const flaggedAt = SCRIPT.events.find((e) => e.type === 'out' && e.kind === 'err')?.at ?? Number.POSITIVE_INFINITY;

function AgentPane({ t }: { t: number }) {
  const { __ } = useT();
  const events = SCRIPT.events.filter((e) => e.actor === 'agent');
  const idle = !events.some((e) => shown(e, t));
  return (
    <>
      <p className="fk-idle" data-on={idle || undefined} aria-hidden={!idle}>
        {__('Waiting for a brief. The agent only sees what duckalize translate brief hands it.')}
      </p>
      <ol className="fk-agent">
        {events.map((ev) => {
          const on = shown(ev, t);
          const common = { 'data-key': ev.key, 'data-on': on || undefined, 'aria-hidden': !on };
          if (ev.type === 'note') {
            return (
              <li key={ev.key} {...common} className="fk-a fk-agent-say">
                {ev.text}
              </li>
            );
          }
          if (ev.type === 'file') {
            return (
              <li key={ev.key} {...common} className={`fk-a fk-agent-file fk-agent-file--${ev.verb}`}>
                <span>{ev.verb}</span> <code>{ev.path}</code>
              </li>
            );
          }
          if (ev.type === 'code') {
            const culprit = ev.tone === 'bad' && CULPRITS.some((c) => ev.text.includes(c));
            return (
              <li
                key={ev.key}
                {...common}
                className={`fk-a fk-agent-json fk-agent-json--${ev.tone}`}
                data-flagged={(culprit && t >= flaggedAt) || undefined}
              >
                {ev.text}
              </li>
            );
          }
          return null;
        })}
      </ol>
    </>
  );
}

function lastShownKey(actor: Actor, t: number): number | undefined {
  let key: number | undefined;
  for (const ev of SCRIPT.events) {
    if (ev.at > t) break;
    if (ev.actor === actor && ev.type !== 'highlight' && ev.type !== 'edit' && ev.type !== 'render') key = ev.key;
  }
  return key;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Replay() {
  const { __, __s } = useT();
  const reduced = useReducedMotion();
  // Phones get one actor at a time. Anything wider stacks the three panes,
// so the proof — you, the CLI, the agent — stays on one page.
const tabbed = useMedia('(max-width: 559px)');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [pinned, setPinned] = useState<Actor | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const duration = SCRIPT.duration;
  // Reduced motion: a chaptered transcript, each step showing its chapter complete.
  const [step, setStep] = useState(0);
  const now = reduced ? CHAPTERS[step]!.end - 1 : t;
  const chapter = reduced ? step : chapterAt(t);

  const speaking = reduced ? null : actorAt(t);
  const actors: Record<Actor, { label: ReactNode; role: ReactNode; output: string }> = {
    you: { label: __('you'), role: 'src/Cart.tsx', output: __s('Your editor') },
    cli: {
      label: (
        <>
          <Duck className="fk-duck-badge" on="terminal" mood={speaking === 'cli' && playing ? 'reading' : 'idle'} />
          duckalize
        </>
      ),
      role: __('deterministic · never calls a model'),
      output: __s('duckalize output'),
    },
    agent: { label: __('agent'), role: __('any model · the only judgment'), output: __s('Agent output') },
  };
  const chapterTitles = [
    __('Write English inline'),
    __('Extract a brief'),
    __('Any agent translates'),
    __('Code checks the work'),
    __('Ship a partial catalog'),
  ];
  const chapterTitlesText = [
    __s('Write English inline'),
    __s('Extract a brief'),
    __s('Any agent translates'),
    __s('Code checks the work'),
    __s('Ship a partial catalog'),
  ];
  const captions = [
    __('The string in your code is the message. Nothing else changes.'),
    __('The CLI hashes each string into an ID and writes a self-contained work order for an agent.'),
    __('The agent reads the brief and writes es.out.json. Its first answer invents a placeholder and an ID.'),
    __('duckalize rejects that answer, writes nothing, and accepts the corrected one.'),
    __('Rename Checkout to Check out and it gets a new ID, {newId}. The old entry, {oldId}, is orphaned, and the new text renders in English.', {
      newId: messageId(EDITED_STRING),
      oldId: MESSAGES.checkout.id,
    }),
  ];

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay once, the first time the stage is really on screen.
  useEffect(() => {
    if (visible && !started && !reduced) {
      setStarted(true);
      setPlaying(true);
    }
  }, [visible, started, reduced]);

  const running = playing && visible && !reduced;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (time: number) => {
      const dt = Math.min(64, time - last);
      last = time;
      setT((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, duration]);

  const goTo = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(CHAPTERS.length - 1, index));
      setPinned(null);
      if (reduced) setStep(i);
      else setT(CHAPTERS[i]!.start);
    },
    [reduced]
  );

  const toggle = useCallback(() => {
    setStarted(true);
    setPinned(null);
    if (t >= duration) setT(0);
    setPlaying((p) => !(p && t < duration));
  }, [t, duration]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'INPUT' && !reduced) {
      e.preventDefault();
      toggle();
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tag !== 'INPUT') {
      e.preventDefault();
      goTo(chapter + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };

  // On mobile the visible tab follows whoever spoke last, in either mode.
  const shownActor: Actor = pinned ?? actorAt(now);
  const ended = !reduced && t >= duration;
  const progress = reduced ? (step + 1) / CHAPTERS.length : t / duration;
  const anchor = renderedAt(now) ? `[data-line="${MESSAGE_LINES[0]}"]` : undefined;

  return (
    <section className="fk-replay" aria-labelledby="fk-replay-title">
      <div className="fk-wrap">
        <div className="fk-replay-head">
          <div>
            <SectionTitle id="fk-replay-title" eyebrow={__('Proof')} title={__('Every line the CLI printed.')} />
          </div>
          <p className="fk-replay-lede">
            {__(
              'A replay of a real session against the same component. Every line in the duckalize pane is what the CLI printed. The agent pane is the only place a model is involved.'
            )}
          </p>
        </div>

        <div className="fk-session" onKeyDown={onKeyDown}>
          <div
            className="fk-stage-r"
            ref={stage}
            tabIndex={0}
            role="group"
            aria-roledescription={__s('session player')}
            aria-label={
              reduced
                ? __s('Session transcript. Left and right arrows change chapter.')
                : __s('Session player. Space plays or pauses; left and right arrows change chapter.')
            }
            data-reduced={reduced || undefined}
          >
            {tabbed && (
              <div className="fk-tabs" role="tablist" aria-label={__s('Actors')}>
                {ACTOR_IDS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="tab"
                    id={`fk-tab-${a}`}
                    aria-controls={`fk-panel-${a}`}
                    aria-selected={shownActor === a}
                    data-live={speaking === a || undefined}
                    data-actor={a}
                    onClick={() => setPinned(a)}
                  >
                    <span className="fk-live" aria-hidden="true" />
                    {a === 'cli' ? 'duckalize' : actors[a].label}
                  </button>
                ))}
              </div>
            )}
            <div className="fk-panes">
              {ACTOR_IDS.map((a) => (
                <Pane
                  key={a}
                  actor={a}
                  label={actors[a].label}
                  role={actors[a].role}
                  outputLabel={actors[a].output}
                  live={speaking === a && (playing || reduced)}
                  active={!tabbed || shownActor === a}
                  tabbed={tabbed}
                  lastKey={lastShownKey(a, now)}
                  reduced={reduced}
                  footer={a === 'you' ? <CartRender t={now} /> : undefined}
                  anchor={a === 'you' ? anchor : undefined}
                >
                  {a === 'you' && <YouPane t={now} />}
                  {a === 'cli' && <CliPane t={now} />}
                  {a === 'agent' && <AgentPane t={now} />}
                </Pane>
              ))}
            </div>
          </div>

          <div className="fk-controls">
            {reduced ? (
              <div className="fk-steppers">
                <Button size="sm" onClick={() => goTo(chapter - 1)} disabled={chapter === 0}>
                  ← {__('Previous')}
                </Button>
                <Button size="sm" onClick={() => goTo(chapter + 1)} disabled={chapter === CHAPTERS.length - 1}>
                  {__('Next')} →
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                shape="circle"
                onClick={toggle}
                aria-label={playing ? __s('Pause') : ended ? __s('Replay') : __s('Play')}
              >
                <svg className="dk-button-icon" viewBox="0 0 16 16" aria-hidden="true">
                  {playing ? (
                    <path d="M4 3h3v10H4zM9 3h3v10H9z" />
                  ) : ended ? (
                    <path d="M8 3a5 5 0 1 1-4.9 6h1.6A3.5 3.5 0 1 0 8 4.5V7L4.5 3.8 8 .5z" />
                  ) : (
                    <path d="M5 2.5v11l9-5.5z" />
                  )}
                </svg>
              </Button>
            )}

            <div className="fk-scrub">
              <div className="fk-scrub-rail" aria-hidden="true">
                <span className="fk-scrub-fill" style={{ transform: `scaleX(${progress})` }} />
                {CHAPTERS.map((c, i) => (
                  <span
                    key={c.key}
                    className="fk-tick"
                    data-done={chapter >= i || undefined}
                    style={{ left: `${reduced ? (i / CHAPTERS.length) * 100 : (c.start / duration) * 100}%` }}
                  />
                ))}
              </div>
              {!reduced && (
                <input
                  className="fk-range"
                  type="range"
                  min={0}
                  max={duration}
                  step={50}
                  value={t}
                  aria-label={__s('Session position')}
                  aria-valuetext={`${fmt(t)} · ${chapter + 1}: ${chapterTitlesText[chapter]}`}
                  onChange={(e) => {
                    setPinned(null);
                    setT(Number(e.target.value));
                  }}
                />
              )}
            </div>
            {!reduced && (
              <span className="fk-time" aria-hidden="true">
                {fmt(t)} / {fmt(duration)}
              </span>
            )}
          </div>

          <ol className="fk-chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={chapter === i ? 'step' : undefined}
                  data-done={chapter > i || undefined}
                >
                  <span className="fk-ch-n">{i + 1}</span>
                  <span className="fk-ch-t">{chapterTitles[i]}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="fk-captions">
            {captions.map((caption, i) => (
              <p key={i} data-on={chapter === i || undefined} aria-hidden={chapter !== i}>
                <b className="fk-cap-title">{chapterTitles[i]}. </b>
                {caption}
              </p>
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            {started || reduced ? `${chapter + 1} / ${CHAPTERS.length}: ${chapterTitlesText[chapter]}` : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
