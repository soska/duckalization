import { messageId, type Catalog } from '../shared/real.ts';

// The landing page is localized with duckalization itself.
const PAIRS: [string, string][] = [
  ['Your style guide goes with every string.', 'Tu guía de estilo acompaña cada texto.'],
  ['Workflow chapters', 'Etapas del flujo'],
  ['Write English', 'Escribe en inglés'],
  ['Set the voice', 'Define la voz'],
  ['Your agent translates', 'Tu agente traduce'],
  ['Keep building', 'Sigue creando'],
  ['Explore freely', 'Explora a tu ritmo'],
  ['Scroll to follow the flow', 'Desplázate para seguir el flujo'],
  ['Make it yours. Try another scene or voice.', 'Hazlo tuyo. Prueba otra escena o voz.'],
  [
    "Build like you always do",
    "Crea como siempre"
  ],
  [
    "What are you building?",
    "¿Qué estás creando?"
  ],
  [
    "Translation style",
    "Estilo de traducción"
  ],
  [
    "Interactive illustration with example translations. In your project, your configured coding agent does the translating.",
    "Ilustración interactiva con traducciones de ejemplo. En tu proyecto, tu agente de código configurado se encarga de traducir."
  ],
  [
    "No translation keys. No switching gears. Set your languages and style guide, then let your coding agent keep your app translated as you build.",
    "Sin claves de traducción. Sin cambiar de contexto. Define los idiomas y el estilo, y deja que tu agente mantenga la app traducida mientras la construyes."
  ],
  [
    "An invitation",
    "Una invitación"
  ],
  [
    "Always English",
    "Siempre en inglés"
  ],
  [
    "Stay in your flow",
    "Sigue en lo tuyo"
  ],
  [
    "Short & direct",
    "Breve y directo"
  ],
  [
    "Warm & friendly",
    "Cálido y cercano"
  ],
  [
    "A new project",
    "Un proyecto nuevo"
  ],
  [
    "A little setup. A lot less work.",
    "Un poco de configuración. Mucho menos trabajo."
  ],
  [
    "See it happen",
    "Míralo en acción"
  ],
  [
    "You’re building…",
    "Estás creando…"
  ],
  [
    "Just your words. That’s the whole idea.",
    "Solo tus palabras. Esa es la idea."
  ],
  [
    "Copy",
    "Copiar"
  ],
  [
    "Page language",
    "Idioma de la página"
  ],
  [
    "This page speaks duckalization, too.",
    "Esta página también habla duckalization."
  ],
  [
    "Or follow the documentation yourself",
    "O sigue la documentación por tu cuenta"
  ],
  [
    "Give your agent the guide. Then go make something.",
    "Dale la guía a tu agente. Y ponte a crear."
  ],
  [
    "A style guide you set once. A voice your agent carries forward.",
    "Define el estilo una vez. Tu agente mantiene esa voz."
  ],
  [
    "Set it up once",
    "Configúralo una vez"
  ],
  [
    "Open source. MIT licensed.",
    "Código abierto. Licencia MIT."
  ],
  [
    "Pick what you’re building. Choose a voice. The English stays in your code; your agent takes care of the rest.",
    "Elige qué crear. Dale una voz. El inglés se queda en tu código; tu agente se encarga del resto."
  ],
  [
    "Skip to content",
    "Ir al contenido"
  ],
  [
    "Choose your languages. Define your tone, terminology, and style. Your agent receives that guidance with the strings it translates.",
    "Elige los idiomas. Define el tono, la terminología y el estilo. Tu agente recibe esas indicaciones junto con los textos que traduce."
  ],
  [
    "Set up the project",
    "Prepara el proyecto"
  ],
  [
    "Your agent localizes.",
    "Tu agente localiza."
  ],
  [
    "You build it. Your agent translates it.",
    "Tú creas. Tu agente traduce."
  ],
  [
    "Write English inline with __(). With the translation workflow in its instructions, your agent handles the catalogs as it works.",
    "Escribe en inglés con __(). Con el flujo de traducción en sus instrucciones, tu agente se encarga de los catálogos mientras trabaja."
  ],
  [
    "Your app, translated",
    "Tu app, traducida"
  ],
  [
    "Write English.",
    "Escribe en inglés."
  ],
  [
    "A launch",
    "Un lanzamiento"
  ],
  [
    "Install duckalization and ask your agent to follow the guide for your app.",
    "Instala duckalization y pídele a tu agente que siga la guía para tu app."
  ],
  [
    "Localization for the way you build now.",
    "Localización para tu nueva forma de crear."
  ],
  [
    "Preview language",
    "Idioma de la vista previa"
  ],
  [
    "Your agent is translating…",
    "Tu agente está traduciendo…"
  ],
  [
    "Your voice, in every language",
    "Tu voz, en todos los idiomas"
  ],
  [
    "Tell it how you sound",
    "Dile cómo quieres sonar"
  ],
  [
    "Your agent can wire up duckalization, configure your languages, and keep translations part of its development workflow. You stay focused on the app.",
    "Tu agente puede integrar duckalization, configurar los idiomas e incluir las traducciones en su flujo de desarrollo. Tú te concentras en la app."
  ],
  [
    "Read the agent guide",
    "Lee la guía para agentes"
  ],
  [
    "Main navigation",
    "Navegación principal"
  ],
  [
    "Copied",
    "Copiado"
  ],
  [
    "Translations are up to date.",
    "Traducciones al día."
  ]
];

export const ES_CATALOG: Catalog = Object.fromEntries(PAIRS.map(([en, es]) => [messageId(en), es]));
