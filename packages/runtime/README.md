# @duckalization/runtime

Catalog lookup, source-locale fallback, `Intl.PluralRules`, `{name}`
interpolation, and TypeScript placeholder checking. No React.

React apps should install [`@duckalization/react`](https://www.npmjs.com/package/@duckalization/react)
instead; it re-exports `createDuck`.

```bash
pnpm add @duckalization/runtime
```

```ts
import { createDuck } from '@duckalization/runtime';
import es from '../locales/es.json'; // written by duckalize extract / apply

const duck = createDuck({ sourceLocale: 'en' });
export const { __ } = duck; // bare identifier; duckalize extract scans for this

duck.load('es', es);
duck.setLocale('es');

__('Welcome back, {name}', { name: 'Ada' });
```

Missing translations fall back to the inline source text.

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
