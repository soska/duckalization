# @duckalization/id

*The name: squint at an empty call — `__('')` — and it's a duck face.* 🦆

Content-derived message IDs for duckalization.

This package owns the canonicalization and hashing algorithm shared by the extractor, runtime, bundler plugin, and translation tooling. Treat it as stable: changing the algorithm changes catalog IDs.

## Install

```bash
pnpm add @duckalization/id
```

## Usage

```ts
import { messageId } from '@duckalization/id';

messageId('Sign in');
messageId('Book', 'verb');
messageId({ one: '{count} item', other: '{count} items' });
```

## API

- `messageId(message, context?)`
- `canonicalMessage(message)`
- `PLURAL_FORMS`
- Types: `Message`, `PluralMessage`, `PluralForm`

MIT licensed.
