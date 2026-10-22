import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ES_CATALOG, MESSAGES, SOURCE_CATALOG, TRANSCRIPT } from '../../shared/facts.ts';
import { useInView, useReducedMotion } from '../../shared/motion.ts';
import { createDuck, validateOutput, type TranslateDiagnostic, type TranslationOutput } from '../../shared/real.ts';
import { Duck, type DuckMood } from './Duck.tsx';
import { useT } from './i18n.tsx';

// The agent's two attempts. The first invents {nombre}; the second is the
// real catalog. Both go through the real validator — nothing below is canned.
const ATTEMPT_1: TranslationOutput = {
  locale: 'es',
  translations: { ...ES_CATALOG, '105cueagvb5': 'Hola de nuevo, {nombre}' },
};
const ATTEMPT_2: TranslationOutput = { locale: 'es', translations: ES_CATALOG };

const asCli = (d: TranslateDiagnostic) => `${d.severity}[${d.code}] ${d.id} — ${d.message}`;
const DIAG_1 = validateOutput(ATTEMPT_1, SOURCE_CATALOG, {});
const DIAG_2 = validateOutput(ATTEMPT_2, SOURCE_CATALOG, {});
const REJECTED = DIAG_1.some((d) => d.severity === 'error');

const APPLY_CMD = TRANSCRIPT.rejected[0]!.text;
const LOG = {
  extract: [`$ ${TRANSCRIPT.extract[0]!.text}`, TRANSCRIPT.extract[1]!.text, `$ ${TRANSCRIPT.brief[0]!.text}`, TRANSCRIPT.brief[1]!.text],
  agent: ['# any agent reads the brief and writes es.out.json'],
  rejected: [`$ ${APPLY_CMD}`, ...DIAG_1.map(asCli), TRANSCRIPT.rejected.at(-1)!.text],
  fix: ['# the agent fixes {nombre} → {name} and hands it back'],
  applied: [`$ ${APPLY_CMD}`, ...DIAG_2.map(asCli), TRANSCRIPT.applied[1]!.text],
  check: [`$ ${TRANSCRIPT.check[0]!.text}`, TRANSCRIPT.check[1]!.text],
};

/** The rendered result: the real runtime, the real es.json, one string added after the brief. */
const preview = createDuck({ sourceLocale: 'en', locale: 'es', onMissing: false });
preview.load('es', ES_CATALOG);

type Face = 'code' | 'brief' | 'attempt1' | 'rejected' | 'attempt2' | 'applied';

const pluralText = (m: { one?: string; other?: string }) => m.other ?? '';

function PacketFace({ face }: { face: Face }) {
  if (face === 'code') {
    return (
      <div className="dk-face">
        <p className="dk-face-tab">src/Cart.tsx</p>
        <ul className="dk-face-rows dk-code">
          <li>__('Welcome back, {'{name}'}', …)</li>
          <li>__({'{'} one: '{'{count}'} item…', … {'}'})</li>
          <li>__('Checkout')</li>
        </ul>
      </div>
    );
  }
  const rows: Array<[string, string, boolean?]> =
    face === 'brief'
      ? [
          [MESSAGES.welcome.id, MESSAGES.welcome.message],
          [MESSAGES.items.id, pluralText(MESSAGES.items.message)],
          [MESSAGES.checkout.id, MESSAGES.checkout.message],
        ]
      : [
          [
            MESSAGES.welcome.id,
            face === 'attempt1' || face === 'rejected'
              ? (ATTEMPT_1.translations['105cueagvb5'] as string)
              : ES_CATALOG['105cueagvb5'],
            face === 'rejected',
          ],
          [MESSAGES.items.id, pluralText(ES_CATALOG['70z5uwb2of'])],
          [MESSAGES.checkout.id, ES_CATALOG.ak3j7ue6c3],
        ];
  const tab = face === 'brief' ? 'es.brief.json' : face === 'applied' ? 'es.json' : 'es.out.json';
  return (
    <div className="dk-face" data-face={face}>
      <p className="dk-face-tab">{tab}</p>
      <ul className="dk-face-rows">
        {rows.map(([id, text, bad]) => (
          <li key={id} data-bad={bad ? '' : undefined}>
            <span className="dk-face-id">{id}</span>
            <span className="dk-face-text">{text}</span>
          </li>
        ))}
      </ul>
      {face === 'rejected' && <p className="dk-stamp">rejected</p>}
      {face === 'applied' && <p className="dk-stamp dk-stamp-ok">✓ applied</p>}
    </div>
  );
}

interface Step {
  station: number;
  face: Face;
  log: string[];
  mood?: DuckMood;
  /** Duck inspects for this long (showing `face`) before `then` takes over. */
  read?: number;
  then?: { face: Face; mood: DuckMood; log: string[] };
  hold: number;
}

const STEPS: Step[] = [
  { station: 0, face: 'code', log: [], hold: 1300 },
  { station: 1, face: 'brief', log: LOG.extract, hold: 1900 },
  { station: 2, face: 'attempt1', log: LOG.agent, hold: 1500 },
  {
    station: 3,
    face: 'attempt1',
    log: [],
    mood: 'reading',
    read: 1100,
    then: { face: REJECTED ? 'rejected' : 'applied', mood: 'reject', log: LOG.rejected },
    hold: 2600,
  },
  { station: 2, face: 'attempt2', log: LOG.fix, mood: 'idle', hold: 1500 },
  {
    station: 3,
    face: 'attempt2',
    log: [],
    mood: 'reading',
    read: 900,
    then: { face: 'applied', mood: 'happy', log: LOG.applied },
    hold: 1700,
  },
  { station: 4, face: 'applied', log: LOG.check, mood: 'idle', hold: 0 },
];

/** Static storyboard frames for reduced motion: one face and its log per station. */
const FRAMES: Array<{ face: Face; log: string[]; mood?: DuckMood }> = [
  { face: 'code', log: [] },
  { face: 'brief', log: LOG.extract },
  { face: 'attempt1', log: LOG.agent },
  { face: 'rejected', log: [...LOG.rejected, ...LOG.fix, ...LOG.applied], mood: 'reject' },
  { face: 'applied', log: LOG.check },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Pipeline() {
  const { __, __s } = useT();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const positions = useRef<Array<{ x: number; y: number }>>([]);
  const horizontal = useRef(true);
  const current = useRef(0);
  const run = useRef(0);
  const inView = useInView(sectionRef, '0px 0px -35% 0px');

  const [face, setFace] = useState<Face>('code');
  const [active, setActive] = useState(0);
  const [mood, setMood] = useState<DuckMood>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [faceKey, setFaceKey] = useState(0);

  /** Read slot geometry (layout reads only); the packet is sized once to the slot. */
  const measure = useCallback(() => {
    const track = trackRef.current;
    const packet = packetRef.current;
    if (!track || !packet) return;
    const origin = track.getBoundingClientRect();
    positions.current = slotRefs.current.map((slot) => {
      const r = slot!.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top };
    });
    const first = slotRefs.current[0]!.getBoundingClientRect();
    packet.style.width = `${first.width}px`;
    packet.style.height = `${first.height}px`;
    const [a, b] = positions.current;
    horizontal.current = Boolean(a && b && Math.abs(b.x - a.x) > Math.abs(b.y - a.y));
    const at = positions.current[current.current]!;
    packet.getAnimations().forEach((anim) => anim.cancel());
    packet.style.transform = `translate(${at.x}px, ${at.y}px)`;
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current!);
    return () => ro.disconnect();
  }, [measure, reduced]);

  const moveTo = useCallback(async (to: number, token: number) => {
    const packet = packetRef.current;
    const from = positions.current[current.current];
    const target = positions.current[to];
    if (!packet || !from || !target || token !== run.current) return;
    if (to === current.current) return;
    const back = to < current.current;
    // Narrow screens: the stage is a horizontal scroller, so follow the packet.
    const scroller = scrollerRef.current;
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollTo({ left: target.x - (scroller.clientWidth - packet.offsetWidth) / 2, behavior: 'smooth' });
    }
    const lerp = (t: number) => ({ x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t });
    const hop = horizontal.current ? -12 : 0;
    const frame = (t: number, rotate: number, lift: number) => {
      const p = lerp(t);
      return { transform: `translate(${p.x}px, ${p.y + lift}px) rotate(${rotate}deg)` };
    };
    // A waddle: two little hops with a rock either way. Transform only.
    const anim = packet.animate(
      [
        frame(0, 0, 0),
        { ...frame(0.3, back ? 4 : -4, hop), offset: 0.3 },
        { ...frame(0.7, back ? -4 : 4, hop), offset: 0.7 },
        frame(1, 0, 0),
      ],
      { duration: back ? 650 : 850, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' }
    );
    current.current = to;
    await anim.finished.catch(() => undefined);
    if (token !== run.current) return;
    packet.style.transform = `translate(${target.x}px, ${target.y}px)`;
    anim.cancel();
  }, []);

  const play = useCallback(async () => {
    const token = ++run.current;
    current.current = 0;
    measure();
    setDone(false);
    const show = (f: Face) => {
      setFace(f);
      setFaceKey((k) => k + 1);
    };
    for (const step of STEPS) {
      await moveTo(step.station, token);
      if (token !== run.current) return;
      setActive(step.station);
      show(step.face);
      setMood(step.mood ?? 'idle');
      setLog(step.log);
      if (step.read !== undefined && step.then) {
        await sleep(step.read);
        if (token !== run.current) return;
        show(step.then.face);
        setMood(step.then.mood);
        setLog(step.then.log);
      }
      await sleep(step.hold);
      if (token !== run.current) return;
    }
    setDone(true);
  }, [measure, moveTo]);

  useEffect(() => {
    if (inView && !reduced) void play();
  }, [inView, reduced, play]);

  // Abandon any running sequence when leaving the page or switching to reduced motion.
  useEffect(() => () => void ++run.current, []);
  useEffect(() => {
    if (reduced) {
      run.current++;
      setDone(true);
    }
  }, [reduced]);

  const stations = [
    { name: __('Your code'), beat: __('You write English inline, right where it renders. Nothing else in your code changes.') },
    {
      name: __('Brief'),
      beat: __(
        "I hash each string into an ID and write a brief: the text, where it's used, the plural forms the language needs. The agent needs no repo access."
      ),
    },
    { name: __('Any agent'), beat: __('Any agent translates the brief. I never call a model. Judgment is its job.') },
    {
      name: __('Checks'),
      beat: __(
        'Then I check everything: unknown IDs, empty strings, malformed plurals, invented placeholders. One error and the whole file bounces. Nothing is written.'
      ),
    },
    {
      name: __('Catalog'),
      beat: __('Anything not translated yet falls back to your English, so a partial catalog still ships.'),
    },
  ];

  return (
    <section className="dk-pipe" ref={sectionRef} aria-labelledby="dk-pipe-title" data-reduced={reduced ? '' : undefined}>
      <div className="dk-wrap">
        <header className="dk-pipe-head">
          <h2 id="dk-pipe-title">{__('How a string gets translated')}</h2>
          <p className="dk-pipe-motto">
            <Duck className="dk-duck-inline" />
            <span>{__('It does the judgment. I do the checking.')}</span>
          </p>
        </header>

        <div className="dk-stage-scroll" role="region" ref={scrollerRef} tabIndex={reduced ? undefined : 0} aria-label={__s('Pipeline stations')}>
        <div className="dk-stage">
          <ol className="dk-track" ref={trackRef}>
            {stations.map((s, i) => (
              <li key={i} className="dk-station" data-active={!reduced && active === i ? '' : undefined} data-checks={i === 3 ? '' : undefined}>
                <div className="dk-slot" ref={(el) => void (slotRefs.current[i] = el)}>
                  {reduced ? (
                    <PacketFace face={FRAMES[i]!.face} />
                  ) : (
                    <span className="dk-slot-num" aria-hidden="true">
                      {i + 1}
                    </span>
                  )}
                  {i === 3 && <Duck className="dk-inspector" mood={reduced ? 'reject' : mood} />}
                </div>
                <h3 className="dk-station-name">
                  <span className="dk-station-n" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.name}
                </h3>
                <p className="dk-station-beat">{s.beat}</p>
                {reduced && FRAMES[i]!.log.length > 0 && (
                  <pre className="dk-frame-log">{FRAMES[i]!.log.join('\n')}</pre>
                )}
              </li>
            ))}
          </ol>
          {!reduced && (
            <div className="dk-packet" ref={packetRef} aria-hidden="true">
              <div key={faceKey} className="dk-packet-in">
                <PacketFace face={face} />
              </div>
            </div>
          )}
        </div>
        </div>

        {!reduced && (
          <div className="dk-console">
            <pre className="dk-log" aria-live="polite">
              {log.length ? log.join('\n') : ' '}
            </pre>
            <button type="button" className="dk-btn dk-replay" onClick={() => void play()}>
              {__('Play again')}
            </button>
          </div>
        )}

        <figure className="dk-preview" data-shown={done ? '' : undefined}>
          <figcaption>{__('Your app, in Spanish')}</figcaption>
          <div className="dk-preview-app" lang="es">
            <p className="dk-preview-h">{preview.__('Welcome back, {name}', { name: 'Ana' })}</p>
            <p>{preview.__({ one: '{count} item in your cart', other: '{count} items in your cart' }, { count: 3 })}</p>
            <p>
              <span className="dk-preview-btn">{preview.__('Checkout')}</span>
            </p>
            <p className="dk-preview-late" lang="en">
              {preview.__('Track your order')}
            </p>
          </div>
          <p className="dk-preview-note">
            {__('The last line was added after the brief. It is not in es.json yet, so it renders in English.')}
          </p>
        </figure>
      </div>
    </section>
  );
}
