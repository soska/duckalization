import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { messageId } from '@duckalization/id';
import { extract, verifyCatalog, writeOutputs } from '../src/index.js';

const fixture = (name: string): string =>
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);

describe('extract', () => {
  it('extracts a keyless catalog from a fixture app', async () => {
    const result = await extract({ cwd: fixture('app') });

    expect(result.diagnostics).toEqual([]);
    expect(result.stats.files).toBe(2);
    // 7 calls, but the two `Sign in`s dedupe into one entry.
    expect(result.stats.calls).toBe(7);
    expect(result.stats.messages).toBe(6);

    expect(result.catalog[messageId('Sign in')]).toBe('Sign in');
    expect(result.catalog[messageId('Welcome back, {name}')]).toBe('Welcome back, {name}');
    expect(result.catalog[messageId('Book')]).toBe('Book');
    expect(result.catalog[messageId('Book', 'verb')]).toBe('Book');
    expect(result.catalog['checkout.cta']).toBe('Checkout');
    expect(result.catalog[messageId({ one: '{count} item', other: '{count} items' })]).toEqual({
      one: '{count} item',
      other: '{count} items',
    });
  });

  it('records refs and context in the meta sidecar', async () => {
    const result = await extract({ cwd: fixture('app') });

    const signIn = result.meta[messageId('Sign in')];
    expect(signIn?.refs).toHaveLength(2);
    expect(signIn?.refs[0]).toMatch(/^src\/auth\/LoginForm\.tsx:\d+:\d+$/);

    const bookVerb = result.meta[messageId('Book', 'verb')];
    expect(bookVerb?.context).toBe('verb');
    expect(result.meta[messageId('Book')]?.context).toBeUndefined();
  });

  it('reports diagnostics for unextractable calls and writes nothing for them', async () => {
    const result = await extract({ cwd: fixture('invalid') });

    const codes = result.diagnostics.map((d) => d.code).sort();
    expect(codes).toEqual([
      'dynamic-message',
      'empty-message',
      'invalid-plural',
      'template-expressions',
    ]);
    expect(result.diagnostics.every((d) => d.severity === 'error')).toBe(true);
    expect(result.diagnostics.every((d) => d.ref?.file === 'src/bad.ts')).toBe(true);
    expect(Object.keys(result.catalog)).toEqual([]);
  });

  it('flags explicit-id collisions between different messages', async () => {
    const result = await extract({ cwd: fixture('collision') });

    const collision = result.diagnostics.find((d) => d.code === 'id-collision');
    expect(collision).toBeDefined();
    expect(collision?.message).toContain('shared.id');
    expect(result.catalog['shared.id']).toBeUndefined();
  });

  it('is stable across runs (sorted keys, deterministic ids)', async () => {
    const [first, second] = await Promise.all([
      extract({ cwd: fixture('app') }),
      extract({ cwd: fixture('app') }),
    ]);
    expect(JSON.stringify(first.catalog)).toBe(JSON.stringify(second.catalog));
    expect(Object.keys(first.catalog)).toEqual([...Object.keys(first.catalog)].sort());
  });
});

describe('extractor: "external"', () => {
  /** A project whose source catalog was written by some other tool. */
  async function externalProject(catalog: unknown, meta: unknown): Promise<string> {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'duckalization-ext-'));
    await fs.mkdir(path.join(cwd, 'locales'));
    await fs.writeFile(
      path.join(cwd, 'duckalization.config.json'),
      JSON.stringify({ extractor: 'external' })
    );
    await fs.writeFile(path.join(cwd, 'locales/en.json'), JSON.stringify(catalog));
    await fs.writeFile(path.join(cwd, 'locales/en.meta.json'), JSON.stringify(meta));
    return cwd;
  }

  it('marks explicit ids in the meta sidecar of the JS extractor', async () => {
    const result = await extract({ cwd: fixture('app') });
    expect(result.meta['checkout.cta']?.explicitId).toBe(true);
    expect(result.meta[messageId('Sign in')]?.explicitId).toBeUndefined();
  });

  it("accepts the JS extractor's own output as a valid external catalog", async () => {
    const { catalog, meta } = await extract({ cwd: fixture('app') });
    const cwd = await externalProject(catalog, meta);

    const result = await extract({ cwd });
    expect(result.diagnostics).toEqual([]);
    expect(result.catalog).toEqual(catalog);
    expect(result.stats).toMatchObject({ files: 0, calls: 0, messages: 6 });
  });

  it('never overwrites the external catalog', async () => {
    const cwd = await externalProject(
      { [messageId('Hi')]: 'Hi' },
      { [messageId('Hi')]: { message: 'Hi', refs: ['src/main.rs:3:9'] } }
    );
    const before = await fs.readFile(path.join(cwd, 'locales/en.json'), 'utf8');
    const result = await extract({ cwd });

    await expect(writeOutputs(result, result.config)).rejects.toThrow(/external/);
    expect(await fs.readFile(path.join(cwd, 'locales/en.json'), 'utf8')).toBe(before);
  });

  it('reports ids that drift from messageId(message, context)', () => {
    const wrong = messageId('Book'); // context forgotten when hashing
    const diagnostics = verifyCatalog(
      { [wrong]: 'Book' },
      { [wrong]: { message: 'Book', context: 'verb', refs: [] } }
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ severity: 'error', code: 'id-mismatch' });
    expect(diagnostics[0]!.message).toContain(messageId('Book', 'verb'));
  });

  it('allows explicit ids only when the meta sidecar declares them', () => {
    const catalog = { 'checkout.cta': 'Checkout' };
    const declared = { 'checkout.cta': { message: 'Checkout', explicitId: true, refs: [] } };
    expect(verifyCatalog(catalog, declared)).toEqual([]);

    const undeclared = { 'checkout.cta': { message: 'Checkout', refs: [] } };
    expect(verifyCatalog(catalog, undeclared).map((d) => d.code)).toEqual(['id-mismatch']);
  });

  it('checks message shape and catalog/meta agreement', () => {
    const ok = messageId('Ok');
    const plural = messageId({ few: 'x' } as never);
    const diagnostics = verifyCatalog(
      { [ok]: 'Ok', empty: '', [plural]: { few: 'x' }, nometa: 'Hi' },
      {
        [ok]: { message: 'Different', refs: [] },
        empty: { message: '', refs: [] },
        [plural]: { message: { few: 'x' }, refs: [] },
        stale: { message: 'Gone', refs: [] },
      }
    );
    const found = diagnostics.map((d) => `${d.code} ${/ID "([^"]+)"/.exec(d.message)?.[1]}`);
    expect(found.sort()).toEqual(
      [
        `meta-mismatch ${ok}`,
        `invalid-plural ${plural}`,
        'empty-message empty',
        'meta-mismatch nometa',
        'meta-mismatch stale',
      ].sort()
    );
  });

  it('fails clearly when the external tool has not run', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'duckalization-ext-'));
    const result = await extract({ cwd, extractor: 'external' });
    expect(result.diagnostics.map((d) => d.code)).toEqual(['missing-catalog', 'missing-catalog']);
  });

  it('rejects an unknown extractor value', async () => {
    await expect(extract({ cwd: fixture('app'), extractor: 'rust' as never })).rejects.toThrow(
      /Unknown "extractor"/
    );
  });
});
