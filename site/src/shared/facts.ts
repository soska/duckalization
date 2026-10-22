/**
 * Everything the landing pages claim, in one place. Each value is either
 * copied from the repo (README, llms.txt, source) or captured from a real
 * `duckalize` run on the demo component below (CLI 0.1.0, NO_COLOR=1).
 * Directions import from here instead of writing their own copy of the facts.
 */

export const REPO_URL = 'https://github.com/soska/duckalization';
export const LLMS_URL = 'https://github.com/soska/duckalization/blob/main/llms.txt';
export const VERSION = '0.1.0';
export const LICENSE = 'MIT';
export const NODE_REQUIREMENT = 'Node >= 20.19';

export const INSTALL = {
  react: 'pnpm add @duckalization/react',
  cli: 'pnpm add -D @duckalization/cli',
} as const;

/** Measured: packages/runtime/dist/index.js is 1,574 bytes gzip -9 (README says ~1.5 kB). */
export const RUNTIME_GZIP = '~1.5 kB gzip';

/** The demo component every direction uses, verbatim. */
export const DEMO_SOURCE = `import { useDuck } from '@duckalization/react';
export function Cart({ name, count }: { name: string; count: number }) {
  const { __ } = useDuck();
  return (
    <section>
      <h1>{__('Welcome back, {name}', { name })}</h1>
      <p>{__({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count })}</p>
      <button>{__('Checkout')}</button>
    </section>
  );
}`;

/** The three messages and their real IDs (messageId from @duckalization/id). */
export const MESSAGES = {
  welcome: { id: '105cueagvb5', message: 'Welcome back, {name}', ref: 'src/Cart.tsx:6:12' },
  items: {
    id: '70z5uwb2of',
    message: { one: '{count} item in your cart', other: '{count} items in your cart' },
    ref: 'src/Cart.tsx:7:11',
  },
  checkout: { id: 'ak3j7ue6c3', message: 'Checkout', ref: 'src/Cart.tsx:8:16' },
} as const;

/** locales/en.json as written by `duckalize extract`. */
export const SOURCE_CATALOG = {
  '105cueagvb5': 'Welcome back, {name}',
  '70z5uwb2of': { one: '{count} item in your cart', other: '{count} items in your cart' },
  ak3j7ue6c3: 'Checkout',
};

/** locales/es.json after a valid `translate apply`. Spanish needs a "many" form. */
export const ES_CATALOG = {
  '105cueagvb5': 'Hola de nuevo, {name}',
  '70z5uwb2of': {
    one: '{count} artículo en tu carrito',
    many: '{count} de artículos en tu carrito',
    other: '{count} artículos en tu carrito',
  },
  ak3j7ue6c3: 'Pagar',
};

/** One entry of locales/.work/es.brief.json, verbatim. */
export const BRIEF_ENTRY = {
  id: '105cueagvb5',
  message: 'Welcome back, {name}',
  refs: ['src/Cart.tsx:6:12'],
  source: ["src/Cart.tsx:6:12: <h1>{__('Welcome back, {name}', { name })}</h1>"],
};

/** Top-level fields of a brief (types.ts `Brief`). */
export const BRIEF_FIELDS = ['locale', 'pluralCategories', 'instructions', 'style', 'glossary', 'entries'] as const;
export const ES_PLURAL_CATEGORIES = ['many', 'one', 'other'];

/** Real terminal lines, in order. `kind` drives styling only. */
export type TermLine = { kind: 'cmd' | 'ok' | 'err' | 'warn' | 'info' | 'out'; text: string };

export const TRANSCRIPT: Record<'extract' | 'status' | 'brief' | 'rejected' | 'rejectedPlural' | 'applied' | 'check', TermLine[]> = {
  extract: [
    { kind: 'cmd', text: 'duckalize extract' },
    { kind: 'ok', text: '✓ 3 unique messages from 3 calls in 1 file (5ms) → locales/en.json' },
  ],
  status: [
    { kind: 'cmd', text: 'duckalize translate status' },
    { kind: 'out', text: 'es: 0/3 translated, 3 missing' },
  ],
  brief: [
    { kind: 'cmd', text: 'duckalize translate brief' },
    { kind: 'out', text: 'es: 3 entries → locales/.work/es.brief.json' },
    { kind: 'info', text: 'Translate each brief per its "instructions", then: duckalize translate apply <output.json>' },
  ],
  rejected: [
    { kind: 'cmd', text: 'duckalize translate apply es.out.json' },
    { kind: 'err', text: 'error[unknown-placeholder] 105cueagvb5 — placeholder {nombre} does not exist in the source message' },
    { kind: 'warn', text: 'warning[missing-placeholder] 105cueagvb5 — source placeholder {name} is absent from the translation' },
    { kind: 'err', text: 'error[unknown-id] zzz123 — ID does not exist in the source catalog' },
    { kind: 'err', text: '✗ es: rejected — nothing written.' },
  ],
  rejectedPlural: [
    { kind: 'cmd', text: 'duckalize translate apply es.out.json' },
    { kind: 'err', text: 'error[missing-other] 70z5uwb2of — plural translations must include the "other" form' },
    { kind: 'err', text: 'error[empty-translation] ak3j7ue6c3 — translation is empty' },
    { kind: 'err', text: '✗ es: rejected — nothing written.' },
  ],
  applied: [
    { kind: 'cmd', text: 'duckalize translate apply es.out.json --by claude' },
    { kind: 'ok', text: '✓ es: 3 entries applied → locales/es.json' },
  ],
  check: [
    { kind: 'cmd', text: 'duckalize translate check' },
    { kind: 'out', text: 'es: 3/3 translated, complete' },
  ],
};

/** The rejected agent outputs that produced TRANSCRIPT.rejected / rejectedPlural. */
export const BAD_OUTPUTS = {
  rejected: {
    locale: 'es',
    translations: { '105cueagvb5': 'Hola de nuevo, {nombre}', zzz123: 'Pagar' },
  },
  rejectedPlural: {
    locale: 'es',
    translations: {
      '105cueagvb5': 'Hola de nuevo, {name}',
      '70z5uwb2of': { one: '{count} artículo' },
      ak3j7ue6c3: '',
    },
  },
};

/** apply's diagnostic codes (translate/src/types.ts + llms.txt). Errors reject the whole file. */
export const APPLY_ERRORS = [
  'unknown-id',
  'type-mismatch',
  'empty-translation',
  'missing-other',
  'invalid-plural-form',
  'unknown-placeholder',
  'glossary-dnt',
] as const;
export const APPLY_WARNINGS = ['missing-placeholder', 'unexpected-plural-form', 'glossary-term', 'orphaned-id'] as const;

/** Extraction errors (extract/src/types.ts). Any error → nothing written. */
export const EXTRACT_ERRORS = [
  'parse-error',
  'dynamic-message',
  'template-expressions',
  'empty-message',
  'invalid-plural',
  'invalid-meta',
  'id-collision',
] as const;

/** The only four valid call shapes (llms.txt §1), plus the explicit-ID escape hatch. */
export const CALL_SHAPES = [
  "__('Sign in')",
  "__('Welcome back, {name}', { name })",
  "__('Book', { context: 'verb' })",
  "__({ one: '{count} item', other: '{count} items' }, { count })",
] as const;

/** Verifiable one-liners. Quote these; don't paraphrase them into bigger claims. */
export const CLAIMS = {
  noKeys: 'No translation keys. IDs are hashed from the text.',
  noModel: '`duckalize` does not call a model.',
  rejectAll: 'Errors reject the whole file; nothing is written.',
  fallback: 'Missing IDs render the inline source text.',
  partialShips: 'A partial target catalog is safe to ship.',
  dedupe: 'The same string in many places is one catalog entry.',
  editOrphans: 'Edit a message and it gets a new ID: the old translation becomes an orphan.',
  selfContained: 'The brief is self-contained: the translating agent needs no repo access.',
  duckFace: "Squint at an empty call — __('') — and it's a duck face.",
} as const;

/** Packages table (README). */
export const PACKAGES = [
  ['@duckalization/react', 'Provider + hooks. The only runtime dependency a React app needs.'],
  ['@duckalization/runtime', 'Same client, no React. Catalog lookup, plurals, {name} interpolation (~1.5 kB gzip).'],
  ['@duckalization/cli', 'The duckalize bin: extract, translate, review, glossary.'],
  ['@duckalization/bundler-plugin', 'Optional. Injects IDs at build time so the hash tree-shakes out of the bundle.'],
  ['@duckalization/eslint-plugin', 'Optional. Flags JSX text and human-facing attributes never wrapped in __().'],
] as const;

/** The five beats every page tells, in this order. */
export const STORY = [
  { key: 'write', title: 'Write English inline', body: 'The string in your code is the message. Nothing else changes.' },
  { key: 'extract', title: 'Extract a brief', body: 'The CLI hashes each string into an ID and writes a self-contained work order for an agent.' },
  { key: 'translate', title: 'Any agent translates', body: 'The CLI never calls a model. Bring whichever agent you like.' },
  { key: 'validate', title: 'Code checks the work', body: 'Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.' },
  { key: 'ship', title: 'Ship a partial catalog', body: 'Missing translations fall back to the inline English.' },
] as const;
