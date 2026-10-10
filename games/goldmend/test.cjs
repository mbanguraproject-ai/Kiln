// Goldmend rules test: real pointer input plus a human-limited bot, headless.
// Usage: NODE_PATH=/opt/node22/lib/node_modules node games/goldmend/test.cjs [--port 8802] [--runs 12]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8802);
const RUNS = +opt('runs', 12);
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

const BOT = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');

let failures = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const url = seed => `http://localhost:${PORT}/games/goldmend/index.html?debug&seed=${seed}`;
  await page.goto(url(11));
  await page.waitForTimeout(400);
  await page.addScriptTag({ content: BOT });
  await page.evaluate(() => window.__goldmend.manual(true));

  // 1. Guided first vessel with real pointer input: touch the origin, then trace the crack.
  let s = await page.evaluate(() => window.__goldmend.summary());
  check(s.phase === 'ready' && s.tut === 1 && s.active === 1, 'first open shows the guided crack, waiting for a touch');
  const origin = await page.evaluate(() => { const g = window.__goldmend, c = g.cracks[0]; return g.toClient(c.origin.x, c.origin.y); });
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.evaluate(() => window.__goldmend.advance(0.5));
  s = await page.evaluate(() => ({ state: window.__goldmend.cracks[0].state, phase: window.__goldmend.phase }));
  check(s.phase === 'play' && s.state === 'run', 'touching the origin starts the run and the crack');
  // trace along the crack with the real mouse, a little faster than it grows
  for (let k = 0; k < 400; k++) {
    const r = await page.evaluate(() => {
      const g = window.__goldmend, c = g.cracks[0];
      if (!c) return { done: true };
      const b = c.branches[0];
      if (b.state !== 'grow') return { done: true, state: b.state };
      const p = g.at(b, Math.min(b.tip, b.front + 8));
      g.advance(1 / 30);
      return { p: g.toClient(p.x, p.y) };
    });
    if (r.done) break;
    await page.mouse.move(r.p.x, r.p.y, { steps: 2 });
  }
  await page.mouse.up();
  await page.evaluate(() => window.__goldmend.advance(0.1));
  s = await page.evaluate(() => window.__goldmend.summary());
  check(s.catches === 1 && s.score >= 50, `tracing with the pointer catches the crack (score ${s.score})`);
  check(s.tut === 2, 'tutorial moves on to the fork lesson');
  const events = () => page.evaluate(() => window.Arcade._log.all().map(e => e.ev));
  check((await events()).includes('run_start'), 'run_start recorded on first touch');

  // 2. Fork lesson: the bot catches both branches; then the third crack completes the tutorial.
  const tut = await page.evaluate(() => {
    const g = window.__goldmend, step = window.makeBot({ wobble: 1 });
    let forked = false;
    for (let i = 0; i < 60 * 40 && g.G.tut; i++) {
      step(1 / 60); g.advance(1 / 60, 1 / 60, false);
      if (g.cracks.some(c => c.branches.some(b => b.parent && b.state === 'caught'))) forked = true;
    }
    return { forked, ...g.summary() };
  });
  check(tut.forked, 'the fork lesson crack forks and both branches can be caught');
  check(tut.tut === 0 && tut.catches >= 3, `tutorial completes after an unaided catch (catches ${tut.catches})`);
  check((await events()).includes('tutorial_complete'), 'tutorial_complete tracked');
  check(await page.evaluate(() => window.Arcade.store.get('tutorial', 0)) === 1, 'tutorial flag saved');

  // 3. Degenerate strategies do nothing: poke the tip, or hold still at the origin.
  const poke = await page.evaluate(() => {
    const g = window.__goldmend;
    g.warp(2);
    let c = null;
    for (let i = 0; i < 600 && !(c = g.cracks.find(x => x.state === 'run' && x.kind === 'crack')); i++) g.advance(1 / 60, 1 / 60, false);
    if (!c) return { ok: false };
    const b = c.branches[0];
    g.advance(0.5, 1 / 60, false);
    const before = g.G.catches;
    for (let k = 0; k < 12; k++) {          // jab the tip repeatedly
      const p = g.at(b, b.tip);
      g.down(p.x, p.y); g.advance(0.05, 1 / 60, false); g.up(); g.advance(0.05, 1 / 60, false);
    }
    return { ok: true, front: b.front, caught: g.G.catches - before, state: b.state };
  });
  check(poke.ok && poke.caught === 0 && poke.front === 0, `poking the tip never gilds or catches (front ${poke.front})`);
  const hold = await page.evaluate(() => {
    const g = window.__goldmend;
    g.warp(2);
    let c = null;
    for (let i = 0; i < 600 && !(c = g.cracks.find(x => x.state === 'tele' && x.kind === 'crack')); i++) g.advance(1 / 60, 1 / 60, false);
    if (!c) return { ok: false };
    g.down(c.origin.x, c.origin.y);
    for (let i = 0; i < 240 && c.state !== 'done'; i++) g.advance(1 / 60, 1 / 60, false);
    const b = c.branches[0];
    g.up();
    return { ok: true, front: b.front, state: b.state, reach: g.REACH };
  });
  check(hold.ok && hold.state !== 'caught' && hold.front <= hold.reach + 3, `holding still at the origin does not catch (front ${hold.front?.toFixed?.(1)}, ${hold.state})`);

  // 4. Gold leaf: scribbling off the crack drains it, and a dry brush cannot gild.
  const leafT = await page.evaluate(() => {
    const g = window.__goldmend;
    g.warp(2);
    g.advance(0.1, 1 / 60, false);
    const b0 = g.V.bbox;
    const x0 = b0.x + b0.w * 0.2, y = b0.y + b0.h * 0.9;
    g.down(x0, y);
    const start = g.leaf;
    let x = x0;
    for (let k = 0; k < 100 && !g.dry; k++) { x = k % 2 ? x0 : x0 + 60; g.move(x, y); }
    const dry = g.dry, after = g.leaf;
    g.up();
    // with a dry brush, tracing a live crack gilds nothing
    let c = null;
    for (let i = 0; i < 900 && !(c = g.cracks.find(q => q.state === 'run' && q.kind === 'crack')); i++) g.advance(1 / 60, 1 / 60, false);
    g.setLeaf(0);
    const p = g.at(c.branches[0], 0);
    g.down(p.x, p.y);
    const dryNow = g.dry;
    const b = c.branches[0];
    for (let s = 0; s < 30; s += 3) { const q = g.at(b, s); g.move(q.x, q.y); }
    const front = b.front;
    g.up();
    return { start, after, dry, dryNow, front };
  });
  check(leafT.start === 100 && leafT.dry && leafT.after === 0, 'scribbling off the crack empties the gold leaf');
  check(leafT.front === 0, 'a dry brush lays no gold');

  // 5. Letting cracks run chips the vessel; three chips end the run and save the run end.
  const lose = await page.evaluate(() => {
    const g = window.__goldmend;
    g.warp(3);
    let chipsSeen = 0;
    for (let i = 0; i < 60 * 90 && g.phase !== 'over'; i++) { g.advance(1 / 60, 1 / 60, false); chipsSeen = Math.max(chipsSeen, g.V.chips); }
    return { phase: g.phase, chipsSeen, holes: g.V.chipped.size, score: g.G.score, shelf: g.G.shelf.length };
  });
  check(lose.phase === 'over' && lose.chipsSeen === 3, 'three chips end the run');
  check(lose.holes >= 2, `chipped cells are cut out of the vessel (${lose.holes})`);
  check(lose.shelf >= 1, 'the chipped vessel still goes on the shelf');
  check(await page.locator('#over').isVisible(), 'the run-over card shows');
  const evs = await events();
  check(evs.includes('run_end'), 'run_end recorded');
  const best1 = await page.evaluate(() => window.Arcade.store.get('best', 0));
  check(best1 > 0 && best1 === (await page.evaluate(() => window.__goldmend.best)), `best score saved (${best1})`);

  // 6. Play again restarts at once.
  await page.click('#againBtn');
  s = await page.evaluate(() => window.__goldmend.summary());
  check(s.score === 0 && s.n === 1 && s.phase === 'enter' && s.chips === 0, 'Play again starts a fresh run on vessel 1');

  // 7. Pause freezes the clock.
  const pz = await page.evaluate(() => {
    const g = window.__goldmend;
    g.advance(2, 1 / 60, false);
    g.openPause();
    const t0 = g.gt;
    g.advance(2, 1 / 60, false);
    const frozen = g.gt === t0 && g.paused;
    g.closePause();
    g.advance(0.5, 1 / 60, false);
    return { frozen, moved: g.gt > t0 };
  });
  check(pz.frozen && pz.moved, 'pause freezes the game clock and resume continues it');

  // 8. Many bot runs: no exceptions, vessels progress, forks and crazing appear, scoring adds up.
  const runs = [];
  for (let r = 0; r < RUNS; r++) {
    const res = await page.evaluate(([r]) => {
      const g = window.__goldmend;
      g.newGame();
      const skill = [
        { name: 'casual', speed: 240, react: 0.5, lift: 0.28, wobble: 6 },
        { name: 'good', speed: 320, react: 0.38, lift: 0.22, wobble: 4 },
        { name: 'expert', speed: 420, react: 0.28, lift: 0.16, wobble: 2.5 },
      ][r % 3];
      skill.seed = 100 + r;
      const step = window.makeBot(skill);
      let t = 0, forks = 0, crazes = 0, close = 0, maxActive = 0;
      const seen = new Set();
      const quality = { Fine: 0, Steady: 0, Rough: 0 };
      while (t < 900 && g.phase !== 'over') {
        step(1 / 60);
        g.advance(1 / 60, 1 / 60, false);
        t += 1 / 60;
        maxActive = Math.max(maxActive, g.cracks.length);
        for (const c of g.cracks) if (!seen.has(c.id)) {
          seen.add(c.id);
          if (c.kind === 'craze') crazes++;
          if (c.branches.some(b => b.parent)) forks++;
        }
      }
      const sum = g.summary();
      return { skill: skill.name, t: Math.round(t), forks, crazes, maxActive, fine: g.G.fine, ...sum };
    }, [r]);
    runs.push(res);
    console.log(`  run ${r + 1}: ${res.skill.padEnd(7)} reached vessel ${res.n}, score ${res.score}, catches ${res.catches} (${res.fine} fine), forks ${res.forks}, crazing ${res.crazes}, ${res.t}s, ${res.phase}`);
  }
  check(runs.every(r => r.phase === 'over'), 'every bot run ends in a loss within 15 minutes');
  check(runs.some(r => r.forks > 0) && runs.some(r => r.crazes > 0), 'forks and crazing bursts both occur');
  check(runs.some(r => r.mended >= 3), 'a capable player gets past vessel 3');
  check(runs.every(r => r.maxActive <= 5), 'never more than five cracks at once');
  check(runs.filter(r => r.skill === 'casual').every(r => r.t < 420), 'a casual player\'s run ends within 7 minutes');
  const lc = (await page.evaluate(() => window.Arcade._log.all().filter(e => e.ev === 'level_complete').length));
  check(lc > 0, `level_complete tracked (${lc})`);

  // 9. Best survives a reload.
  const bestBefore = await page.evaluate(() => window.__goldmend.best);
  await page.goto(url(12));
  await page.waitForTimeout(300);
  const bestAfter = await page.evaluate(() => window.__goldmend.best);
  check(bestAfter === bestBefore && Number((await page.locator('#best').textContent()).replace(/\D/g, '')) === bestAfter, `best persists across reload (${bestAfter})`);

  // 9b. A player who finished the guided cracks but lost the solo one resumes at the solo step.
  const resume = await page.evaluate(() => { window.__goldmend.resetTutorial(); window.Arcade.store.set('tutStage', 3); });
  void resume;
  await page.goto(url(13));
  await page.waitForTimeout(300);
  s = await page.evaluate(() => window.__goldmend.summary());
  check(s.tut === 3 && s.active === 0 && s.phase === 'ready', 'tutorial progress resumes at the unaided step');
  await page.evaluate(() => window.__goldmend.skipTutorial());

  // 10. Every synthesised sound plays without errors once a touch has unlocked audio.
  const cvBox = await page.locator('#cv').boundingBox();
  await page.mouse.click(cvBox.x + cvBox.width / 2, cvBox.y + cvBox.height / 2);
  const snd = await page.evaluate(async () => {
    const S = window.__goldmend.Sound;
    S.unlock();
    await new Promise(r => setTimeout(r, 300));
    const errs = [];
    for (const n of ['tock', 'snap', 'creak', 'seal', 'ting', 'chip', 'dry', 'wake', 'sweep', 'whole', 'over', 'best', 'ui']) {
      try { S[n](3, true); } catch (e) { errs.push(n + ': ' + e.message); }
    }
    try { S.chord([783.99, 880, 1046.5]); S.chord([]); } catch (e) { errs.push('chord: ' + e.message); }
    return { state: S.ctx ? S.ctx.state : 'none', errs };
  });
  check(snd.errs.length === 0 && snd.state !== 'none', `all sounds synthesise without errors (audio ${snd.state})`);

  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  srv.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
