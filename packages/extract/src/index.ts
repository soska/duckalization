import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCatalog } from './catalog.js';
import { resolveConfig, type ExtractConfig } from './config.js';
import { extractFromSource } from './parse.js';
import { scanFiles } from './scan.js';
import type { Diagnostic, ExtractResult, MessageEntry } from './types.js';

export { resolveConfig, defaultConfig, CONFIG_FILENAME } from './config.js';
export type { ExtractConfig } from './config.js';
export { extractFromSource } from './parse.js';
export { buildCatalog } from './catalog.js';
export { writeOutputs, outputPaths } from './emit.js';
export type * from './types.js';

/** Bounded-concurrency map: keeps file descriptors and memory in check. */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Extract all messages from the configured sources into a catalog.
 * Pure orchestration: reads sources, never writes — pair with writeOutputs.
 */
export async function extract(
  overrides: Partial<ExtractConfig> = {},
  configPath?: string
): Promise<ExtractResult & { config: ExtractConfig }> {
  const started = performance.now();
  const config = await resolveConfig(overrides, configPath);
  const files = await scanFiles(config);

  const entries: MessageEntry[] = [];
  const diagnostics: Diagnostic[] = [];
  let calls = 0;

  const perFile = await mapLimit(files, 32, async (file) => {
    const source = await fs.readFile(path.resolve(config.cwd, file), 'utf8');
    return extractFromSource(file, source, config.functions);
  });

  for (const result of perFile) {
    entries.push(...result.entries);
    diagnostics.push(...result.diagnostics);
    calls += result.calls;
  }

  const built = buildCatalog(entries);
  diagnostics.push(...built.diagnostics);

  return {
    config,
    catalog: built.catalog,
    meta: built.meta,
    diagnostics,
    stats: {
      files: files.length,
      calls,
      messages: Object.keys(built.catalog).length,
      durationMs: performance.now() - started,
    },
  };
}
