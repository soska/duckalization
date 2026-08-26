# duckalization `__('')`

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

Write the source-language string in your code. That string is the message.
No translation keys. IDs are hashed from the text, so an agent can extract
catalogs, translate missing entries, and apply the result without anyone
inventing keys or renaming `_v2` strings.

This repo is built to be agent-operated. Point the agent at
[`llms.txt`](./llms.txt): call-shape rules, package APIs, how to translate a
brief, and how to wire a new app.

## Install

React (Node >= 20.19):

```bash
pnpm add @duckalization/react
pnpm add -D @duckalization/cli
```

Without React, install `@duckalization/runtime` instead of `react`.

```tsx
// i18n.ts — module scope on the client, per-request on the server
import { createDuck } from '@duckalization/react';
import es from '../locales/es.json'; // written by extract / apply

export const duck = createDuck({ sourceLocale: 'en' });
duck.load('es', es);

// App.tsx
<DuckProvider duck={duck}>
  <App />
</DuckProvider>

function Header() {
  const { __ } = useDuck();               // re-renders on locale/catalog changes
  const [locale, setLocale] = useLocale();
  return <h1>{__('Sign in')}</h1>;
}
```

Keep `__` a bare identifier. That is what `duckalize extract` scans for.

## Writing copy

```tsx
__('Sign in')                                  // ID = hash("Sign in")
__('Welcome back, {name}', { name })           // placeholders, not template exprs
__('Book', { context: 'verb' })                // disambiguate identical strings
__('Checkout', { id: 'checkout.cta' })         // only if you need a stable external ID
__({ one: '{count} item', other: '{count} items' }, { count })
```

The same string in many places is one catalog entry. Edit a message and it
gets a new ID: the old translation becomes an orphan, and the new text shows
up untranslated.

Source-locale rendering uses the inline string. Missing translations fall
back to that string too.

## Extract

```bash
duckalize extract            # writes locales/en.json + locales/en.meta.json
duckalize extract --dry-run  # report only
```

Optional `duckalization.config.json` in the project root:

```json
{
  "include": ["src/**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}"],
  "functions": ["__"],
  "outDir": "locales",
  "sourceLocale": "en",
  "targetLocales": ["es"]
}
```

Dynamic messages, template expressions, malformed plurals, and colliding IDs
are errors. Diagnostics include file:line; nothing is written.

## Translate

`duckalize` does not call a model. It writes a brief of missing entries;
an agent translates that JSON; `apply` validates and merges.

```bash
duckalize translate status        # es: 12/40 translated, 28 missing
duckalize translate brief         # → locales/.work/es.brief.json
# agent reads the brief, writes es.out.json
duckalize translate apply locales/.work/es.out.json --by claude
duckalize translate check         # CI: exit 1 while anything is missing
duckalize translate lint          # apply-time checks on catalogs already on disk
duckalize translate prune         # archive + drop IDs no longer in the source
duckalize review status           # approved / machine / edited / unreviewed
duckalize review approve es --by armando
```

A brief is a work order for one locale's missing entries: source strings,
extractor context, call-site excerpts, the glossary terms in this batch,
the style guide, and that locale's CLDR plural categories. The agent does
not need the repo. It returns `{ locale, translations, notes? }` using the
brief's IDs as-is.

`apply` rejects the file on hard errors (unknown ID, empty string, plural
shape, invented `{placeholder}`, do-not-translate term rewritten). Nothing
is written. Warnings (dropped placeholder, unused approved glossary term)
still merge. `es.out.json` is a convention; `apply` reads the path you pass.

Set `"targetLocales"` in config, or pass locales as arguments. Optional
`glossary` and `style`:

```json
{
  "targetLocales": ["es", "pt"],
  "style": {
    "*": "UI copy: concise, sentence case.",
    "es": "./locales/style/es.md"
  },
  "glossary": "locales/glossary.json"
}
```

Terms with `"translate": false` (brand names like *Tweet* or *Git*) must appear
verbatim or `apply` rejects the file. Per-locale `style` (inline or `.md`)
is how you pin tone (tú vs. usted) in config.

`review` is optional sign-off, stored in `locales/es.review.json`. `apply`
records `machine` and a hash of the translation. A later catalog edit that
does not match that hash shows up as `edited`. Rewriting the English source
creates a new ID: `prune` archives the orphan, and the new string is missing.

A partial target catalog is safe to ship. Missing IDs render the inline
source text.

## Packages

| Package | Purpose |
| --- | --- |
| `@duckalization/react` | Provider + hooks. The only runtime dependency a React app needs. |
| `@duckalization/runtime` | Same client, no React. Catalog lookup, plurals, `{name}` interpolation (~1.5 kB gzip). |
| `@duckalization/cli` | The `duckalize` bin: extract, translate, review. |
| `@duckalization/bundler-plugin` | Optional. Injects IDs at build time so the hash tree-shakes out of the bundle. |
| `@duckalization/eslint-plugin` | Optional. Flags JSX text and human-facing attributes that were never wrapped in `__()`. |
| `@duckalization/extract` | Library behind `duckalize extract`. Apps should not depend on this. |
| `@duckalization/translate` | Library behind `duckalize translate` / `review`. Apps should not depend on this. |
| `@duckalization/id` | Hashing algorithm. Transitive. Do not change it. |

## Development

```bash
pnpm install
pnpm build       # tsdown, all packages
pnpm test        # vitest, runs against sources (no build needed)
pnpm typecheck
```
