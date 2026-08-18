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

/** `{name}` placeholders and Laravel-style `:name` tokens. Placeholder names
 * are code, not prose — they must never count as a mention of a term. */
const PLACEHOLDER_SEGMENT = /\{[A-Za-z0-9_]+\}|(?<![A-Za-z0-9]):[A-Za-z_][A-Za-z0-9_]*/g;

function proseForms(message: Message): string[] {
  return messageForms(message).map((form) => form.replace(PLACEHOLDER_SEGMENT, ' '));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive whole-word containment, placeholders stripped — used to
 * decide which terms are relevant. Word boundaries matter: "late" must not
 * fire on "Latest" or "plate", "member" not on "Remember".
 */
export function mentionsTerm(message: Message, term: string): boolean {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegExp(term)}(?![\\p{L}\\p{N}_])`,
    'iu'
  );
  return proseForms(message).some((form) => pattern.test(form));
}

/** Length of the folded prefix that counts as "the approved term, inflected". */
const STEM_PREFIX_LENGTH = 5;

/** Lowercase + strip diacritics, so "Restáuralo" can match "restaurar". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Whether a translation uses one of the approved renderings. Deliberately
 * looser than `mentionsTerm`: the glossary stores a citation form
 * ("archivar") while correct copy inflects it ("archivada", "archivó"), so a
 * single-word term also matches on its first STEM_PREFIX_LENGTH characters,
 * case- and accent-folded. Multi-word renderings must appear whole.
 */
export function usesApprovedTranslation(
  message: Message,
  approved: string | readonly string[]
): boolean {
  const candidates = typeof approved === 'string' ? [approved] : approved;
  const forms = proseForms(message).map(fold);
  return candidates.some((candidate) => {
    const needle = fold(candidate);
    const stem =
      !needle.includes(' ') && needle.length > STEM_PREFIX_LENGTH
        ? needle.slice(0, STEM_PREFIX_LENGTH)
        : needle;
    return forms.some((form) => form.includes(stem));
  });
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
    if (approved && approved.length > 0) resolved.approvedTranslation = approved;
    subset[term] = resolved;
  }
  return subset;
}
