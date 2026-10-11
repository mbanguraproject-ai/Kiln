// Discover test (blueprint section 7): search with typos and half-typed words, recent searches kept on the
// phone and erasable, filters that only appear when they split the catalogue, every collection, empty results
// that offer a way back, the search events (never the words typed), and Back through all of it.
// Usage: node tools/discover-test.cjs [--port 8795]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8795) || 8795;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
let failed = 0;
const check = (ok, name, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' (' + detail + ')' : ''}`); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // ---- The registry's search tags
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8'), sb);
  const GAMES = sb.window.KILN_GAMES;
  const COLLECTIONS = sb.window.KILN_COLLECTIONS;
  const playable = GAMES.filter(g => g.status !== 'soon');
  for (const g of GAMES) {
    const mech = g.mechanics || [], moods = g.moods || [];
    const tags = mech.concat(moods);
    const counts = g.status === 'soon' ? mech.length >= 1 : mech.length >= 2 && mech.length <= 3 && moods.length >= 1 && moods.length <= 3;
    check(counts && tags.every(t => /^[A-Z][a-z]+( [a-z]+)*$/.test(t)) && new Set(tags.map(t => t.toLowerCase())).size === tags.length,
      `${g.id}: two or three mechanics and moods, sentence case, no repeats`, tags.join(', '));
    check(!tags.some(t => t.toLowerCase() === String(g.genre).toLowerCase()), `${g.id}: tags add to the genre instead of repeating it`);
  }
  // The moods must agree with the collections' promises: "Think it through" has no clock, "One more run" is fast.
  const inColl = id => (COLLECTIONS.find(c => c.id === id) || { games: [] }).games;
  for (const g of playable) {
    const m = g.moods || [];
    check(inColl('think-it-through').includes(g.id) === m.includes('No clock') && inColl('one-more-run').includes(g.id) === m.includes('Fast'),
      `${g.id}: moods agree with its collections`, m.join(', '));
  }

  await new Promise(r => srv.listen(PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const watchErrors = p => {
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push(e.message));
  };
  const newContext = async opts => {
    const c = await browser.newContext(Object.assign({ ...devices['Pixel 7'], serviceWorkers: 'block' }, opts));
    await c.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    return c;
  };
  const ctx = await newContext();
  const page = await ctx.newPage();
  watchErrors(page);
  const url = `http://localhost:${PORT}/index.html?debug`;
  await page.goto(url);
  await wait(500);
  const state = () => page.evaluate(() => ({ tab: window.__kiln.tab, detail: window.__kiln.detail, game: window.__kiln.game, query: window.__kiln.query }));
  const events = () => page.evaluate(() => window.__kiln.Log.all());
  const back = async () => { await page.goBack(); await wait(250); };
  const readDiscover = () => page.evaluate(() => {
    const v = document.getElementById('view-discover');
    const rows = [...v.querySelectorAll('#discoverBody .result')];
    return {
      filters: [...v.querySelectorAll('#filters .chip')].map(c => c.textContent + (c.getAttribute('aria-pressed') === 'true' ? '*' : '')),
      blocks: [...v.querySelectorAll('#discoverBody > [data-block]')].map(b => b.dataset.block),
      heading: (v.querySelector('#discoverBody .results-head h2') || {}).textContent || '',
      headAction: (v.querySelector('#discoverBody .results-head .text-btn') || {}).textContent || '',
      rows: rows.map(r => r.dataset.id),
      bold: Object.fromEntries(rows.map(r => [r.dataset.id, [...r.querySelectorAll('.result-tags b')].map(b => b.textContent).join()])),
      empty: (v.querySelector('[data-block="empty"] h3') || {}).textContent || '',
      emptyText: (v.querySelector('[data-block="empty"] p') || {}).textContent || '',
      history: v.querySelector('#searchHistory').hidden ? null : [...v.querySelectorAll('#searchHistoryList .chip')].map(c => c.textContent),
      status: document.getElementById('searchStatus').textContent,
    };
  });
  const type = async text => { await page.fill('#q', text); await wait(120); return readDiscover(); };

  // ---- Search is reachable from Home
  await page.click('#homeSearch');
  await wait(250);
  let s = await state();
  check(s.tab === 'discover' && await page.evaluate(() => document.activeElement.id) === 'q', 'the search button on Home opens Discover with the search field ready', JSON.stringify(s));
  let d = await readDiscover();
  check(d.filters.join() === 'Puzzle,Arcade,Keyboard', 'filters: the real genres and keyboard play, nothing every game shares', d.filters.join());
  const collections = COLLECTIONS.filter(c => c.games.filter(id => playable.some(g => g.id === id)).length >= 2).map(c => 'discover-' + c.id);
  check(d.blocks.join() === collections.concat('all').join(), 'with nothing typed: every collection, then all games', d.blocks.join());
  const everyGame = playable.map(g => g.id).concat(GAMES.filter(g => g.status === 'soon').map(g => g.id));
  check(d.rows.join() === everyGame.join(), 'All games lists every game, coming soon last', d.rows.join());
  const soonRow = await page.evaluate(() => {
    const r = document.querySelector('#view-discover .result.soon');
    return r && { label: (r.querySelector('.status') || {}).textContent, play: !!r.querySelector('.play-btn') };
  });
  check(soonRow && soonRow.label === 'Coming soon' && !soonRow.play, 'a coming-soon game is labelled and has no Play', JSON.stringify(soonRow));
  check(await page.isVisible('#view-discover .discover-note'), 'what every game shares (offline, portrait, no ads) is stated once');
  const sizes = await page.evaluate(() => [...document.querySelectorAll('#view-discover .result')].map(r => {
    const a = r.querySelector('.result-art').getBoundingClientRect();
    return `${Math.round(r.getBoundingClientRect().height)}/${Math.round(a.width)}x${Math.round(a.height)}`;
  }));
  check(new Set(sizes).size === 1, 'every result row is the same size, with or without art', sizes.join(' '));

  // ---- Matching: titles, half-typed words, typos, genres, mechanics, moods, collections, controls, facts
  const cases = [
    ['Lariat', 'lariat'],
    ['cro', 'crosswake'],
    ['tesera', 'tessera'],
    ['goldmned', 'goldmend'],
    ['fats', 'goldmend,lariat'],
    ['block', 'tessera'],
    ['tense', 'goldmend'],
    ['crosswkae', 'crosswake'],
    ['lariet', 'lariat'],
    // Span (coming soon) is a puzzle game too; it is found, after every game that can be played now.
    ['puzzle', 'tessera,crosswake,span'],
    ['puzle', 'tessera,crosswake,span'],
    ['arcade', 'goldmend,lariat'],
    ['calm', 'crosswake'],
    ['relaxing', 'tessera'],
    ['fast games', 'goldmend,lariat'],
    ['drawing', 'goldmend,lariat'],
    ['loops', 'lariat'],
    ['no clock', 'tessera,crosswake'],
    ['one more run', 'goldmend,lariat'],
    ['keyboard', 'tessera,lariat'],
    ['offline', playable.map(g => g.id).join()],
    ['bridge', 'span'],
  ];
  for (const [q, want] of cases) {
    d = await type(q);
    check(d.rows.join() === want, `"${q}" finds ${want}`, d.rows.join() || 'nothing');
  }
  d = await type('calm');
  check(d.bold.crosswake === 'Calm' && d.heading === '1 game' && d.status === '1 game for calm', 'the matched tag is shown in bold, with the count read out', `${d.bold.crosswake} / ${d.heading} / ${d.status}`);
  d = await type('one more run');
  check(d.bold.goldmend === 'One more run', 'a collection match names the collection', d.bold.goldmend);

  // ---- One search, one event, and never the words typed
  let evs = await events();
  check(!evs.some(e => e.ev === 'search_submit'), 'typing alone logs no search');
  await type('tesera');
  await page.press('#q', 'Enter');
  await page.press('#q', 'Enter');
  await wait(150);
  evs = await events();
  const subs = evs.filter(e => e.ev === 'search_submit');
  check(subs.length === 1 && subs[0].kind === 'title' && subs[0].results === 1 && subs[0].from === 'enter', 'pressing Search logs search_submit once, with what matched and how many games', JSON.stringify(subs));
  check(!JSON.stringify(evs).includes('tesera'), 'the words typed are never written to the event log');
  check(await page.evaluate(() => document.activeElement.id) !== 'q', 'pressing Search puts the keyboard away');
  check(evs.some(e => e.ev === 'game_impression' && e.shelf === 'search' && e.game === 'tessera' && e.pos === 0), 'results log impressions on the search shelf');

  // ---- A result opens its page; Play, then Back returns to the search as it was
  await type('calm');
  await page.click('#view-discover .result[data-id="crosswake"]');
  await wait(250);
  s = await state();
  evs = await events();
  const opened = evs.filter(e => e.ev === 'game_detail_open').pop();
  const sub = evs.filter(e => e.ev === 'search_submit').pop();
  check(s.detail === 'crosswake' && opened.source === 'search', 'a result opens the game\'s page, from the search shelf', opened && opened.source);
  check(sub.from === 'result' && sub.kind === 'mood', 'opening a result counts as a search, matched on a mood', JSON.stringify(sub));
  await page.click('#detail [data-play="crosswake"]');
  await wait(900);
  evs = await events();
  const launch = evs.filter(e => e.ev === 'game_launch').pop();
  check(launch && launch.game === 'crosswake' && launch.from === 'discover' && launch.origin === 'search', 'the launch records Discover and the search that led there', launch && `${launch.from} / ${launch.origin}`);
  await back();
  await back();
  s = await state();
  d = await readDiscover();
  check(s.tab === 'discover' && !s.detail && !s.game && s.query === 'calm' && d.rows.join() === 'crosswake', 'Back returns to Discover with the search as it was', JSON.stringify(s));

  // ---- Recent searches: newest first, a tap runs one, kept across restarts, Clear erases them
  await page.click('#qClear');
  await wait(150);
  d = await readDiscover();
  check(d.history && d.history.join() === 'calm,tesera', 'recent searches show newest first once the field is clear', d.history && d.history.join());
  await page.click('#searchHistoryList .chip:nth-child(2)');
  await wait(150);
  d = await readDiscover();
  evs = await events();
  check((await state()).query === 'tesera' && d.rows.join() === 'tessera' && evs.filter(e => e.ev === 'search_submit').pop().from === 'recent', 'a recent search runs again when tapped');
  await page.reload();
  await wait(500);
  s = await state();
  await type('');
  d = await readDiscover();
  check(s.tab === 'discover' && d.history && d.history.join() === 'tesera,calm', 'recent searches are kept on the phone across restarts', d.history && d.history.join());
  await page.click('#clearSearches');
  await wait(150);
  d = await readDiscover();
  const stored = await page.evaluate(() => localStorage.getItem('kiln:searches'));
  check(d.history === null && stored === null, 'Clear erases recent searches from the phone', stored);

  // ---- Filters: one genre at a time, keyboard play on top, a check mark as well as colour, Clear filters
  await page.click('#filters [data-filter="genre:Puzzle"]');
  await wait(150);
  d = await readDiscover();
  const checkShown = await page.evaluate(() => getComputedStyle(document.querySelector('#filters .chip[aria-pressed="true"] svg')).display !== 'none');
  check(d.rows.join() === 'tessera,crosswake,span' && d.filters.join() === 'Puzzle*,Arcade,Keyboard' && d.heading === '2 games · 1 coming soon' && d.headAction === 'Clear filters', 'Puzzle shows the puzzle games, coming soon last, with Clear filters', `${d.rows.join()} / ${d.filters.join()} / ${d.heading}`);
  check(checkShown, 'a chosen filter shows a check mark, not colour alone');
  await page.click('#filters [data-filter="keyboard"]');
  await wait(150);
  d = await readDiscover();
  check(d.rows.join() === 'tessera' && d.heading === '1 game', 'Puzzle with Keyboard narrows to the games that have both', d.rows.join());
  await page.click('#filters [data-filter="genre:Arcade"]');
  await wait(150);
  d = await readDiscover();
  check(d.rows.join() === 'lariat' && d.filters.join() === 'Puzzle,Arcade*,Keyboard*', 'picking another genre replaces the first', `${d.rows.join()} / ${d.filters.join()}`);
  evs = await events();
  check(evs.some(e => e.ev === 'filter_change' && e.filter === 'genre' && e.value === 'Arcade') && evs.some(e => e.ev === 'filter_change' && e.filter === 'input' && e.on === true), 'filter changes are logged');
  await page.click('#discoverBody .results-head .text-btn');
  await wait(150);
  d = await readDiscover();
  check(d.blocks.join() === collections.concat('all').join() && !d.filters.some(f => f.endsWith('*')), 'Clear filters brings the full page back', d.blocks.join());

  // ---- Empty results explain and offer a way back
  d = await type('zzzz');
  check(d.empty === 'No games match “zzzz”' && d.rows.length === 0 && d.status === 'No games match zzzz', 'no results: the page says so', d.empty);
  await page.click('#discoverBody [data-block="empty"] .chip[data-genre="Arcade"]');
  await wait(150);
  d = await readDiscover();
  check((await state()).query === '' && d.rows.join() === 'goldmend,lariat' && d.filters.join() === 'Puzzle,Arcade*,Keyboard', 'a genre offered there clears the search and shows that genre', `${d.rows.join()} / ${d.filters.join()}`);
  d = await type('tessera');
  check(d.empty === 'No games match “tessera”' && /^1 game matches without your filters/.test(d.emptyText), 'when filters hide the matches, the page says how many', d.emptyText);
  await page.click('#discoverBody [data-block="empty"] .btn');
  await wait(150);
  d = await readDiscover();
  check(d.rows.join() === 'tessera' && !d.filters.some(f => f.endsWith('*')), 'Clear filters there shows them', d.rows.join());

  // ---- Escape clears the search first; Back from Discover goes Home
  await page.focus('#q');
  await page.keyboard.press('Escape');
  await wait(150);
  s = await state();
  check(s.query === '' && s.tab === 'discover', 'Escape in the search field clears it and stays on Discover', JSON.stringify(s));
  await page.click('.tab[data-tab="home"]');
  await wait(150);
  await page.click('.tab[data-tab="discover"]');
  await wait(150);
  await back();
  s = await state();
  check(s.tab === 'home' && await page.evaluate(() => history.state && history.state.tab === 'home'), 'Back from Discover returns Home, at the root of history', JSON.stringify(s));

  // ---- A narrow phone: no sideways scrolling, and Library's empty state leads to Discover
  const narrow = await newContext({ viewport: { width: 320, height: 568 } });
  const n = await narrow.newPage();
  watchErrors(n);
  await n.goto(url + '#library');
  await wait(400);
  await n.click('#browseBtn');
  await wait(200);
  check(await n.evaluate(() => window.__kiln.tab) === 'discover', 'Browse games in an empty Library opens Discover');
  await n.fill('#q', 'puzzle');
  await wait(150);
  const overflow = await n.evaluate(() => {
    const v = document.getElementById('view-discover');
    return Math.max(document.documentElement.scrollWidth, v.scrollWidth) - document.documentElement.clientWidth;
  });
  check(overflow <= 0, 'Discover fits a 320px-wide phone with no sideways scroll', overflow + 'px');
  await narrow.close();

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
