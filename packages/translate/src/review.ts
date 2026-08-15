import { messageId } from '@duckalization/id';
import { catalogPath, reviewPath, type TranslateConfig } from './config.js';
import { readJson, writeJsonSorted } from './fsio.js';
import type { Catalog, ReviewSidecar, ReviewStatus } from './types.js';

export type EffectiveStatus = ReviewStatus | 'unreviewed';

export interface ReviewOverview {
  locale: string;
  /** Effective status per catalog ID (hash drift ⇒ 'edited'). */
  entries: Record<string, EffectiveStatus>;
  counts: Record<EffectiveStatus, number>;
}

/**
 * Effective review state of a locale. An entry whose recorded hash no longer
 * matches the catalog was hand-edited after review — reported as 'edited'
 * (a direct human edit counts as attention, not a violation).
 */
export async function reviewOverview(
  config: TranslateConfig,
  locale: string
): Promise<ReviewOverview> {
  const catalog = (await readJson<Catalog>(catalogPath(config, locale))) ?? {};
  const sidecar = (await readJson<ReviewSidecar>(reviewPath(config, locale))) ?? {};

  const entries: Record<string, EffectiveStatus> = {};
  const counts: Record<EffectiveStatus, number> = {
    machine: 0,
    approved: 0,
    edited: 0,
    unreviewed: 0,
  };

  for (const [id, translation] of Object.entries(catalog)) {
    const record = sidecar[id];
    let status: EffectiveStatus;
    if (!record) {
      status = 'unreviewed';
    } else if (record.translatedHash !== messageId(translation)) {
      status = 'edited';
    } else {
      status = record.status;
    }
    entries[id] = status;
    counts[status]++;
  }

  return { locale, entries, counts };
}

export interface ApproveOptions {
  /** Specific IDs; omit to approve every current entry. */
  ids?: string[];
  by?: string;
  at?: string;
}

export interface ApproveResult {
  approved: string[];
  /** Requested IDs that are not in the catalog. */
  unknown: string[];
}

/** Record sign-off: sets status 'approved' and re-anchors the content hash. */
export async function approve(
  config: TranslateConfig,
  locale: string,
  options: ApproveOptions = {}
): Promise<ApproveResult> {
  const catalog = (await readJson<Catalog>(catalogPath(config, locale))) ?? {};
  const sidecarPath = reviewPath(config, locale);
  const sidecar = (await readJson<ReviewSidecar>(sidecarPath)) ?? {};
  const at = options.at ?? new Date().toISOString().slice(0, 10);

  const requested = options.ids?.length ? options.ids : Object.keys(catalog);
  const approved: string[] = [];
  const unknown: string[] = [];

  for (const id of requested) {
    const translation = catalog[id];
    if (translation === undefined) {
      unknown.push(id);
      continue;
    }
    sidecar[id] = {
      ...sidecar[id],
      status: 'approved',
      translatedHash: messageId(translation),
      at,
      ...(options.by && { by: options.by }),
    };
    approved.push(id);
  }

  if (approved.length > 0) {
    await writeJsonSorted(sidecarPath, sidecar);
  }
  return { approved, unknown };
}
