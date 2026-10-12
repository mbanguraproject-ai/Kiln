/* Night flights: the short flight between caves in The Long Night (skippable: skipping banks the average yield),
 * and the one eventful flight home at the end of each biome. The night world has a fixed height, so every screen
 * plays the same field. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const { clamp, dist } = Kit;
  const T = PP.data.tuning;
  const N = PP.night = {};

  // first: the first night of a run shows the "skip" hint later
  N.start = function (first, opts) {
    const G = PP.G, nt = T.night;
    opts = opts || {};
    G.sub = 'night';
    G.nightT = opts.time || nt.time;
    G.nightMax = G.nightT;
    const h = nt.worldH;
    G.night = { scroll: 0, moths: [], spawn: 0.2, caught: 0, h, owl: opts.owl ? { t: opts.time * 0.45, x: 0, y: 0, on: false, done: false } : null, colony: opts.colony ? [] : null, flight: !!opts.flight };
    const b = G.bat;
    b.x = 160; b.y = h * 0.42; b.vx = 120; b.vy = -20; b.web = null; b.stun = 0; b.dash = 0;
    for (let i = 0; i < T.history; i++) { G.hx[i] = b.x - i * 0.4; G.hy[i] = b.y; }
    PP.R.nightCamera();
    Kit.fx.clear();
    G.wipe = 1;
    if (G.night.colony) for (let k = 0; k < 14; k++) G.night.colony.push({ x: b.x - 120 - k * 40 + G.fxr.range(-20, 20), y: h * G.fxr.range(0.15, 0.6), ph: G.fxr.range(0, 6), sp: G.fxr.range(0.8, 1.2), s: G.fxr.range(0.55, 0.85) });
    if (G.mode === 'play') {
      Kit.music.layer('exit', true);
      G.banner = opts.flight ? { t: 0, a: opts.title || 'The flight home', b: opts.line || '', dur: 3.4 } : { t: 0, a: 'Night flight', b: 'Free moths under the moon', dur: 3.4 };
    }
    for (let k = 0; k < 10; k++) spawnMoth(G.night, b.x + 120 + k * 60);
  };
  function spawnMoth(Nt, x) {
    const G = PP.G;
    Nt.moths.push({ x, y: G.fxr.range(Nt.h * 0.1, Nt.h * 0.62), ph: G.fxr.range(0, 6), sp: G.fxr.range(20, 50), dead: false, gold: G.fxr.chance(T.night.gold) });
  }
  // skip: bank the average yield and dive on
  N.skip = function () {
    const G = PP.G;
    if (!G || G.sub !== 'night') return;
    const y = G.night.flight ? 0 : PP.data.economy.longNight.skipYield;
    if (y && G.night.caught < y) { G.score += y - G.night.caught; G.night.caught = y; }
    G.nightT = 0;
  };
  function end() {
    const G = PP.G;
    G.sub = 'dive';
    G.fade = 0; G.fadeDir = 1;
    if (G.mode === 'play') { Kit.music.layer('exit', false); PP.sfx('whoosh'); }
    if (G.kind === 'endless') PP.profile.bankEndless(G.night.caught, G, true);
    if (G.night.flight) { G.fadeDir = 0; G.fade = 0; PP.run.finish(true); }
  }

  N.update = function (dt) {
    const G = PP.G, Nt = G.night, b = G.bat, play = G.mode === 'play', st = PP.bat.stats();
    if (!Nt) return;
    if (G.sub === 'night') G.nightT -= dt;
    G.wipe = Math.max(0, G.wipe - dt * 0.9);
    Nt.scroll += T.night.scroll * dt;
    const view = PP.R.nightView();   // { hw, cx }
    let inp = (G.auto || PP.run.flags.autopilot) ? null : PP.bat.steerInput();
    if (inp && !inp.x && !inp.y && PP.input.touch.id === null && !(PP.input.kit && (PP.input.kit.axisX() || PP.input.kit.axisY()))) inp = null;
    if (!inp) {
      let best = null, bd = 1e9;
      for (const m of Nt.moths) if (!m.dead && m.x > b.x - 10) { const d = dist(b.x, b.y, m.x, m.y); if (d < bd) { bd = d; best = m; } }
      const tx = best ? best.x : view.cx, ty = best ? best.y : Nt.h * 0.4, d = Math.max(1, dist(b.x, b.y, tx, ty));
      inp = { x: (tx - b.x) / d * 0.8, y: (ty - b.y) / d * 0.8 };
    }
    b.vx += inp.x * st.acc * dt; b.vy += inp.y * st.acc * dt;
    const has = inp.x || inp.y;
    b.vx *= Math.exp(-(has ? 1.1 : 1.9) * dt); b.vy *= Math.exp(-(has ? 1.1 : 1.9) * dt);
    b.vx += T.night.scroll * dt * 1.2;
    const sp = Math.hypot(b.vx, b.vy), cap = st.maxV + 60;
    if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
    if (inp.x > 0.2) b.face = 1; else if (inp.x < -0.2) b.face = -1;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < view.cx - view.hw + 56) { b.x = view.cx - view.hw + 56; b.vx = Math.max(b.vx, 70); }
    if (b.x > view.cx + view.hw - 44) { b.x = view.cx + view.hw - 44; b.vx = Math.min(b.vx, 70); }
    if (b.y < 60) { b.y = 60; b.vy = Math.abs(b.vy) * 0.4; }
    if (b.y > Nt.h * 0.78) { b.y = Nt.h * 0.78; b.vy = -Math.abs(b.vy) * 0.5; }
    b.flap += dt * (has ? 15 : 10) * (PP.bat.def().look.flap || 1);
    b.rim = Math.max(0, b.rim - dt);
    b.stun = Math.max(0, b.stun - dt);
    PP.bat.pushHist();
    PP.run.updateTrail(dt);
    if (G.sub === 'night' && (Nt.spawn -= dt) <= 0) { Nt.spawn = T.night.spawn; spawnMoth(Nt, view.cx + view.hw + 30); }
    for (const m of Nt.moths) {
      if (m.dead) continue;
      m.x -= m.sp * dt; m.y += Math.sin(G.t * 4 + m.ph) * 30 * dt;
      if (dist(b.x, b.y, m.x, m.y) < st.eatR + 4) {
        m.dead = true;
        const v = m.gold ? 3 : 1;
        G.score += v; Nt.caught += v; G.mothsEaten++;
        if (play) G.energy = Math.min(st.energy, G.energy + T.night.energy);
        b.puff = 1; Kit.tween(b, { puff: 0 }, 420, 'quadIn', { delay: 80 });
        Kit.fx.burst(m.x, m.y, { count: m.gold ? 22 : 12, color: [PP.P.gold, '#fff2c0'], glow: true, size: [1.4, 3.2], speed: [40, 160], life: [0.35, 0.7], shape: 'star' });
        if (play) {
          Kit.fx.float('+' + v, m.x, m.y - 12, { color: PP.P.gold, size: m.gold ? 22 : 15, rise: 28, ms: 600 });
          PP.sfx(m.gold ? 'chime' : 'nightmoth', { pitch: Math.min(10, Nt.caught * 0.25) });
          PP.haptic(6);
        }
      }
    }
    PP.compact(Nt.moths, m => !m.dead && m.x > view.cx - view.hw - 60);
    // the colony flies with you on the way home
    if (Nt.colony) for (const c of Nt.colony) { c.x += (T.night.scroll + 40 * c.sp) * dt + (b.x - 80 - c.x) * 0.4 * dt; c.y += Math.sin(G.t * 2 * c.sp + c.ph) * 22 * dt + (Nt.h * 0.35 - c.y) * 0.05 * dt; }
    // an eventful moment: a tawny owl sweeps across the moon (dodge it)
    if (Nt.owl && !Nt.owl.done) {
      const o = Nt.owl;
      o.t -= dt;
      if (!o.on && o.t <= 0) { o.on = true; o.x = view.cx + view.hw + 60; o.y = Nt.h * 0.2; o.ty = b.y; PP.sfx('hoot'); PP.caption('hoo-hoo', o.x, o.y, PP.CH.HAZ); G.banner = { t: 0, a: 'An owl!', b: 'Dodge it', dur: 2 }; }
      if (o.on) {
        o.x -= 380 * dt; o.y += (o.ty - o.y) * 1.4 * dt;
        if (!o.hit && dist(o.x, o.y, b.x, b.y) < 30) { o.hit = true; PP.run.hurt(8, o.x, o.y, 'owl'); }
        if (o.x < view.cx - view.hw - 80) o.done = true;
      }
    }
    if (G.sub === 'night' && G.nightT <= 0) end();
  };
})();
