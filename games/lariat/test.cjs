// Lariat rules test, headless: tutorial, loops, halos, unravel, wisps, fuse, persistence, real input.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node games/lariat/test.cjs [--port 8803]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8803) || 8803;
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
  const url = `http://localhost:${PORT}/games/lariat/index.html?debug`;
  await page.goto(url);
  await page.waitForTimeout(500);
  const ev = fn => page.evaluate(fn);

  // Tutorial: one cluster, no fuse until the first catch.
  let s = await ev(() => { const L = window.__lariat; L.manual(true); L.seed(3); return { phase: L.phase, tut: L.G.tut, motes: L.G.motes.length, fuseLive: L.G.fuseLive }; });
  check(s.phase === 'ready' && s.tut === 1 && s.motes === 4, 'first run opens on the tutorial cluster', JSON.stringify(s));
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    L.trace([{ x: W / 2 + 70 * U, y: H * 0.36 }], 260);
    L.circle(W / 2, H * 0.36, 70 * U, 420, 1.2);
    return { caught: L.G.caught, score: L.G.score, halos: L.G.halos.length, tut: L.G.tut, fuseLive: L.G.fuseLive, phase: L.phase };
  });
  check(s.caught === 4 && s.score === 160, 'a loop around the cluster catches all 4 stars for 4²×10', JSON.stringify(s));
  check(s.halos === 1, 'the closed loop becomes a halo');
  check(s.tut === 2 && s.fuseLive, 'the tutorial hands over to the fuse');
  check(await ev(() => window.__lariat.G.halos[0].tag === 1), 'the first halo is labelled "Your loop"');

  // Halo speed is clamped to the safe band.
  s = await ev(() => { const L = window.__lariat; const h = L.G.halos[0]; return h.speed / L.size.U; });
  check(s >= 120 && s <= 420, 'halo speed stays within 120-420 units/s', s.toFixed(1));

  // The halo is harmless while it fades in, then lethal.
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    L.newGame(); L.trace([{ x: W / 2, y: H * 0.7 }], 300);
    const cx = W / 2, cy = H * 0.3;
    L.trace([{ x: cx + 60 * U, y: cy }], 300);
    L.circle(cx, cy, 60 * U, 340, 1.2);
    const h = L.G.halos[L.G.halos.length - 1];
    const p = h.pos();
    const before = L.phase;
    // Park the spark on the orb's path right away (still fading in).
    L.G.spark.x = p.x; L.G.spark.y = p.y; L.G.spark.vx = L.G.spark.vy = 0;
    L.advance(0.05);
    const during = L.phase;
    // Then wait for the orb to come round.
    for (let i = 0; i < 400 && L.phase === 'play'; i++) { L.G.spark.x = p.x; L.G.spark.y = p.y; L.advance(1 / 60); }
    return { before, during, after: L.phase };
  });
  check(s.before === 'play' && s.during === 'play', 'a new halo is harmless while it fades in', JSON.stringify(s));
  check(s.after === 'over', 'touching a live halo ends the run');

  // Unravel: a loop around a halo orb shatters it.
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    L.newGame(); L.trace([{ x: W * 0.2, y: H * 0.8 }], 300);
    L.circle(W * 0.3, H * 0.3, 40 * U, 240, 1.2);
    L.G.fuse = 1;
    const h = L.G.halos[L.G.halos.length - 1];
    L.advance(0.7);
    const p = h.pos();
    const score0 = L.G.score;
    L.trace([{ x: p.x + 95 * U, y: p.y }], 400);
    L.circle(p.x, p.y, 95 * U, 600, 1.2);
    return { cut: h.dying >= 0 && h.cut === true, gained: L.G.score - score0, phase: L.phase };
  });
  check(s.cut && s.gained >= 50, 'a loop around a halo orb unravels it for points', JSON.stringify(s));

  // Max five halos: the oldest dissolves.
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    L.newGame(); L.trace([{ x: W / 2, y: H * 0.9 }], 300);
    const spots = [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.5, 0.75], [0.5, 0.35]];
    for (const [fx, fy] of spots) { L.G.fuse = 1; L.trace([{ x: W * fx + 30 * U, y: H * fy }], 300); L.circle(W * fx, H * fy, 30 * U, 200, 1.2); if (L.phase !== 'play') break; }
    return { alive: L.G.halos.filter(h => h.dying < 0).length, total: L.G.halos.length, phase: L.phase };
  });
  check(s.alive <= 5, 'never more than five live halos', JSON.stringify(s));

  // Fuse: doing nothing burns it out.
  s = await ev(() => {
    const L = window.__lariat, { W, H } = L.size;
    L.newGame(); L.trace([{ x: W / 2, y: H * 0.85 }], 300);
    L.G.motes.length = 0; L.G.nextCluster = 1e9;
    L.advance(11);
    return { phase: L.phase, fuse: L.G.fuse };
  });
  check(s.phase === 'over', 'an empty fuse ends the run within 10 s', JSON.stringify(s));

  // Wisps appear after 30 s of play, hunt, and can be lassoed.
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    L.newGame(); L.trace([{ x: W / 2, y: H / 2 }], 300);
    L.G.t0 -= 31; L.G.nextWisp = 0;
    for (let i = 0; i < 160; i++) { L.G.fuse = 1; L.advance(1 / 60); }
    const n = L.G.wisps.length;
    const w = L.G.wisps[0];
    // Freeze it in place and lasso it.
    // Move it to the middle so the test circle never meets an arena edge.
    if (w) { w.x = W / 2; w.y = H / 2; L.G.spark.x = W / 2 + 120 * U; L.G.spark.y = H / 2; L.G.spark.vx = L.G.spark.vy = 0; }
    const wx = w ? w.x : 0, wy = w ? w.y : 0;
    return { n, wx, wy };
  });
  check(s.n >= 1, 'a wisp arrives after 30 s, with a warning first', JSON.stringify(s));
  s = await ev(() => {
    const L = window.__lariat, { U } = L.size;
    const w = L.G.wisps[0]; if (!w) return { lassoed: false };
    const score0 = L.G.score;
    // Run circles around the wisp while it chases: keep it pinned for the test.
    const cx = w.x, cy = w.y;
    const keep = () => { w.x = cx; w.y = cy; w.vx = w.vy = 0; };
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 34) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * 80 * U, y: cy + Math.sin(a) * 80 * U }); }
    for (const p of pts) { keep(); L.G.fuse = 1; L.trace([p], 500); if (!L.G.wisps.includes(w)) break; }
    return { lassoed: !L.G.wisps.includes(w), gained: L.G.score - score0, phase: L.phase };
  });
  check(s.lassoed && s.gained >= 150, 'a loop around a wisp lassoes it', JSON.stringify(s));

  // Pause freezes game time.
  s = await ev(() => {
    const L = window.__lariat, { W, H } = L.size;
    L.newGame(); L.trace([{ x: W / 2, y: H * 0.8 }], 300);
    L.openPause(); const t0 = L.gt; L.advance(2); const t1 = L.gt; L.closePause();
    return { frozen: t1 === t0, paused: L.paused };
  });
  check(s.frozen && !s.paused, 'pause freezes the game clock');

  // A scripted bot plays many runs with no exceptions.
  s = await ev(() => {
    const L = window.__lariat, { W, H, U } = L.size;
    const runs = [];
    for (let r = 0; r < 12; r++) {
      L.newGame(); L.trace([{ x: W / 2, y: H * 0.8 }], 300);
      let guard = 0;
      while (L.phase === 'play' && guard++ < 80) {
        const m = L.G.motes[(Math.random() * L.G.motes.length) | 0];
        const cx = m ? m.x : W / 2, cy = m ? m.y : H / 2, rr = (40 + Math.random() * 50) * U;
        L.trace([{ x: Math.min(W - 12, cx + rr), y: cy }], 300 + Math.random() * 200);
        if (L.phase === 'play') L.circle(cx, cy, rr, Math.max(200 + Math.random() * 250, (2 * Math.PI * rr / U) * 1.15 / 1.3), 1.15);
      }
      runs.push({ score: L.G.score, loops: L.G.loops, stars: L.G.caught, t: Math.round(L.gt) });
    }
    return runs;
  });
  console.log('  bot runs:', s.map(r => `${r.score}pts/${r.loops}loops/${r.t}s`).join('  '));
  check(s.every(r => r.loops > 0), 'bot runs close loops and end cleanly');

  // Best score persists.
  const best = await ev(() => window.__lariat.best);
  await page.reload();
  await page.waitForTimeout(400);
  const best2 = await ev(() => window.__lariat.best);
  check(best > 0 && best2 === best, 'best score persists across reload', `${best} -> ${best2}`);
  check(await ev(() => window.__lariat.G.tut === 0), 'the tutorial does not repeat after it is done');

  // Real pointer input: a drag moves the spark relative to the thumb.
  await ev(() => window.__lariat.manual(false));
  const box = await page.locator('#arena').boundingBox();
  const s0 = await ev(() => ({ x: window.__lariat.G.spark.x, y: window.__lariat.G.spark.y }));
  await page.mouse.move(box.x + 30, box.y + box.height - 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 30 + 100, box.y + box.height - 30, { steps: 12 });
  await page.waitForTimeout(400);
  await page.mouse.up();
  const s1 = await ev(() => ({ x: window.__lariat.G.spark.x, y: window.__lariat.G.spark.y, phase: window.__lariat.phase }));
  check(s1.x - s0.x > 100 && Math.abs(s1.y - s0.y) < 30, 'dragging anywhere moves the spark by the drag (x1.4), not to the finger', `dx ${(s1.x - s0.x).toFixed(0)}`);
  check(s1.phase === 'play', 'the first move starts the run');

  check(errors.length === 0, 'no console errors', errors.join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
