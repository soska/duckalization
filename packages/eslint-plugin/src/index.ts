import type { ESLint, Linter } from 'eslint';
import {
  DEFAULT_ATTRIBUTES,
  noUnlocalizedStrings,
} from './no-unlocalized-strings.js';

export { DEFAULT_ATTRIBUTES, noUnlocalizedStrings };

interface DuckalizationPlugin extends ESLint.Plugin {
  configs: { recommended: Linter.Config };
}

/**
 * Flat-config ESLint plugin. Usage:
 *
 *   import duckalization from '@duckalization/eslint-plugin';
 *   export default [duckalization.configs.recommended];
 *
 * or register manually under whatever prefix you like:
 *
 *   { plugins: { duckalization }, rules: { 'duckalization/no-unlocalized-strings': 'warn' } }
 *
 * Recommended severity is `warn`: the rule is heuristic by design (it can't
 * know that your custom `label` prop is machine-facing), so it should nudge,
 * not break builds. `duckalize extract` remains the strict gate for what *is*
 * localized; this rule covers what extract can never see — strings that were
 * never wrapped at all.
 */
const plugin: DuckalizationPlugin = {
  meta: {
    name: '@duckalization/eslint-plugin',
    version: '0.1.0',
  },
  rules: {
    'no-unlocalized-strings': noUnlocalizedStrings,
  },
  configs: {} as DuckalizationPlugin['configs'],
};

plugin.configs.recommended = {
  name: 'duckalization/recommended',
  plugins: { duckalization: plugin },
  rules: {
    'duckalization/no-unlocalized-strings': 'warn',
  },
};

export default plugin;
