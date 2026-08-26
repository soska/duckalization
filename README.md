# duckalization `__('')`

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

> **Working with an AI agent?** Point it at [`llms.txt`](./llms.txt) — a single
> self-contained reference covering the call-shape rules, every package's API,
> catalog translation instructions, and setup in a new project.

Content-addressed i18n tooling. The source-language text in your code is the
source of truth — there are no translation keys to invent, dedupe, or police.
IDs are derived from the message content itself.

```tsx
__('Sign in')                                  // ID = hash("Sign in")
__('Welcome back, {name}', { name })           // placeholders, not template exprs
__('Book', { context: 'verb' })                // disambiguate identical strings
__('Checkout', { id: 'checkout.cta' })         // explicit ID override (escape hatch)
__({ one: '{count} item', other: '{count} items' }, { count })
```

Because identity is content-derived:

- The same string used in many places is one catalog entry, translated once.
- Editing a message *is* a new ID — stale translations orphan themselves and
  the new text shows up as untranslated, no manual `_v2` renames.
- Duplicate-key drift is impossible by construction.

## Packages

| Package | Purpose |
| --- | --- |
| `@duckalization/id` | The hashing/canonicalization algorithm. Shared by everything that must agree on IDs. Treat as frozen. |
| `@duckalization/extract` | Scans source with [oxc](https://oxc.rs) and emits `locales/<locale>.json` (catalog) plus `<locale>.meta.json` (source refs + context for translation agents). Library-only; the `duckalize` bin lives in `@duckalization/cli`. |
| `@duckalization/runtime` | Tiny (~1.5 kB gzip) framework-agnostic client: catalog lookup with inline-source fallback, `Intl.PluralRules` plural selection, `{name}` interpolation, and compile-time placeholder checking via template-literal types. |
| `@duckalization/bundler-plugin` | [unplugin](https://unplugin.unjs.io) transform (Vite/Rollup/webpack/esbuild) that rewrites `__('msg')` → `__('msg', undefined, "<id>")` at build time, with sourcemaps. The runtime then never hashes and the hash function tree-shakes out of the bundle. Optional — apps behave identically without it. |
| `@duckalization/react` | Provider + hooks over `runtime`: `useDuck()` (subscribed `__` via `useSyncExternalStore`) and `useLocale()`. Re-exports `createDuck`, so it's the only dependency a React app needs. |
| `@duckalization/eslint-plugin` | Flat-config ESLint rule `no-unlocalized-strings`: flags hardcoded JSX text and human-facing attribute strings that would ship unlocalizable, each with a suggested `__()` wrap. Keyless IDs make the fix mechanical — there's no key to invent, the next `duckalize extract` just picks the string up. |
| `@duckalization/translate` | Catalog translation *workflow* — not a translator. Diffs source vs target, writes a self-contained brief for a human or agent, validates and merges the JSON they return, prunes stale IDs, records review metadata. The `duckalize translate` / `review` commands wrap this library. |
| `@duckalization/cli` | The `duckalize` bin: `extract`, `translate status/check/brief/apply/prune/lint`, `review status/approve`. |

### Translation workflow

`duckalize extract` writes the source catalog (`locales/en.json`). Target
catalogs (`locales/es.json`, …) are filled by a separate loop: duckalize
prepares the work, something else (an agent or a human) translates, then
duckalize checks and merges.

```bash
duckalize translate status        # es: 12/40 translated, 28 missing
duckalize translate brief         # → locales/.work/es.brief.json
# …translate the brief into es.out.json (any agent, or by hand)…
duckalize translate apply locales/.work/es.out.json --by claude
duckalize review status           # approved / machine / edited / unreviewed
duckalize review approve es --by armando
duckalize translate check         # CI: exit 1 while anything is missing
duckalize translate lint          # same checks as apply, on catalogs already on disk
duckalize translate prune         # archive + drop IDs no longer in the source
```

A **brief** is a JSON work order for one locale's *missing* entries. It
embeds the source strings, extractor context, a few call-site excerpts, the
glossary terms that appear in this batch, the style guide, and the locale's
real CLDR plural categories — so the translator does not need the repo.
Respond with `{ locale, translations, notes? }` using the brief's IDs
verbatim. `apply` rejects the whole file on hard errors (unknown ID, empty
string, plural-shape mismatch, invented `{placeholder}`, do-not-translate
term rewritten); warnings (dropped placeholder, unused approved glossary
term) still merge. `es.out.json` is a convention — `apply` reads whatever
path you pass.

Set `"targetLocales"` in `duckalization.config.json` or pass locales as
arguments. Optional `glossary` and `style` ride in every brief:

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

Terms with `"translate": false` (brand names like *Soundbite*) must appear
verbatim — a violating output is rejected wholesale. A locale's `style`
(inline or `.md`) is how you pin tone (tú vs. usted) as team config instead
of prompt luck.

**Review** is a sidecar (`locales/es.review.json`), not a second catalog.
`apply` records `machine` plus a hash of the translation. Hash drift after
that is `edited` (someone hand-tweaked the catalog). `review approve` is
sign-off. Because catalog IDs are content-derived, rewriting the English
source creates a new ID: the old translation becomes an orphan (`prune`
archives it) and the new string shows up as missing.

A partial target catalog is always safe to ship — missing IDs render the
inline source text.

### React usage

```tsx
// i18n.ts — module scope on the client, per-request on the server
import { createDuck } from '@duckalization/react';
export const duck = createDuck({ sourceLocale: 'en' });

// App.tsx
<DuckProvider duck={duck}>
  <App />
</DuckProvider>

// any component
function Header() {
  const { __ } = useDuck();               // re-renders on locale/catalog changes
  const [locale, setLocale] = useLocale();
  return <h1>{__('Sign in')}</h1>;
}
```

`useDuck` subscribes through `useSyncExternalStore`, so `setLocale` and lazy
`load` calls re-render exactly the components that translate. The destructured
`__` is the bare identifier `duckalize extract` scans for.

### Bundler plugin usage

```ts
// vite.config.ts
import DuckalizationPlugin from '@duckalization/bundler-plugin';

export default defineConfig({
  plugins: [DuckalizationPlugin.vite()],
});
```

The transform is idempotent (three-argument calls are left alone) and reuses
the extractor's parser, so injected IDs are byte-identical to extracted ones.
Unextractable calls surface as build warnings (`failOnError: true` upgrades
them to errors); `duckalize extract` remains the strict gate.

### Lint rule usage

```js
// eslint.config.js
import duckalization from '@duckalization/eslint-plugin';

export default [duckalization.configs.recommended]; // no-unlocalized-strings: warn
```

Flags hardcoded JSX text (`<Label>board</Label>`) and string values of
human-facing attributes (`placeholder`, `alt`, `title`, `label`, the `aria-*`
text attributes) — the strings `duckalize extract` can never see because they
were never wrapped. Machine-facing attributes (`className`, `id`, `href`,
`data-*`…) and letterless text (`·`, `42`, `&nbsp;`) are ignored, and the
attribute list is configurable (`attributes` replaces it, `additionalAttributes`
extends it for design-system props, `ignore` takes regexes).

Every report carries an editor suggestion with the complete fix —
`<Label>{__('board')}</Label>` — because keyless IDs mean there is no key to
invent. Applying suggestions across a legacy codebase is the migration story.

### Runtime usage

```ts
import { createDuck } from '@duckalization/runtime';

const duck = createDuck({ sourceLocale: 'en' });
export const { __ } = duck;              // the function the extractor scans for

duck.load('es', esCatalog);
duck.setLocale('es');

__('Sign in');                            // → 'Iniciar sesión'
__('Welcome back, {name}', { name });     // typed: forgetting `name` is a TS error
__({ one: '{count} item', other: '{count} items' }, { count });
```

Source-locale rendering never hashes or looks anything up — the string in the
code *is* the message. Missing translations fall back to the inline text and
fire the `onMissing` hook (dev default: warn once per entry). Servers create
one instance per request; `subscribe` is shaped for `useSyncExternalStore`.

## Usage

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

`targetLocales` is read by the translation workflow (or pass locales as CLI
arguments). `style` and `glossary` are optional; see [Translation workflow](#translation-workflow).

Any unextractable call (dynamic message, template expressions, malformed
plural, colliding IDs) is a hard error: diagnostics are printed with file:line
positions and nothing is written.

## Development

```bash
pnpm install
pnpm build       # tsdown, all packages
pnpm test        # vitest, runs against sources (no build needed)
pnpm typecheck
```
