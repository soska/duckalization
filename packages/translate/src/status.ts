import { catalogPath, type TranslateConfig } from './config.js';
import { readJson } from './fsio.js';
import type { Catalog, LocaleStatus } from './types.js';

export async function loadSourceCatalog(
  config: TranslateConfig
): Promise<Catalog> {
  const catalog = await readJson<Catalog>(
    catalogPath(config, config.sourceLocale)
  );
  if (!catalog) {
    throw new Error(
      `Source catalog not found at ${catalogPath(config, config.sourceLocale)}. Run \`duckalize extract\` first.`
    );
  }
  return catalog;
}

export async function localeStatus(
  config: TranslateConfig,
  source: Catalog,
  locale: string
): Promise<LocaleStatus> {
  const target = (await readJson<Catalog>(catalogPath(config, locale))) ?? {};
  const sourceIds = Object.keys(source);
  const missing = sourceIds.filter((id) => target[id] === undefined).sort();
  const orphaned = Object.keys(target)
    .filter((id) => source[id] === undefined)
    .sort();
  return {
    locale,
    total: sourceIds.length,
    translated: sourceIds.length - missing.length,
    missing,
    orphaned,
  };
}

export async function translationStatus(
  config: TranslateConfig,
  locales?: string[]
): Promise<LocaleStatus[]> {
  const source = await loadSourceCatalog(config);
  const targets = locales?.length ? locales : config.targetLocales;
  return Promise.all(
    targets.map((locale) => localeStatus(config, source, locale))
  );
}
