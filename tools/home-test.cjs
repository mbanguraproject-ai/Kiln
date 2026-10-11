// Home screen test (blueprint section 4): the featured carousel, category tiles, Continue playing with real saved
// state (and a progress bar only for a percentage a game reported), Top picks, View all links, the time-aware
// "New" label, the centre Play button, and the impression and launch events.
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

// What Home shows: the carousel, the category tiles, block ids in order with their cards, labels and Continue cards.
const readHome = page => page.evaluate(() => ({
  featured: [...document.querySelectorAll('#heroTrack .game-card')].map(c => c.dataset.id),
  dots: [...document.querySelectorAll('#heroDots .hero-dot')].map(d => d.getAttribute('aria-current') === 'true'),
  cats: [...document.querySelectorAll('#chips .cat')].map(c => c.textContent + (c.getAttribute('aria-pressed') === 'true' ? '*' : '')),
  blocks: [...document.querySelectorAll('#feed .block')].map(b => ({
    id: b.dataset.block,
    title: b.querySelector('h2').textContent,
    more: !!b.querySelector('.more-link'),
    cards: [...b.querySelectorAll('.game-card')].map(c => c.dataset.id),
  })),
  labels: [...document.querySelectorAll('#view-home .game-card')].reduce((o, c) => {
    const l = (c.querySelector('.status') || {}).textContent;
    if (l) o[c.dataset.id] = l;
    return o;
  }, {}),
  cont: [...document.querySelectorAll('#feed .cont')].map(c => ({
    id: c.dataset.id,
    label: c.getAttribute('aria-label'),
    meta: (c.querySelector('.cont-meta') || {}).textContent || '',
    pct: (c.querySelector('.cont-progress') || {}).textContent || '',
    // Measured, not the inline style: a stray CSS rule once shrank the fill to a sliver of the track.
    bar: (() => {
      const track = c.querySelector('.cont-progress .cont-bar'), fill = track && track.querySelector('i');
      if (!fill) return '';
      const t = track.getBoundingClientRect(), f = fill.getBoundingClientRect();
      return Math.abs(f.left - t.left) < 1 ? Math.round(100 * f.width / t.width) + '%' : 'offset';
    })(),
    genre: (c.querySelector('.card-genre') || {}).textContent || '',
    icon: !!c.querySelector('.card-genre svg'),
    artFirst: c.firstElementChild.classList.contains('cont-art'),
    buttons: c.querySelectorAll('button, .play-btn').length,
  })),
}));
const heroIndex = page => page.evaluate(() => [...document.querySelectorAll('#heroDots .hero-dot')].findIndex(d => d.getAttribute('aria-current') === 'true'));
const events = page => page.evaluate(() => window.__kiln.Log.all());

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
  const newContext = async (opts = {}) => {
    const c = await browser.newContext({ ...devices['Pixel 7'], ...opts });
    await c.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    return c;
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ctx = await newContext();
  const page = await newPage(ctx);
  const url = `http://localhost:${PORT}/index.html?debug`;
  await page.goto(url);
  await page.waitForTimeout(500);

  // ---- First visit
  let h = await readHome(page);
  const reg = await page.evaluate(() => ({
    playable: window.__kiln.GAMES.filter(g => g.status !== 'soon').map(g => g.id),
    featured: window.__kiln.GAMES.filter(g => g.status !== 'soon' && g.featured).map(g => g.id),
    firstTitle: window.__kiln.GAMES.find(g => g.status !== 'soon' && g.featured).title,
    cats: window.KILN_CATEGORIES.map(c => c.name).filter(n => window.__kiln.GAMES.some(g => g.genre === n && g.status !== 'soon')),
  }));
  const header = await page.evaluate(() => ({
    tagline: document.querySelector('#view-home .tagline').textContent,
    buttons: [...document.querySelectorAll('#view-home .top .icon-btn')].map(b => b.getAttribute('aria-label')),
  }));
  check(header.tagline === 'Play · Discover · Enjoy' && header.buttons.join() === 'Search games,Settings', 'header: wordmark, tagline, search and profile buttons', JSON.stringify(header));
  check(h.featured.join() === reg.featured.join(), 'the carousel shows every featured game, in registry order', h.featured.join());
  check(h.dots.length === h.featured.length && h.dots[0] && h.dots.filter(Boolean).length === 1, 'one dot per slide, the first marked', JSON.stringify(h.dots));
  const slide = await page.evaluate(() => {
    const f = document.querySelector('#heroTrack .feature');
    return { pill: f.querySelector('.feature-pill').textContent, star: !!f.querySelector('.feature-pill svg'), title: f.querySelector('.feature-title').textContent, cta: f.querySelector('.feature-cta').textContent, art: !!f.querySelector('.feature-art img') };
  });
  check(slide.pill === 'Featured' && slide.star && slide.title === 'Tessera' && slide.cta === 'Play Now' && slide.art, 'a slide: art, FEATURED pill with a star, title and Play Now', JSON.stringify(slide));
  check(h.cats.join() === ['All Games*'].concat(reg.cats).join(), 'category tiles: All Games selected, then each category with games, in order', h.cats.join());
  check(await page.evaluate(() => [...document.querySelectorAll('#chips .cat')].every(c => c.querySelector('svg.ico'))), 'every category tile has its icon');
  check(!h.blocks.some(b => b.id === 'continue'), 'no Continue playing before anything was played');
  const picks = h.blocks.find(b => b.id === 'picks');
  check(h.blocks[0] === picks && picks.title === 'Top picks' && picks.cards.length >= 2 && picks.more, 'Top picks comes first, with View all', picks && picks.cards.join());
  check(h.blocks.every(b => new Set(b.cards).size === b.cards.length), 'no shelf shows a game twice');
  const grid = await page.evaluate(() => [...document.querySelectorAll('#feed [data-block="picks"] .pick')].slice(0, 2).map(c => {
    const r = c.getBoundingClientRect();
    return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), icon: !!c.querySelector('.pick-icon img'), cat: c.querySelector('.pick-cat').textContent };
  }));
  check(grid.length === 2 && grid[0].top === grid[1].top && grid[1].left > grid[0].left && grid[0].w > grid[0].h && grid.every(c => c.icon && c.cat),
    'Top picks is a two-column grid of landscape cards with the game icon and category', JSON.stringify(grid));
  check(!h.blocks.some(b => b.id === 'new'), 'no New on Kiln shelf while every game is new (it would repeat the catalogue)');
  check(!Object.values(h.labels).includes('New'), 'no New labels while every game is new');
  const more = h.blocks.find(b => b.id === 'more');
  check(more && more.cards[more.cards.length - 1] === 'span' && h.labels.span === 'Coming soon', 'coming-soon games come last, labelled as such', more && more.cards.join());
  const firstShelfTop = await page.evaluate(() => document.querySelector('#feed .block .game-card').getBoundingClientRect().top);
  check(firstShelfTop < 844, 'the first shelf starts on the first screen of a phone', Math.round(firstShelfTop) + 'px');
  const fabLabel = await page.getAttribute('#playFab', 'aria-label');
  check(fabLabel === `Play ${reg.firstTitle}`, 'before anything is played, the Play button offers the first featured game', fabLabel);

  // ---- Impressions
  let evs = await events(page);
  let imp = evs.filter(e => e.ev === 'game_impression');
  check(imp.some(e => e.shelf === 'featured' && e.game === reg.featured[0] && e.pos === 0), 'the first slide logs an impression with its shelf and position');
  check(!imp.some(e => e.shelf === 'featured' && e.pos > 0), 'slides not shown yet are not counted');
  check(imp.some(e => e.shelf === 'picks' && e.pos === 1), 'Top picks cards log their shelf and position');
  check(imp.every(e => e.game && e.shelf && typeof e.pos === 'number'), 'every impression has game, shelf and position', imp.length + ' impressions');
  check(new Set(imp.map(e => e.shelf + e.game)).size === imp.length, 'a card is counted once per visit');

  // ---- Carousel: dots, swipe
  await page.click('#heroDots .hero-dot:nth-child(2)');
  await page.waitForTimeout(700);
  check(await heroIndex(page) === 1, 'tapping a dot shows that slide', await heroIndex(page));
  evs = await events(page);
  check(evs.some(e => e.ev === 'game_impression' && e.shelf === 'featured' && e.game === reg.featured[1] && e.pos === 1), 'a slide counts when it is shown');
  const box = await page.locator('#heroTrack').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  // A real touch drag (start, moves, end), right to left across most of the card.
  const y = Math.round(box.y + box.height / 2), x0 = Math.round(box.x + box.width * 0.85);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * Math.round(box.width / 20), y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
  check(await heroIndex(page) === 2, 'a swipe moves to the next slide and the dots follow', await heroIndex(page));
  const overflow = await page.evaluate(() => document.getElementById('view-home').scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, 'the carousel never scrolls the page sideways', overflow + 'px');

  // ---- Category tiles
  await page.click('.cat[data-cat="Puzzle"]');
  await page.waitForTimeout(200);
  h = await readHome(page);
  const puzzle = await page.evaluate(() => window.__kiln.GAMES.filter(g => g.genre === 'Puzzle').sort((a, b) => (a.status === 'soon') - (b.status === 'soon')).map(g => g.id));
  check(h.blocks.length === 1 && h.blocks[0].title === 'Puzzle' && h.blocks[0].cards.join() === puzzle.join(), 'Puzzle shows every puzzle game and nothing else, coming soon last', h.blocks.map(b => b.cards.join()).join(' | '));
  check(h.cats.join() === ['All Games'].concat(reg.cats).join().replace('Puzzle', 'Puzzle*'), 'the chosen tile is marked', h.cats.join());
  const tileStyle = await page.evaluate(() => {
    const st = c => { const cs = getComputedStyle(c); return cs.backgroundColor + ' ' + cs.backgroundImage; };
    return { on: st(document.querySelector('.cat[aria-pressed="true"]')), off: st(document.querySelector('.cat[aria-pressed="false"]')) };
  });
  check(tileStyle.on !== tileStyle.off, 'the chosen tile is filled', JSON.stringify(tileStyle));
  evs = await events(page);
  check(evs.some(e => e.ev === 'category_select' && e.category === 'Puzzle'), 'choosing a category is logged');
  await page.click('.cat[data-cat="all"]');
  await page.waitForTimeout(200);
  check((await readHome(page)).blocks.some(b => b.id === 'one-more-run'), 'All Games brings the full feed back');

  // ---- View all on Top picks goes to Discover
  await page.click('#feed [data-block="picks"] .more-link');
  await page.waitForTimeout(250);
  check(await page.evaluate(() => window.__kiln.tab) === 'discover', 'View all on Top picks opens Discover');
  await page.goBack();
  await page.waitForTimeout(250);

  // ---- Continue playing: a game without saves
  await page.click('.game-card[data-shelf="picks"][data-id="lariat"]');
  await page.waitForTimeout(200);
  await page.click('#detail [data-play="lariat"]');
  await page.waitForTimeout(900);
  evs = await events(page);
  const opened = evs.filter(e => e.ev === 'game_detail_open').pop();
  let launch = evs.filter(e => e.ev === 'game_launch').pop();
  check(opened && opened.game === 'lariat' && opened.source === 'picks', 'opening a game\'s page records the shelf it came from', opened && opened.source);
  check(launch && launch.game === 'lariat' && launch.shelf === 'detail' && launch.origin === 'picks', 'a launch from the page keeps the shelf that led there', launch && `${launch.shelf} / ${launch.origin}`);
  await page.click('#backBtn');
  await page.waitForTimeout(300);
  await page.click('#detailBack');
  await page.waitForTimeout(300);
  h = await readHome(page);
  let c = h.cont[0];
  check(h.blocks[0].id === 'continue' && h.blocks[0].more && h.cont.length === 1 && c.id === 'lariat', 'Continue playing appears first, with only the game just played', h.cont.map(x => x.id).join());
  check(c.artFirst && c.genre === 'Arcade' && c.icon && c.meta === 'Played today' && !c.pct && c.buttons === 0,
    'a Continue card: art on top, category icon and name, an honest "Played today", no bar and no play button', JSON.stringify(c));
  check(h.blocks[1].id === 'picks' && h.blocks[1].title === 'Picked for you' && h.blocks[1].cards[h.blocks[1].cards.length - 1] === 'lariat',
    'Top picks becomes Picked for you, with played games only filling in at the end', h.blocks[1].title + ': ' + h.blocks[1].cards.join());
  check(await page.getAttribute('#playFab', 'aria-label') === 'Play Lariat', 'the Play button now resumes the game played last');

  // Tapping the card launches the game straight away, from the continue shelf
  await page.click('#feed .cont[data-id="lariat"]');
  await page.waitForTimeout(700);
  evs = await events(page);
  launch = evs.filter(e => e.ev === 'game_launch').pop();
  check(await page.evaluate(() => window.__kiln.game) === 'lariat' && !(await page.evaluate(() => window.__kiln.detail)) && launch.shelf === 'continue',
    'tapping a Continue card launches the game, logged from the continue shelf', launch && launch.shelf);
  await page.goBack();
  await page.waitForTimeout(300);
  // The centre Play button resumes it too
  await page.click('#playFab');
  await page.waitForTimeout(700);
  launch = (await events(page)).filter(e => e.ev === 'game_launch').pop();
  check(await page.evaluate(() => window.__kiln.game) === 'lariat' && launch.shelf === 'play-button', 'the Play button launches the game played last', launch && launch.shelf);
  await page.goBack();
  await page.waitForTimeout(300);
  await page.click('#feed [data-block="continue"] .more-link');
  await page.waitForTimeout(250);
  check(await page.evaluate(() => window.__kiln.tab) === 'library', 'View all on Continue playing opens Library');
  await page.goBack();
  await page.waitForTimeout(250);

  // ---- A real percentage: the game reports one through the SDK message, and only then is there a bar
  await page.click('.game-card[data-shelf="picks"][data-id="goldmend"]');
  await page.waitForTimeout(200);
  await page.click('#detail [data-play="goldmend"]');
  await page.waitForTimeout(900);
  await page.frameLocator('#player iframe').locator('body').evaluate(() => parent.postMessage({ kiln: 1, type: 'progress', id: 'goldmend', progress: { label: 'Level 7', pct: 23 } }, '*'));
  await page.waitForTimeout(100);
  await page.goBack();
  await page.waitForTimeout(200);
  await page.goBack();
  await page.waitForTimeout(300);
  h = await readHome(page);
  c = h.cont.find(x => x.id === 'goldmend');
  check(h.cont[0].id === 'goldmend' && c.pct === '23%' && c.bar === '23%' && !c.meta && /23% complete/.test(c.label), 'a reported percentage shows a bar and its number', JSON.stringify(c));
  // Stored by the SDK on the phone: read back after a restart, and kept within 0..100
  await page.evaluate(() => localStorage.setItem('kiln:goldmend:progress', JSON.stringify({ label: 'Level 31', pct: 140, ts: Date.now() })));
  await page.reload();
  await page.waitForTimeout(500);
  c = (await readHome(page)).cont.find(x => x.id === 'goldmend');
  check(c && c.pct === '100%' && c.bar === '100%', 'a stored percentage is read back and kept within 0 to 100', c && c.pct);
  await page.evaluate(() => localStorage.removeItem('kiln:goldmend:progress'));

  // ---- Crosswake keeps a run between visits; drop stones in it (standalone, which also counts as a launch)
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
  c = h.cont[0];
  check(c.id === 'crosswake' && c.meta === `Pond ${pond} · today` && !c.pct && /^Resume Crosswake\./.test(c.label), 'a saved run without a percentage shows its real progress as text, no bar', JSON.stringify(c));
  // Play until the stones run out: the run is over, so the card goes back to "Played today"
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
  c = (await readHome(page)).cont[0];
  check(over === 'over' && c.meta === 'Played today' && /^Play Crosswake\./.test(c.label), 'when the run ends, the card no longer offers to resume', `${over}: ${JSON.stringify(c)}`);

  // Tessera saves after every move: one move is enough to show the score
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
  check(score >= 0 && h.cont[0].id === 'tessera' && h.cont[0].meta === `Score ${score} · today`, 'Tessera mid-game shows its score', JSON.stringify(h.cont[0]));
  check(h.cont.map(x => x.id).sort().join() === 'crosswake,goldmend,lariat,tessera', 'Continue playing lists only games that were launched', h.cont.map(x => x.id).join());
  await ctx.close();

  // ---- Auto-advance (sped up with heroMs): moves on by itself, and stops for good once the player touches it
  const ctx3 = await newContext();
  const p3 = await newPage(ctx3);
  await p3.goto(url + '&heroMs=500');
  await p3.waitForTimeout(1300);
  const moved = await heroIndex(p3);
  check(moved > 0, 'the carousel moves on by itself', moved);
  const box3 = await p3.locator('#heroTrack').boundingBox();
  await p3.touchscreen.tap(box3.x + 20, box3.y + box3.height - 10);
  const touched = await heroIndex(p3);
  await p3.waitForTimeout(1300);
  check(await heroIndex(p3) === touched, 'after a touch it stays where the player left it', `${touched} -> ${await heroIndex(p3)}`);
  // Play Now launches the slide's game, from the featured shelf
  const shownId = (await readHome(p3)).featured[touched];
  await p3.evaluate(i => document.querySelectorAll('#heroTrack .feature-cta')[i].click(), touched);
  await p3.waitForTimeout(500);
  launch = (await events(p3)).filter(e => e.ev === 'game_launch').pop();
  check(launch && launch.game === shownId && launch.shelf === 'featured', 'Play Now launches the game on the slide', launch && `${launch.game} / ${launch.shelf}`);
  await ctx3.close();

  // ---- Reduced motion: no auto-advance; the Play button on a fresh install starts the first featured game
  const ctx4 = await newContext({ reducedMotion: 'reduce' });
  const p4 = await newPage(ctx4);
  await p4.goto(url + '&heroMs=300');
  await p4.waitForTimeout(1100);
  check(await heroIndex(p4) === 0, 'with reduced motion the carousel stays still', await heroIndex(p4));
  await p4.click('#playFab');
  await p4.waitForTimeout(500);
  launch = (await events(p4)).filter(e => e.ev === 'game_launch').pop();
  check(launch && launch.game === reg.featured[0] && launch.shelf === 'play-button', 'on a fresh install the Play button starts the first featured game', launch && launch.game);
  await ctx4.close();

  // ---- "New" is relative, and a category with enough games not shown above gets its own shelf.
  // Two older games plus four extra Action games (pointing at an existing page) stand in for a bigger catalogue.
  const ctx2 = await newContext();
  await ctx2.route(/games\/registry\.js/, async r => {
    let body = fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8')
      .replace(/(id: 'goldmend'[\s\S]*?added: ')[^']+/, '$12020-01-05')
      .replace(/(id: 'lariat'[\s\S]*?added: ')[^']+/, '$12020-01-05');
    body = body.replace(/added: '2026-10-\d\d'/g, `added: '${new Date().toISOString().slice(0, 10)}'`);
    const extra = [1, 2, 3, 4].map(n => `{ id: 'extra${n}', title: 'Extra ${n}', pitch: 'x', genre: 'Action', accent: '--g3', status: 'beta', path: 'games/lariat/index.html', added: '2020-01-05' },`).join('\n');
    r.fulfill({ status: 200, contentType: 'text/javascript', body: body.replace(/\n\];\n\n\/\* Editorial/, m => '\n' + extra + m) });
  });
  const p2 = await newPage(ctx2);
  await p2.goto(url);
  await p2.waitForTimeout(500);
  h = await readHome(p2);
  check(h.labels.tessera === 'New' && h.labels.crosswake === 'New' && !h.labels.goldmend && !h.labels.lariat, 'only games newer than the rest are labelled New', JSON.stringify(h.labels));
  check(h.cats.join() === 'All Games*,Action,Puzzle,Arcade', 'category tiles follow the category order', h.cats.join());
  const action = h.blocks.find(b => b.id === 'genre-action');
  const above = new Set(h.blocks.slice(0, h.blocks.indexOf(action)).flatMap(b => b.cards));
  check(action && action.more && action.cards.length >= 2 && action.cards.every(id => !above.has(id)), 'a category shelf takes games not shown above it, with View all', action && action.cards.join());
  await p2.click('#feed [data-block="genre-action"] .more-link');
  await p2.waitForTimeout(250);
  const disc = await p2.evaluate(() => ({ tab: window.__kiln.tab, genre: window.__kiln.filters.genre }));
  check(disc.tab === 'discover' && disc.genre === 'Action', 'View all on a category shelf opens Discover filtered to it', JSON.stringify(disc));
  await ctx2.close();

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
