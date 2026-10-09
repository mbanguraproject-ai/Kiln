/* The games in the hub, in display order. Each entry points at a self-contained page under games/<id>/.
 * status: 'live' (polished), 'beta' (playable, still being tuned) or 'soon' (card only).
 * accent: one of the house glaze tokens (--g1 ... --g6) used for the card. */
window.KILN_GAMES = [
  {
    id: 'tessera',
    title: 'Tessera',
    pitch: 'Lay glazed tiles on the grid. Fill a row or column to clear it.',
    genre: 'Puzzle',
    accent: '--g1',
    status: 'live',
    path: 'games/tessera/index.html',
    cover: 'games/tessera/cover.jpg',
  },
  {
    id: 'goldmend',
    title: 'Goldmend',
    pitch: 'Cracks race across a glazed bowl. Trace them in gold before they reach the rim.',
    genre: 'Arcade',
    accent: '--g2',
    status: 'beta',
    path: 'games/goldmend/index.html',
    cover: 'games/goldmend/cover.jpg',
  },
  {
    id: 'lariat',
    title: 'Lariat',
    pitch: 'Draw loops to catch the stars. Every loop you close keeps circling.',
    genre: 'Arcade',
    accent: '--g5',
    status: 'soon',
    path: 'games/lariat/index.html',
  },
  {
    id: 'crosswake',
    title: 'Crosswake',
    pitch: 'Drop stones in a pond. Where two ripples cross, lanterns light.',
    genre: 'Puzzle',
    accent: '--g6',
    status: 'soon',
    path: 'games/crosswake/index.html',
  },
  {
    id: 'span',
    title: 'Span',
    pitch: 'One canyon a day. Build the cheapest bridge that gets the truck across.',
    genre: 'Builder',
    accent: '--g4',
    status: 'soon',
    path: 'games/span/index.html',
  },
];
