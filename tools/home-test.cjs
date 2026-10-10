// Home screen test (blueprint section 4): module order, honest shelves, Continue playing with real
// saved state, quick categories, the time-aware "New" label, and the impression and launch events.
// Usage: node tools/home-test.cjs [--port 8793]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8793) || 8793;
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

// What Home shows: block ids in order, and the cards in each block.
const readHome = page => page.evaluate(() => ({
  featured: [...document.querySelectorAll('#featured .game-card')].map(c => c.dataset.id),
  chips: [...document.querySelectorAll('#chips .chip')].map(c => c.textContent + (c.getAttribute('aria-pressed') === 'true' ? '*' : '')),
  blocks: [...document.querySelectorAll('#feed .block')].map(b => ({
    id: b.dataset.block,
    title: b.querySelector('h2').textContent,
    cards: [...b.querySelectorAll('[data-id]')].map(c => c.dataset.id),
  })),
  labels: Object.fromEntries([...document.querySelectorAll('#view-home [data-id]')].map(c => [c.dataset.id, (c.querySelector('.status') || {}).textContent || ''])),
  cont: [...document.querySelectorAll('.cont')].map(c => c.getAttribute('aria-label')),
}));

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async ctx => {
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', e => errors.push(e.message));
    return p;
  };
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await newPage(ctx);
  const url = `http://localhost:${PORT}/index.html?debug`;
  await page.goto(url);
  await page.waitForTimeout(500);

  // First visit
  let h = await readHome(page);
  const playable = await page.evaluate(() => window.__kiln.GAMES.filter(g => g.status !== 'soon').map(g => g.id));
  check(h.featured.length === 1, 'one featured game at the top', h.featured.join());
  check(h.chips.join() === 'All*,Puzzle,Arcade', 'quick categories come from real genres, All selected', h.chips.join());
  check(!h.blocks.some(b => b.id === 'continue'), 'no Continue playing before anything was played');
  const coll = h.blocks.find(b => b.id === 'one-more-run');
  check(coll && coll.cards.length >= 2 && h.blocks[0] === coll, 'the editorial collection comes first, with at least two games', coll && coll.cards.join());
  check(!h.blocks.some(b => b.id === 'new'), 'no New on Kiln shelf while every game is new (it would repeat the catalogue)');
  check(Object.values(h.labels).every(l => l !== 'New'), 'no New labels while every game is new');
  const shown = h.featured.concat(...h.blocks.map(b => b.cards)).filter(id => playable.includes(id));
  check(shown.length === playable.length && new Set(shown).size === playable.length, 'each playable game appears exactly once', shown.join());
  const more = h.blocks.find(b => b.id === 'more');
  check(more && more.cards[more.cards.length - 1] === 'span' && h.labels.span === 'Coming soon', 'coming-soon games come last, labelled as such', more && more.cards.join());
  const firstShelfTop = await page.evaluate(() => document.querySelector('#feed .block [data-id]').getBoundingClientRect().top);
  check(firstShelfTop < 844, 'the first shelf starts on the first screen of a phone', Math.round(firstShelfTop) + 'px');

  // Impressions
  let evs = await page.evaluate(() => window.__kiln.Log.all());
  const imp = evs.filter(e => e.ev === 'game_impression');
  check(imp.some(e => e.shelf === 'featured' && e.pos === 0), 'the featured card logs an impression with its shelf and position');
  check(imp.every(e => e.game && e.shelf && typeof e.pos === 'number'), 'every impression has game, shelf and position', imp.length + ' impressions');
  check(new Set(imp.map(e => e.shelf + e.game)).size === imp.length, 'a card is counted once per visit');

  // Quick categories
  await page.click('.chip[data-cat="Puzzle"]');
  await page.waitForTimeout(200);
  h = await readHome(page);
  const puzzle = await page.evaluate(() => window.__kiln.GAMES.filter(g => g.genre === 'Puzzle').map(g => g.id));
  check(h.blocks.length === 1 && h.blocks[0].title === 'Puzzle' && h.blocks[0].cards.join() === puzzle.join(), 'Puzzle shows every puzzle game and nothing else', h.blocks.map(b => b.cards.join()).join(' | '));
  check(h.chips.join() === 'All,Puzzle*,Arcade', 'the chosen chip is marked');
  evs = await page.evaluate(() => window.__kiln.Log.all());
  check(evs.some(e => e.ev === 'category_select' && e.category === 'Puzzle'), 'choosing a category is logged');
  await page.click('.chip[data-cat="all"]');
  await page.waitForTimeout(200);
  check((await readHome(page)).blocks.some(b => b.id === 'one-more-run'), 'All brings the full feed back');

  // Continue playing: a game without saves, then a game with a saved run
  await page.click('.game-card[data-shelf="collection:one-more-run"][data-id="lariat"]');
  await page.waitForTimeout(900);
  evs = await page.evaluate(() => window.__kiln.Log.all());
  const launch = evs.filter(e => e.ev === 'game_launch').pop();
  check(launch && launch.game === 'lariat' && launch.shelf === 'collection:one-more-run', 'a launch records the shelf it came from', launch && launch.shelf);
  await page.click('#backBtn');
  await page.waitForTimeout(300);
  h = await readHome(page);
  check(h.blocks[0].id === 'continue' && h.cont.length === 1 && /^Lariat\. Played today\. Play$/.test(h.cont[0]), 'Continue playing lists the game just played, with Play (it has no saves)', h.cont.join(' / '));
  check(!(h.blocks.find(b => b.id === 'more') || { cards: [] }).cards.includes('lariat'), 'a played game is not offered again in More to explore');

  // Crosswake keeps a run between visits; drop stones in it (standalone, which also counts as a launch)
  const game = await newPage(ctx);
  await game.goto(`http://localhost:${PORT}/games/crosswake/index.html?debug`);
  await game.waitForTimeout(600);
  const pond = await game.evaluate(() => {
    const C = window.__crosswake;
    C.manual(true);
    const s = C.P.solution[0];
    C.placeDelay(s.A, s.B, s.delay);
    C.release();
    C.finish();
    C.advance(2);
    return C.P.n;
  });
  await page.reload();
  await page.waitForTimeout(500);
  h = await readHome(page);
  check(h.cont[0] === `Crosswake. Pond ${pond} · today. Resume`, 'a saved run shows its real progress and Resume', h.cont.join(' / '));
  // Play until the stones run out: the run is over, so Resume must go away
  const over = await game.evaluate(async () => {
    const C = window.__crosswake;
    for (let i = 0; i < 60 && C.phase !== 'over'; i++) {
      if (C.phase === 'cleared') { await new Promise(r => setTimeout(r, 1900)); continue; } // the next pond starts on a timer
      C.place({ x: 20, y: 20 }, { x: 40, y: 20 }, 0);
      C.release();
      C.finish();
      C.advance(2);
    }
    return C.phase;
  });
  await game.close();
  await page.reload();
  await page.waitForTimeout(500);
  h = await readHome(page);
  check(over === 'over' && /^Crosswake\. Played today\. Play$/.test(h.cont[0]), 'when the run ends, the card goes back to Play', `${over}: ${h.cont.join(' / ')}`);

  // Tessera saves after every move: one move is enough to offer Resume with the score
  const t = await newPage(ctx);
  await t.goto(`http://localhost:${PORT}/games/tessera/index.html?debug`);
  await t.waitForTimeout(600);
  const score = await t.evaluate(() => {
    const T = window.__tessera;
    T.newGame(false);
    for (let slot = 0; slot < 3; slot++) {
      const p = T.G.tray[slot];
      if (!p) continue;
      for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) if (T.fits(T.G.board, p.s, r, c)) { T.placePiece(slot, r, c); return T.G.score; }
    }
    return -1;
  });
  await t.close();
  await page.reload();
  await page.waitForTimeout(500);
  h = await readHome(page);
  check(score >= 0 && h.cont[0] === `Tessera. Score ${score} · today. Resume`, 'Tessera mid-game shows its score and Resume', h.cont[0]);

  // "New" is relative: with two older games in the catalogue, the newer unplayed ones are labelled
  const ctx2 = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx2.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx2.route(/games\/registry\.js/, async r => {
    const body = fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8')
      .replace(/(id: 'goldmend'[\s\S]*?added: ')[^']+/, '$12020-01-05')
      .replace(/(id: 'lariat'[\s\S]*?added: ')[^']+/, '$12020-01-05');
    r.fulfill({ status: 200, contentType: 'text/javascript', body: body.replace(/added: '2026-10-\d\d'/g, `added: '${new Date().toISOString().slice(0, 10)}'`) });
  });
  const p2 = await newPage(ctx2);
  await p2.goto(url);
  await p2.waitForTimeout(500);
  h = await readHome(p2);
  check(h.labels.tessera === 'New' && !h.labels.goldmend && !h.labels.lariat, 'only games newer than the rest are labelled New', JSON.stringify(h.labels));
  await ctx2.close();

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
