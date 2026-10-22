import {
  BAD_OUTPUTS,
  BRIEF_ENTRY,
  ES_CATALOG,
  ES_PLURAL_CATEGORIES,
  STORY,
  TRANSCRIPT,
  type TermLine,
} from '../shared/facts.ts';

/**
 * The session as a timeline of events (ms). Every CLI line comes from
 * TRANSCRIPT, except EDITED_* below, which were captured the same way:
 * a real `duckalize` 0.1.0 run on the demo after renaming 'Checkout'.
 */
export const EDITED_SOURCE = "      <button>{__('Check out')}</button>";
export const EDITED_STRING = 'Check out';
export const EDITED_TRANSCRIPT: TermLine[] = [
  { kind: 'cmd', text: 'duckalize extract' },
  { kind: 'ok', text: '✓ 3 unique messages from 3 calls in 1 file (6ms) → locales/en.json' },
  { kind: 'cmd', text: 'duckalize translate status' },
  { kind: 'warn', text: 'es: 2/3 translated, 1 missing 1 orphaned' },
];

export type Actor = 'you' | 'cli' | 'agent';

interface Base {
  key: number;
  chapter: number;
  actor: Actor;
  at: number;
}
export type Ev =
  | (Base & { type: 'cmd'; text: string; dur: number })
  | (Base & { type: 'out'; kind: TermLine['kind']; text: string })
  | (Base & { type: 'note'; text: string })
  | (Base & { type: 'file'; verb: 'reads' | 'writes'; path: string })
  | (Base & { type: 'code'; text: string; tone: 'plain' | 'bad' | 'good' })
  | (Base & { type: 'highlight'; index: number })
  | (Base & { type: 'edit' })
  | (Base & { type: 'render' });

const CHAR_MS = 34;
const LINE_MS = 240;
const STREAM_MS = 70;

function build() {
  const events: Ev[] = [];
  const chapterStarts: number[] = [];
  let t = 0;
  let chapter = 0;
  let key = 0;
  // Distributive Omit, so each variant keeps its own fields.
  type EvInput = Ev extends infer E ? (E extends Ev ? Omit<E, 'key' | 'chapter' | 'at'> : never) : never;
  const push = (ev: EvInput) => {
    events.push({ ...ev, key: key++, chapter, at: t } as Ev);
  };
  const begin = (i: number) => {
    chapter = i;
    chapterStarts[i] = t;
  };
  const wait = (ms: number) => {
    t += ms;
  };
  const term = (lines: TermLine[]) => {
    for (const line of lines) {
      if (line.kind === 'cmd') {
        const dur = line.text.length * CHAR_MS;
        push({ type: 'cmd', actor: 'cli', text: line.text, dur });
        wait(dur + 420);
      } else {
        push({ type: 'out', actor: 'cli', kind: line.kind, text: line.text });
        wait(line.kind === 'err' || line.kind === 'warn' ? LINE_MS * 2 : LINE_MS);
      }
    }
    wait(1000);
  };
  const stream = (value: unknown, tone: 'plain' | 'bad' | 'good') => {
    for (const text of JSON.stringify(value, null, 2).split('\n')) {
      push({ type: 'code', actor: 'agent', text, tone });
      wait(STREAM_MS);
    }
    wait(500);
  };

  // 1 · Write English inline
  begin(0);
  wait(400);
  for (const index of [0, 1, 2]) {
    push({ type: 'highlight', actor: 'you', index });
    wait(1100);
  }

  // 2 · Extract a brief
  begin(1);
  term([...TRANSCRIPT.extract, ...TRANSCRIPT.status, ...TRANSCRIPT.brief]);

  // 3 · Any agent translates — the only pane where judgment happens
  begin(2);
  push({ type: 'file', actor: 'agent', verb: 'reads', path: 'locales/.work/es.brief.json' });
  wait(500);
  push({
    type: 'note',
    actor: 'agent',
    text: `3 entries for es. Plural categories: ${ES_PLURAL_CATEGORIES.join(', ')}.`,
  });
  wait(700);
  stream(BRIEF_ENTRY, 'plain');
  push({ type: 'file', actor: 'agent', verb: 'writes', path: 'es.out.json' });
  wait(400);
  stream(BAD_OUTPUTS.rejected, 'bad');

  // 4 · Code checks the work
  begin(3);
  term(TRANSCRIPT.rejected);
  wait(1400); // let the rejection land before the agent answers it
  push({
    type: 'note',
    actor: 'agent',
    text: 'Rejected. Keep {name} as written, drop the unknown ID, cover every entry.',
  });
  wait(800);
  push({ type: 'file', actor: 'agent', verb: 'writes', path: 'es.out.json' });
  wait(400);
  stream({ locale: 'es', translations: ES_CATALOG }, 'good');
  term([...TRANSCRIPT.applied, ...TRANSCRIPT.check]);

  // 5 · Ship a partial catalog
  begin(4);
  push({ type: 'edit', actor: 'you' });
  wait(1200);
  term(EDITED_TRANSCRIPT);
  push({ type: 'render', actor: 'you' });
  wait(2600);

  return { events, chapterStarts, duration: t };
}

export const SCRIPT = build();

export const CHAPTERS = STORY.map((beat, i) => ({
  ...beat,
  start: SCRIPT.chapterStarts[i]!,
  end: SCRIPT.chapterStarts[i + 1] ?? SCRIPT.duration,
}));

export function chapterAt(t: number): number {
  let index = 0;
  CHAPTERS.forEach((c, i) => {
    if (t >= c.start) index = i;
  });
  return index;
}

/** The actor speaking at time t, for the mobile pane that follows playback. */
export function actorAt(t: number): Actor {
  let actor: Actor = 'you';
  for (const ev of SCRIPT.events) {
    if (ev.at > t) break;
    actor = ev.actor;
  }
  return actor;
}
