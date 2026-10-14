/* The frame composer. One canvas at device resolution times the governor's scale; a camera that shows a constant
 * world area, so a 4K screen shows the same play space as a phone, only sharper. Order: sky and silhouettes, rock
 * chunks, the darkness (holes for your glow, the arch and each sweeping ring), the memory of echoes, then the lit
 * world, the bat, particles and the HUD. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const { clamp } = Kit;
  const cam = Kit.cam;
  const T = PP.data.tuning;
  R._tmp = { x: 0, y: 0 };
  R.camTarget = { x: 0, y: 0 };
  R.scene = 'cave';
  R.xray = false;
  R.k = 1; R.zoom = 1; R.u = 1; R.w = 1; R.h = 1;
  R.BAT_SCALE = 2.1; // the bat on screen: big and bold enough to read as the game's hero (its body is the 8 px hit circle)
  R.safe = { l: 0, r: 0, t: 0, b: 0 };
  let canvas = null, ctx = null, darkC = null, darkG = null, safeEl = null, trees = null, treesZoom = 0;
  const stars = Kit.gfx.starfield({ count: 160, seed: 5, layers: 3, size: [0.5, 2.1] });

  R.init = function (cv) {
    canvas = cv;
    ctx = cv.getContext('2d', { alpha: false });
    R.ctx = ctx;
    safeEl = document.getElementById('safe');
    R.resize();
    if (window.ResizeObserver) new ResizeObserver(() => { R.dirty = true; }).observe(cv);
    addEventListener('resize', () => { R.dirty = true; });
  };
  R.resize = function () {
    R.dirty = false;
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight), dpr = window.devicePixelRatio || 1;
    const s = R.quality.scale(w, h, dpr);
    const W = Math.max(1, Math.round(w * dpr * s)), H = Math.max(1, Math.round(h * dpr * s));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    R.w = w; R.h = h; R.k = W / w; R.dpr = dpr;
    Kit.gfx.dpr = R.k;
    cam.resize(w, h);
    const area = T.camera.area;
    R.zoom = Math.min(Math.sqrt(w * h / area), Math.min(w, h) / T.camera.minShort * 1.25);
    cam.zoom = R.zoom;
    if (safeEl) { const cs = getComputedStyle(safeEl); R.safe = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 }; }
    const minSide = Math.min(w, h);
    R.u = clamp(0.6 * minSide / 400 + 0.4, 1, 4);
    document.documentElement.style.fontSize = (16 * R.u) + 'px';
    PP.emit('resize');
  };

  /* ---------- camera ---------- */
  R.resetCamera = function (x, y) { cam.bounds = null; cam.x = x; cam.y = y; R.camTarget.x = x; R.camTarget.y = y; cam.follow(R.camTarget, 5); };
  R.updateCam = function () {
    const G = PP.G, L = PP.L, b = G.bat;
    if (!L || G.sub === 'night') return;
    if (G.sub === 'cave' || G.sub === 'dead') {
      R.camTarget.x = b.x + b.vx * 0.32 + (G.mode === 'attract' ? 60 : 0);
      R.camTarget.y = b.y + b.vy * 0.22;
    }
    const hw = R.w / 2 / R.zoom, hh = R.h / 2 / R.zoom;
    cam.bounds = { minX: -60, minY: -40, maxX: L.W + 200, maxY: L.H + 40 };
    if (hw * 2 > L.W + 220) cam.bounds = null;
    if (hh * 2 > L.H + 80 && cam.bounds) cam.bounds = { minX: cam.bounds.minX, maxX: cam.bounds.maxX, minY: L.H / 2 - hh, maxY: L.H / 2 + hh };
    if (cam.target !== R.camTarget) cam.follow(R.camTarget, 5);
  };
  R.wipeAt = function (wx, wy) { cam.toScreen(wx, wy, R._tmp); PP.G.wipeX = R._tmp.x; PP.G.wipeY = R._tmp.y; };
  R.nightCamera = function () { cam.bounds = null; cam.follow(null); R.nightView(); };
  R.nightView = function () {
    const G = PP.G, hw = R.w / 2 / R.zoom;
    cam.x = hw + (G.night ? G.night.scroll : 0); cam.y = T.night.worldH / 2;
    return { hw, cx: cam.x };
  };

  /* ---------- the frame ---------- */
  // The simulation steps at a fixed 60 Hz; screens refresh at 60, 90 or 120 Hz, so a frame often falls between
  // two steps. The camera, the bat and its pups (what the eye follows) are drawn blended between the previous
  // step and the latest by alpha, so motion is smooth at any refresh rate instead of stepping 0, 1 or 2 ticks a
  // frame. R.interp holds the previous step's positions (js/main.js records them before each step).
  const I = R.interp = { ok: false, cx: 0, cy: 0, bx: 0, by: 0, tx: new Float64Array(32), ty: new Float64Array(32), tn: 0 };
  const near = (a, b, c, d) => Math.abs(a - c) + Math.abs(b - d) < 400;
  R.frame = function (alpha) {
    const G = PP.G;
    if (!(alpha >= 0 && alpha < 1) || !I.ok || !G || !G.bat) { frame(); return; }
    const cx = cam.x, cy = cam.y, b = G.bat, bx = b.x, by = b.y, tr = G.trail || [], tn = Math.min(I.tn, tr.length);
    if (near(cx, cy, I.cx, I.cy)) { cam.x = I.cx + (cx - I.cx) * alpha; cam.y = I.cy + (cy - I.cy) * alpha; }
    if (near(bx, by, I.bx, I.by)) { b.x = I.bx + (bx - I.bx) * alpha; b.y = I.by + (by - I.by) * alpha; }
    for (let i = 0; i < tn; i++) { const p = tr[i]; I.tx[16 + i] = p.x; I.ty[16 + i] = p.y; if (near(p.x, p.y, I.tx[i], I.ty[i])) { p.x = I.tx[i] + (p.x - I.tx[i]) * alpha; p.y = I.ty[i] + (p.y - I.ty[i]) * alpha; } }
    try { frame(); } finally {
      cam.x = cx; cam.y = cy; b.x = bx; b.y = by;
      for (let i = 0; i < tn; i++) { tr[i].x = I.tx[16 + i]; tr[i].y = I.ty[16 + i]; }
    }
  };
  // before each step: remember where things were
  R.beforeStep = function () {
    const G = PP.G;
    I.cx = cam.x; I.cy = cam.y;
    if (G && G.bat) { I.bx = G.bat.x; I.by = G.bat.y; const tr = G.trail || []; I.tn = Math.min(16, tr.length); for (let i = 0; i < I.tn; i++) { I.tx[i] = tr[i].x; I.ty[i] = tr[i].y; } }
    I.ok = !!(G && G.bat);
  };
  function frame() {
    if (!ctx) return;
    if (R.dirty) R.resize();
    const G = PP.G, w = R.w, h = R.h, k = R.k;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    R.ppu = k;
    if (R.scene === 'roost' && PP.roost) { PP.roost.draw(ctx, w, h, performance.now() / 1000, k); return; }
    if (!G || !PP.L) { ctx.fillStyle = '#05060d'; ctx.fillRect(0, 0, w, h); return; }
    if (G.sub === 'night' || (G.sub === 'dive' && G.night) || (G.sub === 'done' && G.night)) { drawNight(w, h, G.t); overlays(w, h); R.drawHud(ctx, w, h, R.safe, R.u); return; }
    drawCave(w, h, G.t);
    overlays(w, h);
    R.drawHud(ctx, w, h, R.safe, R.u);
    if (G.rescue) drawRescue(w, h);
  }

  // The Last Echo's heartbeats (js/rescue.js): the cave dims to the bat's heart; a ring closes on it with each
  // beat, and four small hearts below fill pink for the beats you caught.
  function drawRescue(w, h) {
    const G = PP.G, S = G.rescue, b = G.bat, u = R.u;
    const dim = S.stage === 'beats' ? Math.min(1, S.t / 0.5) : 1;
    ctx.fillStyle = 'rgba(3,4,10,' + (0.45 * dim).toFixed(3) + ')';
    ctx.fillRect(0, 0, w, h);
    if (S.stage !== 'beats') return;
    cam.toScreen(b.x, b.y, R._tmp);
    const x = R._tmp.x, y = R._tmp.y, core = 22 * u * Math.max(0.8, R.zoom);
    const pulse = Math.max(0, 1 - Math.abs(((S.t - 0.75) % 0.95) - 0) / 0.18);
    ctx.globalCompositeOperation = 'lighter';
    R.glow(ctx, x, y, core * (2.2 + pulse), PP.P.pink, 0.25 + 0.35 * pulse);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = PP.P.pink;
    ctx.lineWidth = 2.5 * u;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x, y, core, 0, PP.TAU); ctx.stroke();
    // the closing ring of the beat that is coming
    if (S.beat < 4) {
      const due = 0.75 + S.beat * 0.95, lead = due - S.t;
      if (lead < 0.9 && lead > -0.18) {
        const r = core + Math.max(0, lead) / 0.9 * core * 5;
        ctx.globalAlpha = 0.35 + 0.65 * (1 - Math.max(0, lead) / 0.9);
        ctx.lineWidth = (lead < 0.18 ? 4 : 2.5) * u;
        ctx.beginPath(); ctx.arc(x, y, r, 0, PP.TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // four hearts: caught, missed, still to come
    const hy = Math.min(h - R.safe.b - 80 * u, y + 120 * u);
    for (let k = 0; k < 4; k++) {
      const hx = w / 2 + (k - 1.5) * 34 * u, mark = S.marks[k];
      R.drawHeart(ctx, hx, hy, 9 * u, mark === true ? PP.P.pink : mark === false ? '#4a3a44' : 'rgba(255,156,207,0.35)', 1);
    }
    Kit.gfx.text(ctx, 'Tap with the heartbeat', w / 2, hy + 30 * u, { size: 15 * u, color: '#ffd1e6', font: 'body', weight: 700, align: 'center' });
    Kit.gfx.text(ctx, '3 of 4 beats for a second wind', w / 2, hy + 50 * u, { size: 12 * u, color: 'rgba(233,251,255,0.6)', font: 'body', weight: 600, align: 'center' });
  }

  function viewRect(pad) {
    const hw = R.w / 2 / R.zoom, hh = R.h / 2 / R.zoom;
    const x0 = cam.x - hw - pad, y0 = cam.y - hh - pad, x1 = cam.x + hw + pad, y1 = cam.y + hh + pad;
    const ppu = R.k * R.zoom, tier = R.quality.tier;
    return { x0, y0, x1, y1, ppu, detail: tier.detail && ppu >= 1.2, inView: (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m, minW: wd => Math.max(wd, 2 / ppu) };
  }

  function drawCave(w, h, t) {
    const G = PP.G, L = PP.L, k = R.k;
    R.backdrop.setBiome(L.biome);
    R.ppu = k;
    R.backdrop.draw(ctx, { w, h, zoom: R.zoom, k, camX: cam.x, camY: cam.y, t, rings: G.rings });
    const V = viewRect(30);
    cam.apply(ctx);
    R.ppu = V.ppu;
    const d = R.pickDensity(V.ppu);
    const bt = G.bat, ahead = R._ahead || (R._ahead = { x: 0, y: 0 });
    ahead.x = bt.x + bt.vx * 1.4; ahead.y = bt.y + bt.vy * 1.4;
    R.drawRock(ctx, V.x0, V.y0, V.x1, V.y1, d, R.firstFrame ? 99 : 1, ahead);
    R.drawRims(ctx, V.x0, V.y0, V.x1, V.y1);
    R.firstFrame = false;
    cam.restore(ctx);
    R.ppu = k;
    R.drawDark(w, h, t);
    cam.apply(ctx);
    R.ppu = V.ppu;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    R.drawMemory(ctx, V.x0, V.y0, V.x1, V.y1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    R.backdrop.drawLightWorld(ctx, V, t);
    R.drawMoonlight(ctx, V, t);
    R.drawOutside(ctx, V, t);
    PP.hazards.each('draw', ctx, t, V);
    R.drawProximity(ctx, V);
    R.drawCritters(ctx, V, t);
    R.drawRings(ctx, V, t);
    R.drawEcho(ctx, V, t);
    if (G.sub === 'exit' && G.wipe > 0) { cam.restore(ctx); R.ppu = k; R.drawWipe(ctx, w, h); cam.apply(ctx); R.ppu = V.ppu; }
    R.drawTrailPups(ctx, t);
    const look = PP.bat.def().look;
    R.drawBat(ctx, G.bat, t, R.BAT_SCALE, look, { energy: G.energy / PP.bat.stats().energy * 100, deadT: G.deadT });
    Kit.fx.draw(ctx);
    cam.restore(ctx);
    R.ppu = k;
    R.backdrop.drawForeground(ctx, { w, h, zoom: R.zoom, camX: cam.x, camY: cam.y });
  }

  // Darkness: a mask in world-relative resolution (the tier sets the texel size) with holes cut for the bat's glow,
  // the moonlit mouth, lit crystals and each echo ring as it sweeps; the vignette is folded into it.
  R.drawDark = function (w, h, t) {
    const G = PP.G, L = PP.L, z = R.zoom, step = R.quality.tier.mask, pal = PP.biome(L.biome).palette;
    const q = step * z, dw = Math.ceil(w / q) + 1, dh = Math.ceil(h / q) + 1;
    if (!darkC || darkC.width !== dw || darkC.height !== dh) { if (darkC) { darkC.width = 0; darkC.height = 0; } darkC = Kit.gfx.offscreen(dw, dh); darkG = darkC.getContext('2d'); darkC.vig = null; }
    const g = darkG, hs = R.holeSprite(), TMP = R._tmp;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, dw, dh);
    g.fillStyle = pal.dark || '#020309';
    g.globalAlpha = R.xray ? 0.15 : PP.keyart ? 0.8 : G.mode === 'attract' ? 0.92 : (pal.darkAlpha || 0.94);
    g.fillRect(0, 0, dw, dh);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r, a) => {
      cam.toScreen(wx, wy, TMP);
      const Rr = r / step, mx = TMP.x / q, my = TMP.y / q;
      if (mx + Rr < 0 || mx - Rr > dw || my + Rr < 0 || my - Rr > dh || a <= 0) return;
      g.globalAlpha = Math.min(1, a);
      g.drawImage(hs, mx - Rr, my - Rr, Rr * 2, Rr * 2);
    };
    const b = G.bat, Emax = PP.bat.stats().energy;
    const glow = b.dead ? Math.max(0, 1 - G.deadT) : clamp(0.6 + G.energy / Emax * 0.4, 0.55, 1);
    hole(b.x, b.y, 150, 0.8 * glow);
    hole(L.W + 10, L.exitY, 380, 1);
    hole(L.W - 120, L.exitY, 220, 0.6);
    PP.hazards.each('holes', hole, t);
    g.globalAlpha = 1;
    g.strokeStyle = '#fff';
    const SP = T.ringSpeed;
    for (const rg of G.rings) {
      const age = t - rg.t0, rad = age * SP;
      if (rad > rg.R + 60 || rad < 2) continue;
      const kk = Math.max(0, 1 - rad / (rg.R + 60)) * (rg.kind === 'crash' ? 0.7 : rg.kind === 'drip' ? 0.5 : 1);
      cam.toScreen(rg.x, rg.y, TMP);
      for (let i = 0; i < 3; i++) {
        const wd = i === 0 ? 90 : i === 1 ? 44 : 16, a = i === 0 ? 0.22 : i === 1 ? 0.32 : 0.35;
        g.globalAlpha = a * kk;
        g.lineWidth = wd / step;
        g.beginPath(); g.arc(TMP.x / q, TMP.y / q, Math.max(0.5, (rad - wd * 0.35) / step), 0, TAU); g.stroke();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // the vignette, folded into the mask
    if (!darkC.vig) {
      const gr = g.createRadialGradient(dw / 2, dh / 2, Math.min(dw, dh) * 0.3, dw / 2, dh / 2, Math.hypot(dw, dh) * 0.56);
      const v = Kit.gfx.parse(pal.vignette || '#000000');
      gr.addColorStop(0, `rgba(${v[0]},${v[1]},${v[2]},0)`); gr.addColorStop(0.6, `rgba(${v[0]},${v[1]},${v[2]},0.2)`); gr.addColorStop(1, `rgba(${v[0]},${v[1]},${v[2]},0.6)`);
      darkC.vig = gr;
    }
    g.fillStyle = darkC.vig;
    g.fillRect(0, 0, dw, dh);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(darkC, 0, 0, dw, dh, 0, 0, dw * q, dh * q);
  };

  function overlays(w, h) {
    const G = PP.G;
    if (G.wipe > 0 && G.sub !== 'exit') { ctx.globalAlpha = G.wipe * 0.9; ctx.fillStyle = '#c9dcff'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
    if (G.fade > 0) { ctx.globalAlpha = G.fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  }

  /* ---------- the night sky ---------- */
  const NIGHT_SKY = [[0, '#060c22'], [0.55, '#11244c'], [1, '#2a3f72']];
  function buildTrees(z) {
    treesZoom = z;
    const paint = (seed, color, base, sz, rim) => (g, w, h) => {
      const r = Kit.rng(seed);
      g.fillStyle = color;
      const y0 = h * base;
      g.fillRect(0, y0 + sz * 0.6, w, h - y0);
      for (let x = -sz; x < w + sz; x += sz * r.range(0.5, 0.9)) {
        const top = y0 - r.range(0, sz * 1.3);
        const draw = xx => {
          for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(xx + r.range(-sz * 0.4, sz * 0.4), top + k * sz * 0.35 + r.range(0, sz * 0.2), sz * r.range(0.35, 0.6), 0, TAU); g.fill(); }
          if (rim) { g.fillStyle = Kit.gfx.alpha(PP.P.moon, 0.12); g.beginPath(); g.arc(xx + sz * 0.1, top - 2, sz * 0.4, Math.PI * 1.1, Math.PI * 1.9); g.fill(); g.fillStyle = color; }
        };
        draw(x);
        if (x < sz) draw(x + w);
        if (x > w - sz) draw(x - w);
      }
    };
    trees = Kit.gfx.layers([
      { depth: 0.15, paint: paint(4, '#1a2c55', 0.72, 46 * z) },
      { depth: 0.4, paint: paint(9, '#0f1c3a', 0.8, 56 * z, true) },
      { depth: 0.85, paint: paint(14, '#060c1d', 0.88, 70 * z, true) },
    ]);
  }
  const fogSprite = () => Kit.gfx.sprite('pp-fog', 256, 64, (g, w, h) => {
    g.save(); g.scale(1, h / w);
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(159,198,255,0.55)'); gr.addColorStop(1, 'rgba(159,198,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w); g.restore();
  });
  function drawNight(w, h, t) {
    const G = PP.G, Nt = G.night, z = R.zoom;
    if (!Nt) return;
    if (!trees || Math.abs(treesZoom - z) > 0.01) buildTrees(z);
    R.nightView();
    Kit.gfx.sky(ctx, NIGHT_SKY);
    const zs = Math.max(1, z);
    ctx.save(); ctx.scale(zs, zs); stars.draw(ctx, w / zs, h / zs, t, Nt.scroll * 0.05, 0); ctx.restore();
    const mx = w * 0.72, my = h * 0.24;
    R.glow(ctx, mx, my, 260 * z, PP.P.moon, 0.35);
    Kit.gfx.lightRays(ctx, mx, my, { count: 6, length: h * 0.9, spread: 1.1, angle: Math.PI * 0.62, width: 0.08, color: PP.P.moon, alpha: 0.05, t });
    Kit.gfx.blit(ctx, R.moonSprite(), mx, my, Math.min(0.95 * z, w / 460));
    trees.draw(ctx, w, h, Nt.scroll * z, 0);
    const fog = fogSprite();
    for (let k = 0; k < 3; k++) {
      const fx0 = -Kit.wrap(Nt.scroll * z * (0.3 + k * 0.2) + k * 300, 0, w * 1.4);
      ctx.globalAlpha = 0.28 - k * 0.06;
      ctx.drawImage(fog, fx0, h * (0.7 + k * 0.06), w * 1.4, h * 0.16);
      ctx.drawImage(fog, fx0 + w * 1.4, h * (0.7 + k * 0.06), w * 1.4, h * 0.16);
    }
    ctx.globalAlpha = 1;
    cam.apply(ctx);
    R.ppu = R.k * z;
    for (const m of Nt.moths) {
      if (m.dead) continue;
      R.glow(ctx, m.x, m.y, m.gold ? 30 : 18, PP.P.gold, m.gold ? 0.8 : 0.55);
      R.drawMoth(ctx, m.x, m.y, t + m.ph, 1, 0);
    }
    if (Nt.colony) {
      const pip = PP.batById('pip').look;
      for (const c of Nt.colony) R.drawBat(ctx, { x: c.x, y: c.y, vx: 120, face: 1, flap: t * 14 * c.sp + c.ph, rim: 0.3 }, t, c.s * 1.2, pip, { glow: false });
    }
    if (Nt.owl && Nt.owl.on && !Nt.owl.done) {
      const o = Nt.owl;
      ctx.save(); ctx.translate(o.x, o.y); ctx.scale(-1.6, 1.6);
      ctx.fillStyle = '#0a0f1e';
      const fl = Math.sin(t * 9) * 10;
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, TAU); ctx.fill();
      for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(s * 20, -16 - fl, s * 40, -4 - fl); ctx.quadraticCurveTo(s * 20, 4, 0, 4); ctx.fill(); }
      ctx.restore();
      R.glow(ctx, o.x - 8, o.y - 3, 10, '#ff6a3a', 0.9);
    }
    R.drawTrailPups(ctx, t);
    G.bat.rim = Math.max(G.bat.rim, 0.5);
    R.drawBat(ctx, G.bat, t, R.BAT_SCALE * 1.05, PP.bat.def().look, { energy: 100 });
    Kit.fx.draw(ctx);
    cam.restore(ctx);
    R.ppu = R.k;
    Kit.gfx.vignette(ctx, 0.45, '#020414');
  }
})();
window.PP.on('caveEnter', lv => window.PP.R.prepCave(lv));
