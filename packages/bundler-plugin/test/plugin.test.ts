import { describe, expect, it } from 'vitest';
import { messageId } from '@duckalization/id';
import { createDuck } from '@duckalization/runtime';
import { DuckalizationPlugin, injectIds } from '../src/index.js';

const inject = (code: string) => injectIds(code, 'app.tsx', ['__']);

describe('injectIds', () => {
  it('injects the hashed id into single-argument calls', async () => {
    const result = await inject(`__('Sign in')`);
    expect(result.code).toBe(`__('Sign in', undefined, ${JSON.stringify(messageId('Sign in'))})`);
    expect(result.injected).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('appends after an existing options argument', async () => {
    const result = await inject(`__('Welcome, {name}', { name })`);
    expect(result.code).toBe(
      `__('Welcome, {name}', { name }, ${JSON.stringify(messageId('Welcome, {name}'))})`
    );
  });

  it('bakes context into the injected id', async () => {
    const result = await inject(`__('Book', { context: 'verb' })`);
    expect(result.code).toContain(JSON.stringify(messageId('Book', 'verb')));
  });

  it('injects explicit ids verbatim', async () => {
    const result = await inject(`__('Checkout', { id: 'checkout.cta' })`);
    expect(result.code).toContain(`, "checkout.cta")`);
  });

  it('handles plural messages', async () => {
    const source = `__({ one: '{count} item', other: '{count} items' }, { count })`;
    const result = await inject(source);
    expect(result.code).toContain(
      JSON.stringify(messageId({ one: '{count} item', other: '{count} items' }))
    );
  });

  it('is idempotent: already-injected calls are left alone', async () => {
    const first = await inject(`__('Sign in')`);
    const second = await inject(first.code!);
    expect(second.code).toBeNull();
    expect(second.injected).toBe(0);
  });

  it('reports dynamic calls as diagnostics without editing them', async () => {
    const result = await inject(`__(someVariable)`);
    expect(result.code).toBeNull();
    expect(result.diagnostics[0]?.code).toBe('dynamic-message');
  });

  it('edits valid calls even when the file also has invalid ones', async () => {
    const result = await inject(`__(dynamic);\n__('Static');`);
    expect(result.code).toContain(JSON.stringify(messageId('Static')));
    expect(result.diagnostics).toHaveLength(1);
  });

  it('generates a sourcemap for its edits', async () => {
    const result = await inject(`const a = 1;\nexport const b = __('Sign in');`);
    expect(result.map?.mappings).toBeTruthy();
  });

  it('produces ids the runtime short-circuits on', async () => {
    const result = await inject(`__('Sign in')`);
    const injectedId = result.code!.match(/"([^"]+)"\)$/)![1]!;

    const duck = createDuck({ onMissing: false });
    duck.load('es', { [injectedId]: 'Iniciar sesión' });
    duck.setLocale('es');
    // The runtime is handed the id directly — same lookup, zero hashing.
    expect(duck.__('Sign in', undefined, injectedId)).toBe('Iniciar sesión');
  });
});

describe('DuckalizationPlugin', () => {
  it('exposes the per-bundler factories', () => {
    expect(typeof DuckalizationPlugin.vite).toBe('function');
    expect(typeof DuckalizationPlugin.rollup).toBe('function');
    expect(typeof DuckalizationPlugin.webpack).toBe('function');
    expect(typeof DuckalizationPlugin.esbuild).toBe('function');
  });

  it('builds a named vite plugin', () => {
    const plugin = DuckalizationPlugin.vite();
    expect((Array.isArray(plugin) ? plugin[0] : plugin)?.name).toBe('duckalization');
  });
});
