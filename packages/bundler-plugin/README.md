# @duckalization/bundler-plugin

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

Build-time ID injection for duckalization.

This unplugin transform rewrites calls like `__('Sign in')` to include the content-derived ID at build time. Runtime behavior is identical, but client bundles can skip hashing and tree-shake the hash implementation.

## Install

```bash
pnpm add -D @duckalization/bundler-plugin
```

## Vite usage

```ts
import { defineConfig } from 'vite';
import DuckalizationPlugin from '@duckalization/bundler-plugin';

export default defineConfig({
  plugins: [DuckalizationPlugin.vite()],
});
```

Supports Vite, Rollup, Rolldown, webpack, rspack, esbuild, and farm through unplugin.

MIT licensed.
