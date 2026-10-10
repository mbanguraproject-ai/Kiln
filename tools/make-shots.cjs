// Renders each game's store-style screenshots from the real game: games/<id>/shot-1.jpg, shot-2.jpg (phone portrait).
// Unlike the card art, these keep the game's own HUD: they show what the player will actually see. Each game is
// played into the scene by its own engine through its ?debug hook. No mock scenes (blueprint section 6).
// Usage: node tools/make-shots.cjs [--game <id>] [--port 8899]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const PORT = +opt('port', 8899);
const ONLY = opt('game', null);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const VIEWPORT = { width: 360, height: 760 };
const SCALE = 1.5;

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

// Each scene runs inside the game page and returns once the frame is worth capturing.
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
  for (const [id, scene] of Object.entries(SCENES)) {
    if (ONLY && id !== ONLY) continue;
    for (let n = 0; n < scene.shots.length; n++) {
      const shot = scene.shots[n];
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, colorScheme: 'dark', isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (scene.init) await page.addInitScript(scene.init);
      await page.goto(`http://localhost:${PORT}/games/${id}/index.html?debug`);
      await page.waitForTimeout(700);
      if (scene.bot) await page.addScriptTag({ path: path.join(ROOT, scene.bot) });
      await page.addScriptTag({ content: shot.run.join('\n') });
      await page.waitForTimeout(shot.settle);
      const out = path.join(ROOT, 'games', id, `shot-${n + 1}.jpg`);
      await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
      console.log(`wrote ${path.relative(ROOT, out)} (${Math.round(fs.statSync(out).size / 1024)} KB)${errors.length ? '  errors: ' + errors.join(' | ') : ''}`);
      await ctx.close();
    }
  }
  await browser.close();
  srv.close();
})();
