// Screenshot tool: renders every screen and a few flight moments at the given sizes into shots/.
// Usage: node tools/screens.cjs [390x844x3] [1280x800x1] [3840x2160x1] [--only=title,flight] [--quality=ultra] [--port=8902]
// Needs Playwright (NODE_PATH=/opt/node22/lib/node_modules if it is installed globally).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { serve } = require('./serve.cjs');

const args = process.argv.slice(2);
const sizes = args.filter(a => /^\d+x\d+/.test(a));
if (!sizes.length) sizes.push('390x844x3', '1280x800x1', '3840x2160x1');
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const port = +((args.find(a => a.startsWith('--port=')) || '').slice(7)) || 8902;
// A fixed tier, so a 4K shot shows 4K quality: headless Chromium draws on the CPU, and on Auto the governor would
// step down. --quality=auto keeps the governor.
const quality = (args.find(a => a.startsWith('--quality=')) || '').slice(10) || 'ultra';
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ['title', async p => { await p.waitForTimeout(900); }],
  ['roost', async p => { await p.evaluate(() => { __ppTest.clearAll(); __ppTest.moths(1450); __ppTest.show('roost'); }); await p.waitForTimeout(500); }],
  ['map', async p => { await p.evaluate(() => __ppTest.show('map')); await p.waitForTimeout(400); }],
  ['brief', async p => { await p.evaluate(() => __ppTest.show('brief', { id: '1-3' })); await p.waitForTimeout(400); }],
  ['hangar', async p => { await p.evaluate(() => __ppTest.show('hangar')); await p.waitForTimeout(600); }],
  ['journal', async p => { await p.evaluate(() => __ppTest.show('journal')); await p.waitForTimeout(300); }],
  ['requests', async p => { await p.evaluate(() => __ppTest.show('requests')); await p.waitForTimeout(300); }],
  ['settings', async p => { await p.evaluate(() => __ppTest.show('settings')); await p.waitForTimeout(300); }],
  ['longnight', async p => { await p.evaluate(() => __ppTest.show('longnight')); await p.waitForTimeout(300); }],
  ['flight', async p => {
    await p.evaluate(() => { __ppTest.startCave('1-3'); __ppTest.autopilot(true, {}); __ppTest.step(9); __ppTest.autopilot(false); __ppTest.chirp(); });
    await p.waitForTimeout(450);
  }],
  ['flight-shriek', async p => { await p.evaluate(() => { __ppTest.shriek(); }); await p.waitForTimeout(700); }],
  ['pause', async p => { await p.evaluate(() => __ppTest.pause()); await p.waitForTimeout(300); }],
  ['escape', async p => {
    await p.evaluate(() => { __ppTest.startCave('1-6'); __ppTest.autopilot(true, { fast: true }); __ppTest.step(12); __ppTest.autopilot(false); __ppTest.input(-1, 0); __ppTest.step(1.2); __ppTest.input(0, 0); __ppTest.chirp(); });
    await p.waitForTimeout(500);
  }],
  ['silk', async p => {
    await p.evaluate(() => { __ppTest.startCave('1-5', 'hark'); __ppTest.autopilot(true, {}); __ppTest.step(14); __ppTest.autopilot(false); __ppTest.chirp(); });
    await p.waitForTimeout(500);
  }],
  ['results', async p => {
    await p.evaluate(() => { __ppTest.startCave('1-2'); __ppTest.autopilot(true, { careful: true }); for (let i = 0; i < 120 && __ppTest.info().sub === 'cave'; i++) __ppTest.step(1); __ppTest.autopilot(false); __ppTest.step(3); });
    await p.waitForTimeout(900);
  }],
  ['night', async p => { await p.evaluate(() => { __ppTest.startEndless(); __ppTest.win(); __ppTest.step(2.5); }); await p.waitForTimeout(800); }],
  ['flighthome', async p => { await p.evaluate(() => { __ppTest.startFlight('chalk'); __ppTest.step(9); }); await p.waitForTimeout(500); }],
];

(async () => {
  const srv = await serve(port);
  const browser = await chromium.launch();
  for (const size of sizes) {
    const [w, h, d] = size.split('x').map(Number);
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d || 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/?debug`);
    await page.waitForFunction(() => window.__ppTest && __ppTest.ready());
    await page.evaluate(q => { __ppTest.reset(); __ppTest.quality(q); if (q !== 'auto') PP.R.quality.frame = () => {}; }, quality);
    for (const [name, fn] of SHOTS) {
      if (only.length && !only.includes(name)) continue;
      await fn(page);
      await page.screenshot({ path: path.join(OUT, `${w}x${h}-${name}.png`) });
    }
    const fs2 = await page.evaluate(() => __ppTest.frameStats());
    console.log(size, 'frames', JSON.stringify(fs2), errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no errors');
    await page.close();
  }
  await browser.close();
  srv.close();
})();
