# @duckalization/cli

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

The `duckalize` command line tool.

Includes extraction, translation workflow, validation, pruning, linting, and review commands for duckalization catalogs.

## Install

```bash
pnpm add -D @duckalization/cli
```

## Usage

```bash
pnpm duckalize extract
pnpm duckalize translate status
pnpm duckalize translate brief
pnpm duckalize translate apply locales/.work/es.out.json --by claude
pnpm duckalize translate check
pnpm duckalize review status
pnpm duckalize review approve es --by armando
```

Run help:

```bash
pnpm duckalize --help
```

MIT licensed.
