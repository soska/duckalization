import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILENAME, defaultConfig as extractDefaults } from '@duckalization/extract';

export interface TranslateConfig {
  cwd: string;
  /** Directory holding catalogs, glossary, and workflow files. */
  outDir: string;
  sourceLocale: string;
  targetLocales: string[];
  /** Style guides: '*' for all locales plus per-locale entries. Values are
   * inline prose or a relative path to a markdown file (detected by `.md`). */
  style: Record<string, string>;
  /** Glossary path, relative to cwd. */
  glossaryFile: string;
  /** Where briefs are written. */
  workDir: string;
  /** Where pruned orphans are archived. */
  archiveDir: string;
}

export async function resolveTranslateConfig(
  overrides: Partial<TranslateConfig> = {},
  configPath?: string
): Promise<TranslateConfig> {
  const cwd = path.resolve(overrides.cwd ?? process.cwd());
  const filePath = configPath
    ? path.resolve(cwd, configPath)
    : path.join(cwd, CONFIG_FILENAME);

  let fromFile: Record<string, unknown> = {};
  try {
    fromFile = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    const notFound =
      error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (!notFound || configPath) {
      throw new Error(`Could not read config at ${filePath}: ${String(error)}`);
    }
  }

  const outDir =
    overrides.outDir ?? (fromFile.outDir as string) ?? extractDefaults.outDir;

  return {
    cwd,
    outDir,
    sourceLocale:
      overrides.sourceLocale ??
      (fromFile.sourceLocale as string) ??
      extractDefaults.sourceLocale,
    targetLocales:
      overrides.targetLocales ?? (fromFile.targetLocales as string[]) ?? [],
    style: overrides.style ?? (fromFile.style as Record<string, string>) ?? {},
    glossaryFile:
      overrides.glossaryFile ??
      (fromFile.glossary as string) ??
      path.join(outDir, 'glossary.json'),
    workDir: overrides.workDir ?? path.join(outDir, '.work'),
    archiveDir: overrides.archiveDir ?? path.join(outDir, '.archive'),
  };
}

export function catalogPath(config: TranslateConfig, locale: string): string {
  return path.resolve(config.cwd, config.outDir, `${locale}.json`);
}

export function metaPath(config: TranslateConfig): string {
  return path.resolve(config.cwd, config.outDir, `${config.sourceLocale}.meta.json`);
}

export function reviewPath(config: TranslateConfig, locale: string): string {
  return path.resolve(config.cwd, config.outDir, `${locale}.review.json`);
}
