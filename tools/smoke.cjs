// Smoke test for the Kiln hub and its games, in headless Chromium.
// Usage: node tools/smoke.cjs [--game <id>] [--port 8790] [--shots <dir>] [--bundle dist/kiln.html]
// Needs playwright (npm i -D playwright, or a global install on NODE_PATH).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..');
const PORT = +opt('port', 8790);
const ONLY = opt('game', null);
const SHOTS = opt('shots', null);
const BUNDLE = opt('bundle', null);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

(async () => {
  const srv = BUNDLE ? null : await serve();
  const base = BUNDLE ? 'file://' + path.resolve(BUNDLE) : `http://localhost:${PORT}/index.html`;
  const browser = await chromium.launch();
  const problems = [];
  const report = [];
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  // Fonts are not part of the test; answer them empty so missing network is not reported as an error.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`page error: ${e.message}`));
  await page.goto(base + '?debug');
  await page.waitForTimeout(400);
  const games = await page.evaluate(() => window.__kiln.GAMES.filter(g => g.status !== 'soon').map(g => g.id));
  const cards = await page.locator('.card').count();
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'hub-home.png') }); }
  for (const id of games) {
    if (ONLY && id !== ONLY) continue;
    const before = await page.evaluate(() => window.__kiln.Log.all().length);
    // The real path: a card opens the game's page, and Play on the page launches it.
    await page.click(`.game-card[data-id="${id}"]`);
    await page.click(`#detail [data-play="${id}"]`);
    let ready = true;
    try { await page.waitForSelector('#loading', { state: 'hidden', timeout: 6500 }); } catch (e) { ready = false; }
    await page.waitForTimeout(600);
    const box = await page.locator('#frame iframe').boundingBox();
    // A few taps and a drag in the middle of the game, as a player would.
    if (box) {
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      await page.mouse.click(cx, cy);
      await page.mouse.move(cx - 60, cy + 80);
      await page.mouse.down();
      await page.mouse.move(cx + 40, cy - 60, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
    }
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `hub-${id}.png`) });
    await page.click('#backBtn');
    await page.waitForTimeout(300);
    await page.click('#detailBack');
    await page.waitForTimeout(300);
    const evs = await page.evaluate(n => window.__kiln.Log.all().slice(n).map(e => e.ev + (e.game ? ':' + e.game : '')), before);
    const need = [`game_detail_open:${id}`, `game_launch:${id}`, `launch_result:${id}`, `game_open:${id}`, `game_close:${id}`];
    const missing = need.filter(x => !evs.includes(x));
    if (!ready) problems.push(`${id}: never sent Arcade.ready() within 6.5s`);
    if (missing.length) problems.push(`${id}: missing events ${missing.join(', ')}`);
    if (!evs.some(x => x === `run_start:${id}`)) problems.push(`${id}: no run_start event (call Arcade.runStart when play begins)`);
    report.push({ game: id, ready, events: evs });
  }
  // Each game must also work when its page is opened directly.
  if (!BUNDLE) {
    for (const id of games) {
      if (ONLY && id !== ONLY) continue;
      const p2 = await ctx.newPage();
      await p2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      const errs = [];
      p2.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      p2.on('pageerror', e => errs.push(e.message));
      await p2.goto(`http://localhost:${PORT}/games/${id}/index.html`);
      await p2.waitForTimeout(900);
      if (SHOTS) await p2.screenshot({ path: path.join(SHOTS, `standalone-${id}.png`) });
      errs.forEach(t => problems.push(`${id} standalone: ${t}`));
      await p2.close();
    }
  }
  await browser.close();
  if (srv) srv.close();
  console.log(JSON.stringify({ cards, games, report, problems }, null, 2));
  process.exit(problems.length ? 1 : 0);
})();
