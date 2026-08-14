# duckalization

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

Planned: `runtime` (client `__()` with memoized hashing), `bundler-plugin`
(unplugin transform that pre-bakes IDs at build time so no hashing ships to
the client), `translate` (agent-driven translation of missing entries).

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
