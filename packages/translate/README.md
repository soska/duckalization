# @duckalization/translate

Library for duckalization's translation workflow. It does not call a model
and it does not invent copy. It diffs catalogs, writes a brief, validates
the JSON an agent returns, merges it, prunes orphans, and records review
metadata.

This is the library behind `duckalize translate` and `duckalize review`.
Apps should depend on
[`@duckalization/cli`](https://www.npmjs.com/package/@duckalization/cli).
Import this package when embedding the same checks in custom tooling.

The brief's embedded `instructions` are the contract;
[`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt)
section 7 is the same material in prose.

## The loop

```
extract  →  source catalog + .meta.json
                ↓
status   →  which IDs are missing / orphaned in each target locale
brief    →  locales/.work/<locale>.brief.json   (work order, missing only)
                ↓
           agent translates the brief → <locale>.out.json
                ↓
apply    →  validate → merge into locales/<locale>.json
           + write locales/<locale>.review.json
check    →  CI gate (exit 1 if anything is still missing)
lint     →  apply-time checks on catalogs already on disk
prune    →  archive orphans to locales/.archive/, then drop them
```

`glossary review` records per-locale sign-off on glossary terms in
`locales/<locale>.glossary-review.json`; the CLI blocks `brief` and `apply`
while any term is new or changed. `glossary invalidate <term>` drops the
review record of every entry whose English source uses the term. The library
functions (`buildBrief`, `applyOutput`) are not gated — call
`glossaryReview()` yourself.

`review status` / `review approve` read and write the sidecar; they do not
translate. A brief includes source strings, call-site excerpts, the glossary
subset, the style guide, and CLDR plural categories, so the agent does not
need the repo. `apply` rejects the whole file on hard errors; nothing is
written.

## CLI

```bash
pnpm add -D @duckalization/cli
pnpm duckalize translate status
pnpm duckalize translate brief
pnpm duckalize translate apply locales/.work/es.out.json --by claude
```

Requires `"targetLocales"` in `duckalization.config.json` (or locales as CLI
arguments). `es.out.json` is a convention; `apply` reads whatever path you
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
  glossaryReview,
  approveGlossary,
  invalidateTerm,
} from '@duckalization/translate';

const config = await resolveTranslateConfig({ cwd: process.cwd() });
const brief = await buildBrief(config, 'es');
await writeBrief(config, brief);
const result = await applyOutput(config, output, { by: 'claude' });
// result.applied === 0 if any diagnostic is an error; nothing was written
```

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
