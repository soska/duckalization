# @duckalization/extract

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

Source extractor for duckalization.

Scans JavaScript/TypeScript source for translation calls like `__('Sign in')`, computes content-derived IDs, and writes catalog plus metadata files. This is the library package; the `duckalize` executable lives in `@duckalization/cli`.

## Install

```bash
pnpm add -D @duckalization/extract
```

## Typical usage

Most projects should use the CLI:

```bash
pnpm add -D @duckalization/cli
pnpm duckalize extract
```

Use this package directly when embedding extraction in custom tooling.

MIT licensed.
