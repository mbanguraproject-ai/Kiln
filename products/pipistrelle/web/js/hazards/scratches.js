/* Old Scratches: lore scratched into the stone by the old colony, readable only inside echo dots. Fly close to a
 * scratch while your echo still lights it and it is kept in the Journal. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;

  HZ.def('scratches', {
    always: true,
    place(lv, r, cfg, Q) {
      const sc = lv.sp.scratch;
      if (!sc) return;
      let base = null;
      if (sc.at === 'chamber') base = Q.takeChamber() || Q.pathAt(0.5);
      else base = Q.pathAt(sc.at || 0.5);
      // find a wall: try straight up, then the sides
      let best = null;
      for (const [dx, dy] of [[0, -1], [0.7, -0.7], [-0.7, -0.7], [1, 0], [-1, 0], [0, 1]]) {
        for (let d = 8; d < 360; d += 4) {
          const x = base.x + dx * d, y = base.y + dy * d;
          if (Q.isSolid(x, y)) { if (!best || d < best.d) best = { x: x - dx * 10, y: y - dy * 10, nx: -dx, ny: -dy, d }; break; }
        }
      }
      if (!best) return;
      const g = [];
      // three claw rakes and a handful of tally marks, the old colony's hand
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * 16, a = r.range(-0.5, 0.5);
        for (let c = 0; c < 3; c++) g.push([ox + c * 4 + Math.cos(a) * -8, Math.sin(a) * -8 - 6, ox + c * 4 + Math.cos(a) * 9, Math.sin(a) * 9 + 6]);
      }
      for (let k = 0; k < 5; k++) { const x = -18 + k * 9; g.push([x, 12, x + 2, 20]); }
      g.push([-22, 22, 24, 22]);
      lv.scratches.push({ id: lv.sp.id, x: best.x, y: best.y, nx: best.nx, ny: best.ny, text: sc.text, glyph: g, lit: -99, read: false });
    },
    update(dt, G, L) {
      const b = G.bat;
      for (const s of L.scratches) {
        if (s.read || b.dead) continue;
        if (dist(b.x, b.y, s.x, s.y) < 150 && PP.R.litA(s.lit, G.t) > 0.15) {
          s.read = true;
          PP.emit('scratch', s);
          PP.sfx('chime', { pitch: -5 });
          PP.run.toast('Old Scratch', '“' + s.text + '”', 5);
        }
      }
    },
    ping(E) {
      for (const s of PP.L.scratches) {
        const d = dist(E.ox, E.oy, s.x, s.y);
        if (d > E.R || !PP.world.visibleFrom(E.ox, E.oy, s.x + s.nx * 6, s.y + s.ny * 6)) continue;
        const ta = E.t0 + d / E.speed;
        s.lit = ta;
        for (const ln of s.glyph) for (let k = 0; k <= 3; k++) { const f = k / 3; E.addDot(s.x + ln[0] + (ln[2] - ln[0]) * f, s.y + ln[1] + (ln[3] - ln[1]) * f, ta + 0.02 + f * 0.02, CH.LORE, 0.42); }
      }
    },
    draw(ctx, t, V) {
      for (const s of PP.L.scratches) {
        if (!V.inView(s.x, s.y, 40)) continue;
        const a = PP.R.litA(s.lit, t);
        if (a <= 0.02) continue;
        PP.R.glow(ctx, s.x, s.y, 46, PP.COL[CH.LORE], 0.12 * a);
        if (s.read) { ctx.globalAlpha = a * 0.7; Kit.gfx.text(ctx, '✦', s.x, s.y - 30, { size: 10, color: PP.COL[CH.LORE], font: 'body', world: true }); ctx.globalAlpha = 1; }
      }
    },
    debug: L => L.scratches.length,
  });
})();
