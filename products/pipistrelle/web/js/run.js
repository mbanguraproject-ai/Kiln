/* The run: one flight through one cave (campaign, Nightly, Practice) or many (The Long Night). Owns the state G,
 * entering caves, the cave update (energy, moths, pups, the arch), banking, death and per-run stats. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH;
  const { clamp, lerp, dist } = Kit;
  const T = PP.data.tuning;
  const R = PP.run = {};
  const HIST = T.history;
  let safeFlag = false;
  R.flags = { autopilot: false };
  R.safe = on => { safeFlag = !!on; };

  function newState(mode, opts) {
    const seed = opts.seed >>> 0;
    const st = PP.streams(seed);
    return {
      mode, kind: opts.kind || 'campaign', runSeed: seed, sub: 'cave', t: 0, ct: 0, cave: 1, caveDef: null, batId: opts.bat || 'pip',
      energy: 100, score: 0, carried: 0, trail: [], pupsTotal: 0, pupsHome: 0, mothsEaten: 0, chirps: 0,
      cd: 0, scd: 0, dcd: 0, rings: [], reechoes: [], minis: [], answers: [],
      bat: PP.bat.newBat(), hx: new Float32Array(HIST), hy: new Float32Array(HIST), hHead: 0,
      auto: mode !== 'play', autoChirp: 0.8, exitT: 0, nightT: 0, night: null, fade: 0, fadeDir: 0, banner: null, hint: null, toasts: [],
      tut: 0, tutMoved: 0, lowBeat: 0, dripT: 2, wipe: 0, wipeX: 0, wipeY: 0, deadT: 0, overSent: false, testIn: null,
      bankFrom: 0, bankTo: 0, stats: newStats(), moons: [], danger: 0, rng: st.sim, fxr: st.fx, genSeed: seed, nightCaught: [],
      bot: null, results: null,
    };
  }
  function newStats() { return { time: 0, chirps: 0, shrieks: 0, calls: 0, bumps: 0, damage: 0, splashes: 0, webs: 0, owlsWoken: 0, moths: 0, collapse: 0, minEnergy: 100, scratches: 0 }; }

  // ---- the event bus feeds the run's stats ----
  const on = (e, f) => PP.on(e, d => { if (PP.G && PP.G.mode === 'play') f(PP.G, d); });
  on('chirp', G => { G.stats.chirps++; G.stats.calls++; G.chirps++; });
  on('shriek', G => { G.stats.shrieks++; G.stats.calls++; G.chirps++; });
  on('bump', G => { G.stats.bumps++; });
  on('splash', G => { G.stats.splashes++; });
  on('web', G => { G.stats.webs++; });
  on('owlWake', G => { G.stats.owlsWoken++; });
  on('collapseTouch', G => { G.stats.collapse++; });
  on('scratch', (G, s) => { G.stats.scratches++; if (G.kind !== 'practice') PP.profile.readScratch(s); });

  /* ---------- starting runs ---------- */
  // opts: { kind: 'campaign'|'nightly'|'practice'|'endless'|'attract', cave (def), seed, bat }
  R.start = function (opts) {
    opts = opts || {};
    const mode = opts.kind === 'attract' ? 'attract' : 'play';
    const seed = opts.seed != null ? opts.seed : (opts.cave && opts.cave.seed) || ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const G = PP.G = newState(mode, Object.assign({}, opts, { seed }));
    G.kind = opts.kind || 'campaign';
    G.tut = opts.cave && opts.cave.tutorial && !PP.profile.get().tutorial.taught ? 1 : 0;
    PP.input.reset();
    R.normalTime();
    if (G.kind === 'endless' || G.kind === 'attract') R.enterCave(opts.startCave || 1, { noFade: mode === 'attract' });
    else R.enterCave(1, { def: opts.cave });
    return G;
  };

  R.specFor = function (G, n) {
    if (G.kind === 'endless' || G.kind === 'attract') return PP.gen.endlessSpec(G.runSeed, n, 'chalk');
    return PP.gen.caveSpec(G.caveDef);
  };

  R.enterCave = function (n, opts) {
    opts = opts || {};
    const G = PP.G;
    if (opts.def) G.caveDef = opts.def;
    G.cave = n;
    const spec = R.specFor(G, n);
    if (G.kind === 'nightly' || G.kind === 'practice') spec.seed = G.runSeed;
    const tA = performance.now();
    const L = PP.L = PP.gen.cave(spec);
    G.genMs = Math.round(performance.now() - tA);
    PP.echo.clear();
    Kit.fx.clear();
    PP.emit('caveEnter', L);
    G.sub = 'cave';
    G.ct = 0;
    G.rings.length = 0; G.reechoes.length = 0; G.minis.length = 0; G.answers.length = 0; G.hint = null; G.toasts.length = 0;
    G.carried = 0; G.trail.length = 0; G.pupsHome = 0;
    G.stats = newStats();
    const st = PP.bat.stats();
    const b = G.bat;
    if (G.kind !== 'endless' || n === 1) G.energy = st.energy;
    b.r = st.r;
    b.x = 110; b.y = L.startY; b.vx = 60; b.vy = 0; b.stun = 0; b.web = null; b.dead = 0; b.face = 1; b.dash = 0;
    for (let i = 0; i < HIST; i++) { G.hx[i] = b.x; G.hy[i] = b.y; }
    G.exitT = 0; G.wipe = 0; G.cd = 0; G.scd = 0; G.dcd = 0;
    G.autoChirp = 0.35; G.firstChirp = 0.3; G.danger = 0;
    const def = G.caveDef;
    PP.missions.init(G, G.kind === 'campaign' ? def : null, G.kind === 'campaign' ? PP.profile.caveMoons(def.id) : null);
    G.bot = (G.mode === 'attract' || R.flags.autopilot) ? PP.bot.plan(L, R.flags.botGoals || (G.mode === 'attract' ? { pups: false } : {})) : null;
    PP.R.resetCamera(b.x + 120, b.y);
    if (G.mode === 'play') {
      const title = G.kind === 'endless' ? 'Cave ' + n : G.kind === 'practice' ? 'Practice Hollow' : def.name;
      const line = G.kind === 'endless' ? spec.intro : G.kind === 'practice' ? 'Fly freely. Nothing to lose here.' : def.intro;
      G.banner = { t: 0, a: title, b: line, dur: 3.4 };
      PP.audio.enterCave(L.biome, G.kind);
    }
    if (!opts.noFade) { G.fade = 1; G.fadeDir = -1; }
    if (PP.debug) window.__ppGenMs = G.genMs;
  };

  /* ---------- feedback helpers ---------- */
  R.banner = (a, b, dur) => { const G = PP.G; if (G && G.mode === 'play') G.banner = { t: 0, a, b, dur: dur || 3.4 }; };
  R.hint = text => { const G = PP.G; if (G && G.mode === 'play') G.hint = { t: 0, text }; };
  R.toast = (title, text, dur, kind) => { const G = PP.G; if (G && G.mode === 'play') G.toasts.push({ t: 0, title, text, dur: dur || 3, kind: kind || '' }); };
  R.normalTime = () => { Kit.tween(R.loop, { timeScale: 1 }, 1); R.loop.timeScale = 1; };

  const gentle = () => PP.settings.get('gentle');
  // energy loss from any source (bumps are free with Gentle Wings; other damage is halved)
  R.damage = function (amount, why, isBump) {
    const G = PP.G;
    if (G.mode !== 'play' || safeFlag || G.kind === 'practice') return;
    if (gentle()) amount = isBump ? 0 : amount * 0.5;
    G.energy -= amount;
    G.stats.damage += amount;
  };
  R.hurt = function (amount, sx, sy, why) {
    const G = PP.G, b = G.bat;
    if (G.mode !== 'play') { b.stun = 0.2; return; }
    R.damage(amount, why);
    b.stun = 0.5;
    const d = Math.max(1, dist(b.x, b.y, sx, sy));
    b.vx += (b.x - sx) / d * 240; b.vy += (b.y - sy) / d * 240;
    b.sx = 1.3; b.sy = 0.72;
    Kit.tween(b, { sx: 1, sy: 1 }, 420, 'elasticOut');
    R.loop.hitstop(70);
    Kit.fx.shake(9, 300);
    Kit.fx.flash(PP.P.red, 160, 0.22);
    Kit.fx.burst(b.x, b.y, { count: 18, color: [PP.P.red, '#ffd0d8', PP.P.body], size: [1.5, 3.5], speed: [60, 220], shape: 'square', spin: [-8, 8], gravity: 160, life: [0.4, 0.8] });
    if (!safeFlag && G.kind !== 'practice') Kit.fx.float('-' + Math.round(gentle() ? amount * 0.5 : amount), b.x, b.y - 22, { color: PP.P.red, size: 18 });
    PP.sfx('squeak', { pitch: 3 }); PP.sfx('thud', { vol: 0.7 });
    PP.haptic(35);
    Kit.music.duck(0.55, 400);
    PP.emit('hurt', { amount, why });
  };

  function eatMoth(m) {
    const G = PP.G, b = G.bat, Emax = PP.bat.stats().energy;
    m.dead = true;
    G.carried++; G.mothsEaten++; G.stats.moths++;
    const was = G.energy, full = was >= Emax - 0.5;
    if (full) G.carried++;   // already full: the bat feasts, and the spare moth goes into the haul
    G.energy = Math.min(Emax, G.energy + T.eatEnergy);
    b.puff = 1;
    Kit.tween(b, { puff: 0 }, 520, 'quadIn', { delay: 120 });
    Kit.fx.burst(m.x, m.y, { count: 16, color: [PP.P.gold, '#fff2c0', '#ffa94d'], glow: true, size: [1.4, 3.4], speed: [40, 170], life: [0.35, 0.8], shape: 'star', spin: [-6, 6] });
    Kit.fx.shockwave(m.x, m.y, { radius: 30, color: PP.P.gold, width: 2, ms: 280 });
    PP.emit('moth', m);
    if (G.mode !== 'play') return;
    Kit.fx.float(full ? '+2 full' : '+1', m.x, m.y - 14, { color: full ? '#ffb22e' : PP.P.gold, size: full ? 19 : 16, rise: 30, ms: full ? 850 : 650 });
    PP.sfx('crunch', { pitch: G.fxr.range(-1.5, 1.5) });
    PP.haptic(8);
    G.pipPop = 1; G.pipFrom = was;
    if (G.tut === 3) { PP.profile.update(p => { p.tutorial.taught = true; }); G.tut = 0; }
  }
  function rescuePup(p) {
    const G = PP.G;
    p.state = 'trail';
    p.flip = 0;
    Kit.tween(p, { flip: 1 }, 420, 'backOut');
    p.heart = 1;
    Kit.tween(p, { heart: 0 }, 1100, 'quadIn', { delay: 200 });
    G.trail.push(p);
    Kit.fx.burst(p.x, p.y, { count: 14, color: [PP.P.pink, '#ffffff'], glow: true, size: [2, 4], speed: [30, 120], life: [0.5, 1], shape: 'circle', gravity: -40 });
    Kit.fx.shockwave(p.x, p.y, { radius: 44, color: PP.P.pink, width: 2.5, ms: 420 });
    PP.emit('pup', p);
    if (G.mode !== 'play') return;
    Kit.fx.float('×' + (Math.min(T.multCap || 6, G.trail.length + 1)), p.x, p.y - 22, { color: PP.P.pink, size: 22, ms: 900 });
    PP.sfx('pup');
    PP.haptic([10, 30, 10]);
    G.multPop = 1.7;
    Kit.tween(G, { multPop: 1 }, 460, 'backOut');
  }
  R.rescuePup = rescuePup;
  R.eatMoth = eatMoth;

  function die() {
    const G = PP.G, b = G.bat;
    if (b.dead) return;
    b.dead = 1;
    G.energy = 0;
    G.sub = 'dead';
    G.deadT = 0;
    PP.sfx('fade');
    Kit.music.duck(0.25);
    PP.haptic([40, 60, 40]);
    Kit.fx.burst(b.x, b.y, { count: 26, color: [PP.P.teal, PP.P.warm], glow: true, size: [1.2, 3], speed: [20, 110], gravity: -20, life: [0.8, 1.6] });
    if (G.mode !== 'play') return;
    // one last, weak chirp: the cave shows itself a final time as the bat falls, in slow motion
    const cd = G.sub; G.sub = 'cave'; PP.echo.sonar(b.x, b.y, 300, 90, 'death'); G.sub = cd;
    b.rim = 1.4;
    Kit.fx.shockwave(b.x, b.y, { radius: 120, color: PP.P.teal, width: 2, ms: 900, glow: true });
    Kit.fx.flash('#bfefff', 220, 0.18);
    R.loop.hitstop(140);
    if (!Kit.reducedMotion) { R.loop.timeScale = 0.35; Kit.tween(R.loop, { timeScale: 1 }, 1400, 'quadIn'); }
    G.banner = { t: 0.15, a: G.overtaken ? 'Overtaken' : 'Out of energy', b: G.kind === 'endless' ? 'Cave ' + G.cave + ' · ' + PP.plural(G.pupsTotal, 'pup') + ' brought home' : 'Every attempt teaches the dark', dur: 3.4 };
    PP.emit('death');
  }
  R.die = die;
  R.overtaken = () => { const G = PP.G; G.overtaken = true; G.energy = 0; die(); };

  function finish(won) {
    const G = PP.G;
    if (G.overSent) return;
    G.overSent = true;
    R.normalTime();
    G.sub = 'done';
    G.results = PP.profile.recordRun(G, won);
    PP.emit('runEnd', G.results);
  }
  R.finish = finish;

  function exitCave() {
    const G = PP.G, L = PP.L;
    if (G.sub !== 'cave') return;
    G.sub = 'exit';
    G.exitT = 0;
    G.banner = null; G.hint = null;
    G.pupsHome = G.trail.length;
    const mult = Math.min(PP.data.economy.bank.multCap, 1 + G.trail.length);
    G.bankFrom = G.score; G.bankTo = G.score + G.carried * mult; G.lastMult = mult;
    G.bankedNow = G.carried * mult;
    PP.R.wipeAt(L.W, L.exitY);
    G.pupsTotal += G.trail.length;
    if (G.kind === 'campaign') G.moonsWon = PP.missions.finish(G, L);
    if (G.mode === 'play') {
      PP.sfx('exit');
      Kit.music.duck(0.4, 900);
      PP.haptic([20, 40, 20, 40, 60]);
      if (G.carried > 0) Kit.fx.float('+' + G.carried + (mult > 1 ? ' × ' + mult : ''), G.bat.x, G.bat.y - 36, { color: '#ffb22e', size: 30, ms: 1700, rise: 46, stroke: 'rgba(40,20,0,0.85)' });
      // banked moths are never lost: The Long Night pays into the larder at every arch
      if (G.kind === 'endless') PP.profile.bankEndless(G.bankedNow, G);
    }
    PP.emit('exit');
  }
  R.exitCave = exitCave;

  /* ---------- update ---------- */
  R.update = function (dt) {
    const G = PP.G;
    if (!G || !PP.L) return;
    G.t += dt;
    if (G.banner) { G.banner.t += dt; if (G.banner.t > (G.banner.dur || 3.4)) G.banner = null; }
    if (G.hint) { G.hint.t += dt; if (G.hint.t > 3.2) G.hint = null; }
    for (const ts of G.toasts) ts.t += dt;
    PP.compact(G.toasts, ts => ts.t < ts.dur);
    if (G.fadeDir) {
      G.fade = clamp(G.fade + G.fadeDir * dt / 0.7, 0, 1);
      if (G.fadeDir < 0 && G.fade <= 0) G.fadeDir = 0;
      if (G.fadeDir > 0 && G.fade >= 1) {
        G.fadeDir = 0;
        if (G.sub === 'dive') {
          if (G.mode === 'play') G.energy = Math.min(PP.bat.stats().energy, G.energy + T.dive.refill(G.cave));
          G.night = null;
          R.enterCave(G.mode === 'play' ? G.cave + 1 : 1);
        }
      }
    }
    if (G.sub === 'night' || (G.sub === 'dive' && G.night)) { PP.night.update(dt); return; }
    if (G.sub === 'done') { PP.R.updateCam(dt); return; }
    updateCave(dt);
    PP.echo.memFlush(G.t);
  };

  function updateCave(dt) {
    const G = PP.G, L = PP.L, b = G.bat, play = G.mode === 'play', st = PP.bat.stats();
    G.cd = Math.max(0, G.cd - dt); G.scd = Math.max(0, G.scd - dt); G.dcd = Math.max(0, G.dcd - dt);
    b.rim = Math.max(0, b.rim - dt * 1.6);
    b.bumpCd = Math.max(0, b.bumpCd - dt);
    b.stun = Math.max(0, b.stun - dt);
    b.blink -= dt; if (b.blink < -0.12) b.blink = G.fxr.range(1.8, 4.2);
    G.danger = Math.max(0, (G.danger || 0) - dt);
    // the first chirp fires by itself: the reveal comes before any instruction
    if (G.firstChirp > 0 && (G.firstChirp -= dt) <= 0 && G.sub === 'cave') { G.cd = 0; PP.bat.chirp(); if (G.stats) { G.stats.chirps = 0; G.stats.calls = 0; } }
    PP.compact(G.rings, rg => G.t - rg.t0 < rg.R / T.ringSpeed + 0.4);
    PP.echo.updateAnswers(G);

    if (G.sub === 'dead') {
      G.deadT += dt;
      b.vy += 380 * dt; b.vx *= Math.exp(-2 * dt);
      PP.bat.move(dt);
      if (G.deadT > 1.6 && play) finish(false);
      if (!play && G.deadT > 2) R.start({ kind: 'attract', seed: G.runSeed + 1 });
      updateWorld(dt);
      PP.R.updateCam(dt);
      return;
    }
    if (G.sub === 'exit') {
      G.exitT += dt;
      G.wipe = clamp((G.exitT - 0.25) / 1.6, 0, 1);
      b.vx = lerp(b.vx, 220, dt * 3); b.vy = lerp(b.vy, (L.exitY - 30 - b.y) * 2, dt * 3);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.flap += dt * 16;
      PP.bat.pushHist();
      PP.R.camTarget.x = Math.min(b.x, L.W - 40); PP.R.camTarget.y = b.y;
      PP.R.wipeAt(L.W + 10, L.exitY);
      const k = clamp((G.exitT - 0.4) / 1.2, 0, 1), target = Math.round(lerp(G.bankFrom, G.bankTo, Kit.ease.cubicOut(k)));
      if (target > G.score) { G.score = target; if (play && G.t - (G.lastTick || 0) > 0.05) { PP.sfx('bank', { pitch: Math.min(12, (G.score - G.bankFrom) * 0.4) }); G.lastTick = G.t; } }
      updateTrail(dt);
      if (G.exitT > 2.0) {
        G.score = G.bankTo; G.carried = 0;
        if (G.mode !== 'play') R.start({ kind: 'attract', seed: G.runSeed + 1 });
        else if (G.kind === 'endless') PP.night.start(G.cave === 1 && !PP.profile.get().seen.night);
        else finish(true);
      }
      return;
    }

    G.stats.time += dt; G.ct += dt;
    // ---- steering ----
    const autop = G.auto || R.flags.autopilot;
    let inp = autop ? (G.bot ? PP.bot.steer(G.bot, dt) : PP.bat.autoSteer()) : PP.bat.steerInput();
    if (b.stun > 0) inp = { x: 0, y: 0 };
    if (play && G.tut === 1 && (inp.x || inp.y)) { G.tutMoved += Math.hypot(b.vx, b.vy) * dt; if (G.tutMoved > 160) G.tut = 2; }
    if (play && G.tut === 2 && G.stats.chirps > 0) G.tut = 3;
    if (!autop) PP.bat.actions();
    else if (!G.bot && (G.autoChirp -= dt) <= 0) { G.autoChirp = G.mode === 'attract' ? 1.25 : 0.9; PP.bat.chirp(); }
    PP.bat.fly(dt, inp);

    // ---- energy ----
    if (play) {
      const drain = (G.kind === 'practice' ? 0 : (R.specDrain(G) * st.drain)) * (gentle() ? 0.75 : 1);
      G.energy -= drain * dt;
      if (G.energy < 25 && (G.lowBeat -= dt) <= 0) { PP.sfx('heartbeat'); G.lowBeat = 0.55 + G.energy / 50; }
      if (safeFlag || G.kind === 'practice') G.energy = Math.max(G.energy, 40);
      G.stats.minEnergy = Math.min(G.stats.minEnergy, G.energy);
      if (G.energy <= 0) { die(); return; }
    } else G.energy = st.energy;
    if ((G.dripT -= dt) <= 0) { G.dripT = G.fxr.range(2.2, 5.5); PP.audio.ambient(G); }

    updateWorld(dt);
    if (G.kind === 'campaign') PP.missions.update(G, L);
    // the exit: fly out through the moonlit arch
    if (b.x > L.W - 40 && Math.abs(b.y - L.exitY) < L.archH + 20) { exitCave(); return; }
    PP.R.updateCam(dt);
    PP.audio.layers(G, L);
  }
  R.specDrain = G => (G.caveDef && G.kind !== 'endless' ? G.caveDef.drain || 1.6 : T.endless.drain(G.cave));

  function updateWorld(dt) {
    const G = PP.G, L = PP.L, b = G.bat, alive = !b.dead, st = PP.bat.stats(), W = PP.world;
    for (const m of L.moths) {
      if (m.dead) continue;
      m.ang += G.rng.range(-1, 1) * 7 * dt;
      const sp = m.sp * (0.7 + 0.5 * Math.sin(G.t * 3 + m.ph));
      let nx = m.x + Math.cos(m.ang) * sp * dt, ny = m.y + Math.sin(m.ang) * sp * dt;
      if (dist(nx, ny, m.hx, m.hy) > 46) m.ang = Math.atan2(m.hy - m.y, m.hx - m.x) + G.rng.range(-0.6, 0.6);
      if (W.fieldAt(nx, ny) > 0.32 || W.typeAt(nx, ny + 10) === 2) { m.ang += Math.PI * 0.8; nx = m.x; ny = m.y; }
      m.x = nx; m.y = ny;
      if (alive && dist(b.x, b.y, m.x, m.y) < st.eatR) eatMoth(m);
    }
    for (const p of L.pups) if (p.state === 'hang' && alive && dist(b.x, b.y, p.x, p.y) < st.pupR) rescuePup(p);
    updateTrail(dt);
    PP.hazards.each('update', dt, G, L);
  }
  R.updateWorld = updateWorld;

  function updateTrail(dt) {
    const G = PP.G, tr = G.trail, lagN = PP.bat.stats().trailLag || T.trailLag;
    for (let k = 0; k < tr.length; k++) {
      const p = tr[k], lag = (k + 1) * lagN;
      const i = (G.hHead - lag + HIST * 4) % HIST;
      const wob = Math.sin(G.t * 5 + k * 1.3) * 5;
      p.x = lerp(p.x, G.hx[i], Math.min(1, dt * 12));
      p.y = lerp(p.y, G.hy[i] + wob, Math.min(1, dt * 12));
    }
  }
  R.updateTrail = updateTrail;

  // abandon (quit to map): no results, nothing lost
  R.abandon = function () { const G = PP.G; if (G) { G.overSent = true; G.sub = 'done'; } R.normalTime(); };
  R.lose = function () { const G = PP.G; if (G && G.mode === 'play') { safeFlag = false; G.energy = 0; die(); G.deadT = 2; finish(false); } };
})();
