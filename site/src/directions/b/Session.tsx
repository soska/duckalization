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
import { CLAIMS, DEMO_SOURCE, ES_CATALOG, MESSAGES } from '../../shared/facts.ts';
import { useReducedMotion } from '../../shared/motion.ts';
import { createDuck, messageId } from '../../shared/real.ts';
import {
  actorAt,
  chapterAt,
  CHAPTERS,
  EDITED_SOURCE,
  EDITED_STRING,
  SCRIPT,
  type Actor,
  type Ev,
} from './script.ts';

const ACTORS: { id: Actor; label: string; role: string }[] = [
  { id: 'you', label: 'you', role: 'src/Cart.tsx' },
  { id: 'cli', label: 'duckalize', role: 'deterministic · never calls a model' },
  { id: 'agent', label: 'agent', role: 'any model · the only judgment' },
];

/** 0-based lines of DEMO_SOURCE that hold the three messages, in highlight order. */
const MESSAGE_LINES = DEMO_SOURCE.split('\n').flatMap((line, n) => (line.includes('__(') ? [n] : []));
const EDIT_LINE = MESSAGE_LINES[MESSAGE_LINES.length - 1];

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

/** The ship beat, computed by the real runtime against a now-partial catalog. */
function useRenderedCart() {
  return useMemo(() => {
    const missing: string[] = [];
    const duck = createDuck({
      sourceLocale: 'en',
      locale: 'es',
      onMissing: (id) => missing.push(id),
    });
    duck.load('es', ES_CATALOG);
    const { __ } = duck;
    return {
      heading: __('Welcome back, {name}', { name: 'Ana' }),
      items: __({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count: 3 }),
      button: __(EDITED_STRING),
      missingId: missing[0] ?? messageId(EDITED_STRING),
    };
  }, []);
}

/**
 * Keeps the newest revealed line in view by translating the pane's content
 * (transform only — nothing reflows). With reduced motion, panes scroll natively.
 */
function useFollow(
  viewport: React.RefObject<HTMLDivElement | null>,
  inner: React.RefObject<HTMLDivElement | null>,
  lastKey: number | undefined,
  reduced: boolean,
  active: boolean,
  anchor: string | undefined,
) {
  useLayoutEffect(() => {
    const vp = viewport.current;
    const el = inner.current;
    if (!vp || !el) return;
    let offset = 0;
    const top = anchor ? el.querySelector<HTMLElement>(anchor) : null;
    if (top) {
      // Bring this element to the top (the editor, making room for the render sheet).
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
  live,
  active,
  tabbed,
  lastKey,
  reduced,
  children,
  footer,
  anchor,
}: {
  actor: (typeof ACTORS)[number];
  live: boolean;
  active: boolean;
  tabbed: boolean;
  lastKey: number | undefined;
  reduced: boolean;
  children: ReactNode;
  footer?: ReactNode;
  anchor?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useFollow(viewport, inner, lastKey, reduced, active, anchor);
  return (
    <section
      className={`sb-pane sb-pane--${actor.id}`}
      data-active={active || undefined}
      data-live={live || undefined}
      aria-labelledby={`sb-pane-${actor.id}`}
      {...(tabbed && { role: 'tabpanel', id: `sb-panel-${actor.id}`, hidden: !active })}
    >
      <header className="sb-pane-head">
        <h3 id={`sb-pane-${actor.id}`}>
          <span className="sb-live" aria-hidden="true" />
          {actor.label}
        </h3>
        <p>{actor.role}</p>
      </header>
      <div
        className="sb-viewport"
        ref={viewport}
        tabIndex={reduced ? 0 : -1}
        aria-label={`${actor.label} output`}
      >
        <div className="sb-inner" ref={inner}>
          {children}
        </div>
      </div>
      {footer}
    </section>
  );
}

function shown(ev: Ev, t: number) {
  return ev.at <= t;
}

function renderedAt(t: number) {
  return SCRIPT.events.some((e) => e.type === 'render' && shown(e, t));
}

function CartRender({ t }: { t: number }) {
  const rendered = SCRIPT.events.some((e) => e.type === 'render' && shown(e, t));
  const cart = useRenderedCart();
  return (
    <figure className="sb-render" data-on={rendered || undefined} aria-hidden={!rendered}>
      <figcaption>
        <span>rendered</span> <span>locale es · real runtime</span>
      </figcaption>
      <div className="sb-cart">
        <p className="sb-cart-h">{cart.heading}</p>
        <p className="sb-cart-p">{cart.items}</p>
        <p className="sb-cart-b">
          <span className="sb-btn">{cart.button}</span>
          <span className="sb-fallback">
            fallback · en · <code>{cart.missingId}</code>
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
        <span key={i} className="sb-str" data-on={on || undefined}>
          {part}
        </span>
      ) : (
        part
      ),
    );

  return (
    <>
      <ol className="sb-code" aria-label="src/Cart.tsx">
        {lines.map((line, n) => {
          const order = MESSAGE_LINES.indexOf(n);
          const on = order >= 0 && order < highlights;
          if (n === EDIT_LINE) {
            return (
              <li key={n} data-line={n} className="sb-swap" data-edited={edited || undefined}>
                <span className="sb-swap-a" aria-hidden={edited}>
                  {strings(line, on)}
                </span>
                <span className="sb-swap-b" aria-hidden={!edited}>
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
    </>
  );
}

function CliPane({ t }: { t: number }) {
  const events = SCRIPT.events.filter((e) => e.actor === 'cli');
  return (
    <ol className="sb-term">
      {events.map((ev) => {
        const on = shown(ev, t);
        if (ev.type === 'cmd') {
          const typed = Math.min(
            ev.text.length,
            Math.max(0, Math.floor((t - ev.at) / (ev.dur / ev.text.length))),
          );
          const typing = on && typed < ev.text.length;
          return (
            <li
              key={ev.key}
              data-key={ev.key}
              className="sb-line sb-cmd"
              data-on={on || undefined}
              aria-hidden={!on}
            >
              <span className="sb-prompt" aria-hidden="true">
                $
              </span>
              <span>{ev.text.slice(0, typed)}</span>
              {typing && <span className="sb-caret" aria-hidden="true" />}
              <span className="sb-ghost" aria-hidden="true">
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
            className={`sb-line sb-out sb-${ev.kind}`}
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
const flaggedAt =
  SCRIPT.events.find((e) => e.type === 'out' && e.kind === 'err')?.at ?? Number.POSITIVE_INFINITY;

function AgentPane({ t }: { t: number }) {
  const events = SCRIPT.events.filter((e) => e.actor === 'agent');
  const idle = !events.some((e) => shown(e, t));
  return (
    <>
      <p className="sb-idle" data-on={idle || undefined} aria-hidden={!idle}>
        Waiting for a brief. The agent only sees what <code>duckalize translate brief</code> hands it.
      </p>
      <ol className="sb-agent">
        {events.map((ev) => {
          const on = shown(ev, t);
          const common = { 'data-key': ev.key, 'data-on': on || undefined, 'aria-hidden': !on };
          if (ev.type === 'note') {
            return (
              <li key={ev.key} {...common} className="sb-a sb-note">
                {ev.text}
              </li>
            );
          }
          if (ev.type === 'file') {
            return (
              <li key={ev.key} {...common} className={`sb-a sb-file sb-file--${ev.verb}`}>
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
                className={`sb-a sb-json sb-json--${ev.tone}`}
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
    if (ev.actor === actor && ev.type !== 'highlight' && ev.type !== 'edit' && ev.type !== 'render')
      key = ev.key;
  }
  return key;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Session() {
  const reduced = useReducedMotion();
  const tabbed = useMedia('(max-width: 859px)');
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

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), {
      threshold: 0.35,
    });
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
    [reduced],
  );

  const toggle = useCallback(() => {
    setStarted(true);
    setPinned(null);
    if (t >= duration) setT(0);
    setPlaying((p) => !(p && t < duration));
  }, [t, duration]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === ' ' && tag !== 'BUTTON' && !reduced) {
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(chapter + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };

  const speaking = reduced ? null : actorAt(t);
  const shownActor: Actor = pinned ?? speaking ?? 'you';
  const ended = !reduced && t >= duration;
  const progress = reduced ? (step + 1) / CHAPTERS.length : t / duration;

  return (
    <div className="sb-session" onKeyDown={onKeyDown}>
      <div
        className="sb-stage"
        ref={stage}
        tabIndex={0}
        role="group"
        aria-roledescription="session player"
        aria-label={
          reduced
            ? 'Session transcript. Left and right arrows change chapter.'
            : 'Session player. Space plays or pauses; left and right arrows change chapter.'
        }
        data-reduced={reduced || undefined}
      >
        {tabbed && (
          <div className="sb-tabs" role="tablist" aria-label="Actors">
            {ACTORS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                id={`sb-tab-${a.id}`}
                aria-controls={`sb-panel-${a.id}`}
                aria-selected={shownActor === a.id}
                data-live={speaking === a.id || undefined}
                onClick={() => setPinned(a.id)}
              >
                <span className="sb-live" aria-hidden="true" />
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="sb-grid">
          {ACTORS.map((a) => (
            <Pane
              key={a.id}
              actor={a}
              live={speaking === a.id && (playing || reduced)}
              active={!tabbed || shownActor === a.id}
              tabbed={tabbed}
              lastKey={lastShownKey(a.id, now)}
              reduced={reduced}
              footer={a.id === 'you' ? <CartRender t={now} /> : undefined}
              anchor={a.id === 'you' && renderedAt(now) ? `[data-line="${MESSAGE_LINES[0]}"]` : undefined}
            >
              {a.id === 'you' && <YouPane t={now} />}
              {a.id === 'cli' && <CliPane t={now} />}
              {a.id === 'agent' && <AgentPane t={now} />}
            </Pane>
          ))}
        </div>
      </div>

      <div className="sb-controls">
        {reduced ? (
          <div className="sb-steppers">
            <button type="button" onClick={() => goTo(chapter - 1)} disabled={chapter === 0}>
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => goTo(chapter + 1)}
              disabled={chapter === CHAPTERS.length - 1}
            >
              Next →
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sb-play"
            onClick={toggle}
            aria-label={playing ? 'Pause' : ended ? 'Replay' : 'Play'}
          >
            <svg className="sb-play-icon" viewBox="0 0 16 16" aria-hidden="true">
              {playing ? (
                <path d="M4 3h3v10H4zM9 3h3v10H9z" />
              ) : ended ? (
                <path d="M8 3a5 5 0 1 1-4.9 6h1.6A3.5 3.5 0 1 0 8 4.5V7L4.5 3.8 8 .5z" />
              ) : (
                <path d="M5 2.5v11l9-5.5z" />
              )}
            </svg>
          </button>
        )}

        <div className="sb-track">
          <div className="sb-rail" aria-hidden="true">
            <span className="sb-fill" style={{ transform: `scaleX(${progress})` }} />
            {CHAPTERS.map((c, i) => (
              <span
                key={c.key}
                className="sb-tick"
                data-done={chapter >= i || undefined}
                style={{ left: `${reduced ? (i / CHAPTERS.length) * 100 : (c.start / duration) * 100}%` }}
              />
            ))}
          </div>
          {!reduced && (
            <input
              className="sb-range"
              type="range"
              min={0}
              max={duration}
              step={50}
              value={t}
              aria-label="Session position"
              aria-valuetext={`${fmt(t)} — chapter ${chapter + 1}: ${CHAPTERS[chapter]!.title}`}
              onChange={(e) => {
                setPinned(null);
                setT(Number(e.target.value));
              }}
            />
          )}
        </div>
        {!reduced && (
          <span className="sb-time" aria-hidden="true">
            {fmt(t)} / {fmt(duration)}
          </span>
        )}
      </div>

      <ol className="sb-chapters">
        {CHAPTERS.map((c, i) => (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={chapter === i ? 'step' : undefined}
              data-done={chapter > i || undefined}
            >
              <span className="sb-ch-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="sb-ch-t">{c.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="sb-captions">
        {CHAPTERS.map((c, i) => (
          <p key={c.key} data-on={chapter === i || undefined} aria-hidden={chapter !== i}>
            <b className="sb-cap-title">{c.title}. </b>
            {i === CHAPTERS.length - 1
              ? `${c.body} ${CLAIMS.partialShips} Renaming a string gives it a new ID, so ${MESSAGES.checkout.id} is orphaned and the new one renders in English.`
              : c.body}
          </p>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {started || reduced
          ? `Chapter ${chapter + 1} of ${CHAPTERS.length}: ${CHAPTERS[chapter]!.title}`
          : ''}
      </p>
    </div>
  );
}
