import type { Message } from '@duckalization/id';

export type Catalog = Record<string, Message>;

/** Shape of `<sourceLocale>.meta.json` entries written by extract. */
export interface CatalogMetaEntry {
  message: Message;
  context?: string;
  refs: string[];
}
export type CatalogMeta = Record<string, CatalogMetaEntry>;

/** One glossary term (`locales/glossary.json`). */
export interface GlossaryEntry {
  /** false = brand/marketing term, must appear verbatim in every translation. */
  translate?: boolean;
  /** What the term means in this product — disambiguation for the translator. */
  note?: string;
  /** Team-approved translations, keyed by locale. An array lists several
   * acceptable renderings (e.g. "due" → ["vence", "fecha de vencimiento"]);
   * any one of them satisfies the check. */
  translations?: Record<string, string | string[]>;
}
export type Glossary = Record<string, GlossaryEntry>;

/** Glossary subset embedded in a brief, pre-resolved for one locale. */
export interface BriefGlossaryEntry {
  doNotTranslate?: true;
  note?: string;
  approvedTranslation?: string | string[];
}

export interface BriefEntry {
  id: string;
  message: Message;
  context?: string;
  refs: string[];
  /** Call-site excerpts (`path:line:col: code`) so no repo access is needed. */
  source?: string[];
}

/** A self-contained translation work order for one locale. */
export interface Brief {
  locale: string;
  /** CLDR plural categories this locale actually uses. */
  pluralCategories: string[];
  instructions: string;
  style?: string;
  glossary: Record<string, BriefGlossaryEntry>;
  entries: BriefEntry[];
}

export interface TranslationNotes {
  confidence?: 'low' | 'medium' | 'high';
  alternatives?: string[];
  note?: string;
}

/** What a translating agent hands back for `apply`. */
export interface TranslationOutput {
  locale: string;
  translations: Record<string, Message>;
  notes?: Record<string, TranslationNotes>;
}

export type TranslateDiagnosticCode =
  | 'unknown-id'
  | 'type-mismatch'
  | 'empty-translation'
  | 'invalid-plural-form'
  | 'unexpected-plural-form'
  | 'missing-other'
  | 'unknown-placeholder'
  | 'missing-placeholder'
  | 'glossary-dnt'
  | 'glossary-term'
  | 'orphaned-id';

export interface TranslateDiagnostic {
  severity: 'error' | 'warning';
  code: TranslateDiagnosticCode;
  message: string;
  id?: string;
}

export type ReviewStatus = 'machine' | 'approved' | 'edited';

/** One entry in `<locale>.review.json`. Keyed by catalog ID, so review state
 * self-invalidates when the source text (and therefore the ID) changes. */
export interface ReviewEntry {
  status: ReviewStatus;
  /** Content hash of the translation this status refers to; drift = human edit. */
  translatedHash: string;
  by?: string;
  at?: string;
  confidence?: 'low' | 'medium' | 'high';
  alternatives?: string[];
  note?: string;
}
export type ReviewSidecar = Record<string, ReviewEntry>;

export interface LocaleStatus {
  locale: string;
  total: number;
  translated: number;
  missing: string[];
  orphaned: string[];
}
