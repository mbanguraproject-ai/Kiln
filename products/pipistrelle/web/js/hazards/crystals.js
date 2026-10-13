/* Crystals: crystal rock (cell type 3) that answers an echo a second time, 0.42 s later, from the cluster. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CELL = PP.CELL, HZ = PP.hazards;
  const { dist } = Kit;

  function addCrystals(lv, r, cx, cy, rad) {
    const { cols, rows, type } = lv;
    const cl = { x: cx, y: cy, r: rad, lit: -99, shards: [] };
    const i0 = Math.max(1, Math.floor((cx - rad) / CELL)), i1 = Math.min(cols - 2, Math.floor((cx + rad) / CELL));
    const j0 = Math.max(1, Math.floor((cy - rad) / CELL)), j1 = Math.min(rows - 2, Math.floor((cy + rad) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const id = j * cols + i;
      if (type[id] !== 1 || dist((i + 0.5) * CELL, (j + 0.5) * CELL, cx, cy) > rad) continue;
      let edge = false;
      for (const k of [id - 1, id + 1, id - cols, id + cols]) if (type[k] === 0) edge = true;
      if (!edge) continue;
      type[id] = 3;
      if (r.chance(0.42)) {
        let ax = 0, ay = 0;
        for (const [k, dx, dy] of [[id - 1, -1, 0], [id + 1, 1, 0], [id - cols, 0, -1], [id + cols, 0, 1]]) if (type[k] === 0) { ax += dx; ay += dy; }
        const a0 = Math.atan2(ay, ax);
        for (let n = r.int(1, 3); n > 0; n--) cl.shards.push({ x: (i + 0.5) * CELL + r.range(-3, 3), y: (j + 0.5) * CELL + r.range(-3, 3), a: a0 + r.range(-0.6, 0.6), len: r.range(9, 24), w: r.range(4, 7.5) });
      }
    }
    lv.crystals.push(cl);
    return cl;
  }
  PP.gen.addCrystals = addCrystals;

  // a hexagonal prism seen from the side: a body, a pointed cap, and one bright facet
  function paintShards(g, cl, a, lit) {
    const dark = lit ? '#7a5cf0' : '#2c2457', hi = lit ? '#e6dcff' : '#5b4aa6';
    for (const s of cl.shards) {
      const cx = Math.cos(s.a), cy = Math.sin(s.a), nx = -cy, ny = cx, w = s.w * 0.55;
      const bx = s.x - cx * 6, by = s.y - cy * 6, mx = s.x + cx * s.len * 0.72, my = s.y + cy * s.len * 0.72, tx = s.x + cx * s.len, ty = s.y + cy * s.len;
      g.fillStyle = Kit.gfx.alpha(dark, a * (lit ? 0.8 : 1));
      g.beginPath(); g.moveTo(bx + nx * w, by + ny * w); g.lineTo(mx + nx * w, my + ny * w); g.lineTo(tx, ty); g.lineTo(mx - nx * w, my - ny * w); g.lineTo(bx - nx * w, by - ny * w); g.closePath(); g.fill();
      g.fillStyle = Kit.gfx.alpha(hi, a * (lit ? 0.85 : 0.7));
      g.beginPath(); g.moveTo(bx + nx * w * 0.15, by + ny * w * 0.15); g.lineTo(mx + nx * w * 0.15, my + ny * w * 0.15); g.lineTo(tx, ty); g.lineTo(mx + nx * w, my + ny * w); g.lineTo(bx + nx * w, by + ny * w); g.closePath(); g.fill();
    }
  }
  PP.paintShards = paintShards;
  // how lit a cluster is: an echo's life by default; a biome with crystalHold keeps it glowing that long, dimming slowly
  function litOf(cl, t) {
    const hold = PP.biome(PP.L.biome).crystalHold;
    if (!hold) return PP.R.litA(cl.lit, t);
    const a = t - cl.lit;
    return a < 0 ? 0 : a < 0.1 ? 1 : Math.max(0, 1 - Math.pow((a - 0.1) / hold, 1.6));
  }

  HZ.def('crystal', {
    phase: 'terrain',
    place(lv, r, cfg, Q) {
      const ch = cfg.chamber !== false && lv.chambers.length ? lv.chambers[r.int(0, lv.chambers.length - 1)] : null;
      if (ch) addCrystals(lv, r, ch.x, ch.y, ch.r + 34);
      else { const p = Q.pathAt(0.5); addCrystals(lv, r, p.x, p.y, p.r + 40); }
      for (let k = 0; k < (cfg.patches === undefined ? 2 : cfg.patches); k++) { const p = Q.pathAt(r.range(0.2, 0.85)); addCrystals(lv, r, p.x, p.y, p.r * 0.9 + 30); }
    },
    update(dt, G) {
      for (let i = G.reechoes.length - 1; i >= 0; i--) {
        const re = G.reechoes[i];
        if (G.t < re.at) continue;
        G.reechoes.splice(i, 1);
        PP.echo.sonar(re.cl.x, re.cl.y, 320, 150, 'crystal');
        PP.sfx('chime', { pan: HZ.pan(re.cl.x) });
        PP.caption('chime', re.cl.x, re.cl.y, PP.CH.CRYS);
        Kit.fx.burst(re.cl.x, re.cl.y, { count: 20, color: [PP.P.crystal, '#ffffff', PP.P.gold], glow: true, shape: 'star', size: [1.5, 3.5], speed: [30, 140], life: [0.5, 1] });
      }
    },
    holes(hole, t) { for (const cl of PP.L.crystals) { const a = litOf(cl, t); if (a > 0) hole(cl.x, cl.y, cl.r * 1.3, a * 0.45); } },
    draw(ctx, t, V) {
      for (const cl of PP.L.crystals) {
        if (!V.inView(cl.x, cl.y, cl.r + 30)) continue;
        const a = litOf(cl, t);
        if (a <= 0) continue;
        ctx.globalCompositeOperation = 'lighter';
        for (const s of cl.shards) {
          const tw = 0.6 + 0.4 * Math.sin(t * 6 + s.x * 0.1);
          PP.R.glow(ctx, s.x + Math.cos(s.a) * s.len * 0.6, s.y + Math.sin(s.a) * s.len * 0.6, 12 + s.len * 0.5, PP.P.crystal, 0.35 * a * tw);
        }
        ctx.globalAlpha = a;
        paintShards(ctx, cl, 1, true);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    debug: L => L.crystals.length,
  });
})();
