# duckalization

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
| `@duckalization/extract` | Scans source with [oxc](https://oxc.rs) and emits `locales/<locale>.json` (catalog) plus `<locale>.meta.json` (source refs + context for translation agents). Ships the `duckalize` CLI. |
| `@duckalization/runtime` | Tiny (~1.5 kB gzip) framework-agnostic client: catalog lookup with inline-source fallback, `Intl.PluralRules` plural selection, `{name}` interpolation, and compile-time placeholder checking via template-literal types. |
| `@duckalization/bundler-plugin` | [unplugin](https://unplugin.unjs.io) transform (Vite/Rollup/webpack/esbuild) that rewrites `__('msg')` → `__('msg', undefined, "<id>")` at build time, with sourcemaps. The runtime then never hashes and the hash function tree-shakes out of the bundle. Optional — apps behave identically without it. |
| `@duckalization/react` | Provider + hooks over `runtime`: `useDuck()` (subscribed `__` via `useSyncExternalStore`) and `useLocale()`. Re-exports `createDuck`, so it's the only dependency a React app needs. |
| `@duckalization/translate` | The deterministic half of agent-driven translation: status diffing, self-contained work-order briefs (glossary subset + style guide + source excerpts), hard validation on apply (placeholders, plural shape per locale, do-not-translate terms), orphan pruning with archive, and review metadata. |
| `@duckalization/cli` | The `duckalize` bin: `extract`, `translate status/check/brief/apply/prune/lint`, `review status/approve`. |

### Translation workflow

```bash
duckalize translate status        # es: 12/40 translated, 28 missing
duckalize translate brief         # → locales/.work/es.brief.json (self-contained)
# …any agent translates the brief into es.out.json…
duckalize translate apply locales/.work/es.out.json --by claude
duckalize review status           # approved / machine / edited / unreviewed
duckalize review approve es --by armando
duckalize translate check         # CI gate: exit 1 while translations are missing
```

Glossary terms marked `"translate": false` (brand names like *Soundbite*) are
enforced verbatim at apply time — a violating output is rejected wholesale.
Per-locale `style` guides (inline or `.md`) ride along in every brief, so tone
(tú vs. usted, casual vs. formal) is team configuration, not per-prompt luck.
Review state is keyed by content-derived ID and content-hashed, so it
self-invalidates on rewording and detects hand edits.

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
  "sourceLocale": "en"
}
```

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
