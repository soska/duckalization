# @duckalization/react

`DuckProvider`, `useDuck`, `useLocale`, and a re-export of `createDuck`.
A React app usually needs only this package at runtime.

```bash
pnpm add @duckalization/react
pnpm add -D @duckalization/cli
```

```tsx
import { createDuck, DuckProvider, useDuck, useLocale } from '@duckalization/react';
import es from '../locales/es.json'; // written by duckalize extract / apply

const duck = createDuck({ sourceLocale: 'en' });
duck.load('es', es);

export function App() {
  return (
    <DuckProvider duck={duck}>
      <Header />
    </DuckProvider>
  );
}

function Header() {
  const { __ } = useDuck();
  const [locale, setLocale] = useLocale();
  return <h1>{__('Sign in')}</h1>;
}
```

Create the duck at module scope on the client, or per request for SSR. Keep
`__` a bare identifier so `duckalize extract` can see it.

Full system: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
