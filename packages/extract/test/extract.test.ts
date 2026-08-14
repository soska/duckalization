import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { messageId } from '@duckalization/id';
import { extract } from '../src/index.js';

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
