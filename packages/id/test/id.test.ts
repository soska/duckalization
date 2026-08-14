import { describe, expect, it } from 'vitest';
import { canonicalMessage, messageId } from '@duckalization/id';

describe('messageId', () => {
  it('is deterministic for the same message', () => {
    expect(messageId('Sign in')).toBe(messageId('Sign in'));
  });

  it('differs for different messages', () => {
    expect(messageId('Sign in')).not.toBe(messageId('Sign out'));
  });

  it('treats identity as the exact text', () => {
    expect(messageId('Sign in')).not.toBe(messageId('Sign in '));
    expect(messageId('Sign in')).not.toBe(messageId('sign in'));
  });

  it('changes with context', () => {
    expect(messageId('Book')).not.toBe(messageId('Book', 'verb'));
    expect(messageId('Book', 'verb')).not.toBe(messageId('Book', 'noun'));
    expect(messageId('Book', 'verb')).toBe(messageId('Book', 'verb'));
  });

  it('hashes plural messages independently of property order', () => {
    const a = messageId({ one: '# item', other: '# items' });
    const b = messageId({ other: '# items', one: '# item' });
    expect(a).toBe(b);
  });

  it('distinguishes plural messages from lookalike strings', () => {
    const plural = messageId({ one: '# item', other: '# items' });
    expect(plural).not.toBe(messageId('# item'));
    expect(plural).not.toBe(messageId('one# itemother# items'));
  });

  it('produces compact base36 ids', () => {
    const id = messageId('Hello {name}');
    expect(id).toMatch(/^[0-9a-z]{1,11}$/);
  });
});

describe('canonicalMessage', () => {
  it('returns plain strings unchanged', () => {
    expect(canonicalMessage('Hello')).toBe('Hello');
  });

  it('orders plural forms canonically', () => {
    expect(canonicalMessage({ other: 'b', one: 'a' })).toBe(
      canonicalMessage({ one: 'a', other: 'b' })
    );
  });
});
