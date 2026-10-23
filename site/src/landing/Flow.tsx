import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useLocale } from '../shared/real.ts';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
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

export function Flow() {
  const { __, __s } = useT();
  const root = useRef<HTMLElement>(null);
  const story = useRef<ScrollTrigger | null>(null);
  const [locale] = useLocale();
  const [cinematic, setCinematic] = useState(false);
  const [chapter, setChapter] = useState(3);
  const seek = (index: number) => {
    const trigger = story.current;
    if (!trigger) return;
    const progress = [0.08, 0.35, 0.62, 0.96][index]!;
    window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'smooth' });
  };
  const explore = () => { if (chapter < 3) seek(3); };

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 1050px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      element.classList.add('flow-cinematic');
      setCinematic(true);
      setChapter(0);
      let currentChapter = -1;
      const timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: element.querySelector('.flow-theater'),
          pin: true,
          start: 'top 24px',
          end: () => `+=${Math.round(window.innerHeight * 2.8)}`,
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => {
            const next = trigger.progress < 0.25 ? 0 : trigger.progress < 0.5 ? 1 : trigger.progress < 0.8 ? 2 : 3;
            if (next !== currentChapter) { currentChapter = next; setChapter(next); }
          },
        },
      });
      story.current = timeline.scrollTrigger!;
      timeline
        .fromTo('.flow-line', { clipPath: 'inset(0 100% 0 0)', opacity: 0.2 }, { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.18, stagger: 0.04 }, 0)
        .fromTo('.flow-app', { rotateY: -9, rotateZ: 3, scale: 0.91, y: 20 }, { rotateY: 0, rotateZ: 0, scale: 1, y: 0, duration: 0.3 }, 0.55)
        .fromTo('.flow-style', { boxShadow: 'inset 0 0 0 0px #f8cc65' }, { boxShadow: 'inset 0 0 0 4px #f8cc65', duration: 0.1 }, 0.26)
        .fromTo('.flow-style pre', { opacity: 0.65, x: -8 }, { opacity: 1, x: 0, duration: 0.15 }, 0.28)
        .to('.flow-style', { boxShadow: 'inset 0 0 0 0px #f8cc65', duration: 0.15 }, 0.51)
        .fromTo('.flow-wire', { strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 0.8, duration: 0.17, stagger: 0.025 }, 0.48)
        .fromTo('.flow-parcel', { opacity: 0 }, { opacity: 1, duration: 0.04, stagger: 0.04 }, 0.52)
        .to('.flow-parcel', { opacity: 0, duration: 0.06 }, 0.8)
        .to('.flow-wire', { opacity: 0, duration: 0.15 }, 0.82)
        .fromTo('.flow-source-copy', { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0.66)
        .fromTo('.flow-translated-copy', { opacity: 0, y: 14, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.13, stagger: 0.045 }, 0.68)
        .fromTo('.flow-app-icon', { rotate: -25 }, { rotate: 0, duration: 0.16 }, 0.72)
        .fromTo('.flow-progress-fill', { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 0)
        .to({}, { duration: 0.12 }, 1);
      element.querySelectorAll<SVGCircleElement>('.flow-parcel').forEach((parcel, index) => {
        const wire = parcel.previousElementSibling as SVGPathElement;
        timeline.to(parcel, {
          motionPath: { path: wire, align: wire, alignOrigin: [0.5, 0.5] },
          duration: 0.22,
          ease: 'power1.inOut',
        }, 0.52 + index * 0.04);
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
    }, 1050);
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
    <section ref={root} className="flow" data-chapter={chapter} id="see-it" aria-labelledby="flow-title" data-phase={phase}>
      <div className="fk-wrap">
        <div className="flow-heading">
          <div><p className="eyebrow">{__('Stay in your flow')}</p><h2 id="flow-title">{__('You build it. Your agent translates it.')}</h2></div>
          <p>{__('Pick what you’re building. Choose a voice. The English stays in your code; your agent takes care of the rest.')}</p>
        </div>
        <div className="flow-theater">
        <nav className="flow-story" aria-label={__s('Workflow chapters')}>
          <div className="flow-chapters">{[__('Write English'), __('Set the voice'), __('Your agent translates'), __('Keep building')].map((label, index) => <button type="button" key={index} aria-current={chapter === index ? 'step' : undefined} onClick={() => seek(index)}><span>0{index + 1}</span>{label}</button>)}</div>
          <button type="button" className="flow-skip" onClick={() => seek(3)}>{__('Explore freely')} ↗</button>
          <div className="flow-progress" aria-hidden="true"><span className="flow-progress-fill" /></div>
        </nav>
        <div className="flow-scenes" role="group" aria-label={__s('What are you building?')}>
          {labels.map((label, index) => <button type="button" key={index} aria-pressed={scene === index} onClick={() => { explore(); setScene(index); }}><span aria-hidden="true">0{index + 1}</span>{label}</button>)}
        </div>
        <div className="flow-stage">
          <div className="flow-editor">
            <header><span className="flow-dot" />App.tsx <span>{__('Always English')}</span></header>
            <div className="flow-code" lang="en">
              <p><span>const</span> {'{ __ }'} = useDuck();</p>
              <p className="flow-code-muted">return (</p>
              <p>  &lt;section&gt;</p>
              <p className="flow-line">    &lt;h1&gt;{'{'}__(<b key={`${scene}-title`}>'{source.title}'</b>){'}'}&lt;/h1&gt;</p>
              <p className="flow-line">    &lt;p&gt;{'{'}__(<b key={`${scene}-body`}>'{source.body}'</b>){'}'}&lt;/p&gt;</p>
              <p className="flow-line">    &lt;button&gt;{'{'}__(<b key={`${scene}-action`}>'{source.action}'</b>){'}'}&lt;/button&gt;</p>
              <p>  &lt;/section&gt;</p><p className="flow-code-muted">);</p>
            </div>
            <div className="flow-agent"><Duck on="terminal" mood={phase === 'translating' || (cinematic && chapter === 2) ? 'reading' : 'happy'} /><span role="status" aria-live="polite">{cinematic && chapter < 3 ? (chapter === 0 ? __('You’re building…') : chapter === 1 ? __('Your style guide goes with every string.') : __('Your agent is translating…')) : phase === 'building' ? __('You’re building…') : phase === 'translating' ? __('Your agent is translating…') : __('Translations are up to date.')}</span><span className="flow-agent-indicator" aria-hidden="true">{phase === 'ready' && (!cinematic || chapter === 3) ? '✓' : '···'}</span></div>
          </div>
          <div className="flow-preview">
            <header><span className="flow-preview-label">{__('Your app, translated')}</span><select value={language} aria-label={__s('Preview language')} onChange={(event) => { explore(); setLanguage(event.target.value as Language); }}><option value="es">Español</option><option value="fr">Français</option></select></header>
            <div className="flow-app" lang={shipped.language} >
              <div className="flow-app-brand"><span aria-hidden="true">◒</span> Sunday <span aria-hidden="true">•••</span></div>
              <div className="flow-app-icon" aria-hidden="true">{SCENES[shipped.scene]!.icon}</div>
              <h3 className="flow-copy-stack"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || chapter >= 3}>{SCENES[shipped.scene]!.title}</span><span className="flow-translated-copy" aria-hidden={cinematic && chapter < 3}>{output[0]}</span></h3>
              <p className="flow-copy-stack"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || chapter >= 3}>{SCENES[shipped.scene]!.body}</span><span className="flow-translated-copy" aria-hidden={cinematic && chapter < 3}>{output[1]}</span></p>
              <span className="flow-app-cta"><span className="flow-copy-stack"><span className="flow-source-copy" lang="en" aria-hidden={!cinematic || chapter >= 3}>{SCENES[shipped.scene]!.action}</span><span className="flow-translated-copy" aria-hidden={cinematic && chapter < 3}>{output[2]}</span></span><span aria-hidden="true">↗</span></span>
              <div className="flow-app-decoration" aria-hidden="true"><i /><i /><i /></div>
            </div>
          </div>
          <svg className="flow-transport" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
            {[160, 210, 260].map((y, index) => <g key={y}><path className="flow-wire" d={`M 420 ${y} C 530 ${y}, 600 ${y + 30}, 745 ${y + 30}`} pathLength="1" /><circle className="flow-parcel" cx="430" cy={y + index * 4} r="5" /></g>)}
          </svg>
          <div className="flow-style">
            <div><span className="eyebrow">{__('Your voice, in every language')}</span><p>{__('A style guide you set once. A voice your agent carries forward.')}</p></div>
            <div className="flow-voice" role="group" aria-label={__s('Translation style')}><button type="button" aria-pressed={voice === 'warm'} onClick={() => { explore(); setVoice('warm'); }}>{__('Warm & friendly')}</button><button type="button" aria-pressed={voice === 'concise'} onClick={() => { explore(); setVoice('concise'); }}>{__('Short & direct')}</button></div>
            <pre lang="en"><code>{JSON.stringify({ style: { '*': voice === 'warm' ? 'Warm, conversational UI copy. Make people feel welcome.' : 'Short, direct UI copy. Keep every action clear.' } }, null, 2)}</code></pre>
          </div>
        </div>
        <p className="flow-scroll-hint">{chapter < 3 ? __('Scroll to follow the flow') : __('Make it yours. Try another scene or voice.')} <span aria-hidden="true">{chapter < 3 ? '↓' : '↗'}</span></p>
        </div>
        <p className="flow-caption">{__('Interactive illustration with example translations. In your project, your configured coding agent does the translating.')}</p>
      </div>
    </section>
  );
}
