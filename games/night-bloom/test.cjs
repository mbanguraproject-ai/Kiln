// Night Bloom headless rules test.
//
//   node games/night-bloom/test.cjs [--port 8910]
//
// Drives the real game through its ?debug hook (window.__kilnTest): the solver that sets each quota,
// the autopilot that follows its plan, tap rules, chain scoring, beacons (lives) and game over.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8910);
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
const check = (ok, name, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); if (!ok) fails++; };

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`http://localhost:${PORT}/games/night-bloom/index.html?debug`);
    await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
    const T = (fn, ...a) => page.evaluate(([fn, a]) => window.__kilnTest[fn](...a), [fn, a]);

    // 1. every wave is solvable: the quota never exceeds what the solver lights with the wave's own sparks
    const solv = await page.evaluate(() => {
      const out = [];
      for (let n = 1; n <= 32; n++) for (let sd = 1; sd <= 3; sd++) { const s = window.__kilnTest.solveWave(n, sd); out.push({ n, sd, ...s }); }
      return out;
    });
    const bad = solv.filter(s => s.quota > s.base || s.quota < 3);
    check(bad.length === 0, 'quotas are fair (solver base >= quota) on waves 1-32', bad.length ? JSON.stringify(bad[0]) : `${solv.length} waves`);
    check(solv.filter(s => s.n % 5 === 0).every(s => s.sparks === 3), 'every 5th wave is a finale with 3 sparks');
    check(solv.find(s => s.n === 1).count === 8 && solv.find(s => s.n === 1).quota === 5, 'wave 1: 8 shells, quota 5');

    // 2. start a seeded run
    await T('seed', 3);
    await T('start');
    let info = await T('info');
    check(info.mode === 'wave' && info.wave === 1 && info.sparks === 2 && info.lives === 3, 'run starts on wave 1 with 2 sparks and 3 beacons', JSON.stringify({ m: info.mode, w: info.wave, s: info.sparks }));

    // 3. tap rules: empty sky costs nothing, a shell at its apex costs one spark and blooms (x2)
    await T('tap', 20, 40);
    info = await T('info');
    check(info.sparks === 2, 'tapping empty sky spends no spark');
    let apex = null;
    for (let i = 0; i < 400 && !apex; i++) { await T('step', 1 / 60); const sh = await T('shells'); apex = sh.find(s => s.apex); }
    check(!!apex, 'a shell reaches its apex window');
    await T('tapShell', apex.id);
    info = await T('info');
    check(info.sparks === 1 && info.log[0] === 20, 'apex tap spends a spark and scores a Bloom (10 x depth 1 x 2)', JSON.stringify(info.log));
    for (let i = 0; i < 60; i++) { await T('step', 0.1); info = await T('info'); if (info.mode !== 'wave') break; }
    check(info.log.length >= 5 && info.log.slice(1).every(p => p % 10 === 0 && p >= 20), 'the burst chains into neighbours, deeper links worth more', JSON.stringify(info.log));
    const sum = info.log.reduce((a, b) => a + b, 0);
    const bonus = Math.max(0, info.lit - info.quota) * 25;
    check(info.mode === 'inter' && info.banked === sum + bonus, 'wave 1 cleared; score = chain points + 25 per shell over quota', `banked ${info.banked} = ${sum} + ${bonus}`);

    // 4. the autopilot (the solver's plan) clears waves 2-7, and the score adds up every wave
    await T('autoplay', true);
    let okWaves = 0, scoreOk = true, last = info.banked;
    for (let w = 2; w <= 7; w++) {
      for (let i = 0; i < 80; i++) { await T('step', 0.1); info = await T('info'); if (info.mode === 'wave' && info.wave === w) break; }
      let snap = info;
      for (let i = 0; i < 200; i++) { await T('step', 0.1); const nx = await T('info'); if (nx.mode !== 'wave') { info = nx; break; } snap = nx; }
      if (snap.lit >= snap.quota) okWaves++;
      const exp = last + snap.log.reduce((a, b) => a + b, 0) + Math.max(0, snap.lit - snap.quota) * 25 * (snap.lit >= snap.quota ? 1 : 0) + (snap.finale ? 0 : 0);
      if (!snap.finale && info.banked !== exp) scoreOk = false;
      last = info.banked;
    }
    check(okWaves === 6, 'solver plan meets the quota on waves 2-7', `${okWaves}/6`);
    check(scoreOk, 'banked score matches the chain ledger on every regular wave');
    check(info.lives === 3, 'no beacons lost while the quota is met');

    // 5. later content: new shell types arrive on schedule, wind from wave 7
    const types = await page.evaluate(() => { const T = window.__kilnTest; const o = {}; for (const n of [2, 3, 5, 6, 8]) { T.wave(n); o[n] = T.info().types; } T.wave(7); o.wind = T.info().wind; return o; });
    check(types[2].includes('willow') && types[3].includes('cross') && types[5].includes('ring') && types[6].includes('smoke') && types[8].includes('strobe'), 'shell types introduced on waves 2, 3, 5, 6, 8', JSON.stringify(types));
    check(Math.abs(types.wind) > 0, 'wind blows from wave 7');

    // 6. missing a quota costs a beacon; losing all three ends the show
    await T('autoplay', false);
    for (let k = 0; k < 3; k++) {
      await T('wave', 9 + k);
      for (let i = 0; i < 300; i++) { await T('step', 0.1); info = await T('info'); if (info.mode !== 'wave') break; }
    }
    const st = await T('state');
    check(info.lives === 0 && st.phase === 'over', 'three missed quotas put out every beacon: game over', JSON.stringify({ lives: info.lives, phase: st.phase }));

    // 7. restart is instant and lose() works from play
    await T('start');
    info = await T('info');
    check(info.wave === 1 && info.lives === 3 && (await T('state')).score === 0, 'restart begins a fresh show at once');
    await T('lose');
    await page.waitForTimeout(100);
    check((await T('state')).phase === 'over', 'lose() ends the run');
  } catch (e) {
    check(false, 'test run', e.message);
  }
  check(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  srv.close();
  console.log(fails ? `FAILED: ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
