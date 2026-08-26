# @duckalization/cli

The `duckalize` binary: extract catalogs, run the translation workflow, lint,
prune, and record review.

This is the package app projects should install. Translation is agent-operated:
`brief` writes a work order, an agent returns JSON, `apply` validates and
merges. Point the agent at
[`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).

```bash
pnpm add -D @duckalization/cli
```

Set `"targetLocales"` in `duckalization.config.json`, or pass locales as
arguments.

```bash
pnpm duckalize extract
pnpm duckalize translate status
pnpm duckalize translate brief
pnpm duckalize translate apply locales/.work/es.out.json --by claude
pnpm duckalize translate check
pnpm duckalize review status
pnpm duckalize review approve es --by armando
pnpm duckalize --help
```

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
