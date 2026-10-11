// Kit test (hub/kit.js): loop, input, audio, fx, gfx, camera, save and the shell, in headless Chromium.
// Runs the modules on a bare fixture page, the shell flows on the demo game (tools/kit-demo), and the kit
// standalone, embedded in an iframe, inlined into a srcdoc bundle and with reduced motion. Any console
// error fails the run.
// Usage: node tools/kit-test.cjs [--port 8800] [--shots <dir>]   (Playwright on NODE_PATH)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const PORT = +opt('port', 8800);
const SHOTS = opt('shots', null);
const BASE = `http://localhost:${PORT}`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };

const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});

let failed = 0;
const check = (ok, name, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' (' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ')' : ''}`);
  if (!ok) failed++;
};
const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pages served from the test itself, so the fixture never has to live in the repo.
const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Kit fixture</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#111}#c{position:absolute;inset:0}</style></head>
<body><canvas id="c"></canvas>
<script src="/hub/sdk.js"></script><script src="/hub/kit.js"></script>
<script>Arcade.init({ id: 'kit-fixture', title: 'Fixture', version: '1' });</script></body></html>`;
const EMBED = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe id="f" src="/tools/kit-demo/index.html?debug"></iframe>
<script>window.msgs = []; addEventListener('message', e => { if (e.data && e.data.kiln) msgs.push(e.data); });</script></body></html>`;

async function newPage(browser, ctxOpts, name) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }, ctxOpts));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  // Match on the path alone: a glob would miss the URL once it carries ?debug.
  await ctx.route(u => u.pathname === '/__kit/fixture.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: FIXTURE }));
  await ctx.route(u => u.pathname === '/__kit/embed.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: EMBED }));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name}: console error: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${name}: page error: ${e.message}`));
  return { ctx, page };
}
const shot = async (page, file) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, file) }); };

async function units(browser) {
  const { ctx, page } = await newPage(browser, {}, 'fixture');
  await page.goto(`${BASE}/__kit/fixture.html?debug`);
  await page.waitForFunction(() => window.Kit && window.Arcade);

  // view
  const v = await page.evaluate(() => {
    window.V = Kit.view(document.getElementById('c'), { maxDpr: 2 });
    return { w: V.w, h: V.h, dpr: V.dpr, cw: V.canvas.width, ch: V.canvas.height };
  });
  check(v.w === 390 && v.h === 844 && v.dpr === 2 && v.cw === 780 && v.ch === 1688, 'view: CSS size, DPR capped at 2, backing store sized', v);
  const big = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;left:0;top:0;width:390px;height:844px;visibility:hidden';
    document.body.appendChild(c);
    const vv = Kit.view(c, { maxDpr: 3, maxPixels: 4e5, fill: false });
    return { dpr: vv.dpr, px: c.width * c.height };
  });
  check(big.px <= 4.1e5 && big.dpr >= 1, 'view: maxPixels lowers the DPR for huge canvases', big);
  // view() sizes the canvas to 100% of its box, so change the box size itself.
  await page.evaluate(() => { document.getElementById('c').style.width = '200px'; });
  await page.waitForFunction(() => V.w === 200);
  const rs = await page.evaluate(() => ({ w: V.w, cw: V.canvas.width }));
  await page.evaluate(() => { document.getElementById('c').style.width = '100%'; });
  await page.waitForFunction(() => V.w === 390);
  check(rs.w === 200 && rs.cw === 400, 'view: follows its CSS box on resize', rs);

  // loop
  await page.evaluate(() => {
    window.U = { n: 0, d: 0, dt: 0 };
    window.L = Kit.loop({ view: V, update(dt) { U.n++; U.dt = dt; }, draw() { U.d++; } });
    L.start();
  });
  await sleep(400);
  const run1 = await page.evaluate(() => ({ n: U.n, d: U.d, dt: U.dt, ready: document.documentElement.dataset.kilnReady }));
  check(run1.n > 10 && run1.d > 10 && Math.abs(run1.dt - 1 / 60) < 1e-9, 'loop: fixed 1/60 updates and draws run', run1);
  check(run1.ready === '1', 'loop: first frame calls Arcade.ready()', run1.ready);
  await page.evaluate(() => { L.pause(); window.P0 = { n: U.n, d: U.d }; });
  await sleep(300);
  const p = await page.evaluate(() => ({ dn: U.n - P0.n, dd: U.d - P0.d, paused: L.paused }));
  check(p.paused && p.dn === 0 && p.dd === 0, 'loop: pause stops updates and drawing entirely', p);
  await page.evaluate(() => { L.resume(); window.P0 = U.n; });
  await sleep(250);
  check(await page.evaluate(() => U.n - P0 > 5), 'loop: resume continues');
  await page.evaluate(() => { L.timeScale = 0.5; });
  await sleep(100);
  const ts = await page.evaluate(() => { const d = U.dt; L.timeScale = 1; return d; });
  check(Math.abs(ts - 1 / 120) < 1e-9, 'loop: timeScale scales dt (slow motion)', ts);
  const hs = await page.evaluate(async () => {
    L.hitstop(220);
    const a = { n: U.n, d: U.d };
    await new Promise(r => setTimeout(r, 120));
    const b = { n: U.n, d: U.d };
    await new Promise(r => setTimeout(r, 300));
    return { during: b.n - a.n, drawn: b.d - a.d, after: U.n - b.n };
  });
  check(hs.during <= 1 && hs.drawn > 3 && hs.after > 5, 'loop: hitstop freezes updates but keeps drawing', hs);
  check(await page.evaluate(() => { const n = U.n; L.step(5); return U.n - n === 5; }), 'loop: step(n) advances synchronously');
  await page.evaluate(() => window.postMessage({ kiln: 1, type: 'pause' }, '*'));
  await sleep(80);
  check(await page.evaluate(() => L.paused), 'loop: auto-pauses on the hub pause message');
  await page.evaluate(() => L.resume());

  // tween, ease, rng, math, collision, camera, save
  const tw = await page.evaluate(() => {
    L.pause();
    const o = { x: 0, y: 5 };
    let done = 0;
    Kit.tween(o, { x: 10 }, 100, 'linear', { onDone: () => { done++; Kit.tween(o, { y: 0 }, 50, 'quadOut'); } });
    L.step(3);
    const mid = o.x;
    L.step(4);
    const end = o.x;
    L.step(4);
    const easeOk = Object.keys(Kit.ease).every(k => Math.abs(Kit.ease[k](0)) < 1e-6 && Math.abs(Kit.ease[k](1) - 1) < 1e-6);
    return { mid, end, done, y: o.y, easeOk, left: Kit.tween.count };
  });
  check(tw.mid > 0 && tw.mid < 10 && tw.end === 10 && tw.done === 1 && tw.y === 0 && tw.left === 0, 'tween: runs in game time, lands exactly, onDone may chain', tw);
  check(tw.easeOk, 'ease: every curve starts at 0 and ends at 1');
  const misc = await page.evaluate(() => {
    const a = Kit.rng(42), b = Kit.rng(42), s = Kit.rng('lantern');
    const seqA = [a.next(), a.int(1, 6), a.range(5, 6), a.pick(['x', 'y', 'z'])];
    const seqB = [b.next(), b.int(1, 6), b.range(5, 6), b.pick(['x', 'y', 'z'])];
    let ints = true;
    for (let i = 0; i < 500; i++) { const n = s.int(1, 3); if (n < 1 || n > 3 || n !== (n | 0)) ints = false; }
    const sh = s.shuffle([1, 2, 3, 4, 5]).slice().sort().join();
    const cam = Kit.camera();
    cam.resize(400, 300); cam.x = 50; cam.y = -20; cam.zoom = 2;
    const sc = cam.toScreen(60, -10), wb = cam.toWorld(sc.x, sc.y);
    cam.bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    cam.zoom = 1; cam.follow({ x: -500, y: 400 }, 20);
    for (let i = 0; i < 120; i++) cam.update(1 / 60);
    Kit.save.set('best', 0);
    const s1 = Kit.save.setBest(10), s2 = Kit.save.setBest(5);
    return {
      same: JSON.stringify(seqA) === JSON.stringify(seqB), ints, sh,
      math: [Kit.clamp(5, 0, 3), Kit.lerp(0, 10, 0.25), Kit.wrap(-1, 0, 10), Kit.approach(0, 10, 3), Math.round(Kit.dist(0, 0, 3, 4))],
      hits: [Kit.circleCircle(0, 0, 5, 9, 0, 5), Kit.circleCircle(0, 0, 5, 11, 0, 5), Kit.rectRect({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 }),
        Kit.pointInRect(5, 5, { x: 0, y: 0, w: 4, h: 4 }), Kit.segCircle(-10, 0, 10, 0, 0, 3, 4), Kit.segCircle(-10, 0, 10, 0, 0, 5, 4)],
      cam: { sc, wb, clamped: [cam.x, cam.y] },
      save: [s1, s2, Kit.save.best()],
    };
  });
  check(misc.same && misc.ints && misc.sh === '1,2,3,4,5', 'rng: seeded sequences repeat; int() inclusive; shuffle keeps items', misc);
  check(JSON.stringify(misc.math) === '[3,2.5,9,3,5]', 'math helpers', misc.math);
  check(JSON.stringify(misc.hits) === '[true,false,true,false,true,false]', 'collision helpers', misc.hits);
  check(misc.cam.sc.x === 220 && misc.cam.sc.y === 170 && Math.abs(misc.cam.wb.x - 60) < 1e-9 && Math.abs(misc.cam.wb.y + 10) < 1e-9, 'camera: toScreen/toWorld round trip', misc.cam);
  check(Math.abs(misc.cam.clamped[0] - 200) < 0.01 && Math.abs(misc.cam.clamped[1] - 400) < 0.5, 'camera: follow converges and bounds clamp', misc.cam.clamped);
  check(JSON.stringify(misc.save) === '[true,false,10]', 'save: setBest only on a better score', misc.save);

  // fx
  const f = await page.evaluate(() => {
    Kit.fx.clear();
    Kit.fx.burst(100, 100, { count: 40, life: [0.2, 0.5] });
    const a = Kit.fx.count;
    L.step(40);
    const b = Kit.fx.count;
    Kit.fx.burst(100, 100, { count: 5000, life: 1 });
    const cap = Kit.fx.count;
    Kit.fx.clear();
    for (const shape of ['circle', 'spark', 'square', 'star', 'ring', 'glow', 'text']) Kit.fx.burst(200, 300, { count: 12, shape, text: '+1', glow: shape === 'star', size: [2, 6] });
    Kit.fx.float('+10', 200, 300, { color: '#ff0' });
    Kit.fx.shockwave(200, 300, { radius: 80 });
    Kit.fx.flash('#fff', 100);
    Kit.fx.shake(10, 300);
    const em = Kit.fx.fountain(50, 50, { rate: 60, life: 0.3 });
    const mover = { x: 0, y: 0 };
    const tr = Kit.fx.trail(mover, { spacing: 5, life: 0.3 });
    const before = Kit.fx.count;
    for (let i = 0; i < 10; i++) { mover.x += 10; L.step(1); }
    const shaken = Kit.fx.shakeX !== 0 || Kit.fx.shakeY !== 0;
    em.stop(); tr.stop();
    L.render();
    L.step(120);
    return { a, b, cap, before, grew: Kit.fx.count, shaken, after: (L.step(60), Kit.fx.count) };
  });
  check(f.a === 40 && f.b === 0, 'fx: burst spawns, particles expire', f);
  check(f.cap <= 1600, 'fx: pool is bounded', f.cap);
  check(f.shaken, 'fx: shake moves the camera offset');
  check(f.after === 0, 'fx: every shape, floats, shockwave, flash, fountain and trail draw and clean up', f);

  // gfx
  const g = await page.evaluate(() => {
    const ctx = V.ctx, gfx = Kit.gfx, stops = ['#102', '#204', '#a46'];
    gfx.sky(ctx, stops); gfx.sky(ctx, stops);
    gfx.vignette(ctx, 0.5); gfx.grain(ctx, 0.05, 1.3);
    const n1 = gfx.noiseTexture(64, 64, { seed: 3 }), n2 = gfx.noiseTexture(64, 64, { seed: 3 });
    const s1 = gfx.sprite('dot', 20, 20, (c, w) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, w / 2, 8, 0, 7); c.fill(); });
    const s2 = gfx.sprite('dot', 20, 20, () => { throw new Error('should be cached'); });
    gfx.blit(ctx, s1, 50, 50, 2, 0.5, 0.8);
    gfx.light(ctx, 100, 100, 40, '#ffcc66', 0.8);
    gfx.softShadow(ctx, 100, 140, 30, 8);
    gfx.lightRays(ctx, 200, 0, { t: 2 });
    gfx.roundRect(ctx, 10, 10, 80, 40, 12).fill();
    gfx.glow(ctx, '#0ff', 12, c => c.fillRect(0, 0, 10, 10));
    gfx.text(ctx, 'Score', 100, 100, { size: 24, stroke: '#000', shadow: '#f0f' });
    gfx.starfield({ count: 40 }).draw(ctx, 390, 844, 1.5, 0, 100);
    const lay = gfx.layers([{ depth: 0.5, paint: (c, w, h) => gfx.ridge(c, w, h, { color: '#234', seed: 4 }) }, { axis: 'y', depth: 1, paint: (c, w, h) => c.fillRect(0, 0, 10, h) }]);
    lay.draw(ctx, 390, 844, 123, 456);
    const px = ctx.getImageData(5, 830, 1, 1).data;
    return {
      cachedNoise: n1 === n2, cachedSprite: s1 === s2, spriteSize: [s1.width, s1.height],
      colors: [gfx.mix('#000000', '#ffffff', 0.5), gfx.alpha('#ff0000', 0.5), gfx.shade('#808080', 1), gfx.hsl(200, 50, 40), gfx.alpha('rgb(0, 128, 255)', 0.25)],
      painted: px[3] > 0,
    };
  });
  check(g.cachedNoise && g.cachedSprite && g.spriteSize.join() === '40,40', 'gfx: noise textures and sprites are cached at the view DPR', g);
  check(JSON.stringify(g.colors) === JSON.stringify(['rgb(127,127,127)', 'rgba(255,0,0,0.5)', 'rgb(255,255,255)', 'hsl(200,50%,40%)', 'rgba(0,128,255,0.25)']), 'gfx: colour helpers', g.colors);
  check(g.painted, 'gfx: sky, vignette, grain, sprites, lights, rays, text, starfield and layers draw');
  const rd = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 100;
    const g = c.getContext('2d'), at = (x, y) => +(g.getImageData(x, y, 1, 1).data[3] > 0), out = {};
    for (const side of ['bottom', 'top', 'left', 'right']) {
      g.clearRect(0, 0, 100, 100);
      Kit.gfx.ridge(g, 100, 100, { side, base: 0.8, amp: 0.1, color: '#fff' });
      out[side] = '' + at(50, 98) + at(50, 2) + at(2, 50) + at(98, 50);
    }
    return out;
  });
  check(rd.bottom === '1000' && rd.top === '0100' && rd.left === '0010' && rd.right === '0001', 'gfx: ridge grows from any side (walls for y layers)', rd);

  // Checked before the input section below, whose clicks are the page's first gestures.
  check(await page.evaluate(() => Kit.audio.ctx === null), 'audio: no AudioContext before a gesture');

  // input
  await page.evaluate(() => {
    window.EV = [];
    window.I = Kit.input(V.canvas);
    for (const t of ['down', 'move', 'up', 'tap', 'swipe']) I.on(t, p => EV.push({ t, x: Math.round(p.x), y: Math.round(p.y), dx: p.dx, dir: p.dir }));
  });
  await page.mouse.move(100, 200);
  await page.mouse.down();
  await page.mouse.move(140, 200, { steps: 8 });
  await page.mouse.up();
  const drag = await page.evaluate(() => { const e = EV.slice(); EV.length = 0; return e; });
  const dragDx = drag.filter(e => e.t === 'move').reduce((s, e) => s + e.dx, 0);
  check(drag[0] && drag[0].t === 'down' && drag[0].x === 100 && drag[0].y === 200 && Math.round(dragDx) === 40 && drag.some(e => e.t === 'up') && !drag.some(e => e.t === 'tap'),
    'input: pointer down/move/up in CSS px with drag deltas', { first: drag[0], dragDx });
  await page.mouse.click(60, 60);
  const tap = await page.evaluate(() => { const e = EV.slice(); EV.length = 0; return e.map(x => x.t); });
  check(tap.includes('tap'), 'input: tap detected', tap);
  await page.mouse.move(200, 500);
  await page.mouse.down();
  await page.mouse.move(200, 420, { steps: 3 });
  await page.mouse.up();
  const sw = await page.evaluate(() => { const e = EV.filter(x => x.t === 'swipe'); EV.length = 0; return e; });
  check(sw.length === 1 && sw[0].dir === 'up', 'input: swipe detected with its direction', sw);
  await page.keyboard.down('ArrowLeft');
  const k1 = await page.evaluate(() => ({ down: I.isDown('ArrowLeft'), pressed: I.pressed('ArrowLeft'), ax: I.axisX() }));
  await page.evaluate(() => L.step(1));
  const k2 = await page.evaluate(() => ({ down: I.isDown('ArrowLeft'), pressed: I.pressed('ArrowLeft') }));
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('a');
  const k3 = await page.evaluate(() => ({ a: I.isDown('a'), A: I.isDown('A'), code: I.isDown('KeyA'), left: I.axisX() }));
  await page.keyboard.up('a');
  const k4 = await page.evaluate(() => ({ down: I.isDown('ArrowLeft'), released: I.released('ArrowLeft') }));
  check(k1.down && k1.pressed && k1.ax === -1 && k2.down && !k2.pressed && !k4.down, 'input: isDown, pressed edge per update, axisX', { k1, k2, k4 });
  check(k3.a && k3.A && k3.code && k3.left === -1, 'input: keys by name or code, WASD on the axes', k3);
  // A second loop given its own input leaves the other inputs' edges alone.
  await page.evaluate(() => { window.I2 = Kit.input(document.body); window.L2 = Kit.loop({ input: I2, ready: false }); });
  await page.keyboard.down('ArrowRight');
  const lp = await page.evaluate(() => {
    L2.step(1);
    const r = { mine: I.pressed('ArrowRight'), theirs: I2.pressed('ArrowRight') };
    L.step(1);
    r.after = I.pressed('ArrowRight');
    I2.destroy();
    return r;
  });
  await page.keyboard.up('ArrowRight');
  check(lp.mine && !lp.theirs && !lp.after, 'loop: { input } flushes only its own inputs', lp);
  const multi = await page.evaluate(() => {
    const c = V.canvas, r = c.getBoundingClientRect();
    const fire = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, button: 0, isPrimary: id === 11 }));
    fire('pointerdown', 11, 250, 300);
    fire('pointerdown', 12, 300, 600);
    const both = I.pointers.size;
    const primary = I.pointer && I.pointer.id;
    fire('pointerup', 11, 250, 300);
    const next = I.pointer && I.pointer.id;
    fire('pointerup', 12, 300, 600);
    // A joystick owns touches that start in its zone; the game never sees them.
    const j = I.joystick({ zone: (x, y, w) => x < w / 2, radius: 50 });
    const b = I.button({ place: (w, h) => ({ x: w - 60, y: h - 60, r: 30 }), key: 'Space' });
    EV.length = 0;
    fire('pointerdown', 21, 60, 600);
    fire('pointermove', 21, 160, 600);
    const stick = { x: +j.x.toFixed(2), y: +j.y.toFixed(2), active: j.active };
    fire('pointerdown', 22, 330, 784);
    const btn = { down: b.down, space: I.isDown('Space'), pressed: I.pressed('Space') };
    fire('pointerup', 21, 160, 600);
    fire('pointerup', 22, 330, 784);
    return { both, primary, next, left: I.pointers.size, stick, released: !j.active && j.x === 0, btn, btnUp: !b.down, gameSaw: EV.length };
  });
  check(multi.both === 2 && multi.primary === 11 && multi.next === 12 && multi.left === 0, 'input: multi-touch pointer map and primary pointer', multi);
  check(multi.stick.x === 1 && multi.stick.y === 0 && multi.stick.active && multi.released, 'input: virtual joystick', multi.stick);
  check(multi.btn.down && multi.btn.space && multi.btn.pressed && multi.btnUp && multi.gameSaw === 0, 'input: on-screen button stands in for its key; controls swallow their touches', multi);

  // audio: lazily created on the first gesture, every preset and song style plays without errors
  await page.mouse.click(30, 30);
  await page.waitForFunction(() => Kit.audio.ready, null, { timeout: 3000 }).catch(() => {});
  const au = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ready = Kit.audio.ready;
    const names = Kit.sfx.list();
    const played = names.map(n => Kit.sfx(n, { force: true, vol: 0.5 }));
    for (let i = 1; i <= 8; i++) Kit.sfx.combo(i, { force: true });
    Kit.sfx({ wave: 'sawtooth', freq: 300, to: 900, vib: 0.5, filter: 'bandpass', cut: 1200, cutTo: 400, arp: [0, 4, 7], pan: -0.5, verb: 0.3 });
    const e = Kit.sfx.engine({ base: 50 });
    e.set(0.2); await wait(60); e.set(0.9); await wait(60); e.stop();
    let peak = 0;
    for (let i = 0; i < 10; i++) Kit.sfx('explosion', { force: true });
    for (let i = 0; i < 25; i++) { await wait(20); peak = Math.max(peak, Kit.audio.peak()); }
    const steps = {};
    for (const s of Kit.music.styles) {
      Kit.music.play(Kit.music.song(s, { seed: 5 }));
      const a = Kit.music.step;
      await wait(260);
      steps[s] = Kit.music.step - a;
    }
    Kit.music.layer('kick', false);
    Kit.music.duck(0.3, 100);
    Kit.audio.hold(true); Kit.audio.hold(false);
    Kit.music.stop();
    return { ready, count: names.length, allPlayed: played.every(Boolean), missing: ['coin', 'pickup', 'jump', 'land', 'hit', 'hurt', 'explosion', 'laser', 'shoot', 'powerup', 'levelup', 'click', 'select', 'whoosh', 'swish', 'splash', 'thud', 'bounce', 'bell', 'win', 'lose', 'combo'].filter(n => !names.includes(n)), peak, steps };
  });
  check(au.ready, 'audio: unlocked by the first gesture');
  check(au.count >= 20 && au.missing.length === 0 && au.allPlayed, 'audio: >= 20 presets, every one plays', { count: au.count, missing: au.missing });
  check(au.peak > 0.01 && au.peak <= 1.05, 'audio: master limiter keeps a pile-up of explosions from clipping', +au.peak.toFixed(3));
  check(Object.values(au.steps).every(n => n > 0), 'audio: every built-in song style runs the sequencer', au.steps);
  const mu = await page.evaluate(() => {
    const song = Kit.music.song('mystery', { seed: 2, off: ['beat'] });
    const beat = () => Kit.music.tracks().find(t => t.name === 'beat').on;
    Kit.music.play(song);
    const r = { tracks: Kit.music.tracks().map(t => t.name + (t.on ? '+' : '-')).join(), unknown: Kit.music.layer('kick', true), known: Kit.music.layer('beat', true) };
    Kit.music.play(song);
    r.kept = beat();
    Kit.music.play(song, { restart: true });
    r.reset = beat();
    Kit.music.stop();
    return r;
  });
  check(mu.tracks === 'pad+,drone+,beat-,bell+' && !mu.unknown && mu.known && mu.kept && !mu.reset, 'music: named tracks, off option, layer() reports unknown names, restart resets layers', mu);
  const mute = await page.evaluate(() => {
    Arcade.setSetting('sound', false);
    const r = { muted: Kit.audio.muted, played: Kit.sfx('coin', { force: true }) };
    Arcade.setSetting('sound', true);
    r.back = !Kit.audio.muted && Kit.sfx('coin', { force: true });
    return r;
  });
  check(mute.muted && !mute.played && mute.back, 'audio: follows the sound setting immediately', mute);

  // shell toast on the fixture (the demo keeps its shell private)
  const toast = await page.evaluate(async () => {
    const s = Kit.shell({ title: 'Fixture', loop: L, score: () => 7 });
    s.toast('Hello there');
    await new Promise(r => setTimeout(r, 300));
    const el = s.el.querySelector('.k-toast');
    return { text: el.textContent, shown: getComputedStyle(el).opacity !== '0', live: el.getAttribute('aria-live') };
  });
  check(toast.text === 'Hello there' && toast.shown && toast.live === 'polite', 'shell: toast announces politely', toast);
  await ctx.close();
}

// Six panel styles must give six different looks.
async function themes(browser) {
  const sigs = {};
  for (const panel of ['glass', 'solid', 'outline', 'paper', 'neon', 'pixel']) {
    const { ctx, page } = await newPage(browser, {}, 'theme-' + panel);
    await page.goto(`${BASE}/__kit/fixture.html`);
    sigs[panel] = await page.evaluate(p => {
      const V = Kit.view(document.getElementById('c'));
      const L = Kit.loop({ view: V, draw(ctx) { Kit.gfx.sky(ctx, ['#234', '#a57']); } });
      const s = Kit.shell({ title: 'Theme ' + p, tagline: 'A tagline', loop: L, theme: { panel: p, layout: { glass: 'bottom', paper: 'left', pixel: 'card' }[p] } });
      L.start();
      s.start();
      s.pause();
      const panelEl = s.el.querySelector('.k-pause .k-panel'), btn = s.el.querySelector('.k-pause .k-primary');
      const cs = getComputedStyle(panelEl), bs = getComputedStyle(btn);
      const r = btn.getBoundingClientRect();
      return { sig: [cs.backgroundColor, cs.borderRadius, cs.boxShadow.slice(0, 60), bs.backgroundColor, bs.borderRadius, bs.fontFamily.slice(0, 20)].join('|'), minH: r.height };
    }, panel);
    await shot(page, `theme-${panel}.png`);
    await ctx.close();
  }
  const uniq = new Set(Object.values(sigs).map(s => s.sig));
  check(uniq.size === 6, 'shell: six panel styles look different', [...uniq].length);
  check(Object.values(sigs).every(s => s.minH >= 44), 'shell: buttons are at least 44px tall in every style');
}

async function demoFlows(browser) {
  const { ctx, page } = await newPage(browser, { hasTouch: true }, 'demo');
  await page.goto(`${BASE}/tools/kit-demo/index.html?debug`);
  await page.waitForFunction(() => window.__kilnTest && document.documentElement.dataset.kilnReady === '1', null, { timeout: 4000 });
  const T = expr => page.evaluate(expr);
  const log = () => page.evaluate(() => Arcade._log.all().filter(e => e.game === 'kit-demo').map(e => ({ ev: e.ev, reason: e.reason, score: e.score })));
  const visible = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden'; }, sel);

  const t0 = await T(() => ({ state: __kilnTest.state(), focus: document.activeElement && document.activeElement.dataset.k }));
  check(t0.state.phase === 'title' && await visible('.k-title') && !(await visible('.k-pausebtn')), 'demo: title screen first, no pause button', t0.state);
  check(t0.focus === 'play', 'shell: Play has focus so Enter and Space work at once', t0.focus);
  await shot(page, 'demo-title.png');
  await page.keyboard.press('Enter');
  await sleep(150);
  const s1 = await T(() => __kilnTest.state());
  check(s1.phase === 'play' && !s1.paused && !(await visible('.k-title')) && await visible('.k-pausebtn'), 'shell: Enter starts a run', s1);
  check((await log()).some(e => e.ev === 'run_start'), 'shell: Arcade.runStart on Play');
  const pb = await page.locator('.k-pausebtn').boundingBox();
  check(pb && pb.width >= 44 && pb.height >= 44, 'shell: pause button is a 44px+ target', pb);
  await T(() => __kilnTest.autopilot(true));
  await sleep(1500);
  await shot(page, 'demo-play.png');

  await page.tap('.k-pausebtn');
  await sleep(150);
  const ps = await T(() => ({ s: __kilnTest.state(), focus: document.activeElement && document.activeElement.dataset.k }));
  check(ps.s.phase === 'paused' && ps.s.paused && ps.focus === 'resume' && await visible('.k-pause'), 'shell: pause button opens the pause menu with Resume focused', ps);
  check(await visible('[data-k=sound]') && await visible('[data-k=vibration]') && !(await visible('.k-pause [data-k=exit]')), 'shell: standalone shows Sound/Vibration, hides Back to games');
  for (let i = 0; i < 7; i++) await page.keyboard.press('Tab');
  check(await T(() => !!document.activeElement.closest('.k-pause')), 'shell: focus stays inside the pause dialog');
  await page.click('[data-k=how]');
  check(await visible('.k-how') && await T(() => document.querySelector('[data-k=how]').getAttribute('aria-expanded') === 'true'), 'shell: How to play expands');
  await page.click('[data-k=sound]');
  const snd = await T(() => ({ setting: Arcade.settings.sound, muted: Kit.audio.muted, aria: document.querySelector('[data-k=sound]').getAttribute('aria-checked') }));
  await page.click('[data-k=sound]');
  check(snd.setting === false && snd.muted && snd.aria === 'false' && await T(() => Arcade.settings.sound === true), 'shell: Sound switch flips the setting and the kit audio', snd);
  await shot(page, 'demo-pause.png');
  const frozen = await T(async () => { const a = __kilnTest.info().alt; await new Promise(r => setTimeout(r, 300)); return __kilnTest.info().alt === a; });
  check(frozen, 'shell: the game is frozen while paused');
  await page.keyboard.press('Escape');
  await sleep(100);
  check((await T(() => __kilnTest.state())).phase === 'play', 'shell: Escape resumes');

  await T(() => window.postMessage({ kiln: 1, type: 'pause' }, '*'));
  await sleep(100);
  const hubPause = await T(() => __kilnTest.state());
  check(hubPause.phase === 'paused' && hubPause.paused, 'shell: SDK pause event opens the pause menu', hubPause);
  const f0 = hubPause.frame;
  await sleep(400);
  const f1 = (await T(() => __kilnTest.state())).frame;
  check(typeof f0 === 'number' && f0 === f1, 'shell: state().frame stands still while paused', { f0, f1 });
  const bestBefore = await T(() => Kit.save.best());
  await page.click('[data-k=restart]');
  await sleep(100);
  const ev = (await log()).slice(-2);
  check(ev[0] && ev[0].ev === 'run_end' && ev[0].reason === 'restart' && Number.isInteger(ev[0].score) && ev[1].ev === 'run_start', 'shell: Restart ends the run with its score and starts a new one', ev);
  // A run given up mid-way is logged but never becomes the best (it would steal the next NEW BEST).
  const restartBest = await T(() => Kit.save.best());
  check(restartBest === bestBefore, 'shell: a restarted run does not count toward best', { bestBefore, restartBest, score: ev[0].score });
  await T(() => Kit.save.set('best', 0));
  await T(() => __kilnTest.autopilot(true));
  await sleep(1200);
  await T(() => __kilnTest.lose());
  const over = await T(() => __kilnTest.state());
  const end = (await log()).pop();
  check(over.phase === 'over' && end.ev === 'run_end' && Number.isInteger(end.score) && end.score > 0, 'shell: lose() ends the run with a whole-number score', { over, end });
  // A key pressed inside the panel's lock window must not restart. Sent from the page the moment the panel
  // shows, so a busy machine cannot let the window pass before the key lands.
  const stray = await T(() => new Promise(res => {
    const t0 = performance.now();
    (function look() {
      const o = document.querySelector('.k-over');
      if (o && !o.hidden && o.hasAttribute('data-locked')) {
        (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
        setTimeout(() => res(__kilnTest.state().phase), 50);
      } else if (performance.now() - t0 > 3000) res('panel never showed');
      else requestAnimationFrame(look);
    })();
  }));
  check(stray === 'over', 'shell: a stray key right after game over is ignored', stray);
  // The count-up lasts about a second; wait for it to land rather than for a fixed time.
  await page.waitForFunction(() => !document.querySelector('.k-over').hasAttribute('data-locked') && +document.querySelector('.k-score').textContent.replace(/,/g, '') === Kit.save.best(), null, { timeout: 4000 }).catch(() => {});
  const ov = await T(() => ({
    score: document.querySelector('.k-score').textContent, stats: document.querySelectorAll('.k-stat').length,
    best: !document.querySelector('.k-newbest').hidden, focus: document.activeElement.dataset.k, stored: Kit.save.best(),
  }));
  check(ov.stats === 4 && ov.best && ov.focus === 'again' && +ov.score.replace(/,/g, '') === ov.stored, 'shell: game over counts up the score, shows stats and NEW BEST, saves best', ov);
  check(!(await visible('.k-over [data-k=exit]')), 'shell: no Back to games when standalone');
  await shot(page, 'demo-over.png');
  await page.keyboard.press('Enter');
  await sleep(150);
  check((await T(() => __kilnTest.state())).phase === 'play', 'shell: Play again with the keyboard');
  const overflow = await T(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, 'demo: no horizontal overflow');
  await ctx.close();
}

async function keyart(browser) {
  const { ctx, page } = await newPage(browser, {}, 'keyart');
  // Same probe as tools/game-check.cjs: text drawn on a visible canvas in key art is a HUD left on.
  await page.addInitScript(() => {
    window.__canvasText = [];
    for (const m of ['fillText', 'strokeText']) {
      const orig = CanvasRenderingContext2D.prototype[m];
      CanvasRenderingContext2D.prototype[m] = function (str, ...rest) {
        if (this.canvas.isConnected && !(window.Kit && Kit._worldText) && String(str).trim()) window.__canvasText.push(String(str));
        return orig.call(this, str, ...rest);
      };
    }
  });
  await page.goto(`${BASE}/tools/kit-demo/index.html?debug&keyart&scene=art`);
  await page.waitForFunction(() => document.documentElement.dataset.sceneDone, null, { timeout: 8000 }).catch(() => {});
  const k = await page.evaluate(() => ({
    scene: document.documentElement.dataset.sceneDone,
    shell: getComputedStyle(document.querySelector('.k-shell')).display,
    text: document.body.innerText.trim(),
    canvasText: window.__canvasText.slice(0, 5),
  }));
  check(k.scene === '1', 'keyart: art scene completes', k.scene);
  check(k.shell === 'none' && k.text === '', 'keyart: shell hidden, no visible text', k);
  check(!k.canvasText.length, 'keyart: no HUD text drawn on the canvas', k.canvasText);
  await shot(page, 'demo-keyart.png');
  for (const s of ['shot1', 'shot2']) {
    await page.goto(`${BASE}/tools/kit-demo/index.html?debug&scene=${s}`);
    await page.waitForFunction(() => document.documentElement.dataset.sceneDone, null, { timeout: 8000 }).catch(() => {});
    check(await page.evaluate(() => document.documentElement.dataset.sceneDone === '1'), `scenes: ${s} completes`);
    await sleep(900); // past the shell's game-over delay: a run that died inside the scene would show it now
    check((await page.evaluate(() => __kilnTest.state())).phase === 'play', `scenes: ${s} keeps its run alive`);
  }
  // Scenes write saves like real play, so they never run from a player's link without ?debug.
  await page.goto(`${BASE}/tools/kit-demo/index.html?scene=shot1`);
  await page.waitForFunction(() => document.documentElement.dataset.kilnReady === '1', null, { timeout: 4000 });
  await sleep(300);
  check(await page.evaluate(() => !document.documentElement.dataset.sceneDone), 'scenes: ignored without ?debug');
  await ctx.close();
}

async function embedded(browser) {
  const { ctx, page } = await newPage(browser, {}, 'embedded');
  await page.goto(`${BASE}/__kit/embed.html`);
  const frame = page.frame({ url: /kit-demo/ });
  await frame.waitForFunction(() => window.__kilnTest && document.documentElement.dataset.kilnReady === '1', null, { timeout: 4000 });
  const r = await frame.evaluate(async () => {
    __kilnTest.start();
    await new Promise(res => setTimeout(res, 100));
    document.querySelector('.k-pausebtn').click();
    const q = s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; };
    return { embedded: Arcade.embedded, exit: q('.k-pause [data-k=exit]'), settings: q('.k-settings'), phase: __kilnTest.state().phase };
  });
  check(r.embedded && r.exit && !r.settings && r.phase === 'paused', 'embedded: pause menu shows Back to games, hides Sound/Vibration', r);
  await frame.evaluate(() => __kilnTest.resume());
  await page.evaluate(() => document.getElementById('f').contentWindow.postMessage({ kiln: 1, type: 'pause' }, '*'));
  await sleep(100);
  check((await frame.evaluate(() => __kilnTest.state())).paused, 'embedded: the hub pause message pauses the game');
  await frame.click('.k-pause [data-k=exit]');
  await sleep(100);
  const msgs = await page.evaluate(() => window.msgs.map(m => m.type + (m.event ? ':' + m.event.ev : '')));
  check(msgs.includes('ready') && msgs.includes('event:run_start') && msgs.includes('exit'), 'embedded: ready, run_start and exit reach the hub', msgs.filter(m => !m.startsWith('event:game')));
  const quit = await page.evaluate(() => (window.msgs.filter(m => m.event && m.event.ev === 'run_end').pop() || {}).event);
  check(quit && quit.reason === 'quit' && Number.isInteger(quit.score), 'embedded: Back to games ends the run with its score', quit);
  await ctx.close();
}

// The single-file bundle inlines sdk.js and kit.js into an iframe's srcdoc: no script URLs at all.
async function srcdoc(browser) {
  const { ctx, page } = await newPage(browser, {}, 'srcdoc');
  await page.goto(`${BASE}/__kit/fixture.html`);
  const sdk = fs.readFileSync(path.join(ROOT, 'hub/sdk.js'), 'utf8');
  const kit = fs.readFileSync(path.join(ROOT, 'hub/kit.js'), 'utf8');
  const game = `Arcade.init({ id: 'srcdoc-game', title: 'Inline' });
const V = Kit.view(document.getElementById('c'));
let n = 0;
const L = Kit.loop({ view: V, update() { n++; if (n % 20 === 0) Kit.fx.burst(100, 100, { count: 5 }); }, draw(ctx) { V.clear('#123'); Kit.fx.draw(ctx); } });
const S = Kit.shell({ title: 'Inline', loop: L, score: () => n });
L.start();
window.probe = () => ({ n, kit: !!window.Kit, shell: !!document.querySelector('.k-shell'), ready: document.documentElement.dataset.kilnReady });`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}#c{position:absolute;inset:0}</style></head><body><canvas id="c"></canvas>
<script>${sdk.replace(/<\/script/gi, '<\\/script')}</script><script>${kit.replace(/<\/script/gi, '<\\/script')}</script><script>${game}</script></body></html>`;
  await page.evaluate(h => { const f = document.createElement('iframe'); f.id = 'sd'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'; f.srcdoc = h; document.body.appendChild(f); }, html);
  await sleep(700);
  const r = await page.evaluate(() => document.getElementById('sd').contentWindow.probe());
  check(r.kit && r.shell && r.n > 10 && r.ready === '1', 'srcdoc: kit runs fully inlined into a srcdoc frame', r);
  await ctx.close();
}

async function reduced(browser) {
  const { ctx, page } = await newPage(browser, { reducedMotion: 'reduce' }, 'reduced');
  await page.goto(`${BASE}/__kit/fixture.html`);
  const r = await page.evaluate(() => {
    const V = Kit.view(document.getElementById('c'));
    const L = Kit.loop({ view: V });
    Kit.fx.burst(10, 10, { count: 40 });
    const n = Kit.fx.count;
    Kit.fx.shake(20, 500);
    L.step(3);
    return { reduced: Kit.reducedMotion, n, shake: Kit.fx.shakeX + Kit.fx.shakeY };
  });
  check(r.reduced && r.n < 40 && r.n > 0 && r.shake === 0, 'reduced motion: fewer particles, no shake', r);
  await ctx.close();
}

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const t of [units, themes, demoFlows, keyart, embedded, srcdoc, reduced]) {
      try { await t(browser); } catch (e) { check(false, `${t.name}: threw`, e.message.split('\n')[0]); }
    }
  } finally {
    await browser.close();
    srv.close();
  }
  check(errors.length === 0, 'no console or page errors', errors.slice(0, 8));
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll kit checks passed');
  process.exit(failed ? 1 : 0);
})();
