import type { Message } from '@duckalization/id';

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

export function placeholdersIn(text: string): Set<string> {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    names.add(match[1]!);
  }
  return names;
}

/** Union of placeholders across all forms of a message. */
export function messagePlaceholders(message: Message): Set<string> {
  if (typeof message === 'string') {
    return placeholdersIn(message);
  }
  const names = new Set<string>();
  for (const form of Object.values(message)) {
    for (const name of placeholdersIn(form)) {
      names.add(name);
    }
  }
  return names;
}

export function messageForms(message: Message): string[] {
  return typeof message === 'string' ? [message] : Object.values(message);
}
