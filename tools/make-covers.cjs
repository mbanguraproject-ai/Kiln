// Screenshots each playable game's first frame into games/<id>/cover.jpg for the hub cards.
// Usage: node tools/make-covers.cjs [--port 8899]
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8899) || 8899;
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8'), sandbox);
const games = sandbox.window.KILN_GAMES.filter(g => g.status !== 'soon');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

(async () => {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(PORT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 500 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
  for (const g of games) {
    if (!fs.existsSync(path.join(ROOT, g.path))) { console.warn('skip', g.id); continue; }
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/${g.path}?cover`);
    await page.waitForTimeout(1800);
    const out = path.join(ROOT, 'games', g.id, 'cover.jpg');
    await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
    console.log('wrote', path.relative(ROOT, out));
    await page.close();
  }
  await browser.close();
  srv.close();
})();
