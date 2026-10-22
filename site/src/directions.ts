/** The Round 1 directions, as listed on the index page. */
export const DIRECTIONS = [
  {
    path: '/a',
    name: 'Spec Sheet',
    concept: 'An editorial technical datasheet: one string is followed through a scroll-scrubbed, annotated figure.',
  },
  {
    path: '/b',
    name: 'Session',
    concept: 'A terminal session that plays itself, built entirely from real CLI output, with you, duckalize and an agent on separate panes.',
  },
  {
    path: '/c',
    name: 'Judgment / Checking',
    concept: 'A split world, loose on the model side and rigid on the code side; you write the agent’s output and the real validator judges it live.',
  },
  {
    path: '/d',
    name: 'The Duck',
    concept: 'The page is localized with duckalization itself. Switch it to Spanish and the gaps fall back to English, in plain sight.',
  },
  {
    path: '/e',
    name: 'Ledger',
    concept: 'The text is the key: type a string, watch its real ID change, and follow catalog rows as they move between states.',
  },
  {
    path: '/f',
    name: 'Explain, then prove (D + A + B)',
    concept: 'The Duck’s style and hero. A scroll-scrubbed explanation of the five beats, followed by the replay of a real run.',
  },
  {
    path: '/g',
    name: 'Scroll the replay (D + A + B)',
    concept: 'The Duck’s style and hero. One section where scrolling drives the real session replay, with the explanation pinned beside it.',
  },
] as const;
