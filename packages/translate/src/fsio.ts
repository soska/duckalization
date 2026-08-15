import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    const notFound =
      error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (notFound) return undefined;
    throw error;
  }
}

/** Write JSON with top-level keys sorted, so git diffs stay meaningful. */
export async function writeJsonSorted(
  filePath: string,
  data: Record<string, unknown>
): Promise<void> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(data).sort()) {
    sorted[key] = data[key];
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(sorted, null, 2) + '\n');
}
