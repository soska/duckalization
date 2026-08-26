# @duckalization/translate

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

Translation workflow primitives for duckalization.

Provides deterministic status diffing, self-contained agent translation briefs, validated apply, orphan pruning, translation linting, and review metadata helpers. This is the library package used by `@duckalization/cli`.

## Install

```bash
pnpm add -D @duckalization/translate
```

## Typical usage

Most projects should use the CLI:

```bash
pnpm add -D @duckalization/cli
pnpm duckalize translate status
pnpm duckalize translate brief
pnpm duckalize translate apply locales/.work/es.out.json --by claude
```

Use this package directly when embedding translation workflow checks in custom tooling.

MIT licensed.
