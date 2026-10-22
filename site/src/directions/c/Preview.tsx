import { useMemo, useState } from 'react';
import { createDuck, DuckProvider, useDuck, type Catalog } from '../../shared/real.ts';

const COUNTS = [1, 3, 1_000_000] as const;

/** The demo <Cart>, written exactly as in facts.DEMO_SOURCE, plus fallback tags. */
function Cart({ name, count, missing }: { name: string; count: number; missing: Set<string> }) {
  const { __ } = useDuck();
  const tag = (id: string) =>
    missing.has(id) ? (
      <span className="c-fallback" title="Not in es.json, so the runtime renders the inline English">
        en fallback
      </span>
    ) : null;
  return (
    <section className="c-cart" aria-label="Rendered Cart component">
      <h4>
        {__('Welcome back, {name}', { name })} {tag('105cueagvb5')}
      </h4>
      <p>
        {__({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count })}{' '}
        {tag('70z5uwb2of')}
      </p>
      <span className="c-cart-row">
        <button type="button" className="c-cart-btn" tabIndex={-1}>
          {__('Checkout')}
        </button>
        {tag('ak3j7ue6c3')}
      </span>
    </section>
  );
}

/**
 * locales/es.json rendered by the real runtime: a fresh Duck per catalog
 * version (load() only merges, and a deleted es.json must really be gone).
 */
export function Preview({ shipped }: { shipped: Catalog }) {
  const [count, setCount] = useState<number>(3);
  const duck = useMemo(() => {
    const d = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    d.load('es', shipped);
    return d;
  }, [shipped]);
  const missing = useMemo(
    () => new Set(['105cueagvb5', '70z5uwb2of', 'ak3j7ue6c3'].filter((id) => shipped[id] === undefined)),
    [shipped]
  );

  return (
    <div className="c-preview">
      <div className="c-preview-head">
        <span className="c-label">Shipped · locale es · real runtime</span>
        <fieldset className="c-counts">
          <legend className="sr-only">count</legend>
          {COUNTS.map((n) => (
            <label key={n} className="c-count">
              <input type="radio" name="c-count" checked={count === n} onChange={() => setCount(n)} />
              <span>count = {n.toLocaleString('en-US')}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <DuckProvider duck={duck}>
        <Cart name="Ana" count={count} missing={missing} />
      </DuckProvider>
      <p className="c-preview-note">
        {missing.size === 0
          ? 'Every string is in es.json.'
          : `${missing.size} of 3 strings missing from es.json — they render the inline English, and the page still ships.`}
      </p>
    </div>
  );
}
