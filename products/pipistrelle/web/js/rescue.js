/* The Last Echo: losing is a moment, not a cut. When the bat runs out of energy or something overtakes it, it falls
 * in slow motion and the cave holds its breath (the world stops while you decide).
 *
 * 1. Second Wind (free, once per attempt): four heartbeats. A pink ring closes on the bat's heart with each beat;
 *    tap (or press Space) as it lands. Three good beats and the bat flies on with a little energy.
 * 2. Fly on? (once per attempt, after a missed or spent Second Wind): watch a rewarded ad to fly on with most of
 *    your energy and a moment of safety, or let the echoes fade. The offer waits 9 s, and never plays an ad by
 *    itself. Without an ad network (a browser build), or with no ad ready, the card says so.
 *
 * Reviving pushes back whatever overtook you (the collapse, the flood, the Grey Lady), so the bat is not caught
 * again the instant it wakes. Moons already lost stay lost: a second chance never earns what the first lost.
 * Practice, the flight home and the title's attract flight never stop for this. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const BEATS = 4, NEED = 3, PERIOD = 0.95, LEAD = 0.9, WINDOW = 0.18, OFFER = 9;
  const beatAt = k => 0.75 + k * PERIOD;

  const R = PP.rescue = {
    can(G) { return G.mode === 'play' && (G.kind === 'campaign' || G.kind === 'nightly' || G.kind === 'endless') && (!G.secondWindUsed || !G.adUsed); },
    start(G) {
      G.sub = 'rescue';
      PP.run.normalTime();
      G.rescue = { stage: G.secondWindUsed ? 'offer' : 'beats', t: 0, beat: 0, hits: 0, marks: [], offerT: OFFER, busy: false, why: G.overtaken ? 'Overtaken' : 'Out of energy' };
      G.hint = null;
      if (G.rescue.stage === 'offer') R.offer(G);
      PP.emit('lastEcho', G.rescue);
    },
    update(dt) {
      const G = PP.G, S = G.rescue, b = G.bat;
      if (!S) return;
      // the bat hangs in the dark, barely moving
      b.vx *= Math.exp(-3 * dt); b.vy = b.vy * Math.exp(-3 * dt) + 6 * dt;
      PP.bat.move(dt);
      b.flap += dt * 2;
      if (S.stage === 'beats') {
        S.t += dt;
        while (S.beat < BEATS && S.t > beatAt(S.beat) + WINDOW) { judge(S, false); }
        // the heart sound lands on each beat, so it can be played by ear
        for (let k = 0; k < BEATS; k++) if (!S['snd' + k] && S.t >= beatAt(k)) { S['snd' + k] = true; PP.sfx('heartbeat', { vol: 0.9 }); }
        if (S.beat >= BEATS && S.t > beatAt(BEATS - 1) + 0.45) {
          if (S.hits >= NEED) R.revive('wind');
          else { G.secondWindUsed = true; S.stage = 'offer'; R.offer(G); }
        }
      } else if (S.stage === 'offer' && !S.busy) {
        S.offerT -= dt;
        if (S.offerT <= 0) R.giveUp();
      }
    },
    // a tap during the heartbeats
    tap() {
      const G = PP.G, S = G && G.rescue;
      if (!S || S.stage !== 'beats' || S.beat >= BEATS) return;
      const d = S.t - beatAt(S.beat);
      if (d < -LEAD) return;                 // no ring yet: ignore
      judge(S, Math.abs(d) <= WINDOW);
    },
    offer(G) {
      G.adUsed = G.adUsed || false;
      if (G.adUsed || !PP.ads.exists()) { R.giveUp(); return; }
      G.hint = null;
      PP.emit('offer', G.rescue);
    },
    watch() {
      const G = PP.G, S = G && G.rescue;
      if (!S || S.stage !== 'offer' || S.busy || !PP.ads.ready()) return;
      S.busy = true;
      G.adUsed = true;
      PP.emit('offerBusy', true);
      PP.ads.show().then(r => {
        if (PP.G !== G || G.sub !== 'rescue') return;
        S.busy = false;
        PP.emit('offerBusy', false);
        if (r.rewarded) R.revive('ad');
        else R.giveUp();
      });
    },
    giveUp() {
      const G = PP.G;
      if (!G || G.sub !== 'rescue') return;
      G.rescue = null;
      G.hint = null;
      G.sub = 'dead';
      G.deadT = 1.7;
      PP.emit('offerClose');
      PP.run.finish(false);
    },
    revive(kind) {
      const G = PP.G, L = PP.L, b = G.bat, Emax = PP.bat.stats().energy;
      G.rescue = null; G.hint = null;
      b.dead = 0; b.stun = 0; b.vx = 0; b.vy = -80;
      G.energy = Emax * (kind === 'ad' ? 0.7 : 0.35);
      G.shield = kind === 'ad' ? 2.5 : 1.6;
      G.overtaken = false; G.deadT = 0;
      G.sub = 'cave';
      if (kind === 'wind') G.secondWindUsed = true;
      G.stats.revives = (G.stats.revives || 0) + 1;
      // push back whatever overtook the bat
      if (L.collapse) { L.collapse.x = Math.min(L.collapse.x, b.x - 650); L.collapse.inside = 0; }
      if (L.tide) { L.tide.x = Math.min(L.tide.x, b.x - 650); L.tide.under = 0; }
      if (L.lady && L.lady.state !== 'perch') { L.lady.state = 'climb'; L.lady.t = 2.5; }
      // never wake inside stone or water
      if (PP.world.hitsWall(b.x, b.y, b.r) || PP.world.typeAt(b.x, b.y) === 2) { const o = PP.world.nearestOpen(b.x, b.y - 30, 1); b.x = o[0]; b.y = o[1]; }
      PP.emit('offerClose');
      PP.emit('revive', kind);
      PP.sfx('pup', { pitch: kind === 'ad' ? 0 : 3 });
      PP.haptic([20, 40, 20]);
      Kit.fx.shockwave(b.x, b.y, { radius: 110, color: PP.P.pink, width: 3, ms: 600, glow: true });
      Kit.fx.burst(b.x, b.y, { count: 22, color: [PP.P.pink, '#ffffff', PP.P.teal], glow: true, size: [1.2, 3], speed: [40, 160], life: [0.5, 1] });
      PP.run.banner(kind === 'ad' ? 'Flying on' : 'Second wind!', kind === 'ad' ? 'A moment of safety, then on' : 'Your heart kept time', 1.8);
      PP.bat.chirp();
    },
  };

  function judge(S, hit) {
    S.marks.push(hit);
    if (hit) {
      S.hits++;
      const b = PP.G.bat;
      Kit.fx.shockwave(b.x, b.y, { radius: 46, color: PP.P.pink, width: 2.5, ms: 380, glow: true });
      PP.haptic(18);
      PP.sfx('pupcall', { pitch: 2 + S.hits * 2, vol: 0.6 });
    } else PP.haptic(6);
    S.beat++;
  }

  // the shield after a revive: nothing hurts for a moment
  PP.on('caveEnter', () => { const G = PP.G; if (G) G.shield = 0; });
})();
