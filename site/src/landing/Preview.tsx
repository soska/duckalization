import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import { BAD_OUTPUTS, ES_CATALOG, MESSAGES } from '../shared/facts.ts';
import { createDuck, messageId } from '../shared/real.ts';
import { useT } from './i18n.tsx';
import { EDITED_STRING } from './script.ts';

/**
 * What the pinned app preview shows. One state per moment of the story;
 * step 4 has three (the duck reads, rejects attempt 1, accepts attempt 2).
 */
export type PreviewState = 'write' | 'extract' | 'draft' | 'checking' | 'reject' | 'pass' | 'ship';

/** Scroll position (in steps, 0–5) → preview state. Matches the step-4 reveals. */
export function previewStateAt(s: number): PreviewState {
  if (s < 1) return 'write';
  if (s < 2) return 'extract';
  if (s < 3) return 'draft';
  if (s < 4) {
    const t = s - 3;
    return t < 0.3 ? 'checking' : t < 0.62 ? 'reject' : 'pass';
  }
  return 'ship';
}

type Layer = 'en' | 'id' | 'draft' | 'es' | 'ship';
type Slot = 'welcome' | 'items' | 'checkout';

/** Which rendering of each element is on screen in each state. */
const LAYERS: Record<PreviewState, Record<Slot, Layer>> = {
  write: { welcome: 'en', items: 'en', checkout: 'en' },
  extract: { welcome: 'id', items: 'id', checkout: 'id' },
  draft: { welcome: 'draft', items: 'draft', checkout: 'draft' },
  checking: { welcome: 'en', items: 'en', checkout: 'en' },
  reject: { welcome: 'en', items: 'en', checkout: 'en' },
  pass: { welcome: 'es', items: 'es', checkout: 'es' },
  ship: { welcome: 'es', items: 'es', checkout: 'ship' },
};

const NAME = 'Ana';
const COUNT = 2;
const ITEMS = MESSAGES.items.message;

/**
 * Every rendering is produced by the real runtime. The only exception is the
 * agent's draft, which is the agent's own answer (BAD_OUTPUTS.rejected),
 * shown as data because it was never applied.
 */
function useRenderings() {
  return useMemo(() => {
    const en = createDuck({ sourceLocale: 'en', locale: 'en', onMissing: false });
    const es = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
    es.load('es', ES_CATALOG);
    const draft = BAD_OUTPUTS.rejected.translations;
    const [draftCheckoutId, draftCheckout] = Object.entries(draft).find(([id]) => id !== MESSAGES.welcome.id)!;
    return {
      en: {
        welcome: en.__(MESSAGES.welcome.message, { name: NAME }),
        items: en.__(ITEMS, { count: COUNT }),
        checkout: en.__(MESSAGES.checkout.message),
      },
      es: {
        welcome: es.__(MESSAGES.welcome.message, { name: NAME }),
        items: es.__(ITEMS, { count: COUNT }),
        checkout: es.__(MESSAGES.checkout.message),
        // The renamed button: new text, new ID, not in es.json → inline English.
        renamed: es.__(EDITED_STRING),
      },
      ids: {
        welcome: messageId(MESSAGES.welcome.message),
        items: messageId(ITEMS),
        checkout: messageId(MESSAGES.checkout.message),
        renamed: messageId(EDITED_STRING),
      },
      draft: {
        welcome: draft[MESSAGES.welcome.id as keyof typeof draft]!,
        checkout: draftCheckout,
        checkoutId: draftCheckoutId,
      },
    };
  }, []);
}

/** `Hola de nuevo, {nombre}` with the raw placeholder marked. */
function RawDraft({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^}]+\})/).map((part, i) =>
        part.startsWith('{') ? (
          <mark key={i} className="hk-raw">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function IdTag({ children, tone }: { children: ReactNode; tone?: 'bad' | 'fallback' }) {
  return (
    <span className="hk-idtag" data-tone={tone}>
      {children}
    </span>
  );
}

function SlotLayers({
  slot,
  on,
  layers,
}: {
  slot: Slot;
  on: Layer;
  layers: Partial<Record<Layer, ReactNode>>;
}) {
  return (
    <span className={`hk-slot hk-slot-${slot}`}>
      {(Object.keys(layers) as Layer[]).map((layer) => (
        <span
          key={layer}
          className="hk-layer"
          data-layer={layer}
          data-on={layer === on || undefined}
          aria-hidden={layer === on ? undefined : true}
        >
          {layers[layer]}
        </span>
      ))}
    </span>
  );
}

/**
 * The app being localized: the three strings from src/Cart.tsx, rendered.
 * The numbered markers match the ones on the `__()` lines in the code below:
 * same number, same color (`data-pair`).
 */
export function Preview({
  state,
  pinned = false,
  className = '',
}: {
  state: PreviewState;
  pinned?: boolean;
  className?: string;
}) {
  const { __ } = useT();
  const r = useRenderings();
  const on = LAYERS[state];

  const status: Record<PreviewState, ReactNode> = {
    write: __('Your English, rendered exactly as written.'),
    extract: __('Every string now has an ID, hashed from its text.'),
    draft: __('The agent’s draft. Not live: nothing has been applied.'),
    checking: __('The duck is checking the answer.'),
    reject: __('Rejected. Nothing was written, so your app is still in English.'),
    pass: __('Applied to es.json. Your app is live in Spanish.'),
    ship: __('You renamed the button. The new text isn’t translated yet, so it falls back.'),
  };
  const locale = state === 'pass' || state === 'ship' ? 'es' : state === 'draft' ? __('es · draft') : 'en';

  return (
    <div className={`hk-preview ${className}`} data-state={state} data-pinned={pinned || undefined}>
      <div className="hk-app" role="group" aria-label="src/Cart.tsx">
        <p className="hk-app-bar">
          <span>{__('Your app')}</span>
          <span className="hk-locale">{locale}</span>
        </p>
        <div className="hk-app-body">
          <p className="hk-el hk-el-h">
            <span className="hk-marker" data-n="1" data-pair="1" aria-hidden="true">
              1
            </span>
            <SlotLayers
              slot="welcome"
              on={on.welcome}
              layers={{
                en: r.en.welcome,
                id: (
                  <>
                    {r.en.welcome} <IdTag>{r.ids.welcome}</IdTag>
                  </>
                ),
                draft: (
                  <span className="hk-draft">
                    <RawDraft text={r.draft.welcome} /> <IdTag>{MESSAGES.welcome.id}</IdTag>
                  </span>
                ),
                es: r.es.welcome,
              }}
            />
          </p>
          <p className="hk-el hk-el-p">
            <span className="hk-marker" data-n="2" data-pair="2" aria-hidden="true">
              2
            </span>
            <SlotLayers
              slot="items"
              on={on.items}
              layers={{
                en: r.en.items,
                id: (
                  <>
                    {r.en.items} <IdTag>{r.ids.items}</IdTag>
                  </>
                ),
                draft: (
                  <span className="hk-draft is-empty">
                    {r.en.items} <span className="hk-missing">{__('not in this answer')}</span>
                  </span>
                ),
                es: r.es.items,
              }}
            />
          </p>
          <p className="hk-el hk-el-b">
            <span className="hk-marker" data-n="3" data-pair="3" aria-hidden="true">
              3
            </span>
            <SlotLayers
              slot="checkout"
              on={on.checkout}
              layers={{
                en: <span className="hk-btn">{r.en.checkout}</span>,
                id: (
                  <>
                    <span className="hk-btn">{r.en.checkout}</span> <IdTag>{r.ids.checkout}</IdTag>
                  </>
                ),
                draft: (
                  <span className="hk-draft">
                    <span className="hk-btn">{r.draft.checkout}</span>{' '}
                    <IdTag tone="bad">{r.draft.checkoutId}</IdTag>
                  </span>
                ),
                es: <span className="hk-btn">{r.es.checkout}</span>,
                ship: (
                  <>
                    <span className="hk-btn is-fallback">{r.es.renamed}</span>{' '}
                    <IdTag tone="fallback">en · {r.ids.renamed}</IdTag>
                  </>
                ),
              }}
            />
          </p>
        </div>
      </div>

      <div className="hk-status">
        <p className="hk-status-text" aria-live={pinned ? 'polite' : undefined}>
          {status[state]}
        </p>
      </div>
    </div>
  );
}

/** The pinned instance: its state is pushed from the scroll handler, so only
 * this small subtree re-renders, and only when the state actually changes. */
export function PinnedPreview({ control }: { control: RefObject<((s: PreviewState) => void) | null> }) {
  const [state, setState] = useState<PreviewState>('write');
  control.current = setState;
  return <Preview state={state} pinned className="is-pinned" />;
}
