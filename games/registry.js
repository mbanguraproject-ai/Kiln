/* The games in the hub, in display order. Each entry points at a self-contained page under games/<id>/.
 * status: 'live' (polished), 'beta' (playable, still being tuned) or 'soon' (card only, not playable).
 * accent: a glaze token (--g1 ... --g6) used behind the card art while it loads.
 * artWide / artTall: card art rendered from the real game by tools/make-art.cjs (16:9 and 4:5).
 * added: date the game joined Kiln; drives the time-aware "New" label.
 * featured: the game shown in the feature card at the top of Home (one at a time).
 * Detail page (blueprint section 6), all of it checked against the game itself:
 * about: two to four sentences on the real loop and what makes it different.
 * controls: how it is played. saves: 'run' (keeps a run between visits) or 'best' (keeps only the best score).
 * shots: phone screenshots rendered from the real game by tools/make-shots.cjs. */
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
    shots: ['games/tessera/shot-1.jpg', 'games/tessera/shot-2.jpg'],
    about: 'Drag pieces onto an eight by eight grid and fill a row or column to clear it. Every tray can be placed in some order, so a run ends on your choices, not on a bad deal. Each line you clear becomes a wedge of a rose window, which is fired and hung on your studio wall when the run ends.',
    controls: 'Touch or keyboard',
    saves: 'run',
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
    shots: ['games/goldmend/shot-1.jpg', 'games/goldmend/shot-2.jpg'],
    about: 'A crack races across a glazed vessel toward its edge. Trace it from where it started: your gold only grows from the start, and the crack stops when your gold reaches its tip. Forks make you choose which branch to save first, and three chipped edges end the run.',
    controls: 'Touch',
    saves: 'best',
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
    shots: ['games/lariat/shot-1.jpg', 'games/lariat/shot-2.jpg'],
    about: 'Drag to steer a spark, and cross your own rope to close a loop around the stars. Every loop you close keeps circling at the speed you drew it, and touching one ends the run. Keep catching stars before the fuse burns out.',
    controls: 'Touch or keyboard',
    saves: 'best',
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
    shots: ['games/crosswake/shot-1.jpg', 'games/crosswake/shot-2.jpg'],
    about: "Place two stones and drop them. Where their ripples cross, a spark runs across the water and lights every lantern it touches. Make the second stone wait to bend the spark's path, and light every lantern before your stones run out.",
    controls: 'Touch',
    saves: 'run',
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

/* Editorial collections, in priority order. Home shows the first one that still has two playable games
 * once the featured game is left out, so no title is shown twice near the top.
 * why: one line that says why these games belong together. It must stay true of every game listed. */
window.KILN_COLLECTIONS = [
  {
    id: 'one-more-run',
    title: 'One more run',
    why: 'Fast arcade runs. When one ends, go again in a tap.',
    games: ['goldmend', 'lariat'],
  },
  {
    id: 'think-it-through',
    title: 'Think it through',
    why: 'No clock. Every move waits until you are ready.',
    games: ['tessera', 'crosswake'],
  },
];
