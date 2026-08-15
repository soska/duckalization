import { messageId, PLURAL_FORMS, type Message, type PluralMessage } from '@duckalization/id';
import { catalogPath, reviewPath, type TranslateConfig } from './config.js';
import { readJson, writeJsonSorted } from './fsio.js';
import { containsVerbatim, loadGlossary, mentionsTerm } from './glossary.js';
import { messagePlaceholders, placeholdersIn } from './placeholders.js';
import { loadSourceCatalog } from './status.js';
import type {
  Catalog,
  Glossary,
  ReviewSidecar,
  TranslateDiagnostic,
  TranslationOutput,
} from './types.js';

const PLURAL_FORM_SET: ReadonlySet<string> = new Set(PLURAL_FORMS);

function error(
  diagnostics: TranslateDiagnostic[],
  code: TranslateDiagnostic['code'],
  id: string,
  message: string
): void {
  diagnostics.push({ severity: 'error', code, id, message });
}

function warn(
  diagnostics: TranslateDiagnostic[],
  code: TranslateDiagnostic['code'],
  id: string,
  message: string
): void {
  diagnostics.push({ severity: 'warning', code, id, message });
}

function validatePluralShape(
  diagnostics: TranslateDiagnostic[],
  id: string,
  translation: PluralMessage,
  localeCategories: ReadonlySet<string>
): void {
  for (const [form, text] of Object.entries(translation)) {
    if (!PLURAL_FORM_SET.has(form)) {
      error(diagnostics, 'invalid-plural-form', id, `"${form}" is not a CLDR plural form`);
    } else if (!localeCategories.has(form)) {
      warn(
        diagnostics,
        'unexpected-plural-form',
        id,
        `form "${form}" is never selected by this locale's plural rules`
      );
    }
    if (typeof text !== 'string' || text === '') {
      error(diagnostics, 'empty-translation', id, `plural form "${form}" is empty or not a string`);
    }
  }
  if (translation.other === undefined) {
    error(diagnostics, 'missing-other', id, 'plural translations must include the "other" form');
  }
}

function validatePlaceholders(
  diagnostics: TranslateDiagnostic[],
  id: string,
  source: Message,
  translation: Message
): void {
  const sourceNames = messagePlaceholders(source);
  const forms =
    typeof translation === 'string'
      ? [translation]
      : Object.values(translation).filter((v): v is string => typeof v === 'string');

  const used = new Set<string>();
  for (const form of forms) {
    for (const name of placeholdersIn(form)) {
      used.add(name);
      if (!sourceNames.has(name)) {
        error(
          diagnostics,
          'unknown-placeholder',
          id,
          `placeholder {${name}} does not exist in the source message`
        );
      }
    }
  }
  for (const name of sourceNames) {
    if (!used.has(name)) {
      warn(
        diagnostics,
        'missing-placeholder',
        id,
        `source placeholder {${name}} is absent from the translation`
      );
    }
  }
}

function validateGlossary(
  diagnostics: TranslateDiagnostic[],
  id: string,
  glossary: Glossary,
  locale: string,
  source: Message,
  translation: Message
): void {
  for (const [term, entry] of Object.entries(glossary)) {
    if (entry.translate === false) {
      // Verbatim brand term: trigger case-sensitively on the source.
      if (containsVerbatim(source, term) && !containsVerbatim(translation, term)) {
        error(
          diagnostics,
          'glossary-dnt',
          id,
          `"${term}" is a do-not-translate term and must appear verbatim`
        );
      }
      continue;
    }
    const approved = entry.translations?.[locale];
    if (approved && mentionsTerm(source, term) && !mentionsTerm(translation, approved)) {
      warn(
        diagnostics,
        'glossary-term',
        id,
        `expected the approved translation "${approved}" for "${term}"`
      );
    }
  }
}

export function validateOutput(
  output: TranslationOutput,
  sourceCatalog: Catalog,
  glossary: Glossary
): TranslateDiagnostic[] {
  const diagnostics: TranslateDiagnostic[] = [];
  const localeCategories: ReadonlySet<string> = new Set(
    new Intl.PluralRules(output.locale).resolvedOptions().pluralCategories
  );

  for (const [id, translation] of Object.entries(output.translations)) {
    const source = sourceCatalog[id];
    if (source === undefined) {
      error(diagnostics, 'unknown-id', id, 'ID does not exist in the source catalog');
      continue;
    }

    const sourceIsPlural = typeof source !== 'string';
    const translationIsPlural = typeof translation !== 'string';
    if (sourceIsPlural !== translationIsPlural) {
      error(
        diagnostics,
        'type-mismatch',
        id,
        sourceIsPlural
          ? 'source is a plural object; the translation must be one too'
          : 'source is a string; the translation must be a string'
      );
      continue;
    }

    if (typeof translation === 'string') {
      if (translation === '') {
        error(diagnostics, 'empty-translation', id, 'translation is empty');
        continue;
      }
    } else {
      validatePluralShape(diagnostics, id, translation, localeCategories);
    }

    validatePlaceholders(diagnostics, id, source, translation);
    validateGlossary(diagnostics, id, glossary, output.locale, source, translation);
  }

  return diagnostics;
}

/** Plural forms in canonical CLDR order, for stable catalog output. */
function normalizeMessage(message: Message): Message {
  if (typeof message === 'string') return message;
  const normalized: PluralMessage = {};
  for (const form of PLURAL_FORMS) {
    if (message[form] !== undefined) normalized[form] = message[form];
  }
  return normalized;
}

export interface ApplyOptions {
  /** Recorded in the review sidecar as the translator, e.g. a model name. */
  by?: string;
  /** Recorded as the translation date (ISO). Default: today. */
  at?: string;
}

export interface ApplyResult {
  diagnostics: TranslateDiagnostic[];
  /** Entries merged into the catalog; 0 when validation failed. */
  applied: number;
  catalogPath?: string;
}

/**
 * Validate an agent's output and, if error-free, merge it into the locale's
 * catalog and record review metadata. Errors → nothing is written.
 */
export async function applyOutput(
  config: TranslateConfig,
  output: TranslationOutput,
  options: ApplyOptions = {}
): Promise<ApplyResult> {
  const sourceCatalog = await loadSourceCatalog(config);
  const glossary = await loadGlossary(config);
  const diagnostics = validateOutput(output, sourceCatalog, glossary);

  if (diagnostics.some((d) => d.severity === 'error')) {
    return { diagnostics, applied: 0 };
  }

  const targetPath = catalogPath(config, output.locale);
  const catalog = (await readJson<Catalog>(targetPath)) ?? {};
  const sidecarPath = reviewPath(config, output.locale);
  const sidecar = (await readJson<ReviewSidecar>(sidecarPath)) ?? {};
  const at = options.at ?? new Date().toISOString().slice(0, 10);

  for (const [id, raw] of Object.entries(output.translations)) {
    const translation = normalizeMessage(raw);
    catalog[id] = translation;
    const notes = output.notes?.[id];
    sidecar[id] = {
      status: 'machine',
      translatedHash: messageId(translation),
      at,
      ...(options.by && { by: options.by }),
      ...(notes?.confidence && { confidence: notes.confidence }),
      ...(notes?.alternatives?.length && { alternatives: notes.alternatives }),
      ...(notes?.note && { note: notes.note }),
    };
  }

  await writeJsonSorted(targetPath, catalog);
  await writeJsonSorted(sidecarPath, sidecar);
  return {
    diagnostics,
    applied: Object.keys(output.translations).length,
    catalogPath: targetPath,
  };
}

/** Run the apply-time checks over a locale's existing catalog (lint). */
export async function lintLocale(
  config: TranslateConfig,
  locale: string
): Promise<TranslateDiagnostic[]> {
  const sourceCatalog = await loadSourceCatalog(config);
  const glossary = await loadGlossary(config);
  const catalog = (await readJson<Catalog>(catalogPath(config, locale))) ?? {};

  const known: Catalog = {};
  const diagnostics: TranslateDiagnostic[] = [];
  for (const [id, translation] of Object.entries(catalog)) {
    if (sourceCatalog[id] === undefined) {
      diagnostics.push({
        severity: 'warning',
        code: 'orphaned-id',
        id,
        message: 'not in the source catalog (stale — prune to archive it)',
      });
    } else {
      known[id] = translation;
    }
  }

  diagnostics.push(
    ...validateOutput({ locale, translations: known }, sourceCatalog, glossary)
  );
  return diagnostics;
}
