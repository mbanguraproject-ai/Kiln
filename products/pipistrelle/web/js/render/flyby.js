/* Bats flying by (the owner, 14 October: "don't other bats come fly by?"). Now and then a flock of the colony's
 * bats, of every species, sweeps through the passage you are in: faster than you, following the cave's main route
 * so they never fly through stone, eyes glowing, chittering as they pass. Chirp near them and they call back.
 * Purely a sight and a sound: they never touch the simulation, so they draw from the renderer's clock and their own
 * random numbers, and seeded caves, Moons and tests are unaffected. Behind the title they come by more often. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R;
  const FB = R.flyby = { flocks: [], next: 6, last: 0, cave: null };
  const rnd = Kit.rng(97531);

  // a point on the main route at a fractional index, and the direction across it
  function along(path, f, out) {
    const n = path.length - 1, i = Math.max(0, Math.min(n - 1, Math.floor(f))), k = Math.max(0, Math.min(1, f - i));
    const a = path[i], b = path[i + 1];
    out.x = a.x + (b.x - a.x) * k; out.y = a.y + (b.y - a.y) * k;
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out.nx = -dy / l; out.ny = dx / l;
    return out;
  }
  const P0 = { x: 0, y: 0, nx: 0, ny: 0 };

  function spawn(L, V, attract) {
    const path = L.path, dir = rnd.chance(0.6) ? 1 : -1;
    // enter just off the screen's edge, on the route
    const edge = dir > 0 ? V.x0 - 160 : V.x1 + 160;
    let best = 0, bd = Infinity;
    for (let i = 0; i < path.length; i += 3) { const d = Math.abs(path[i].x - edge) + Math.abs(path[i].y - (V.y0 + V.y1) / 2) * 0.3; if (d < bd) { bd = d; best = i; } }
    const n = rnd.int(attract ? 3 : 2, 6), bats = [], looks = PP.data.bats;
    for (let k = 0; k < n; k++) {
      bats.push({ lag: k * rnd.range(7, 12), off: rnd.range(-0.45, 0.45), bob: rnd.range(0, 6), sc: rnd.range(0.85, 1.25), flap: rnd.range(13, 17), look: looks[rnd.int(0, looks.length - 1)].look, x: 0, y: 0 });
    }
    FB.flocks.push({ f: best, dir, speed: rnd.range(300, 380), bats, called: false, answer: -9 });
  }

  // called once a frame from the cave renderer, in world space after the echoes
  R.drawFlyby = function (ctx, V, t) {
    const G = PP.G, L = PP.L;
    if (!G || !L || !L.path || L.path.length < 4) return;
    if (FB.cave !== L) { FB.cave = L; FB.flocks.length = 0; FB.next = 4 + rnd.range(0, 6); FB.last = t; }
    let dt = t - FB.last;
    FB.last = t;
    if (!(dt > 0) || dt > 0.25) dt = 0;
    const attract = G.mode === 'attract';
    if (G.sub === 'cave' && (FB.next -= dt) <= 0) {
      FB.next = attract ? rnd.range(5, 9) : rnd.range(12, 25);
      if (FB.flocks.length < 2) spawn(L, V, attract);
    }
    const b = G.bat;
    for (let i = FB.flocks.length - 1; i >= 0; i--) {
      const F = FB.flocks[i];
      F.f += F.dir * F.speed * dt / 8; // the route is sampled every 8 px
      let seen = false;
      for (let k = 0; k < F.bats.length; k++) {
        const B = F.bats[k], fi = F.f - F.dir * B.lag;
        along(L.path, fi, P0);
        const p = L.path[Math.max(0, Math.min(L.path.length - 1, Math.round(fi)))], w = (p ? p.r : 80) * 0.75;
        B.x = P0.x + P0.nx * w * B.off; B.y = P0.y + P0.ny * w * B.off + Math.sin(t * 2.3 + B.bob) * 10;
        if (V.inView(B.x, B.y, 120)) seen = true;
      }
      const head = F.bats[0];
      if (!F.called && Math.hypot(head.x - b.x, head.y - b.y) < 520) { F.called = true; PP.sfx('squeak', { pitch: 7, vol: 0.35 }); setTimeout(() => PP.sfx('squeak', { pitch: 9, vol: 0.25 }), 120); }
      if (!seen && (F.f < -20 || F.f > L.path.length + 20 || Math.abs(head.x - (V.x0 + V.x1) / 2) > 2200)) { FB.flocks.splice(i, 1); continue; }
      // the flock, faint warm lights in the dark, eyes glowing; a call when you chirp near them
      const ans = t - F.answer;
      for (let k = 0; k < F.bats.length; k++) {
        const B = F.bats[k];
        if (!V.inView(B.x, B.y, 90)) continue;
        R.glow(ctx, B.x, B.y, 26, PP.P.warm, 0.13);
        if (ans >= 0 && ans < 0.8) R.glow(ctx, B.x, B.y, 40, PP.P.pink, 0.35 * (1 - ans / 0.8));
        ctx.globalAlpha = 0.9;
        R.drawBat(ctx, { x: B.x, y: B.y, vx: F.dir * F.speed, face: F.dir, flap: t * B.flap + B.bob, glide: 0, blink: 1, rim: ans >= 0 && ans < 0.8 ? 0.6 : 0.15 }, t, 1.15 * B.sc, B.look, { glow: false, still: true });
        ctx.globalAlpha = 1;
      }
    }
  };

  // chirp near a flock and it calls back
  PP.on('chirp', () => {
    const G = PP.G;
    if (!G || !G.bat) return;
    for (const F of FB.flocks) {
      const h = F.bats[0];
      if (Math.hypot(h.x - G.bat.x, h.y - G.bat.y) < 420 && G.t - F.answer > 1.2) {
        F.answer = G.t + 0.15;
        setTimeout(() => PP.sfx('squeak', { pitch: 11, vol: 0.3 }), 150);
      }
    }
  });
})();
