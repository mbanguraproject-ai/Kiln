/* Water: rivers and floods (basins of type-2 cells with a current along the surface) and drips (drip clocks:
 * a landing drop paints a 90 px mini-sonar). */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CELL = PP.CELL, CH = PP.CH, HZ = PP.hazards;
  const { clamp, dist } = Kit;

  function addRiver(lv, r, Q, f, level, flood) {
    const { path, type } = lv, cols = Q.cols, N = Q.N, q = Q.q;
    for (let attempt = 0; attempt < 7; attempt++) {
      let ci = clamp(Math.floor((f + (attempt % 2 ? 1 : -1) * attempt * 0.05) * path.length), 60, path.length - 61);
      const k0 = ci - 60, k1 = ci + 60;
      for (let k = k0; k <= k1; k++) if (path[k].y > path[ci].y) ci = k;
      const p = path[ci], surf = p.y + p.r * level, sj0 = Math.floor(surf / CELL) + 1, pi = Math.floor(p.x / CELL);
      if (p.x < 400 || p.x > lv.W - 500) continue;
      const s0 = sj0 * cols + pi;
      if (type[s0] !== 0) continue;
      const sn = new Uint8Array(N), cells = [];
      let h = 0, tl = 0, bad = false, minI = pi, maxI = pi;
      q[tl++] = s0; sn[s0] = 1;
      while (h < tl) {
        const id = q[h++], i = id % cols;
        cells.push(id);
        if (Math.abs(i - pi) * CELL > 340 || cells.length > 2600) { bad = true; break; }
        minI = Math.min(minI, i); maxI = Math.max(maxI, i);
        for (const k of [id - 1, id + 1, id - cols, id + cols]) {
          if (k < 0 || k >= N || sn[k] || type[k] !== 0) continue;
          if (Math.floor(k / cols) < sj0) continue;
          sn[k] = 1; q[tl++] = k;
        }
      }
      if (bad || cells.length < 40 || (maxI - minI) * CELL < 140) continue;
      for (const id of cells) type[id] = 2;
      if (!Q.passable()) { for (const id of cells) type[id] = 0; continue; }
      const rv = { x0: minI * CELL + CELL, x1: maxI * CELL, y: sj0 * CELL, dir: r.chance(0.5) ? 1 : -1, speed: flood ? 70 : 105 + Math.min(60, ((lv.n || 4) - 4) * 8), flood: !!flood, ph: r.range(0, 9) };
      lv.rivers.push(rv);
      return rv;
    }
    return null;
  }

  // cfg.at: one [from, to] range along the path, or a list of them for several rivers
  HZ.def('river', {
    phase: 'terrain',
    place(lv, r, cfg, Q) {
      const at = cfg.at || [0.3, 0.42], list = Array.isArray(at[0]) ? at : [at];
      for (const a of list) addRiver(lv, r, Q, r.range(a[0], a[1]), cfg.level === undefined ? 0.38 : cfg.level, false);
    },
  });
  HZ.def('flood', {
    phase: 'terrain',
    place(lv, r, cfg, Q) {
      const at = cfg.at || [0.62, 0.74];
      const rv = addRiver(lv, r, Q, r.range(at[0], at[1]), cfg.level === undefined ? 0.1 : cfg.level, true);
      if (rv) for (let xx = rv.x0 + 40; xx < rv.x1 - 30; xx += r.range(70, 110)) {
        const c = Q.ceilingAbove(xx, rv.y - 20, 600);
        if (c !== null && rv.y - c > 70) lv.drips.push({ x: xx, y0: c + 4, y1: rv.y, period: r.range(1.3, 2), ph: r.range(0, 2), drop: null, glint: 0, lit: -99, water: true });
      }
    },
    // the current drags along the surface (Skimmer's Skim ignores it)
    steer(dt, b) {
      const rv = PP.world.riverAt(b.x);
      if (!rv || PP.bat.ability('skim')) return;
      if (b.y > rv.y - 80 && b.y < rv.y) { b.vx += rv.dir * rv.speed * 2.6 * dt; b.vy += 30 * dt; }
    },
    draw(ctx, t, V) {
      const L = PP.L, b = PP.G.bat;
      for (const rv of L.rivers) {
        if (rv.x1 < V.x0 || rv.x0 > V.x1) continue;
        const near = Math.max(0, 1 - Math.abs(b.y - rv.y) / 260);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = PP.P.water;
        ctx.lineWidth = V.minW(1.2);
        for (let k = 0; k < 3; k++) {
          ctx.globalAlpha = 0.05 + 0.08 * near + (k === 0 ? 0.05 : 0);
          ctx.beginPath();
          for (let x = Math.max(rv.x0, V.x0); x <= Math.min(rv.x1, V.x1); x += 8) ctx.lineTo(x, rv.y + 2 + k * 7 + Math.sin(x * 0.05 + t * 2 * rv.dir + k * 2) * 1.6);
          ctx.stroke();
        }
        ctx.fillStyle = '#9cc0ff';
        for (let k = 0; k < 26; k++) {
          const span = rv.x1 - rv.x0, px = rv.x0 + Kit.wrap(k * 97.3 + t * rv.speed * 0.8 * rv.dir, 0, span), py = rv.y - 4 - (k * 13.7) % 46;
          if (px < V.x0 || px > V.x1) continue;
          ctx.globalAlpha = (0.1 + 0.25 * near) * (1 - (rv.y - py) / 60);
          ctx.fillRect(px, py, 5, V.minW(1));
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    debug: L => L.rivers.length,
  });

  HZ.def('drips', {
    place(lv, r, cfg, Q) {
      const [i0, i1] = HZ.range(lv, cfg, 0.2, 0.8), n = cfg.n || 4;
      let lastX = -999;
      for (let i = i0; i < i1 && lv.drips.filter(d => !d.water).length < n; i += r.int(14, 30)) {
        const p = lv.path[i];
        if (p.x - lastX < 220) continue;
        const x = p.x + r.range(-24, 24);
        const c = Q.ceilingAbove(x, p.y, 300), f = Q.floorBelow(x, p.y, 400);
        if (c === null || f === null || f - c < 110) continue;
        lv.drips.push({ x, y0: c + 4, y1: f - 2, period: r.range(1.6, 2.6), ph: r.range(0, 2), drop: null, glint: 0, lit: -99, water: false });
        lastX = p.x;
      }
    },
    update(dt, G, L) {
      const b = G.bat, alive = !b.dead;
      for (const dr of L.drips) {
        const ph = (G.t + dr.ph) % dr.period;
        dr.glint = ph > dr.period - 0.45 ? (ph - (dr.period - 0.45)) / 0.45 : 0;
        if (!dr.drop && ph < dt * 1.5) dr.drop = { y: dr.y0, vy: 0 };
        if (!dr.drop) continue;
        dr.drop.vy += 900 * dt; dr.drop.y += dr.drop.vy * dt;
        if (alive && dist(b.x, b.y, dr.x, dr.drop.y) < b.r + 3) {
          dr.drop = null;
          PP.run.damage(PP.data.tuning.damage.drip, 'drip');
          b.vy += 120; b.stun = Math.max(b.stun, 0.15);
          PP.sfx('squeak', { pitch: 4 }); PP.sfx('drip', { vol: 0.8 });
          Kit.fx.burst(b.x, b.y - 6, { count: 8, color: [PP.P.water, '#cfe0ff'], size: [1, 2], speed: [30, 100], gravity: 300, life: [0.3, 0.5] });
          PP.haptic(10);
        } else if (dr.drop.y >= dr.y1) {
          dr.drop = null;
          G.minis.push({ x: dr.x, y: dr.y1, t0: G.t, R: dr.water ? 34 : 46, c: CH.WATER });
          const d = dist(b.x, b.y, dr.x, dr.y1);
          // a drip clock: the landing drop sends out its own small ring, painting the stone around it
          if (d < 1400) PP.echo.sonar(dr.x, dr.y1 - 6, 90, 48, 'drip');
          if (d < 380) { PP.sfx('drip', { pan: HZ.pan(dr.x), vol: 0.5 }); PP.caption('drip', dr.x, dr.y1, CH.WATER); }
        }
      }
      PP.compact(G.minis, mn => G.t - mn.t0 < 1.2);
    },
    ping(E) {
      for (const dr of PP.L.drips) {
        const d = dist(E.ox, E.oy, dr.x, (dr.y0 + dr.y1) / 2);
        if (d < E.R) { dr.lit = E.t0 + d / E.speed; for (let y = dr.y0 + 10; y < dr.y1; y += 22) E.addDot(dr.x, y, dr.lit + 0.01, CH.WATER, 0.4); }
      }
    },
    draw(ctx, t, V) {
      const G = PP.G;
      for (const dr of PP.L.drips) {
        if (!V.inView(dr.x, (dr.y0 + dr.y1) / 2, (dr.y1 - dr.y0) / 2 + 40)) continue;
        if (dr.glint > 0) PP.R.glow(ctx, dr.x, dr.y0 + 3, 6 + dr.glint * 6, '#9cc0ff', 0.35 + dr.glint * 0.5);
        if (dr.drop) { PP.R.glow(ctx, dr.x, dr.drop.y, 9, '#9cc0ff', 0.75); ctx.fillStyle = '#d7e6ff'; ctx.fillRect(dr.x - V.minW(1), dr.drop.y - 3, V.minW(2), 5); }
      }
      for (const mn of G.minis) {
        const a = (t - mn.t0) / 1.2, rad = mn.R * Kit.ease.cubicOut(Math.min(1, a * 1.4));
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = PP.COL[mn.c]; ctx.globalAlpha = (1 - a) * 0.6; ctx.lineWidth = V.minW(1.5);
        ctx.beginPath(); ctx.ellipse(mn.x, mn.y, rad, rad * 0.28, 0, 0, PP.TAU); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    },
    debug: L => L.drips.length,
  });
})();
