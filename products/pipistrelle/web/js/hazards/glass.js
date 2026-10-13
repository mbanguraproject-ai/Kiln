/* The Glass Vaults' two new things to listen for.
 *
 * Tiger moths (food, gold like every moth): they click back at a bat's call and scramble its echoes. Every echo that
 * lands within 120 px of a living tiger moth comes back jittered, unmapped and doubled, so you find them by the
 * scramble itself. Eating one ends its jamming. (js/echo.js asks PP.jamAt for each ray.)
 *
 * Crystal bells: pups in this biome can be sealed in amber. Each sealed pup has a bell, a pitched crystal cluster
 * on the wall near it. Ring the bell with an echo (a chirp or a shriek that reaches it, or a crystal's re-echo)
 * and the amber cracks: the pup answers and can be taken home. Bells ring in the biome's key, so a run plays a
 * small tune. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;
  const JAM = 120;

  // ---- tiger moths ----
  PP.jamAt = function (x, y) {
    const L = PP.L;
    if (!L || !L.tigers || !L.tigers.length) return 0;
    let best = 0;
    for (const m of L.tigers) {
      if (m.dead) continue;
      const d = dist(x, y, m.x, m.y);
      if (d < JAM) best = Math.max(best, 1 - d / JAM);
    }
    return best;
  };
  HZ.def('tiger', {
    place(lv, r, cfg) {
      const n = cfg.n || 4, [i0, i1] = HZ.range(lv, cfg, 0.15, 0.92);
      lv.tigers = [];
      // turn moths along the stretch into tiger moths, spread out, and add more if the stretch has too few
      const pool = lv.moths.filter(m => { let bi = 0, bd = 1e18; for (let i = i0; i < i1; i += 6) { const p = lv.path[i], d = (p.x - m.hx) ** 2 + (p.y - m.hy) ** 2; if (d < bd) { bd = d; bi = i; } } return bd < 200 * 200; });
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      for (const m of pool) {
        if (lv.tigers.length >= n) break;
        if (lv.tigers.some(t => dist(t.hx, t.hy, m.hx, m.hy) < 260)) continue;
        m.tiger = true; m.sp *= 1.3; m.click = r.range(0, 1.2);
        lv.tigers.push(m);
      }
      for (let k = 0; lv.tigers.length < n && k < 40; k++) {
        const p = lv.path[Math.floor(i0 + (i1 - i0) * r.next())];
        if (lv.tigers.some(t => dist(t.hx, t.hy, p.x, p.y) < 260)) continue;
        const m = PP.gen.newMoth(p.x + r.range(-30, 30), p.y + r.range(-30, 30), r);
        m.tiger = true; m.sp *= 1.3; m.click = r.range(0, 1.2);
        lv.moths.push(m); lv.tigers.push(m);
      }
    },
    update(dt, G, L) {
      if (!L.tigers || !L.tigers.length) return;
      const b = G.bat;
      for (const m of L.tigers) {
        if (m.dead) continue;
        if ((m.click -= dt) <= 0) {
          m.click = 1.3 + G.fxr.range(0, 0.8);
          const d = dist(b.x, b.y, m.x, m.y);
          if (d < 480) { PP.sfx('tick', { pan: HZ.pan(m.x), vol: Math.max(0.2, 1 - d / 480) * 0.7, pitch: 9 }); if (d < 360) PP.caption('click click', m.x, m.y, CH.MOTH); }
        }
      }
    },
    debug: L => (L.tigers ? L.tigers.filter(m => !m.dead).length : 0),
  });
  PP.on('moth', m => { const G = PP.G; if (m && m.tiger && G && G.mode === 'play') G.stats.tigers = (G.stats.tigers || 0) + 1; });

  // ---- crystal bells ----
  const PITCH = [0, 2, 4, 7, 9, 12];
  HZ.def('bells', {
    // after the pups and crystals are placed (entities phase, registered after them)
    place(lv, r, cfg) {
      lv.bells = [];
      let n = 0;
      for (const p of lv.pups) {
        if (!p.sealed) continue;
        // a wall cell 70-170 px from the pup, with a clear line of air between them, below or beside the pup
        const C = PP.CELL, T = lv.type, cols = lv.cols, oy = p.y + 24;
        const pi = Math.floor(p.x / C), pj = Math.floor(oy / C), R = Math.ceil(170 / C);
        let spot = null, bd = 1e9;
        for (let j = pj - R; j <= pj + R; j++) for (let i = pi - R; i <= pi + R; i++) {
          if (i < 1 || j < 1 || i >= cols - 1 || j >= lv.rows - 1) continue;
          const id = j * cols + i;
          if (T[id] !== 1 || !(T[id - 1] === 0 || T[id + 1] === 0 || T[id - cols] === 0 || T[id + cols] === 0)) continue;
          const x = (i + 0.5) * C, y = (j + 0.5) * C, d = Math.hypot(x - p.x, y - oy);
          if (d < 70 || d > 170) continue;
          const score = Math.abs(d - 110) + (y < p.y - 10 ? 60 : 0) + r.next() * 20;
          if (score < bd && clearLine(lv, p.x, oy, x, y)) { bd = score; spot = { x, y }; }
        }
        if (!spot) { p.sealed = false; continue; } // no wall in reach: the pup is simply free
        const cl = PP.gen.addCrystals(lv, r, spot.x, spot.y, 30);
        cl.bell = true;
        lv.bells.push({ cl, pup: p, pitch: PITCH[n % PITCH.length], rung: false, t: -99 });
        n++;
      }
    },
    update(dt, G, L) {
      if (!L.bells || !L.bells.length) return;
      for (const bl of L.bells) {
        if (bl.rung || bl.cl.lit < 0 || G.t < bl.cl.lit) continue;
        // the echo reached the bell: it rings, and the amber round its pup cracks
        bl.rung = true; bl.t = G.t;
        const p = bl.pup;
        p.sealed = false;
        p.answer = G.t + 0.25;
        PP.sfx('ring', { pitch: bl.pitch, pan: HZ.pan(bl.cl.x), vol: 1 });
        PP.sfx('pupcall', { pan: HZ.pan(p.x), pitch: 1, delay: 300 });
        PP.caption('dong', bl.cl.x, bl.cl.y, CH.CRYS);
        PP.echo.sonar(bl.cl.x, bl.cl.y, 260, 120, 'crystal');
        Kit.fx.burst(p.x, p.y + 4, { count: 22, color: ['#ffc46b', '#ffe3a8', PP.P.pink], glow: true, shape: 'square', size: [1.5, 3.5], speed: [40, 160], spin: [-8, 8], gravity: 220, life: [0.5, 1] });
        PP.emit('bell', bl);
        if (G.mode === 'play') PP.run.toast('A bell rang', 'The amber cracked: a pup is free', 2, '');
      }
    },
    draw(ctx, t, V) {
      const L = PP.L, b = PP.G.bat;
      if (!L.bells || !L.bells.length) return;
      for (const bl of L.bells) {
        const p = bl.pup;
        // the amber round a sealed pup glows faintly whenever the bat is near or an echo lights it
        if (p.sealed && V.inView(p.x, p.y, 40)) {
          const near = Math.max(0, 1 - dist(b.x, b.y, p.x, p.y) / 160), a = Math.max(PP.R.litA(p.lit, t), near) * 0.8 + 0.12;
          ctx.globalCompositeOperation = 'lighter';
          PP.R.glow(ctx, p.x, p.y + 6, 30, '#ffb347', 0.22 * a);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(255,170,60,0.28)';
          ctx.strokeStyle = 'rgba(255,214,150,0.7)';
          ctx.lineWidth = V.minW(1.4);
          ctx.beginPath();
          for (let k = 0; k < 6; k++) { const an = k / 6 * PP.TAU + 0.5; ctx.lineTo(p.x + Math.cos(an) * 17, p.y + 6 + Math.sin(an) * 20); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        // a rung bell keeps a soft shimmer
        const since = t - bl.t;
        if (bl.rung && since < 3 && V.inView(bl.cl.x, bl.cl.y, 80)) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = PP.P.crystal;
          ctx.lineWidth = V.minW(1.6);
          for (let k = 0; k < 3; k++) {
            const f = since / 1.4 - k * 0.2;
            if (f <= 0 || f >= 1) continue;
            ctx.globalAlpha = (1 - f) * 0.5;
            ctx.beginPath(); ctx.arc(bl.cl.x, bl.cl.y, 20 + f * 120, 0, PP.TAU); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    },
    debug: L => (L.bells ? L.bells.map(bl => bl.rung) : []),
  });
  // air all the way from (x0, y0) to within a cell of (x1, y1), on a level still being generated
  function clearLine(lv, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      if (d * (1 - f) < PP.CELL * 1.2) return true;
      const i = Math.floor((x0 + (x1 - x0) * f) / PP.CELL), j = Math.floor((y0 + (y1 - y0) * f) / PP.CELL);
      if (lv.type[j * lv.cols + i] !== 0) return false;
    }
    return true;
  }
})();
