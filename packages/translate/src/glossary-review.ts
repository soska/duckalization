import { messageId } from '@duckalization/id';
import {
  catalogPath,
  glossaryReviewPath,
  reviewPath,
  type TranslateConfig,
} from './config.js';
import { readJson, writeJsonSorted } from './fsio.js';
import { loadGlossary, termApplies } from './glossary.js';
import { loadSourceCatalog } from './status.js';
import type {
  Catalog,
  GlossaryEntry,
  GlossaryReviewSidecar,
  ReviewSidecar,
} from './types.js';

/** 'new' = never approved for this locale; 'changed' = edited since approval. */
export type GlossaryTermStatus = 'approved' | 'changed' | 'new';

export interface GlossaryReviewTerm {
  term: string;
  status: GlossaryTermStatus;
  doNotTranslate: boolean;
  note?: string;
  /** Current translation for this locale, if the glossary has one. */
  translation?: string;
  /** The translation that was approved, when it differs from the current one. */
  approvedTranslation?: string;
}

export interface GlossaryReview {
  locale: string;
  terms: GlossaryReviewTerm[];
  /** Terms that are 'new' or 'changed' — non-empty blocks brief/apply. */
  pending: string[];
}

/**
 * Hash of what a translator for this locale actually sees of a term. Another
 * locale's translation changing must not invalidate this locale's approval.
 */
function termHash(entry: GlossaryEntry, locale: string): string {
  return messageId(
    JSON.stringify([
      entry.translate !== false,
      entry.note ?? '',
      entry.translations?.[locale] ?? '',
    ])
  );
}

/** Approval state of every glossary term, resolved for one locale. */
export async function glossaryReview(
  config: TranslateConfig,
  locale: string
): Promise<GlossaryReview> {
  const glossary = await loadGlossary(config);
  const sidecar =
    (await readJson<GlossaryReviewSidecar>(glossaryReviewPath(config, locale))) ?? {};

  const terms: GlossaryReviewTerm[] = [];
  for (const term of Object.keys(glossary).sort()) {
    const entry = glossary[term]!;
    const record = sidecar[term];
    const translation = entry.translations?.[locale];
    const status: GlossaryTermStatus = !record
      ? 'new'
      : record.hash === termHash(entry, locale)
        ? 'approved'
        : 'changed';

    const row: GlossaryReviewTerm = {
      term,
      status,
      doNotTranslate: entry.translate === false,
    };
    if (entry.note) row.note = entry.note;
    if (translation) row.translation = translation;
    if (status === 'changed' && record?.translation && record.translation !== translation) {
      row.approvedTranslation = record.translation;
    }
    terms.push(row);
  }

  return {
    locale,
    terms,
    pending: terms.filter((t) => t.status !== 'approved').map((t) => t.term),
  };
}

export interface ApproveGlossaryOptions {
  /** Specific terms; omit to approve the whole glossary. */
  terms?: string[];
  by?: string;
  at?: string;
}

export interface ApproveGlossaryResult {
  approved: string[];
  /** Requested terms that are not in the glossary. */
  unknown: string[];
}

/** Record sign-off on glossary terms for one locale, anchoring their hashes. */
export async function approveGlossary(
  config: TranslateConfig,
  locale: string,
  options: ApproveGlossaryOptions = {}
): Promise<ApproveGlossaryResult> {
  const glossary = await loadGlossary(config);
  const sidecarPath = glossaryReviewPath(config, locale);
  const previous = (await readJson<GlossaryReviewSidecar>(sidecarPath)) ?? {};
  const at = options.at ?? new Date().toISOString().slice(0, 10);

  // Approvals for terms since removed from the glossary are dropped here.
  const sidecar: GlossaryReviewSidecar = {};
  for (const [term, record] of Object.entries(previous)) {
    if (glossary[term]) sidecar[term] = record;
  }

  const requested = options.terms?.length ? options.terms : Object.keys(glossary);
  const approved: string[] = [];
  const unknown: string[] = [];

  for (const term of requested) {
    const entry = glossary[term];
    if (!entry) {
      unknown.push(term);
      continue;
    }
    const hash = termHash(entry, locale);
    if (sidecar[term]?.hash !== hash) {
      const translation = entry.translations?.[locale];
      sidecar[term] = {
        hash,
        ...(translation && { translation }),
        at,
        ...(options.by && { by: options.by }),
      };
    }
    approved.push(term);
  }

  if (approved.length > 0) {
    await writeJsonSorted(sidecarPath, sidecar);
  }
  return { approved, unknown };
}

export interface InvalidateOptions {
  /** Report what would be reset, but write nothing. */
  dryRun?: boolean;
}

export interface InvalidateResult {
  locale: string;
  term: string;
  /** Translated entries whose English source uses the term. */
  affected: string[];
  /** The subset that had a review record to drop (the rest were already unreviewed). */
  reset: string[];
}

/**
 * After a glossary decision changes, send every translation that was made
 * under the old one back to 'unreviewed'. Matching is on the English source
 * via `termApplies` — never on the translated text, where the old word can
 * appear for unrelated reasons.
 */
export async function invalidateTerm(
  config: TranslateConfig,
  locale: string,
  term: string,
  options: InvalidateOptions = {}
): Promise<InvalidateResult> {
  const glossary = await loadGlossary(config);
  const entry = glossary[term];
  if (!entry) {
    throw new Error(
      `"${term}" is not in the glossary (terms: ${Object.keys(glossary).sort().join(', ') || 'none'}).`
    );
  }

  const source = await loadSourceCatalog(config);
  const catalog = (await readJson<Catalog>(catalogPath(config, locale))) ?? {};
  const sidecarPath = reviewPath(config, locale);
  const sidecar = (await readJson<ReviewSidecar>(sidecarPath)) ?? {};

  const affected = Object.keys(catalog)
    .filter((id) => source[id] !== undefined && termApplies(source[id], term, entry))
    .sort();
  const reset = affected.filter((id) => sidecar[id] !== undefined);

  if (!options.dryRun && reset.length > 0) {
    for (const id of reset) delete sidecar[id];
    await writeJsonSorted(sidecarPath, sidecar);
  }
  return { locale, term, affected, reset };
}
