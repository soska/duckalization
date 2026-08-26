# @duckalization/eslint-plugin

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

ESLint rules for duckalization.

The recommended config enables `duckalization/no-unlocalized-strings`, which flags hardcoded JSX text and human-facing attributes that should be wrapped in `__()`.

## Install

```bash
pnpm add -D @duckalization/eslint-plugin eslint
```

## Usage

```js
import duckalization from '@duckalization/eslint-plugin';

export default [duckalization.configs.recommended];
```

Manual rule config:

```js
export default [{
  plugins: { duckalization },
  rules: { 'duckalization/no-unlocalized-strings': 'warn' },
}];
```

MIT licensed.
