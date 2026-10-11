// Game detail test (blueprint section 6): every game's page, the facts on it checked against the game itself,
// the card -> page -> game -> page -> back path, favourites, Resume, related games, coming soon and launch failure.
// Usage: node tools/detail-test.cjs [--port 8794]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8794) || 8794;
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

// JPEG size from its SOF marker, without an image library.
function jpegSize(file) {
  const b = fs.readFileSync(file);
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

(async () => {
  // ---- The registry's detail facts, checked against the games themselves
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8'), sb);
  const GAMES = sb.window.KILN_GAMES;
  const playable = GAMES.filter(g => g.status !== 'soon');
  for (const g of playable) {
    const src = fs.readFileSync(path.join(ROOT, g.path), 'utf8');
    // The rules, read from the game's source: a game keeps a run when it reports one with progress(...) (Arcade.progress
    // directly, or through a helper that ends in it). It plays by keyboard when it handles the arrow keys itself
    // (ArrowLeft and ArrowUp), or reads keys through the kit's input (isDown, pressed, onKey, axisX, axisY); the kit
    // shell's Enter/Space/Escape for menus alone does not count.
    const reportsRuns = /\bprogress\(/.test(src);
    check(g.saves === (reportsRuns ? 'run' : 'best'), `${g.id}: "saves" matches whether the game keeps a run (progress)`, g.saves);
    const keyboard = (/ArrowLeft/.test(src) && /ArrowUp/.test(src)) || /\.(isDown|pressed|onKey|axisX|axisY)\(/.test(src);
    check(/keyboard/i.test(g.controls || '') === keyboard, `${g.id}: "controls" matches the game's keyboard support`, g.controls);
    const sentences = (g.about || '').split(/(?<=\.)\s+/).filter(Boolean).length;
    check(sentences >= 2 && sentences <= 4, `${g.id}: "about" is two to four sentences`, sentences);
    const shots = g.shots || [];
    const sizes = shots.map(s => fs.existsSync(path.join(ROOT, s)) && jpegSize(path.join(ROOT, s)));
    check(shots.length >= 2 && sizes.every(z => z && z.w === 540 && z.h === 1140), `${g.id}: at least two real 540x1140 screenshots`, JSON.stringify(sizes));
  }

  await new Promise(r => srv.listen(PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const watchErrors = p => {
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    p.on('pageerror', e => errors.push(e.message));
  };
  const ctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  watchErrors(page);
  const url = `http://localhost:${PORT}/index.html?debug`;
  await page.goto(url);
  await wait(500);
  const state = () => page.evaluate(() => ({ tab: window.__kiln.tab, game: window.__kiln.game, detail: window.__kiln.detail }));
  const back = async () => { await page.goBack(); await wait(250); };
  const readDetail = () => page.evaluate(() => {
    const d = document.getElementById('detail');
    const q = s => d.querySelector(s);
    return {
      title: (q('#detailTitle') || {}).textContent,
      meta: (q('.detail-meta') || {}).textContent,
      play: q('.detail-action .play-btn') ? q('.detail-action .play-btn').textContent : null,
      disabled: !!q('.detail-action button:disabled'),
      note: (q('.detail-action .note') || {}).textContent || '',
      facts: [...d.querySelectorAll('.facts li')].map(li => li.textContent),
      sections: [...d.querySelectorAll('.detail-sec > h2')].map(h => h.textContent),
      shots: [...d.querySelectorAll('.shots img')].map(i => i.complete && i.naturalWidth > 0),
      related: [...d.querySelectorAll('.detail-sec .game-card')].map(c => c.dataset.id),
      fav: q('.fav') ? q('.fav').getAttribute('aria-pressed') : null,
    };
  });

  // ---- Every playable game's page
  for (const g of playable) {
    await page.evaluate(id => window.__kiln.openDetail(id, 'test'), g.id);
    await wait(300);
    const d = await readDetail();
    await page.evaluate(() => Promise.all([...document.querySelectorAll('#detail img')].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })));
    const shots = (await readDetail()).shots;
    check(d.title === g.title && d.meta.startsWith(g.genre) && (g.status === 'beta') === /Beta/.test(d.meta), `${g.id}: title, genre and beta label`, d.meta);
    check(d.play === 'Play' && !d.disabled, `${g.id}: one primary action, Play`, d.play);
    check(d.facts.length === 6 && d.facts.includes('Plays offline') && d.facts.includes(g.controls), `${g.id}: quick facts`, d.facts.join(' | '));
    check(shots.length === g.shots.length && shots.every(Boolean), `${g.id}: screenshots load`, shots.join());
    check(d.sections.includes('How it plays') && !d.sections.includes('Your record'), `${g.id}: How it plays; no record before playing`, d.sections.join(' | '));
    // Related games share a collection or the category; a game alone in both gets no section rather than filler.
    const peers = playable.some(x => x.id !== g.id && (x.genre === g.genre || (sb.window.KILN_COLLECTIONS || []).some(c => c.games.includes(g.id) && c.games.includes(x.id))));
    check(peers ? d.related.length > 0 && !d.related.includes(g.id) : d.related.length === 0, `${g.id}: related games when it has peers, never itself`, d.related.join() || 'none');
    await back();
  }
  check(!(await state()).detail, 'Back closes each page');

  // ---- Card -> page -> game -> page -> Home
  await page.click('.game-card[data-shelf="collection:one-more-run"][data-id="goldmend"]');
  await wait(250);
  let s = await state();
  check(s.detail === 'goldmend' && !s.game, 'a card opens the game\'s page');
  await page.evaluate(() => { const d = document.getElementById('detail'); d.scrollTop = 400; });
  await wait(150);
  check(await page.evaluate(() => document.getElementById('detail').classList.contains('scrolled')), 'scrolling past the art shows the title bar');
  await page.click('#detail [data-play="goldmend"]');
  await wait(900);
  s = await state();
  check(s.game === 'goldmend' && s.detail === 'goldmend', 'Play launches the game over its page');
  let evs = await page.evaluate(() => window.__kiln.Log.all());
  const launch = evs.filter(e => e.ev === 'game_launch').pop();
  check(launch.shelf === 'detail' && launch.origin === 'collection:one-more-run', 'the launch records the page and the shelf that led to it', `${launch.shelf} / ${launch.origin}`);
  check(evs.some(e => e.ev === 'launch_result' && e.game === 'goldmend' && e.ok === true && typeof e.ms === 'number'), 'a successful launch logs launch_result with its time');
  await back();
  s = await state();
  check(!s.game && s.detail === 'goldmend', 'Back closes the game and shows its page again');
  let d = await readDetail();
  check(d.sections.includes('Your record'), 'after playing, the page shows your record', d.sections.join(' | '));

  // ---- Related games stack, and Back unwinds them
  await page.click('#detail .detail-sec .game-card[data-id="lariat"]');
  await wait(250);
  check((await state()).detail === 'lariat', 'a related game opens its own page');
  await back();
  check((await state()).detail === 'goldmend', 'Back returns to the first page');
  await back();
  s = await state();
  check(!s.detail && s.tab === 'home', 'Back again returns Home', JSON.stringify(s));

  // ---- Favourites
  await page.evaluate(() => window.__kiln.openDetail('tessera', 'test'));
  await wait(250);
  await page.click('#detail .fav');
  d = await readDetail();
  evs = await page.evaluate(() => window.__kiln.Log.all());
  check(d.fav === 'true' && (await page.evaluate(() => window.__kiln.favourites())).includes('tessera'), 'the heart adds a favourite');
  check(evs.some(e => e.ev === 'favourite_change' && e.game === 'tessera' && e.action === 'add'), 'favourite_change is logged');
  await back();
  await page.click('.tab[data-tab="library"]');
  await wait(250);
  const favRows = await page.$$eval('#favs .lib-row', rows => rows.map(r => r.dataset.id));
  const libMeta = await page.$eval('#favs .lib-meta', m => m.textContent);
  check(favRows.join() === 'tessera' && /Not played yet/.test(libMeta), 'Library lists the favourite, even before it is played', libMeta);
  await page.click('#favs .lib-open');
  await wait(250);
  await page.click('#detail .fav');
  await back();
  await wait(150);
  check(await page.locator('#favs').isHidden(), 'removing the favourite takes it off Library');
  await page.click('.tab[data-tab="home"]');
  await wait(200);

  // ---- Resume: Crosswake keeps a run between visits
  const game = await ctx.newPage();
  watchErrors(game);
  await game.goto(`http://localhost:${PORT}/games/crosswake/index.html?debug`);
  await wait(600);
  const pond = await game.evaluate(() => {
    const C = window.__crosswake;
    C.manual(true);
    const st = C.P.solution[0];
    C.placeDelay(st.A, st.B, st.delay);
    C.release();
    C.finish();
    return C.P.n;
  });
  await game.close();
  await page.goto('about:blank');
  await page.goto(url + '#details/crosswake');
  await wait(500);
  d = await readDetail();
  check(d.play === 'Resume' && d.note === `Pond ${pond} · saved on this phone`, 'a saved run turns Play into Resume, with its progress', `${d.play}: ${d.note}`);
  await back();
  check(!(await state()).detail && (await state()).tab === 'home', 'Back from a deep-linked page goes Home');

  // ---- Coming soon
  await page.evaluate(() => window.__kiln.openDetail('span', 'test'));
  await wait(250);
  d = await readDetail();
  check(d.play === null && d.disabled && d.facts.length === 0 && /In development/.test(d.meta), 'a coming-soon page has no Play, no facts, and says it is in development', d.meta);
  await back();

  // ---- Launch failure keeps the player in context
  const fctx = await browser.newContext({ ...devices['Pixel 7'], serviceWorkers: 'block' });
  await fctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const blank = r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body></body>' });
  await fctx.route(/games\/lariat\/index\.html/, blank);
  const f = await fctx.newPage();
  watchErrors(f);
  await f.goto(`http://localhost:${PORT}/index.html?debug&launchTimeout=1200#details/lariat`);
  await wait(400);
  await f.click('#detail [data-play="lariat"]');
  await wait(1700);
  check(await f.locator('#launchFail').isVisible() && /Lariat didn't start/.test(await f.locator('#launchFailTitle').textContent()), 'a game that never starts shows the failure panel');
  evs = await f.evaluate(() => window.__kiln.Log.all());
  check(evs.some(e => e.ev === 'launch_result' && e.ok === false && e.reason === 'timeout'), 'the failure is logged as launch_result');
  await fctx.unroute(/games\/lariat\/index\.html/, blank);
  await f.click('#retryBtn');
  await wait(1500);
  check(await f.locator('#launchFail').isHidden() && await f.evaluate(() => window.__kiln.game) === 'lariat', 'Try again loads the game once it can start');
  await f.click('#backBtn');
  await wait(250);
  check(await f.evaluate(() => window.__kiln.detail) === 'lariat', 'Back from the retried game returns to its page');
  await fctx.close();

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
