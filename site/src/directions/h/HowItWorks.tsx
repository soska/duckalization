import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  APPLY_ERRORS,
  BAD_OUTPUTS,
  BRIEF_ENTRY,
  DEMO_SOURCE,
  ES_CATALOG,
  SOURCE_CATALOG,
  TRANSCRIPT,
} from '../../shared/facts.ts';
import { useReducedMotion, useScrollProgress } from '../../shared/motion.ts';
import { canonicalMessage, messageId, validateOutput } from '../../shared/real.ts';
import { Duck, type DuckMood } from './Duck.tsx';
import { useT } from './i18n.tsx';
import { PinnedPreview, Preview, previewStateAt, type PreviewState } from './Preview.tsx';
import { EDITED_SOURCE, EDITED_STRING, EDITED_TRANSCRIPT } from './script.ts';

const STEPS = 5;
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** 3671270527149185 → "3 671 270 527 149 185". */
const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const SOURCE_LINES = DEMO_SOURCE.split('\n');
/** 1-based number of the line holding `Welcome back, {name}` (the CLI's src/Cart.tsx:6:12). */
const HIT_LINE = SOURCE_LINES.findIndex((l) => l.includes(BRIEF_ENTRY.message)) + 1;
/** 1-based lines holding the three messages, in the order the preview numbers them. */
const MESSAGE_LINES = SOURCE_LINES.flatMap((l, i) => (l.includes('__(') && !l.includes('useDuck') ? [i + 1] : []));
const CHECKOUT_LINE = MESSAGE_LINES[MESSAGE_LINES.length - 1]!;

/** Everything shown is computed by the library's own code, once. */
function useLive() {
  return useMemo(() => {
    const id = messageId(BRIEF_ENTRY.message);
    const attempt1 = BAD_OUTPUTS.rejected;
    const attempt2 = { locale: 'es', translations: ES_CATALOG };
    const diag1 = validateOutput(attempt1, SOURCE_CATALOG, {});
    const diag2 = validateOutput(attempt2, SOURCE_CATALOG, {});

    return {
      id,
      hash: parseInt(id, 36),
      canonical: canonicalMessage(BRIEF_ENTRY.message),
      fail1: new Set(diag1.filter((d) => d.severity === 'error').map((d) => d.code)),
      fail2: new Set(diag2.filter((d) => d.severity === 'error').map((d) => d.code)),
      idsFor: (code: string) =>
        diag1
          .filter((d) => d.code === code)
          .map((d) => d.id)
          .join(', '),
      checkoutId: messageId('Checkout'),
      renamedId: messageId(EDITED_STRING),
    };
  }, []);
}

/* -------------------------------------------------------------- */
/* A row with an optional leader line and a sticker note.          */
/* -------------------------------------------------------------- */

function Row({
  children,
  note,
  at = 0,
  tone,
  className = '',
}: {
  children: ReactNode;
  note?: ReactNode;
  at?: number;
  tone?: 'bad' | 'ok';
  className?: string;
}) {
  return (
    <div className={`fk-row ${note ? 'has-note' : ''} ${className}`} data-tone={tone}>
      <div className="fk-row-body">{children}</div>
      {note && (
        <div className="fk-aside">
          <span className="fk-leader" data-at={at} data-leader aria-hidden="true" />
          <p className="fk-note" data-at={at + 0.04}>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}

function Plate({
  index,
  title,
  body,
  caption,
  previews,
  figureRef,
  overlay,
  children,
}: {
  index: number;
  title: ReactNode;
  body: ReactNode;
  caption: ReactNode;
  /** Shown only in the static (reduced-motion) frames; the scrub has one pinned preview. */
  previews?: PreviewState[];
  figureRef?: RefObject<HTMLElement | null>;
  /** Drawn over the whole plate (the static step-1 wires). */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure
      ref={figureRef}
      className="fk-plate"
      id={`fk-step-${index + 1}`}
      aria-labelledby={`fk-plate-h-${index}`}
      data-plate
    >
      {previews && (
        <div className="hk-frame-previews">
          {previews.map((state) => (
            <Preview key={state} state={state} />
          ))}
        </div>
      )}
      <header className="fk-plate-head">
        <h3 id={`fk-plate-h-${index}`} className="fk-plate-title">
          {title}
        </h3>
        <p className="fk-plate-body">{body}</p>
      </header>
      <div className="fk-plate-draw">{children}</div>
      <figcaption className="fk-caption">{caption}</figcaption>
      {overlay}
    </figure>
  );
}

/** Live media query. */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Phones too short to hold the pinned app and a whole step at once. */
const SHORT_PHONE = '(max-width: 559px) and (max-height: 740px)';


/* -------------------------------------------------------------- */

export function HowItWorks() {
  const { __, __s } = useT();
  // Reduced motion, or a phone too short for the pinned stage: five stacked,
  // static frames, each with its own preview, instead of the scrub.
  const prefersReduced = useReducedMotion();
  const shortPhone = useMedia(SHORT_PHONE);
  const reduced = prefersReduced || shortPhone;
  const live = useLive();

  const trackRef = useRef<HTMLDivElement>(null);
  const platesRef = useRef<HTMLElement[]>([]);
  const revealRef = useRef<{ el: HTMLElement; plate: number; at: number; leader: boolean }[]>([]);
  const fillRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const checkerRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(-1);
  const previewCtl = useRef<((s: PreviewState) => void) | null>(null);
  const previewStateRef = useRef<PreviewState>('write');
  const cardRef = useRef<HTMLDivElement>(null);
  const moodRef = useRef<DuckMood>('idle');
  // A re-render (e.g. a locale switch) resets the duck to idle; let the next
  // scroll frame put its mood back.
  moodRef.current = 'idle';

  const titles = [
    __('Write English inline'),
    __('Extract a brief'),
    __('Any agent translates'),
    __('Code checks the work'),
    __('Ship a partial catalog'),
  ];

  // Collect animated nodes once; each scroll frame is then pure style writes.
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
      }))
    );
    if (reduced) {
      for (const el of [...plates, ...revealRef.current.map((r) => r.el)]) {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
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
      el.style.transform = `translate3d(0, ${((1 - o) * 18 * dir).toFixed(2)}px, 0)`;
      el.style.visibility = o === 0 ? 'hidden' : 'visible';
    });

    for (const r of revealRef.current) {
      const k = clamp01((s - r.plate - r.at) / 0.08);
      if (r.leader) {
        r.el.style.transform = `scaleX(${k.toFixed(3)})`;
      } else {
        r.el.style.opacity = String(k);
        r.el.style.transform = `translate3d(0, ${((1 - k) * 8).toFixed(2)}px, 0)`;
      }
    }

    if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;

    // The duck reads attempt 1, rejects it, then hops when attempt 2 passes.
    const t4 = s - 3;
    const mood: DuckMood = t4 < 0.1 ? 'idle' : t4 < 0.3 ? 'reading' : t4 < 0.62 ? 'reject' : 'happy';
    if (mood !== moodRef.current && checkerRef.current) {
      moodRef.current = mood;
      checkerRef.current.firstElementChild?.setAttribute('data-mood', mood);
    }

    const state = previewStateAt(s);
    if (state !== previewStateRef.current) {
      previewStateRef.current = state;
      previewCtl.current?.(state);
    }

    const active = Math.min(STEPS - 1, Math.floor(s));
    if (active !== activeRef.current) {
      activeRef.current = active;
      railRef.current?.querySelectorAll('li').forEach((li, i) => {
        li.toggleAttribute('data-active', i === active);
        li.toggleAttribute('data-done', i < active);
      });
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

  return (
    <section
      className={`fk-how ${reduced ? 'is-static' : 'is-scrub'}`}
      aria-labelledby="fk-how-title"
    >
      <div className="fk-wrap fk-how-head">
        <div>
          <p className="fk-eyebrow">{__('How it works')}</p>
          <h2 id="fk-how-title" className="fk-h2">
            {__('How a string gets translated')}
          </h2>
          <p className="fk-how-lede">
            {__('Follow one string, {message}, from the line you write to the catalog you ship.', {
              message: `'${BRIEF_ENTRY.message}'`,
            })}
          </p>
        </div>
        <p className="fk-motto">
          <Duck className="fk-duck-inline" />
          {__('It does the judgment. I do the checking.')}
        </p>
      </div>

      <div ref={trackRef} className="fk-track">
        <div className="fk-stage fk-wrap">
          <nav className="fk-rail" aria-label={__s('Pipeline steps')}>
            <ol ref={railRef} className="fk-rail-list">
              {titles.map((title, i) => (
                <li key={i} data-active={i === 0 ? '' : undefined}>
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

          <div ref={cardRef} className="fk-card">
            {!reduced && <PinnedPreview control={previewCtl} />}

            <div className="fk-plates">
              {/* 1 · Write */}
              <Plate
                index={0}
                title={titles[0]}
                previews={reduced ? ['write'] : undefined}
                body={__('The string in your code is the message. Nothing else changes.')}
                caption={__('No translation keys. IDs are hashed from the text. The same string in many places is one catalog entry.')}
              >
                <div className="fk-code" role="group" aria-label="src/Cart.tsx">
                  {SOURCE_LINES.slice(2, 8).map((line, i) => {
                    const n = i + 3;
                    const marker = MESSAGE_LINES.indexOf(n) + 1;
                    const note =
                      n === 3
                        ? __('Keep __ a bare identifier. That is what duckalize extract scans for.')
                        : n === HIT_LINE
                          ? __('Each call is one string in your app above. Same number, same color.')
                          : undefined;
                    return (
                      <Row
                        key={n}
                        note={note}
                        at={n === 3 ? 0.1 : 0.32}
                        className={marker ? 'is-hit' : ''}
                      >
                        {marker > 0 ? (
                          <span
                            className="hk-marker hk-port"
                            data-n={marker}
                            data-pair={marker}
                            aria-hidden="true"
                            data-at={0.18 + marker * 0.04}
                          >
                            {marker}
                          </span>
                        ) : (
                          <span className="hk-port-gap" aria-hidden="true" />
                        )}
                        <span className="fk-ln" aria-hidden="true">
                          {n}
                        </span>
                        <code className="fk-src">{line.trim() ? line.replace(/^ {2}/, '') : ' '}</code>
                      </Row>
                    );
                  })}
                </div>
              </Plate>

              {/* 2 · Extract */}
              <Plate
                index={1}
                title={titles[1]}
                previews={reduced ? ['extract'] : undefined}
                body={__('The CLI hashes each string into an ID and writes a self-contained work order for an agent.')}
                caption={__('One entry of locales/.work/es.brief.json. The brief also carries the locale, its plural categories, instructions, style and glossary.')}
              >
                <div className="fk-deriv" role="group" aria-label={__s('How the ID is derived')}>
                  <Row note={__('Exact text: no trimming, no case folding.')} at={0.06}>
                    <span className="fk-fn">canonical</span>
                    <code className="fk-val">"{live.canonical}"</code>
                  </Row>
                  <Row>
                    <span className="fk-fn" data-at={0.14}>
                      cyrb53
                    </span>
                    <code className="fk-val fk-num" data-at={0.14}>
                      {groupDigits(live.hash)}
                    </code>
                  </Row>
                  <Row note={__('Same text, same ID, everywhere.')} at={0.24} className="is-hit">
                    <span className="fk-fn" data-at={0.22}>
                      base36
                    </span>
                    <code className="fk-val fk-id" data-at={0.22}>
                      {live.id}
                    </code>
                  </Row>
                </div>

                <div className="fk-json" role="group" aria-label={__s('Brief entry')} data-at={0.4}>
                  <Row>
                    <code>
                      {'{ '}"id": <b className="fk-id-ink">"{BRIEF_ENTRY.id}"</b>,
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
                  <Row note={__('The translating agent needs no repo access.')} at={0.54} className="is-hit">
                    <code>
                      {'  '}"source": ["{BRIEF_ENTRY.source[0]}"] {'}'}
                    </code>
                  </Row>
                </div>
              </Plate>

              {/* 3 · Translate */}
              <Plate
                index={2}
                title={titles[2]}
                previews={reduced ? ['draft'] : undefined}
                body={__('The CLI never calls a model. Bring whichever agent you like.')}
                caption={__('The brief leaves duckalize as a file, and the answer comes back as one.')}
              >
                <div className="fk-handoff">
                  <div className="fk-zone fk-zone-cli">
                    <p className="fk-zone-label">duckalize</p>
                    <p className="fk-file">
                      <code>es.brief.json</code> <span aria-hidden="true">→</span>
                    </p>
                    <p className="fk-file" data-at={0.62}>
                      <span aria-hidden="true">←</span> <code>es.out.json</code>
                    </p>
                  </div>
                  <svg className="fk-arrows" viewBox="0 0 120 120" aria-hidden="true" data-at={0.12}>
                    <path d="M6 34 C 36 22, 70 20, 108 32" />
                    <path d="M98 24 L109 32 L97 39" />
                    <path d="M112 86 C 80 100, 44 99, 10 86" />
                    <path d="M21 79 L9 86 L20 94" />
                  </svg>
                  <div className="fk-zone fk-zone-agent">
                    <p className="fk-zone-label">{__('any agent')}</p>
                    <p className="fk-agent-note" data-at={0.26}>
                      {__('Reads the instructions, style, glossary and context, then decides how it should sound.')}
                    </p>
                  </div>
                </div>

                <div className="fk-json fk-json-agent" role="group" aria-label={__s('The agent’s first answer')} data-at={0.46}>
                  <p className="fk-json-tag">{__('first answer, as returned')}</p>
                  <Row>
                    <code>{'{ "locale": "es", "translations": {'}</code>
                  </Row>
                  <Row>
                    <code>
                      {'    '}"105cueagvb5": "Hola de nuevo, <mark className="fk-mark">{'{nombre}'}</mark>",
                    </code>
                  </Row>
                  {/* The note sits on the last line so that, on narrow screens where
                      notes stack under their line, it follows the JSON instead of
                      splitting it. */}
                  <Row note={__('An invented placeholder and an unknown ID. The next step catches both.')} at={0.6} tone="bad">
                    <code>
                      {'    '}"<mark className="fk-mark">zzz123</mark>": "Pagar" {'} }'}
                    </code>
                  </Row>
                </div>
              </Plate>

              {/* 4 · Checks */}
              <Plate
                index={3}
                title={titles[3]}
                previews={reduced ? ['reject', 'pass'] : undefined}
                body={__('Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.')}
                caption={__('Errors reject the whole file; nothing is written.')}
              >
                <div className="fk-checks">
                  <span ref={checkerRef} className="fk-checker">
                    <Duck mood="idle" />
                  </span>
                  <table className="fk-table">
                    <caption className="sr-only">{__('Apply-time checks for two answers from the agent')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{__('Check')}</th>
                        <th scope="col" data-at={0.1}>
                          {__('Answer 1')}
                        </th>
                        <th scope="col" data-at={0.56}>
                          {__('Answer 2')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {APPLY_ERRORS.map((code, i) => {
                        const f1 = live.fail1.has(code);
                        const f2 = live.fail2.has(code);
                        return (
                          <tr key={code} data-fail={f1 || undefined}>
                            <th scope="row">
                              <code>{code}</code>
                            </th>
                            <td data-at={0.12 + i * 0.025} data-tone={f1 ? 'bad' : 'ok'}>
                              {f1 ? (
                                <>
                                  <span aria-hidden="true">✗ </span>
                                  <code>{live.idsFor(code)}</code>
                                </>
                              ) : (
                                <span aria-label={__s('passes')}>✓</span>
                              )}
                            </td>
                            <td data-at={0.58 + i * 0.025} data-tone={f2 ? 'bad' : 'ok'}>
                              {f2 ? '✗' : <span aria-label={__s('passes')}>✓</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="fk-verdicts">
                    <p className="fk-verdict" data-tone="bad" data-at={0.34}>
                      <code>{TRANSCRIPT.rejected.at(-1)!.text}</code>
                    </p>
                    <p className="fk-verdict" data-tone="ok" data-at={0.62}>
                      <code>{TRANSCRIPT.applied.at(-1)!.text}</code>
                    </p>
                  </div>
                </div>
              </Plate>

              {/* 5 · Ship */}
              <Plate
                index={4}
                title={titles[4]}
                previews={reduced ? ['ship'] : undefined}
                body={__('Missing translations fall back to the inline English.')}
                caption={__('A partial target catalog is safe to ship. The next brief picks up the new string.')}
              >
                <div className="fk-code" role="group" aria-label="src/Cart.tsx">
                  <Row className="is-dim hk-old">
                    <span className="fk-ln" aria-hidden="true">
                      {CHECKOUT_LINE}
                    </span>
                    <del>
                      <code className="fk-src">{SOURCE_LINES[CHECKOUT_LINE - 1]!.replace(/^ {2}/, '')}</code>
                    </del>
                  </Row>
                  <Row note={__('You edit the copy. New text, new ID.')} at={0.12} className="is-hit">
                    <span className="fk-ln" aria-hidden="true">
                      {CHECKOUT_LINE}
                    </span>
                    <span className="hk-marker" data-n="3" aria-hidden="true">
                      3
                    </span>
                    <ins>
                      <code className="fk-src">{EDITED_SOURCE.replace(/^ {2}/, '')}</code>
                    </ins>
                  </Row>
                </div>

                <div className="fk-deriv" role="group" aria-label={__s('What happens to the two IDs')}>
                  <Row note={__('Still in es.json, no longer in en.json: an orphan. prune archives it.')} at={0.3}>
                    <span className="fk-fn">{__('old')}</span>
                    <code className="fk-val hk-orphan">{live.checkoutId}</code>
                  </Row>
                  <Row note={__('Not in es.json yet, so your app renders the inline English.')} at={0.44} tone="ok" className="is-hit">
                    <span className="fk-fn">{__('new')}</span>
                    <code className="fk-val fk-id">{live.renamedId}</code>
                  </Row>
                </div>

                <p className="fk-verdict hk-status-line" data-tone="warn" data-at={0.3}>
                  <code>
                    $ {EDITED_TRANSCRIPT.at(-2)!.text}
                    {'\n'}
                    {EDITED_TRANSCRIPT.at(-1)!.text}
                  </code>
                </p>
              </Plate>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
