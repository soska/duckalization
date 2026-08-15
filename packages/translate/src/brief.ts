import fs from 'node:fs/promises';
import path from 'node:path';
import { metaPath, type TranslateConfig } from './config.js';
import { readJson, writeJsonSorted } from './fsio.js';
import { glossarySubset, loadGlossary } from './glossary.js';
import { loadSourceCatalog, localeStatus } from './status.js';
import type { Brief, BriefEntry, Catalog, CatalogMeta } from './types.js';

export const BRIEF_INSTRUCTIONS = `Translate every entry in "entries" into the target "locale".
Respond with ONLY a JSON object of this exact shape:
{ "locale": "<locale>", "translations": { "<id>": <translation>, ... },
  "notes": { "<id>": { "confidence": "low|medium|high", "alternatives": ["..."], "note": "..." } } }
Rules:
1. Copy IDs verbatim. Never invent, rename, or drop one. "notes" is optional but confidence is appreciated.
2. String entries stay strings; plural entries stay objects.
3. Preserve {placeholder} tokens exactly (same names, same braces). Reorder them freely for grammar.
4. Plural entries: produce the forms this locale needs (see "pluralCategories"); "other" is always required. You may output more or fewer forms than the source has.
5. Glossary: terms marked doNotTranslate must appear verbatim; use approvedTranslation where given; notes explain product meaning.
6. Follow the "style" guide for tone, register, and dialect.
7. Use "context", "refs", and "source" excerpts to resolve ambiguity.`;

function pluralCategories(locale: string): string[] {
  return [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories].sort();
}

/** Resolve a style entry: inline prose, or the contents of a .md file. */
async function resolveStyle(
  config: TranslateConfig,
  locale: string
): Promise<string | undefined> {
  const parts: string[] = [];
  for (const key of ['*', locale]) {
    const value = config.style[key];
    if (!value) continue;
    if (value.endsWith('.md')) {
      parts.push(await fs.readFile(path.resolve(config.cwd, value), 'utf8'));
    } else {
      parts.push(value);
    }
  }
  return parts.length > 0 ? parts.join('\n\n').trim() : undefined;
}

/** Read the code line each ref points at, so the brief is repo-independent. */
async function sourceExcerpts(
  config: TranslateConfig,
  refs: string[],
  fileCache: Map<string, string[] | null>
): Promise<string[]> {
  const excerpts: string[] = [];
  for (const ref of refs.slice(0, 3)) {
    const match = /^(.*):(\d+):(\d+)$/.exec(ref);
    if (!match) continue;
    const [, file, line] = match;
    let lines = fileCache.get(file!);
    if (lines === undefined) {
      lines = await fs
        .readFile(path.resolve(config.cwd, file!), 'utf8')
        .then((text) => text.split('\n'))
        .catch(() => null);
      fileCache.set(file!, lines);
    }
    const text = lines?.[Number(line) - 1]?.trim();
    if (text) excerpts.push(`${ref}: ${text.slice(0, 200)}`);
  }
  return excerpts;
}

export interface BriefOptions {
  /** Cap entries per brief (large catalogs → several passes). Default: all. */
  limit?: number;
}

/** Build the work order for one locale: its missing entries, fully equipped. */
export async function buildBrief(
  config: TranslateConfig,
  locale: string,
  options: BriefOptions = {}
): Promise<Brief> {
  const source = await loadSourceCatalog(config);
  const meta = (await readJson<CatalogMeta>(metaPath(config))) ?? {};
  const glossary = await loadGlossary(config);
  const status = await localeStatus(config, source, locale);

  const ids = options.limit ? status.missing.slice(0, options.limit) : status.missing;
  const fileCache = new Map<string, string[] | null>();

  const entries: BriefEntry[] = [];
  for (const id of ids) {
    const entryMeta = meta[id];
    const entry: BriefEntry = {
      id,
      message: source[id]!,
      refs: entryMeta?.refs ?? [],
    };
    if (entryMeta?.context !== undefined) entry.context = entryMeta.context;
    const excerpts = await sourceExcerpts(config, entry.refs, fileCache);
    if (excerpts.length > 0) entry.source = excerpts;
    entries.push(entry);
  }

  const brief: Brief = {
    locale,
    pluralCategories: pluralCategories(locale),
    instructions: BRIEF_INSTRUCTIONS,
    glossary: glossarySubset(glossary, locale, entries.map((e) => e.message)),
    entries,
  };
  const style = await resolveStyle(config, locale);
  if (style) brief.style = style;
  return brief;
}

/** Write a brief to `<workDir>/<locale>.brief.json`; returns the path. */
export async function writeBrief(
  config: TranslateConfig,
  brief: Brief
): Promise<string> {
  const briefPath = path.resolve(
    config.cwd,
    config.workDir,
    `${brief.locale}.brief.json`
  );
  await fs.mkdir(path.dirname(briefPath), { recursive: true });
  await fs.writeFile(briefPath, JSON.stringify(brief, null, 2) + '\n');
  return briefPath;
}
