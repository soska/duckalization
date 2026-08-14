import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExtractConfig } from './config.js';
import type { ExtractResult } from './types.js';

export interface EmitPaths {
  catalogPath: string;
  metaPath: string;
}

export function outputPaths(config: ExtractConfig): EmitPaths {
  const dir = path.resolve(config.cwd, config.outDir);
  return {
    catalogPath: path.join(dir, `${config.sourceLocale}.json`),
    metaPath: path.join(dir, `${config.sourceLocale}.meta.json`),
  };
}

/** Write the catalog and its sidecar. Keys are already sorted by buildCatalog. */
export async function writeOutputs(
  result: ExtractResult,
  config: ExtractConfig
): Promise<EmitPaths> {
  const paths = outputPaths(config);
  await fs.mkdir(path.dirname(paths.catalogPath), { recursive: true });
  await fs.writeFile(paths.catalogPath, JSON.stringify(result.catalog, null, 2) + '\n');
  await fs.writeFile(paths.metaPath, JSON.stringify(result.meta, null, 2) + '\n');
  return paths;
}
