/** The Round 1 directions, as listed on the index page. */
export const DIRECTIONS = [
  {
    path: '/explore/a',
    name: 'Spec Sheet',
    concept: 'An editorial technical datasheet: one string is followed through a scroll-scrubbed, annotated figure.',
  },
  {
    path: '/explore/b',
    name: 'Session',
    concept: 'A terminal session that plays itself, built entirely from real CLI output, with you, duckalize and an agent on separate panes.',
  },
  {
    path: '/explore/c',
    name: 'Judgment / Checking',
    concept: 'A split world, loose on the model side and rigid on the code side; you write the agent’s output and the real validator judges it live.',
  },
  {
    path: '/explore/d',
    name: 'The Duck',
    concept: 'The page is localized with duckalization itself. Switch it to Spanish and the gaps fall back to English, in plain sight.',
  },
  {
    path: '/explore/e',
    name: 'Ledger',
    concept: 'The text is the key: type a string, watch its real ID change, and follow catalog rows as they move between states.',
  },
  {
    path: '/explore/f',
    name: 'Explain, then prove (D + A + B)',
    concept: 'The Duck’s style and hero. A scroll-scrubbed explanation of the five beats, followed by the replay of a real run.',
  },
  {
    path: '/explore/g',
    name: 'Scroll the replay (D + A + B)',
    concept: 'The Duck’s style and hero. One section where scrolling drives the real session replay, with the explanation pinned beside it.',
  },
  {
    path: '/explore/i',
    name: 'F + code ↔ UI',
    concept: 'F, with code and the rendered UI side by side, joined by lines that light up as each step touches a string.',
  },
] as const;
