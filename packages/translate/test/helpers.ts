import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { messageId } from '@duckalization/id';
import { resolveTranslateConfig, type TranslateConfig } from '../src/index.js';

export const IDS = {
  hello: messageId('Hello, {name}'),
  items: messageId({ one: '{count} item', other: '{count} items' }),
  soundbite: messageId('Share a Soundbite'),
  assignment: messageId('New assignment'),
};

/** A minimal project on disk: source catalog + meta + glossary + config + code. */
export async function setupProject(): Promise<TranslateConfig> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'duckalization-'));
  await fs.mkdir(path.join(cwd, 'locales'), { recursive: true });
  await fs.mkdir(path.join(cwd, 'src'), { recursive: true });

  await fs.writeFile(
    path.join(cwd, 'duckalization.config.json'),
    JSON.stringify({
      targetLocales: ['es'],
      style: {
        '*': 'UI copy: concise.',
        es: 'Neutral Latin American Spanish, casual, always tú.',
      },
    })
  );

  await fs.writeFile(
    path.join(cwd, 'locales', 'en.json'),
    JSON.stringify({
      [IDS.hello]: 'Hello, {name}',
      [IDS.items]: { one: '{count} item', other: '{count} items' },
      [IDS.soundbite]: 'Share a Soundbite',
      [IDS.assignment]: 'New assignment',
    })
  );

  await fs.writeFile(
    path.join(cwd, 'locales', 'en.meta.json'),
    JSON.stringify({
      [IDS.hello]: { message: 'Hello, {name}', refs: ['src/app.ts:2:14'] },
      [IDS.items]: {
        message: { one: '{count} item', other: '{count} items' },
        refs: ['src/app.ts:3:14'],
      },
      [IDS.soundbite]: { message: 'Share a Soundbite', refs: ['src/app.ts:4:14'] },
      [IDS.assignment]: { message: 'New assignment', refs: ['src/app.ts:5:14'] },
    })
  );

  await fs.writeFile(
    path.join(cwd, 'src', 'app.ts'),
    [
      `declare function __(m: unknown, o?: unknown): string;`,
      `const hello = __('Hello, {name}', { name: 'x' });`,
      `const items = __({ one: '{count} item', other: '{count} items' }, { count: 1 });`,
      `const share = __('Share a Soundbite');`,
      `const brand = __('New assignment');`,
    ].join('\n')
  );

  await fs.writeFile(
    path.join(cwd, 'locales', 'glossary.json'),
    JSON.stringify({
      Soundbite: { translate: false, note: 'Product feature name' },
      assignment: {
        note: 'A homework unit a teacher assigns',
        translations: { es: 'tarea' },
      },
    })
  );

  return resolveTranslateConfig({ cwd });
}

export async function writeTargetCatalog(
  config: TranslateConfig,
  locale: string,
  catalog: Record<string, unknown>
): Promise<void> {
  await fs.writeFile(
    path.join(config.cwd, config.outDir, `${locale}.json`),
    JSON.stringify(catalog)
  );
}
