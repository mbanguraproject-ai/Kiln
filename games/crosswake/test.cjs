// Crosswake rules test, headless: ripple geometry, chains, pond generation, scoring, persistence, real input.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node games/crosswake/test.cjs [--port 8804]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8804) || 8804;
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
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
  await page.goto(`http://localhost:${PORT}/games/crosswake/index.html?debug`);
  await page.waitForTimeout(500);
  const ev = fn => page.evaluate(fn);

  // Geometry
  let s = await ev(() => {
    const C = window.__crosswake, V = C.V;
    const A = { x: 110, y: 300 }, B = { x: 310, y: 300 };
    const ring = (p, t, R) => ({ x: p.x, y: p.y, t, R: R || C.R_STONE });
    const onBisector = { x: 210, y: 180 }, offBisector = { x: 250, y: 180 };
    const straightHit = C.crossingAt(ring(A, 0), ring(B, 0), onBisector) != null;
    const straightMiss = C.crossingAt(ring(A, 0), ring(B, 0), offBisector) != null;
    // A point with |PA| - |PB| = V * d lies on the curve for delay d.
    const P = { x: 260, y: 120 };
    const d = (Math.hypot(P.x - A.x, P.y - A.y) - Math.hypot(P.x - B.x, P.y - B.y)) / V;
    const curveHit = d > 0 && C.crossingAt(ring(A, 0), ring(B, d), P) != null;
    const path = C.sparkPath(A, 0, C.R_STONE, B, d, C.R_STONE);
    const near = Math.min(...path.flat().map(q => Math.hypot(q.x - P.x, q.y - P.y)));
    // Chain: a lit lantern on the bisector fires sparks straight out from each stone.
    const L = { x: 210, y: 200 };
    const dA = Math.hypot(L.x - A.x, L.y - A.y);
    const M = { x: L.x + ((L.x - A.x) / dA) * 70, y: L.y + ((L.y - A.y) / dA) * 70 };
    const sim = C.simulate([{ x: A.x, y: A.y, t: 0 }, { x: B.x, y: B.y, t: 0 }], [L, M], new Set());
    const ev = sim.events.map(e => ({ i: e.i, depth: e.depth }));
    return { straightHit, straightMiss, curveHit, d, near, ev };
  });
  check(s.straightHit && !s.straightMiss, 'stones dropped together light lanterns on the line halfway between them, not beside it');
  check(s.curveHit, 'a delayed second stone lights lanterns on the curve |PA|-|PB| = v·delay', s.d.toFixed(2) + ' s');
  check(s.near < 3, 'the preview path passes through that lantern', s.near.toFixed(2));
  check(s.ev.length === 2 && s.ev[0].i === 0 && s.ev[0].depth === 1 && s.ev[1].i === 1 && s.ev[1].depth === 2, 'a lit lantern chains: the lantern straight out from a stone lights at depth 2', JSON.stringify(s.ev));

  // Generated ponds are always solvable by their hidden solution within the stone budget.
  s = await ev(() => {
    const C = window.__crosswake;
    const out = { ponds: 0, unsolved: 0, minLanterns: 99, maxLanterns: 0, ms: 0, overBudget: 0, nulls: 0 };
    const t0 = performance.now();
    for (let k = 0; k < 80; k++) {
      const n = 1 + (k % 20);
      const P = C.makePond(n, 5000 + k * 977, 0);
      if (!P) { out.nulls++; continue; }
      out.ponds++;
      const lit = new Set();
      for (const sol of P.solution) C.simulate([{ x: sol.A.x, y: sol.A.y, t: 0 }, { x: sol.B.x, y: sol.B.y, t: sol.delay }], P.lanterns, lit).events.forEach(e => lit.add(e.i));
      if (lit.size !== P.lanterns.length) out.unsolved++;
      if (P.solution.length * 2 > P.stones) out.overBudget++;
      out.minLanterns = Math.min(out.minLanterns, P.lanterns.length);
      out.maxLanterns = Math.max(out.maxLanterns, P.lanterns.length);
    }
    out.ms = Math.round((performance.now() - t0) / 80);
    return out;
  });
  check(s.nulls === 0 && s.unsolved === 0 && s.overBudget === 0, 'every generated pond is solvable by its hidden solution within budget', JSON.stringify(s));
  check(s.minLanterns >= 4, 'every pond has at least 4 lanterns', `${s.minLanterns}-${s.maxLanterns}`);
  check(s.ms < 150, 'a pond generates quickly', s.ms + ' ms');

  // Teaching pond 1: the shown spots clear it in one drop.
  s = await ev(() => {
    const C = window.__crosswake;
    C.manual(true);
    const P = C.P;
    const sol = P.solution[0];
    C.placeDelay(sol.A, sol.B, sol.delay);
    C.release();
    C.finish();
    return { teach: P.teach, n: P.n, lit: C.lit.size, lanterns: P.lanterns.length, phase: C.phase, score: C.run.score, stones: C.stonesLeft, delay: sol.delay };
  });
  check(s.teach === 1 && s.delay === 0, 'the first pond teaches the straight line (no delay)', JSON.stringify(s));
  check(s.lit === s.lanterns && s.phase === 'cleared', 'the hidden solution clears pond 1');
  check(s.score === s.lanterns * 10 + s.stones * 50, 'score: 10 per lantern plus 50 per spare stone', `${s.score} = ${s.lanterns}×10 + ${s.stones}×50`);
  await page.waitForTimeout(1900);
  s = await ev(() => ({ n: window.__crosswake.P.n, teach: window.__crosswake.P.teach, phase: window.__crosswake.phase }));
  check(s.n === 2 && s.teach === 2 && s.phase === 'place', 'the next pond starts on its own and teaches the delay', JSON.stringify(s));

  // Saved run survives a reload.
  const before = await ev(() => ({ n: window.__crosswake.P.n, score: window.__crosswake.run.score, stones: window.__crosswake.stonesLeft }));
  await page.reload();
  await page.waitForTimeout(500);
  const after = await ev(() => ({ n: window.__crosswake.P.n, score: window.__crosswake.run.score, stones: window.__crosswake.stonesLeft }));
  check(JSON.stringify(before) === JSON.stringify(after), 'the run resumes after a reload', `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);

  // Running out of stones ends the run.
  s = await ev(() => {
    const C = window.__crosswake;
    C.manual(true);
    let guard = 0;
    while (C.phase === 'place' && C.stonesLeft >= 2 && guard++ < 10) {
      // Two stones in the bottom corners, far from the lanterns' curve, with a long delay.
      C.place({ x: 30, y: C.pondH - 30 }, { x: 110, y: C.pondH - 30 }, 1);
      C.release();
      C.finish();
    }
    return { phase: C.phase, stones: C.stonesLeft, lit: C.lit.size, total: C.P.lanterns.length };
  });
  check(s.phase === 'over' || s.lit === s.total, 'using every stone without clearing the pond ends the run', JSON.stringify(s));
  await page.waitForTimeout(1300);
  const overShown = await page.locator('.k-over').isVisible();
  check(overShown, 'the run-over card shows');
  const best = await ev(() => window.__crosswake.best);
  check(best > 0, 'the best score is kept', best);
  await page.reload();
  await page.waitForTimeout(400);
  check(await ev(() => window.__crosswake.best) === best, 'best score persists across reload');
  check(await ev(() => window.__crosswake.P.teach === 0 || window.__crosswake.P.n === 1), 'a new run starts on a fresh pond');

  // Real input: tap twice, slide the delay, press Drop.
  await ev(() => { window.__crosswake.manual(false); window.__crosswake.newRun(); });
  await page.waitForTimeout(300);
  const box = await page.locator('#pond').boundingBox();
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.7);
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.7);
  await page.waitForTimeout(150);
  s = await ev(() => ({ placed: window.__crosswake.placed.length, drop: !document.getElementById('dropBtn').disabled }));
  check(s.placed === 2 && s.drop, 'two taps place two stones and enable Drop', JSON.stringify(s));
  const slider = await page.locator('#delay').boundingBox();
  await page.mouse.click(slider.x + slider.width * 0.6, slider.y + slider.height / 2);
  const delayText = await page.locator('#delayVal').textContent();
  check(delayText !== '0.00 s', 'the slider sets the second stone’s delay', delayText);
  await page.click('#dropBtn');
  await page.waitForTimeout(200);
  check(await ev(() => window.__crosswake.phase) === 'drop', 'Drop starts the ripples');
  let dropDone = false;
  for (let k = 0; k < 40 && !dropDone; k++) { await page.waitForTimeout(250); dropDone = await ev(() => window.__crosswake.phase) !== 'drop'; }
  check(dropDone, 'the drop finishes on its own');

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
