/* The bot: a scripted pilot that proves every cave can be finished and every Moon earned with Pip. It knows the
 * cave (no sonar needed), plans a tour of waypoints from the Moons (pups for Kin, chambers for Survey, moths for
 * Larder), follows a flow field to each, then flies home. The title screen's attract flight uses it too. */
(function () {
  'use strict';
  const PP = window.PP, CELL = PP.CELL;
  const { dist } = window.Kit;

  PP.bot = {
    // goals: { pups, survey, larder, calls (budget), careful (few bumps), fast }
    plan(L, goals) {
      goals = goals || {};
      const wps = [];
      if (goals.pups !== false) for (const p of L.pups) if (p.state === 'hang') wps.push({ kind: 'pup', ref: p, x: p.x, y: p.y + 12 });
      if (goals.survey) {
        for (const c of L.chambers) wps.push({ kind: 'spot', x: c.x, y: c.y });
        for (const br of L.branches) if (br.length) { const q = br[br.length - 1]; wps.push({ kind: 'spot', x: q.x, y: q.y }); }
      }
      if (goals.larder) for (const m of L.moths) if (!m.dead) wps.push({ kind: 'moth', ref: m, x: m.hx, y: m.hy });
      // visit in order along the main path (by nearest path index), so the tour runs left to right
      const pathIdx = w => { let bi = 0, bd = 1e18; for (let i = 0; i < L.path.length; i += 3) { const p = L.path[i], d = (p.x - w.x) ** 2 + (p.y - w.y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
      for (const w of wps) w.pi = pathIdx(w);
      wps.sort((a, b) => a.pi - b.pi);
      const bot = { wps, i: 0, goals, chirpT: 0.4, stuckT: 0, lastX: 0, lastY: 0, lastProg: 0 };
      return bot;
    },
    flowFor(L, w) {
      if (w.flow) return w.flow;
      const c = L.cellOf(w.x, w.y);
      let cell = c;
      if (c < 0 || L.type[c] === 1 || L.type[c] === 3) { const [nx, ny] = PP.world.nearestOpen(w.x, w.y, 1); cell = L.cellOf(nx, ny); w.x = nx; w.y = ny; }
      w.flow = PP.gen.flowField(L, [cell]);
      return w.flow;
    },
    steer(bot, dt) {
      const G = PP.G, L = PP.L, b = G.bat;
      // skip waypoints already done
      while (bot.i < bot.wps.length) {
        const w = bot.wps[bot.i];
        const done = (w.kind === 'pup' && w.ref.state !== 'hang') || (w.kind === 'moth' && w.ref.dead) || (w.kind === 'spot' && dist(b.x, b.y, w.x, w.y) < 60) || w.giveUp;
        if (!done) break;
        bot.i++;
      }
      // chirping: steady by default, rare on a call budget
      const gl = bot.goals;
      bot.chirpT -= dt;
      if (bot.chirpT <= 0) {
        if (gl.calls) { bot.chirpT = gl.callEvery || 9; if (G.stats.calls < gl.calls - 1) PP.bat.chirp(); }
        else { bot.chirpT = gl.survey ? 0.62 : 0.9; PP.bat.chirp(); }
      }
      // wiggle out of webs
      if (b.web) return { x: (Math.floor(G.t * 8) % 2 ? 1 : -1), y: 0 };
      const k = gl.fast ? 0.95 : gl.careful ? 0.62 : 0.78;
      let inp;
      if (bot.i < bot.wps.length) {
        const w = bot.wps[bot.i];
        if (w.kind === 'moth') { w.x = w.ref.x; w.y = w.ref.y; }
        inp = PP.bat.autoSteer(PP.bot.flowFor(L, w), { goal: w, k, noDetour: !gl.larder && w.kind !== 'pup', mothR: gl.larder ? 120 : 90, anyDir: gl.larder });
        // give up on a waypoint after a long while without progress (safety for odd geometry)
        const prog = PP.bot.flowFor(L, w)[L.cellOf(b.x, b.y)];
        if (prog >= 0 && (bot.lastProg === 0 || prog < bot.lastProg - 2)) { bot.lastProg = prog; bot.stuckT = 0; } else bot.stuckT += dt;
        if (bot.stuckT > 12) { w.giveUp = true; bot.stuckT = 0; bot.lastProg = 0; }
      } else {
        inp = PP.bat.autoSteer(L.flow, { k, noDetour: !gl.larder && !gl.detour, mothR: 110 });
      }
      return inp;
    },
  };
})();
