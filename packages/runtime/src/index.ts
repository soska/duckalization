import {
  messageId,
  type Message,
  type PluralForm,
  type PluralMessage,
} from '@duckalization/id';
import { interpolate } from './interpolate.js';
import type {
  Catalog,
  Duck,
  DuckConfig,
  MissingHandler,
  TranslateFn,
} from './types.js';

export { interpolate } from './interpolate.js';
export type * from './types.js';
export type { Message, PluralForm, PluralMessage } from '@duckalization/id';

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function pluralRules(locale: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

function pickPluralForm(
  plural: PluralMessage,
  count: number | undefined,
  locale: string
): string {
  if (count !== undefined) {
    const form = pluralRules(locale).select(count) as PluralForm;
    const picked = plural[form];
    if (picked !== undefined) return picked;
  }
  return plural.other ?? '';
}

const isDev =
  typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

function makeDefaultOnMissing(): MissingHandler {
  const warned = new Set<string>();
  return (id, message, locale) => {
    if (!isDev || warned.has(`${locale}:${id}`)) return;
    warned.add(`${locale}:${id}`);
    const preview = typeof message === 'string' ? message : (message.other ?? id);
    console.warn(`[duckalization] No ${locale} translation for "${preview}" (${id})`);
  };
}

/**
 * Create an isolated i18n instance. Client apps typically create one at module
 * scope and re-export its bound `__`; servers create one per request so
 * concurrent renders in different locales never share mutable state.
 */
export function createDuck(config: DuckConfig = {}): Duck {
  const sourceLocale = config.sourceLocale ?? 'en';
  const onMissing =
    config.onMissing === false
      ? undefined
      : (config.onMissing ?? makeDefaultOnMissing());

  let locale = config.locale ?? sourceLocale;
  const catalogs = new Map<string, Catalog>();
  const listeners = new Set<() => void>();

  // Memoized hashing for the hot path (plain string, no context). Plural
  // objects and context calls hash directly — still ~sub-microsecond.
  const idCache = new Map<string, string>();
  const resolveId = (message: Message, context: string | undefined): string => {
    if (typeof message !== 'string' || context !== undefined) {
      return messageId(message, context);
    }
    let id = idCache.get(message);
    if (id === undefined) {
      id = messageId(message);
      idCache.set(message, id);
    }
    return id;
  };

  /** Exact locale first, then its base language ('es-MX' → 'es'). */
  const lookup = (id: string): Message | undefined => {
    const exact = catalogs.get(locale)?.[id];
    if (exact !== undefined) return exact;
    const base = locale.split('-')[0]!;
    return base === locale ? undefined : catalogs.get(base)?.[id];
  };

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const translate = (
    message: Message,
    options?: Record<string, unknown>,
    injectedId?: string
  ): string => {
    let resolved = message;

    // Source locale is the fast path: the code already contains the text.
    if (locale !== sourceLocale) {
      const context =
        typeof options?.context === 'string' ? options.context : undefined;
      const explicitId = typeof options?.id === 'string' ? options.id : undefined;
      const id = injectedId ?? explicitId ?? resolveId(message, context);

      const translated = lookup(id);
      if (translated === undefined) {
        onMissing?.(id, message, locale);
      } else {
        resolved = translated;
      }
    }

    const count =
      typeof options?.count === 'number' ? options.count : undefined;
    const text =
      typeof resolved === 'string'
        ? resolved
        : pickPluralForm(resolved, count, locale);
    return interpolate(text, options);
  };

  return {
    __: translate as TranslateFn,
    load(target, catalog) {
      const existing = catalogs.get(target);
      catalogs.set(target, existing ? { ...existing, ...catalog } : { ...catalog });
      notify();
    },
    setLocale(next) {
      if (next === locale) return;
      locale = next;
      notify();
    },
    getLocale() {
      return locale;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
