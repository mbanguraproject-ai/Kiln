// Contract checker for one game (docs/GAME_CONTRACT.md): every new game must pass it before it joins Kiln.
// It opens the real page standalone, in key-art mode, in each capture scene and inside the hub, drives it
// through its ?debug test hook (Arcade.test) and scripted input, and prints one PASS/FAIL/WARN/SKIP line per
// check. Screenshots of every step go to --out so a reviewer can look at what was checked.
// Usage: node tools/game-check.cjs --game <id> [--port 8880] [--out /tmp/kiln-check/<id>] [--json] [--legacy]
//   --json    print only the JSON summary on stdout (the lines go to stderr)
//   --legacy  for games that predate Arcade.test/Arcade.scenes: those checks SKIP instead of FAIL
// Exit code 1 when any check fails. Playwright on NODE_PATH.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const ID = opt('game', null);
const PORT = +opt('port', 8880);
const JSON_OUT = args.includes('--json');
const LEGACY = args.includes('--legacy');
if (!ID || !/^[\w-]+$/.test(ID)) { console.error('usage: node tools/game-check.cjs --game <id> [--port n] [--out dir] [--json] [--legacy]'); process.exit(2); }
const OUT = path.resolve(opt('out', path.join('/tmp/kiln-check', ID)));
const BASE = `http://localhost:${PORT}`;
const GAME_URL = `${BASE}/games/${ID}/index.html`;

// Generous on purpose: the check runs next to other browsers on busy machines and must not flake.
const READY_MS = 4000;
const SCENE_MS = 8000;
const LAUNCH_MS = 12000;
const VIEWPORTS = [[320, 560], [390, 844], [768, 1024], [1280, 800]];
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX'];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
function serve() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.on('error', reject);
    srv.listen(PORT, () => resolve(srv));
  });
}

// Deterministic input: the same seed gives the same taps, drags and keys on every run.
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const results = [];
const errors = [];
let shotNo = 0;
const log = JSON_OUT ? (...a) => console.error(...a) : (...a) => console.log(...a);

async function shoot(page, name) {
  const file = `${String(++shotNo).padStart(2, '0')}-${name}.png`;
  const buf = await page.screenshot({ path: path.join(OUT, file) });
  return { file, buf };
}

// Runs one check. Any console or page error raised while it runs fails it, whatever it found itself.
async function check(name, fn) {
  const mark = errors.length;
  let r;
  try { r = await fn(); } catch (e) { r = { status: 'FAIL', detail: 'threw: ' + e.message.split('\n')[0] }; }
  const fresh = errors.slice(mark);
  if (fresh.length && r.status !== 'SKIP') {
    r.status = 'FAIL';
    r.detail = [r.detail, `${fresh.length} error(s): ${fresh.slice(0, 3).join(' | ')}`].filter(Boolean).join('; ');
  }
  const row = { name, status: r.status, detail: r.detail || '' };
  if (r.shot) row.shot = r.shot;
  if (r.data) row.data = r.data;
  results.push(row);
  log(`${r.status.padEnd(4)}  ${name.padEnd(18)} ${row.detail}${r.shot ? `  [${r.shot}]` : ''}`);
  return r;
}

const skip = why => ({ status: 'SKIP', detail: why });
const legacyOr = why => (LEGACY ? skip(why + ' (legacy)') : { status: 'FAIL', detail: why });

function watch(page, where) {
  page.on('console', m => { if (m.type() === 'error') errors.push(`${where} console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => errors.push(`${where} page error: ${e.message.split('\n')[0].slice(0, 200)}`));
}

async function newPage(browser, vp, scale, where) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: scale, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  // Fonts are not part of the check; answer them empty so a missing network is not reported as an error.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  watch(page, where);
  return page;
}

const waitReady = (page, ms = READY_MS) => page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: ms }).then(() => true, () => false);
const hasHook = page => page.evaluate(() => {
  const t = window.__kilnTest;
  return !!t && ['start', 'lose', 'state'].every(k => typeof t[k] === 'function');
});
const getState = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__kilnTest.state())));
const callHook = (page, name) => page.evaluate(async n => { await window.__kilnTest[n](); }, name);
const gameEvents = page => page.evaluate(id => window.Arcade._log.all().filter(e => e.game === id), ID);
const sleep = (page, ms) => page.waitForTimeout(ms);

// Polls fn until it returns something truthy or ms passes.
async function poll(page, ms, fn) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v || Date.now() - t0 > ms) return v;
    await sleep(page, 100);
  }
}

// Counts distinct colours in a downscaled screenshot: a blank or single-colour screen means nothing was drawn.
let helper;
async function colours(buf) {
  return helper.evaluate(async b64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data, seen = new Set();
    for (let i = 0; i < d.length; i += 4) seen.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4);
    return seen.size;
  }, buf.toString('base64'));
}
const BLANK = 4;

// Visible DOM text and buttons inside the viewport: key art must show only the play surface.
const overlays = page => page.evaluate(() => {
  const shown = el => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const inView = r => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  const found = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.trim();
    if (!t || !n.parentElement || !shown(n.parentElement)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    if (inView(range.getBoundingClientRect())) found.push(JSON.stringify(t.slice(0, 30)));
  }
  for (const b of document.querySelectorAll('button, [role="button"], input, select')) {
    if (shown(b) && inView(b.getBoundingClientRect()) && !b.textContent.trim()) found.push(`<${b.tagName.toLowerCase()}${b.id ? '#' + b.id : ''}>`);
  }
  return found;
});

// The biggest canvas on the page, how much of the viewport it covers, and its backing-store sharpness.
// Measured against the device viewport, not innerWidth: a mobile browser widens innerWidth to fit overflowing content.
const layout = (page, [vw, vh]) => page.evaluate(([vw, vh]) => {
  const de = document.documentElement;
  const overflowX = Math.max(de.scrollWidth, document.body.scrollWidth) - vw;
  const overflowY = Math.max(de.scrollHeight, document.body.scrollHeight) - vh;
  let best = null;
  for (const c of document.querySelectorAll('canvas')) {
    const r = c.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (!best || w * h > best.w * best.h) best = { w, h, sharp: r.width ? c.width / (r.width * Math.min(devicePixelRatio, 2)) : 0 };
  }
  return { overflowX, overflowY, vw, vh, canvas: best };
}, [vw, vh]);

// ~4 s of a player mashing: touch taps, touch drags (real touch events through CDP), mouse drags and keys.
async function fuzz(page, ms, restart) {
  const rnd = mulberry32(1);
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize();
  const pt = () => ({ x: Math.round(vp.width * (0.1 + rnd() * 0.8)), y: Math.round(vp.height * (0.15 + rnd() * 0.75)) });
  const n = { taps: 0, swipes: 0, drags: 0, keys: 0, restarts: 0 };
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const k = rnd();
    if (k < 0.3) {
      const p = pt();
      await page.touchscreen.tap(p.x, p.y);
      n.taps++;
    } else if (k < 0.5) {
      const a = pt(), b = pt();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 }] });
        await sleep(page, 16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      n.swipes++;
    } else if (k < 0.65) {
      const a = pt(), b = pt();
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 10 });
      await page.mouse.up();
      n.drags++;
    } else {
      const key = KEYS[Math.floor(rnd() * KEYS.length)];
      await page.keyboard.down(key);
      await sleep(page, 40 + Math.floor(rnd() * 200));
      await page.keyboard.up(key);
      n.keys++;
    }
    await sleep(page, 40 + Math.floor(rnd() * 100));
    if (restart && await restart()) n.restarts++;
  }
  await cdp.detach();
  return n;
}

// Frame cadence over ms of play, from requestAnimationFrame timestamps, plus main-thread long tasks.
// With a test hook, frames on the title, the pause menu or the game-over screen do not count: a run that
// ends (an idle player dies) is restarted at once and the frame after the restart is left out, so the
// sample measures gameplay. Other phases a game defines (a countdown, a level banner) count as play.
const frameTimes = (page, ms, hook) => page.evaluate(([ms, hook]) => new Promise(resolve => {
  const deltas = [], away = ['title', 'paused', 'over'];
  let long = 0, last = 0, t0 = 0, frames = 0, restarts = 0, skip = false, lastStart = -1e9;
  const obs = typeof PerformanceObserver === 'function' ? new PerformanceObserver(l => { long += l.getEntries().length; }) : null;
  try { obs && obs.observe({ type: 'longtask' }); } catch (e) { /* not supported */ }
  requestAnimationFrame(function frame(t) {
    if (t0) {
      frames++;
      const s = hook ? window.__kilnTest.state() : null;
      const play = !s || !(s.paused || away.includes(s.phase));
      if (play && !skip) deltas.push(t - last);
      skip = !play;
      if (!play && t - lastStart > 300) { lastStart = t; restarts++; Promise.resolve(window.__kilnTest.start()).catch(() => {}); }
    } else t0 = t;
    last = t;
    if (t - t0 < ms) requestAnimationFrame(frame);
    else { if (obs) obs.disconnect(); resolve({ deltas, long, frames, restarts }); }
  });
}), [ms, hook]);

// A downscaled copy of the biggest canvas (the play surface without any DOM on top), for telling a
// moving scene from a still one. null when it cannot be read.
const canvasSig = page => page.evaluate(() => {
  let best = null;
  for (const c of document.querySelectorAll('canvas')) if (!best || c.width * c.height > best.width * best.height) best = c;
  if (!best || !best.width) return null;
  try {
    const s = document.createElement('canvas');
    s.width = s.height = 96;
    s.getContext('2d').drawImage(best, 0, 0, 96, 96);
    return s.toDataURL();
  } catch (e) { return null; }
});

// Text drawn on a visible canvas in key art is a HUD left on (score, level, hints). Kit.gfx.text with
// { world: true } and the kit's particle glyphs are part of the world and do not count; offscreen sprite
// canvases do not count either.
function probeCanvasText(page) {
  return page.addInitScript(() => {
    window.__kilnCanvasText = [];
    for (const m of ['fillText', 'strokeText']) {
      const orig = CanvasRenderingContext2D.prototype[m];
      CanvasRenderingContext2D.prototype[m] = function (str, ...rest) {
        try {
          const t = String(str).trim(), seen = window.__kilnCanvasText;
          if (t && this.canvas.isConnected && !(window.Kit && window.Kit._worldText) && seen.length < 50 && !seen.includes(t)) seen.push(t.slice(0, 24));
        } catch (e) { /* never break the game */ }
        return orig.call(this, str, ...rest);
      };
    }
  });
}
const canvasText = page => page.evaluate(() => window.__kilnCanvasText || []);

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'games', ID, 'index.html'))) { console.error(`games/${ID}/index.html not found`); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^\d\d-.*\.png$|^summary\.json$/.test(f)) fs.rmSync(path.join(OUT, f));
  const srv = await serve();
  const browser = await chromium.launch();
  helper = await (await browser.newContext()).newPage();
  log(`game-check ${ID}${LEGACY ? ' (legacy)' : ''}: screenshots in ${OUT}`);

  /* ---------- standalone, as a player opens it ---------- */
  const page = await newPage(browser, [390, 844], 2, 'standalone');
  let ready = false, hook = false;
  const frame = {};

  await check('load', async () => {
    const res = await page.goto(GAME_URL + '?debug', { waitUntil: 'load' });
    if (!res || !res.ok()) return { status: 'FAIL', detail: `HTTP ${res ? res.status() : 'no response'}` };
    return { status: 'PASS', detail: `games/${ID}/index.html loaded` };
  });

  await check('ready', async () => {
    const t0 = Date.now();
    ready = await waitReady(page);
    if (!ready) return { status: 'FAIL', detail: `Arcade.ready() not called within ${READY_MS} ms (dataset.kilnReady unset)` };
    const ms = Date.now() - t0;
    const opened = await poll(page, 1000, async () => (await gameEvents(page)).some(e => e.ev === 'game_open'));
    if (!opened) return { status: 'FAIL', detail: `no game_open event for '${ID}': Arcade.init({ id: '${ID}' }) must use the folder name` };
    return { status: 'PASS', detail: `ready after ~${ms} ms` };
  });

  await check('first frame', async () => {
    await sleep(page, 500);
    const s = await shoot(page, 'first-frame');
    const n = await colours(s.buf);
    if (n < BLANK) return { status: 'FAIL', detail: `screen is blank (${n} colours)`, shot: s.file };
    // The title must sit over a live board, a demo state or an attract animation, not a still backdrop.
    const a = await canvasSig(page);
    await sleep(page, 1000);
    const b = await canvasSig(page);
    if (a && a === b) return { status: 'WARN', detail: `${n} colours, but the play surface stood still for 1 s on the title (run an attract mode behind it)`, shot: s.file };
    return { status: 'PASS', detail: `${n} colours on screen${a ? ', play surface moving' : ''}`, shot: s.file };
  });

  await check('test hook', async () => {
    if (!ready) return skip('game never became ready');
    hook = await hasHook(page);
    if (!hook) return legacyOr('window.__kilnTest with start/lose/state missing (Arcade.test, ?debug)');
    const s = await getState(page);
    const bad = [typeof s.phase !== 'string' && 'phase', !(typeof s.score === 'number' && isFinite(s.score)) && 'score', typeof s.paused !== 'boolean' && 'paused'].filter(Boolean);
    if (bad.length) { hook = false; return { status: 'FAIL', detail: `state() has bad ${bad.join(', ')}: ${JSON.stringify(s)}` }; }
    return { status: 'PASS', detail: `state() ${JSON.stringify(s)}` };
  });

  // Starts a run unless one is in play, so each check below begins from live play.
  const ensurePlay = async () => {
    if ((await getState(page)).phase === 'play') return;
    await callHook(page, 'start');
    await poll(page, 2000, async () => (await getState(page)).phase === 'play');
  };

  await check('start', async () => {
    if (!hook) return skip('no test hook');
    const before = (await gameEvents(page)).filter(e => e.ev === 'run_start').length;
    await callHook(page, 'start');
    const started = await poll(page, 3000, async () => (await gameEvents(page)).filter(e => e.ev === 'run_start').length > before);
    await sleep(page, 400);
    const s = await getState(page);
    const shot = (await shoot(page, 'start')).file;
    if (!started) return { status: 'FAIL', detail: 'start() logged no run_start (call Arcade.runStart when play begins)', shot };
    if (s.phase !== 'play') return { status: 'WARN', detail: `run_start logged but state().phase is '${s.phase}', expected 'play'`, shot };
    return { status: 'PASS', detail: `run_start logged, phase '${s.phase}'`, shot };
  });

  await check('input', async () => {
    if (!ready) return skip('game never became ready');
    // A run that ends, or a pause menu opened by a stray tap, is replaced by a fresh run, so most of the
    // input lands on live play.
    const restart = hook ? async () => {
      const s = await getState(page);
      if (!s.paused && !['over', 'paused', 'title'].includes(s.phase)) return false;
      await callHook(page, 'start');
      return true;
    } : null;
    const n = await fuzz(page, 4000, restart);
    const s = await shoot(page, 'input');
    const c = await colours(s.buf);
    const detail = `${n.taps} taps, ${n.swipes} touch swipes, ${n.drags} mouse drags, ${n.keys} keys${n.restarts ? `, ${n.restarts} restarts` : ''}${hook ? `, phase '${(await getState(page)).phase}'` : ''}`;
    if (c < BLANK) return { status: 'FAIL', detail: `screen went blank (${c} colours) after ${detail}`, shot: s.file };
    return { status: 'PASS', detail, shot: s.file };
  });

  await check('frame time', async () => {
    if (!ready) return skip('game never became ready');
    const sample = async () => {
      if (hook) { await callHook(page, 'start'); await sleep(page, 300); }
      const r = await frameTimes(page, 3000, hook);
      const sorted = r.deltas.slice().sort((a, b) => a - b);
      r.avg = r.deltas.reduce((a, b) => a + b, 0) / (r.deltas.length || 1);
      r.p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : Infinity;
      return r;
    };
    // Timing is noisy on a shared machine: an over-budget sample is taken again and the better one kept.
    let r = await sample(), samples = 1;
    if (r.p95 > 25 && r.deltas.length >= 10) {
      const again = await sample();
      samples = 2;
      if (again.p95 < r.p95) r = again;
    }
    const shot = (await shoot(page, 'frame-time')).file;
    if (r.deltas.length < 10) return { status: 'FAIL', detail: `only ${r.deltas.length} frames of play in 3 s${r.restarts ? ` (${r.restarts} frames outside play)` : ''}`, shot };
    const playShare = Math.round(r.deltas.length / r.frames * 100);
    Object.assign(frame, { avg: +r.avg.toFixed(1), p95: +r.p95.toFixed(1), frames: r.deltas.length, longTasks: r.long, playShare, samples });
    const detail = `avg ${frame.avg} ms, p95 ${frame.p95} ms over ${r.deltas.length} frames of play, ${r.long} long tasks` +
      (hook ? `, ${playShare}% of frames in play` : '') + (samples > 1 ? ', better of 2 samples' : '');
    let status = r.p95 > 60 ? 'FAIL' : r.p95 > 25 ? 'WARN' : 'PASS';
    if (status === 'PASS' && playShare < 80) return { status: 'WARN', detail: `runs kept ending without input, so the sample is thin: ${detail}`, shot, data: frame };
    return { status, detail, shot, data: frame };
  });

  await check('lose', async () => {
    if (!hook) return skip('no test hook');
    await ensurePlay();
    const s0 = await getState(page);
    const before = (await gameEvents(page)).filter(e => e.ev === 'run_end').length;
    await callHook(page, 'lose');
    const end = await poll(page, 3000, async () => (await gameEvents(page)).filter(e => e.ev === 'run_end')[before]);
    await sleep(page, 900);
    const s1 = await getState(page);
    const shot = (await shoot(page, 'lose')).file;
    if (!end) return { status: 'FAIL', detail: 'lose() logged no run_end (call Arcade.runEnd with a score)', shot };
    if (!(typeof end.score === 'number' && isFinite(end.score))) return { status: 'FAIL', detail: `run_end has no numeric score: ${JSON.stringify(end)}`, shot };
    if (s1.phase === s0.phase) return { status: 'FAIL', detail: `state().phase stayed '${s0.phase}' after lose()`, shot };
    return { status: 'PASS', detail: `run_end score ${end.score}${end.reason ? `, reason '${end.reason}'` : ''}; phase '${s0.phase}' -> '${s1.phase}'`, shot };
  });

  await check('pause', async () => {
    if (!hook) return skip('no test hook');
    await ensurePlay();
    await sleep(page, 200);
    // A game that ends a run quickly without input gets a fresh one, so the pause lands on live play.
    if ((await getState(page)).phase !== 'play') await callHook(page, 'start');
    // The hub's pause message, delivered the way the SDK accepts it (a standalone page is its own parent).
    await page.evaluate(() => window.postMessage({ kiln: 1, type: 'pause' }, '*'));
    await sleep(page, 500);
    const s = await getState(page);
    const a = await shoot(page, 'pause');
    if (s.paused) {
      // The flag alone is not enough: the game behind the pause menu must really stand still. The loop's
      // update count (state().frame, from the kit's shell) says so directly; otherwise the play surface must not change.
      const sig0 = await canvasSig(page);
      await sleep(page, 600);
      const s2 = await getState(page);
      if (typeof s.frame === 'number' && typeof s2.frame === 'number') {
        if (s2.frame !== s.frame) return { status: 'FAIL', detail: `state().paused is true but the game kept updating (frame ${s.frame} -> ${s2.frame} in 600 ms)`, shot: a.file };
        return { status: 'PASS', detail: `paused, phase '${s.phase}', no updates for 600 ms`, shot: a.file };
      }
      const sig1 = await canvasSig(page);
      if (sig0 && sig1 && sig0 !== sig1) return { status: 'FAIL', detail: 'state().paused is true but the play surface keeps changing behind the pause menu', shot: a.file };
      return { status: 'PASS', detail: `paused, phase '${s.phase}'${sig0 ? ', play surface still' : ''}`, shot: a.file };
    }
    if (await page.evaluate(() => window.__kilnTest.turnBased === true)) return { status: 'WARN', detail: `paused:false after pause; game declares turnBased`, shot: a.file };
    // Undeclared: a turn-based game with a still screen is reported, a game that keeps moving fails.
    await sleep(page, 700);
    const b = await page.screenshot();
    if (Buffer.compare(a.buf, b) === 0) return { status: 'WARN', detail: `paused:false but nothing moves (turn-based? declare turnBased: true in Arcade.test)`, shot: a.file };
    return { status: 'FAIL', detail: `still running after the hub's pause message (state().paused false, screen changing)`, shot: a.file };
  });
  await page.context().close();

  /* ---------- layouts ---------- */
  for (const vp of VIEWPORTS) {
    await check(`layout ${vp[0]}x${vp[1]}`, async () => {
      const p = await newPage(browser, vp, 2, `${vp[0]}x${vp[1]}`);
      try {
        await p.goto(GAME_URL + '?debug');
        if (!await waitReady(p)) return { status: 'FAIL', detail: 'not ready' };
        if (await hasHook(p)) await callHook(p, 'start');
        await sleep(p, 700);
        const L = await layout(p, vp);
        const shot = (await shoot(p, `layout-${vp[0]}x${vp[1]}`)).file;
        const c = L.canvas;
        const fill = c ? Math.round(c.w * c.h / (L.vw * L.vh) * 100) : 0;
        const detail = `canvas covers ${fill}% (${c ? `${Math.round(c.w)}x${Math.round(c.h)}` : 'no canvas'}), overflow x ${L.overflowX}px y ${L.overflowY}px`;
        if (L.overflowX > 1) return { status: 'FAIL', detail: 'horizontal overflow: ' + detail, shot };
        const fills = c && c.w >= L.vw * 0.98 && fill >= 90;
        if (!fills) return { status: LEGACY ? 'WARN' : 'FAIL', detail: 'canvas does not fill the viewport: ' + detail, shot };
        if (L.overflowY > 1) return { status: 'WARN', detail: 'page scrolls vertically: ' + detail, shot };
        if (c.sharp < 0.9) return { status: 'WARN', detail: `canvas backing store is blurry (${c.sharp.toFixed(2)}x of CSS size * dpr): ` + detail, shot };
        return { status: 'PASS', detail, shot };
      } finally { await p.context().close(); }
    });
  }

  /* ---------- key art ---------- */
  await check('keyart', async () => {
    const p = await newPage(browser, [800, 450], 1, 'keyart');
    try {
      await probeCanvasText(p);
      await p.goto(GAME_URL + '?keyart');
      if (!await waitReady(p)) return { status: 'FAIL', detail: 'not ready in ?keyart' };
      await sleep(p, 700);
      const s = await shoot(p, 'keyart');
      const found = await overlays(p);
      if (found.length) return { status: 'FAIL', detail: `visible overlays in ?keyart: ${found.slice(0, 6).join(', ')}`, shot: s.file };
      const drawn = await canvasText(p);
      if (drawn.length) return { status: 'FAIL', detail: `HUD text drawn on the canvas in ?keyart: ${drawn.slice(0, 6).map(t => JSON.stringify(t)).join(', ')} (skip the HUD when Kit.keyart; in-world text: Kit.gfx.text(..., { world: true }))`, shot: s.file };
      const n = await colours(s.buf);
      if (n < BLANK) return { status: 'FAIL', detail: `key-art screen is blank (${n} colours)`, shot: s.file };
      return { status: 'PASS', detail: 'no text or controls over the play surface', shot: s.file };
    } finally { await p.context().close(); }
  });

  /* ---------- capture scenes (tools/make-art.cjs, tools/make-shots.cjs) ---------- */
  const SCENES = [['art', [800, 450], '?debug&keyart&scene=art'], ['shot1', [360, 760], '?debug&scene=shot1'], ['shot2', [360, 760], '?debug&scene=shot2']];
  for (const [name, vp, query] of SCENES) {
    await check(`scene ${name}`, async () => {
      const p = await newPage(browser, vp, 1, `scene ${name}`);
      try {
        if (name === 'art') await probeCanvasText(p);
        await p.goto(GAME_URL + query);
        if (!await waitReady(p)) return { status: 'FAIL', detail: 'not ready' };
        // Scenes are registered before Arcade.ready(), as the capture tools expect.
        if (!(await p.evaluate(() => window.Arcade._scenes().length))) return legacyOr('no capture scenes registered before Arcade.ready() (Arcade.scenes({ art, shot1, shot2 }))');
        const t0 = Date.now();
        const done = await p.waitForFunction(() => document.documentElement.dataset.sceneDone || null, null, { timeout: SCENE_MS }).then(h => h.jsonValue(), () => null);
        await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const s = await shoot(p, `scene-${name}`);
        if (!done) return { status: 'FAIL', detail: `scene '${name}' did not finish within ${SCENE_MS} ms`, shot: s.file };
        if (done !== '1') return { status: 'FAIL', detail: `scene '${name}' failed: ${await p.evaluate(() => document.documentElement.dataset.sceneError)}`, shot: s.file };
        const ms = Date.now() - t0;
        if (name === 'art') {
          const found = await overlays(p);
          if (found.length) return { status: 'FAIL', detail: `visible overlays in the art scene: ${found.slice(0, 6).join(', ')}`, shot: s.file };
          const drawn = await canvasText(p);
          if (drawn.length) return { status: 'FAIL', detail: `HUD text drawn on the canvas in the art scene: ${drawn.slice(0, 6).map(t => JSON.stringify(t)).join(', ')} (skip the HUD when Kit.keyart; in-world text: Kit.gfx.text(..., { world: true }))`, shot: s.file };
        }
        const n = await colours(s.buf);
        if (n < BLANK) return { status: 'FAIL', detail: `scene is blank (${n} colours)`, shot: s.file };
        // A run that ends inside the scene opens the game-over panel a moment later, over the capture.
        if (await hasHook(p)) {
          await sleep(p, 900);
          const st = await getState(p);
          if (st.phase === 'over') return { status: 'FAIL', detail: `the run ended during the scene (phase 'over' after it finished): keep the run alive while a scene runs`, shot: s.file };
        }
        return { status: 'PASS', detail: `done in ~${ms} ms`, shot: s.file };
      } finally { await p.context().close(); }
    });
  }

  /* ---------- embedded in the hub ---------- */
  await check('embedded', async () => {
    const p = await newPage(browser, [412, 915], 2, 'hub');
    try {
      // A game not in the registry yet gets a temporary entry, so it can be checked before it is listed.
      await p.route(/\/games\/registry\.js$/, async route => {
        const res = await route.fetch();
        const entry = { id: ID, title: ID, pitch: '', genre: 'Arcade', mechanics: [], moods: [], accent: '--g1', status: 'beta', path: `games/${ID}/index.html`, added: '2000-01-01', about: '', controls: 'Touch', saves: 'best' };
        const patch = `\n;(function(){var L=window.KILN_GAMES,g=L.filter(function(x){return x.id===${JSON.stringify(ID)};})[0];window.__checkInjected=!g;if(!g)L.push(${JSON.stringify(entry)});else if(g.status==='soon')g.status='beta';})();\n`;
        await route.fulfill({ response: res, body: (await res.text()) + patch });
      });
      await p.goto(`${BASE}/index.html?debug#${ID}`);
      const events = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('kiln:events') || '[]'); } catch (e) { return []; } });
      const result = await poll(p, LAUNCH_MS, async () => (await events()).find(e => e.ev === 'launch_result' && e.game === ID));
      await sleep(p, 800);
      const shot = (await shoot(p, 'embedded')).file;
      const injected = await p.evaluate(() => window.__checkInjected);
      const note = injected ? ' (not in the registry: checked with a temporary entry)' : '';
      if (!result) return { status: 'FAIL', detail: `no launch_result within ${LAUNCH_MS} ms of opening index.html?debug#${ID}${note}`, shot };
      if (!result.ok) return { status: 'FAIL', detail: `launch_result ok:false (${result.reason || 'no reason'})${note}`, shot };
      if (!(await events()).some(e => e.ev === 'game_open' && e.game === ID)) return { status: 'FAIL', detail: 'launched but no game_open from the game' + note, shot };
      return { status: 'PASS', detail: `launch_result ok in ${result.ms} ms${note}`, shot };
    } finally { await p.context().close(); }
  });

  await browser.close();
  srv.close();
  const count = s => results.filter(r => r.status === s).length;
  const summary = { game: ID, legacy: LEGACY, ok: count('FAIL') === 0, pass: count('PASS'), warn: count('WARN'), skip: count('SKIP'), fail: count('FAIL'), frame, out: OUT, checks: results };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  log(`${summary.ok ? 'OK' : 'FAILED'}: ${summary.pass} pass, ${summary.warn} warn, ${summary.skip} skip, ${summary.fail} fail`);
  if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
