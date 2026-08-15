import type { Message, PluralMessage } from '@duckalization/id';

/** A translation catalog: content-derived ID → translated message. */
export type Catalog = Record<string, Message>;

/** Reserved metadata keys the extractor reads; everything else is a value. */
export interface MetaOptions {
  /** Disambiguates identical source strings with different meanings. */
  context?: string;
  /** Explicit ID override — the escape hatch, not the default. */
  id?: string;
}

type ValueBag = Record<string, string | number | undefined>;

/**
 * Placeholder names appearing in a message literal, e.g.
 * PlaceholderNames<'Hi {name}, {n} left'> = 'name' | 'n'.
 * Non-literal strings produce never (no requirements) — the extractor
 * rejects dynamic messages anyway.
 */
export type PlaceholderNames<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? (Name extends `${string}{${string}` ? never : Name) | PlaceholderNames<Rest>
    : never;

/**
 * Options tuple for a string message: when the literal contains placeholders,
 * the options object is required and must provide each of them.
 */
export type StringCallArgs<S extends string> = [PlaceholderNames<S>] extends [never]
  ? [options?: MetaOptions & ValueBag, injectedId?: string]
  : [
      options: MetaOptions & { [K in PlaceholderNames<S>]: string | number } & ValueBag,
      injectedId?: string,
    ];

/** Plural calls must provide the count that selects the CLDR form. */
export type PluralCallArgs = [
  options: MetaOptions & { count: number } & ValueBag,
  injectedId?: string,
];

/**
 * The translate function. `injectedId` is the slot the bundler plugin fills
 * with a pre-baked ID — never written by hand (humans use `{ id }`).
 */
export interface TranslateFn {
  (message: PluralMessage, ...args: PluralCallArgs): string;
  <S extends string>(message: S, ...args: StringCallArgs<S>): string;
}

/** Called when the active locale has no translation for a message. */
export type MissingHandler = (id: string, message: Message, locale: string) => void;

export interface DuckConfig {
  /** Locale of the messages written in source code. Default: 'en'. */
  sourceLocale?: string;
  /** Initially active locale. Default: sourceLocale. */
  locale?: string;
  /** Missing-translation hook. Default warns once per entry outside production; pass false to silence. */
  onMissing?: MissingHandler | false;
}

export interface Duck {
  __: TranslateFn;
  /** Merge a catalog into a locale (repeat calls accumulate, e.g. lazy chunks). */
  load(locale: string, catalog: Catalog): void;
  setLocale(locale: string): void;
  getLocale(): string;
  /** Notifies on locale/catalog changes. Shaped for useSyncExternalStore. */
  subscribe(listener: () => void): () => void;
  /** Monotonic counter bumped on every locale/catalog change — the snapshot for useSyncExternalStore. */
  getVersion(): number;
}
