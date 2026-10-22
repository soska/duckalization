# @duckalization/id

Canonicalization and hashing for duckalization message IDs.

Apps get this transitively. Do not add it as a direct dependency unless you
are writing tooling that must agree on IDs. Do not change the algorithm:
every catalog ID would move.

```ts
import { messageId } from '@duckalization/id';

messageId('Sign in');
messageId('Book', 'verb');
messageId({ one: '{count} item', other: '{count} items' });
```

Implementing IDs in another language (e.g. a Rust extractor)? Follow
[`SPEC.md`](./SPEC.md) and check against
[`test-vectors.json`](./test-vectors.json) (also importable as
`@duckalization/id/test-vectors.json`).

- `messageId(message, context?)`
- `canonicalMessage(message)`
- `PLURAL_FORMS`
- Types: `Message`, `PluralMessage`, `PluralForm`

Complete usage guide: [duckalization README](https://github.com/soska/duckalization#readme).
Agents: [`llms.txt`](https://github.com/soska/duckalization/blob/main/llms.txt).
