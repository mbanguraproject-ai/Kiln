// Tessera headless test: rules, persistence, the rose window and a fairness bot.
//
//   NODE_PATH=/opt/node22/lib/node_modules node games/tessera/test.cjs [--port 8801] [--runs 200] [--sim-only] [--no-sim]
//
// The bot plays real runs through the ?debug hook (window.__tessera): it calls the game's own
// placePiece, so dealing, scoring, strips and game over are the shipped code. It plays the same
// seeds twice: once with an exact copy of the pre-upgrade dealer injected (the baseline), once
// with the shipped fair dealer, and prints median run length plus why each run was lost.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const has = name => args.includes('--' + name);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +opt('port', 8801);
const RUNS = +opt('runs', 300);
const CAP = +opt('cap', 4000);
const TUNE = opt('tune', null); // JSON, for tuning experiments only

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
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

// Runs inside the page. Defines window.__bot.
const BOT_SRC = String.raw`(() => {
  const T = window.__tessera, N = T.N, SHAPES = T.SHAPES, fits = T.fits, fitsAnywhere = T.fitsAnywhere;
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sim(b, s, r, c) {
    const nb = b.slice();
    for (const [dr, dc] of s.cells) nb[(r + dr) * N + c + dc] = 1;
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      let rf = true, cf = true;
      for (let j = 0; j < N; j++) { if (!nb[i * N + j]) rf = false; if (!nb[j * N + i]) cf = false; }
      if (rf) rows.push(i); if (cf) cols.push(i);
    }
    for (const rr of rows) for (let k = 0; k < N; k++) nb[rr * N + k] = 0;
    for (const cc of cols) for (let k = 0; k < N; k++) nb[k * N + cc] = 0;
    return { nb, count: rows.length + cols.length };
  }
  // "Reasonable bot": greedy one-piece look-ahead. Keeps space open, avoids isolated holes and
  // fragmentation, likes clears, and avoids moves after which another tray piece fits nowhere.
  function evalBoard(b) {
    let e = 0, holes = 0, tr = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c; if (b[i]) continue; e++;
      let nb = 0;
      if (r === 0 || b[i - N]) nb++; if (r === N - 1 || b[i + N]) nb++;
      if (c === 0 || b[i - 1]) nb++; if (c === N - 1 || b[i + 1]) nb++;
      if (nb >= 3) holes++; if (nb === 4) holes += 2;
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) {
      if (!!b[r * N + c] !== !!b[r * N + c + 1]) tr++;
      if (!!b[c * N + r] !== !!b[(c + 1) * N + r]) tr++;
    }
    return e - 4 * holes - 0.6 * tr;
  }
  function botMove(b, tray, rnd) {
    let best = null, bv = -1e9;
    tray.forEach((s, slot) => {
      if (!s) return;
      for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) {
        if (!fits(b, s, r, c)) continue;
        const { nb, count } = sim(b, s, r, c);
        let v = evalBoard(nb) + 30 * count;
        if (tray.some((t, i) => t && i !== slot && !fitsAnywhere(nb, t))) v -= 200;
        v += rnd() * 0.01;
        if (v > bv) { bv = v; best = { slot, r, c }; }
      }
    });
    return best;
  }
  // Exhaustive (no work budget): can these pieces all be placed in some order?
  function placeable(b, list) {
    if (!list.length) return true;
    for (let i = 0; i < list.length; i++) {
      const s = list[i], rest = list.filter((_, j) => j !== i);
      for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++)
        if (fits(b, s, r, c) && placeable(sim(b, s, r, c).nb, rest)) return true;
    }
    return false;
  }
  // Replays a dealer's plan: every step must fit.
  function planWorks(b, list, plan) {
    if (!plan || plan.length !== list.length) return false;
    let board = b.map(v => (v ? 1 : 0));
    const used = new Set();
    for (const { i, r, c } of plan) {
      if (used.has(i) || !list[i] || !fits(board, list[i], r, c)) return false;
      used.add(i);
      board = sim(board, list[i], r, c).nb;
    }
    return true;
  }

  // The dealer as it shipped before this upgrade (games/tessera/index.html at 788129f), verbatim
  // apart from taking the board, score and RNG as arguments.
  function legacyDealer(b, score, rand) {
    function simulate(bb, s, r, c) { return sim(bb, s, r, c).nb; }
    function solvable(bb, trio) {
      let budget = 40000;
      const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      const go = (board, list, k) => {
        if (k === list.length) return true;
        const s = list[k];
        for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.wd; c++) {
          if (--budget < 0) throw new Error('budget');
          if (fits(board, s, r, c) && go(simulate(board, s, r, c), list, k + 1)) return true;
        }
        return false;
      };
      try { for (const o of orders) if (go(bb, o.map(i => trio[i]), 0)) return true; return false; } catch (e) { return true; }
    }
    function rollShape(fill, sc) {
      let total = 0;
      const ws = SHAPES.map(s => {
        let w = s.w;
        if (fill > 0.5) w *= s.n <= 3 ? 1.7 : s.n >= 5 ? 0.55 : 1;
        else if (sc > 2500 && s.n >= 5) w *= 1.3;
        total += w; return w;
      });
      let x = rand() * total;
      for (let i = 0; i < SHAPES.length; i++) if ((x -= ws[i]) < 0) return SHAPES[i];
      return SHAPES[0];
    }
    const fill = b.reduce((a, v) => a + (v ? 1 : 0), 0) / (N * N);
    const fair = rand() < Math.max(0.6, 1 - score / 7000);
    let chosen = null;
    for (let k = 0; k < 40; k++) {
      const trio = [rollShape(fill, score), rollShape(fill, score), rollShape(fill, score)];
      if (!trio.some(s => fitsAnywhere(b, s))) continue;
      if (!chosen) chosen = trio;
      if (!fair || solvable(b, trio)) { chosen = trio; break; }
    }
    if (!chosen) chosen = [SHAPES[0], rollShape(fill, score), rollShape(fill, score)];
    return chosen;
  }

  function playRun({ seed, legacy, cap }) {
    T.seed(seed);
    T.setDealer(legacy ? legacyDealer : null);
    T.newGame(false);
    const rnd = mulberry32(seed * 7919 + 13);
    const out = { seed, deals: 0, paths: {}, badPlans: 0, dealMs: 0, slowDeal: 0, dealTotal: 0, capped: false };
    let seen = null;
    const noteDeal = () => {
      const d = T.lastDeal();
      if (!d || d === seen) return;
      seen = d;
      out.deals++;
      out.paths[d.path] = (out.paths[d.path] || 0) + 1;
      out.slowDeal = Math.max(out.slowDeal, d.ms || 0);
      out.dealTotal += d.ms || 0;
      if (d.guaranteed && !planWorks(d.board, d.ids.map(id => SHAPES[id]), d.plan)) out.badPlans++;
    };
    noteDeal();
    while (!T.G.over) {
      if (T.G.moves >= cap) { out.capped = true; break; }
      const m = botMove(T.G.board, T.G.tray.map(t => t && t.s), rnd);
      if (!m) throw new Error('bot found no move but the game is not over (seed ' + seed + ')');
      const t0 = performance.now();
      if (!T.placePiece(m.slot, m.r, m.c)) throw new Error('placePiece refused a legal move');
      out.dealMs = Math.max(out.dealMs, performance.now() - t0);
      noteDeal();
    }
    const d = T.lastDeal();
    out.lines = T.G.lines; out.moves = T.G.moves; out.score = T.G.score; out.strips = T.G.strips.length;
    out.maxCombo = T.G.maxCombo;
    out.gold = T.G.strips.filter(s => s.slice(0, 8).split('').every(ch => ch === s[0])).length;
    out.paletteOk = T.G.palette.length === 4 && new Set(T.G.palette).size === 4;
    if (T.G.over) {
      out.lostGuaranteed = d.guaranteed;
      out.lostPath = d.path;
      out.leftInTray = T.G.tray.filter(Boolean).length;
      out.unplaceable = !placeable(d.board.map(v => (v ? 1 : 0)), d.ids.map(id => SHAPES[id]));
    }
    T.setDealer(null);
    return out;
  }
  window.__bot = { playRun, botMove, placeable, planWorks, mulberry32 };
})()`;

const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const median = a => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function simulate(page, legacy, runs) {
  const res = [];
  const t0 = Date.now();
  for (let k = 0; k < runs; k += 10) {
    const chunk = await page.evaluate(({ k, n, legacy, cap }) => {
      const out = [];
      for (let i = k; i < k + n; i++) out.push(window.__bot.playRun({ seed: 1000 + i, legacy, cap }));
      return out;
    }, { k, n: Math.min(10, runs - k), legacy, cap: CAP });
    res.push(...chunk);
  }
  const lost = res.filter(r => !r.capped);
  const L = res.map(r => r.lines), M = res.map(r => r.moves), S = res.map(r => r.score);
  const summary = {
    dealer: legacy ? 'pre-upgrade (score ramp)' : 'fair (shipped)',
    runs: res.length, secs: (Date.now() - t0) / 1000,
    lines: { p10: q(L, 0.1), median: median(L), p90: q(L, 0.9), max: Math.max(...L) },
    moves: { p10: q(M, 0.1), median: median(M), p90: q(M, 0.9) },
    score: { p10: q(S, 0.1), median: median(S), p90: q(S, 0.9) },
    ring1: +(res.filter(r => r.lines >= 16).length / res.length).toFixed(3),
    ring2: +(res.filter(r => r.lines >= 48).length / res.length).toFixed(3),
    window: +(res.filter(r => r.lines >= 112).length / res.length).toFixed(3),
    goldLeafPerRun: +(res.reduce((a, r) => a + r.gold, 0) / res.length).toFixed(2),
    capped: res.length - lost.length,
    losses: lost.length,
    lossesFromUnplaceableTray: lost.filter(r => r.unplaceable).length,
    shareUnplaceable: +(lost.filter(r => r.unplaceable).length / Math.max(1, lost.length)).toFixed(3),
    unplaceableOnGuaranteedTray: lost.filter(r => r.unplaceable && r.lostGuaranteed).length,
    lossesOnFallbackTray: lost.filter(r => !r.lostGuaranteed).length,
    deals: res.reduce((a, r) => a + r.deals, 0),
    dealPaths: res.reduce((a, r) => { for (const [k, v] of Object.entries(r.paths)) a[k] = (a[k] || 0) + v; return a; }, {}),
    brokenPlans: res.reduce((a, r) => a + r.badPlans, 0),
    slowestMoveMs: +Math.max(...res.map(r => r.dealMs)).toFixed(1),
    slowestDealMs: +Math.max(...res.map(r => r.slowDeal)).toFixed(1),
    meanDealMs: +(res.reduce((a, r) => a + r.dealTotal, 0) / Math.max(1, res.reduce((a, r) => a + r.deals, 0))).toFixed(2),
  };
  return { res, summary };
}

function printSummary(s) {
  console.log(`\n${s.dealer}: ${s.runs} runs in ${s.secs}s`);
  console.log(`  lines  p10 ${s.lines.p10}  median ${s.lines.median}  p90 ${s.lines.p90}  max ${s.lines.max}`);
  console.log(`  moves  p10 ${s.moves.p10}  median ${s.moves.median}  p90 ${s.moves.p90}`);
  console.log(`  score  p10 ${s.score.p10}  median ${s.score.median}  p90 ${s.score.p90}`);
  console.log(`  window rings: ring 1 ${pct(s.ring1)}, ring 2 ${pct(s.ring2)}, full window ${pct(s.window)}; gold-leaf wedges per run ${s.goldLeafPerRun}`);
  console.log(`  losses ${s.losses} (capped ${s.capped}); caused by an unplaceable tray: ${s.lossesFromUnplaceableTray} (${pct(s.shareUnplaceable)})`);
  console.log(`    of those, on trays from the guaranteed path: ${s.unplaceableOnGuaranteedTray}; losses on fallback/unverified trays: ${s.lossesOnFallbackTray}`);
  console.log(`  deals ${s.deals} by path ${JSON.stringify(s.dealPaths)}; broken plans ${s.brokenPlans}`);
  console.log(`  time: slowest move ${s.slowestMoveMs}ms, slowest deal ${s.slowestDealMs}ms, mean deal ${s.meanDealMs}ms`);
}
const pct = x => (100 * x).toFixed(1) + '%';

// In-page helpers for the rule checks: set up a board and tray directly through the debug hook.
const HELPERS = String.raw`(() => {
  const T = window.__tessera;
  const shape = key => T.SHAPES.find(s => s.key === key);
  window.__h = {
    shape,
    // cells: [[r, c, glaze], ...]; tray: [[key, glaze], ...]
    setup(cells, tray) {
      T.newGame(false);
      T.G.board.fill(0);
      for (const [r, c, g] of cells) T.G.board[r * 8 + c] = g + 1;
      T.G.tray = tray.map(t => (t ? { s: shape(t[0]), color: t[1] } : null));
    },
    state: () => ({ score: T.G.score, lines: T.G.lines, combo: T.G.combo, strips: T.G.strips.slice(), over: T.G.over, moves: T.G.moves, palette: T.G.palette.slice(), tray: T.G.tray.map(t => t && [t.s.key, t.color]) }),
    events: () => { try { return JSON.parse(localStorage.getItem('kiln:events') || '[]'); } catch (e) { return []; } },
    // A board with isolated single holes only (no full row or column), plus one domino-sized gap at row 0.
    deadBoard() {
      const cells = [];
      const hole = (r, c) => c === (3 * r) % 8 || c === (3 * r + 4) % 8 || (r === 0 && c === 1);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (!hole(r, c)) cells.push([r, c, (r + c) % 4]);
      return cells;
    },
  };
})()`;

async function freshPage(browser, opts = {}) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], ...opts });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('console', m => { if (m.type() === 'error') page.__errors.push(m.text()); });
  page.on('pageerror', e => page.__errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/games/tessera/index.html?debug`);
  await page.waitForFunction(() => window.__tessera);
  await page.evaluate(HELPERS);
  return { ctx, page };
}
async function reload(page) {
  await page.reload();
  await page.waitForFunction(() => window.__tessera);
  await page.evaluate(HELPERS);
}

async function rulesTests(browser, errors) {
  console.log('\nRules, persistence and the rose window');
  const { ctx, page } = await freshPage(browser);

  // Palette and trays
  const deal = await page.evaluate(() => {
    const T = window.__tessera, out = [];
    for (let k = 0; k < 40; k++) {
      T.newGame(false);
      const pal = T.G.palette, cols = T.G.tray.map(t => t.color);
      out.push({ pal: pal.length === 4 && new Set(pal).size === 4, cols: new Set(cols).size === 3 && cols.every(c => pal.includes(c)) });
    }
    return out;
  });
  check(deal.every(d => d.pal), 'each run draws 4 distinct glazes');
  check(deal.every(d => d.cols), 'each tray wears 3 distinct glazes from the run palette');

  // Placement and a row clear
  const row = await page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    h.setup([[7, 0, 0], [7, 1, 1], [7, 2, 2], [7, 3, 3], [7, 4, 0], [7, 5, 1]], [['##', 2], ['#', 3], ['#/#', 0]]);
    T.placePiece(1, 0, 0);
    const a = h.state();
    T.placePiece(0, 7, 6);
    return { a, b: h.state(), row7: T.G.board.slice(56) };
  });
  check(row.a.score === 1 && row.a.lines === 0, `a placement scores one point per tile (${row.a.score})`);
  check(row.b.lines === 1 && row.b.score === 1 + 2 + 10 && row.row7.every(v => v === 0), `a full row clears and scores 10 plus tiles (${row.b.score})`);
  check(row.b.strips.length === 1 && row.b.strips[0] === '012301221', `the cleared row is stored left to right with its combo (${row.b.strips[0]})`);

  // Column clear, read top to bottom, and the combo
  const col = await page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    h.setup([[0, 0, 3], [1, 0, 2], [2, 0, 1], [3, 0, 0], [4, 0, 3], [5, 0, 2], [0, 7, 1], [1, 7, 1], [2, 7, 1], [3, 7, 1], [4, 7, 1], [5, 7, 1], [3, 3, 0]], [['#/#', 1], ['#/#', 1], ['#', 2]]);
    T.placePiece(0, 6, 0);
    const a = h.state();
    T.placePiece(1, 6, 7);
    return { a, b: h.state() };
  });
  check(col.a.strips[0] === '321032111', `a cleared column is stored top to bottom (${col.a.strips[0]})`);
  check(col.b.combo === 2 && col.b.score === col.a.score + 2 + 20, `a clear within three moves doubles the line points (combo ${col.b.combo}, +${col.b.score - col.a.score})`);
  check(col.b.strips[1] === '111111112', `a one-glaze line is stored for gold leaf, with combo 2 (${col.b.strips[1]})`);

  // Row and column at once: both strips, sharing the corner glaze
  const both = await page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    const cells = [];
    for (let c = 1; c < 8; c++) cells.push([0, c, c % 4]);
    for (let r = 1; r < 8; r++) cells.push([r, 0, (r + 1) % 4]);
    cells.push([4, 4, 2]); // a stray tile, so the clear is not also Spotless
    h.setup(cells, [['#', 3], ['##', 0], ['##', 1]]);
    T.placePiece(0, 0, 0);
    return h.state();
  });
  check(both.lines === 2 && both.strips.length === 2 && both.strips[0][0] === '3' && both.strips[1][0] === '3' && both.score === 1 + 30,
    `a double clear stores the row then the column and scores 30 (${both.strips.join(',')}, ${both.score})`);

  // Medallion catches up with the strips once the shards land
  await page.waitForTimeout(1900);
  check(await page.evaluate(() => window.__tessera.medalLit() === window.__tessera.G.strips.length), 'the medallion lights a wedge for every stored line');

  // Ring complete at 16 lines
  const ring = await page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    h.setup([[7, 0, 0], [7, 1, 1], [7, 2, 2], [7, 3, 3], [7, 4, 0], [7, 5, 1], [7, 6, 2]], [['#', 2], ['#', 3], ['#', 0]]);
    for (let k = 0; k < 15; k++) T.G.strips.push('012301230');
    T.placePiece(0, 7, 7);
    return T.G.strips.length;
  });
  await page.waitForTimeout(1900);
  const ringEv = await page.evaluate(() => window.__h.events().filter(e => e.ev === 'level_complete'));
  check(ring === 16 && ringEv.some(e => e.ring === 1), 'completing ring 1 (16 lines) is tracked as level_complete');

  // Game over, the firing, and Play again
  await page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    h.setup(h.deadBoard(), [['##', 0], ['###', 1], ['#/#/#', 2]]);
    for (let k = 0; k < 20; k++) T.G.strips.push(k === 3 ? '222222223' : '012301234');
    T.G.score = 777;
    T.placePiece(0, 0, 0);
  });
  const over1 = await page.evaluate(() => ({ over: window.__tessera.G.over, ev: window.__h.events().filter(e => e.ev === 'run_end').pop() }));
  check(over1.over && over1.ev && over1.ev.reason === 'no_room' && over1.ev.score === 779, `the run ends when no piece fits and reports it (${over1.ev && over1.ev.reason}, ${over1.ev && over1.ev.score})`);
  await page.waitForSelector('#over:not([hidden])', { timeout: 4000 });
  const midFire = await page.evaluate(() => window.__tessera.firing());
  check(midFire && !midFire.done, 'the game-over card opens on the firing sequence');
  const againBox = await page.locator('#againBtn').boundingBox();
  const vp = page.viewportSize();
  check(againBox && againBox.y + againBox.height <= vp.height, 'Play again is on screen while the window fires (no scrolling)');
  await page.click('#fire');
  await page.waitForTimeout(400);
  const fireState = await page.evaluate(() => window.__tessera.firing());
  check(fireState.skipped && fireState.shown === 20 && fireState.stamped, 'a tap skips to the finished window and its maker\u2019s mark');
  const title = await page.textContent('#overTitle');
  check(/^[A-Z][a-z]+ & [A-Z][a-z]+, No\. \d+$/.test(title), `the window is named after its glazes (${title})`);
  const wall1 = await page.evaluate(() => ({ wall: window.__tessera.wall(), raw: JSON.parse(localStorage.getItem('kiln:tessera:wall')) }));
  check(wall1.wall.length === 1 && wall1.wall[0].strips.length === 20 && wall1.wall[0].score === 779, 'the fired window is hung on the studio wall');
  check(Object.keys(wall1.raw[0]).sort().join(',') === 'c,d,l,n,p,s,sc' && typeof wall1.raw[0].s === 'string', 'the wall stores strips and numbers only, no images');

  // Save image: 1080x1350 PNG, downloaded where the share sheet is not available
  const dims = await page.evaluate(() => new Promise(res => { const im = new Image(); im.onload = () => res([im.width, im.height]); im.src = window.__tessera.shareImage(); }));
  check(dims[0] === 1080 && dims[1] === 1350, `the share image is 1080x1350 (${dims.join('x')})`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.click('#saveBtn')]);
  check(dl && /^tessera-window-\d+\.png$/.test(dl.suggestedFilename()), `Save image falls back to a PNG download (${dl && dl.suggestedFilename()})`);
  check((await page.evaluate(() => window.__h.events().filter(e => e.ev === 'share').length)) === 1, 'saving the image is tracked as share');

  await page.click('#againBtn');
  const again = await page.evaluate(() => window.__h.state());
  check(!again.over && again.score === 0 && again.strips.length === 0 && (await page.isHidden('#over')), 'Play again starts a fresh run in one tap');

  // Best score persists; a game in progress survives a reload
  await page.evaluate(() => { const h = window.__h, T = window.__tessera; h.setup([[7, 0, 0], [7, 1, 1], [7, 2, 2], [7, 3, 3], [7, 4, 0], [7, 5, 1], [7, 6, 2]], [['#', 2], ['#', 3], ['#', 0]]); T.placePiece(0, 7, 7); });
  const before = await page.evaluate(() => window.__h.state());
  await reload(page);
  const after = await page.evaluate(() => ({ s: window.__h.state(), best: document.getElementById('best').textContent, lit: window.__tessera.medalLit() }));
  check(after.s.score === before.score && after.s.strips.join() === before.strips.join() && after.s.palette.join() === before.palette.join(), 'score, strips and palette survive a reload');
  check(after.lit === before.strips.length, 'the medallion shows the restored window');
  check(after.best === '779', `best score persists (${after.best})`);

  // A save from before the rose window (no palette, no strips) still loads
  // (written from another page on the same origin: the game saves itself when it is unloaded)
  await page.goto(`http://localhost:${PORT}/hub/sdk.js`);
  await page.evaluate(() => {
    const board = new Array(64).fill(0);
    board[0] = 6; board[9] = 5;
    localStorage.setItem('kiln:tessera:game', JSON.stringify({ v: 1, board, vari: new Array(64).fill(0), tray: [[3, 5], [9, 4], [2, 1]], score: 321, combo: 0, since: 9, lines: 4, maxCombo: 1, moves: 12, startBest: 0, over: false }));
  });
  await page.goto(`http://localhost:${PORT}/games/tessera/index.html?debug`);
  await page.waitForFunction(() => window.__tessera);
  await page.evaluate(HELPERS);
  const old = await page.evaluate(() => window.__h.state());
  check(old.score === 321 && old.moves === 12 && old.strips.length === 0, `an old save without the new fields restores (${JSON.stringify(old)})`);
  check(old.palette.length === 4 && new Set(old.palette).size === 4 && [5, 4, 1].every(c => old.palette.includes(c)), `the old save gets a palette that keeps its tray glazes (${old.palette})`);

  // Wall keeps 30 windows and never drops the best one
  const cap = await page.evaluate(() => {
    const T = window.__tessera;
    localStorage.removeItem('kiln:tessera:wall');
    const mk = (no, score) => ({ strips: ['012301230'], palette: [0, 1, 2, 3], no, score, lines: 1, combo: 1, date: '2026-10-09' });
    T.hangWindow(mk(1, 99999));
    for (let k = 2; k <= 36; k++) T.hangWindow(mk(k, k));
    const wall = T.wall();
    return { n: wall.length, best: wall.some(w => w.score === 99999), newest: wall[0].no };
  });
  check(cap.n === 30 && cap.best && cap.newest === 36, `the wall keeps the last 30 windows and the best one (${cap.n}, best kept ${cap.best})`);

  // The studio wall from the pause menu, and the viewer
  await page.click('#menuBtn');
  await page.click('#wallBtn');
  await page.waitForSelector('#wall:not([hidden])');
  await page.waitForTimeout(300);
  const hangs = await page.locator('.hang').count();
  const framed = await page.locator('.hang.top').count();
  check(hangs === 30 && framed === 1, `the studio wall opens from the pause menu with one cobalt-framed best (${hangs}, ${framed})`);
  await page.locator('.hang').first().click();
  await page.waitForSelector('#viewer:not([hidden])');
  await page.click('#viewBack');
  await page.click('#wallClose');
  check(await page.isVisible('#pause') && await page.isHidden('#wall'), 'closing the wall returns to the pause menu');
  await page.click('#resumeBtn');

  // A real mouse drag places a piece
  const dragged = await page.evaluate(() => { const T = window.__tessera; T.newGame(false); return T.G.moves; });
  const L = await page.evaluate(() => window.__tessera.layout());
  const box = await page.locator('#board').boundingBox();
  const s0 = L.slots[0];
  await page.mouse.move(box.x + s0.x + s0.w / 2, box.y + s0.y + s0.h / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + L.gx + 4 * L.cs, box.y + L.gy + 4 * L.cs, { steps: 12 });
  await page.mouse.up();
  check((await page.evaluate(() => window.__tessera.G.moves)) === dragged + 1, 'dragging a tray piece onto the board places it');
  errors.push(...page.__errors);
  await ctx.close();

  // Reduced motion: no flying shards, the firing shows the finished window at once
  const rm = await freshPage(browser, { reducedMotion: 'reduce' });
  await rm.page.evaluate(() => {
    const h = window.__h, T = window.__tessera;
    h.setup([[7, 0, 0], [7, 1, 1], [7, 2, 2], [7, 3, 3], [7, 4, 0], [7, 5, 1], [7, 6, 2]], [['#', 2], ['#', 3], ['#', 0]]);
    T.placePiece(0, 7, 7);
  });
  await rm.page.waitForTimeout(400);
  check(await rm.page.evaluate(() => window.__tessera.medalLit() === 1), 'with reduced motion the wedge lights without a shard flight');
  await rm.page.evaluate(() => { const h = window.__h, T = window.__tessera; h.setup(h.deadBoard(), [['##', 0], ['###', 1], ['#/#/#', 2]]); T.G.strips.push('012301231'); T.placePiece(0, 0, 0); });
  await rm.page.waitForSelector('#over:not([hidden])', { timeout: 4000 });
  await rm.page.waitForTimeout(100);
  const rmFire = await rm.page.evaluate(() => window.__tessera.firing());
  check(rmFire.skipped && rmFire.stamped, 'with reduced motion the firing is a still image');
  errors.push(...rm.page.__errors);
  await rm.ctx.close();
}

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); console.log((ok ? '  ok   ' : '  FAIL ') + what); };

(async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const url = `http://localhost:${PORT}/games/tessera/index.html?debug`;
  await page.goto(url);
  await page.waitForFunction(() => window.__tessera);
  await page.evaluate(BOT_SRC);
  if (TUNE) await page.evaluate(t => Object.assign(window.__tessera.TUNE, JSON.parse(t)), TUNE);

  if (!has('no-sim')) {
    console.log(`\nFairness simulation: ${RUNS} runs per dealer, same seeds, greedy bot`);
    const base = has('fair-only') ? null : await simulate(page, true, RUNS);
    if (base) printSummary(base.summary);
    const fair = await simulate(page, false, RUNS);
    printSummary(fair.summary);
    const s = fair.summary;
    check(s.unplaceableOnGuaranteedTray === 0, `no loss from an unplaceable tray dealt by the guaranteed path (${s.unplaceableOnGuaranteedTray})`);
    check(s.brokenPlans === 0, `every guaranteed tray's placement plan replays cleanly (${s.deals} deals)`);
    check(fair.res.every(r => r.paletteOk), 'every run has a palette of 4 distinct glazes');
    if (base) {
      const ratio = s.lines.median / base.summary.lines.median;
      console.log(`median lines: pre-upgrade ${base.summary.lines.median}, fair ${s.lines.median} (ratio ${ratio.toFixed(3)})`);
      console.log(`median moves: pre-upgrade ${base.summary.moves.median}, fair ${s.moves.median} (ratio ${(s.moves.median / base.summary.moves.median).toFixed(3)})`);
      check(Math.abs(ratio - 1) <= 0.15, 'median run length (lines) within 15% of the pre-upgrade dealer');
      check(base.summary.lossesFromUnplaceableTray > 0, 'the bot does detect unplaceable-tray losses under the old dealer (sanity)');
    }
  }

  if (!has('sim-only')) await rulesTests(browser, errors);

  check(errors.length === 0, 'no console or page errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await browser.close();
  srv.close();
  console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall checks passed');
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
