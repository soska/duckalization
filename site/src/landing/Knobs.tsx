import { useEffect, useState, type RefObject } from 'react';
import './knobs.css';

/**
 * Dev-only tuning panel for the How-it-works transitions (`?knobs`). Each knob
 * writes a CSS custom property on the section, which landing.css reads with
 * the shipped value as its fallback. "Copy" puts the current values on the
 * clipboard so they can be baked into landing.css. Not localized: it never
 * ships to visitors.
 */

const EASINGS: Record<string, string> = {
  linear: 'linear',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  standard: 'cubic-bezier(0.3, 0, 0.3, 1)',
  out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
  'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

type Knob =
  | { key: string; label: string; kind: 'ms' | 'px'; min: number; max: number; step: number; value: number }
  | { key: string; label: string; kind: 'ease'; value: string };

const GROUPS: { title: string; knobs: Knob[] }[] = [
  {
    title: 'Step leaving',
    knobs: [
      { key: 'step-out-dur', label: 'duration', kind: 'ms', min: 0, max: 1200, step: 10, value: 180 },
      { key: 'step-out-dist', label: 'distance', kind: 'px', min: 0, max: 80, step: 1, value: 16 },
      { key: 'step-out-ease', label: 'easing', kind: 'ease', value: 'in-out' },
    ],
  },
  {
    title: 'Step arriving',
    knobs: [
      { key: 'step-in-delay', label: 'delay', kind: 'ms', min: 0, max: 1200, step: 10, value: 80 },
      { key: 'step-in-fade', label: 'fade', kind: 'ms', min: 0, max: 1500, step: 10, value: 180 },
      { key: 'step-in-slide', label: 'slide', kind: 'ms', min: 0, max: 1500, step: 10, value: 180 },
      { key: 'step-in-dist', label: 'distance', kind: 'px', min: 0, max: 80, step: 1, value: 16 },
      { key: 'step-in-ease', label: 'easing', kind: 'ease', value: 'in-out' },
    ],
  },
  {
    title: 'Reveals (notes, stamps, code)',
    knobs: [
      { key: 'reveal-delay', label: 'delay', kind: 'ms', min: 0, max: 800, step: 10, value: 0 },
      { key: 'reveal-fade', label: 'fade', kind: 'ms', min: 0, max: 1500, step: 10, value: 260 },
      { key: 'reveal-slide', label: 'slide', kind: 'ms', min: 0, max: 1500, step: 10, value: 320 },
      { key: 'reveal-dist', label: 'distance', kind: 'px', min: 0, max: 40, step: 1, value: 8 },
      { key: 'reveal-ease', label: 'easing', kind: 'ease', value: 'out' },
      { key: 'leader-dur', label: 'leader line', kind: 'ms', min: 0, max: 1500, step: 10, value: 320 },
    ],
  },
];

const STORE = 'dk-knobs';
type Values = Record<string, number | string>;

const defaults = (): Values => {
  const v: Values = { slowmo: 1, smoothing: 160 };
  for (const g of GROUPS) for (const k of g.knobs) v[k.key] = k.value;
  return v;
};

const load = (): Values => {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(STORE) ?? '{}') };
  } catch {
    return defaults();
  }
};

const cssValue = (k: Knob, v: number | string) =>
  k.kind === 'ease' ? EASINGS[v as string] ?? String(v) : `${v}${k.kind}`;

export default function Knobs({
  target,
  onSmoothing,
}: {
  target: RefObject<HTMLElement | null>;
  onSmoothing: (ms: number) => void;
}) {
  const [values, setValues] = useState(load);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    for (const g of GROUPS)
      for (const k of g.knobs) el.style.setProperty(`--fk-${k.key}`, cssValue(k, values[k.key]!));
    el.style.setProperty('--fk-slowmo', String(values.slowmo));
    onSmoothing(Number(values.smoothing));
    try {
      localStorage.setItem(STORE, JSON.stringify(values));
    } catch {
      /* private mode: knobs still work, they just won't persist */
    }
  }, [values, target, onSmoothing]);

  const set = (key: string, v: number | string) => setValues((old) => ({ ...old, [key]: v }));

  const copy = () => {
    const lines = GROUPS.flatMap((g) => g.knobs.map((k) => `  --fk-${k.key}: ${cssValue(k, values[k.key]!)};`));
    const text = `/* How it works transitions */\n.fk-how {\n${lines.join('\n')}\n}\n/* scroll smoothing: ${values.smoothing}ms */`;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const slider = (key: string, label: string, unit: string, min: number, max: number, step: number) => (
    <label className="kn-row" key={key}>
      <span className="kn-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(values[key])}
        onChange={(e) => set(key, Number(e.target.value))}
      />
      <output className="kn-val">
        {values[key]}
        {unit}
      </output>
    </label>
  );

  return (
    <aside className="kn" data-open={open || undefined} aria-label="Transition knobs">
      <button type="button" className="kn-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Knobs {open ? '–' : '+'}
      </button>
      {open && (
        <div className="kn-body">
          <fieldset className="kn-group">
            <legend>Global</legend>
            {slider('slowmo', 'slow-mo', '×', 1, 8, 0.5)}
            {slider('smoothing', 'scroll glide', 'ms', 0, 400, 10)}
          </fieldset>
          {GROUPS.map((g) => (
            <fieldset className="kn-group" key={g.title}>
              <legend>{g.title}</legend>
              {g.knobs.map((k) =>
                k.kind === 'ease' ? (
                  <label className="kn-row" key={k.key}>
                    <span className="kn-label">{k.label}</span>
                    <select value={String(values[k.key])} onChange={(e) => set(k.key, e.target.value)}>
                      {Object.keys(EASINGS).map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  slider(k.key, k.label, k.kind, k.min, k.max, k.step)
                )
              )}
            </fieldset>
          ))}
          <div className="kn-actions">
            <button type="button" onClick={copy}>
              {copied ? 'Copied' : 'Copy values'}
            </button>
            <button type="button" onClick={() => setValues(defaults())}>
              Reset
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
