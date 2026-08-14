import { glob } from 'tinyglobby';
import type { ExtractConfig } from './config.js';

/** Find source files to scan. Returns paths relative to cwd, sorted for determinism. */
export async function scanFiles(config: ExtractConfig): Promise<string[]> {
  const files = await glob(config.include, {
    cwd: config.cwd,
    ignore: config.exclude,
    onlyFiles: true,
  });
  return files.sort();
}
