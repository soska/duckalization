/**
 * Content-derived message identity.
 *
 * The message text itself (plus an optional disambiguating context) is the
 * identity of a translation entry. Everything that must agree on an ID — the
 * extractor, the runtime, and the bundler plugin — imports this module, so
 * the algorithm can never drift between them.
 *
 * Identity is the exact message text: no whitespace collapsing, no trimming.
 * Changing this would silently orphan every existing translation, so treat
 * the canonical form as frozen.
 */

export const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

export type PluralForm = (typeof PLURAL_FORMS)[number];

/** A pluralized message keyed by CLDR plural category. */
export type PluralMessage = Partial<Record<PluralForm, string>>;

/** A translatable message: a plain string or a plural-forms object. */
export type Message = string | PluralMessage;

/**
 * cyrb53 (public domain, by bryc) — a fast, well-distributed 53-bit
 * non-cryptographic string hash. Synchronous and dependency-free so it can
 * run in a client render path.
 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Separators chosen from control characters that cannot appear via typing. */
const FORM_SEP = '\u0001';
const CONTEXT_SEP = '\u0000';

/**
 * Canonical string form of a message. Plural forms are serialized in fixed
 * CLDR order so `{ other, one }` and `{ one, other }` are the same message.
 */
export function canonicalMessage(message: Message): string {
  if (typeof message === 'string') {
    return message;
  }
  return PLURAL_FORMS.filter((form) => message[form] !== undefined)
    .map((form) => `${form}${FORM_SEP}${message[form]}`)
    .join(FORM_SEP);
}

/**
 * Compute the catalog ID for a message. Same message + same context always
 * yields the same ID, on any platform.
 */
export function messageId(message: Message, context?: string): string {
  const canonical = canonicalMessage(message);
  const input = context ? `${context}${CONTEXT_SEP}${canonical}` : canonical;
  return cyrb53(input).toString(36);
}
