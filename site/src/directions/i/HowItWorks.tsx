import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { BAD_OUTPUTS, DEMO_SOURCE, ES_CATALOG, MESSAGES, SOURCE_CATALOG, TRANSCRIPT } from '../../shared/facts.ts';
import { useReducedMotion, useScrollProgress } from '../../shared/motion.ts';
import { createDuck, messageId, validateOutput, type Catalog, type Message } from '../../shared/real.ts';
import { Duck, type DuckMood } from './Duck.tsx';
import { useT } from './i18n.tsx';

/*
 * "How it works", variant I: the source and the rendered Cart sit side by
 * side for all five steps, joined by one wire per string. Each step only
 * changes what travels along the wires, so it is clear from step 1 that the
 * thing being translated is a UI.
 */

const STEPS = 5;
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const pad = (n: number) => String(n).padStart(2, '0');

type Phase = 'write' | 'extract' | 'draft' | 'reject' | 'pass' | 'ship';
/** Static frames (reduced motion) show one phase per step. */
const FRAME_PHASES: Phase[] = ['write', 'extract', 'draft', 'reject', 'ship'];

/** Scroll position (0–5) → phase. Step 4 holds both answers: rejected, then passed. */
function phaseAt(s: number): Phase {
  if (s < 1) return 'write';
  if (s < 2) return 'extract';
  if (s < 3) return 'draft';
  if (s < 3.45) return 'reject';
  if (s < 4) return 'pass';
  return 'ship';
}

const SOURCE_LINES = DEMO_SOURCE.split('\n');
/** 0-based lines holding the three `__(` calls, in render order. */
const CALL_LINES = SOURCE_LINES.flatMap((line, n) => (line.includes('__(') ? [n] : []));
/** What the plate shows of Cart.tsx: <section> … </section>. */
const SHOWN = { from: CALL_LINES[0]! - 1, to: CALL_LINES[CALL_LINES.length - 1]! + 1 };

const STRINGS: Message[] = [MESSAGES.welcome.message, MESSAGES.items.message, MESSAGES.checkout.message];
const VALUES = [{ name: 'Ana' }, { count: 2 }, undefined];

const formText = (m: Message | undefined) => (m === undefined ? undefined : typeof m === 'string' ? m : (m.other ?? ''));

/** Everything on the wires and in the Cart is computed by the library's own code. */
function useLive() {
  return useMemo(() => {
    const ids = STRINGS.map((m) => messageId(m));
    const es = ES_CATALOG as Catalog;

    // Answer 1 is the real rejected output; answer 2 fixes it and leaves Checkout out.
    const answer1 = BAD_OUTPUTS.rejected;
    const answer2 = { locale: 'es', translations: { [ids[0]!]: es[ids[0]!]!, [ids[1]!]: es[ids[1]!]! } };
    const errors1 = validateOutput(answer1, SOURCE_CATALOG, {}).filter((d) => d.severity === 'error');
    const errors2 = validateOutput(answer2, SOURCE_CATALOG, {}).filter((d) => d.severity === 'error');
    const t1 = answer1.translations as Record<string, Message>;
    const unknownKey = Object.keys(t1).find((key) => !(key in SOURCE_CATALOG));

    const before = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    const after = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    after.load('es', answer2.translations);
    const render = (rt: typeof before) =>
      STRINGS.map((m, i) => rt.__(m as never, VALUES[i] as never) as string);

    return {
      ids,
      draft1: ids.map((id, i) => (i === 2 && unknownKey ? `${unknownKey} · ${formText(t1[unknownKey])}` : formText(t1[id]))),
      stray: (i: number) => i === 2 && unknownKey !== undefined,
      stamp: ids.map((id, i) =>
        errors1.find((d) => d.id === id || (i === 2 && d.id === unknownKey))?.code
      ),
      draft2: ids.map((id) => formText(answer2.translations[id])),
      draft2Forms: ids.map((id) => {
        const m = answer2.translations[id];
        return m && typeof m !== 'string' ? Object.keys(m).length : 0;
      }),
      passes: errors2.length === 0,
      rejectLine: TRANSCRIPT.rejected.at(-1)!.text,
      en: render(before),
      es: render(after),
    };
  }, []);
}

type Live = ReturnType<typeof useLive>;

/* -------------------------------------------------------------- */
/* The pair: code ↔ wires ↔ Cart                                   */
/* -------------------------------------------------------------- */

/** Handles the scroll driver needs, filled in by the pair on every layout. */
interface PairApi {
  root: HTMLDivElement | null;
  wires: { path: SVGPathElement; length: number }[];
  /** Slot center → code anchor, and slot center → UI anchor, per string. */
  toCode: { x: number; y: number }[];
  toUi: { x: number; y: number }[];
}

function usePairGeometry(rootRef: RefObject<HTMLDivElement | null>, api?: RefObject<PairApi | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const layout = () => {
      const box = root.getBoundingClientRect();
      const code = root.querySelector<HTMLElement>('.fk-pair-code')!.getBoundingClientRect();
      const ui = root.querySelector<HTMLElement>('.fk-pair-ui')!.getBoundingClientRect();
      const stacked = ui.top >= code.bottom - 1;
      const svg = root.querySelector<SVGSVGElement>('.fk-wires')!;
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const wires: PairApi['wires'] = [];
      const toCode: PairApi['toCode'] = [];
      const toUi: PairApi['toUi'] = [];
      for (let i = 0; i < STRINGS.length; i++) {
        const line = root.querySelector<HTMLElement>(`[data-src="${i}"]`)!.getBoundingClientRect();
        const slot = root.querySelector<HTMLElement>(`[data-slot="${i}"]`)!.getBoundingClientRect();
        const el = root.querySelector<HTMLElement>(`[data-ui="${i}"]`)!.getBoundingClientRect();
        const sx = slot.left + slot.width / 2 - box.left;
        const sy = slot.top + slot.height / 2 - box.top;
        const a = { x: code.right - box.left, y: line.top + Math.min(line.height, 26) / 2 - box.top };
        const b = { x: ui.left - box.left, y: el.top + el.height / 2 - box.top };
        const pathA = svg.querySelector<SVGPathElement>(`[data-wire="${i}a"]`)!;
        const pathB = svg.querySelector<SVGPathElement>(`[data-wire="${i}b"]`)!;
        const k1 = (sx - a.x) / 2;
        const k2 = (b.x - sx) / 2;
        pathA.setAttribute('d', `M${a.x} ${a.y}C${a.x + k1} ${a.y} ${sx - k1} ${sy} ${sx} ${sy}`);
        pathB.setAttribute('d', `M${sx} ${sy}C${sx + k2} ${sy} ${b.x - k2} ${b.y} ${b.x} ${b.y}`);
        for (const path of [pathA, pathB]) {
          const length = stacked ? 0 : path.getTotalLength();
          path.style.strokeDasharray = `${length}`;
          wires.push({ path, length });
        }
        // Stacked (phones): no wires, chips just rise into place.
        toCode.push(stacked ? { x: 0, y: -14 } : { x: a.x - sx, y: a.y - sy });
        toUi.push(stacked ? { x: 0, y: 14 } : { x: b.x - sx, y: b.y - sy });
      }
      root.toggleAttribute('data-stacked', stacked);
      if (api) api.current = { root, wires, toCode, toUi };
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(root);
    void document.fonts?.ready.then(layout);
    return () => ro.disconnect();
  }, [rootRef, api]);
}

function Chip({ kind, i, children, className = '' }: { kind: string; i?: number; children: ReactNode; className?: string }) {
  return (
    <span className={`fk-chip fk-chip-${kind} ${className}`} data-chip={kind}>
      <span className="fk-chip-move" data-move={i === undefined ? undefined : `${kind}-${i}`}>
        {children}
      </span>
    </span>
  );
}

function Pair({ phase, live, api }: { phase: Phase; live: Live; api?: RefObject<PairApi | null> }) {
  const { __, __s } = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  usePairGeometry(rootRef, api);

  return (
    <div ref={rootRef} className="fk-pair" data-phase={phase}>
      <div className="fk-pair-code" role="group" aria-label="src/Cart.tsx">
        <p className="fk-pair-label" aria-hidden="true">
          src/Cart.tsx
        </p>
        <ol className="fk-pair-lines">
          {SOURCE_LINES.slice(SHOWN.from, SHOWN.to + 1).map((line, k) => {
            const n = SHOWN.from + k;
            const i = CALL_LINES.indexOf(n);
            return (
              <li key={n} data-src={i >= 0 ? i : undefined} className={i >= 0 ? 'is-call' : undefined}>
                <span className="fk-ln" aria-hidden="true">
                  {n + 1}
                </span>
                {i >= 0 && <span className="fk-pin" data-pin={i} aria-hidden="true" />}
                <code>{line.replace(/^ {4}/, '')}</code>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="fk-pair-lane" aria-hidden="true">
        <span className="fk-lane-duck">
          <Duck mood={phase === 'reject' ? 'reject' : phase === 'pass' ? 'happy' : 'idle'} />
        </span>
        {STRINGS.map((_, i) => (
          <span key={i} className="fk-slot" data-slot={i}>
            <Chip kind="id" i={i}>
              <code>{live.ids[i]}</code>
            </Chip>
            {live.draft1[i] === undefined ? (
              <Chip kind="ghost">{__s('not in this answer')}</Chip>
            ) : (
              <Chip kind="draft" className={live.stray(i) ? 'is-stray' : ''}>
                {live.draft1[i]}
              </Chip>
            )}
            {live.stamp[i] && (
              <Chip kind="stamp" className={live.stray(i) ? 'is-stray' : ''}>
                {live.stamp[i]}
              </Chip>
            )}
            {live.draft2[i] === undefined ? (
              <Chip kind="ghost2">{__s('not in this answer')}</Chip>
            ) : (
              <Chip kind="pass" i={i}>
                <span aria-hidden="true">✓ </span>
                {live.draft2[i]}
                {(live.draft2Forms[i] ?? 0) > 1 && (
                  <small> · {__s('{count} forms', { count: live.draft2Forms[i] })}</small>
                )}
              </Chip>
            )}
            {i === 2 ? (
              <Chip kind="fallback">
                {__s('fallback')} · en
              </Chip>
            ) : (
              <Chip kind="shipped">✓ es.json</Chip>
            )}
          </span>
        ))}
      </div>

      <div className="fk-pair-ui" role="group" aria-label={__s('Your app, in Spanish')}>
        <p className="fk-pair-label">{__('Your app, in Spanish')}</p>
        {[0, 1, 2].map((i) => {
          const Tag = i === 0 ? 'p' : i === 1 ? 'p' : 'span';
          return (
            <div key={i} className={`fk-ui fk-ui-${i}`} data-ui={i}>
              <span className="fk-pin" data-pin={i} aria-hidden="true" />
              <Tag className="fk-ui-text">
                <span className="fk-ui-en" data-layer={`en-${i}`}>
                  {live.en[i]}
                </span>
                {i < 2 && (
                  <span className="fk-ui-es" data-layer={`es-${i}`} lang="es">
                    {live.es[i]}
                  </span>
                )}
              </Tag>
              {i === 2 && (
                <span className="fk-ui-tag" aria-hidden="true">
                  en · {live.ids[2]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <svg className="fk-wires" aria-hidden="true" preserveAspectRatio="none">
        {STRINGS.map((_, i) => (
          <g key={i} className="fk-wire" data-i={i}>
            <path data-wire={`${i}a`} className="fk-wire-a" />
            <path data-wire={`${i}b`} className="fk-wire-b" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------- */
/* Per-step heading and notes                                      */
/* -------------------------------------------------------------- */

function Head({ index, title, body }: { index: number; title: ReactNode; body: ReactNode }) {
  return (
    <header className="fk-plate-head">
      <span className="fk-plate-num" aria-hidden="true">
        {index + 1}
      </span>
      <h3 className="fk-plate-title">{title}</h3>
      <p className="fk-plate-body">{body}</p>
    </header>
  );
}

type Note = { text: ReactNode; tone?: 'bad' | 'ok' | 'code'; when?: 'reject' | 'pass' };

function Notes({ items }: { items: Note[] }) {
  return (
    <ul className="fk-notes">
      {items.map((n, k) => (
        <li key={k} className="fk-note" data-tone={n.tone} data-when={n.when}>
          {n.text}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- */

export function HowItWorks() {
  const { __, __s } = useT();
  const reduced = useReducedMotion();
  const live = useLive();

  const trackRef = useRef<HTMLDivElement>(null);
  const api = useRef<PairApi | null>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(-1);
  const phaseRef = useRef<Phase | ''>('');
  // A re-render (e.g. a locale switch) rebuilds the pair; let the next frame restore it.
  phaseRef.current = '';
  activeRef.current = -1;

  const titles = [
    __('Write English inline'),
    __('Extract a brief'),
    __('Any agent translates'),
    __('Code checks the work'),
    __('Ship a partial catalog'),
  ];
  const bodies = [
    __('The string in your code is the message. Nothing else changes.'),
    __('The CLI hashes each string into an ID and writes a self-contained work order for an agent.'),
    __('The CLI never calls a model. Bring whichever agent you like.'),
    __('Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.'),
    __('Missing translations fall back to the inline English.'),
  ];
  const notes: Note[][] = [
    [
      { text: __('Each __() call is a string your UI renders. Your app runs in Spanish, but es.json is empty, so it shows the English.') },
      { text: __('Keep __ a bare identifier. That is what duckalize extract scans for.') },
    ],
    [
      { text: __('Same text, same ID, everywhere.') },
      { text: __('The translating agent needs no repo access.') },
    ],
    [
      { text: __('Proposed, not applied: nothing on screen changes yet.') },
      { text: __('An invented placeholder and an unknown ID. The next step catches both.'), tone: 'bad' },
    ],
    [
      { text: <code>{live.rejectLine}</code>, tone: 'code', when: 'reject' },
      ...(live.passes
        ? [{ text: __('The corrected answer passes every check, so it is written to es.json.'), tone: 'ok' as const, when: 'pass' as const }]
        : []),
    ],
    [
      { text: __('Plural form picked by Intl.PluralRules for Spanish.') },
      { text: __('Not in es.json, so it renders the inline English.'), tone: 'ok' },
    ],
  ];

  useScrollProgress(trackRef, (p) => {
    const a = api.current;
    if (reduced || !a?.root) return;
    const s = p * STEPS;
    const root = a.root;

    const phase = phaseAt(s);
    if (phase !== phaseRef.current) {
      phaseRef.current = phase;
      root.dataset.phase = phase;
      if (layersRef.current) layersRef.current.dataset.phase = phase;
      const mood: DuckMood = phase === 'reject' ? 'reject' : phase === 'pass' ? 'happy' : phase === 'draft' ? 'reading' : 'idle';
      root.querySelector('.fk-lane-duck .fk-duck')?.setAttribute('data-mood', mood);
    }

    // 1 · the wires draw in, code → Cart.
    a.wires.forEach((w, k) => {
      const i = Math.floor(k / 2);
      // Code half first, then the Cart half, one string after another.
      const draw = clamp01((s - 0.08 - i * 0.1 - (k % 2) * 0.3) / 0.3);
      w.path.style.strokeDashoffset = String(w.length * (1 - draw));
    });

    for (let i = 0; i < STRINGS.length; i++) {
      // 2 · each ID leaves its line and settles on the wire.
      const idMove = root.querySelector<HTMLElement>(`[data-move="id-${i}"]`);
      if (idMove) {
        const k = clamp01((s - 1.08 - i * 0.08) / 0.38);
        const v = a.toCode[i]!;
        idMove.style.transform = `translate3d(${(v.x * (1 - k)).toFixed(1)}px, ${(v.y * (1 - k)).toFixed(1)}px, 0) scale(${(0.7 + 0.3 * k).toFixed(3)})`;
        idMove.style.opacity = String(k);
      }
      // 4 · a passing answer travels on into the Cart and the text turns Spanish.
      const passMove = root.querySelector<HTMLElement>(`[data-move="pass-${i}"]`);
      const k = clamp01((s - 3.55 - i * 0.06) / 0.3);
      if (passMove) {
        const v = a.toUi[i]!;
        passMove.style.transform = `translate3d(${(v.x * k).toFixed(1)}px, ${(v.y * k).toFixed(1)}px, 0) scale(${(1 - 0.25 * k).toFixed(3)})`;
        passMove.style.opacity = String(1 - clamp01((k - 0.62) / 0.22));
      }
      const es = root.querySelector<HTMLElement>(`[data-layer="es-${i}"]`);
      const en = root.querySelector<HTMLElement>(`[data-layer="en-${i}"]`);
      if (es && en) {
        // English leaves before Spanish arrives, so the two never overlap.
        const t = clamp01((k - 0.66) / 0.3);
        const out = clamp01(t * 2);
        const inn = clamp01(t * 2 - 1);
        en.style.opacity = String(1 - out);
        es.style.opacity = String(inn);
        es.style.visibility = inn === 0 ? 'hidden' : 'visible';
        en.style.visibility = out === 1 ? 'hidden' : 'visible';
      }
    }

    // Heading and notes crossfade per step.
    layersRef.current?.querySelectorAll<HTMLElement>('[data-layer-step]').forEach((el) => {
      const t = s - Number(el.dataset.layerStep);
      let o = 1;
      if (Number(el.dataset.layerStep) > 0) o = Math.min(o, clamp01((t + 0.04) / 0.08));
      if (Number(el.dataset.layerStep) < STEPS - 1) o = Math.min(o, clamp01((1.04 - t) / 0.08));
      el.style.opacity = String(o);
      el.style.transform = `translate3d(0, ${((1 - o) * 10 * (t < 0.5 ? 1 : -1)).toFixed(1)}px, 0)`;
      el.style.visibility = o === 0 ? 'hidden' : 'visible';
    });

    if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
    const active = Math.min(STEPS - 1, Math.floor(s));
    if (active !== activeRef.current) {
      activeRef.current = active;
      railRef.current?.querySelectorAll('li').forEach((li, i) => {
        li.toggleAttribute('data-active', i === active);
        li.toggleAttribute('data-done', i < active);
      });
      if (counterRef.current) counterRef.current.textContent = pad(active + 1);
    }
  });

  /** Rail buttons jump to the middle of a step's scroll window. */
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    if (reduced) {
      document.getElementById(`fk-step-${i + 1}`)?.scrollIntoView({ block: 'start' });
      return;
    }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((i + 0.5) / STEPS), behavior: 'smooth' });
  };

  const rail = (
    <nav className="fk-rail" aria-label={__s('Pipeline steps')}>
      <p className="fk-rail-count" aria-hidden="true">
        <span ref={counterRef}>01</span>
        <span className="fk-rail-of">/05</span>
      </p>
      <ol ref={railRef} className="fk-rail-list">
        {titles.map((title, i) => (
          <li key={i} data-active={i === 0 && !reduced ? '' : undefined}>
            <button type="button" onClick={() => goTo(i)}>
              <span className="fk-rail-n">{i + 1}</span>
              <span className="fk-rail-t">{title}</span>
            </button>
          </li>
        ))}
      </ol>
      <span className="fk-rail-track" aria-hidden="true">
        <span ref={fillRef} className="fk-rail-fill" />
      </span>
    </nav>
  );

  const cardHead = (
    <p className="fk-card-head" aria-hidden="true">
      <span className="fk-card-file">src/Cart.tsx ↔ {__s('your app')} · locales/es.json</span>
    </p>
  );

  return (
    <section className={`fk-how ${reduced ? 'is-static' : 'is-scrub'}`} aria-labelledby="fk-how-title">
      <div className="fk-wrap fk-how-head">
        <div>
          <p className="fk-eyebrow">{__('How it works')}</p>
          <h2 id="fk-how-title" className="fk-h2">
            {__('How a string gets translated')}
          </h2>
          <p className="fk-how-lede">
            {__('Three strings in one component, wired to the screen they render on. Watch what travels along each wire.')}
          </p>
        </div>
        <p className="fk-motto">
          <Duck className="fk-duck-inline" />
          {__('It does the judgment. I do the checking.')}
        </p>
      </div>

      <div ref={trackRef} className="fk-track">
        <div className="fk-stage fk-wrap">
          {rail}
          {reduced ? (
            <div className="fk-frames">
              {FRAME_PHASES.map((phase, i) => (
                <figure key={phase} className="fk-card fk-frame" id={`fk-step-${i + 1}`}>
                  {cardHead}
                  <div className="fk-card-body">
                    <Head index={i} title={titles[i]} body={bodies[i]} />
                    <Pair phase={phase} live={live} />
                    <Notes items={notes[i]!} />
                  </div>
                </figure>
              ))}
            </div>
          ) : (
            <div className="fk-card">
              {cardHead}
              <div className="fk-card-body" ref={layersRef}>
                <div className="fk-layers">
                  {titles.map((title, i) => (
                    <div key={i} className="fk-layer" data-layer-step={i} id={`fk-step-${i + 1}`}>
                      <Head index={i} title={title} body={bodies[i]} />
                    </div>
                  ))}
                </div>
                <Pair phase="write" live={live} api={api} />
                <div className="fk-layers">
                  {notes.map((items, i) => (
                    <div key={i} className="fk-layer" data-layer-step={i}>
                      <Notes items={items} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
