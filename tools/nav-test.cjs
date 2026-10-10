// Hub navigation test (blueprint section 3): tabs, the Play button, Settings from the profile button, Back through
// real history, scroll memory, sheets, Library.
// Usage: node tools/nav-test.cjs [--port 8792]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8792) || 8792;
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

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://localhost:${PORT}/index.html?debug`;
  await page.goto(url);
  await page.waitForTimeout(400);
  const state = () => page.evaluate(() => ({
    tab: window.__kiln.tab, game: window.__kiln.game, detail: window.__kiln.detail,
    sheet: !document.getElementById('sheet').hidden, insights: !document.getElementById('insights').hidden,
    current: [...document.querySelectorAll('.tab')].filter(b => b.getAttribute('aria-current') === 'page').map(b => b.dataset.tab),
  }));
  const tap = async sel => { await page.click(sel); await page.waitForTimeout(150); };
  const back = async () => { await page.goBack(); await page.waitForTimeout(200); };
  const profile = '.view:not([hidden]) .profile-btn'; // Settings opens from the header of whichever tab is showing

  let s = await state();
  check(s.tab === 'home' && s.current.join() === 'home', 'opens on Home, marked as the current tab', JSON.stringify(s));
  const bar = await page.$$eval('#tabbar > button', bs => bs.map(b => b.dataset.tab || b.id));
  check(bar.join() === 'home,library,playFab,discover', 'the bar: Home, Library, the Play button in the middle, Discover', bar.join());
  const fab = await page.evaluate(() => {
    const f = document.querySelector('#playFab .fab').getBoundingClientRect(), b = document.getElementById('tabbar').getBoundingClientRect();
    return { centre: Math.abs(f.left + f.width / 2 - (b.left + b.width / 2)), raised: b.top - f.top };
  });
  check(fab.centre < 2 && fab.raised > 10, 'the Play button sits in the centre, raised above the bar', JSON.stringify(fab));
  const onStyle = await page.evaluate(() => {
    const st = b => { const c = getComputedStyle(b); return c.fontWeight + ' ' + getComputedStyle(b.querySelector('svg')).fillOpacity; };
    return { on: st(document.querySelector('.tab.on')), off: st(document.querySelector('.tab:not(.on)')) };
  });
  check(onStyle.on !== onStyle.off, 'the current tab differs in weight and a filled icon, not colour alone', JSON.stringify(onStyle));

  await tap('.tab[data-tab="library"]');
  s = await state();
  check(s.tab === 'library' && s.current.join() === 'library', 'Library tab opens');
  check(await page.locator('#libraryEmpty').isVisible(), 'a fresh Library explains what will appear');
  await back();
  check((await state()).tab === 'home', 'Back from Library returns Home');

  await tap(profile);
  s = await state();
  check(s.tab === 'settings' && s.current.length === 0, 'the profile button opens Settings, which is not a tab', JSON.stringify(s));
  await tap('#settingsBack');
  check((await state()).tab === 'home', 'the back button in Settings returns Home');
  await tap('.tab[data-tab="library"]');
  await tap(profile);
  await back();
  check((await state()).tab === 'home', 'Back from Settings (reached through Library) goes Home, not to Library');
  check(await page.evaluate(() => history.state && history.state.tab === 'home'), 'at Home the history is at its root, so Android Back leaves the app');

  // Scroll memory: each tab is its own scroll view, so leaving one for another tab or for Settings and coming back
  // finds it where it was. The profile button is clicked from script, because Playwright would scroll it into view.
  const scrollOf = t => page.evaluate(t => document.getElementById('view-' + t).scrollTop, t);
  const scrollTo = (t, y) => page.evaluate(([t, y]) => { document.getElementById('view-' + t).scrollTop = y; }, [t, y]);
  await scrollTo('home', 260);
  let before = await scrollOf('home');
  await tap('.tab[data-tab="library"]');
  await tap('.tab[data-tab="home"]');
  check(before > 0 && await scrollOf('home') === before, 'Home keeps its scroll position across tab switches', `${before} -> ${await scrollOf('home')}`);
  await page.evaluate(() => document.querySelector('#view-home .profile-btn').click());
  await page.waitForTimeout(150);
  await back();
  check((await state()).tab === 'home' && await scrollOf('home') === before, 'Home keeps its scroll position after Settings and Back', `${before} -> ${await scrollOf('home')}`);
  await tap('.tab[data-tab="discover"]');
  await scrollTo('discover', 200);
  before = await scrollOf('discover');
  await tap('.tab[data-tab="library"]');
  await tap('.tab[data-tab="discover"]');
  check(before > 0 && await scrollOf('discover') === before, 'Discover keeps its scroll position across tab switches', `${before} -> ${await scrollOf('discover')}`);
  await tap('.tab[data-tab="home"]');
  check(await scrollOf('home') > 0, 'Home is still where it was after visiting Discover and Library');
  await scrollTo('home', 0);

  // Card, game page, game, sheet, then Back through all of them
  await tap('.game-card[data-shelf="picks"][data-id="lariat"]');
  s = await state();
  check(s.detail === 'lariat' && !s.game, 'a card opens the game\'s page, not the game', JSON.stringify(s));
  await tap('#detail [data-play="lariat"]');
  await page.waitForTimeout(500);
  s = await state();
  check(s.game === 'lariat' && await page.locator('#backLabel').textContent() === 'Details', 'Play on the page launches the game, with Back to Details');
  await tap('#playerSettingsBtn');
  check((await state()).sheet, 'the in-game settings sheet opens');
  await back();
  s = await state();
  check(!s.sheet && s.game === 'lariat', 'Back closes the sheet and leaves the game open', JSON.stringify(s));
  await back();
  s = await state();
  check(!s.game && s.detail === 'lariat', 'Back closes the game and returns to its page', JSON.stringify(s));
  await back();
  s = await state();
  check(!s.detail && s.tab === 'home', 'Back again returns Home', JSON.stringify(s));
  const evs = await page.evaluate(() => window.__kiln.Log.all().map(e => e.ev));
  check(evs.includes('home_view') && evs.includes('library_view') && evs.includes('settings_view'), 'tab views are logged with the blueprint event names');

  // Library after playing, and launching from it
  await tap('.tab[data-tab="library"]');
  const rows = await page.locator('.lib-row').count();
  const meta = rows ? await page.locator('.lib-row .lib-meta').first().textContent() : '';
  check(rows === 1 && /Played today/.test(meta), 'Library lists the game just played', `${rows} row, "${meta}"`);
  await tap('.lib-row .lib-open');
  s = await state();
  check(s.detail === 'lariat', 'a Library row opens the game\'s page');
  await back();
  check(!(await state()).detail && (await state()).tab === 'library', 'Back from the page returns to Library');
  await tap('.lib-row .lib-play');
  await page.waitForTimeout(400);
  const label = await page.locator('#backLabel').textContent();
  check((await state()).game === 'lariat' && label === 'Library', 'a game opened from Library offers Back to Library', label);
  await tap('#backBtn');
  await page.waitForTimeout(150);
  s = await state();
  check(!s.game && s.tab === 'library', 'the back button returns to Library', JSON.stringify(s));

  // Settings, insights, and settings shared with the in-game sheet
  await tap(profile);
  await tap('#view-settings [data-set="sound"]');
  const off = await page.evaluate(() => window.__kiln.settings().sound);
  await tap('#openInsights');
  check((await state()).insights, 'Play insights opens from Settings');
  await back();
  s = await state();
  check(!s.insights && s.tab === 'settings', 'Back from insights returns to Settings', JSON.stringify(s));
  await tap('.tab[data-tab="home"]');
  await tap('.feature .play-btn');
  await page.waitForTimeout(400);
  await tap('#playerSettingsBtn');
  const sheetSound = await page.getAttribute('#sheet [data-set="sound"]', 'aria-checked');
  check(off === false && sheetSound === 'false', 'a setting changed in the Settings tab shows the same in the in-game sheet');
  await tap('#sheet [data-set="sound"]');
  await tap('#sheetDone');
  check(!(await state()).sheet && !!(await state()).game, 'Done closes the sheet and returns to the game');
  await tap('#backBtn');

  // The Play button resumes the game played last
  const lastGame = await page.evaluate(() => window.__kiln.Log.all().filter(e => e.ev === 'game_launch').pop().game);
  await tap('#playFab');
  await page.waitForTimeout(300);
  s = await state();
  let launched = await page.evaluate(() => window.__kiln.Log.all().filter(e => e.ev === 'game_launch').pop());
  check(s.game === lastGame && launched.shelf === 'play-button', 'the Play button resumes the game played last', `${s.game} / ${launched.shelf}`);
  await back();
  check(!(await state()).game && (await state()).tab === 'home', 'Back from it returns Home');

  // Deep link, opened fresh like a link from outside the app
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(`http://localhost:${PORT}/index.html?debug#library`);
  await p2.waitForTimeout(300);
  check(await p2.evaluate(() => window.__kiln.tab) === 'library', 'a #library link opens the Library tab');
  await p2.goBack();
  await p2.waitForTimeout(200);
  check(await p2.evaluate(() => window.__kiln.tab) === 'home', 'Back from a deep-linked tab goes Home');
  await p2.close();

  // On a phone that has played nothing, the Play button starts the first featured game
  const fresh = await browser.newContext({ ...devices['Pixel 7'] });
  await fresh.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const p3 = await fresh.newPage();
  p3.on('pageerror', e => errors.push(e.message));
  await p3.goto(url);
  await p3.waitForTimeout(300);
  const first = await p3.evaluate(() => window.__kiln.GAMES.find(g => g.featured && g.status !== 'soon').id);
  await p3.click('#playFab');
  await p3.waitForTimeout(300);
  check(await p3.evaluate(() => window.__kiln.game) === first, 'with nothing played, the Play button starts the first featured game', first);
  await fresh.close();

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
