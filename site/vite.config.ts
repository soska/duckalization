import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repo = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const shim = (name: string) => fileURLToPath(new URL(`./src/shims/${name}.ts`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The page runs the library's real source, not copies of it.
      '@duckalization/id': repo('packages/id/src/index.ts'),
      '@duckalization/runtime': repo('packages/runtime/src/index.ts'),
      '@duckalization/react': repo('packages/react/src/index.ts'),
      // `validateOutput` is pure, but its module graph imports Node APIs that
      // only the file-writing functions use. Inert shims let it bundle.
      '@duckalization/validate': repo('packages/translate/src/apply.ts'),
      '@duckalization/extract': shim('extract'),
      'node:fs/promises': shim('fs'),
      'node:path': shim('path'),
    },
  },
});
