# @duckalization/translate

Library for duckalization's translation *workflow*. It does not call a model
and it does not invent copy. It diffs catalogs, writes a self-contained
brief, validates the JSON a translator returns, merges it, prunes orphans,
and records review metadata.

The `duckalize translate` and `duckalize review` commands in
[`@duckalization/cli`](../cli/README.md) are a thin wrapper around this package. App
projects should depend on the CLI. Import this package when you are embedding
the same checks in custom tooling.

## The loop

```
extract  →  source catalog + .meta.json
                ↓
status   →  which IDs are missing / orphaned in each target locale
brief    →  locales/.work/<locale>.brief.json   (work order, missing only)
                ↓
           translator (agent or human) → <locale>.out.json
                ↓
apply    →  validate → merge into locales/<locale>.json
           + write locales/<locale>.review.json
check    →  CI gate (exit 1 if anything is still missing)
lint     →  apply-time checks on catalogs already on disk
prune    →  archive orphans to locales/.archive/, then drop them
```

`review status` / `review approve` read and write the sidecar; they do not
translate. A **brief** is self-contained (source strings, call-site excerpts,
glossary subset, style guide, CLDR plural categories) so the translator does
not need the repo. `apply` rejects the whole file on hard errors; nothing is
written.

The brief's embedded `instructions` are the contract; [`llms.txt`](../../llms.txt)
§7 is the same material in prose. Glossary, style guides, and the
apply/review rules are also in the [root README](../../README.md#translation-workflow).

## Typical usage (CLI)

```bash
pnpm add -D @duckalization/cli
pnpm duckalize translate status
pnpm duckalize translate brief
pnpm duckalize translate apply locales/.work/es.out.json --by claude
```

Requires `"targetLocales"` in `duckalization.config.json` (or locales as CLI
arguments). `es.out.json` is a convention — `apply` reads whatever path you
pass.

## Library API

```bash
pnpm add -D @duckalization/translate
```

```ts
import {
  resolveTranslateConfig,
  translationStatus,
  buildBrief,
  writeBrief,
  applyOutput,
  lintLocale,
  pruneLocale,
  reviewOverview,
  approve,
} from '@duckalization/translate';

const config = await resolveTranslateConfig({ cwd: process.cwd() });
const brief = await buildBrief(config, 'es');
await writeBrief(config, brief);
const result = await applyOutput(config, output, { by: 'claude' });
// result.applied === 0 if any diagnostic is an error — nothing was written
```

MIT licensed.
