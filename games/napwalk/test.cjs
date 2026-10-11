// Napwalk rules test: real keyboard and pointer input plus the ?debug hook, headless.
// Usage: node games/napwalk/test.cjs [--port 8900]
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
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://localhost:${PORT}/games/napwalk/index.html?debug`;
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 8000 });
  const G = (fn, a) => page.evaluate(fn, a);
  await G(() => window.__game.clearSave());

  // 1. Room 1 through real input
  await page.click('[data-k=play]');
  await page.waitForTimeout(900);
  let s = await G(() => window.__game.info());
  check(s.room === 1 && s.cats.length === 2 && s.moves === 0 && s.par === 4, `room 1 opens with 2 cats, par ${s.par}`);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(500);
  s = await G(() => window.__game.info());
  check(s.moves === 1 && s.cats[0].sl === 1 && s.cats[1].y === 5, 'one swipe moves every cat; the first cat sleeps on its cushion');
  await page.keyboard.press('z');
  await page.waitForTimeout(400);
  s = await G(() => window.__game.info());
  check(s.moves === 0 && s.cats[0].sl === 0 && s.cats[0].y === 5, 'Z undoes the move and wakes the cat');
  // a real swipe with the mouse
  const from = await G(() => window.__game.toClient(3, 4));
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let k = 1; k <= 6; k++) { await page.mouse.move(from.x, from.y - k * 12); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(500);
  s = await G(() => window.__game.info());
  check(s.moves === 1 && s.cats[0].sl === 1, 'an upward mouse swipe makes the same move');
  for (const d of ['up', 'up', 'left']) { await page.keyboard.press(KEY[d]); await page.waitForTimeout(420); }
  await page.waitForTimeout(2200);
  s = await G(() => window.__game.info());
  check(s.cleared && s.stars === 3 && s.run.room === 2 && s.run.solved === 1, 'solving at par clears the room with three paws and saves Room 2');
  const cb = await G(() => window.__game.cardButtons());
  const next = cb.find(b => b.id === 'next');
  await page.mouse.click(next.x, next.y);
  await page.waitForTimeout(700);
  s = await G(() => window.__game.info());
  check(s.room === 2 && s.moves === 0, 'tapping Next room opens Room 2');

  // 2. A blocked swipe does not count; restart button resets the room
  const before = s;
  await G(() => window.__game.swipe('right'));
  await G(() => window.__game.swipe('right'));
  await G(() => window.__game.swipe('right'));
  s = await G(() => window.__game.info());
  const stuckMoves = s.moves;
  await G(() => window.__game.swipe('right'));
  s = await G(() => window.__game.info());
  check(s.moves === stuckMoves, `a swipe where no cat can move is not counted (${s.moves})`);
  const btns = await G(() => window.__game.buttons());
  const rb = btns.find(b => b.id === 'restart');
  await page.mouse.click(rb.x, rb.y);
  await page.waitForTimeout(600);
  s = await G(() => window.__game.info());
  check(s.moves === 0 && JSON.stringify(s.cats) === JSON.stringify(before.cats), 'the Restart patch puts every cat back');

  // 3. Rules on hand-made rooms
  s = await G(() => window.__game.load({ W: 5, H: 3, cushions: [[0, 0]], cats: [[2, 0, 'ginger'], [3, 0, 'grey'], [4, 1, 'black']] }));
  s = await G(() => window.__game.swipe('left'));
  check(s.cats[0].x === 1 && s.cats[1].x === 2 && s.cats[2].x === 3, 'cats in a row step together (leading edge first)');
  s = await G(() => window.__game.load({ W: 5, H: 3, furn: [[0, 0]], cushions: [[4, 2], [4, 1]], cats: [[1, 0], [2, 0]] }));
  s = await G(() => window.__game.swipe('left'));
  check(s.cats[0].x === 1 && s.cats[1].x === 2, 'a cat blocked by furniture blocks the cat behind it');
  s = await G(() => window.__game.load({ W: 6, H: 3, matched: true, cushions: [[2, 1, 'grey'], [5, 0, 'ginger']], cats: [[0, 1, 'ginger'], [0, 2, 'grey']] }));
  s = await G(() => window.__game.swipe('right'));
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].x === 2 && s.cats[0].sl === 0, 'from room 11 a cat walks over a cushion that is not its own');
  s = await G(() => window.__game.load({ W: 6, H: 3, cushions: [[2, 1], [5, 0]], cats: [[0, 1, 'ginger'], [0, 0, 'grey']] }));
  s = await G(() => window.__game.swipe('right')); s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].sl === 1, 'in early rooms any cushion sends a cat to sleep');
  s = await G(() => window.__game.swipe('down'));
  check(s.cats[1].y === 0 && s.cats[1].x === 2, 'a sleeping cat is a wall');
  s = await G(() => window.__game.load({ W: 6, H: 2, rugs: [[1, 0, 3, 1]], cushions: [[5, 1]], cats: [[0, 0]] }));
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].x === 4, `a rug slides the cat until it leaves the rug (x=${s.cats[0].x})`);
  s = await G(() => window.__game.load({ W: 6, H: 2, cushions: [[5, 1]], cats: [[0, 0], [0, 1]], yarn: [[2, 0]] }));
  s = await G(() => window.__game.swipe('right'));
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].x === 2 && s.cats[0].sk === 1 && s.yarn[0].x === 3, 'batting yarn rolls it on and the cat waits a swipe');
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].x === 2 && s.cats[0].sk === 0 && s.cats[1].x === 3, 'the yarn cat skips one swipe while the others move');
  s = await G(() => window.__game.load({ W: 6, H: 3, doors: [[1, 0, 4, 2]], cushions: [[5, 2]], cats: [[0, 0]] }));
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].x === 4 && s.cats[0].y === 2, 'a tunnel moves the cat to its twin');
  s = await G(() => window.__game.swipe('right'));
  check(s.cats[0].sl === 1, 'and it can walk on to its cushion');

  // 4. Hints cap stars; the optimal solution always clears
  await G(() => window.__game.room(5));
  await page.waitForTimeout(400);
  const hd = await G(() => window.__game.hint());
  const sol = await G(() => window.__game.solution());
  check(hd === sol[0], `the hint shows the first optimal swipe (${hd})`);
  await G(() => window.__game.win());
  s = await G(() => window.__game.info());
  check(s.cleared && s.stars === 2 && s.moves === s.par, 'a hinted room solved at par earns two paws');
  await G(() => window.__game.replay());
  await G(d => window.__game.swipe(d), sol[0] === 'up' ? 'down' : 'up');
  await G(() => window.__game.win());
  s = await G(() => window.__game.info());
  check(s.cleared && s.stars === (s.moves <= s.par ? 3 : s.moves <= s.par + 3 ? 2 : 1), `paws follow moves against par (${s.moves}/${s.par} -> ${s.stars})`);

  // 5. Later rooms: generated, solvable, every cat moves at least twice, mechanics appear on schedule
  for (const [n, test] of [[12, r => r.cats === 3], [24, r => r.rugs >= 1], [33, r => r.yarn >= 1], [42, r => r.doors === 1 && r.cats === 4], [58, r => r.cats >= 4]]) {
    const r = await G(n => window.__game.gen(n), n);
    check(r.par >= 3 && r.every2 && test(r), `room ${n}: par ${r.par} in band ${r.band}, ${r.cats} cats, ${r.ms} ms`);
  }
  const det = await G(() => [window.__game.gen(37).par, window.__game.gen(37).par]);
  check(det[0] === det[1], 'room generation is deterministic');
  for (const n of [17, 29, 44]) {
    await G(n => window.__game.room(n), n);
    await page.waitForTimeout(300);
    const ok = await G(() => window.__game.win());
    s = await G(() => window.__game.info());
    check(ok && s.cleared && s.moves === s.par, `room ${n} clears with the solver in exactly par (${s.par})`);
  }

  // 6. Ending a sitting: run_end with a numeric score; the room is saved
  await G(() => window.__kilnTest.lose());
  await page.waitForTimeout(800);
  const st = await G(() => window.__kilnTest.state());
  const ev = await G(() => { for (const k of Object.keys(localStorage)) if (/events$/.test(k)) return JSON.parse(localStorage.getItem(k)); return []; });
  const end = ev.reverse().find(e => e.ev === 'run_end');
  check(st.phase === 'over', 'lose() (Call it a night) shows the end panel');
  check(end && typeof end.score === 'number', `run_end carries a numeric score (${end && end.score})`);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1');
  const label = await page.textContent('[data-k=play]');
  check(/Room/.test(label), `the title offers to continue (${label.trim()})`);
  await page.click('[data-k=play]');
  await page.waitForTimeout(500);
  s = await G(() => window.__game.info());
  check(s.room === s.run.room && s.room > 2, `Continue resumes the saved room (${s.room})`);

  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  srv.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASS');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
