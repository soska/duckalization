import { messageId, type Catalog, type Message } from '../../shared/real.ts';

/**
 * The page's Spanish catalog, written as English → Spanish so no ID is ever
 * typed by hand: each key is the real messageId of the English source.
 * Carried-over strings reuse Direction D's Spanish.
 *
 * Deliberately partial. Left out on purpose, so they fall back to English:
 * the duck-face joke, the llms.txt link, the footer, "Copied", the skip link,
 * and, from the replay, "Play again at normal speed", the reduced-motion frame
 * label, "Callouts", "Go to chapter", "real runtime" and two callouts.
 */
const PAIRS: Array<[Message, Message]> = [
  // ---- from D ----
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
  ['Write English. An agent translates. The duck checks.', 'Escribe en inglés. Un agente traduce. El pato revisa.'],
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
  ['How a string gets translated', 'Cómo se traduce un texto'],
  ['It does the judgment. I do the checking.', 'Él pone el criterio. Yo hago la revisión.'],

  // ---- the replay ----
  [
    'Scroll to play a real session, and scroll back to rewind it. Every line in the duckalize pane is what the CLI printed.',
    'Desplázate para reproducir una sesión real, y regresa para rebobinarla. Cada línea del panel de duckalize es lo que imprimió la CLI.',
  ],
  [
    'A real session, in five frames. Every line in the duckalize pane is what the CLI printed.',
    'Una sesión real, en cinco cuadros. Cada línea del panel de duckalize es lo que imprimió la CLI.',
  ],
  ['Write English inline', 'Escribe en inglés, en línea'],
  ['The string in your code is the message. Nothing else changes.', 'El texto en tu código es el mensaje. Nada más cambia.'],
  ['Extract a brief', 'Extrae un encargo'],
  [
    'The CLI hashes each string into an ID and writes a self-contained work order for an agent.',
    'La CLI convierte cada texto en un ID con un hash y escribe un encargo autosuficiente para un agente.',
  ],
  ['Any agent translates', 'Cualquier agente traduce'],
  ['The CLI never calls a model. Bring whichever agent you like.', 'La CLI nunca llama a un modelo. Usa el agente que prefieras.'],
  ['Code checks the work', 'El código revisa el trabajo'],
  [
    'Unknown IDs, empty strings, malformed plurals and invented placeholders are rejected before anything is written.',
    'Los IDs desconocidos, los textos vacíos, los plurales mal formados y los placeholders inventados se rechazan antes de escribir nada.',
  ],
  ['Ship a partial catalog', 'Publica un catálogo incompleto'],
  ['Missing translations fall back to the inline English.', 'Lo que falta por traducir se muestra en el inglés de tu código.'],
  ['The English string is the message. There is no key to invent.', 'El texto en inglés es el mensaje. No hay que inventar ninguna clave.'],
  ['Every string is hashed into its ID. Repeats become one entry.', 'Cada texto se convierte en su ID. Los repetidos quedan en una sola entrada.'],
  ['The brief is self-contained: the agent needs no repo access.', 'El encargo es autosuficiente: el agente no necesita acceso al repo.'],
  ['Any agent. This pane is the only place a model is involved.', 'Cualquier agente. Este panel es el único lugar donde interviene un modelo.'],
  ['A plausible slip: it renamed {name} to {nombre}.', 'Un error creíble: cambió {name} por {nombre}.'],
  ['I check: {nombre} is not in the source message.', 'Yo reviso: {nombre} no está en el mensaje original.'],
  ['One error and the whole file bounces. Nothing is written.', 'Con un solo error, el archivo entero rebota. No se escribe nada.'],
  ['Edit a string and it gets a new ID.', 'Si editas un texto, recibe un ID nuevo.'],
  ['The old translation is orphaned; the new string is missing.', 'La traducción vieja queda huérfana y el texto nuevo queda pendiente.'],
  ['Missing translations fall back to your English.', 'Lo que falta por traducir se muestra en tu inglés.'],
  ['Your app, in Spanish', 'Tu app, en español'],
  ['you', 'tú'],
  ['agent', 'agente'],
  ['any model · the only judgment', 'cualquier modelo · el único criterio'],
  ['deterministic · never calls a model', 'determinista · nunca llama a un modelo'],
  ['Waiting for a brief. The agent only sees what the CLI hands it.', 'Esperando un encargo. El agente solo ve lo que le entrega la CLI.'],
  ['Actors', 'Participantes'],
  ['Chapters', 'Capítulos'],
  ['Chapter {n} of 5: {title}', 'Capítulo {n} de 5: {title}'],
  ['Play at normal speed', 'Reproducir a velocidad normal'],
  ['Pause', 'Pausa'],
  ['Previous', 'Anterior'],
  ['Next', 'Siguiente'],
];

export const ES_CATALOG: Catalog = Object.fromEntries(PAIRS.map(([en, es]) => [messageId(en), es]));
