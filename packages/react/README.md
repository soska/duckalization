# @duckalization/react

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

React bindings for duckalization.

Includes `DuckProvider`, `useDuck`, `useLocale`, and re-exports `createDuck` from `@duckalization/runtime`, so React apps usually only need this package.

## Install

```bash
pnpm add @duckalization/react
```

## Usage

```tsx
import { createDuck, DuckProvider, useDuck, useLocale } from '@duckalization/react';

const duck = createDuck({ sourceLocale: 'en' });

export function App() {
  return <DuckProvider duck={duck}>{/* routes */}</DuckProvider>;
}

function Header() {
  const { __ } = useDuck();
  const [locale, setLocale] = useLocale();
  return <h1>{__('Sign in')}</h1>;
}
```

Create the Duck instance at module scope on the client, or per request for SSR.

MIT licensed.
