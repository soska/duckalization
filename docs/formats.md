# Catalog file formats

These are the files duckalization reads and writes. They form a stable
contract, so tools that aren't JavaScript can produce or consume them: an
external extractor (Rust, Go, …), a CI check that doesn't run Node, or a
runtime in another language.

All files are UTF-8 JSON. Files written by `duckalize` sort their top-level
keys and use two-space indentation so diffs stay readable. Readers must not
depend on key order or whitespace.

Paths below use the defaults: `outDir` = `locales`, `sourceLocale` = `en`.

| File | Written by | Contract |
| --- | --- | --- |
| `locales/en.json` | extractor | **stable**: source catalog |
| `locales/en.meta.json` | extractor | **stable**: per-ID context for translators |
| `locales/<locale>.json` | `translate apply`, humans | **stable**: target catalog |
| `locales/glossary.json` | humans | **stable**: terminology |
| `locales/<locale>.review.json` | `apply`, `review approve` | stable to read, `duckalize` writes it |
| `locales/<locale>.glossary-review.json` | `glossary review --approve` | opaque: only `duckalize` reads or writes it |
| `locales/.work/<locale>.brief.json` | `translate brief` | input for translation agents, not committed |
| `locales/.archive/<locale>.json` | `translate prune` | same shape as a target catalog |

## Messages

A **message** is a string or a plural object:

```json
"Welcome back, {name}"
{ "one": "{count} item", "other": "{count} items" }
```

- Plural keys are CLDR categories (`zero`, `one`, `two`, `few`, `many`,
  `other`). `other` is required.
- `{name}` is a placeholder: ASCII letters, digits and `_` inside braces.
  At runtime it's replaced by the value passed under that name. `{count}`
  also selects the plural form.
- An empty string is never a valid message.

## IDs

Every catalog key is an ID. It is either:

- **content-derived**: `messageId(message, context)` as defined in
  [`@duckalization/id` SPEC.md](../packages/id/SPEC.md). Conformance vectors
  are in `packages/id/test-vectors.json`. This is the default and what the
  runtime computes when it looks up a call that has no injected ID; or
- **explicit**: an arbitrary string chosen at the call site (`{ id: "checkout.cta" }`).
  It must be marked `"explicitId": true` in the meta sidecar.

Changing a message's text changes its ID. The old translation then becomes
an orphan and the new text shows up as missing. This is how stale
translations get detected.

## `locales/en.json`: source catalog

A flat map of ID to source message. It holds every message in the app, and
nothing else.

```json
{
  "105cueagvb5": "Welcome back, {name}",
  "rmk6ltnbut": "Book",
  "checkout.cta": "Checkout",
  "11s4ejf8ldk": { "one": "{count} item", "other": "{count} items" }
}
```

## `locales/en.meta.json`: source sidecar

One entry per ID in `en.json`. It must have exactly the same set of keys.

```json
{
  "rmk6ltnbut": {
    "message": "Book",
    "context": "verb",
    "refs": ["src/booking.rs:41:17"]
  },
  "checkout.cta": {
    "message": "Checkout",
    "explicitId": true,
    "refs": ["src/cart.ts:5:18"]
  }
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `message` | yes | Same message as in `en.json` (plural key order may differ) |
| `context` | no | Disambiguation string that was hashed into the ID. Non-empty when present |
| `explicitId` | no | `true` when the ID is an explicit override, not `messageId(...)` |
| `refs` | yes | Call sites as `path:line:column`. The path is relative to the project root, line and column are 1-based. May be empty |

`translate brief` reads the source line at each of the first three refs and
includes it in the brief. Any text file works, `.rs` included. A ref that
doesn't parse, or points to a missing file, is skipped.

## Using an external extractor

For a project that isn't JavaScript, let your own tool write `en.json` and
`en.meta.json`, and tell duckalization it doesn't own them:

```json
{ "extractor": "external", "targetLocales": ["es-MX"] }
```

With that setting, `duckalize extract` scans nothing and writes nothing. It
checks the existing catalog against this contract and exits 1 on any of
these errors:

- `missing-catalog`: either file is absent
- `invalid-catalog`: a file is malformed, or a value isn't a message
- `empty-message` / `invalid-plural`: a malformed message
- `meta-mismatch`: the two files disagree (missing, extra, or different
  entries)
- `invalid-meta`: a bad `context`, `refs`, or `explicitId`
- `id-mismatch`: an ID that is neither `messageId(message, context)` nor
  marked `explicitId`

Run it in CI after your extractor. Every `translate`, `review` and `glossary`
command works unchanged on top of it. `writeOutputs()` from
`@duckalization/extract` throws in this mode, so nothing programmatic can
overwrite the catalog either.

## `locales/<locale>.json`: target catalog

The same shape as `en.json`, with translations as values. It may be partial.

- An ID present in `en.json` but absent here is **missing**. The runtime
  falls back to the source text, and `translate check` fails.
- An ID present here but absent from `en.json` is **orphaned**: stale, and
  ignored by the runtime. `translate prune` moves it to
  `locales/.archive/<locale>.json`.
- A translation of a string is a string. A translation of a plural object is
  a plural object, and it carries the forms the *target* locale uses, which
  can be more or fewer than the source has.
- Placeholders must be names that exist in the source message.

A check that doesn't use Node, such as a Rust test, can reimplement
`translate check` as "every key of `en.json` is a key of `<locale>.json`".

## `locales/glossary.json`

```json
{
  "Tweet": { "translate": false, "note": "Product name" },
  "assignment": {
    "note": "A homework unit a teacher assigns",
    "translations": { "es": "tarea", "es-MX": "asignación", "pt": "tarefa" }
  },
  "due": { "translations": { "es": ["vence", "fecha de vencimiento"] } }
}
```

`translate: false` means the term must appear verbatim in every translation.
A value in `translations` can be one rendering or a list of acceptable
renderings.

## `locales/<locale>.review.json`

Review state per ID. `duckalize` writes it. Other tools may read it.

```json
{
  "rmk6ltnbut": {
    "status": "machine",
    "translatedHash": "bgtsqajol4",
    "by": "claude",
    "at": "2026-10-16",
    "confidence": "high"
  }
}
```

`status` is `machine` or `approved`. `translatedHash` is
`messageId(translation)`, computed with no context. If it no longer matches
the current translation, someone edited the translation by hand, and it is
reported as `edited`. An ID in the catalog without an entry here is
`unreviewed`.

## Locales

Locale codes are BCP 47 tags (`es`, `es-MX`, `pt-BR`, `zh-Hant`), with a
hyphen and not an underscore. Each one is passed to `Intl.PluralRules`. The
code is also the filename, as in `locales/es-MX.json`.

A regional locale has its **own complete catalog**, and `translate status` /
`check` / `brief` treat `es-MX` independently of `es`. It does inherit some
per-language settings from its base language, which is the part before the
first `-`:

| Setting | `es-MX` resolves to |
| --- | --- |
| `style` in config | `style["*"]`, then `style.es`, then `style["es-MX"]`, all of them concatenated |
| glossary `translations` | `translations["es-MX"]` if present, else `translations.es` |
| glossary sign-off | tracked separately for `es-MX`, and changes to the `es` translation re-block it |
| plural categories | `Intl.PluralRules("es-MX")` |
| runtime lookup | `es-MX` catalog first, then the `es` catalog, then the source text |

The runtime fallback means you can ship `es` alone and set the locale to
`es-MX`. You can also ship an `es-MX` catalog that overrides a few strings on
top of `es`, but `translate status es-MX` will still count every string that
isn't in `es-MX.json` as missing.

Script subtags fall back the same way: `zh-Hant` falls back to `zh`. If
that's wrong for your app (Traditional and Simplified Chinese differ), give
the locale its own style and glossary entries.
