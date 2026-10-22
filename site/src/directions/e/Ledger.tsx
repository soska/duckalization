import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ES_CATALOG, MESSAGES } from '../../shared/facts.ts';
import { useReducedMotion, useScrollProgress } from '../../shared/motion.ts';
import { createDuck } from '../../shared/real.ts';
import {
  cellText,
  COLUMNS,
  EDITED_CHECKOUT,
  EDITED_ID,
  FIRST_ATTEMPT_DIAGNOSTICS,
  refFor,
  ROWS,
  STEPS,
  type Col,
  type RowKey,
  type Step,
} from './steps.ts';

const COL_INDEX: Record<Col, number> = { source: 1, brief: 2, agent: 3, checked: 4, shipped: 5, orphan: 5 };
const COL_LABEL: Record<Col, string> = {
  source: 'Source',
  brief: 'Brief',
  agent: 'Agent output',
  checked: 'Checked',
  shipped: 'Shipped',
  orphan: 'Orphan',
};
const STATE_ORDER: Col[] = ['source', 'brief', 'agent', 'checked', 'shipped', 'orphan'];
const BEATS = 5;
const EASE = 'cubic-bezier(.2,.75,.15,1)';

/** `{token}`s set apart from prose; a token the source doesn't have is flagged. */
function Placeholders({ text, flag }: { text: string; flag?: string }) {
  return (
    <>
      {text.split(/(\{[A-Za-z0-9_]+\})/).map((part, i) =>
        /^\{[A-Za-z0-9_]+\}$/.test(part) ? (
          <span key={i} className={part === flag ? 'e-ph e-ph-bad' : 'e-ph'}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

const unknownPlaceholder = FIRST_ATTEMPT_DIAGNOSTICS.find((d) => d.code === 'unknown-placeholder');
const badToken = unknownPlaceholder ? /\{([A-Za-z0-9_]+)\}/.exec(unknownPlaceholder.message)?.[0] : undefined;

function Card({ row, col, step, index }: { row: RowKey; col: Col; step: Step; index: number }) {
  const cell = cellText(row, col, step);
  const isBad = Boolean(step.rejected && row === 'welcome');
  const tag =
    col === 'brief'
      ? 'missing'
      : col === 'checked'
        ? '✓ passed'
        : col === 'orphan'
          ? 'orphaned'
          : col === 'agent' && step.rejected
            ? isBad
              ? null
              : 'not written'
            : null;
  return (
    <>
      <div className="e-card-top">
        <span className="e-no" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="e-id">{col === 'source' ? refFor(row) : cell.id}</span>
        <span className="e-state">{COL_LABEL[col]}</span>
      </div>
      <p className={cell.translated ? 'e-text e-text-judged' : 'e-text'} title={cell.text}>
        <span key={cell.text} className="e-text-inner">
          {col === 'source' ? '‘' : ''}
          <Placeholders text={cell.text} flag={isBad ? badToken : undefined} />
          {col === 'source' ? '’' : ''}
        </span>
        {cell.forms && <span className="e-forms"> · {cell.forms} forms</span>}
      </p>
      {tag && <span className="e-tag">{tag}</span>}
      {isBad && unknownPlaceholder && (
        <span className="e-stamp" role="note">
          {unknownPlaceholder.code}
        </span>
      )}
    </>
  );
}

/** The cart, rendered by the real runtime from whatever es.json holds right now. */
function Preview({ step }: { step: Step }) {
  const rendered = useMemo(() => {
    const missing = new Set<string>();
    const duck = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: (id) => missing.add(id) });
    const inEsJson = (row: RowKey) => step.place[row] === 'shipped' || step.place[row] === 'orphan';
    const catalog = Object.fromEntries(
      (['welcome', 'items', 'checkout'] as const)
        .filter(inEsJson)
        .map((row) => [MESSAGES[row].id, ES_CATALOG[MESSAGES[row].id as keyof typeof ES_CATALOG]])
    );
    duck.load('es', catalog);
    const welcome = duck.__('Welcome back, {name}', { name: 'Ana' });
    const items = duck.__(MESSAGES.items.message, { count: 3 });
    const button = step.edited ? duck.__(EDITED_CHECKOUT) : duck.__('Checkout');
    return [
      { key: 'h', text: welcome, fallback: missing.has(MESSAGES.welcome.id) },
      { key: 'p', text: items, fallback: missing.has(MESSAGES.items.id) },
      { key: 'b', text: button, fallback: missing.has(step.edited ? EDITED_ID : MESSAGES.checkout.id) },
    ];
  }, [step]);
  const [h, p, b] = rendered;
  const fallbacks = rendered.filter((r) => r.fallback).length;
  return (
    <figure className="e-preview">
      <figcaption>
        <span>rendered · es</span>
        <span className="e-preview-count">{fallbacks === 0 ? 'all Spanish' : `${fallbacks} in English`}</span>
      </figcaption>
      <div className="e-preview-ui">
        <p className={h!.fallback ? 'e-pv-h e-fb' : 'e-pv-h'}>{h!.text}</p>
        <p className={p!.fallback ? 'e-pv-p e-fb' : 'e-pv-p'}>{p!.text}</p>
        <span className={b!.fallback ? 'e-pv-b e-fb' : 'e-pv-b'}>{b!.text}</span>
      </div>
    </figure>
  );
}

function Terminal({ step }: { step: Step }) {
  const label = step.beat === 0 ? 'src/Cart.tsx' : step.label === 'Translate' ? 'agent' : 'terminal';
  return (
    <figure className="e-term">
      <figcaption>{label}</figcaption>
      <pre key={step.label} aria-label={`${label} output`}>
        {step.cli.map((line, i) => (
          <span key={i} className={`e-line e-line-${line.kind}`} style={{ '--i': i } as CSSProperties}>
            {line.kind === 'cmd' && <span className="e-prompt" aria-hidden="true">$ </span>}
            {line.text}
            {'\n'}
          </span>
        ))}
      </pre>
    </figure>
  );
}

export function Ledger() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  const prevIndex = useRef(0);

  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<RowKey, HTMLLIElement>());
  /** Visual positions (transforms included) captured just before a step change. */
  const before = useRef(new Map<RowKey, { x: number; y: number }>());
  const scrollLock = useRef<number | null>(null);

  const snapshot = useCallback(() => {
    const grid = gridRef.current?.getBoundingClientRect();
    if (!grid) return;
    before.current.clear();
    cards.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      before.current.set(key, { x: r.left - grid.left, y: r.top - grid.top });
    });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setIndex((current) => {
        if (next === current) return current;
        snapshot();
        return next;
      });
    },
    [snapshot]
  );

  // Scroll position → step (motion mode only; reduced motion uses buttons alone).
  useScrollProgress(sectionRef, (p) => {
    if (reduced) return;
    const s = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
    if (scrollLock.current !== null) {
      if (s === scrollLock.current) scrollLock.current = null;
      return;
    }
    goTo(s);
  });

  /** Buttons move the scroll position too, so scroll and state never disagree. */
  const step_ = (next: number) => {
    const target = Math.max(0, Math.min(STEPS.length - 1, next));
    goTo(target);
    const section = sectionRef.current;
    if (reduced || !section) return;
    const travel = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top + window.scrollY + ((target + 0.5) / STEPS.length) * travel;
    scrollLock.current = target;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // FLIP: rows keep their DOM node and change grid cell; animate from the old spot.
  useLayoutEffect(() => {
    const from = prevIndex.current;
    prevIndex.current = index;
    if (from === index || reduced) return;
    const grid = gridRef.current?.getBoundingClientRect();
    if (!grid) return;
    cards.current.forEach((el, key) => {
      const last = before.current.get(key);
      el.getAnimations().forEach((a) => a.cancel());
      if (!last || STEPS[from]!.place[key] === null || step.place[key] === null) return;
      const now = el.getBoundingClientRect();
      const dx = last.x - (now.left - grid.left);
      const dy = last.y - (now.top - grid.top);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 780,
        easing: EASE,
        delay: ROWS.indexOf(key) * 60,
        fill: 'backwards',
      });
    });
  }, [index, reduced, step]);

  // The whole file lunges at the validator and is pushed back.
  useEffect(() => {
    if (!step.rejected || reduced) return;
    cards.current.forEach((el, key) => {
      if (step.place[key] === null) return;
      el.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(56px)', offset: 0.32 },
          { transform: 'translateX(-10px)', offset: 0.62 },
          { transform: 'translateX(3px)', offset: 0.82 },
          { transform: 'translateX(0)' },
        ],
        { duration: 900, delay: 820 + ROWS.indexOf(key) * 40, easing: 'cubic-bezier(.3,.6,.2,1)' }
      );
    });
  }, [step, reduced]);

  const counts = useMemo(() => {
    const c: Partial<Record<Col, number>> = {};
    for (const row of ROWS) {
      const col = step.place[row];
      if (col) c[col] = (c[col] ?? 0) + 1;
    }
    return c;
  }, [step]);

  /** Phone layout: one ledger, ordered by state, then by entry number. */
  const mobileRow = useMemo(() => {
    const visible = ROWS.filter((r) => step.place[r] !== null).sort(
      (a, b) =>
        STATE_ORDER.indexOf(step.place[a]!) - STATE_ORDER.indexOf(step.place[b]!) || ROWS.indexOf(a) - ROWS.indexOf(b)
    );
    const order: Partial<Record<RowKey, number>> = {};
    visible.forEach((r, i) => (order[r] = i + 2));
    ROWS.forEach((r) => (order[r] ??= ROWS.length + 1));
    return order as Record<RowKey, number>;
  }, [step]);

  const prev = index > 0 ? STEPS[index - 1] : undefined;

  return (
    <section
      ref={sectionRef}
      className={reduced ? 'e-pipe e-pipe-static' : 'e-pipe'}
      style={{ '--steps': STEPS.length } as CSSProperties}
      aria-labelledby="e-pipe-title"
    >
      {!reduced &&
        STEPS.map((s, i) => (
          <span key={s.label} className="e-snap" style={{ '--i': i } as CSSProperties} aria-hidden="true" />
        ))}
      <div className="e-sticky">
        <div className="e-band">
          <div className="e-copy">
            <h2 id="e-pipe-title" className="sr-only">
              The pipeline
            </h2>
            <p className="e-beat">
              <span>Beat {String(step.beat + 1).padStart(2, '0')}</span>
              <span className="e-beat-of"> / {String(BEATS).padStart(2, '0')}</span>
              <span className="e-beat-label">{step.label}</span>
            </p>
            <h3 key={step.title} className="e-step-title">
              {step.title}
            </h3>
            <p key={step.body} className="e-step-body">
              <Placeholders text={step.body} />
            </p>
          </div>
          <div className={index >= 5 ? 'e-slot e-slot-preview' : 'e-slot'}>
            <Terminal step={step} />
            <Preview step={step} />
          </div>
        </div>

        <div ref={gridRef} className="e-ledger" role="group" aria-label="Catalog ledger">
          {COLUMNS.map((c, i) => (
            <div
              key={c.key}
              className={c.key === 'agent' ? 'e-rail e-rail-agent' : 'e-rail'}
              style={{ '--c': i + 1 } as CSSProperties}
              aria-hidden="true"
            />
          ))}
          {COLUMNS.map((c, i) => (
            <div key={c.key} className="e-colhead" style={{ '--c': i + 1 } as CSSProperties}>
              <span className="e-colhead-label">{c.label}</span>
              <span className="e-colhead-actor">{c.actor}</span>
              <span className="e-colhead-count" aria-label={`${counts[c.key] ?? 0} entries`}>
                {counts[c.key] ?? 0}
              </span>
            </div>
          ))}
          <div className={step.edited ? 'e-orphans e-orphans-on' : 'e-orphans'} aria-hidden={!step.edited}>
            <span>Orphans</span>
            <span className="e-orphans-note">in es.json, no longer in en.json</span>
          </div>
          <ol className="e-rows" aria-label={`Entries — step ${index + 1} of ${STEPS.length}: ${step.label}`}>
            {ROWS.map((row, i) => {
              const col = step.place[row];
              const shown = col ?? 'brief';
              const changed = reduced && prev && prev.place[row] !== col && col !== null;
              return (
                <li
                  key={row}
                  ref={(el) => {
                    if (el) cards.current.set(row, el);
                    else cards.current.delete(row);
                  }}
                  className="e-card"
                  data-col={shown}
                  data-hidden={col === null || undefined}
                  data-changed={changed || undefined}
                  data-bad={(step.rejected && row === 'welcome') || undefined}
                  aria-hidden={col === null || undefined}
                  style={
                    {
                      '--c': COL_INDEX[shown],
                      '--r': shown === 'orphan' ? 7 : i + 2,
                      '--m': mobileRow[row],
                    } as CSSProperties
                  }
                >
                  <Card row={row} col={shown} step={step} index={i} />
                  {changed && <span className="sr-only"> (changed)</span>}
                </li>
              );
            })}
          </ol>
        </div>

        <nav className="e-controls" aria-label="Pipeline steps">
          <button type="button" onClick={() => step_(index - 1)} disabled={index === 0} aria-label="Previous step">
            ←
          </button>
          <ol className="e-dots">
            {STEPS.map((s, i) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => step_(i)}
                  aria-current={i === index ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${s.label}`}
                >
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => step_(index + 1)}
            disabled={index === STEPS.length - 1}
            aria-label="Next step"
          >
            →
          </button>
        </nav>
        <p className="sr-only" aria-live="polite">
          Step {index + 1} of {STEPS.length}, {step.label}: {step.title}. {step.body}
        </p>
      </div>
    </section>
  );
}
