// Long Ball Night rules test: the ?debug hook (seeded pitches, planned swings, stepped time) plus real pointer input, headless.
// Usage: node games/long-ball-night/test.cjs [--port 8900]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8900);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

let failures = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://localhost:${PORT}/games/long-ball-night/index.html?debug`;
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
  const G = (fn, a) => page.evaluate(fn, a);

  // 1. A real thumb: start with the Play button, hold, slide the reticle onto the pitch, let go on time
  await page.click('[data-k=play]');
  await page.waitForTimeout(300);
  let s = await G(() => window.__kilnTest.info());
  check(s && s.phase !== 'over' && s.outs === 0 && s.score === 0 && !s.auto, 'Play ball starts a fresh derby: 0 outs, 0 points');
  let pi;
  for (let i = 0; i < 300; i++) { pi = await G(() => window.__kilnTest.pitchInfo()); if (pi.phase === 'pitch' && pi.release !== undefined) break; await page.waitForTimeout(16); }
  check(pi.phase === 'pitch' && pi.kind === 'fb', 'the first pitch is a fastball meatball');
  await page.mouse.move(pi.sx, pi.sy + 140); await page.mouse.down();
  await page.mouse.move(pi.sx, pi.sy + 110); await page.mouse.move(pi.sx, pi.sy + 80);
  pi = await G(() => window.__kilnTest.pitchInfo());
  await page.waitForTimeout(Math.max(0, pi.release * 1000 - 10));
  await page.mouse.up();
  await page.waitForTimeout(400);
  s = await G(() => window.__kilnTest.info());
  check(s.phase === 'flight' || s.hr === 1, `holding below the pitch and letting go on time makes contact (phase ${s.phase})`);

  // 2. Deterministic rules from here: freeze the real-time loop, seed a new derby, drive it by steps
  const run = (seed) => G(n => { const T = window.__kilnTest; T.freeze(); T.seed(n); T.start(); T.step(0.05); return T.info(); }, seed);
  const pitch = (setup) => G(sp => {
    const T = window.__kilnTest; const b = T.info();
    if (sp.zone !== undefined) T.zone(sp.zone);
    if (sp.golden) T.golden();
    if (sp.plan === 'perfect') T.perfect(); else if (sp.plan === 'whiff') T.whiff(); else if (sp.plan === 'take') T.take(); else if (sp.plan) T.swing(...sp.plan);
    T.pitchOut(); const a = T.info(); return { b, a };
  }, setup);
  // restart via the shell so a new run begins from the seed
  await G(() => { const T = window.__kilnTest; T.freeze(); T.lose(); });
  await run(7);
  let r = await pitch({ zone: true, plan: 'perfect' });
  check(r.a.hr === 1 && r.a.streak === 1 && r.a.outs === 0, `a perfect swing is a home run (${r.a.dist} ft)`);
  const bonus = { wheel: 500, fish: 750, lamp: 1000, kite: 600 }[r.a.hitTarget] || 0;
  check(r.a.score === r.a.dist + bonus, `a lone home run scores its distance in feet, plus any target it lights (${r.a.score} = ${r.a.dist} + ${bonus}${r.a.hitTarget ? ' ' + r.a.hitTarget : ''})`);
  const s1 = r.a.score;
  r = await pitch({ zone: true, plan: 'perfect' });
  const gain2 = r.a.score - s1;
  check(r.a.streak === 2 && (r.a.hitTarget ? gain2 > Math.round(r.a.dist * 1.5) : gain2 === Math.round(r.a.dist * 1.5)), `two in a row pays x1.5 (${r.a.dist} ft -> +${gain2})`);
  r = await pitch({ zone: true, plan: 'whiff' });
  check(r.a.outs === 1 && r.a.streak === 0 && r.a.score === r.b.score, 'a whiff is one out, breaks the streak and scores nothing');
  r = await pitch({ zone: true, plan: 'take' });
  check(r.a.outs === 2, 'taking a pitch in the zone is a called strike: one out');
  r = await pitch({ zone: false, plan: 'take' });
  check(r.a.outs === 2, 'letting a ball outside the zone go by costs nothing');
  r = await pitch({ zone: true, plan: [0, 0, 0.5] });
  check(r.a.outs === 2.5 && r.a.hr === r.b.hr, 'a ball kept in the park costs half an out');
  r = await pitch({ zone: true, plan: [0.19, 0, 0] });
  check(r.a.outs === 3.5 || r.a.outs === 3, `a late, off-the-end swing is a foul or a weak fair ball (outs ${r.a.outs})`);
  r = await pitch({ zone: true, golden: true, plan: 'perfect' });
  const gainG = r.a.score - r.b.score;
  check(r.a.hr === r.b.hr + 1 && gainG >= r.a.dist * 3, `a golden pitch home run pays triple (${r.a.dist} ft -> +${gainG})`);

  // 3. Pitchers change every 5 home runs and the repertoire grows
  await run(11);
  const kinds = await G(() => { const T = window.__kilnTest; const seen = {};
    for (let i = 0; i < 26; i++) { T.zone(true); T.perfect(); T.pitchOut(); }
    const inf = T.info(); return { pitcher: inf.pitcher, hr: inf.hr, night: inf.night }; });
  check(kinds.pitcher === Math.floor(kinds.hr / 5) && kinds.pitcher >= 3, `a new pitcher every 5 home runs (hr ${kinds.hr}, pitcher ${kinds.pitcher + 1})`);
  check(kinds.night > 0.3, `the sky darkens as the derby goes on (night ${kinds.night.toFixed(2)})`);
  const later = await G(() => { const T = window.__kilnTest; const seen = new Set(); T.pitcher(5);
    for (let i = 0; i < 40; i++) { T.zone(true); T.take(); for (let j = 0; j < 200; j++) { const p = T.pitchInfo(); if (p.kind) { seen.add(p.kind); break; } T.step(1 / 60); } T.pitchOut(); if (T.info().outs >= 9) { T.seed(20 + i); T.start(); T.step(0.05); T.pitcher(5); } }
    return [...seen]; });
  check(later.includes('kn') && later.includes('sl') && later.includes('cu'), `the sixth pitcher throws knucklers, sliders and curves (${later.join(', ')})`);

  // 4. Ten outs end the derby; the best score is kept
  await run(5);
  r = await pitch({ zone: true, plan: 'perfect' });
  const final = r.a.score;
  await G(() => { const T = window.__kilnTest; for (let i = 0; i < 12 && T.info().phase !== 'over' && T.state().phase === 'play'; i++) { T.zone(true); T.whiff(); T.pitchOut(); } });
  await page.waitForTimeout(200);
  s = await G(() => window.__kilnTest.info());
  check(s.outs === 10, 'ten whiffs light all ten bulbs');
  await G(() => window.__kilnTest.step(3));
  let st = await G(() => window.__kilnTest.state());
  check(st.phase === 'over', `ten outs end the derby (phase ${st.phase})`);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
  const best = await G(() => window.__kilnTest.info().best);
  check(best >= final && best > 0, `the best score survives a reload (${best})`);

  // 5. lose() from the hook ends a run
  await G(() => { window.__kilnTest.start(); window.__kilnTest.lose(); });
  await page.waitForTimeout(1500);
  st = await G(() => window.__kilnTest.state());
  check(st.phase === 'over', 'lose() ends the derby');

  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  srv.close();
  process.exit(failures ? 1 : 0);
})();
