import { messageId, type Catalog, type Message } from '../../shared/real.ts';

/**
 * The page's Spanish catalog, written as English → Spanish so no ID is ever
 * typed by hand: each key is the real messageId of the English source.
 *
 * Deliberately partial, with a gap in every section so the x-ray always has
 * something to show: the duck-face joke, the llms.txt link, the footer,
 * "Copied", the skip link, two notes and a caption in "How it works", and the
 * "Proof" label, "real runtime" and "fallback" in the replay.
 */
const PAIRS: Array<[Message, Message]> = [
  // chrome + hero (shared with direction D)
  ['Translation demo', 'Demo de traducción'],
  ['Page language', 'Idioma de la página'],
  ['Show fallbacks', 'Resaltar lo no traducido'],
  ['{translated} of {total} strings translated', '{translated} de {total} textos traducidos'],
  [
    { one: '{count} is still English-only', other: '{count} are still English-only' },
    { one: '{count} sigue solo en inglés', other: '{count} siguen solo en inglés' },
  ],
  ['Copy', 'Copiar'],
  ['Install', 'Instalar'],
  ['Write English. Your agent translates. The duck checks.', 'Escribe en inglés. Tu agente traduce. El pato revisa.'],
  [
    'No translation keys: every message’s ID is hashed from its own text. The CLI extracts your strings, hands any agent a brief, and checks every translation before it lands.',
    'Sin claves de traducción: el ID de cada mensaje es el hash de su propio texto. La CLI extrae tus textos, le entrega un encargo a cualquier agente y revisa cada traducción antes de aplicarla.',
  ],
  ['Source on GitHub', 'Código en GitHub'],
  ['This page is translated with duckalization.', 'Esta página está traducida con duckalization.'],
  [
    'Its Spanish catalog is deliberately incomplete. Switch to Español and turn on Show fallbacks to see which strings are still in English.',
    'Su catálogo en español está incompleto a propósito. Activa «Resaltar lo no traducido» para ver qué textos siguen en inglés.',
  ],

  // how it works
  ['How it works', 'Cómo funciona'],
  ['How a string gets translated', 'Cómo se traduce un texto'],
  [
    'Follow one string, {message}, from the line you write to the catalog you ship.',
    'Sigue un texto, {message}, desde la línea que escribes hasta el catálogo que publicas.',
  ],
  ['It does the judgment. I do the checking.', 'Él pone el criterio. Yo hago la revisión.'],
  ['Pipeline steps', 'Pasos del proceso'],
  ['Write English inline', 'Escribe en inglés, en el código'],
  ['Extract a brief', 'Extrae un encargo'],
  ['Any agent translates', 'Cualquier agente traduce'],
  ['Code checks the work', 'El código revisa el trabajo'],
  ['Ship a partial catalog', 'Publica un catálogo incompleto'],
  [
    'The string in your code is the message. Nothing else changes.',
    'El texto en tu código es el mensaje. Nada más cambia.',
  ],
  [
    'No translation keys. IDs are hashed from the text. The same string in many places is one catalog entry.',
    'Sin claves de traducción. Los IDs son el hash del texto. El mismo texto en muchos lugares es una sola entrada del catálogo.',
  ],
  ['The message: plain English, right where it renders.', 'El mensaje: inglés simple, justo donde se muestra.'],
  [
    'The CLI hashes each string into an ID and writes a self-contained work order for an agent.',
    'La CLI convierte cada texto en un ID con un hash y escribe un encargo autosuficiente para un agente.',
  ],
  ['How the ID is derived', 'Cómo se obtiene el ID'],
  ['Exact text: no trimming, no case folding.', 'Texto exacto: sin recortar espacios ni cambiar mayúsculas.'],
  ['Same text, same ID, everywhere.', 'Mismo texto, mismo ID, en todas partes.'],
  ['Brief entry', 'Entrada del encargo'],
  ['The translating agent needs no repo access.', 'El agente que traduce no necesita acceso al repositorio.'],
  [
    'The CLI never calls a model. Bring whichever agent you like.',
    'La CLI nunca llama a un modelo. Usa el agente que prefieras.',
  ],
  [
    'The brief leaves duckalize as a file, and the answer comes back as one.',
    'El encargo sale de duckalize como un archivo, y la respuesta vuelve como otro.',
  ],
  ['any agent', 'cualquier agente'],
  ['The agent’s first answer', 'La primera respuesta del agente'],
  ['first answer, as returned', 'primera respuesta, tal como llegó'],
  [
    'Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.',
    'Los IDs desconocidos, los textos vacíos, los plurales mal formados y los placeholders inventados se rechazan antes de escribir nada.',
  ],
  ['Errors reject the whole file; nothing is written.', 'Un error rechaza el archivo entero; no se escribe nada.'],
  ['Apply-time checks for two answers from the agent', 'Revisiones al aplicar dos respuestas del agente'],
  ['Check', 'Revisión'],
  ['Answer 1', 'Respuesta 1'],
  ['Answer 2', 'Respuesta 2'],
  ['passes', 'pasa'],
  ['Missing translations fall back to the inline English.', 'Lo que falta por traducir se muestra en el inglés del código.'],
  ['Your app, in Spanish', 'Tu app, en español'],
  ['From es.json.', 'Sale de es.json.'],
  ['Plural form picked by Intl.PluralRules for Spanish.', 'Forma plural elegida por Intl.PluralRules para el español.'],
  ['Not in es.json, so it renders the inline English.', 'No está en es.json, así que se muestra en el inglés del código.'],

  // replay
  ['Now watch a real run.', 'Ahora mira una ejecución real.'],
  [
    'A replay of a real session against the same component. Every line in the duckalize pane is what the CLI printed. The agent pane is the only place a model is involved.',
    'La repetición de una sesión real con el mismo componente. Cada línea del panel de duckalize es lo que imprimió la CLI. El panel del agente es el único lugar donde interviene un modelo.',
  ],
  ['you', 'tú'],
  ['agent', 'agente'],
  ['Your editor', 'Tu editor'],
  ['duckalize output', 'Salida de duckalize'],
  ['Agent output', 'Salida del agente'],
  ['deterministic · never calls a model', 'determinista · nunca llama a un modelo'],
  ['any model · the only judgment', 'cualquier modelo · el único criterio'],
  [
    'Waiting for a brief. The agent only sees what duckalize translate brief hands it.',
    'Esperando un encargo. El agente solo ve lo que le entrega duckalize translate brief.',
  ],
  [
    'The agent reads the brief and writes es.out.json. Its first answer invents a placeholder and an ID.',
    'El agente lee el encargo y escribe es.out.json. Su primera respuesta inventa un placeholder y un ID.',
  ],
  [
    'duckalize rejects that answer, writes nothing, and accepts the corrected one.',
    'duckalize rechaza esa respuesta, no escribe nada y acepta la corregida.',
  ],
  [
    'Rename Checkout to Check out and it gets a new ID, {newId}. The old entry, {oldId}, is orphaned, and the new text renders in English.',
    'Cambia Checkout por Check out y recibe un ID nuevo, {newId}. La entrada anterior, {oldId}, queda huérfana, y el texto nuevo se muestra en inglés.',
  ],
  ['session player', 'reproductor de sesión'],
  [
    'Session player. Space plays or pauses; left and right arrows change chapter.',
    'Reproductor de sesión. La barra espaciadora reproduce o pausa; las flechas cambian de capítulo.',
  ],
  [
    'Session transcript. Left and right arrows change chapter.',
    'Transcripción de la sesión. Las flechas cambian de capítulo.',
  ],
  ['Actors', 'Participantes'],
  ['Play', 'Reproducir'],
  ['Pause', 'Pausar'],
  ['Replay', 'Repetir'],
  ['Previous', 'Anterior'],
  ['Next', 'Siguiente'],
  ['Session position', 'Posición en la sesión'],
];

export const ES_CATALOG: Catalog = Object.fromEntries(PAIRS.map(([en, es]) => [messageId(en), es]));
