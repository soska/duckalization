import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalMessage, messageId, type Message } from '@duckalization/id';

interface Vector {
  name: string;
  message: Message;
  context?: string;
  input: string;
  utf16Length: number;
  hash: number;
  id: string;
}

// The published vectors are the cross-language contract (see SPEC.md): if
// this fails, the algorithm drifted — fix the code, never the vectors.
const { vectors } = JSON.parse(
  fs.readFileSync(new URL('../test-vectors.json', import.meta.url), 'utf8')
) as { vectors: Vector[] };

describe('test-vectors.json', () => {
  it.each(vectors.map((v) => [v.name, v] as const))('%s', (_, v) => {
    const canonical = canonicalMessage(v.message);
    expect(v.context ? `${v.context}\u0000${canonical}` : canonical).toBe(v.input);
    expect(v.input.length).toBe(v.utf16Length);
    expect(v.hash.toString(36)).toBe(v.id);
    expect(messageId(v.message, v.context)).toBe(v.id);
  });
});
