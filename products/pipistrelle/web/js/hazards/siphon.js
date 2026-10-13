/* Siphons (the Drowned Halls): holes in a river's bed that drain it. Skim the water within 90 px above one and it
 * pulls you down (up to 620 px/s², escapable by flying up). Its tell, before you are close: a column of rising
 * bubbles, a sucking gurgle, and echoes that circle down into it, blue for the water and red at the hole.
 * Skimmer's Skim ignores siphons, as it ignores currents.
 *
 * Cavefish (ambient life): pale blind fish in every river and flood basin of a biome with `ambient.fish`. They are
 * dark until an echo reaches them, then flash silver and scatter. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;
  const REACH = 90, HALF = 64;

  HZ.def('siphon', {
    place(lv, r, cfg) {
      const n = cfg.n || 1;
      for (const rv of lv.rivers) {
        if (lv.siphons.length >= n * lv.rivers.length) break;
        const span = rv.x1 - rv.x0;
        if (span < 200) continue;
        for (let k = 0; k < (cfg.perRiver || 1); k++) {
          const x = rv.x0 + span * r.range(0.3, 0.7) + k * 120;
          if (x > rv.x1 - 60) break;
          lv.siphons.push({ x, y: rv.y, rv, ph: r.range(0, 6), lit: -99, gurgle: r.range(0, 1.4), pulled: false, bubbles: [] });
        }
      }
    },
    steer(dt, b) {
      const L = PP.L, G = PP.G;
      if (!L.siphons.length || PP.bat.ability('skim')) return;
      for (const s of L.siphons) {
        const dx = Math.abs(b.x - s.x), dy = s.y - b.y;
        const inside = dx < HALF && dy > -4 && dy < REACH;
        if (inside) {
          const f = (1 - dx / HALF) * (1 - Math.max(0, dy) / REACH * 0.6);
          b.vy += 620 * f * dt;
          b.vx += (s.x - b.x) / HALF * 160 * f * dt;
          if (!s.pulled) { s.pulled = true; PP.emit('siphon', s); PP.caption('glug', s.x, s.y, CH.HAZ); PP.sfx('gurgle', { vol: 1, pan: HZ.pan(s.x) }); PP.haptic(12); }
        } else if (dx > HALF * 1.6 || dy > REACH * 1.8) s.pulled = false;
        if (G.mode !== 'play') s.pulled = false;
      }
    },
    update(dt, G, L) {
      const b = G.bat;
      for (const s of L.siphons) {
        if (s.bubbles.length < 14 && G.fxr.chance(0.35)) s.bubbles.push({ x: s.x + G.fxr.range(-18, 18), y: s.y + G.fxr.range(10, 60), vy: -G.fxr.range(30, 70), r: G.fxr.range(1, 2.6) });
        for (const p of s.bubbles) { p.y += p.vy * dt; p.x += (s.x - p.x) * 0.6 * dt; }
        PP.compact(s.bubbles, p => p.y > s.y - 2);
        if ((s.gurgle -= dt) <= 0) {
          s.gurgle = 1.4 + G.fxr.range(0, 0.6);
          const d = dist(b.x, b.y, s.x, s.y);
          if (d < 520) { PP.sfx('gurgle', { vol: Math.max(0.2, 1 - d / 520) * 0.7, pan: HZ.pan(s.x) }); if (d < 380) PP.caption('gurgle', s.x, s.y, CH.WATER); }
        }
      }
    },
    ping(E) {
      for (const s of PP.L.siphons) {
        const d = dist(E.ox, E.oy, s.x, s.y);
        if (d >= E.R) continue;
        s.lit = E.t0 + d / E.speed;
        // a ring of echoes spiralling down into the hole
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * PP.TAU, rr = 34 - k * 3;
          E.addDot(s.x + Math.cos(a) * rr, s.y + 4 + Math.sin(a) * rr * 0.3 + k * 2, s.lit + k * 0.03, CH.WATER, 0.6);
        }
        E.addDot(s.x, s.y + 6, s.lit + 0.28, CH.HAZ, 1.2);
      }
    },
    draw(ctx, t, V) {
      const L = PP.L, b = PP.G.bat;
      if (!L.siphons.length) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const s of L.siphons) {
        if (!V.inView(s.x, s.y, 120)) continue;
        const near = Math.max(0, 1 - dist(b.x, b.y, s.x, s.y) / 260), lit = PP.R.litA(s.lit, t), a = Math.max(near * 0.8, lit);
        // the bubbles always show a little: the tell you can see before you hear it
        ctx.fillStyle = '#bcd6ff';
        for (const p of s.bubbles) { ctx.globalAlpha = 0.18 + 0.5 * a; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, PP.TAU); ctx.fill(); }
        if (a > 0.03) {
          ctx.strokeStyle = PP.P.water;
          ctx.lineWidth = V.minW(1.4);
          for (let k = 0; k < 3; k++) {
            const ph = t * 2.2 + k * 2.1 + s.ph, rr = 30 - ((t * 18 + k * 10) % 30);
            ctx.globalAlpha = a * 0.5 * (rr / 30);
            ctx.beginPath(); ctx.ellipse(s.x, s.y + 3, rr + 4, (rr + 4) * 0.28, 0, ph, ph + 4.2); ctx.stroke();
          }
          PP.R.glow(ctx, s.x, s.y + 8, 22, PP.P.red, 0.25 * a);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    debug: L => L.siphons.length,
  });

  HZ.def('fish', {
    always: true,
    place(lv, r) {
      const B = PP.biome(lv.biome);
      if (!B.ambient || !B.ambient.fish) return;
      for (const rv of lv.rivers) {
        const n = Math.max(3, Math.round((rv.x1 - rv.x0) / 70));
        for (let k = 0; k < n; k++) {
          const depth = r.range(14, 70), x = r.range(rv.x0 + 10, rv.x1 - 10);
          if (lv.type[Math.floor((rv.y + depth) / PP.CELL) * lv.cols + Math.floor(x / PP.CELL)] !== 2) continue; // only in the water
          lv.fish.push({ rv, x, y: rv.y + depth, home: rv.y + depth, dir: r.chance(0.5) ? 1 : -1, sp: r.range(14, 30), ph: r.range(0, 6), lit: -99, dart: 0, s: r.range(0.8, 1.3) });
        }
      }
    },
    update(dt, G, L) {
      const b = G.bat;
      for (const f of L.fish) {
        const rv = f.rv;
        if (f.dart > 0) f.dart -= dt;
        const sp = f.sp * (f.dart > 0 ? 6 : 1);
        f.x += f.dir * sp * dt;
        if (f.x < rv.x0 + 8) { f.x = rv.x0 + 8; f.dir = 1; }
        if (f.x > rv.x1 - 8) { f.x = rv.x1 - 8; f.dir = -1; }
        f.y = f.home + Math.sin(G.t * 1.3 + f.ph) * 4;
        // a bat skimming above startles them
        if (f.dart <= 0 && Math.abs(b.x - f.x) < 60 && b.y > rv.y - 50 && b.y < rv.y + 10) { f.dart = 0.8; f.dir = b.x < f.x ? 1 : -1; }
      }
    },
    ping(E) {
      for (const f of PP.L.fish) {
        const d = dist(E.ox, E.oy, f.x, f.y);
        if (d >= E.R) continue;
        f.lit = E.t0 + d / E.speed;
        f.dart = 0.6 + (f.ph % 0.4);
        f.dir = f.x > E.ox ? 1 : -1;
      }
    },
    draw(ctx, t, V) {
      const L = PP.L, b = PP.G.bat;
      if (!L.fish.length) return;
      for (const f of L.fish) {
        if (!V.inView(f.x, f.y, 20)) continue;
        const a = Math.max(PP.R.litA(f.lit, t), Math.max(0, 1 - dist(b.x, b.y, f.x, f.y) / 120) * 0.6);
        if (a < 0.03) continue;
        const L2 = 9 * f.s, wig = Math.sin(t * (f.dart > 0 ? 22 : 8) + f.ph) * 0.35;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(f.dir, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#dfe9f5';
        ctx.beginPath(); ctx.ellipse(0, 0, L2, L2 * 0.32, 0, 0, PP.TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-L2 * 0.8, 0); ctx.lineTo(-L2 * 1.5, -L2 * 0.4 + wig * 4); ctx.lineTo(-L2 * 1.5, L2 * 0.4 + wig * 4); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        PP.R.glow(ctx, f.x, f.y, 14, '#cfe2ff', 0.35 * a);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    },
    debug: L => L.fish.length,
  });
})();
