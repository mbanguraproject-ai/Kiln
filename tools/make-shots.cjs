// Renders each game's store-style screenshots from the real game: games/<id>/shot-1.jpg, shot-2.jpg (phone portrait).
// Unlike the card art, these keep the game's own HUD: they show what the player will actually see. Each game is
// played into the scene by its own engine. No mock scenes (blueprint section 6).
// A game that registers Arcade.scenes({ shot1, shot2 }) is captured generically from ?debug&scene=shot1|shot2;
// the SCENES below drive the older games through their own ?debug hooks until they register scenes too.
// Usage: node tools/make-shots.cjs [--game <id>] [--port 8899]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const PORT = +opt('port', 8899);
const ONLY = opt('game', null);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const VIEWPORT = { width: 360, height: 760 };
const SCALE = 1.5;
const SCENE_MS = 8000;

// Plays Tessera with a simple greedy bot: keep the board as empty as possible.
function tesseraBot(moves) {
  const T = window.__tessera;
  for (let m = 0; m < moves && !T.G.over; m++) {
    let best = null;
    T.G.tray.forEach((t, k) => {
      if (!t) return;
      for (let r = 0; r <= T.N - t.s.h; r++) for (let c = 0; c <= T.N - t.s.wd; c++) {
        if (!T.fits(T.G.board, t.s, r, c)) continue;
        const nb = T.simulate(T.G.board, t.s, r, c);
        const sc = -nb.filter(Boolean).length * 10 - r + ((r * 7 + c * 13 + m) % 5) / 10;
        if (!best || sc > best.sc) best = { k, r, c, sc };
      }
    });
    if (best) T.placePiece(best.k, best.r, best.c);
  }
}

// Each legacy scene runs inside the game page and returns once the frame is worth capturing.
const SCENES = {
  tessera: {
    init: () => { try { localStorage.setItem('kiln:tessera:tutorial', '2'); localStorage.setItem('kiln:tessera:windowTip', 'true'); } catch (e) { /* ignore */ } },
    shots: [
      { run: [tesseraBot.toString(), 'window.__tessera.seed(5); window.__tessera.newGame(false); tesseraBot(30);'], settle: 1600 },
      // The end of a run: the rose window is fired and the summary shows.
      { run: [tesseraBot.toString(), 'window.__tessera.seed(12); window.__tessera.newGame(false); tesseraBot(140); setTimeout(() => window.__tessera.skipFiring(), 1800);'], settle: 3200 },
    ],
  },
  goldmend: {
    bot: 'games/goldmend/bot.js',
    shots: [
      {
        run: [`const g = window.__goldmend; g.skipTutorial(); g.manual(true); g.warp(2);
          const step = window.makeBot({ wobble: 1, seed: 7 });
          for (let i = 0; i < 60 * 7 && g.phase === 'play'; i++) { step(1 / 60); g.advance(1 / 60, 1 / 60, false); }
          g.advance(1 / 60);`],
        settle: 200,
      },
      {
        run: [`const g = window.__goldmend; g.skipTutorial(); g.manual(true); g.warp(5);
          const step = window.makeBot({ wobble: 1, seed: 3 });
          for (let i = 0; i < 60 * 11 && g.phase === 'play'; i++) { step(1 / 60); g.advance(1 / 60, 1 / 60, false); }
          g.advance(1 / 60);`],
        settle: 200,
      },
    ],
  },
  lariat: {
    init: () => { try { localStorage.setItem('kiln:lariat:tutorial', '1'); } catch (e) { /* ignore */ } },
    shots: [
      {
        run: [`const L = window.__lariat, { W, H, U } = L.size;
          L.manual(true); L.seed(9); L.newGame();
          L.trace([{ x: W * 0.5, y: H * 0.8 }], 400);
          L.spawnCluster(W * 0.3, H * 0.35, 5);
          L.trace([{ x: W * 0.3 + 55 * U, y: H * 0.35 }], 450);
          L.circle(W * 0.3, H * 0.35, 55 * U, 450, 1.15);
          L.G.fuse = 1;
          L.spawnCluster(W * 0.7, H * 0.62, 6);
          L.advance(1.2);
          L.trace([{ x: W * 0.7 + 50 * U, y: H * 0.62 }], 500);
          L.circle(W * 0.7, H * 0.62, 50 * U, 500, 0.7);
          L.G.fuse = 0.8;`],
        settle: 120,
      },
      {
        run: [`const L = window.__lariat, { W, H, U } = L.size;
          L.manual(true); L.seed(4); L.newGame();
          L.trace([{ x: W * 0.5, y: H * 0.85 }], 400);
          L.spawnCluster(W * 0.35, H * 0.3, 6);
          L.trace([{ x: W * 0.35 + 60 * U, y: H * 0.3 }], 450);
          L.circle(W * 0.35, H * 0.3, 60 * U, 450, 1.15);
          L.G.fuse = 1;
          L.spawnCluster(W * 0.62, H * 0.55, 5);
          L.trace([{ x: W * 0.62 + 52 * U, y: H * 0.55 }], 480);
          L.circle(W * 0.62, H * 0.55, 52 * U, 480, 1.15);
          L.G.fuse = 1;
          L.spawnCluster(W * 0.3, H * 0.72, 4);
          L.advance(0.9);
          L.G.fuse = 0.55;`],
        settle: 120,
      },
    ],
  },
  crosswake: {
    shots: [
      {
        run: [`const C = window.__crosswake; C.manual(true); C.newRun(); C.startPond(4);
          const s = C.P.solution[0]; C.placeDelay(s.A, s.B, s.delay); C.manual(false);`],
        settle: 700,
      },
      {
        run: [`const C = window.__crosswake; C.manual(true); C.newRun(); C.startPond(7);
          const s = C.P.solution[0]; C.placeDelay(s.A, s.B, s.delay); C.release(); C.advance(1.7);`],
        settle: 120,
      },
    ],
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
  const newCtx = () => browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: 'dark', isMobile: true, hasTouch: true });
  let failed = 0;
  for (const id of ids()) {
    for (let n = 1; n <= 2; n++) {
      const errors = [];
      const out = path.join(ROOT, 'games', id, `shot-${n}.jpg`);
      const ctx = await newCtx();
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const how = await generic(page, `http://localhost:${PORT}/games/${id}/index.html?debug&scene=shot${n}`, out);
      await ctx.close();
      if (how === 'none' && SCENES[id]) {
        // An older game: its own hook, in a fresh page so the capture matches what it always produced.
        const legacy = await newCtx();
        const p = await legacy.newPage();
        p.on('pageerror', e => errors.push(e.message));
        await captureLegacy(p, id, SCENES[id], SCENES[id].shots[n - 1], out);
        await legacy.close();
      } else if (how !== 'done') {
        console.log(`${id} shot-${n}: ${how === 'none' ? 'no scenes registered (Arcade.scenes) and no legacy scene' : how}`);
        failed++;
        continue;
      }
      console.log(`wrote ${path.relative(ROOT, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
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
  await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
  return 'done';
}

async function captureLegacy(page, id, scene, shot, out) {
  if (scene.init) await page.addInitScript(scene.init);
  await page.goto(`http://localhost:${PORT}/games/${id}/index.html?debug`);
  await page.waitForTimeout(700);
  if (scene.bot) await page.addScriptTag({ path: path.join(ROOT, scene.bot) });
  await page.addScriptTag({ content: shot.run.join('\n') });
  await page.waitForTimeout(shot.settle);
  await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
}
