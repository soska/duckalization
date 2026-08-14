import type { Message } from '@duckalization/id';

/** Where a message call appears: path relative to cwd, 1-based line/column. */
export interface SourceRef {
  file: string;
  line: number;
  column: number;
}

/** Call-site byte offsets used by build-time transforms (the bundler plugin). */
export interface CallSpan {
  /** End offset of the last argument — the insertion point for an injected ID. */
  argsEnd: number;
  argCount: number;
}

/** One extracted call site. */
export interface MessageEntry {
  id: string;
  message: Message;
  context?: string;
  /** True when the ID came from an explicit `{ id }` override, not the hash. */
  explicitId: boolean;
  ref: SourceRef;
  call: CallSpan;
}

export type DiagnosticCode =
  | 'parse-error'
  | 'dynamic-message'
  | 'template-expressions'
  | 'empty-message'
  | 'invalid-plural'
  | 'invalid-meta'
  | 'id-collision';

export interface Diagnostic {
  severity: 'error' | 'warning';
  code: DiagnosticCode;
  message: string;
  ref?: SourceRef;
}

/** Catalog sidecar entry: everything a translation agent needs for context. */
export interface CatalogEntryMeta {
  message: Message;
  context?: string;
  refs: string[];
}

export type Catalog = Record<string, Message>;
export type CatalogMeta = Record<string, CatalogEntryMeta>;

export interface ExtractStats {
  files: number;
  calls: number;
  messages: number;
  durationMs: number;
}

export interface ExtractResult {
  catalog: Catalog;
  meta: CatalogMeta;
  diagnostics: Diagnostic[];
  stats: ExtractStats;
}
