// Renders each game's card art from the real game: games/<id>/art-wide.jpg (16:9) and art-tall.jpg (4:5).
// Each game is opened in key-art mode (?keyart hides its controls), played into a representative scene by
// its own engine, and screenshotted. No mock scenes (blueprint section 5).
// A game that registers Arcade.scenes({ art }) is captured generically from ?debug&keyart&scene=art; the
// SCENES below drive the older games through their own ?debug hooks until they register scenes too.
// Usage: node tools/make-art.cjs [--game <id>] [--port 8898]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const PORT = +opt('port', 8898);
const ONLY = opt('game', null);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const SCENE_MS = 8000;
const SIZES = { wide: { width: 800, height: 450 }, tall: { width: 400, height: 500 } };

// Legacy scenes run inside the game page. Each returns once the frame is worth capturing.
const SCENES = {
  tessera: {
    run: () => {
      const T = window.__tessera;
      T.seed(5);
      T.newGame(false);
      for (let m = 0; m < 26 && !T.G.over; m++) {
        let best = null;
        T.G.tray.forEach((t, k) => {
          if (!t) return;
          for (let r = 0; r <= 8 - t.s.h; r++) for (let c = 0; c <= 8 - t.s.wd; c++) {
            if (!T.fits(T.G.board, t.s, r, c)) continue;
            const nb = T.simulate(T.G.board, t.s, r, c);
            const sc = -nb.filter(Boolean).length * 10 - r + ((r * 7 + c * 13 + m) % 5) / 10;
            if (!best || sc > best.sc) best = { k, r, c, sc };
          }
        });
        if (best) T.placePiece(best.k, best.r, best.c);
      }
    },
    settle: 1600,
  },
  goldmend: {
    bot: 'games/goldmend/bot.js',
    run: () => {
      const g = window.__goldmend;
      g.skipTutorial();
      g.manual(true);
      g.warp(3);
      const step = window.makeBot({ wobble: 1, seed: 11 });
      for (let i = 0; i < 60 * 9 && g.phase === 'play'; i++) { step(1 / 60); g.advance(1 / 60, 1 / 60, false); }
      for (let i = 0; i < 40 && g.phase === 'play'; i++) { step(1 / 60); g.advance(1 / 60, 1 / 60, false); }
      g.advance(1 / 60);
    },
    settle: 200,
  },
  lariat: {
    init: () => { try { localStorage.setItem('kiln:lariat:tutorial', '1'); } catch (e) { /* ignore */ } },
    run: () => {
      const L = window.__lariat, { W, H, U } = L.size;
      L.manual(true);
      L.seed(9);
      L.newGame();
      L.trace([{ x: W * 0.5, y: H * 0.8 }], 400);
      L.spawnCluster(W * 0.3, H * 0.35, 5);
      L.trace([{ x: W * 0.3 + 55 * U, y: H * 0.35 }], 450);
      L.circle(W * 0.3, H * 0.35, 55 * U, 450, 1.15);
      L.G.fuse = 1;
      L.spawnCluster(W * 0.72, H * 0.4, 4);
      L.spawnCluster(W * 0.62, H * 0.75, 6);
      L.advance(1.4);
      L.trace([{ x: W * 0.62 + 50 * U, y: H * 0.75 }], 500);
      L.circle(W * 0.62, H * 0.75, 50 * U, 500, 1.15);
      L.G.fuse = 1;
      L.advance(1.1);
      // An open rope mid-draw: an arc that does not close.
      const cx = W * 0.74, cy = H * 0.36, r = 46 * U, pts = [];
      for (let i = 0; i <= 18; i++) { const a = Math.PI * (0.15 + i * 0.075); pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
      // Start the rope fresh at the arc, so no travel line shows.
      L.G.spark.x = pts[0].x; L.G.spark.y = pts[0].y; L.G.spark.vx = L.G.spark.vy = 0; L.G.rope.length = 0;
      L.trace(pts, 420);
      L.G.fuse = 1;
    },
    settle: 100,
  },
  crosswake: {
    run: () => {
      const C = window.__crosswake;
      C.manual(true);
      C.newRun();
      C.startPond(6);
      const s = C.P.solution[0];
      C.placeDelay(s.A, s.B, s.delay);
      C.release();
      C.advance(1.55);
    },
    settle: 100,
  },
};

(async () => {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(PORT);
  const browser = await chromium.launch();
  let failed = 0;
  for (const id of ids()) {
    for (const [name, vp] of Object.entries(SIZES)) {
      const newCtx = () => browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
      const errors = [];
      const out = path.join(ROOT, 'games', id, `art-${name}.jpg`);
      const ctx = await newCtx();
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const how = await generic(page, `http://localhost:${PORT}/games/${id}/index.html?debug&keyart&scene=art`, out);
      await ctx.close();
      if (how === 'none' && SCENES[id]) {
        // An older game: its own hook, in a fresh page so the capture matches what it always produced.
        const legacy = await newCtx();
        const p = await legacy.newPage();
        p.on('pageerror', e => errors.push(e.message));
        await captureLegacy(p, id, SCENES[id], out);
        await legacy.close();
      } else if (how !== 'done') {
        console.log(`${id} art-${name}: ${how === 'none' ? 'no scenes registered (Arcade.scenes) and no legacy scene' : how}`);
        failed++;
        continue;
      }
      console.log(`wrote ${path.relative(ROOT, out)}${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
    }
  }
  await browser.close();
  srv.close();
  process.exit(failed ? 1 : 0);
})();

// Playable games from the registry, or just --game.
function ids() {
  if (ONLY) return [ONLY];
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'games/registry.js'), 'utf8'), sandbox);
  return sandbox.window.KILN_GAMES.filter(g => g.status !== 'soon').map(g => g.id);
}

// Lets the SDK run the game's registered scene and captures it. Returns 'done', 'none' (no scenes registered
// before Arcade.ready()) or why it failed.
async function generic(page, url, out) {
  await page.goto(url);
  const ready = await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: SCENE_MS }).then(() => true, () => false);
  if (!ready) return 'never called Arcade.ready()';
  const done = await page.waitForFunction(() => document.documentElement.dataset.sceneDone || !window.Arcade._scenes().length, null, { timeout: SCENE_MS })
    .then(() => page.evaluate(() => document.documentElement.dataset.sceneDone || 'none'), () => `scene did not finish within ${SCENE_MS} ms`);
  if (done === 'error') return 'scene failed: ' + await page.evaluate(() => document.documentElement.dataset.sceneError);
  if (done !== '1') return done;
  // Two frames, so whatever the scene set up is on screen.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: out, type: 'jpeg', quality: 80 });
  return 'done';
}

async function captureLegacy(page, id, scene, out) {
  if (scene.init) await page.addInitScript(scene.init);
  await page.goto(`http://localhost:${PORT}/games/${id}/index.html?debug&keyart`);
  await page.waitForTimeout(700);
  if (scene.bot) await page.addScriptTag({ path: path.join(ROOT, scene.bot) });
  await page.evaluate(scene.run);
  await page.waitForTimeout(scene.settle);
  await page.screenshot({ path: out, type: 'jpeg', quality: 80 });
}
