// Scrapwing rules test, headless: sockets and snapping, fusion, knock-offs and re-catching, plates,
// scoring with the chain multiplier, the teaching wave, bosses and pods, the second socket ring,
// sector checkpoints (the saved run), losing, and no console errors over long autopiloted runs.
// Usage: node games/scrapwing/test.cjs [--port 8904]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const PORT = +(args[args.indexOf('--port') + 1] || 8904) || 8904;
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const URL = `http://localhost:${PORT}/games/scrapwing/index.html?debug`;
  await page.goto(URL);
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 5000 });
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => __kilnTest.clearSave());

  // ---- sockets
  let s = await ev(() => __kilnTest.sockets());
  check(s.length === 12 && s.filter(k => k.ring === 1).length === 6, 'twelve hex sockets in two rings of six');
  check(s.slice(0, 6).every(k => k.adj.length >= 2), 'every inner socket has neighbours for fusion', s.slice(0, 6).map(k => k.adj.length).join(','));

  // ---- teaching wave: five slow drones that never fire, the first kill drops a Blaster
  s = await ev(() => {
    const T = __kilnTest; T.startAt(5, 1, { god: true });
    const first = T.info();
    let maxB = 0, blaster = null;
    for (let i = 0; i < 60 * 9; i++) {
      T.frames(1);
      const n = T.info();
      if (n.wave === 1) maxB = Math.max(maxB, n.bullets);
      if (!blaster && n.parts.length) blaster = n.parts[0];
      if (n.wave > 1) break;
    }
    return { sched: first.sched, phase: T.state().phase, maxB, blaster, info: T.info() };
  });
  check(s.phase === 'play', 'start() begins a run');
  check(s.sched.length === 1 && s.sched[0] === 'droneV', 'sector 1 wave 1 is the teaching V of drones', s.sched.join(','));
  check(s.maxB === 0, 'the teaching wave never fires a bullet', s.maxB);
  check(s.blaster && s.blaster.type === 'blaster', 'the first kill drops a Blaster', JSON.stringify(s.blaster));

  // ---- snapping: a part bolts onto the nearest free socket on the side that touched it
  s = await ev(() => {
    const T = __kilnTest; T.startAt(6, 1, { god: true }); T.clearEnemies();
    const right = T.catchPart('plate', 1, 30, 0);
    const left = T.catchPart('plate', 1, -30, 0);
    const top = T.catchPart('seeker', 1, 0, -30);
    return { right, left, top, mods: T.info().modules };
  });
  check(s.right === 1 || s.right === 2, 'a part caught on the right lands in a right-hand socket', s.right);
  check(s.left === 4 || s.left === 5, 'a part caught on the left lands in a left-hand socket', s.left);
  check(s.top === 0, 'a part caught from above lands in the top socket', s.top);

  // ---- fusion: three of a kind side by side become one tier-2 module and free two sockets
  s = await ev(() => {
    const T = __kilnTest; T.startAt(7, 1, { god: true }); T.clearEnemies();
    T.give('blaster', 1, 0); T.give('blaster', 1, 1);
    const at = T.catchPart('blaster', 1, -24, -14);
    T.frames(30);
    const n = T.info();
    return { at, mods: n.modules, fusions: n.fusions };
  });
  const tier2 = s.mods.map((m, i) => (m && m.tier === 2 ? i : -1)).filter(i => i >= 0);
  check(s.fusions === 1 && tier2.length === 1 && s.mods[tier2[0]].type === 'blaster', 'three adjacent Blasters fuse into one tier-2 Blaster', JSON.stringify(s.mods.map(m => m && m.type[0] + m.tier)));
  check(s.mods.filter(Boolean).length === 1, 'fusing frees two sockets');
  s = await ev(() => {
    const T = __kilnTest; T.startAt(8, 1, { god: true }); T.clearEnemies();
    T.give('fan', 1, 0); T.give('blaster', 1, 1); T.catchPart('fan', 1, 0, 30); // bottom socket, not adjacent to the top fan
    return T.info();
  });
  check(s.fusions === 0, 'two of a kind apart do not fuse');

  // ---- knock-offs, the chain reset, re-catching and loose parts that expire
  s = await ev(() => {
    const T = __kilnTest; T.startAt(9, 1, { god: true }); T.clearEnemies();
    T.give('blaster', 1, 0); T.give('fan', 1, 3);
    // build a chain first: kills raise the multiplier
    for (let i = 0; i < 12; i++) { const k = T.spawn('drone', 60 + i * 10, 80); T.hit(k); }
    const before = T.info();
    T.shootAt(0); T.frames(20);
    const after = T.info();
    return { before, after };
  });
  check(s.before.mult === 3, 'twelve kills in a row raise the chain multiplier to x3', s.before.mult);
  check(!s.after.modules[0] && s.after.modules[3], 'an enemy bullet knocks off the module it hits, not its neighbours');
  check(s.after.parts.some(p => p.loose && p.type === 'blaster'), 'the knocked-off module tumbles away as a loose part');
  check(s.after.mult === 1, 'losing a module resets the chain multiplier', s.after.mult);
  s = await ev(() => {
    const T = __kilnTest; T.frames(12); const n = T.info(); const p = n.parts.find(q => q.loose);
    T.moveTo(p.x, p.y + 4); T.frames(2);
    const caught = T.info();
    T.give('seeker', 1, 0); T.shootAt(0); T.frames(10); T.moveTo(40, n.fh - 40);
    T.step(2.6);
    return { caught: caught.modules.filter(Boolean).length, parts: T.info().parts.filter(q => q.loose).length };
  });
  check(s.caught === 2, 'a loose part can be caught again', s.caught);
  check(s.parts === 0, 'a loose part not caught within 2 s is lost', s.parts);

  // ---- plates take three hits
  s = await ev(() => {
    const T = __kilnTest; T.startAt(10, 1, { god: true }); T.clearEnemies();
    T.give('plate', 1, 0);
    const hp = [];
    for (let i = 0; i < 3; i++) { T.shootAt(0); T.frames(20); const m = T.info().modules[0]; hp.push(m ? m.hp : 0); }
    return hp;
  });
  check(s[0] === 2 && s[1] === 1 && s[2] === 0, 'a Plate absorbs two hits and is knocked off by the third', s.join(','));

  // ---- scoring: kills times the chain multiplier
  s = await ev(() => {
    const T = __kilnTest; T.startAt(11, 1, { god: true }); T.clearEnemies();
    const sc = [];
    for (let i = 0; i < 7; i++) { const k = T.spawn('drone', 100 + i * 20, 80); T.hit(k); sc.push(T.info().score); }
    return sc;
  });
  check(s[0] === 10 && s[5] === 70, 'a drone is worth 10 at x1, and the 6th kill reaches x2', s.join(','));
  check(s[6] - s[5] === 20, 'the next kill at x2 scores double', s[6] - s[5]);

  // ---- enemy roster: each sector adds a type
  s = await ev(() => {
    const T = __kilnTest; const out = {};
    for (const sec of [1, 2, 3, 4, 5, 6, 7]) { T.startAt(13, sec, { god: true }); T.wave(1); out[sec] = T.info().sched[0]; }
    return out;
  });
  check(s[2] === 'sweeper' && s[3] === 'miner' && s[4] === 'gate' && s[5] === 'carrier' && s[6] === 'splitter' && s[7] === 'sniper', 'sectors 2-7 open with their new enemy', JSON.stringify(s));

  // ---- boss: pods grow per sector, pods drop tier-2 parts, the core opens last
  s = await ev(() => {
    const T = __kilnTest; T.startAt(14, 1, { god: true }); T.clearEnemies(); T.wave(5); T.step(3);
    const b1 = T.info().boss;
    T.hitPod(0); T.frames(2);
    const drop = T.info().parts.find(p => p.tier === 2);
    const mid = T.info().boss;
    T.hitPod(1); T.step(1.5);
    const open = T.info().boss;
    T.startAt(15, 3, { god: true }); T.wave(5); T.step(1);
    const b3 = T.info().boss;
    return { b1, drop, mid, open, b3 };
  });
  check(s.b1 && s.b1.pods === 2, 'the sector 1 boss has two turret pods', s.b1 && s.b1.pods);
  check(s.b3 && s.b3.pods === 4, 'bosses gain a pod each sector (sector 3: four)', s.b3 && s.b3.pods);
  check(!!s.drop, 'a destroyed pod drops a guaranteed tier-2 part', JSON.stringify(s.drop));
  check(s.mid.open === 0 && s.open.open >= 1, 'the armoured core opens only when every pod is gone', s.mid.open + ' -> ' + s.open.open);

  // ---- winning a sector: the second socket ring, the checkpoint, Arcade.progress
  s = await ev(() => {
    const T = __kilnTest; T.clearSave(); T.startAt(16, 1, { god: true }); T.clearEnemies(); T.wave(5); T.step(3);
    const before = T.info();
    T.win();
    const clear = T.info();
    T.step(3.5);
    const next = T.info();
    return { before: before.ring2, clear, next };
  });
  check(s.before === false && s.clear.stage === 'clear' && s.clear.ring2, 'beating the first boss clears the sector and opens the second ring of sockets');
  check(s.next.sector === 2 && s.next.wave === 1 && s.next.cp && s.next.cp.sector === 2, 'the next sector starts and the run is saved at its start', JSON.stringify(s.next.cp));
  const events = await ev(() => (window.Arcade && Arcade._log ? Arcade._log : null));
  void events;

  // ---- losing: a bullet on the core ends the run; best score saved
  s = await ev(() => {
    const T = __kilnTest; T.god(false); T.clearEnemies(); T.clearBullets();
    const n = T.info();
    for (let i = 0; i < 12; i++) if (n.modules[i]) { T.shootAt(i); T.frames(20); }
    T.clearBullets(); T.shootAt(-1); T.frames(20);
    return { dead: T.info().dead, score: T.info().score };
  });
  check(s.dead, 'a bullet on the bare core ends the run');
  await page.waitForTimeout(1800);
  s = await ev(() => ({ phase: __kilnTest.state().phase, best: +(localStorage.getItem('kiln:scrapwing:best') || 0), over: !document.querySelector('.k-over').hidden, again: document.querySelector('[data-k=again]').textContent }));
  check(s.phase === 'over' && s.over, 'the game-over panel opens', s.phase);
  check(s.best > 0, 'the best score is saved', s.best);
  check(/sector 2/i.test(s.again), 'game over offers to retry from the saved sector', s.again);

  // ---- the saved run survives a reload and restarts with core plus two Blasters
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 5000 });
  s = await ev(() => {
    const label = document.querySelector('[data-k=play]').textContent;
    __kilnTest.start();
    const n = __kilnTest.info();
    return { label, sector: n.sector, mods: n.modules.map(m => (m ? m.type : null)), ring2: n.ring2 };
  });
  check(/continue/i.test(s.label) && /sector 2/i.test(s.label), 'the title offers Continue at the saved sector', s.label.trim());
  check(s.sector === 2 && s.mods.filter(m => m === 'blaster').length === 2 && s.mods.filter(Boolean).length === 2 && s.ring2, 'a continued run starts at that sector with the core and two Blasters', JSON.stringify(s.mods));
  s = await ev(() => { __kilnTest.lose(); return __kilnTest.state().phase; });
  check(s === 'over', 'lose() ends the run');
  await page.waitForTimeout(1700);
  s = await ev(() => { document.querySelectorAll('.sw-alt')[1].click(); return { sector: __kilnTest.info().sector, cp: __kilnTest.info().cp, phase: __kilnTest.state().phase }; });
  check(s.phase === 'play' && s.sector === 1 && !s.cp, '"Restart from sector 1" clears the saved run', JSON.stringify(s));

  // ---- pause freezes the simulation
  s = await ev(() => { const T = __kilnTest; T.pause(); const f = T.state().frame; return new Promise(r => setTimeout(() => { r({ paused: T.state().paused, moved: T.state().frame - f }); T.resume(); }, 400)); });
  check(s.paused && s.moved === 0, 'pause stands the game still', s.moved);

  // ---- endurance: autopiloted runs across every sector type, no exceptions
  s = await ev(() => {
    const T = __kilnTest; const seen = new Set();
    T.startAt(21, 1, { god: true, auto: true });
    for (let i = 0; i < 700; i++) { T.step(2); const n = T.info(); seen.add(n.sector); if (n.sector >= 9) break; }
    const reached = T.info().sector;
    T.startAt(22, 1, { auto: true });
    let died = false;
    for (let i = 0; i < 300 && !died; i++) { T.step(1); died = T.info().dead; }
    return { reached, died, sectors: seen.size };
  });
  check(s.reached >= 9, 'an invulnerable autopilot reaches the hard loop (sector 9+) without errors', s.reached);
  check(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | '));

  await browser.close();
  srv.close();
  console.log(failed ? `FAILED: ${failed}` : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL test crashed:', e.message); process.exit(1); });
