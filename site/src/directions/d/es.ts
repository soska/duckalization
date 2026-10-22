import { messageId, type Catalog, type Message } from '../../shared/real.ts';

/**
 * The page's Spanish catalog, written as English → Spanish so no ID is ever
 * typed by hand: each key is the real messageId of the English source.
 *
 * Deliberately partial. These are left out on purpose and fall back to
 * English: the brief beat, the duck-face joke, the llms.txt link, the footer,
 * "Catalog", "Play again", "Copied" and the skip link.
 */
const PAIRS: Array<[Message, Message]> = [
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
  ['Pipeline stations', 'Estaciones del proceso'],
  ['It does the judgment. I do the checking.', 'Él pone el criterio. Yo hago la revisión.'],
  ['Your code', 'Tu código'],
  ['Brief', 'Encargo'],
  ['Any agent', 'Cualquier agente'],
  ['Checks', 'Revisión'],
  [
    'You write English inline, right where it renders. Nothing else in your code changes.',
    'Escribes en inglés, justo donde se muestra. Nada más cambia en tu código.',
  ],
  [
    'Any agent translates the brief. I never call a model. Judgment is its job.',
    'Cualquier agente traduce el encargo. Yo nunca llamo a un modelo. El criterio es cosa suya.',
  ],
  [
    'Then I check everything: unknown IDs, empty strings, malformed plurals, invented placeholders. One error and the whole file bounces. Nothing is written.',
    'Después reviso todo: IDs desconocidos, textos vacíos, plurales mal formados, placeholders inventados. Con un solo error, el archivo entero rebota. No se escribe nada.',
  ],
  [
    'Anything not translated yet falls back to your English, so a partial catalog still ships.',
    'Lo que aún no tiene traducción se muestra en tu inglés, así que un catálogo incompleto igual se puede publicar.',
  ],
  ['Your app, in Spanish', 'Tu app, en español'],
  [
    'The last line was added after the brief. It is not in es.json yet, so it renders in English.',
    'La última línea se agregó después del encargo. Todavía no está en es.json, así que se muestra en inglés.',
  ],
];

export const ES_CATALOG: Catalog = Object.fromEntries(PAIRS.map(([en, es]) => [messageId(en), es]));
