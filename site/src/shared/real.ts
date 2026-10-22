/**
 * The library's actual code, running in the browser. Demos that hash,
 * validate or render must go through these, never through re-implementations.
 */
export { messageId, canonicalMessage } from '@duckalization/id';
export { createDuck } from '@duckalization/runtime';
export { DuckProvider, useDuck, useLocale } from '@duckalization/react';
export { validateOutput } from '@duckalization/validate';
export type { Catalog, Duck, Message } from '@duckalization/runtime';
export type { TranslateDiagnostic, TranslationOutput } from '../../../packages/translate/src/types.ts';
