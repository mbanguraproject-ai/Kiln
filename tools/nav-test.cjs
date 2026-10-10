// Hub navigation test (blueprint section 3): tabs, Back through real history, scroll memory, sheets, Library.
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

  let s = await state();
  check(s.tab === 'home' && s.current.join() === 'home', 'opens on Home, marked as the current tab', JSON.stringify(s));
  check(await page.locator('.tab').count() === 4, 'four tabs: Home, Discover, Library, Settings (no empty destinations)');

  await tap('.tab[data-tab="library"]');
  s = await state();
  check(s.tab === 'library' && s.current.join() === 'library', 'Library tab opens');
  check(await page.locator('#libraryEmpty').isVisible(), 'a fresh Library explains what will appear');
  await back();
  check((await state()).tab === 'home', 'Back from Library returns Home');

  await tap('.tab[data-tab="library"]');
  await tap('.tab[data-tab="settings"]');
  await back();
  check((await state()).tab === 'home', 'Back from Settings (reached through Library) goes Home, not to Library');
  check(await page.evaluate(() => history.state && history.state.tab === 'home'), 'at Home the history is at its root, so Android Back leaves the app');

  // Scroll memory per tab
  await page.evaluate(() => { const v = document.getElementById('view-home'); v.scrollTop = 260; });
  const before = await page.evaluate(() => document.getElementById('view-home').scrollTop);
  await tap('.tab[data-tab="settings"]');
  await tap('.tab[data-tab="home"]');
  const after = await page.evaluate(() => document.getElementById('view-home').scrollTop);
  check(before > 0 && after === before, 'Home keeps its scroll position across tab switches', `${before} -> ${after}`);

  // Card, game page, game, sheet, then Back through all of them
  await tap('.game-card[data-id="lariat"]');
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

  // Settings tab, insights, and settings shared with the in-game sheet
  await tap('.tab[data-tab="settings"]');
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

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
