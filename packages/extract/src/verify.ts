import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalMessage, messageId, PLURAL_FORMS, type Message } from '@duckalization/id';
import type { ExtractConfig } from './config.js';
import { outputPaths } from './emit.js';
import type { Catalog, CatalogMeta, Diagnostic } from './types.js';

const PLURAL_FORM_SET: ReadonlySet<string> = new Set(PLURAL_FORMS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Why a catalog value is not a valid message, or undefined if it is one. */
function messageProblem(value: unknown): { code: Diagnostic['code']; reason: string } | undefined {
  if (value === '') return { code: 'empty-message', reason: 'message is empty' };
  if (typeof value === 'string') return undefined;
  if (!isRecord(value)) {
    return { code: 'invalid-catalog', reason: 'message must be a string or a plural object' };
  }
  for (const [form, text] of Object.entries(value)) {
    if (!PLURAL_FORM_SET.has(form)) {
      return {
        code: 'invalid-plural',
        reason: `"${form}" is not a plural form (expected one of: ${PLURAL_FORMS.join(', ')})`,
      };
    }
    if (typeof text !== 'string' || text === '') {
      return { code: 'invalid-plural', reason: `plural form "${form}" must be a non-empty string` };
    }
  }
  if (value.other === undefined) {
    return { code: 'invalid-plural', reason: 'plural objects must include the "other" form' };
  }
  return undefined;
}

/**
 * Check a catalog produced by another tool against the format contract
 * (docs/formats.md): well-formed messages, a meta entry per ID that agrees
 * with the catalog, and IDs equal to `messageId(message, context)` unless the
 * meta entry declares `"explicitId": true`. Pure: data in, diagnostics out.
 */
export function verifyCatalog(catalog: unknown, meta: unknown): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const error = (code: Diagnostic['code'], id: string | undefined, message: string) => {
    diagnostics.push({
      severity: 'error',
      code,
      message: id === undefined ? message : `ID "${id}": ${message}`,
    });
  };

  if (!isRecord(catalog)) {
    error('invalid-catalog', undefined, 'catalog must be a JSON object of { "<id>": message }');
    return diagnostics;
  }
  if (!isRecord(meta)) {
    error('invalid-catalog', undefined, 'meta sidecar must be a JSON object of { "<id>": entry }');
    return diagnostics;
  }

  for (const id of Object.keys(catalog).sort()) {
    const message = catalog[id];
    const problem = messageProblem(message);
    if (problem) {
      error(problem.code, id, problem.reason);
      continue;
    }

    const entry = meta[id];
    if (!isRecord(entry)) {
      error('meta-mismatch', id, 'has no entry in the meta sidecar');
      continue;
    }
    if (messageProblem(entry.message) || canonicalMessage(entry.message as Message) !== canonicalMessage(message as Message)) {
      error('meta-mismatch', id, 'meta "message" differs from the catalog message');
      continue;
    }
    if (entry.context !== undefined && (typeof entry.context !== 'string' || entry.context === '')) {
      error('invalid-meta', id, '"context" must be a non-empty string when present');
      continue;
    }
    if (!Array.isArray(entry.refs) || entry.refs.some((ref) => typeof ref !== 'string')) {
      error('invalid-meta', id, '"refs" must be an array of "path:line:column" strings');
      continue;
    }
    if (entry.explicitId !== undefined && entry.explicitId !== true) {
      error('invalid-meta', id, '"explicitId" must be true when present');
      continue;
    }

    if (entry.explicitId === true) continue;
    const expected = messageId(message as Message, entry.context as string | undefined);
    if (expected !== id) {
      error(
        'id-mismatch',
        id,
        `expected messageId(message${entry.context === undefined ? '' : ', context'}) = "${expected}". ` +
          'Hash per @duckalization/id SPEC.md, or mark an intentional override with "explicitId": true in the meta sidecar.'
      );
    }
  }

  for (const id of Object.keys(meta).sort()) {
    if (!(id in catalog)) error('meta-mismatch', id, 'is in the meta sidecar but not in the catalog');
  }
  return diagnostics;
}

async function readJsonFile(
  filePath: string,
  diagnostics: Diagnostic[]
): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    const notFound =
      error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    diagnostics.push({
      severity: 'error',
      code: notFound ? 'missing-catalog' : 'invalid-catalog',
      message: notFound
        ? `${filePath} not found — run your external extractor first`
        : `could not parse ${filePath}: ${String(error)}`,
    });
    return undefined;
  }
}

export interface ExternalCatalog {
  catalog: Catalog;
  meta: CatalogMeta;
  diagnostics: Diagnostic[];
}

/** Read and verify the source catalog + sidecar an external extractor wrote. */
export async function readExternalCatalog(config: ExtractConfig): Promise<ExternalCatalog> {
  const paths = outputPaths(config);
  const diagnostics: Diagnostic[] = [];
  const catalog = await readJsonFile(paths.catalogPath, diagnostics);
  const meta = await readJsonFile(paths.metaPath, diagnostics);
  if (diagnostics.length > 0) return { catalog: {}, meta: {}, diagnostics };

  const problems = verifyCatalog(catalog, meta);
  // Prefix file context once; individual messages already name the ID.
  const where = path.relative(config.cwd, paths.catalogPath);
  for (const d of problems) d.message = `${where}: ${d.message}`;
  return {
    catalog: problems.length > 0 ? {} : (catalog as Catalog),
    meta: problems.length > 0 ? {} : (meta as CatalogMeta),
    diagnostics: problems,
  };
}
