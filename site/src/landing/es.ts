import { messageId, type Catalog, type Message } from '../shared/real.ts';

/**
 * The page's Spanish catalog, written as English → Spanish so no ID is ever
 * typed by hand: each key is the real messageId of the English source.
 *
 * Deliberately partial, but only in the chrome — the lesson itself is
 * translated. The gaps the highlight is meant to find are the note under the
 * hero, the footer, "Copied", and the skip link.
 */
const PAIRS: Array<[Message, Message]> = [
  // chrome + hero (shared with direction D)
  ['Translation demo', 'Demo de traducción'],
  ['Page language', 'Idioma de la página'],
  ['Highlight untranslated', 'Resaltar lo no traducido'],
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
  ['Read the agent guide', 'Lee la guía para agentes'],
  ['This page is translated with duckalization.', 'Esta página está traducida con duckalization.'],
  // The next sentence is the hero's deliberate gap: it stays English.
  ['Quotes for eyes. Underscores for the water.', 'Comillas por ojos. Guiones bajos por el agua.'],
  ['One string, from your code to the screen', 'Un texto, de tu código a la pantalla'],
  ['you write', 'tú escribes'],
  ['its ID', 'su ID'],
  ['what ships', 'lo que se publica'],

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

  // replay
  ['Every line the CLI printed.', 'Cada línea que imprimió la CLI.'],
  ['Proof', 'Prueba'],
  ['real runtime', 'runtime real'],
  ['fallback', 'sin traducir'],
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
  ['Your app', 'Tu app'],
  [
    'You renamed the button. The new text isn’t translated yet, so it falls back.',
    'Cambiaste el botón. El texto nuevo todavía no está traducido, así que se muestra en inglés.',
  ],
  ['What happens to the two IDs', 'Qué pasa con los dos IDs'],
  ['es · draft', 'es · borrador'],
  ['not in this answer', 'falta en la respuesta'],
  ['Your English, rendered exactly as written.', 'Tu inglés, tal como lo escribiste.'],
  ['Every string now has an ID, hashed from its text.', 'Cada texto ya tiene un ID: el hash de su contenido.'],
  ['The agent’s draft. Not live: nothing has been applied.', 'El borrador del agente. Todavía no está en vivo: no se ha aplicado nada.'],
  ['The duck is checking the answer.', 'El pato está revisando la respuesta.'],
  ['Rejected. Nothing was written, so your app is still in English.', 'Rechazado. No se escribió nada, así que tu app sigue en inglés.'],
  ['Applied to es.json. Your app is live in Spanish.', 'Aplicado a es.json. Tu app ya está en español.'],
  ['Each call is one string in your app above. Same number, same color.', 'Cada llamada es un texto de tu app, arriba. Mismo número, mismo color.'],
  [
    'Keep __ a bare identifier. That is what duckalize extract scans for.',
    'Deja __ como identificador pelado. Eso es lo que busca duckalize extract.',
  ],
  [
    'One entry of locales/.work/es.brief.json. The brief also carries the locale, its plural categories, instructions, style and glossary.',
    'Una entrada de locales/.work/es.brief.json. El encargo también lleva el idioma, sus categorías de plural, las instrucciones, el estilo y el glosario.',
  ],
  [
    'Reads the instructions, style, glossary and context, then decides how it should sound.',
    'Lee las instrucciones, el estilo, el glosario y el contexto, y decide cómo debe sonar.',
  ],
  [
    'An invented placeholder and an unknown ID. The next step catches both.',
    'Un placeholder inventado y un ID desconocido. El siguiente paso atrapa los dos.',
  ],
  ['You edit the copy. New text, new ID.', 'Cambias el texto. Texto nuevo, ID nuevo.'],
  ['old', 'viejo'],
  ['new', 'nuevo'],
  ['Still in es.json, no longer in en.json: an orphan. prune archives it.', 'Sigue en es.json, pero ya no en en.json: queda huérfano. prune lo archiva.'],
  ['Not in es.json yet, so your app renders the inline English.', 'Todavía no está en es.json, así que tu app muestra el inglés del código.'],
  [
    'A partial target catalog is safe to ship. The next brief picks up the new string.',
    'Un catálogo incompleto se puede publicar sin problema. El próximo encargo incluye el texto nuevo.',
  ],
];

export const ES_CATALOG: Catalog = Object.fromEntries(PAIRS.map(([en, es]) => [messageId(en), es]));
