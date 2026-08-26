# @duckalization/bundler-plugin

Optional unplugin transform. Rewrites `__('Sign in')` to include the
content-derived ID at build time so the runtime never hashes and the hash
implementation tree-shakes out of the client bundle. Apps behave the same
without it.

```bash
pnpm add -D @duckalization/bundler-plugin
```

```ts
import { defineConfig } from 'vite';
import DuckalizationPlugin from '@duckalization/bundler-plugin';

export default defineConfig({
  plugins: [DuckalizationPlugin.vite()],
});
```

Also: `.rollup()`, `.webpack()`, `.esbuild()`, plus rspack, rolldown, and
farm via unplugin.

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
