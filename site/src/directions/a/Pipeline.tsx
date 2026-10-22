import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useScrollProgress } from '../../shared/motion.ts';
import {
  APPLY_ERRORS,
  BAD_OUTPUTS,
  BRIEF_ENTRY,
  BRIEF_FIELDS,
  CLAIMS,
  DEMO_SOURCE,
  ES_CATALOG,
  SOURCE_CATALOG,
  STORY,
  TRANSCRIPT,
} from '../../shared/facts.ts';
import { canonicalMessage, createDuck, messageId, validateOutput } from '../../shared/real.ts';

const STEPS = STORY.length;
const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Lines of the demo component as they sit in the captured src/Cart.tsx, so
 * line numbers agree with the refs the CLI printed (src/Cart.tsx:6:12).
 * The captured file has no blank line after the import.
 */
const SOURCE_LINES = DEMO_SOURCE.split('\n').filter((line, i) => !(i === 1 && line === ''));

/* ------------------------------------------------------------------ */
/* Annotation primitives: a row, a leader line, and a margin note.     */
/* ------------------------------------------------------------------ */

function Row({
  children,
  note,
  at,
  className = '',
  tone,
}: {
  children: ReactNode;
  note?: ReactNode;
  at?: number;
  className?: string;
  tone?: 'err' | 'ok';
}) {
  return (
    <div className={`a-row ${note ? 'has-note' : ''} ${className}`} data-tone={tone}>
      <div className="a-row-body">{children}</div>
      {note && (
        <>
          <span className="a-leader" data-at={at ?? 0} data-leader aria-hidden="true" />
          <p className="a-row-note" data-at={(at ?? 0) + 0.04}>
            {note}
          </p>
        </>
      )}
    </div>
  );
}

function Plate({
  index,
  reduced,
  children,
  caption,
}: {
  index: number;
  reduced: boolean;
  children: ReactNode;
  caption: ReactNode;
}) {
  const step = STORY[index]!;
  return (
    <figure className="a-plate" id={`a-fig-2${LETTERS[index]}`} aria-labelledby={`a-plate-h-${index}`} data-plate>
      <header className="a-plate-head">
        <span className="a-plate-num" aria-hidden="true">
          {pad(index + 1)}
        </span>
        <h3 id={`a-plate-h-${index}`} className="a-plate-title">
          {reduced && <span className="a-fig">Fig. 2{LETTERS[index]} </span>}
          {step.title}
        </h3>
        <p className="a-plate-body-text">{step.body}</p>
      </header>
      <div className="a-plate-drawing">{children}</div>
      <figcaption className="a-caption">{caption}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Live values, computed by the library's own code.                    */
/* ------------------------------------------------------------------ */

function useLiveValues() {
  return useMemo(() => {
    const id = messageId(BRIEF_ENTRY.message);
    const hash = parseInt(id, 36);
    const canonical = canonicalMessage(BRIEF_ENTRY.message);

    const attempt1 = BAD_OUTPUTS.rejected;
    const attempt2 = { locale: 'es', translations: ES_CATALOG };
    const diag1 = validateOutput(attempt1, SOURCE_CATALOG, {});
    const diag2 = validateOutput(attempt2, SOURCE_CATALOG, {});

    // A deliberately partial catalog: "Checkout" was never translated.
    const { ak3j7ue6c3: _untranslated, ...partial } = ES_CATALOG;
    const duck = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    duck.load('es', partial);
    const rendered = {
      welcome: duck.__('Welcome back, {name}', { name: 'Ana' }),
      items: duck.__({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count: 2 }),
      checkout: duck.__('Checkout'),
    };

    return { id, hash, canonical, attempt1, diag1, diag2, rendered };
  }, []);
}

/** 3671270527149185 → "3 671 270 527 149 185" with thin spaces. */
const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* ------------------------------------------------------------------ */

export function Pipeline({ reduced }: { reduced: boolean }) {
  const live = useLiveValues();
  const trackRef = useRef<HTMLDivElement>(null);
  const platesRef = useRef<HTMLElement[]>([]);
  const revealRef = useRef<{ el: HTMLElement; plate: number; at: number; leader: boolean }[]>([]);
  const fillRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(-1);

  // Collect the animated nodes once; per-frame work is then pure style writes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const plates = [...track.querySelectorAll<HTMLElement>('[data-plate]')];
    platesRef.current = plates;
    revealRef.current = plates.flatMap((plate, i) =>
      [...plate.querySelectorAll<HTMLElement>('[data-at]')].map((el) => ({
        el,
        plate: i,
        at: Number(el.dataset.at),
        leader: el.hasAttribute('data-leader'),
      })),
    );
    if (reduced) {
      // Live switch to reduced motion: drop every inline transform.
      for (const el of [...plates, ...revealRef.current.map((r) => r.el)]) {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      }
      activeRef.current = -1;
    }
  }, [reduced]);

  useScrollProgress(trackRef, (p) => {
    if (reduced) return;
    const s = p * STEPS;

    platesRef.current.forEach((el, i) => {
      const t = s - i;
      let o = 1;
      if (i > 0) o = Math.min(o, clamp01((t + 0.05) / 0.1));
      if (i < STEPS - 1) o = Math.min(o, clamp01((1.05 - t) / 0.1));
      const dir = t < 0.5 ? 1 : -1;
      el.style.opacity = String(o);
      el.style.transform = `translate3d(0, ${((1 - o) * 14 * dir).toFixed(2)}px, 0)`;
    });

    for (const r of revealRef.current) {
      const k = clamp01((s - r.plate - r.at) / 0.08);
      if (r.leader) {
        r.el.style.transform = `scaleX(${k.toFixed(3)})`;
      } else {
        r.el.style.opacity = String(k);
        r.el.style.transform = `translate3d(0, ${((1 - k) * 6).toFixed(2)}px, 0)`;
      }
    }

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
      document.getElementById(`a-fig-2${LETTERS[i]}`)?.scrollIntoView();
      return;
    }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((i + 0.45) / STEPS), behavior: 'smooth' });
  };

  const fail1 = new Set(live.diag1.filter((d) => d.severity === 'error').map((d) => d.code));
  const fail2 = new Set(live.diag2.filter((d) => d.severity === 'error').map((d) => d.code));
  const ids1 = (code: string) =>
    live.diag1
      .filter((d) => d.code === code)
      .map((d) => d.id)
      .join(', ');

  return (
    <section className={`a-pipe ${reduced ? 'is-static' : 'is-scrub'}`} aria-labelledby="a-pipe-title">
      <div className="a-pipe-intro a-wrap">
        <p className="a-label">Section 2 · Operation</p>
        <h2 id="a-pipe-title" className="a-h2">
          One message, end to end.
        </h2>
        <p className="a-pipe-lede">
          The model does the judgment. Deterministic code does the checking. Follow <code>'{BRIEF_ENTRY.message}'</code>{' '}
          from the line you write to the catalog you ship.
        </p>
      </div>

      <div ref={trackRef} className="a-track">
        <div className="a-stage a-wrap">
          <nav className="a-rail" aria-label="Pipeline steps">
            <p className="a-rail-fig" aria-hidden="true">
              <span className="a-fig">Fig. 2</span>
              <span ref={counterRef} className="a-rail-counter">
                01
              </span>
            </p>
            <ol ref={railRef} className="a-rail-list">
              {STORY.map((step, i) => (
                <li key={step.key} data-active={i === 0 ? '' : undefined}>
                  <button type="button" onClick={() => goTo(i)}>
                    <span className="a-rail-n">{pad(i + 1)}</span>
                    <span className="a-rail-t">{step.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <span className="a-rail-track" aria-hidden="true">
              <span ref={fillRef} className="a-rail-fill" />
            </span>
          </nav>

          <div className="a-frame">
            <p className="a-frame-head" aria-hidden="true">
              <span className="a-fig">Fig. 2</span>
              <span>One message, end to end</span>
              <span className="a-frame-file">src/Cart.tsx → locales/es.json</span>
            </p>

            <div className="a-plates">
              {/* 01 ─ Write */}
              <Plate
                index={0}
                reduced={reduced}
                caption={
                  <>
                    <code>src/Cart.tsx</code>. {CLAIMS.noKeys} {CLAIMS.dedupe}
                  </>
                }
              >
                <div className="a-code" role="group" aria-label="src/Cart.tsx, lines 3 to 9">
                  {SOURCE_LINES.slice(2, 9).map((line, i) => {
                    const n = i + 3;
                    const note =
                      n === 3 ? (
                        <>
                          <code>__</code> stays a bare identifier. That is what <code>extract</code> scans for.
                        </>
                      ) : n === 6 ? (
                        <>The message. Plain English, written where it renders.</>
                      ) : undefined;
                    return (
                      <Row
                        key={n}
                        note={note}
                        at={n === 3 ? 0.08 : 0.28}
                        className={n === 6 ? 'is-hit' : n === 7 || n === 8 ? 'is-dim' : ''}
                      >
                        <span className="a-ln" aria-hidden="true">
                          {n}
                        </span>
                        <code className="a-src">{line}</code>
                      </Row>
                    );
                  })}
                </div>
              </Plate>

              {/* 02 ─ Extract */}
              <Plate
                index={1}
                reduced={reduced}
                caption={
                  <>
                    One entry of <code>locales/.work/es.brief.json</code>. The brief also carries{' '}
                    {BRIEF_FIELDS.filter((f) => f !== 'entries').map((f, i, all) => (
                      <span key={f}>
                        <code>{f}</code>
                        {i < all.length - 2 ? ', ' : i === all.length - 2 ? ' and ' : ''}
                      </span>
                    ))}
                    .
                  </>
                }
              >
                <div className="a-deriv" role="group" aria-label="How the ID is derived">
                  <Row note="Exact text: no trimming, no case folding." at={0.06}>
                    <span className="a-deriv-fn">canonical</span>
                    <code className="a-deriv-v">"{live.canonical}"</code>
                  </Row>
                  <Row at={0.16}>
                    <span className="a-deriv-fn" data-at={0.14}>
                      cyrb53
                    </span>
                    <code className="a-deriv-v a-num" data-at={0.14}>
                      {groupDigits(live.hash)}
                    </code>
                  </Row>
                  <Row note="Same text, same ID, everywhere." at={0.24} className="is-hit">
                    <span className="a-deriv-fn" data-at={0.22}>
                      base36
                    </span>
                    <code className="a-deriv-v a-id" data-at={0.22}>
                      {live.id}
                    </code>
                  </Row>
                </div>

                <div className="a-json" role="group" aria-label="Brief entry" data-at={0.4}>
                  <Row>
                    <code>{'{'}</code>
                  </Row>
                  <Row>
                    <code>
                      {'  '}"id": <span className="a-id">"{BRIEF_ENTRY.id}"</span>,
                    </code>
                  </Row>
                  <Row>
                    <code>
                      {'  '}"message": "{BRIEF_ENTRY.message}",
                    </code>
                  </Row>
                  <Row>
                    <code>
                      {'  '}"refs": ["{BRIEF_ENTRY.refs[0]}"],
                    </code>
                  </Row>
                  <Row>
                    <code>{'  '}"source": [</code>
                  </Row>
                  <Row
                    note={CLAIMS.selfContained.replace('The brief is self-contained: t', 'T')}
                    at={0.52}
                    className="is-hit"
                  >
                    <code className="a-indent">"{BRIEF_ENTRY.source[0]}"</code>
                  </Row>
                  <Row>
                    <code>{'  ]'}</code>
                  </Row>
                  <Row>
                    <code>{'}'}</code>
                  </Row>
                </div>
              </Plate>

              {/* 03 ─ Translate */}
              <Plate
                index={2}
                reduced={reduced}
                caption={
                  <>
                    The brief leaves <code>duckalize</code> as a file, and the answer comes back as one.
                  </>
                }
              >
                <div className="a-boundary">
                  <div className="a-zone a-zone-cli">
                    <p className="a-zone-label">duckalize</p>
                    <p className="a-zone-file">
                      <code>es.brief.json</code>
                    </p>
                    <p className="a-zone-file" data-at={0.62}>
                      <code>es.out.json</code>
                    </p>
                  </div>

                  <div className="a-hand-arrows-wrap" data-at={0.12}>
                    <svg className="a-hand-arrows" viewBox="0 0 120 120" aria-hidden="true">
                      <path d="M6 34 C 36 22, 70 20, 108 32" />
                      <path d="M98 24 L109 32 L97 39" />
                      <path className="a-hand-back" d="M112 86 C 80 100, 44 99, 10 86" />
                      <path className="a-hand-back" d="M21 79 L9 86 L20 94" />
                    </svg>
                  </div>

                  <div className="a-zone a-zone-agent">
                    <svg className="a-hand-ring" viewBox="0 0 260 120" aria-hidden="true" preserveAspectRatio="none">
                      <path d="M150 9 C 214 10, 254 34, 250 64 C 246 98, 182 113, 118 111 C 54 109, 8 92, 9 60 C 10 28, 62 9, 128 8 C 160 7, 190 11, 214 20" />
                    </svg>
                    <p className="a-hand-title">any agent</p>
                    <p className="a-hand-note" data-at={0.28}>
                      reads the instructions, style, glossary &amp; context, then decides how it should sound
                    </p>
                  </div>
                </div>

                <div className="a-json a-json-hand" role="group" aria-label="The agent's first output" data-at={0.5}>
                  <p className="a-hand-tag">first attempt, as returned</p>
                  <Row>
                    <code>{'{ "locale": "es", "translations": {'}</code>
                  </Row>
                  <Row>
                    <code>
                      {'    '}"105cueagvb5": "Hola de nuevo, <mark className="a-mark">{'{nombre}'}</mark>",
                    </code>
                  </Row>
                  <Row>
                    <code>
                      {'    '}"<mark className="a-mark">zzz123</mark>": "Pagar"
                    </code>
                  </Row>
                  <Row>
                    <code>{'} }'}</code>
                  </Row>
                </div>
              </Plate>

              {/* 04 ─ Validate */}
              <Plate index={3} reduced={reduced} caption={<>{CLAIMS.rejectAll}</>}>
                <table className="a-table">
                  <caption className="sr-only">Apply-time error checks for two agent outputs</caption>
                  <thead>
                    <tr>
                      <th scope="col">Check</th>
                      <th scope="col" data-at={0.08}>
                        Attempt 1
                      </th>
                      <th scope="col" data-at={0.5}>
                        Attempt 2
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {APPLY_ERRORS.map((code, i) => {
                      const f1 = fail1.has(code);
                      const f2 = fail2.has(code);
                      return (
                        <tr key={code} data-fail={f1 || undefined}>
                          <th scope="row">
                            <code>{code}</code>
                          </th>
                          <td data-at={0.1 + i * 0.03} data-tone={f1 ? 'err' : undefined}>
                            {f1 ? (
                              <>
                                <span aria-hidden="true">✗ </span>
                                <span className="sr-only">fails: </span>
                                <code>{ids1(code)}</code>
                              </>
                            ) : (
                              <span className="a-pass">
                                <span aria-hidden="true">✓</span>
                                <span className="sr-only">passes</span>
                              </span>
                            )}
                          </td>
                          <td data-at={0.52 + i * 0.03} data-tone={f2 ? 'err' : undefined}>
                            {f2 ? (
                              '✗'
                            ) : (
                              <span className="a-pass">
                                <span aria-hidden="true">✓</span>
                                <span className="sr-only">passes</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="a-term" role="group" aria-label="CLI output">
                  <p className="a-term-line" data-tone="err" data-at={0.36}>
                    <span className="a-term-k">1</span>
                    <code>{TRANSCRIPT.rejected.at(-1)!.text}</code>
                  </p>
                  <p className="a-term-line" data-tone="ok" data-at={0.78}>
                    <span className="a-term-k">2</span>
                    <code>{TRANSCRIPT.applied.at(-1)!.text}</code>
                  </p>
                </div>
              </Plate>

              {/* 05 ─ Ship */}
              <Plate
                index={4}
                reduced={reduced}
                caption={
                  <>
                    Rendered by <code>@duckalization/runtime</code> with <code>locale: 'es'</code> and a catalog missing
                    one entry. {CLAIMS.partialShips}
                  </>
                }
              >
                <div className="a-proof" role="group" aria-label="The Cart component rendered in Spanish">
                  <p className="a-proof-label">Proof · es</p>
                  <Row
                    note={
                      <>
                        From <code>es.json</code>: <code>"Hola de nuevo, {'{name}'}"</code>
                      </>
                    }
                    at={0.12}
                  >
                    <p className="a-proof-h">{live.rendered.welcome}</p>
                  </Row>
                  <Row
                    note={
                      <>
                        Plural form picked by <code>Intl.PluralRules('es')</code>
                      </>
                    }
                    at={0.26}
                  >
                    <p className="a-proof-p">{live.rendered.items}</p>
                  </Row>
                  <Row
                    note={
                      <>
                        Not in <code>es.json</code>. {CLAIMS.fallback}
                      </>
                    }
                    at={0.42}
                    tone="ok"
                    className="is-hit"
                  >
                    <span className="a-proof-btn">{live.rendered.checkout}</span>
                  </Row>
                </div>
              </Plate>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
