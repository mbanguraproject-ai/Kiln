// Pipistrelle rules test: real pointer input plus the ?debug test hook, headless.
// Usage: node games/pipistrelle/test.cjs [--port 8910]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8910);
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const URL = `http://localhost:${PORT}/games/pipistrelle/index.html?debug`;
  const T = (fn, a) => page.evaluate(fn, a);
  const info = () => T(() => window.__kilnTest.info());
  const events = () => T(() => window.Arcade._log.all().filter(e => e.game === 'pipistrelle'));

  try {
    await page.goto(URL);
    await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
    check((await T(() => window.__kilnTest.state())).phase === 'title', 'boots to the title over a live attract cave');

    // 1. A run starts in cave 1 and the first chirp fires by itself.
    await T(() => { window.__kilnTest.seed(42); window.__kilnTest.start(); });
    await T(() => window.__kilnTest.step(0.6));
    let i = await info();
    check(i.mode === 'play' && i.cave === 1 && Math.round(i.energy) >= 98, 'run starts in cave 1 with full energy');
    check(i.chirps === 1 && i.echoes > 100, `first chirp fires automatically and paints echoes (${i.echoes} echo dots)`);
    check((await events()).some(e => e.ev === 'run_start'), 'run_start logged');
    check(JSON.parse(await T(() => JSON.stringify(window.Arcade.store.get('run', null)))).cave === 1, 'the run is saved at the cave entrance');

    // 2. Real input: a quick tap chirps; a second tap inside the 0.6 s cooldown does not.
    await T(() => window.__kilnTest.step(0.7));
    const c0 = (await info()).chirps;
    await page.mouse.click(200, 600);
    await T(() => window.__kilnTest.step(1 / 60));
    await page.mouse.click(200, 600);
    await T(() => window.__kilnTest.step(1 / 60));
    check((await info()).chirps === c0 + 1, 'a tap chirps, and the cooldown swallows a second tap');

    // 3. Real input: dragging steers (relative stick), letting go glides to a stop.
    const before = await info();
    await page.mouse.move(150, 600); await page.mouse.down();
    await page.mouse.move(175, 600, { steps: 3 }); await page.mouse.move(215, 600, { steps: 3 });
    await T(() => window.__kilnTest.step(0.5));
    i = await info();
    check(i.vx > 120 && i.x > before.x + 30, `dragging right flies the bat right (vx ${Math.round(i.vx)})`);
    await page.mouse.up();
    await T(() => window.__kilnTest.step(2.5));
    i = await info();
    check(Math.hypot(i.vx, i.vy) < 30 || i.stun > 0, 'released, the bat glides to a stop');

    // 4. Holding still shrieks (twice the reach, 3 s cooldown).
    await T(() => window.__kilnTest.step(1));
    await page.mouse.move(200, 650); await page.mouse.down();
    await page.waitForTimeout(1050);
    await T(() => window.__kilnTest.step(1 / 60));
    await page.mouse.up();
    i = await info();
    check(i.scd > 2.5, 'pressing and holding still shrieks');

    // 5. Moths: flying into one eats it, adds to the haul and restores energy.
    await T(() => window.__kilnTest.energy(50));
    const carried0 = (await info()).carried;
    const m = (await info()).mothList[0];
    await T(m => { window.__kilnTest.teleport(m[0] - 2, m[1]); window.__kilnTest.step(1 / 60); }, m);
    i = await info();
    check(i.carried > carried0 && i.energy > 54, `eating a moth: carried ${carried0} -> ${i.carried}, energy 50 -> ${i.energy.toFixed(1)}`);

    // 6. Pups: flying through a hanging pup rescues it and raises the multiplier.
    const p = (await info()).pupList[0];
    await T(p => { window.__kilnTest.teleport(p[0], p[1] + 4); window.__kilnTest.step(1 / 60); }, p);
    i = await info();
    check(i.pups === 1, 'flying through a pup rescues it (multiplier x2)');

    // 7. Walls are soft: a bump costs a little energy and stuns, never kills.
    await T(() => { window.__kilnTest.energy(80); });
    const bumps0 = (await info()).bumps;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let bestDir = dirs[0], bestD = Infinity;
    for (const d of dirs) { const v = await T(d => window.__kilnTest.wallDist(d[0], d[1]), d); if (v < bestD) { bestD = v; bestDir = d; } }
    await T(([d, u]) => { const i = window.__kilnTest.info(); window.__kilnTest.teleport(i.x + d[0] * (u - 30), i.y + d[1] * (u - 30)); window.__kilnTest.input(d[0], d[1]); window.__kilnTest.step(0.45); window.__kilnTest.input(0, 0); }, [bestDir, bestD]);
    i = await info();
    check(i.bumps > bumps0 && i.lastBumpCost > 1 && i.lastBumpCost < 8 && i.mode === 'play' && !i.solidAtBat, `bumping a wall costs a little (${i.lastBumpCost.toFixed(1)} energy), the bat bounces back into open air`);

    // 8. The exit banks moths x multiplier, then the night flight, then cave 2.
    await T(() => { window.__kilnTest.give('moth'); window.__kilnTest.give('moth'); });
    const carried = (await info()).carried, mult = 1 + (await info()).pups, score0 = (await info()).score;
    await T(() => { window.__kilnTest.win(); window.__kilnTest.step(2.2); });
    i = await info();
    check(i.sub === 'night' && i.score === score0 + carried * mult, `the exit banks ${carried} moths x${mult} = ${carried * mult}`);
    check((await events()).some(e => e.ev === 'level_complete'), 'level_complete tracked');
    const nightScore = i.score;
    await T(() => { window.__kilnTest.autopilot(true); window.__kilnTest.step(6); window.__kilnTest.autopilot(false); });
    check((await info()).score > nightScore, 'night-flight moths add straight to the score');
    await T(() => { window.__kilnTest.skipNight(); window.__kilnTest.step(1.8); });
    i = await info();
    check(i.sub === 'cave' && i.cave === 2 && i.pups === 0 && i.carried === 0, 'the next cave starts fresh: cave 2, no pups, nothing carried');
    const saved = JSON.parse(await T(() => JSON.stringify(window.Arcade.store.get('run', null))));
    check(saved && saved.cave === 2 && saved.score === i.score, 'the save holds cave 2 and the banked score');

    // 9. Webs (cave 2) hold you until you wiggle free.
    const w = (await T(() => window.__kilnTest.webList()))[0];
    await T(w => { window.__kilnTest.teleport(w.x, w.y); window.__kilnTest.step(2 / 60); }, w);
    check((await info()).webbed, 'flying into a web catches the bat');
    for (let k = 0; k < 6; k++) await T(k => { window.__kilnTest.input(k % 2 ? 1 : -1, 0); window.__kilnTest.step(0.12); }, k);
    await T(() => window.__kilnTest.input(0, 0));
    check(!(await info()).webbed, 'wiggling side to side tears free');

    // 10. Stalactites (cave 3) shake, then fall when you pass under them.
    await T(() => window.__kilnTest.cave(3));
    await T(() => window.__kilnTest.safe(true));
    const st = (await T(() => window.__kilnTest.stalList()))[0];
    await T(s => { window.__kilnTest.teleport(s.x + 60, s.y + 120); window.__kilnTest.step(1 / 60); window.__kilnTest.teleport(s.x + 10, s.y + 120); window.__kilnTest.step(0.1); }, st);
    let st2 = (await T(() => window.__kilnTest.stalList()))[0];
    check(st2.state === 'shake', 'passing under a stalactite sets it trembling (the tell)');
    await T(() => window.__kilnTest.step(1.6));
    st2 = (await T(() => window.__kilnTest.stalList()))[0];
    check(st2.state === 'fall' || st2.state === 'gone', 'then it falls');

    // 11. Owls (cave 7) sleep until a shriek wakes them.
    await T(() => window.__kilnTest.cave(7));
    const ow = (await T(() => window.__kilnTest.owlList()))[0];
    check(ow && ow.state === 'sleep', 'owls roost asleep');
    await T(o => { window.__kilnTest.teleport(o.x, o.y - 160); window.__kilnTest.chirp(); window.__kilnTest.step(0.2); }, ow);
    check((await T(() => window.__kilnTest.owlList()))[0].state === 'sleep', 'a chirp does not wake an owl');
    await T(() => { window.__kilnTest.shriek(); window.__kilnTest.step(0.2); });
    check((await T(() => window.__kilnTest.owlList()))[0].state !== 'sleep', 'a shriek wakes it');
    await T(() => window.__kilnTest.safe(false));

    // 12. Determinism: the same run seed gives the same cave.
    await T(() => window.__kilnTest.cave(4));
    const fpA = await T(() => window.__kilnTest.fingerprint());
    await T(() => window.__kilnTest.cave(5));
    await T(() => window.__kilnTest.cave(4));
    check(fpA === await T(() => window.__kilnTest.fingerprint()), 'a cave plays the same on retry (seeded from run seed and cave index)');

    // 13. Pause freezes the simulation.
    await T(() => window.__kilnTest.pause());
    const f0 = (await T(() => window.__kilnTest.state())).frame;
    await page.waitForTimeout(400);
    const s1 = await T(() => window.__kilnTest.state());
    check(s1.paused && s1.frame === f0, 'pause freezes the game');
    await T(() => window.__kilnTest.resume());

    // 14. Energy at zero ends the run with the banked score; the save is cleared and the best kept.
    const finalScore = (await info()).score;
    await T(() => window.__kilnTest.drainEnergy());
    await T(() => window.__kilnTest.step(1.6));
    await page.waitForTimeout(500);
    const end = (await events()).filter(e => e.ev === 'run_end').pop();
    check((await T(() => window.__kilnTest.state())).phase === 'over', 'energy at zero ends the run');
    check(end && end.reason === 'lose' && end.score === finalScore, `run_end reports the banked score (${end && end.score})`);
    check(await T(() => window.Arcade.store.get('run', null)) === null, 'the saved run is cleared');
    check(+(await T(() => window.Arcade.store.get('best', 0))) === finalScore, 'the best score is kept');

    // 15. Persistence: a saved run continues from its cave after a reload.
    await T(() => { window.__kilnTest.seed(7); window.__kilnTest.start(); });
    await T(() => { window.__kilnTest.give('moth'); window.__kilnTest.win(); window.__kilnTest.step(2.2); window.__kilnTest.skipNight(); window.__kilnTest.step(1.8); });
    const sc = (await info()).score;
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1');
    const label = await page.textContent('[data-k=play] span');
    check(/Continue/.test(label) && /Cave 2/.test(label), `the title offers "${label}"`);
    await page.click('[data-k=play]');
    await T(() => window.__kilnTest.step(0.2));
    i = await info();
    check(i.cave === 2 && i.score === sc, 'Continue resumes cave 2 with the banked score');

    // 16. Many runs with the autopilot: no exceptions, every cave reachable.
    await T(() => window.__kilnTest.safe(true));
    let reached = 0;
    for (let k = 0; k < 4; k++) {
      const r = await T(k => { window.__kilnTest.run(100 + k); window.__kilnTest.safe(true); window.__kilnTest.autopilot(true); for (let s = 0; s < 90; s++) { window.__kilnTest.step(1); if (window.__kilnTest.info().sub !== 'cave') return true; } return false; }, k);
      if (r) reached++;
    }
    check(reached === 4, `the autopilot reaches the exit of cave 1 in ${reached}/4 seeded runs`);
    await T(() => { window.__kilnTest.autopilot(false); window.__kilnTest.safe(false); });
  } catch (e) {
    check(false, 'test crashed: ' + e.message);
  }
  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  srv.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})();
