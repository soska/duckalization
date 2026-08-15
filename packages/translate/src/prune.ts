import path from 'node:path';
import { catalogPath, reviewPath, type TranslateConfig } from './config.js';
import { readJson, writeJsonSorted } from './fsio.js';
import { loadSourceCatalog, localeStatus } from './status.js';
import type { Catalog, ReviewSidecar } from './types.js';

export interface PruneResult {
  locale: string;
  removed: string[];
  archivePath?: string;
}

/**
 * Remove orphaned IDs (present in the target, absent from the source) from a
 * locale's catalog and review sidecar, archiving the removed translations
 * first — cheap insurance, and future translation memory.
 */
export async function pruneLocale(
  config: TranslateConfig,
  locale: string
): Promise<PruneResult> {
  const source = await loadSourceCatalog(config);
  const status = await localeStatus(config, source, locale);
  if (status.orphaned.length === 0) {
    return { locale, removed: [] };
  }

  const targetPath = catalogPath(config, locale);
  const catalog = (await readJson<Catalog>(targetPath)) ?? {};
  const sidecarPath = reviewPath(config, locale);
  const sidecar = await readJson<ReviewSidecar>(sidecarPath);

  const archivePath = path.resolve(config.cwd, config.archiveDir, `${locale}.json`);
  const archive = (await readJson<Catalog>(archivePath)) ?? {};

  for (const id of status.orphaned) {
    archive[id] = catalog[id]!;
    delete catalog[id];
    if (sidecar) delete sidecar[id];
  }

  await writeJsonSorted(archivePath, archive);
  await writeJsonSorted(targetPath, catalog);
  if (sidecar) await writeJsonSorted(sidecarPath, sidecar);

  return { locale, removed: status.orphaned, archivePath };
}
