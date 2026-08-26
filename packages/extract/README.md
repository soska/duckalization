# @duckalization/extract

Scans JavaScript/TypeScript for `__('Sign in')` (and configured aliases),
hashes content-derived IDs, and writes catalog plus metadata files.

This is the library behind `duckalize extract`. Apps should depend on
[`@duckalization/cli`](https://www.npmjs.com/package/@duckalization/cli)
instead.

```bash
pnpm add -D @duckalization/cli
pnpm duckalize extract
```

Use this package when embedding extraction in custom tooling:

```ts
import { extract, writeOutputs } from '@duckalization/extract';

const result = await extract({ cwd: process.cwd() });
if (!result.diagnostics.some((d) => d.severity === 'error')) {
  await writeOutputs(result, result.config);
}
```

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
