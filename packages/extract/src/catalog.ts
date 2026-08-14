import { canonicalMessage } from '@duckalization/id';
import type {
  Catalog,
  CatalogMeta,
  Diagnostic,
  MessageEntry,
} from './types.js';

export interface CatalogBuild {
  catalog: Catalog;
  meta: CatalogMeta;
  diagnostics: Diagnostic[];
}

const formatRef = (entry: MessageEntry): string =>
  `${entry.ref.file}:${entry.ref.line}:${entry.ref.column}`;

/** Identity of an entry beyond its ID, used to detect collisions. */
const identity = (entry: MessageEntry): string =>
  JSON.stringify([entry.context ?? null, canonicalMessage(entry.message)]);

/**
 * Fold call-site entries into a catalog. Repeated identical messages merge
 * into one entry (dedup is free with content-derived IDs); two *different*
 * messages mapping to the same ID — an explicit-id reuse or an astronomically
 * unlikely hash collision — is an error, fixed by adding a `context`.
 */
export function buildCatalog(entries: MessageEntry[]): CatalogBuild {
  const diagnostics: Diagnostic[] = [];
  const byId = new Map<string, MessageEntry[]>();
  for (const entry of entries) {
    const group = byId.get(entry.id);
    if (group) {
      group.push(entry);
    } else {
      byId.set(entry.id, [entry]);
    }
  }

  const catalog: Catalog = {};
  const meta: CatalogMeta = {};
  for (const id of [...byId.keys()].sort()) {
    const group = byId.get(id)!;
    const first = group[0]!;

    const conflicting = group.filter((e) => identity(e) !== identity(first));
    if (conflicting.length > 0) {
      const sites = [...new Set(group.map(formatRef))].sort();
      diagnostics.push({
        severity: 'error',
        code: 'id-collision',
        message:
          `ID "${id}" maps to different messages:\n` +
          sites.map((site) => `    at ${site}`).join('\n') +
          '\n  Disambiguate with a distinct { context } (or a different explicit { id }).',
        ref: first.ref,
      });
      continue;
    }

    catalog[id] = first.message;
    meta[id] = {
      message: first.message,
      ...(first.context !== undefined && { context: first.context }),
      refs: [...new Set(group.map(formatRef))].sort(),
    };
  }

  return { catalog, meta, diagnostics };
}
