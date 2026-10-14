/* Cave art in 256 px chunks, painted at device resolution (LRU cache, no canvas over 1024 px), so a 4K screen
 * is as crisp as a phone. Rock: marching-squares shapes, the biome's rock gradient, texture and painter (strata,
 * decals), vector rims stroked from the segments, water basins and crystals. Memory: the echoes you have heard,
 * redrawn from the vector store in js/echo.js whenever a chunk is (re)built, and added to as echoes arrive. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, CELL = PP.CELL;
  const CS = 256;
  R.CS = CS;
  // how many chunks of this size fit a memory budget, never fewer than the view needs
  const capFor = (size, mb, need) => Math.max(need + 6, Math.floor(mb * 1e6 / (size * size * 4)));
  const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4];

  // marching-squares edge segments for the whole cave (used for rims and the bat's warm light)
  R.prepCave = function (lv) {
    const { cols, rows, field: F } = lv;
    const segs = [], segStart = new Int32Array(cols * rows + 1);
    const vv = [0, 0, 0, 0], vx = [0, 0, 0, 0], vy = [0, 0, 0, 0], cross = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const sq = j * cols + i;
        segStart[sq] = segs.length / 4;
        vv[0] = F[j * cols + i]; vv[1] = F[j * cols + i + 1]; vv[2] = F[(j + 1) * cols + i + 1]; vv[3] = F[(j + 1) * cols + i];
        const n = (vv[0] >= 0.5) + (vv[1] >= 0.5) + (vv[2] >= 0.5) + (vv[3] >= 0.5);
        if (n === 0 || n === 4) continue;
        const x0 = (i + 0.5) * CELL, y0 = (j + 0.5) * CELL;
        vx[0] = x0; vy[0] = y0; vx[1] = x0 + CELL; vy[1] = y0; vx[2] = x0 + CELL; vy[2] = y0 + CELL; vx[3] = x0; vy[3] = y0 + CELL;
        cross.length = 0;
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) & 3;
          if ((vv[k] >= 0.5) !== (vv[k2] >= 0.5)) { const t = (0.5 - vv[k]) / (vv[k2] - vv[k]); cross.push(vx[k] + (vx[k2] - vx[k]) * t, vy[k] + (vy[k2] - vy[k]) * t); }
        }
        if (cross.length >= 4) segs.push(cross[0], cross[1], cross[2], cross[3]);
        if (cross.length >= 8) segs.push(cross[4], cross[5], cross[6], cross[7]);
      }
      segStart[(j + 1) * cols] = segs.length / 4;
    }
    for (let k = (rows - 1) * cols; k <= cols * rows; k++) segStart[k] = segs.length / 4;
    lv.segs = new Float32Array(segs);
    lv.segStart = segStart;
    rock.clear(); memc.clear();
    R.density = 0; R.memDensity = 0;
    lv.shafts = null;
  };

  // ---- LRU canvas caches ----
  // A spare canvas is kept only while it can be reused at the current size; the rest give their memory back
  // (a zero-size canvas frees its backing store), so the caches never hold more than their budget.
  function lru() {
    const map = new Map(), pool = [];
    const free = c => { c.width = 0; c.height = 0; };
    const spare = c => { if (pool.length < 6) pool.push(c); else free(c); };
    return {
      map,
      get(k) { const v = map.get(k); if (v) { map.delete(k); map.set(k, v); } return v; },
      put(k, v, cap) { map.set(k, v); while (map.size > cap) { const [k0, v0] = map.entries().next().value; map.delete(k0); spare(v0.c); } },
      canvas(size) { for (let i = 0; i < pool.length; i++) if (pool[i].width === size) return pool.splice(i, 1)[0]; return Kit.gfx.offscreen(size, size); },
      clear() { for (const v of map.values()) free(v.c); map.clear(); while (pool.length) free(pool.pop()); },
      drop(k) { const v = map.get(k); if (v) { map.delete(k); spare(v.c); } },
    };
  }
  const rock = lru(), memc = lru();
  R.chunkStats = () => ({ rock: rock.map.size, mem: memc.map.size, density: R.density, memDensity: R.memDensity });

  // density buckets (device px per world px) with hysteresis, capped by the tier: one for rock, one for memory
  function bucket(ppu, cap, cur) {
    let d = STEPS[STEPS.length - 1];
    for (const s of STEPS) if (s >= ppu * 0.92) { d = s; break; }
    d = Math.min(d, cap);
    if (cur && Math.abs(cur - d) / cur < 0.2 && cur <= cap) return cur;
    return d;
  }
  // A change of density does not clear the caches: chunks painted at the old density keep being drawn (scaled)
  // and are repainted one a frame (drawRock, drawMemory), so a resolution step never stalls on a full repaint.
  R.pickDensity = function (ppu) {
    const t = R.quality.tier, d = bucket(ppu, t.rockMax, R.density), dm = bucket(ppu, t.memMax, R.memDensity);
    R.density = d; R.memDensity = dm;
    return d;
  };

  // ---- rock ----
  const texCache = new Map();
  function texture(pal, seed) {
    const k = pal.texture + seed;
    let t = texCache.get(k);
    if (!t) { t = Kit.gfx.noiseTexture(256, 256, { seed, alpha: 0.26, color: pal.texture, scale: 3 }); texCache.set(k, t); }
    return t;
  }
  let grain = null;
  function grainTex() {
    if (grain) return grain;
    grain = Kit.gfx.offscreen(512, 512);
    const g = grain.getContext('2d'), img = g.createImageData(512, 512), r = Kit.rng(91);
    for (let i = 0; i < img.data.length; i += 4) { const n = r.next(); const v = n > 0.5 ? 255 : 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.abs(n - 0.5) * 40; }
    g.putImageData(img, 0, 0);
    return grain;
  }

  function paintRock(c, ci, cj, d) {
    const lv = PP.L, B = PP.biome(lv.biome), pal = B.palette, g = c.getContext('2d');
    const { cols, rows, field: F, H } = lv, WT = lv.WT;
    const X0 = ci * CS, Y0 = cj * CS, X1 = X0 + CS, Y1 = Y0 + CS;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(d, 0, 0, d, -X0 * d + 1, -Y0 * d + 1);
    const pad = 2 / d;
    // the rock shape: solid runs as rectangles, boundary squares as marching-squares polygons
    g.beginPath();
    const i0 = Math.max(0, Math.floor(X0 / CELL) - 2), i1 = Math.min(cols - 2, Math.ceil(X1 / CELL) + 1);
    const j0 = Math.max(0, Math.floor(Y0 / CELL) - 2), j1 = Math.min(rows - 2, Math.ceil(Y1 / CELL) + 1);
    const vx = [0, 0, 0, 0], vy = [0, 0, 0, 0], vv = [0, 0, 0, 0];
    for (let j = j0; j <= j1; j++) {
      let run = -1;
      for (let i = i0; i <= i1; i++) {
        vv[0] = F[j * cols + i]; vv[1] = F[j * cols + i + 1]; vv[2] = F[(j + 1) * cols + i + 1]; vv[3] = F[(j + 1) * cols + i];
        const all = vv[0] >= 0.5 && vv[1] >= 0.5 && vv[2] >= 0.5 && vv[3] >= 0.5;
        if (all) { if (run < 0) run = i; continue; }
        if (run >= 0) { g.rect((run + 0.5) * CELL - 0.6, (j + 0.5) * CELL - 0.6, (i - run) * CELL + 1.2, CELL + 1.2); run = -1; }
        if (!(vv[0] >= 0.5 || vv[1] >= 0.5 || vv[2] >= 0.5 || vv[3] >= 0.5)) continue;
        const x0 = (i + 0.5) * CELL, y0 = (j + 0.5) * CELL;
        vx[0] = x0; vy[0] = y0; vx[1] = x0 + CELL; vy[1] = y0; vx[2] = x0 + CELL; vy[2] = y0 + CELL; vx[3] = x0; vy[3] = y0 + CELL;
        let first = true;
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) & 3, sa = vv[k] >= 0.5, sb = vv[k2] >= 0.5;
          if (sa) { if (first) { g.moveTo(vx[k], vy[k]); first = false; } else g.lineTo(vx[k], vy[k]); }
          if (sa !== sb) {
            const t = (0.5 - vv[k]) / (vv[k2] - vv[k]), px = vx[k] + (vx[k2] - vx[k]) * t, py = vy[k] + (vy[k2] - vy[k]) * t;
            if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
          }
        }
        g.closePath();
      }
      if (run >= 0) g.rect((run + 0.5) * CELL - 0.6, (j + 0.5) * CELL - 0.6, (i1 + 1 - run) * CELL + 1.2, CELL + 1.2);
    }
    // the half-cell frame, and everything beyond the cave, is stone
    const hc = CELL / 2;
    if (Y0 < hc) g.rect(X0 - pad, Y0 - pad, CS + pad * 2, hc - Y0 + pad);
    if (Y1 > H - hc - 1) g.rect(X0 - pad, H - hc - 1, CS + pad * 2, Y1 - H + hc + 1 + pad);
    if (X0 < hc) g.rect(X0 - pad, Y0 - pad, hc - X0 + pad, CS + pad * 2);
    if (X1 > WT - hc) g.rect(WT - hc, Y0 - pad, X1 - WT + hc + pad, CS + pad * 2);
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, pal.rock[0]); grad.addColorStop(0.5, pal.rock[1]); grad.addColorStop(1, pal.rock[2]);
    g.fillStyle = grad;
    g.fill();
    // texture, strata and decals, kept inside the rock
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = g.createPattern(texture(pal, (B.index || 1) * 13 + 1), 'repeat');
    g.fillRect(X0 - pad, Y0 - pad, CS + pad * 2, CS + pad * 2);
    const tier = R.quality.tier;
    const painter = typeof B.painter === 'function' ? B.painter : R.painters[B.painter] || R.painters.stone;
    painter(g, {
      x0: X0, y0: Y0, x1: X1, y1: Y1, lv, pal, tier, d, ci, cj,
      rng: Kit.rng(PP.hash2(lv.seed + ci * 7919, cj * 104729 + 17)),
      near(fn) { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) fn(Kit.rng(PP.hash2(lv.seed + (ci + a) * 7919, (cj + b) * 104729 + 17)), (ci + a) * CS, (cj + b) * CS); },
      minW: w => Math.max(w, 2 / d),
    });
    if (tier.detail) {
      // fine grain composited at device resolution
      const pat = g.createPattern(grainTex(), 'repeat');
      if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().scale(1 / d));
      g.fillStyle = pat;
      g.globalAlpha = 0.5;
      g.fillRect(X0 - pad, Y0 - pad, CS + pad * 2, CS + pad * 2);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
    // (the rim where stone meets air is stroked live, at full resolution: R.drawRims)
    // water: dark basins with a lighter skin
    for (const rv of lv.rivers) {
      if (rv.x1 + CELL * 3 < X0 || rv.x0 - CELL * 3 > X1) continue;
      const wg = g.createLinearGradient(0, rv.y, 0, rv.y + 260);
      wg.addColorStop(0, rv.flood ? '#0a1d44' : (pal.water || ['#0b2150'])[0]); wg.addColorStop(1, (pal.water || [0, '#040a1c'])[1]);
      g.fillStyle = wg;
      g.beginPath();
      for (let j = Math.max(Math.floor(rv.y / CELL), Math.floor(Y0 / CELL) - 1); j < Math.min(rows, Math.ceil(Y1 / CELL) + 1); j++) {
        for (let i = Math.max(Math.floor((rv.x0 - CELL * 2) / CELL), Math.floor(X0 / CELL) - 1); i <= Math.min(Math.floor((rv.x1 + CELL * 2) / CELL), Math.ceil(X1 / CELL)); i++) {
          if (lv.type[j * cols + i] === 2) g.rect(i * CELL - 0.3, j * CELL - 0.3, CELL + 0.6, CELL + 0.6);
        }
      }
      g.fill();
      g.fillStyle = 'rgba(58,123,255,0.22)';
      g.fillRect(rv.x0 - CELL, rv.y - 1, rv.x1 - rv.x0 + CELL * 2, 2);
    }
    for (const cl of lv.crystals) if (cl.x + cl.r + 40 > X0 && cl.x - cl.r - 40 < X1 && cl.y + cl.r + 40 > Y0 && cl.y - cl.r - 40 < Y1) PP.paintShards(g, cl, 0.55);
  }

  // A plain stone painter (the fallback for a biome without its own)
  R.painters = {
    stone(g, P) {
      P.near((r, nx, ny) => {
        for (let k = 0; k < 3; k++) {
          const x = nx + r.range(0, CS), y = ny + r.range(0, CS), rad = r.range(40, 140), lite = r.chance(0.45);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? P.pal.strata.light : P.pal.strata.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
      });
    },
  };

  // budget: how many stale chunks (painted at another density) may be repainted this frame; a chunk never painted
  // is always painted. On frames that paint nothing, one chunk just outside the view is painted ahead of time,
  // the one nearest where the camera is heading (ahead = { x, y } in world px), so flying into new stone rarely
  // has to paint several big chunks in one frame.
  R.drawRock = function (ctx, x0, y0, x1, y1, d, budget, ahead) {
    const size = Math.ceil(CS * d) + 2;
    const ci0 = Math.floor(x0 / CS), ci1 = Math.floor(x1 / CS), cj0 = Math.floor(y0 / CS), cj1 = Math.floor(y1 / CS);
    const cap = Math.min(Math.max(R.quality.tier.lru, (ci1 - ci0 + 3) * (cj1 - cj0 + 3) + 4), capFor(size, R.quality.tier.rockMB || 10, (ci1 - ci0 + 3) * (cj1 - cj0 + 3)));
    let painted = 0;
    const paint = (ci, cj, k, e) => {
      if (e && e.c.width !== size) { rock.drop(k); e = null; }
      const c = e ? e.c : rock.canvas(size);
      if (c.width !== size) { c.width = size; c.height = size; }
      paintRock(c, ci, cj, d);
      e = { c, d };
      rock.put(k, e, cap);
      painted++;
      return e;
    };
    for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) {
      const k = ci * 4096 + cj + 1e7;
      let e = rock.get(k);
      if (!e || (e.d !== d && painted < budget)) e = paint(ci, cj, k, e);
      ctx.drawImage(e.c, 0, 0, e.c.width, e.c.height, ci * CS - 1 / e.d, cj * CS - 1 / e.d, (e.c.width) / e.d, (e.c.height) / e.d);
    }
    if (!painted && ahead && PP.L) {
      const L = PP.L, n0 = Math.max(0, ci0 - 1), n1 = Math.min(Math.ceil(L.W / CS), ci1 + 1), m0 = Math.max(0, cj0 - 1), m1 = Math.min(Math.ceil(L.H / CS), cj1 + 1);
      let best = null, bd = Infinity;
      const vx = (x0 + x1) / 2, vy = (y0 + y1) / 2, hx = ahead.x - vx, hy = ahead.y - vy;
      for (let cj = m0; cj <= m1; cj++) for (let ci = n0; ci <= n1; ci++) {
        if (ci >= ci0 && ci <= ci1 && cj >= cj0 && cj <= cj1) continue;
        const k = ci * 4096 + cj + 1e7, e = rock.map.get(k);
        if (e && e.d === d) continue;
        const cx = (ci + 0.5) * CS, cy = (cj + 0.5) * CS;
        if ((cx - vx) * hx + (cy - vy) * hy <= 0) continue; // only where the camera is heading
        const dx = cx - ahead.x, dy = cy - ahead.y, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = [ci, cj, k, e]; }
      }
      if (best) paint(best[0], best[1], best[2], best[3]);
    }
    return painted;
  };

  // The rim where stone meets air, stroked from the marching-squares segments in view at the screen's own
  // resolution, so stone edges stay crisp on a 4K screen whatever the chunk density.
  R.drawRims = function (ctx, x0, y0, x1, y1) {
    const lv = PP.L, pal = PP.biome(lv.biome).palette, S = lv.segs, ST = lv.segStart, cols = lv.cols;
    const i0 = Math.max(0, Math.floor(x0 / CELL) - 1), i1 = Math.min(cols - 2, Math.ceil(x1 / CELL) + 1);
    const j0 = Math.max(0, Math.floor(y0 / CELL) - 1), j1 = Math.min(lv.rows - 2, Math.ceil(y1 / CELL) + 1);
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = Math.max(3, 2 / R.ppu);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      const s0 = ST[j * cols + i0], s1 = ST[j * cols + i1 + 1];
      for (let s = s0; s < s1; s++) { ctx.moveTo(S[s * 4], S[s * 4 + 1]); ctx.lineTo(S[s * 4 + 2], S[s * 4 + 3]); }
    }
    ctx.stroke();
  };

  // ---- memory ----
  function drawMemEntries(g, a, from, to, d) {
    const lw = Math.max(2.5, 2 / d);
    for (let c = 0; c < PP.COL.length; c++) {
      let any = false;
      g.beginPath();
      for (let n = from; n < to; n++) {
        const o = n * 5;
        if (a[o + 4] !== c || a[o + 2] < -1e5) continue;
        g.moveTo(a[o], a[o + 1]); g.lineTo(a[o + 2], a[o + 3]); any = true;
      }
      if (any) { g.strokeStyle = PP.COL[c]; g.globalAlpha = 0.4; g.lineWidth = lw; g.stroke(); }
      any = false;
      g.beginPath();
      for (let n = from; n < to; n++) {
        const o = n * 5;
        if (a[o + 4] !== c || a[o + 2] >= -1e5) continue;
        if (d >= 1.5) { g.moveTo(a[o] + 2.1, a[o + 1]); g.arc(a[o], a[o + 1], 2.1, 0, 6.2832); } else g.rect(a[o] - 2, a[o + 1] - 2, 4, 4);
        any = true;
      }
      if (any) { g.fillStyle = PP.COL[c]; g.globalAlpha = 0.55; g.fill(); }
    }
    g.globalAlpha = 1;
  }
  R.drawMemory = function (ctx, x0, y0, x1, y1) {
    const d = R.memDensity || 1, mem = PP.mem, size = Math.ceil(CS * d) + 2;
    const ci0 = Math.floor(x0 / CS), ci1 = Math.floor(x1 / CS), cj0 = Math.floor(y0 / CS), cj1 = Math.floor(y1 / CS);
    const cap = Math.min(R.quality.tier.lru, capFor(size, R.quality.tier.memMB || 10, (ci1 - ci0 + 1) * (cj1 - cj0 + 1)));
    let rebuilt = 0;
    for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) {
      const ch = mem.chunks.get(mem.key(ci, cj));
      if (!ch || !ch.n) continue;
      const k = ci * 4096 + cj;
      let e = memc.get(k);
      if (!e || e.store !== ch || (e.d !== d && rebuilt++ < 1)) {
        if (e) memc.drop(k);
        const c = memc.canvas(size);
        if (c.width !== size) { c.width = size; c.height = size; }
        const g = c.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, size, size);
        g.setTransform(d, 0, 0, d, -ci * CS * d + 1, -cj * CS * d + 1);
        g.lineCap = 'round';
        e = { c, d, drawn: 0, store: ch };
        memc.put(k, e, cap);
      }
      if (e.drawn < ch.n) { const g = e.c.getContext('2d'); drawMemEntries(g, ch.a, e.drawn, ch.n, e.d); e.drawn = ch.n; }
      ctx.drawImage(e.c, 0, 0, e.c.width, e.c.height, ci * CS - 1 / e.d, cj * CS - 1 / e.d, e.c.width / e.d, e.c.height / e.d);
    }
  };
})();
