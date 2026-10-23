import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLocale } from '../shared/real.ts';

gsap.registerPlugin(ScrollTrigger);
import { Duck } from '../design/index.ts';
import { createDuck, messageId } from '../shared/real.ts';
import { useT } from './i18n.tsx';
import './flow.css';

// Curated examples illustrate the configured agent's workflow. This is not
// a live model call. Rendering still goes through the actual runtime.
const SCENES = [
  { title: 'A little space for your next big idea.', body: 'Start a project and see where it takes you.', action: 'Create a project', icon: '✳' },
  { title: 'Good things happen together.', body: 'Invite someone to make something with you.', action: 'Invite a teammate', icon: '↗' },
  { title: 'You made something wonderful.', body: 'Your latest update is ready for the world.', action: 'Publish your update', icon: '✦' },
] as const;
const TRANSLATIONS = {
  es: {
    warm: [
      ['Un espacio para tu próxima gran idea.', 'Crea un proyecto y descubre hasta dónde te lleva.', 'Crea tu proyecto'],
      ['Lo bueno se hace en compañía.', 'Invita a alguien a crear algo contigo.', 'Invita a tu equipo'],
      ['Creaste algo increíble.', 'Tu última actualización está lista para el mundo.', 'Comparte tu actualización'],
    ],
    concise: [
      ['Tu próxima idea empieza aquí.', 'Crea un proyecto para empezar.', 'Crear proyecto'],
      ['Crea en equipo.', 'Invita a alguien a colaborar.', 'Invitar colaborador'],
      ['Listo para publicar.', 'Comparte tu última actualización.', 'Publicar'],
    ],
  },
  fr: {
    warm: [
      ['Une place pour votre prochaine grande idée.', 'Créez un projet et voyez où il vous mène.', 'Créez votre projet'],
      ['Les belles choses se font ensemble.', 'Invitez quelqu’un à créer avec vous.', 'Invitez votre équipe'],
      ['Vous avez créé quelque chose de formidable.', 'Votre dernière mise à jour est prête pour le monde.', 'Partagez votre nouveauté'],
    ],
    concise: [
      ['Votre prochaine idée commence ici.', 'Créez un projet pour commencer.', 'Créer un projet'],
      ['Créez en équipe.', 'Invitez quelqu’un à collaborer.', 'Inviter'],
      ['Prêt à publier.', 'Partagez votre dernière mise à jour.', 'Publier'],
    ],
  },
};
type Voice = 'warm' | 'concise';
type Language = 'es' | 'fr';

function VoiceControls({ voice, onChange, mobile = false }: {
  voice: Voice;
  onChange: (voice: Voice) => void;
  mobile?: boolean;
}) {
  const { __, __s } = useT();
  return (
    <div className={`flow-voice-choice${mobile ? ' flow-voice-mobile' : ''}`}>
      <span>{__('Try a voice. Watch the translation change.')}</span>
      <div className="flow-voice" role="group" aria-label={__s('Translation style')}>
        <button type="button" aria-pressed={voice === 'warm'} onClick={() => onChange('warm')}>{__('Warm & friendly')}</button>
        <button type="button" aria-pressed={voice === 'concise'} onClick={() => onChange('concise')}>{__('Short & direct')}</button>
      </div>
    </div>
  );
}

export function Flow() {
  const { __, __s } = useT();
  const root = useRef<HTMLElement>(null);
  const story = useRef<ScrollTrigger | null>(null);
  const [locale] = useLocale();
  const [cinematic, setCinematic] = useState(false);
  const [chapter, setChapter] = useState(3);
  const [interactive, setInteractive] = useState(false);
  const seek = (index: number) => {
    setInteractive(false);
    const trigger = story.current;
    if (!trigger) return;
    const progress = [0.03, 0.31, 0.56, 0.94][index]!;
    window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'smooth' });
  };
  // Controls reveal the result in place; they never move the visitor's scroll.
  const explore = () => setInteractive(true);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 1050px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      element.classList.add('flow-cinematic');
      setCinematic(true);
      setChapter(0);
      let currentChapter = -1;
      // GSAP tweens resolved colors, so read the theme's tokens once per build.
      const token = (name: string) => getComputedStyle(element).getPropertyValue(`--dk-color-${name}`).trim();
      const ring = token('accent-duck');
      const lineHit = token('terminal-hit');
      const copyHit = token('wash-duck');
      const timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: element.querySelector('.flow-theater'),
          pin: true,
          start: 'top 24px',
          end: () => `+=${Math.round(window.innerHeight * 0.9)}`,
          scrub: 0.25,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => {
            const next = trigger.progress < 0.14 ? 0 : trigger.progress < 0.44 ? 1 : trigger.progress < 0.68 ? 2 : 3;
            if (next !== currentChapter) { currentChapter = next; setChapter(next); }
          },
        },
      });
      story.current = timeline.scrollTrigger!;
      // English starts fully readable. Translation lands in the first half;
      // the remaining scroll is room to compare and try the voice controls.
      timeline
        .fromTo('.flow-app', { rotateZ: 1.2, scale: 0.97 }, { rotateZ: 0, scale: 1, duration: 0.3 }, 0.08)
        .fromTo('.flow-voice-choice', { boxShadow: `0 0 0 0px ${ring}` }, { boxShadow: `0 0 0 4px ${ring}`, duration: 0.08 }, 0.47)
        .to('.flow-voice-choice', { boxShadow: `0 0 0 0px ${ring}`, duration: 0.1 }, 0.62)
        .fromTo('.flow-progress-fill', { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 0);
      ['title', 'body', 'action'].forEach((message, index) => {
        const at = 0.15 + index * 0.085;
        timeline
          .fromTo(`.flow-copy-stack[data-message="${message}"] .flow-source-copy`, { opacity: 1 }, { opacity: 0, duration: 0.07 }, at)
          .fromTo(`.flow-copy-stack[data-message="${message}"] .flow-translated-copy`, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.1 }, at)
          .fromTo(`.flow-line[data-message="${message}"]`, { backgroundColor: 'transparent' }, { backgroundColor: lineHit, duration: 0.045 }, at)
          .fromTo(`.flow-copy-stack[data-message="${message}"]`, { backgroundColor: 'transparent' }, { backgroundColor: copyHit, duration: 0.045 }, at)
          .to(`.flow-line[data-message="${message}"], .flow-copy-stack[data-message="${message}"]`, { backgroundColor: 'transparent', duration: 0.1 }, at + 0.09);
      });
      let alive = true;
      void document.fonts.ready.then(() => { if (alive) ScrollTrigger.refresh(); });
      return () => {
        alive = false;
        story.current = null;
        element.classList.remove('flow-cinematic');
        setCinematic(false);
        setChapter(3);
      };
    }, element);
    return () => media.revert();
  }, [locale]);

  const [scene, setScene] = useState(0);
  const [voice, setVoice] = useState<Voice>('warm');
  const [language, setLanguage] = useState<Language>('es');
  const [shipped, setShipped] = useState({ scene, voice, language });
  const [phase, setPhase] = useState<'building' | 'translating' | 'ready'>('ready');
  useEffect(() => {
    if (scene === shipped.scene && voice === shipped.voice && language === shipped.language) {
      setPhase('ready');
      return;
    }
    setPhase('building');
    const translate = setTimeout(() => setPhase('translating'), 350);
    const apply = setTimeout(() => {
      setShipped({ scene, voice, language });
      setPhase('ready');
    }, 450);
    return () => { clearTimeout(translate); clearTimeout(apply); };
  }, [scene, voice, language, shipped]);
  const source = SCENES[scene]!;
  const output = useMemo(() => {
    const english = SCENES[shipped.scene]!;
    const messages = [english.title, english.body, english.action];
    const translated = TRANSLATIONS[shipped.language][shipped.voice][shipped.scene]!;
    const runtime = createDuck({ sourceLocale: 'en', locale: shipped.language, onMissing: false });
    runtime.load(shipped.language, Object.fromEntries(messages.map((message, i) => [messageId(message), translated[i]!])));
    return messages.map((message) => runtime.__(message));
  }, [shipped]);
  const labels = [__('A new project'), __('An invitation'), __('A launch')];
  return (
    <section ref={root} className="flow" data-chapter={chapter} data-exploring={interactive || undefined} id="see-it" aria-labelledby="flow-title" data-phase={phase}>
      <div className="fk-wrap">
        <div className="flow-heading">
          <div><p className="eyebrow">{__('Stay in your flow')}</p><h2 id="flow-title">{__('You build it. Your agent translates it.')}</h2></div>
          <p>{__('Pick what you’re building. Choose a voice. The English stays in your code; your agent takes care of the rest.')}</p>
        </div>
        <div className="flow-theater">
        <nav className="flow-story" aria-label={__s('Workflow chapters')}>
          <div className="flow-chapters">{[__('Write English'), __('Your agent translates'), __('Your voice'), __('Keep building')].map((label, index) => <button type="button" key={index} aria-current={(interactive ? 3 : chapter) === index ? 'step' : undefined} onClick={() => seek(index)}><span>0{index + 1}</span>{label}</button>)}</div>
          <button type="button" className="flow-skip" onClick={explore}>{__('Explore freely')} ↗</button>
          <div className="flow-progress" aria-hidden="true"><span className="flow-progress-fill" /></div>
        </nav>
        <div className="flow-controls">
        <div className="flow-scenes" role="group" aria-label={__s('What are you building?')}>
          {labels.map((label, index) => <button type="button" key={index} aria-pressed={scene === index} onClick={() => { explore(); setScene(index); }}><span aria-hidden="true">0{index + 1}</span>{label}</button>)}
        </div>
        <VoiceControls voice={voice} onChange={(value) => { explore(); setVoice(value); }} />
        </div>
        <div className="flow-stage">
          <div className="flow-editor">
            <header><span className="flow-dot" />App.tsx <span>{__('Always English')}</span></header>
            <div className="flow-code" lang="en" tabIndex={0} role="region" aria-label={__s('Example React component')}>
              <p><span>import</span> {'{ createDuck, DuckProvider, useDuck }'} from '@duckalization/react';</p>
              <p>const duck = createDuck({'{'} sourceLocale: 'en' {'}'});</p>
              <p>function Screen() {'{'}</p>
              <p>  const {'{ __ }'} = useDuck();</p>
              <p>  return &lt;section&gt;</p>
              <p className="flow-line" data-message="title">    &lt;h1&gt;{'{'}__(<b key={`${scene}-title`}>'{source.title}'</b>){'}'}&lt;/h1&gt;</p>
              <p className="flow-line" data-message="body">    &lt;p&gt;{'{'}__(<b key={`${scene}-body`}>'{source.body}'</b>){'}'}&lt;/p&gt;</p>
              <p className="flow-line" data-message="action">    &lt;button&gt;{'{'}__(<b key={`${scene}-action`}>'{source.action}'</b>){'}'}&lt;/button&gt;</p>
              <p>  &lt;/section&gt;;</p><p>{'}'}</p>
              <p>export default function App() {'{'}</p>
              <p>  return &lt;DuckProvider duck={'{duck}'}&gt;&lt;Screen /&gt;&lt;/DuckProvider&gt;;</p><p>{'}'}</p>
            </div>
            <p className="flow-code-hint">{__('Scroll the code sideways to read each line.')}</p>
            <div className="flow-agent"><Duck on="terminal" mood={phase === 'translating' || (cinematic && !interactive && chapter === 1) ? 'reading' : 'happy'} /><span role="status" aria-live="polite">{cinematic && !interactive && chapter < 3 ? (chapter === 0 ? __('You’re building…') : chapter === 1 ? __('Your agent is translating…') : __('Try a voice. Watch the translation change.')) : phase === 'building' ? __('You’re building…') : phase === 'translating' ? __('Your agent is translating…') : __('Translations are up to date.')}</span><span className="flow-agent-indicator" aria-hidden="true">{phase === 'ready' && (!cinematic || interactive || chapter === 3) ? '✓' : '···'}</span></div>
          </div>
          <div className="flow-preview">
            <VoiceControls mobile voice={voice} onChange={(value) => { explore(); setVoice(value); }} />
            <header><span className="flow-preview-label">{__('English →')}</span><select value={language} aria-label={__s('Translate into')} onChange={(event) => { explore(); setLanguage(event.target.value as Language); }}><option value="es">Español</option><option value="fr">Français</option></select></header>
            <div className="flow-app" lang={shipped.language} >
              <div className="flow-app-brand"><span aria-hidden="true">◒</span> Sunday <span className="flow-current-language">{cinematic && !interactive && chapter < 2 ? (chapter === 0 ? 'EN' : `EN → ${shipped.language.toUpperCase()}`) : shipped.language.toUpperCase()}</span></div>
              <div className="flow-app-icon" aria-hidden="true">{SCENES[shipped.scene]!.icon}</div>
              <h3 className="flow-copy-stack" data-message="title"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || interactive || chapter >= 2}>{SCENES[shipped.scene]!.title}</span><span className="flow-translated-copy" aria-hidden={cinematic && !interactive && chapter < 2}>{output[0]}</span></h3>
              <p className="flow-copy-stack" data-message="body"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || interactive || chapter >= 2}>{SCENES[shipped.scene]!.body}</span><span className="flow-translated-copy" aria-hidden={cinematic && !interactive && chapter < 2}>{output[1]}</span></p>
              <span className="flow-app-cta"><span className="flow-copy-stack" data-message="action"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || interactive || chapter >= 2}>{SCENES[shipped.scene]!.action}</span><span className="flow-translated-copy" aria-hidden={cinematic && !interactive && chapter < 2}>{output[2]}</span></span><span aria-hidden="true">↗</span></span>
              <div className="flow-app-decoration" aria-hidden="true"><i /><i /><i /></div>
            </div>
          </div>
          <div className="flow-style">
            <div><span className="eyebrow">{__('Your voice, in every language')}</span><p>{__('A style guide you set once. A voice your agent carries forward.')}</p></div>
            <pre lang="en"><code>{JSON.stringify({ style: { '*': voice === 'warm' ? 'Warm, conversational UI copy. Make people feel welcome.' : 'Short, direct UI copy. Keep every action clear.' } }, null, 2)}</code></pre>
          </div>
        </div>
        <p className="flow-scroll-hint">{!interactive && chapter < 2 ? __('Scroll to see English become your next language') : __('Make it yours. Try another scene or voice.')} <span aria-hidden="true">{!interactive && chapter < 2 ? '↓' : '↗'}</span></p>
        </div>
        <p className="flow-caption">{__('Interactive illustration with example translations. In your project, your configured coding agent does the translating.')}</p>
      </div>
    </section>
  );
}
