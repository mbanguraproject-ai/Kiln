/* Debug and test hooks (?debug): window.__ppTest. Headless tests and the screenshot tool reach any screen and cave
 * through these. Nothing here runs in normal play. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  if (!PP.debug) return;
  const T = window.__ppTest = {};
  const G = () => PP.G, L = () => PP.L;
  const step = sec => PP.loop.step(Math.max(1, Math.round((sec || 1 / 60) * 60)));

  Object.assign(T, {
    ready: () => !!PP.booted,
    screen: () => PP.ui.curName,
    show(name, args) { PP.ui.show(name, args || {}); return PP.ui.curName; },
    reset() { PP.profile.reset(); PP.settings.apply(); PP.ui.show('title', {}, { reset: true }); },
    profile: () => JSON.parse(JSON.stringify(PP.profile.get())),
    setProfile(p) { PP.profile.update(cur => { for (const k in p) cur[k] = p[k]; }); },
    moths(n) { PP.profile.update(p => { p.moths = n; }); },
    clearAll() { PP.profile.update(p => { for (const c of PP.game.allCaves()) p.caves[c.id] = { cleared: true, moons: [true, true, true], best: null, tries: 1 }; p.roost = { '1-1': 1, '1-2': 3, '1-3': 3, '1-4': 2, '1-5': 3, '1-6': 3 }; p.stats.pups = 15; }); },
    migrate: raw => PP.profile.migrate(raw),
    economy: () => ({ sim: PP.economy.simulate(), prices: PP.data.economy.prices }),
    startCave(id, bat) { const cv = PP.game.caveById(id); PP.game.begin({ kind: 'campaign', cave: cv, bat: bat || 'pip' }); return !!cv; },
    startEndless(n) { PP.game.startEndless(); if (n > 1) PP.run.enterCave(n, { noFade: true }); },
    startPractice(bat) { PP.game.startPractice(bat || 'pip'); },
    startNightly() { PP.game.startNightly(); },
    startFlight(b) { PP.game.startFlight(b || 'chalk'); },
    step, pause: () => PP.game.pause(), stop: () => PP.loop.stop(), start: () => PP.loop.start(),
    autopilot(on, goals) { PP.run.flags.autopilot = !!on; PP.run.flags.botGoals = goals || null; if (G() && L() && on) G().bot = PP.bot.plan(L(), goals || {}); },
    safe(on) { PP.run.safe(on); },
    xray(on) { PP.R.xray = !!on; },
    quality(id) { PP.R.quality.set(id); },
    frameStats: () => PP.R.quality.stats(),
    chunkStats: () => PP.R.chunkStats(),
    chirp: () => { if (G()) G().cd = 0; return PP.bat.chirp(); },
    shriek: () => { if (G()) G().scd = 0; return PP.bat.shriek(); },
    bolt: (x, y) => { if (G()) G().dcd = 0; return PP.bat.bolt(x || 1, y || 0); },
    input(dx, dy) { if (G()) G().testIn = (dx || dy) ? { x: dx, y: dy } : null; },
    teleport(x, y) { const b = G().bat; b.x = x; b.y = y; b.vx = b.vy = 0; for (let i = 0; i < PP.data.tuning.history; i++) { G().hx[i] = x; G().hy[i] = y; } Kit.cam.x = x; Kit.cam.y = y; },
    energy(v) { G().energy = v; },
    give(what) { if (what === 'pup') { const b = G().bat, p = { x: b.x, y: b.y, hx: 0, hy: 0, state: 'hang', lit: -99, flip: 0, ph: 0, heart: 0 }; L().pups.push(p); PP.run.rescuePup(p); } if (what === 'moth') { G().carried++; } },
    win() { const g = G(), l = L(); if (g && g.sub === 'cave') { g.bat.x = l.W - 60; g.bat.y = l.exitY; PP.run.exitCave(); } },
    lose: () => PP.run.lose(),
    skipNight: () => PP.night.skip(),
    info() {
      const g = G(), l = L();
      if (!g || !l) return null;
      return {
        mode: g.mode, kind: g.kind, sub: g.sub, cave: g.cave, caveId: g.caveDef && g.caveDef.id, bat: g.batId, energy: g.energy, score: g.score, carried: g.carried, pups: g.trail.length,
        x: g.bat.x, y: g.bat.y, vx: g.bat.vx, vy: g.bat.vy, W: l.W, H: l.H, exitY: l.exitY, t: g.t, ct: g.ct, stats: g.stats, coverage: PP.missions.coverage(l),
        moths: l.moths.filter(m => !m.dead).length, pupsLeft: l.pups.filter(p => p.state === 'hang').length, pupsTotal: l.pups.length,
        moons: g.moons.map(m => m.state), hazards: PP.hazards.debug(l), echoes: PP.echo.live(g.t), genMs: g.genMs, web: !!g.bat.web, dash: g.bat.dash,
        scratches: l.scratches.map(s => s.read), owls: l.owls.map(o => o.state), stals: l.stals.map(s => s.state), memory: PP.mem.total,
      };
    },
    path: () => L().path.filter((p, i) => i % 4 === 0).map(p => [Math.round(p.x), Math.round(p.y)]),
    pupList: () => L().pups.map(p => ({ x: p.x, y: p.y, state: p.state, deep: p.deep, answer: p.answer })),
    echoNear: (x, y, r) => PP.echo.near(x, y, r, G().t),
    // generate every campaign cave and report its numbers
    genAll() {
      return PP.game.allCaves().map(cv => {
        const t0 = performance.now(), lv = PP.gen.cave(PP.gen.caveSpec(cv));
        return { id: cv.id, ms: Math.round(performance.now() - t0), W: lv.W, H: lv.H, moths: lv.moths.length, pups: lv.pups.length, wantPups: (cv.pups || []).length, hazards: { webs: lv.webs.length, stals: lv.stals.length, drips: lv.drips.length, rivers: lv.rivers.length, scratches: lv.scratches.length, collapse: !!lv.collapse }, survey: lv.survey.total };
      });
    },
    // fly a cave with the bot; returns what happened (sync: steps the simulation without real time)
    botRun(id, goals, maxSec, bat) {
      const cv = PP.game.caveById(id) || (id === 'practice' ? PP.game.practiceCave() : null);
      PP.run.flags.autopilot = true; PP.run.flags.botGoals = goals || {};
      PP.game.begin({ kind: 'campaign', cave: cv, bat: bat || 'pip' });
      const g = G();
      g.tut = 0;
      let n = 0;
      const lim = (maxSec || 240) * 60;
      while (n < lim && g.sub !== 'done' && g.sub !== 'exit') { PP.loop.step(30); n += 30; }
      while (g.sub === 'exit' && n < lim + 600) { PP.loop.step(30); n += 30; }
      PP.run.flags.autopilot = false;
      const r = g.results || {};
      return { id, won: !!r.won, time: +(g.stats.time || 0).toFixed(1), moonsRun: r.moonsThisRun || g.moons.map(m => m.state === 'won'), moonStates: g.moons.map(m => m.state + (m.why ? ':' + m.why : '')), stats: g.stats, pupsHome: g.pupsHome, pupsTotal: L().pups.length, coverage: PP.missions.coverage(L()), energy: Math.round(g.energy), banked: r.banked, sub: g.sub, x: Math.round(g.bat.x), W: L().W, pupsLeft: L().pups.filter(p => p.state === 'hang').map(p => [Math.round(p.x), Math.round(p.y), p.deep]), wps: g.bot ? g.bot.wps.map(w => w.kind + (w.giveUp ? '!' : '') + '@' + Math.round(w.x) + ',' + Math.round(w.y)) : [] };
    },
  });
  Kit.debug && console.log('[pipistrelle] debug hooks on window.__ppTest');
})();
