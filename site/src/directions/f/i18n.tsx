import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createDuck, messageId, useDuck, type Message } from '../../shared/real.ts';
import { ES_CATALOG } from './es.ts';
import extracted from './locales/en.json?raw';

/**
 * This page's copy is plain `__('…')` calls, so the real extractor reads it:
 * `locales/en.json` is written by
 *   node packages/cli/dist/cli.js extract --cwd site/src/directions/f
 * and the counter below is computed from that file and the Spanish catalog.
 */
export const SOURCE: Record<string, Message> = JSON.parse(extracted);
const SOURCE_IDS = Object.keys(SOURCE);
const TRANSLATED = new Set(Object.keys(ES_CATALOG));

export const coverage = {
  total: SOURCE_IDS.length,
  translated: SOURCE_IDS.filter((id) => TRANSLATED.has(id)).length,
};

/** One instance for the page. Fallbacks are shown visually, so no console warnings. */
export const duck = createDuck({ sourceLocale: 'en', onMissing: false });
duck.load('es', ES_CATALOG);

/** x-ray on/off, and whether a locale switch should animate (not on first paint). */
export const XrayContext = createContext(false);
export const SwapAnimationContext = createContext(false);

type Options = Record<string, unknown>;
type LooseTranslate = (message: Message, options?: Options) => string;

/** Delay of the swap wave: strings lower in the viewport arrive a little later. */
const WAVE_MS = 260;

function Str({ message, options }: { message: Message; options?: Options }) {
  const live = useDuck();
  const xray = useContext(XrayContext);
  const animate = useContext(SwapAnimationContext);
  const ref = useRef<HTMLSpanElement>(null);
  const locale = live.getLocale();
  const id = messageId(message, typeof options?.context === 'string' ? options.context : undefined);
  const missing = !TRANSLATED.has(id);
  const fellBack = missing && locale !== 'en';
  const tagged = xray && missing;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !animate) return;
    const { top, bottom } = el.getBoundingClientRect();
    const visible = bottom > 0 && top < window.innerHeight;
    if (!visible) {
      el.classList.remove('fk-swap');
      return;
    }
    el.style.animationDelay = `${Math.round((Math.max(0, top) / window.innerHeight) * WAVE_MS)}ms`;
  }, [locale, animate]);

  return (
    <span
      // Remount on locale change so the CSS entrance runs per string.
      key={locale}
      ref={ref}
      className={animate ? 'fk-s fk-swap' : 'fk-s'}
      data-missing={tagged ? '' : undefined}
      lang={fellBack ? 'en' : undefined}
    >
      {/* The tag lives inside the string's own box (stacked above the text),
          so it can never cover a neighbouring line. */}
      {tagged && (
        <span className="fk-tag" aria-hidden="true">
          en · {id}
        </span>
      )}
      <span className="fk-t">{(live.__ as LooseTranslate)(message, options)}</span>
    </span>
  );
}

/**
 * `__` renders a translated, x-ray-aware span; `__s` returns a plain string
 * for attributes. Both go through the real runtime. Destructure them as bare
 * identifiers so the extractor sees every call (functions: ["__", "__s"]).
 */
export function useT() {
  const live = useDuck();
  return {
    __: (message: Message, options?: Options): ReactNode => <Str message={message} options={options} />,
    __s: (message: Message, options?: Options): string => (live.__ as LooseTranslate)(message, options),
  };
}
