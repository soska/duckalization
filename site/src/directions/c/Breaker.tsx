import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MESSAGES } from '../../shared/facts.ts';
import { useInView, useReducedMotion } from '../../shared/motion.ts';
import type { Catalog, Message, TranslateDiagnostic } from '../../shared/real.ts';
import { Preview } from './Preview.tsx';
import {
  attemptApply,
  CHIPS,
  cliLine,
  ES_FORMS,
  EXTRA_ID,
  EXTRA_VALUE,
  INITIAL,
  toOutput,
  type AgentAnswer,
  type Attempt,
  type Field,
  type PluralKey,
} from './state.ts';

type RowKey = 'welcome' | 'items' | 'checkout' | 'extra';
const ROW_IDS: Record<RowKey, string> = {
  welcome: MESSAGES.welcome.id,
  items: MESSAGES.items.id,
  checkout: MESSAGES.checkout.id,
  extra: EXTRA_ID,
};

type Verdict = 'error' | 'warning' | 'pass' | 'held' | 'absent';

interface RowEls {
  row: HTMLElement | null;
  model: HTMLElement | null;
  gate: HTMLElement | null;
  code: HTMLElement | null;
  token: HTMLElement | null;
  stamp: HTMLElement | null;
  shipped: HTMLElement | null;
}

const EASE = 'cubic-bezier(.22,.7,.18,1)';

function center(el: HTMLElement, origin: DOMRect, token: HTMLElement) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - origin.left - token.offsetWidth / 2,
    y: r.top + r.height / 2 - origin.top - token.offsetHeight / 2,
  };
}

/** One-shot gate animations. Transform and opacity only. */
function animateRow(els: RowEls, verdict: Verdict, label: string) {
  const { row, model, gate, code, token, stamp, shipped } = els;
  if (!row || !model || !gate || !code || !token) return;
  if (verdict === 'absent') return;
  token.textContent = label;
  const origin = row.getBoundingClientRect();
  const m = center(model, origin, token);
  const g = center(gate, origin, token);
  const c = center(shipped ?? code, origin, token);
  const at = (p: { x: number; y: number }, extra = '') => `translate(${p.x}px, ${p.y}px) ${extra}`;
  // Approach the gate from the model's side (horizontal on desktop, vertical when stacked).
  const toward = { x: g.x - (g.x - m.x) * 0.18, y: g.y - (g.y - m.y) * 0.18 };

  let frames: Keyframe[];
  let duration: number;
  if (verdict === 'pass') {
    duration = 900;
    frames = [
      { transform: at(m, 'scale(.96)'), opacity: 0 },
      { transform: at(m), opacity: 1, offset: 0.12 },
      { transform: at(g, 'scale(.9)'), opacity: 1, offset: 0.48 },
      { transform: at(c), opacity: 1, offset: 0.86 },
      { transform: at(c, 'scale(.98)'), opacity: 0 },
    ];
    shipped?.animate(
      [
        { opacity: 0, transform: 'translateX(-8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 360, delay: 720, easing: EASE, fill: 'backwards' }
    );
  } else if (verdict === 'held') {
    duration = 820;
    frames = [
      { transform: at(m), opacity: 0 },
      { transform: at(m), opacity: 1, offset: 0.12 },
      { transform: at(toward), opacity: 1, offset: 0.5 },
      { transform: at(toward), opacity: 1, offset: 0.75 },
      { transform: at(m), opacity: 0 },
    ];
  } else {
    duration = 900;
    frames = [
      { transform: at(m), opacity: 0 },
      { transform: at(m), opacity: 1, offset: 0.1 },
      { transform: at(g, 'scale(.86, 1.04)'), opacity: 1, offset: 0.44, easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: at({ x: m.x - (g.x - m.x) * 0.06, y: m.y - (g.y - m.y) * 0.06 }), opacity: 1, offset: 0.78 },
      { transform: at(m), opacity: 0 },
    ];
  }
  token.animate(frames, { duration, easing: EASE });
  // The gate reacts when the token reaches it.
  gate.querySelector('.c-gate-glyph')?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
    { duration: 260, delay: duration * 0.42, easing: 'cubic-bezier(.3,1.4,.5,1)' }
  );
  if (stamp && verdict !== 'pass') {
    stamp.animate(
      [
        { opacity: 0, transform: 'scale(1.6) rotate(-8deg)' },
        { opacity: 1, transform: 'scale(1) rotate(-3deg)' },
      ],
      { duration: 220, delay: duration * 0.42, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' }
    );
  }
}

const show = (message: Message | undefined): string =>
  message === undefined
    ? ''
    : typeof message === 'string'
      ? message
      : Object.entries(message)
          .map(([form, text]) => `${form}: ${text}`)
          .join(' · ');

export function Breaker() {
  const reduced = useReducedMotion();
  const [answer, setAnswer] = useState<AgentAnswer>(INITIAL);
  const [attempt, setAttempt] = useState<Attempt>(() => attemptApply(INITIAL, {}));
  const [before, setBefore] = useState<Catalog>({});
  const [announce, setAnnounce] = useState('');
  const shippedRef = useRef<Catalog>({});
  const els = useRef<Record<RowKey, RowEls>>({
    welcome: {} as RowEls,
    items: {} as RowEls,
    checkout: {} as RowEls,
    extra: {} as RowEls,
  });
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, '0px 0px -35% 0px');

  const verdicts = useMemo(() => verdictsFor(answer, attempt), [answer, attempt]);

  /** Run `translate apply` against the current answer and animate the outcome. */
  const commit = useCallback(
    (next: AgentAnswer, resetShipped = false, animate = true) => {
      const from = resetShipped ? {} : shippedRef.current;
      const result = attemptApply(next, from);
      setBefore(from);
      shippedRef.current = result.shipped;
      setAttempt(result);
      if (animate && !reduced) {
        const v = verdictsFor(next, result);
        const out = toOutput(next).translations;
        requestAnimationFrame(() => {
          (Object.keys(ROW_IDS) as RowKey[]).forEach((key, i) => {
            const id = ROW_IDS[key];
            if (out[id] === undefined) return;
            const label = show(out[id]) || '""';
            setTimeout(() => animateRow(els.current[key], v[key], label), i * 70);
          });
        });
      }
    },
    [reduced]
  );

  // The first rejection plays once the section is on screen.
  const played = useRef(false);
  useEffect(() => {
    if (inView && !played.current) {
      played.current = true;
      commit(answer, false, true);
    }
  }, [inView, answer, commit]);

  // Typing: validate once the keystrokes pause.
  const pending = useRef<number>(0);
  const edit = (next: AgentAnswer) => {
    setAnswer(next);
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => commit(next), 380);
  };
  const chip = (index: number) => {
    const c = CHIPS[index]!;
    const next = c.apply(answer);
    window.clearTimeout(pending.current);
    setAnswer(next);
    commit(next, c.resetShipped);
  };
  const resetShipped = () => {
    shippedRef.current = {};
    setBefore({});
    setAttempt((a) => ({ ...a, shipped: {} }));
  };

  // Screen readers get the CLI summary, debounced so typing isn't narrated.
  useEffect(() => {
    const errors = attempt.diagnostics.filter((d) => d.severity === 'error').length;
    const warnings = attempt.diagnostics.length - errors;
    const text = `${attempt.summary} ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`;
    const t = window.setTimeout(() => setAnnounce(text), 900);
    return () => window.clearTimeout(t);
  }, [attempt]);

  const errors = attempt.diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = attempt.diagnostics.length - errors;
  const register = (key: RowKey) => (part: keyof RowEls) => (el: HTMLElement | null) => {
    els.current[key][part] = el;
  };

  const outputJson = JSON.stringify(toOutput(answer), null, 2);

  return (
    <section ref={sectionRef} id="break" className="c-break" aria-labelledby="break-title">
      <div className="c-split c-break-head">
        <div className="c-side c-model">
          <p className="c-eyebrow">Steps 3 → 4, live</p>
          <h2 id="break-title" className="c-display">
            Try to break it<span className="c-period">.</span>
          </h2>
          <p className="c-prose">
            You’re the agent now. Edit the Spanish on this side. It’s the judgment part, so it’s all yours: phrasing,
            register, which plural forms to write.
          </p>
        </div>
        <div className="c-seam" aria-hidden="true" />
        <div className="c-side c-code">
          <p className="c-mono-prose">
            Every pause in your typing runs <code>validateOutput()</code>: the actual function from{' '}
            <code>@duckalization/translate</code>, bundled for this page. Errors reject the whole file. Nothing is
            written.
          </p>
          <div className="c-chips" role="group" aria-label="Try this">
            <span className="c-label">Try this</span>
            {CHIPS.map((c, i) => (
              <button key={c.key} type="button" className={`c-chip c-chip-${c.key}`} onClick={() => chip(i)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="c-split c-colheads" aria-hidden="true">
        <div className="c-side c-model">
          <span className="c-hand">es.out.json · the agent’s answer</span>
        </div>
        <div className="c-seam">
          <span className="c-gate-title">gate</span>
        </div>
        <div className="c-side c-code">
          <span className="c-label">locales/en.json → locales/es.json</span>
        </div>
      </div>

      <ol className="c-rows">
        <Row
          k="welcome"
          verdict={verdicts.welcome}
          diags={attempt.diagnostics}
          register={register('welcome')}
          shipped={attempt.shipped}
          before={before}
          reduced={reduced}
          model={
            <StringField
              id="c-welcome"
              label="Spanish for “Welcome back, {name}”"
              field={answer.welcome}
              invalid={verdicts.welcome === 'error'}
              onChange={(welcome) => edit({ ...answer, welcome })}
            />
          }
        />
        <Row
          k="items"
          verdict={verdicts.items}
          diags={attempt.diagnostics}
          register={register('items')}
          shipped={attempt.shipped}
          before={before}
          reduced={reduced}
          model={
            <PluralField
              answer={answer}
              invalid={verdicts.items === 'error'}
              onChange={(items) => edit({ ...answer, items })}
            />
          }
        />
        <Row
          k="checkout"
          verdict={verdicts.checkout}
          diags={attempt.diagnostics}
          register={register('checkout')}
          shipped={attempt.shipped}
          before={before}
          reduced={reduced}
          model={
            <StringField
              id="c-checkout"
              label="Spanish for “Checkout”"
              field={answer.checkout}
              invalid={verdicts.checkout === 'error'}
              onChange={(checkout) => edit({ ...answer, checkout })}
            />
          }
        />
        {answer.extra && (
          <Row
            k="extra"
            verdict={verdicts.extra}
            diags={attempt.diagnostics}
            register={register('extra')}
            shipped={attempt.shipped}
            before={before}
            reduced={reduced}
            model={
              <div className="c-extra">
                <span className="c-hand-small">An entry the agent made up</span>
                <span className="c-extra-pair">
                  <code>“{EXTRA_ID}”</code>: “{EXTRA_VALUE}”
                </span>
                <button type="button" className="c-mini" onClick={() => edit({ ...answer, extra: false })}>
                  Remove it
                </button>
              </div>
            }
          />
        )}
      </ol>

      <div className="c-split c-results">
        <div className="c-side c-model">
          <figure className="c-file">
            <figcaption className="c-hand">What you’re handing back</figcaption>
            <pre tabIndex={0} aria-label="es.out.json">
              <code>{outputJson}</code>
            </pre>
          </figure>
        </div>
        <div className="c-seam" aria-hidden="true" />
        <div className="c-side c-code">
          <div className={`c-verdict ${attempt.ok ? 'is-ok' : 'is-bad'}`}>
            <span className="c-verdict-state">
              {attempt.ok
                ? `Applied — ${attempt.applied} entr${attempt.applied === 1 ? 'y' : 'ies'}`
                : `Rejected — ${errors} error${errors === 1 ? '' : 's'}`}
            </span>
            {warnings > 0 && (
              <span className="c-verdict-warn">
                {warnings} warning{warnings === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="c-ledger" aria-label="duckalize translate apply output">
            <p className="c-ledger-cmd">
              <span aria-hidden="true">$ </span>duckalize translate apply es.out.json
            </p>
            <ol className="c-ledger-rows">
              {attempt.diagnostics.map((d, i) => (
                <li key={`${d.code}-${d.id}-${i}`} className={`c-ledger-row is-${d.severity}`}>
                  <span className="c-ledger-sev">{d.severity === 'error' ? 'ERR' : 'WARN'}</span>
                  <span className="c-ledger-code">{d.code}</span>
                  <span className="c-ledger-id">{d.id}</span>
                  <span className="c-ledger-msg">{d.message}</span>
                  <span className="sr-only">{cliLine(d)}</span>
                </li>
              ))}
            </ol>
            <p className={`c-ledger-summary ${attempt.ok ? 'is-ok' : 'is-bad'}`}>{attempt.summary}</p>
          </div>
          <Preview shipped={attempt.shipped} />
          <button
            type="button"
            className="c-mini c-reset"
            onClick={resetShipped}
            disabled={Object.keys(attempt.shipped).length === 0}
          >
            Delete locales/es.json
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}

function verdictsFor(answer: AgentAnswer, attempt: Attempt): Record<RowKey, Verdict> {
  const out = toOutput(answer).translations;
  const result = {} as Record<RowKey, Verdict>;
  for (const key of Object.keys(ROW_IDS) as RowKey[]) {
    const id = ROW_IDS[key];
    const mine = attempt.diagnostics.filter((d) => d.id === id);
    if (out[id] === undefined) result[key] = 'absent';
    else if (mine.some((d) => d.severity === 'error')) result[key] = 'error';
    else if (!attempt.ok) result[key] = 'held';
    else if (mine.length > 0) result[key] = 'warning';
    else result[key] = 'pass';
  }
  return result;
}

const VERDICT_TEXT: Record<Verdict, string> = {
  error: 'Rejected',
  warning: 'Passed, with a warning',
  pass: 'Passed',
  held: 'Valid, but held: the file has errors',
  absent: 'Not in the output',
};
const STAMP: Record<Verdict, string> = { error: 'rejected', warning: 'warning', pass: 'pass', held: 'held', absent: 'left out' };
const VERDICT_GLYPH: Record<Verdict, string> = { error: '✗', warning: '!', pass: '✓', held: '‖', absent: '·' };

function Row(props: {
  k: RowKey;
  verdict: Verdict;
  diags: TranslateDiagnostic[];
  register: (part: keyof RowEls) => (el: HTMLElement | null) => void;
  shipped: Catalog;
  before: Catalog;
  reduced: boolean;
  model: ReactNode;
}) {
  const { k, verdict, diags, register, shipped, before, reduced, model } = props;
  const id = ROW_IDS[k];
  const source = k === 'extra' ? undefined : Object.values(MESSAGES).find((m) => m.id === id);
  const mine = diags.filter((d) => d.id === id);
  const first = mine.find((d) => d.severity === 'error') ?? mine[0];
  const now = shipped[id];
  const was = before[id];
  const changed = show(now) !== show(was);

  return (
    <li ref={register('row')} className={`c-split c-row is-${verdict}`}>
      <div ref={register('model')} className="c-side c-model">
        {model}
      </div>
      <div ref={register('gate')} className="c-seam c-gate">
        <span className="c-gate-glyph" aria-hidden="true">
          {VERDICT_GLYPH[verdict]}
        </span>
        <span ref={register('stamp')} className="c-stamp">
          {(verdict === 'error' || verdict === 'warning') && first ? first.code : STAMP[verdict]}
        </span>
        <span className="sr-only">{VERDICT_TEXT[verdict]}</span>
      </div>
      <div ref={register('code')} className="c-side c-code">
        <dl className="c-entry">
          <div>
            <dt>id</dt>
            <dd className="c-id">{id}</dd>
          </div>
          {source ? (
            <>
              <div>
                <dt>en</dt>
                <dd>{show(source.message)}</dd>
              </div>
              <div className="c-ref-row">
                <dt>ref</dt>
                <dd className="c-ref">{source.ref}</dd>
              </div>
              <div className="c-es-row">
                <dt>es.json</dt>
                <dd ref={register('shipped')} className={now === undefined ? 'c-es is-missing' : 'c-es'}>
                  {now === undefined ? '— missing · renders the English' : show(now)}
                  {reduced && (
                    // Reserved even when unchanged, so applying never shifts the layout.
                    <span className={`c-was ${changed ? '' : 'is-same'}`} aria-hidden={!changed}>
                      was: {was === undefined ? 'missing' : show(was)}
                    </span>
                  )}
                </dd>
              </div>
            </>
          ) : (
            <div>
              <dt>en</dt>
              <dd className="c-nosuch">no such ID in en.json</dd>
            </div>
          )}
        </dl>
      </div>
      <span ref={register('token')} className="c-token" aria-hidden="true" />
    </li>
  );
}

function OmitToggle({ field, onChange, label }: { field: Field; onChange: (f: Field) => void; label: string }) {
  return (
    <button
      type="button"
      className="c-omit"
      aria-pressed={field.omitted}
      aria-label={`${field.omitted ? 'Put back' : 'Leave out'} ${label}`}
      onClick={() => onChange({ ...field, omitted: !field.omitted })}
    >
      {field.omitted ? 'put back' : 'leave out'}
    </button>
  );
}

function StringField(props: {
  id: string;
  label: string;
  field: Field;
  invalid: boolean;
  onChange: (f: Field) => void;
}) {
  const { id, label, field, invalid, onChange } = props;
  return (
    <div className={`c-field ${field.omitted ? 'is-omitted' : ''}`}>
      <label htmlFor={id} className="c-hand-small">
        {label}
      </label>
      <div className="c-input-row">
        <input
          id={id}
          className="c-input"
          value={field.omitted ? '' : field.value}
          placeholder={field.omitted ? 'left out of the file' : ''}
          disabled={field.omitted}
          aria-invalid={invalid}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange({ ...field, value: e.target.value })}
        />
        <OmitToggle field={field} onChange={onChange} label={label} />
      </div>
    </div>
  );
}

function PluralField({
  answer,
  invalid,
  onChange,
}: {
  answer: AgentAnswer;
  invalid: boolean;
  onChange: (items: AgentAnswer['items']) => void;
}) {
  const { items } = answer;
  const setForm = (form: PluralKey, field: Field) => onChange({ ...items, forms: { ...items.forms, [form]: field } });
  return (
    <fieldset className={`c-field c-plural ${items.omitted ? 'is-omitted' : ''}`}>
      <legend className="c-hand-small">Spanish for “{'{count}'} item(s) in your cart”</legend>
      <p className="c-plural-note">Spanish selects one, many or other, so write those.</p>
      {ES_FORMS.map((form) => {
        const field = items.forms[form];
        const off = items.omitted || field.omitted;
        return (
          <div key={form} className={`c-form ${field.omitted ? 'is-omitted' : ''}`}>
            <label htmlFor={`c-items-${form}`} className="c-form-name">
              {form}
            </label>
            <input
              id={`c-items-${form}`}
              className="c-input"
              value={off ? '' : field.value}
              placeholder={off ? 'left out' : ''}
              disabled={off}
              aria-invalid={invalid}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setForm(form, { ...field, value: e.target.value })}
            />
            {!items.omitted && (
              <OmitToggle field={field} onChange={(f) => setForm(form, f)} label={`the “${form}” form`} />
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="c-mini"
        aria-pressed={items.omitted}
        onClick={() => onChange({ ...items, omitted: !items.omitted })}
      >
        {items.omitted ? 'Put the plural entry back' : 'Leave the whole entry out'}
      </button>
    </fieldset>
  );
}
