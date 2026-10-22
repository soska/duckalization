import { PLURAL_FORMS } from '@duckalization/id';
import { MESSAGES, SOURCE_CATALOG } from '../../shared/facts.ts';
import {
  validateOutput,
  type Catalog,
  type Message,
  type TranslateDiagnostic,
  type TranslationOutput,
} from '../../shared/real.ts';

/** A field of the agent's answer. `omitted` = the key is absent from es.out.json. */
export interface Field {
  value: string;
  omitted: boolean;
}

export type PluralKey = 'one' | 'many' | 'other';
/** Spanish's CLDR categories in canonical order (facts.ES_PLURAL_CATEGORIES, re-ordered). */
export const ES_FORMS: readonly PluralKey[] = ['one', 'many', 'other'];

export interface AgentAnswer {
  welcome: Field;
  items: { omitted: boolean; forms: Record<PluralKey, Field> };
  checkout: Field;
  /** An entry under an ID that en.json does not have. */
  extra: boolean;
}

export const EXTRA_ID = 'zzz123';
export const EXTRA_VALUE = 'Pagar';

const f = (value: string, omitted = false): Field => ({ value, omitted });

/** The correct answer: what a valid `translate apply` merged into es.json. */
export const FIXED: AgentAnswer = {
  welcome: f('Hola de nuevo, {name}'),
  items: {
    omitted: false,
    forms: {
      one: f('{count} artículo en tu carrito'),
      many: f('{count} de artículos en tu carrito'),
      other: f('{count} artículos en tu carrito'),
    },
  },
  checkout: f('Pagar'),
  extra: false,
};

/** What the visitor sees first: plausible Spanish, one invented placeholder. */
export const INITIAL: AgentAnswer = { ...FIXED, welcome: f('Hola de nuevo, {nombre}') };

export interface Chip {
  key: string;
  label: string;
  apply: (answer: AgentAnswer) => AgentAnswer;
  /** Delete locales/es.json before this apply (so a gap is visible). */
  resetShipped?: boolean;
}

export const CHIPS: Chip[] = [
  {
    key: 'placeholder',
    label: 'Invent a placeholder',
    apply: (a) => ({ ...a, welcome: f('Hola de nuevo, {nombre}') }),
  },
  { key: 'empty', label: 'Empty a string', apply: (a) => ({ ...a, checkout: f('') }) },
  {
    key: 'other',
    label: 'Drop the plural “other” form',
    apply: (a) => ({
      ...a,
      items: { omitted: false, forms: { ...a.items.forms, other: { ...a.items.forms.other, omitted: true } } },
    }),
  },
  { key: 'unknown', label: 'Add an ID that doesn’t exist', apply: (a) => ({ ...a, extra: true }) },
  {
    key: 'partial',
    label: 'Leave one out',
    resetShipped: true,
    apply: () => ({ ...FIXED, checkout: { value: FIXED.checkout.value, omitted: true } }),
  },
  { key: 'fix', label: 'Fix everything', apply: () => FIXED },
];

/** es.out.json, in the order the rows appear (diagnostics follow it, like the CLI). */
export function toOutput(answer: AgentAnswer): TranslationOutput {
  const translations: Record<string, Message> = {};
  if (!answer.welcome.omitted) translations[MESSAGES.welcome.id] = answer.welcome.value;
  if (!answer.items.omitted) {
    const plural: Record<string, string> = {};
    for (const form of ES_FORMS) {
      const field = answer.items.forms[form];
      if (!field.omitted) plural[form] = field.value;
    }
    translations[MESSAGES.items.id] = plural;
  }
  if (!answer.checkout.omitted) translations[MESSAGES.checkout.id] = answer.checkout.value;
  if (answer.extra) translations[EXTRA_ID] = EXTRA_VALUE;
  return { locale: 'es', translations };
}

export function validate(answer: AgentAnswer): TranslateDiagnostic[] {
  return validateOutput(toOutput(answer), SOURCE_CATALOG, {});
}

/** Plural forms in canonical CLDR order, as apply.ts writes them. */
function normalize(message: Message): Message {
  if (typeof message === 'string') return message;
  const out: Record<string, string> = {};
  for (const form of PLURAL_FORMS) if (message[form] !== undefined) out[form] = message[form]!;
  return out;
}

export interface Attempt {
  ok: boolean;
  diagnostics: TranslateDiagnostic[];
  applied: number;
  /** locales/es.json after the attempt: merged on success, untouched on rejection. */
  shipped: Catalog;
  /** The CLI's summary line for this attempt (cli.ts, `translate apply`). */
  summary: string;
}

/** Mirrors `duckalize translate apply`: any error, or nothing to apply, writes nothing. */
export function attemptApply(answer: AgentAnswer, shipped: Catalog): Attempt {
  const output = toOutput(answer);
  const diagnostics = validateOutput(output, SOURCE_CATALOG, {});
  const applied = Object.keys(output.translations).length;
  const ok = !diagnostics.some((d) => d.severity === 'error') && applied > 0;
  if (!ok) {
    return { ok, diagnostics, applied: 0, shipped, summary: '✗ es: rejected — nothing written.' };
  }
  const next: Catalog = { ...shipped };
  for (const [id, message] of Object.entries(output.translations)) next[id] = normalize(message);
  return {
    ok,
    diagnostics,
    applied,
    shipped: next,
    summary: `✓ es: ${applied} entr${applied === 1 ? 'y' : 'ies'} applied → locales/es.json`,
  };
}

/** One diagnostic, formatted exactly like the CLI prints it. */
export function cliLine(d: TranslateDiagnostic): string {
  return `${d.severity}[${d.code}]${d.id ? ` ${d.id}` : ''} — ${d.message}`;
}
