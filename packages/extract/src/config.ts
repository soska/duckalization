import fs from 'node:fs/promises';
import path from 'node:path';

export interface ExtractConfig {
  /** Project root all globs and output paths are resolved against. */
  cwd: string;
  /** Globs of source files to scan. */
  include: string[];
  /** Globs to skip. */
  exclude: string[];
  /** Names of the translation functions to extract from. */
  functions: string[];
  /** Directory where catalogs are written, relative to cwd. */
  outDir: string;
  /** Locale of the messages in source code. */
  sourceLocale: string;
}

export const CONFIG_FILENAME = 'duckalization.config.json';

export const defaultConfig: Omit<ExtractConfig, 'cwd'> = {
  include: ['src/**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/*.test.*',
    '**/*.spec.*',
  ],
  functions: ['__'],
  outDir: 'locales',
  sourceLocale: 'en',
};

/**
 * Resolve the effective config: defaults ← config file (if present) ← overrides.
 */
export async function resolveConfig(
  overrides: Partial<ExtractConfig> = {},
  configPath?: string
): Promise<ExtractConfig> {
  const cwd = path.resolve(overrides.cwd ?? process.cwd());
  const filePath = configPath
    ? path.resolve(cwd, configPath)
    : path.join(cwd, CONFIG_FILENAME);

  let fromFile: Partial<ExtractConfig> = {};
  try {
    fromFile = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    const notFound =
      error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    // A missing default config is fine; an explicitly named or malformed one is not.
    if (!notFound || configPath) {
      throw new Error(`Could not read config at ${filePath}: ${String(error)}`);
    }
  }

  return { ...defaultConfig, ...fromFile, ...overrides, cwd };
}
