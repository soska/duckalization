import { describe, expect, it } from 'vitest';
import { messageId } from '@duckalization/id';
import { extractFromSource } from '../src/parse.js';

const run = (source: string, functions: string[] = ['__']) =>
  extractFromSource('test.tsx', source, functions);

describe('extractFromSource', () => {
  it('extracts plain string calls', async () => {
    const { entries, diagnostics } = await run(`__('Hello')`);
    expect(diagnostics).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: messageId('Hello'),
      message: 'Hello',
      explicitId: false,
    });
  });

  it('accepts expressionless template literals', async () => {
    const { entries } = await run('__(`Hello`)');
    expect(entries[0]?.message).toBe('Hello');
  });

  it('reads context and id from the options object, ignoring values', async () => {
    const { entries } = await run(
      `__('Book', { context: 'verb', name: someVariable });
       __('Checkout', { id: 'checkout.cta' });`
    );
    expect(entries[0]).toMatchObject({ context: 'verb', id: messageId('Book', 'verb') });
    expect(entries[1]).toMatchObject({ id: 'checkout.cta', explicitId: true });
  });

  it('unwraps TS assertions around messages', async () => {
    const { entries, diagnostics } = await run(
      `__({ one: 'a', other: 'b' } as const)`
    );
    expect(diagnostics).toEqual([]);
    expect(entries[0]?.message).toEqual({ one: 'a', other: 'b' });
  });

  it('ignores the functions it was not asked about', async () => {
    const { entries } = await run(`t('Nope'); __('Yes')`);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe('Yes');
  });

  it('ignores non-call references to the function name', async () => {
    const { entries } = await run(`const fn = __; register(__);`);
    expect(entries).toHaveLength(0);
  });

  it('rejects dynamic metadata', async () => {
    const { diagnostics } = await run(`__('Book', { context: someVar })`);
    expect(diagnostics[0]?.code).toBe('invalid-meta');
  });

  it('requires the "other" plural form', async () => {
    const { diagnostics } = await run(`__({ one: 'a' })`);
    expect(diagnostics[0]?.code).toBe('invalid-plural');
  });

  it('locates diagnostics with line and column', async () => {
    const { diagnostics } = await run(`const x = 1;\nconst y = __(dynamic);`);
    expect(diagnostics[0]?.ref).toMatchObject({ file: 'test.tsx', line: 2 });
  });
});
