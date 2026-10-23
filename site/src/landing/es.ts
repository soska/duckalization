import { messageId, type Catalog } from '../shared/real.ts';

// The landing page is localized with duckalization itself.
const PAIRS: [string, string][] = [
  ['Trust, but verify.', 'Confía, pero verifica.'],
  ['Your agent translates. duckalization checks the work.', 'Tu agente traduce. duckalization revisa el trabajo.'],
  ['duckalization never calls a model. It hands your agent a brief, then validates every answer before a single string reaches your catalogs.', 'duckalization nunca llama a un modelo. Le entrega a tu agente un encargo y valida cada respuesta antes de que un solo texto llegue a tus catálogos.'],
  ['A bad answer changes nothing.', 'Una mala respuesta no cambia nada.'],
  ['Unknown IDs, typo’d placeholders, wrong plural forms, a translated brand name: one error rejects the whole file, and nothing is written.', 'IDs desconocidos, marcadores mal escritos, formas de plural incorrectas, un nombre de marca traducido: un solo error rechaza el archivo completo y no se escribe nada.'],
  ['Missing means English, never blank.', 'Si falta, sale en inglés, nunca en blanco.'],
  ['A string without a translation renders the English you wrote. Ship a partial catalog today, and add a CI check when you want every language complete.', 'Un texto sin traducción muestra el inglés que escribiste. Publica hoy un catálogo parcial y agrega una verificación en CI cuando quieras todos los idiomas completos.'],
  ['You approve the words that matter.', 'Tú apruebas las palabras importantes.'],
  ['Glossary terms need a human sign-off. Until a language’s terms are approved, the CLI won’t brief or apply it, and the agent guide tells your agent to ask you instead of approving them itself.', 'Los términos del glosario necesitan la aprobación de una persona. Hasta que se aprueben los de un idioma, la CLI no genera encargos ni aplica traducciones para él, y la guía para agentes le indica a tu agente que te pregunte en lugar de aprobarlos por su cuenta.'],

  ["Argentina · Youth", "Argentina · Jóvenes"],
  ["Casual. Local. Never trying too hard.", "Informal y local. Sin forzar la onda."],
  ["Configure duckalization for a young adult audience in Argentina (es-AR). Use vos and natural Rioplatense Spanish. Keep it playful, clear, and brief, without forced slang or Spain-specific phrasing. Keep product names unchanged. Save this as the es-AR translation style guide and connect it in the config, preserving other locale settings.", "Configura duckalization para un público de adultos jóvenes en Argentina (es-AR). Usa vos y español rioplatense natural. Mantén un tono divertido, claro y breve, sin jerga forzada ni expresiones propias de España. Conserva los nombres de los productos. Guarda estas instrucciones como guía de estilo de traducción para es-AR y vincúlala en la configuración, conservando los ajustes de los otros idiomas."],
  ["Spain · Business", "España · Negocios"],
  ["Professional, without the corporate fog.", "Profesional, sin lenguaje rebuscado."],
  ["Configure duckalization for business professionals in Spain (es-ES). Address readers as usted. Use clear, precise language and a confident, respectful tone. Prefer presupuesto for quote. Avoid hype, buzzwords, and unnecessary anglicisms. Keep product names unchanged. Save this as the es-ES translation style guide and connect it in the config, preserving other locale settings.", "Configura duckalization para profesionales de negocios en España (es-ES). Trata a los lectores de usted. Usa un lenguaje claro y preciso, con un tono seguro y respetuoso. Prefiere presupuesto para quote. Evita las exageraciones, las palabras de moda y los anglicismos innecesarios. Conserva los nombres de los productos. Guarda estas instrucciones como guía de estilo de traducción para es-ES y vincúlala en la configuración, conservando los ajustes de los otros idiomas."],
  ["Mexico · Launch", "México · Lanzamiento"],
  ["Warm enough to welcome. Clear enough to sell.", "Cercano para conectar. Claro para vender."],
  ["Configure duckalization for a marketing site launching in Mexico (es-MX), aimed at small-business owners. Use tú and natural Mexican Spanish. Lead with concrete benefits and clear calls to action. Sound warm and confident, without exaggerated promises or forced slang. Preserve prices and product names. Save this as the es-MX translation style guide and connect it in the config, preserving other locale settings.", "Configura duckalization para un sitio de marketing que se lanzará en México (es-MX), dirigido a dueños de pequeños negocios. Usa tú y español mexicano natural. Destaca beneficios concretos y llamadas a la acción claras. Usa un tono cálido y seguro, sin promesas exageradas ni jerga forzada. Conserva los precios y los nombres de los productos. Guarda estas instrucciones como guía de estilo de traducción para es-MX y vincúlala en la configuración, conservando los ajustes de los otros idiomas."],
  ["Style guide examples", "Ejemplos de guías de estilo"],
  ["A little of that voice", "Una muestra de esa voz"],
  ["Give your agent a starting point.", "Dale un punto de partida a tu agente."],
  ["Copy style prompt", "Copiar instrucciones de estilo"],
  ["Copy prompt", "Copiar instrucciones"],
  ["Prompt copied.", "Instrucciones copiadas."],
  ["Couldn’t copy. Select the prompt text to copy it.", "No se pudo copiar. Selecciona el texto de las instrucciones para copiarlo."],

  ['Scroll the code sideways to read each line.', 'Desliza el código hacia los lados para leer cada línea.'],
  ["English →", "Inglés →"],
  ["Translate into", "Traducir al"],
  ["Try a voice. Watch the translation change.", "Prueba una voz. Mira cómo cambia la traducción."],
  ["Package manager", "Gestor de paquetes"],
  ["Example React component", "Componente React de ejemplo"],
  ["Scroll to see English become your next language", "Desplázate para ver cómo el inglés se convierte en otro idioma"],
  ["Your voice", "Tu voz"],
  ["The English inside __() is the catalog entry. There’s no key file to maintain, and the CLI refuses structurally invalid translations.", "El inglés dentro de __() es la entrada del catálogo. No hay un archivo de claves que mantener, y la CLI rechaza las traducciones con una estructura inválida."],

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
