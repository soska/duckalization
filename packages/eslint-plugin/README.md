# @duckalization/eslint-plugin

Optional flat-config rule `duckalization/no-unlocalized-strings`. Flags
hardcoded JSX text and human-facing attributes that were never wrapped in
`__()`, with an editor suggestion for the wrap.

```bash
pnpm add -D @duckalization/eslint-plugin eslint
```

```js
import duckalization from '@duckalization/eslint-plugin';

export default [duckalization.configs.recommended]; // warn
```

```js
export default [{
  plugins: { duckalization },
  rules: { 'duckalization/no-unlocalized-strings': 'warn' },
}];
```

Suggestions apply from the editor, not `eslint --fix`: someone has to confirm
the string is user-facing, and `__` must be in scope. `duckalize extract`
remains the gate for wrapped calls.

Full system: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
