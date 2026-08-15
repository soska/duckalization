import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve workspace packages to their sources so tests need no build step.
    alias: {
      '@duckalization/id': fileURLToPath(
        new URL('./packages/id/src/index.ts', import.meta.url)
      ),
      '@duckalization/extract': fileURLToPath(
        new URL('./packages/extract/src/index.ts', import.meta.url)
      ),
      '@duckalization/runtime': fileURLToPath(
        new URL('./packages/runtime/src/index.ts', import.meta.url)
      ),
      '@duckalization/translate': fileURLToPath(
        new URL('./packages/translate/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
  },
});
