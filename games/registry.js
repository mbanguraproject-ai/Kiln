/* The games in the hub, in display order. Each entry points at a self-contained page under games/<id>/.
 * status: 'live' (polished), 'beta' (playable, still being tuned) or 'soon' (card only, not playable).
 * accent: a glaze token (--g1 ... --g6) used behind the card art while it loads.
 * artWide / artTall: card art rendered from the real game by tools/make-art.cjs (16:9 and 4:5).
 * added: date the game joined Kiln; drives the time-aware "New" label.
 * featured: the game shown in the feature card at the top of Home (one at a time). */
window.KILN_GAMES = [
  {
    id: 'tessera',
    title: 'Tessera',
    pitch: 'Lay glazed tiles on the grid. Fill a row or column to clear it.',
    genre: 'Puzzle',
    accent: '--g1',
    status: 'live',
    path: 'games/tessera/index.html',
    added: '2026-10-09',
    artWide: 'games/tessera/art-wide.jpg',
    artTall: 'games/tessera/art-tall.jpg',
  },
  {
    id: 'goldmend',
    title: 'Goldmend',
    pitch: 'Cracks race across a glazed bowl. Trace them in gold before they reach the rim.',
    genre: 'Arcade',
    accent: '--g2',
    status: 'beta',
    path: 'games/goldmend/index.html',
    added: '2026-10-09',
    artWide: 'games/goldmend/art-wide.jpg',
    artTall: 'games/goldmend/art-tall.jpg',
  },
  {
    id: 'lariat',
    title: 'Lariat',
    pitch: 'Draw loops to catch the stars. Every loop you close keeps circling.',
    genre: 'Arcade',
    accent: '--g5',
    status: 'beta',
    path: 'games/lariat/index.html',
    added: '2026-10-10',
    artWide: 'games/lariat/art-wide.jpg',
    artTall: 'games/lariat/art-tall.jpg',
  },
  {
    id: 'crosswake',
    title: 'Crosswake',
    pitch: 'Drop stones in a pond. Where two ripples cross, lanterns light.',
    genre: 'Puzzle',
    accent: '--g6',
    status: 'beta',
    path: 'games/crosswake/index.html',
    added: '2026-10-10',
    featured: true,
    artWide: 'games/crosswake/art-wide.jpg',
    artTall: 'games/crosswake/art-tall.jpg',
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
