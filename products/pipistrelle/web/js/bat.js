/* The bat: floaty flight from the chosen bat's stats, wall bumps, splashes, the five abilities, input (relative drag
 * stick, tap to chirp, hold to shriek, flick to bolt, keys) and the flow-field autopilot. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CELL = PP.CELL, CH = PP.CH, TAU = PP.TAU;
  const { clamp, lerp, dist } = Kit;
  const T = PP.data.tuning;
  const B = PP.bat = {};

  B.def = () => PP.batById((PP.G && PP.G.batId) || 'pip');
  B.stats = () => B.def().stats;
  B.ability = id => B.def().ability.id === id;
  B.newBat = () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 8, face: 1, flap: 0, puff: 0, rim: 0, stun: 0, sx: 1, sy: 1, bumpCd: 0, web: null, wig: 0, webT: 0, lastAx: 0, lastAy: 0, blink: 2, glide: 0, dead: 0, charge: 0, dash: 0, dashX: 0, dashY: 0, spark: 1.2 });

  /* ---------- input ---------- */
  const HOLD_MS = 950;
  const touch = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, moved: false, held: false, second: new Map(), hist: [] };
  const IN = PP.input = { touch, lastInput: 'touch', kit: null, flick: null };
  IN.reset = function () { touch.id = null; touch.second.clear(); touch.moved = false; touch.held = false; touch.hist.length = 0; if (PP.G) PP.G.bat.charge = 0; };
  IN.down = function (p) {
    IN.lastInput = 'touch';
    if (touch.id === null) { touch.id = p.id; touch.ox = touch.x = p.x; touch.oy = touch.y = p.y; touch.t0 = performance.now(); touch.moved = false; touch.held = false; touch.hist.length = 0; touch.hist.push([p.x, p.y, touch.t0]); }
    else touch.second.set(p.id, { t0: performance.now(), fired: false });
  };
  IN.move = function (p) {
    if (p.id !== touch.id) return;
    touch.x = p.x; touch.y = p.y;
    const now = performance.now();
    touch.hist.push([p.x, p.y, now]);
    while (touch.hist.length > 2 && now - touch.hist[0][2] > 140) touch.hist.shift();
    const dx = p.x - touch.ox, dy = p.y - touch.oy, d = Math.hypot(dx, dy);
    if (d > 10) touch.moved = true;
    // the stick's origin follows a finger that runs past it, so reversing is instant
    if (d > 64) { touch.ox = p.x - dx / d * 64; touch.oy = p.y - dy / d * 64; }
  };
  IN.up = function (p, canControl) {
    if (p.id === touch.id) {
      if (canControl && !touch.moved && !touch.held) B.chirp();
      // a quick flick on release: Gale's Bolt
      if (canControl && touch.moved && touch.hist.length > 1 && B.ability('bolt')) {
        const a = touch.hist[0], now = performance.now(), dx = p.x - a[0], dy = p.y - a[1], d = Math.hypot(dx, dy);
        if (d > 38 && now - a[2] < 170) IN.flick = { x: dx / d, y: dy / d };
      }
      touch.id = null; touch.held = false; touch.moved = false;
    } else if (touch.second.has(p.id)) {
      const s = touch.second.get(p.id);
      if (canControl && !s.fired) B.chirp();
      touch.second.delete(p.id);
    }
  };
  B.steerInput = function () {
    const G = PP.G, input = IN.kit;
    if (G.testIn) return G.testIn;
    const ax = input ? input.axisX() : 0, ay = input ? input.axisY() : 0;
    if (ax || ay) { IN.lastInput = 'keys'; const m = Math.hypot(ax, ay); return { x: ax / m, y: ay / m }; }
    if (touch.id !== null && touch.moved) {
      const dx = touch.x - touch.ox, dy = touch.y - touch.oy, d = Math.hypot(dx, dy);
      if (d > 5) { const mag = Math.min(1, (d - 5) / 52); return { x: dx / d * mag, y: dy / d * mag }; }
    }
    return { x: 0, y: 0 };
  };
  // keyboard and touch actions while flying (not autopiloted)
  B.actions = function () {
    const G = PP.G, b = G.bat, input = IN.kit;
    if (input) {
      if (input.pressed('Space') || input.pressed('x') || input.pressed('j')) { IN.lastInput = 'keys'; B.chirp(); }
      if (input.pressed('Shift') || input.pressed('ShiftLeft') || input.pressed('ShiftRight') || input.pressed('z') || input.pressed('k')) { IN.lastInput = 'keys'; B.shriek(); }
      if (input.pressed('c') || input.pressed('l') || input.pressed('e')) { IN.lastInput = 'keys'; const i = B.steerInput(); B.bolt(i.x || b.face, i.y); }
    }
    if (IN.flick) { B.bolt(IN.flick.x, IN.flick.y); IN.flick = null; }
    const now = performance.now();
    if (touch.id !== null && !touch.moved && !touch.held && now - touch.t0 > HOLD_MS) { touch.held = true; B.shriek(); }
    for (const s of touch.second.values()) if (!s.fired && now - s.t0 > 500) { s.fired = true; B.shriek(); }
    b.charge = touch.id !== null && !touch.moved && !touch.held ? clamp((now - touch.t0 - 300) / (HOLD_MS - 300), 0, 1) : 0;
    for (const s of touch.second.values()) if (!s.fired) b.charge = Math.max(b.charge, clamp((now - s.t0 - 120) / 380, 0, 1));
  };

  /* ---------- verbs ---------- */
  B.chirp = function () {
    const G = PP.G;
    if (!G || G.cd > 0 || G.bat.dead || G.sub !== 'cave') return false;
    const b = G.bat, st = B.stats();
    G.cd = st.chirpCd;
    PP.echo.sonar(b.x, b.y, st.chirpR, st.chirpRays, 'chirp');
    b.rim = 1;
    b.sx = 0.86; b.sy = 1.14;
    Kit.tween(b, { sx: 1, sy: 1 }, 260, 'elasticOut');
    PP.sfx(B.ability('hark') ? 'whisper' : 'chirp', { pitch: G.fxr.range(-0.6, 0.6) + (B.ability('bolt') ? -4 : 0) });
    Kit.fx.burst(b.x, b.y - 8, { count: 5, color: [PP.P.teal, '#ffffff'], glow: true, size: [1, 2], speed: [30, 90], life: [0.2, 0.4], shape: 'spark' });
    PP.haptic(6);
    PP.emit('chirp');
    return true;
  };
  B.shriek = function () {
    const G = PP.G;
    if (!G || G.scd > 0 || G.bat.dead || G.sub !== 'cave') return false;
    const b = G.bat, st = B.stats();
    G.scd = st.shriekCd; G.cd = Math.max(G.cd, 0.4);
    PP.echo.sonar(b.x, b.y, st.shriekR, st.shriekRays, 'shriek');
    b.rim = 1.6;
    b.sx = 0.76; b.sy = 1.28;
    Kit.tween(b, { sx: 1, sy: 1 }, 420, 'elasticOut');
    PP.sfx('shriek');
    Kit.fx.shake(5, 260);
    Kit.fx.shockwave(b.x, b.y, { radius: 90, color: PP.P.teal, width: 3, ms: 380, glow: true });
    PP.haptic([12, 30, 12]);
    if (G.mode === 'play') Kit.music.duck(0.5, 500);
    PP.emit('shriek');
    return true;
  };
  // Gale's Bolt: a 200 px dash in 0.18 s; tears webs and outruns a swoop
  B.bolt = function (dx, dy) {
    const G = PP.G;
    if (!G || !B.ability('bolt') || G.dcd > 0 || G.bat.dead || G.sub !== 'cave' || G.bat.stun > 0) return false;
    const b = G.bat, d = Math.hypot(dx, dy) || 1;
    b.dashX = dx / d; b.dashY = dy / d; b.dash = 0.18;
    G.dcd = 3.5;
    if (Math.abs(b.dashX) > 0.2) b.face = Math.sign(b.dashX);
    PP.sfx('bolt');
    Kit.fx.burst(b.x, b.y, { count: 14, color: [PP.P.teal, '#ffffff', '#ffd2a8'], glow: true, size: [1, 2.5], speed: [40, 140], angle: Math.atan2(-b.dashY, -b.dashX), spread: 0.7, life: [0.2, 0.5], shape: 'spark' });
    PP.haptic(14);
    PP.emit('bolt');
    return true;
  };

  /* ---------- flight ---------- */
  B.fly = function (dt, inp) {
    const G = PP.G, b = G.bat, st = B.stats(), L = PP.L;
    const has = inp.x !== 0 || inp.y !== 0;
    let maxV = st.maxV;
    // Skim: fast and low over water
    if (B.ability('skim')) { const rv = PP.world.riverAt(b.x); if (rv && b.y > rv.y - 52 && b.y < rv.y) { maxV *= 1.3; b.skim = 1; } else b.skim = 0; }
    b.vx += inp.x * st.acc * dt; b.vy += inp.y * st.acc * dt;
    const damp = has ? st.steerDamp : st.glideDamp;
    b.vx *= Math.exp(-damp * dt); b.vy *= Math.exp(-damp * dt);
    b.glide = has ? 0 : b.glide + dt;
    if (inp.x > 0.2) b.face = 1; else if (inp.x < -0.2) b.face = -1;
    PP.hazards.each('steer', dt, b, inp);
    if (b.dash > 0) {
      b.dash -= dt;
      const v = 200 / 0.18;
      b.vx = b.dashX * v; b.vy = b.dashY * v;
      if (b.dash <= 0) { b.vx = b.dashX * st.maxV; b.vy = b.dashY * st.maxV; }
    } else {
      const sp = Math.hypot(b.vx, b.vy), cap = b.web ? 40 : maxV + 140;
      if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
      else if (sp > maxV && has) { const k = Math.max(maxV, sp - 600 * dt) / sp; b.vx *= k; b.vy *= k; }
    }
    const sp2 = Math.hypot(b.vx, b.vy);
    b.flap += dt * (has ? 15 : 8 + Math.min(6, sp2 / 40)) * (B.def().look.flap || 1);
    B.move(dt);
    // Hark: a passive ear for small sounds
    if (B.ability('hark') && (b.spark -= dt) <= 0) {
      b.spark = 1.2;
      const sp3 = (x, y, c) => { if (dist(b.x, b.y, x, y) < 320) PP.echo.addDot(x, y, G.t, c, 0.55); };
      for (const m of L.moths) if (!m.dead) sp3(m.x, m.y, CH.MOTH);
      for (const p of L.pups) if (p.state === 'hang') sp3(p.x, p.y, CH.PUP);
      for (const o of L.owls) sp3(o.x, o.y, CH.HAZ);
      for (const dr of L.drips) sp3(dr.x, dr.drop ? dr.drop.y : dr.y0, CH.WATER);
      for (const s of L.stals) if (s.state !== 'gone') sp3(s.x, s.fy + s.len * 0.5, CH.HAZ);
    }
  };
  B.pushHist = function () { const G = PP.G; G.hHead = (G.hHead + 1) % T.history; G.hx[G.hHead] = G.bat.x; G.hy[G.hHead] = G.bat.y; };
  B.move = function (dt) {
    const G = PP.G, b = G.bat, W = PP.world;
    const sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / 4));
    for (let s = 0; s < n; s++) {
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      collide();
    }
    // water: skim it and you splash (Skimmer glides over it untroubled)
    if (W.typeAt(b.x, b.y + b.r) === 2) {
      const rv = W.riverAt(b.x);
      if (rv) b.y = Math.min(b.y, rv.y - b.r - 1);
      if (B.ability('skim')) { b.vy = Math.min(b.vy, -20); }
      else {
        b.vy = -Math.max(140, Math.abs(b.vy) * 0.6);
        if (b.bumpCd <= 0 && !b.dead) {
          b.bumpCd = 0.35;
          PP.run.damage(T.damage.splash, 'splash');
          Kit.fx.burst(b.x, b.y + b.r, { count: 16, color: [PP.P.water, '#a9c8ff', '#ffffff'], size: [1.2, 3], speed: [60, 190], angle: -Math.PI / 2, spread: 1.1, gravity: 520, life: [0.4, 0.8], glow: true });
          PP.echo.addDot(b.x, b.y + b.r, G.t, CH.WATER, 2);
          G.minis.push({ x: b.x, y: b.y + b.r + 2, t0: G.t, R: 60, c: CH.WATER });
          PP.sfx('splash', { pitch: G.fxr.range(-2, 2) });
          PP.haptic(14);
          PP.emit('splash');
        }
      }
    }
    B.pushHist();
  };
  const NRM = { x: 0, y: 0, ok: false };
  function collide() {
    const G = PP.G, b = G.bat, W = PP.world;
    if (!W.hitsWall(b.x, b.y, b.r)) return;
    W.normalAt(b.x, b.y, NRM);
    let nx = NRM.x, ny = NRM.y;
    if (!NRM.ok) { const l = Math.hypot(b.vx, b.vy) || 1; nx = -b.vx / l; ny = -b.vy / l; }
    for (let k = 0; k < 12 && W.hitsWall(b.x, b.y, b.r); k++) { b.x += nx * 1.5; b.y += ny * 1.5; }
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= 1.45 * vn * nx; b.vy -= 1.45 * vn * ny;
      if (-vn > T.bump.minSpeed && b.bumpCd <= 0 && !b.dead && b.dash <= 0) bump(-vn, nx, ny);
      if (b.dash > 0) b.dash = 0;
    }
  }
  function bump(impact, nx, ny) {
    const G = PP.G, b = G.bat, st = B.stats();
    b.bumpCd = 0.25;
    // Glean: brushing a wall to pluck a moth is not a bump
    if (B.ability('glean') && PP.L.moths.some(m => !m.dead && dist(m.x, m.y, b.x, b.y) < 60)) return;
    const crash = impact > T.bump.crashAbove;
    const cost = T.bump.base + impact / T.bump.perSpeed + (crash ? T.bump.crash : 0);
    G.lastBumpCost = cost;
    PP.run.damage(cost, 'bump', true);
    if (impact > T.bump.stunAbove) b.stun = st.bumpStun * (crash ? 1.6 : 1);
    if (crash && G.mode === 'play' && G.kind !== 'practice' && !PP.settings.get('gentle')) {
      // a crash, not a brush: the player sees and feels what it cost
      Kit.fx.float('-' + Math.round(cost), b.x, b.y - 22, { color: PP.P.red, size: 18 });
      Kit.fx.flash(PP.P.red, 120, 0.16);
      Kit.fx.shake(7, 200);
      PP.sfx('thud', { vol: 0.8 });
      PP.haptic(28);
    }
    b.sx = 1 + Math.abs(ny) * 0.25 - Math.abs(nx) * 0.18; b.sy = 1 + Math.abs(nx) * 0.25 - Math.abs(ny) * 0.18;
    Kit.tween(b, { sx: 1, sy: 1 }, 380, 'elasticOut');
    const cx = b.x - nx * b.r, cy = b.y - ny * b.r;
    Kit.fx.burst(cx, cy, { count: 8, color: [PP.P.teal, '#9aa9c8'], size: [1, 2.4], speed: [30, 110], angle: Math.atan2(ny, nx), spread: 1.3, life: [0.3, 0.6], gravity: 200, glow: true });
    PP.echo.addDot(cx, cy, G.t, CH.ROCK, 1.6);
    PP.emit('bump', impact);
    PP.sfx('squeak', { pitch: G.fxr.range(-2, 2) });
    if (G.mode === 'play') { Kit.fx.shake(3, 120); PP.haptic(12); }
  }

  /* ---------- autopilot: follow a flow field toward its target, detouring for close moths and pups ---------- */
  B.autoSteer = function (flow, opts) {
    const G = PP.G, b = G.bat, L = PP.L, F = flow || L.flow, cols = L.cols, W = PP.world;
    opts = opts || {};
    let c = L.cellOf(b.x, b.y), best = c >= 0 ? F[c] : -1;
    if (best < 0) {
      for (let r = 1; r <= 6 && best < 0; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const k = c + dj * cols + di;
        if (k >= 0 && k < F.length && F[k] >= 0 && (best < 0 || F[k] < best)) { best = F[k]; c = k; }
      }
    }
    const chain = [c];
    for (let s = 0; s < 8 && best > 0; s++) {
      let nc = c;
      for (const k of [c - 1, c + 1, c - cols, c + cols]) if (F[k] >= 0 && F[k] < F[nc]) nc = k;
      if (nc === c) break;
      c = nc; best = F[c]; chain.push(c);
    }
    let pick = chain[0];
    for (let s = chain.length - 1; s >= 0; s--) { const k = chain[s]; if (W.visibleFrom(b.x, b.y, (k % cols + 0.5) * CELL, (Math.floor(k / cols) + 0.5) * CELL)) { pick = k; break; } }
    let tx = (pick % cols + 0.5) * CELL, ty = (Math.floor(pick / cols) + 0.5) * CELL;
    if (opts.goal && best <= 1) { tx = opts.goal.x; ty = opts.goal.y; }
    if (!opts.noDetour) {
      const mr = opts.mothR || 90;
      for (const m of L.moths) if (!m.dead && dist(b.x, b.y, m.x, m.y) < mr && (opts.anyDir || m.x > b.x - 20) && W.visibleFrom(b.x, b.y, m.x, m.y)) { tx = m.x; ty = m.y; break; }
      for (const p of L.pups) if (p.state === 'hang' && dist(b.x, b.y, p.x, p.y) < 150 && W.visibleFrom(b.x, b.y, p.x, p.y + 6)) { tx = p.x; ty = p.y + 6; break; }
    }
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
    const k = opts.k || (G.mode === 'attract' ? 0.62 : 0.75);
    return { x: dx / d * k, y: dy / d * k };
  };
})();
