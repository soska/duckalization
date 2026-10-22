import { BAD_OUTPUTS, CLAIMS, ES_CATALOG, MESSAGES, SOURCE_CATALOG, STORY, TRANSCRIPT, type TermLine } from '../../shared/facts.ts';
import { messageId, validateOutput, type TranslateDiagnostic } from '../../shared/real.ts';

/** Ledger columns, left to right, plus the orphans band below them. */
export const COLUMNS = [
  { key: 'source', label: 'Source', actor: 'you', note: 'in code' },
  { key: 'brief', label: 'Brief', actor: 'duckalize', note: 'missing' },
  { key: 'agent', label: 'Agent output', actor: 'any agent', note: 'judgment' },
  { key: 'checked', label: 'Checked', actor: 'duckalize', note: 'validated' },
  { key: 'shipped', label: 'Shipped', actor: 'runtime', note: 'es.json' },
] as const;

export type Col = (typeof COLUMNS)[number]['key'] | 'orphan';
export type RowKey = 'welcome' | 'items' | 'checkout' | 'checkoutEdited';
export const ROWS: RowKey[] = ['welcome', 'items', 'checkout', 'checkoutEdited'];

/** The edit in the last step: same button, one character of difference. */
export const EDITED_CHECKOUT = 'Check out';
export const EDITED_ID = messageId(EDITED_CHECKOUT);

/**
 * The agent's first attempt: a correct translation except that it
 * "translated" the placeholder name too. Run through the real validator.
 */
export const FIRST_ATTEMPT = {
  locale: 'es',
  translations: {
    ...ES_CATALOG,
    [MESSAGES.welcome.id]: BAD_OUTPUTS.rejected.translations[MESSAGES.welcome.id],
  },
};
export const FIRST_ATTEMPT_DIAGNOSTICS: TranslateDiagnostic[] = validateOutput(FIRST_ATTEMPT, SOURCE_CATALOG, {});

export interface Step {
  beat: number;
  /** Short label for the step dots and the live region. */
  label: string;
  title: string;
  body: string;
  cli: TermLine[];
  place: Record<RowKey, Col | null>;
  /** The agent column shows its first (rejected) attempt. */
  firstAttempt?: boolean;
  /** The whole file bounced off the validator. */
  rejected?: boolean;
  edited?: boolean;
}

const all = (col: Col): Record<RowKey, Col | null> => ({ welcome: col, items: col, checkout: col, checkoutEdited: null });

export const STEPS: Step[] = [
  {
    beat: 0,
    label: 'Write',
    title: STORY[0].title,
    body: `${STORY[0].body} ${CLAIMS.dedupe}`,
    cli: [{ kind: 'out', text: "<h1>{__('Welcome back, {name}', { name })}</h1>" }],
    place: all('source'),
  },
  {
    beat: 1,
    label: 'Extract',
    title: STORY[1].title,
    body: `${STORY[1].body} ${CLAIMS.selfContained}`,
    cli: [...TRANSCRIPT.extract, ...TRANSCRIPT.brief.slice(0, 2)],
    place: all('brief'),
  },
  {
    beat: 2,
    label: 'Translate',
    title: STORY[2].title,
    body: `${STORY[2].body} This is the only column where the text changes.`,
    cli: [{ kind: 'info', text: 'agent reads locales/.work/es.brief.json → writes es.out.json' }],
    place: all('agent'),
    firstAttempt: true,
  },
  {
    beat: 3,
    label: 'Reject',
    title: STORY[3].title,
    body: `The agent renamed {name} to {nombre}. ${CLAIMS.rejectAll}`,
    cli: [
      { kind: 'cmd', text: 'duckalize translate apply es.out.json' },
      ...FIRST_ATTEMPT_DIAGNOSTICS.map(
        (d): TermLine => ({ kind: d.severity === 'error' ? 'err' : 'warn', text: `${d.severity}[${d.code}] ${d.id} — ${d.message}` })
      ),
      { kind: 'err', text: '✗ es: rejected — nothing written.' },
    ],
    place: all('agent'),
    firstAttempt: true,
    rejected: true,
  },
  {
    beat: 3,
    label: 'Accept',
    title: 'Fixed, then checked again',
    body: 'The agent puts {name} back. Same checks, same rules: this time every entry passes and is merged.',
    cli: TRANSCRIPT.applied,
    place: all('checked'),
  },
  {
    beat: 4,
    label: 'Ship',
    title: STORY[4].title,
    body: `${CLAIMS.partialShips} ${CLAIMS.fallback}`,
    cli: TRANSCRIPT.check,
    place: all('shipped'),
  },
  {
    beat: 4,
    label: 'Edit',
    title: 'Edit the English, get a new ID',
    body: `“Checkout” becomes “${EDITED_CHECKOUT}”. ${CLAIMS.editOrphans} Until it's translated, the button renders the inline English.`,
    cli: [
      { kind: 'cmd', text: 'duckalize translate status' },
      { kind: 'out', text: 'es: 2/3 translated, 1 missing 1 orphaned' },
    ],
    place: { welcome: 'shipped', items: 'shipped', checkout: 'orphan', checkoutEdited: 'brief' },
    edited: true,
  },
];

export interface CellText {
  id: string;
  text: string;
  /** Extra forms of a plural, shown as a count. */
  forms?: number;
  /** Text came from the agent (set in the judgment face). */
  translated?: boolean;
}

const pluralOther = (m: Record<string, string | undefined>) => m.other ?? '';

/** What a row shows in a given column. */
export function cellText(row: RowKey, col: Col, step: Step): CellText {
  if (row === 'checkoutEdited') return { id: EDITED_ID, text: EDITED_CHECKOUT };
  const entry = MESSAGES[row];
  const es = ES_CATALOG[entry.id as keyof typeof ES_CATALOG];
  const translatedCol = col === 'agent' || col === 'checked' || col === 'shipped' || col === 'orphan';
  if (!translatedCol) {
    return typeof entry.message === 'string'
      ? { id: entry.id, text: entry.message }
      : { id: entry.id, text: pluralOther(entry.message), forms: Object.keys(entry.message).length };
  }
  if (row === 'welcome' && step.firstAttempt) {
    return { id: entry.id, text: FIRST_ATTEMPT.translations[entry.id] as string, translated: true };
  }
  return typeof es === 'string'
    ? { id: entry.id, text: es, translated: true }
    : { id: entry.id, text: pluralOther(es), forms: Object.keys(es).length, translated: true };
}

export function refFor(row: RowKey): string {
  return row === 'checkoutEdited' ? MESSAGES.checkout.ref : MESSAGES[row].ref;
}
