import path from 'node:path';
import type { Message } from '@duckalization/id';
import type { TranslateConfig } from './config.js';
import { readJson } from './fsio.js';
import { messageForms } from './placeholders.js';
import type { BriefGlossaryEntry, Glossary } from './types.js';

export async function loadGlossary(config: TranslateConfig): Promise<Glossary> {
  const glossary = await readJson<Glossary>(
    path.resolve(config.cwd, config.glossaryFile)
  );
  return glossary ?? {};
}

/** Case-insensitive containment — used to decide which terms are relevant. */
export function mentionsTerm(message: Message, term: string): boolean {
  const needle = term.toLowerCase();
  return messageForms(message).some((form) =>
    form.toLowerCase().includes(needle)
  );
}

/** Case-sensitive containment — used to enforce verbatim brand terms. */
export function containsVerbatim(message: Message, term: string): boolean {
  return messageForms(message).every((form) => form.includes(term));
}

/**
 * The subset of the glossary relevant to a set of messages, resolved for one
 * locale — this is what gets embedded in a brief.
 */
export function glossarySubset(
  glossary: Glossary,
  locale: string,
  messages: Message[]
): Record<string, BriefGlossaryEntry> {
  const subset: Record<string, BriefGlossaryEntry> = {};
  for (const [term, entry] of Object.entries(glossary)) {
    if (!messages.some((message) => mentionsTerm(message, term))) continue;
    const resolved: BriefGlossaryEntry = {};
    if (entry.translate === false) resolved.doNotTranslate = true;
    if (entry.note) resolved.note = entry.note;
    const approved = entry.translations?.[locale];
    if (approved) resolved.approvedTranslation = approved;
    subset[term] = resolved;
  }
  return subset;
}
