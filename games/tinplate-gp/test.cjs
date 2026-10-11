// Tinplate GP headless rules test.
//
//   node games/tinplate-gp/test.cjs [--port 8920]      (Playwright on NODE_PATH)
//
// Drives the real game through its ?debug hook (window.__kilnTest): corner limits and de-slotting, the
// grabber re-slot, lane changes at crossovers, loops, jump ramps, race scoring (10/6/3/1, fastest lap
// +250), whole championships raced by the built-in bot (a strong bot can take the cup, a weak one
// loses it), saving and resuming a championship, the forced loss, and no console errors.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8920);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

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

let fails = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) fails++;
}

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const url = `http://localhost:${PORT}/games/tinplate-gp/index.html?debug`;
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
  const T = (fn, arg) => page.evaluate(fn, arg);
  const info = () => T(() => window.__kilnTest.info());

  // ---------- track generation: every template builds, pieces fit where the brief puts them
  const builds = await T(() => {
    const t = window.__kilnTest, out = {};
    for (const tpl of ['oval', 'kidney', 'tri', 'dogbone', 'eight', 'spiral', 'hairpin']) {
      const r = [];
      for (let s = 1; s <= 8; s++) r.push(t.build(tpl, s * 31 + 7, { cross: 1 }));
      out[tpl] = { ok: r.every(b => b.N > 100 && b.minR >= 25), crossings: r.map(b => b.crossings) };
    }
    return out;
  });
  check('all 7 track templates build with sane corner radii', Object.values(builds).every(b => b.ok), JSON.stringify(Object.fromEntries(Object.entries(builds).map(([k, v]) => [k, v.ok]))));
  check('figure-eight and spiral cross themselves once (bridge)', builds.eight.crossings.every(c => c === 1) && builds.spiral.crossings.every(c => c === 1));
  check('oval does not cross itself', builds.oval.crossings.every(c => c === 0));

  // ---------- a championship starts on the grid of race 1 (the plain oval)
  await T(() => { const t = window.__kilnTest; t.seed(7); t.start(); });
  let s = await T(() => window.__kilnTest.state());
  let i = await info();
  check('start: phase play, race 1 on the grid', s.phase === 'play' && i.race === 0 && i.racePhase === 'grid', `${s.phase} race ${i.race} ${i.racePhase}`);
  check('race 1 is the plain oval with a crossover and no loop or jump', i.tpl === 'oval' && i.loop < 0 && i.jump < 0 && i.crossovers.length >= 1);
  const ev0 = await T(() => JSON.parse(localStorage.getItem('kiln:events') || '[]').filter(e => e.ev === 'run_start').length);
  check('run_start logged', ev0 >= 1);
  await T(() => { const t = window.__kilnTest; t.throttle(1); t.step(0.6); });
  i = await info();
  check('cars hold on the grid until the lights go', i.v === 0 && i.racePhase === 'grid', `v=${i.v.toFixed(1)}`);
  await T(() => { const t = window.__kilnTest; t.step(2.3); t.step(0.6); });
  i = await info();
  check('the lights go out and holding throttles the car', i.racePhase === 'race' && i.v > 80, `phase ${i.racePhase} v=${i.v.toFixed(1)}`);

  // throttle ramps over ~0.3 s and releasing brakes
  const ramp = await T(() => { const t = window.__kilnTest; t.placeBefore('cross', 300, 1); t.setSpeed(0); t.throttle(1); t.step(0.1); const a = t.info().v; t.step(0.4); const b = t.info().v; t.throttle(0); t.step(0.3); const c = t.info().v; return { a, b, c }; });
  check('throttle ramps up, release brakes', ramp.a < ramp.b && ramp.c < ramp.b * 0.75, JSON.stringify(ramp));

  // ---------- the corner limit: v_max = sqrt(grip x radius)
  await T(() => { const t = window.__kilnTest; t.throttle(0); t.step(3); });
  const d0 = (await info()).deslots;
  const lim = await T(() => { const t = window.__kilnTest; t.throttle(0); return t.placeCorner(1); });
  check('corner limit is finite on a bend', lim > 120 && lim < 320, `limit ${lim.toFixed(1)}`);
  const under = await T(l => { const t = window.__kilnTest; t.setSpeed(l * 0.93); t.throttle(0); t.step(0.25); return t.info(); }, lim);
  check('just under the limit the car stays in its slot', under.state === 'slot' && under.deslots === d0, `${under.state} deslots ${under.deslots}`);
  const over = await T(l => { const t = window.__kilnTest; t.placeCorner(1); t.setSpeed(l * 1.2, 1); t.throttle(1); t.step(0.35); return t.info(); }, lim);
  check('more than 5% over the limit de-slots the car', (over.state === 'off' || over.state === 'grab') && over.deslots === d0 + 1, `${over.state} deslots ${over.deslots}`);
  const back = await T(() => { const t = window.__kilnTest; t.throttle(0); t.step(2.2); return t.info(); });
  check('the grabber arm puts it back in the slot', back.state === 'slot' && back.v < 5, `${back.state} v=${back.v.toFixed(1)}`);
  const forced = await T(() => { const t = window.__kilnTest; t.step(0.5); return t.forceDeslot(); });
  check('forceDeslot hook works', forced === 'off');
  await T(() => window.__kilnTest.step(2.2));

  // ---------- lane change at a crossover
  const lane = await T(() => {
    const t = window.__kilnTest;
    t.placeBefore('cross', 60, 1);
    const want = t.changeLane(-1);
    t.setSpeed(90); t.throttle(1); t.step(0.7); t.throttle(0); t.step(0.5);
    return { want, lane: t.info().lane };
  });
  check('a lane change request switches lanes at the crossover', lane.want === -1 && lane.lane === 0, JSON.stringify(lane));

  // ---------- race scoring: a win is 10 points (1000 each)
  await T(() => window.__kilnTest.win());
  i = await info();
  check('winning race 1 scores 10 points, others 6/3/1', JSON.stringify(i.pts.slice().sort((a, b) => b - a)) === '[10,6,3,1]' && i.pts[0] === 10, JSON.stringify(i.pts));
  check('score = points x 1000 (+250 per fastest lap)', i.score === 10000 || i.score === 10250, `score ${i.score}`);
  await T(() => window.__kilnTest.next());
  i = await info();
  check('results lead to race 2 (banks arrive)', i.race === 1 && i.racePhase === 'grid' && i.banks >= 1, `race ${i.race} banks ${i.banks}`);

  // ---------- saved championship: progress survives a reload
  const prog = await T(() => JSON.parse(localStorage.getItem('kiln:tinplate-gp:champ') || 'null'));
  check('the championship is saved between visits', prog && prog.race === 1 && prog.pts[0] === 10, prog ? `race ${prog.race}` : 'none');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1');
  await T(() => window.__kilnTest.start());
  i = await info();
  check('Play resumes the saved championship at race 2', i.race === 1 && i.pts[0] === 10, `race ${i.race} pts ${i.pts}`);

  // ---------- loop-the-loop (race 3)
  const loopRes = await T(() => {
    const t = window.__kilnTest, out = {};
    t.race(3);
    const i0 = t.info();
    out.has = i0.loop >= 0;
    t.placeBefore('loop', 16, 1); t.setSpeed(150); t.throttle(1); t.step(1.4);
    out.slow = t.info().deslots - i0.deslots;
    t.step(2.5);
    const d1 = t.info().deslots;
    t.placeBefore('loop', 40, 1); t.setSpeed(300); t.throttle(1);
    let sawLoop = false;
    for (let k = 0; k < 40; k++) { t.step(1 / 30); if (t.info().state === 'loop') sawLoop = true; }
    out.sawLoop = sawLoop; out.fast = t.info().deslots - d1; out.state = t.info().state;
    return out;
  });
  check('race 3 has a loop-the-loop', loopRes.has);
  check('too slow for the loop: the car falls off', loopRes.slow === 1, JSON.stringify(loopRes));
  check('fast enough: the car goes round the loop and stays on', loopRes.sawLoop && loopRes.fast === 0, JSON.stringify(loopRes));

  // ---------- jump ramp (race 4)
  const jumpRes = await T(() => {
    const t = window.__kilnTest, out = {};
    t.race(4);
    out.has = t.info().jump >= 0;
    const go = v => {
      t.step(2.5);
      const d0 = t.info().deslots;
      t.placeBefore('jump', 24, 1); t.setSpeed(v); t.throttle(v > 200 ? 1 : 0.5);
      let air = false;
      for (let k = 0; k < 30; k++) { t.step(1 / 30); const st = t.info().state; if (st === 'air') air = true; else if (air && st === 'slot') t.throttle(0); }
      return { off: t.info().deslots - d0, air };
    };
    out.slow = go(130); out.ok = go(235); out.fast = go(345);
    return out;
  });
  check('race 4 has a jump ramp', jumpRes.has);
  check('jump: too slow falls short, right speed flies, too fast flips', jumpRes.slow.off === 1 && jumpRes.ok.air && jumpRes.ok.off === 0 && jumpRes.fast.off === 1, JSON.stringify(jumpRes));

  // ---------- forced loss
  await T(() => window.__kilnTest.lose());
  await page.waitForTimeout(400);
  s = await T(() => window.__kilnTest.state());
  const lastEnd = await T(() => JSON.parse(localStorage.getItem('kiln:events') || '[]').filter(e => e.ev === 'run_end').pop());
  check('lose() ends the run as a loss', s.phase === 'over' && lastEnd && lastEnd.reason === 'lose' && typeof lastEnd.score === 'number', lastEnd ? `${lastEnd.reason} ${lastEnd.score}` : 'no run_end');
  check('a finished championship clears the save', await T(() => localStorage.getItem('kiln:tinplate-gp:champ') === null || localStorage.getItem('kiln:tinplate-gp:champ') === 'null'));

  // ---------- whole championships raced by the bot
  async function championship(seed, skill) {
    return T(([seed, skill]) => {
      const t = window.__kilnTest;
      t.seed(seed); t.start(); t.bot(skill);
      const races = [];
      for (let r = 0; r < 6; r++) {
        let guard = 0;
        while (t.info().racePhase !== 'results' && guard++ < 60) t.step(4);
        const inf = t.info();
        races.push({ tpl: inf.tpl, pos: inf.finished.indexOf(0) + 1 || null, deslots: inf.deslots, guard });
        t.next();
      }
      t.bot(0);
      return { races, state: t.state() };
    }, [seed, skill]);
  }
  await page.waitForTimeout(700);
  const strong = await championship(101, 1.02);
  await page.waitForTimeout(800);
  const endA = await T(() => JSON.parse(localStorage.getItem('kiln:events') || '[]').filter(e => e.ev === 'run_end').pop());
  check('a bot championship runs all 6 races to the end', strong.races.every(r => r.guard < 60) && strong.state.phase === 'over', strong.races.map(r => r.tpl + ':' + r.pos).join(' '));
  check('every race visits a different circuit', new Set(strong.races.map(r => r.tpl)).size === 6);
  check('a near-perfect driver wins the cup (reason win)', endA && endA.reason === 'win' && endA.score >= 30000, endA ? `${endA.reason} ${endA.score}` : 'none');
  const tinCup = await T(() => +localStorage.getItem('kiln:tinplate-gp:cupLevel'));
  check('winning the cup moves on to the next championship', tinCup === 1, `cupLevel ${tinCup}`);
  await page.waitForTimeout(700);
  const weak = await championship(202, 0.8);
  await page.waitForTimeout(800);
  const endB = await T(() => JSON.parse(localStorage.getItem('kiln:events') || '[]').filter(e => e.ev === 'run_end').pop());
  check('a timid driver loses the championship (reason lose)', endB && endB.reason === 'lose', endB ? `${endB.reason} ${endB.score} ${weak.races.map(r => r.pos).join('')}` : 'none');
  const best = await T(() => +localStorage.getItem('kiln:tinplate-gp:best'));
  check('best score kept', best >= endA.score, `best ${best}`);

  // ---------- two players
  const two = await T(() => {
    const t = window.__kilnTest;
    t.twoPlayer(true); t.seed(5); t.start(); t.skipGrid();
    const i = t.info();
    t.twoPlayer(false);
    return { twoP: i.twoP, p2: t.p2() };
  });
  check('two-player mode puts a second human car on the grid', two.twoP && two.p2 !== null, JSON.stringify(two));

  // ---------- pause freezes the race
  const frozen = await T(() => {
    const t = window.__kilnTest; t.pause();
    const a = t.state();
    return new Promise(res => setTimeout(() => { const b = t.state(); t.resume(); res({ paused: a.paused, same: a.frame === b.frame }); }, 400));
  });
  check('pause freezes the simulation', frozen.paused && frozen.same, JSON.stringify(frozen));

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  srv.close();
  console.log(fails ? `FAILED: ${fails} check(s)` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL  test crashed:', e.message); process.exit(1); });
