/* The backdrop behind the cave: the biome's sky, two parallax layers of silhouettes (painted in world units at a
 * density matched to the screen, so they are as crisp at 4K as on a phone), glowworms, the relight of each passing
 * echo ring, the near foreground tips, moon shafts and drifting motes. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const BD = R.backdrop = { biome: null, layers: [] };

  function bgTile(seed, tw, th, color, rim, depth, db, def) {
    const c = Kit.gfx.offscreen(Math.ceil(tw * db), Math.ceil(th * db)), g = c.getContext('2d'), r = Kit.rng(seed);
    g.scale(db, db);
    const band = th * 0.36;
    const wrapX = (x, rad, fn) => { fn(x); if (x - rad < 0) fn(x + tw); if (x + rad > tw) fn(x - tw); };
    g.fillStyle = color;
    const ridge = top => {
      g.beginPath();
      const base = top ? 0 : th, dir = top ? 1 : -1;
      g.moveTo(0, base);
      for (let x = 0; x <= tw; x += 8) g.lineTo(x, base + dir * (th * 0.05 + Math.sin(x / tw * TAU * 2 + seed) * th * 0.025 + Math.sin(x / tw * TAU * 5 + seed * 2) * th * 0.012));
      g.lineTo(tw, base); g.closePath(); g.fill();
    };
    ridge(true); ridge(false);
    const n = Math.round(tw / (def.spikes || (depth > 0.4 ? 34 : 24)));
    for (let k = 0; k < n; k++) {
      const x = r.range(0, tw), len = r.range(0.25, 1) * band * (r.chance(0.2) ? 1.12 : 0.8), w = r.range(6, 16) * (len / band + 0.4);
      wrapX(x, w, xx => { g.beginPath(); g.moveTo(xx - w, th * 0.04); g.quadraticCurveTo(xx - w * 0.3, len * 0.55, xx, len); g.quadraticCurveTo(xx + w * 0.3, len * 0.55, xx + w, th * 0.04); g.closePath(); g.fill(); });
      if (r.chance(0.7)) {
        const x2 = r.range(0, tw), l2 = r.range(0.2, 0.7) * band, w2 = r.range(8, 18);
        wrapX(x2, w2, xx => { g.beginPath(); g.moveTo(xx - w2, th * 0.97); g.quadraticCurveTo(xx - w2 * 0.25, th - l2 * 0.6, xx, th - l2); g.quadraticCurveTo(xx + w2 * 0.25, th - l2 * 0.6, xx + w2, th * 0.97); g.closePath(); g.fill(); });
      }
    }
    for (let k = 0; k < (def.columns === undefined ? 1 : def.columns); k++) {
      const x = r.range(0, tw), w = r.range(14, 26);
      wrapX(x, w * 2, xx => {
        g.beginPath(); g.moveTo(xx - w * 1.8, 0); g.quadraticCurveTo(xx - w * 0.4, th * 0.4, xx - w * 0.45, th * 0.5); g.quadraticCurveTo(xx - w * 0.4, th * 0.6, xx - w * 1.8, th);
        g.lineTo(xx + w * 1.8, th); g.quadraticCurveTo(xx + w * 0.4, th * 0.6, xx + w * 0.45, th * 0.5); g.quadraticCurveTo(xx + w * 0.4, th * 0.4, xx + w * 1.8, 0); g.closePath(); g.fill();
      });
    }
    if (rim) {
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, 0, th);
      gr.addColorStop(0, Kit.gfx.alpha(rim, 0)); gr.addColorStop(0.5, Kit.gfx.alpha(rim, 0.25)); gr.addColorStop(1, Kit.gfx.alpha(rim, 0));
      g.fillStyle = gr; g.fillRect(0, 0, tw, th);
    }
    return c;
  }

  BD.setBiome = function (id) {
    const B = PP.biome(id);
    if (BD.biome === B) return;
    BD.biome = B;
    for (const l of BD.layers || []) for (const old of [l.dark, l.lit]) if (old) { old.width = 0; old.height = 0; }
    BD.layers = (B.parallax || []).map((d, i) => {
      const r = Kit.rng(d.seed * 3), worms = [];
      for (let k = 0; k < (d.depth < 0.3 ? 46 : 18); k++) worms.push({ x: r.range(0, d.tw), y: r.range(d.th * 0.06, d.th * 0.3), len: r.range(4, 22), ph: r.range(0, 6), sp: r.range(0.5, 1.6) });
      return { def: d, i, worms, db: 0, dark: null, lit: null };
    });
    const fr = Kit.rng(91);
    BD.tips = [];
    for (let k = 0; k < 9; k++) BD.tips.push({ x: fr.range(0, 900), w: fr.range(16, 40), len: fr.range(40, 130) });
  };

  function tiles(l, db) {
    if (l.db === db && l.dark) return;
    const d = l.def, pal = BD.biome.palette;
    for (const old of [l.dark, l.lit]) if (old) { old.width = 0; old.height = 0; } // give the memory back now, not at GC
    l.db = db;
    l.dbl = Math.min(db, 1); // the lit copy is only ever drawn into the low-resolution relight buffer
    l.dark = bgTile(d.seed, d.tw, d.th, pal.sil[l.i] || pal.sil[0], null, d.depth, db, d);
    l.lit = bgTile(d.seed, d.tw, d.th, pal.silLit[l.i] || pal.silLit[0], PP.P.teal, d.depth, l.dbl, d);
  }
  function tileDraw(ctx, img, tw, th, ox, oy, w, h, band, db) {
    const bh = Math.ceil(th * band);
    for (let y = oy; y < h; y += th) {
      if (y + th < 0) continue;
      for (let x = ox; x < w; x += tw) {
        ctx.drawImage(img, 0, 0, img.width, bh * db, x, y, tw, bh);
        ctx.drawImage(img, 0, img.height - bh * db, img.width, bh * db, x, y + th - bh, tw, bh);
      }
    }
  }

  // screen-space draw (ctx in CSS px); V = { w, h, zoom, k (device px per CSS px), camX, camY, t, rings }
  // On phones and 4K screens the sky, both silhouette layers, the glowworms and the relight are drawn into one
  // buffer at the silhouettes' own resolution, which then goes to the screen in a single opaque copy. Drawing the
  // far layers straight to such a screen would blend nearly three full screens of pixels for detail they do not
  // have.
  BD.draw = function (ctx, V) {
    const B = BD.biome, pal = B.palette, tier = R.quality.tier, z = V.zoom;
    let dens = 0;
    for (const l of BD.layers) {
      const d = l.def, cap = 2048 / Math.max(d.tw, d.th);
      const want = Math.min(cap, z * V.k, tier.bgMax || 1.5);
      tiles(l, Math.min(cap, [0.75, 1, 1.25, 1.5, 2, 2.5].find(s => s >= want - 1e-6) || 2.5));
      dens = Math.max(dens, l.db);
    }
    // the buffer only where it saves at least a third of the pixels (phones and 4K screens); otherwise straight to
    // the screen, as a buffer at full resolution would only add a canvas
    const bs = Math.min(V.k, Math.max(0.5, (dens || 1) / z)), useBuf = bs < V.k * 0.8;
    const bw = Math.ceil(V.w * bs), bh = Math.ceil(V.h * bs);
    let g = ctx;
    if (useBuf) {
      if (!BD.bufC || BD.bufC.width !== bw || BD.bufC.height !== bh) {
        if (BD.bufC) { BD.bufC.width = 0; BD.bufC.height = 0; }
        BD.bufC = Kit.gfx.offscreen(bw, bh); BD.bufG = BD.bufC.getContext('2d', { alpha: false });
      }
      g = BD.bufG;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      Kit.gfx.sky(g, pal.sky);
      g.setTransform(bs, 0, 0, bs, 0, 0);
    } else {
      if (BD.bufC) { BD.bufC.width = 0; BD.bufC.height = 0; BD.bufC = null; }
      Kit.gfx.sky(ctx, pal.sky);
    }
    const pxs = useBuf ? bs : V.k;
    for (const l of BD.layers) {
      const d = l.def, tw = d.tw * z, th = d.th * z;
      const ox = -Kit.wrap(V.camX * z * d.depth, 0, tw), oy = -Kit.wrap(V.camY * z * d.depth, 0, th);
      g.globalAlpha = 0.85;
      tileDraw(g, l.dark, tw, th, ox, oy, V.w, V.h, d.band || 0.42, l.db / z);
      g.globalAlpha = 1;
      if (B.ambient && B.ambient.glowworms) {
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = pal.glowworm;
        const ww = Math.max(z, 1.5 / pxs);
        for (let y = oy; y < V.h; y += th) for (let x = ox; x < V.w; x += tw) {
          for (const wm of l.worms) {
            const px = x + wm.x * z, py = y + wm.y * z, len = wm.len * (d.depth < 0.3 ? 0.6 : 1) * z;
            if (px < -4 || px > V.w + 4 || py < -30 * z || py > V.h) continue;
            g.globalAlpha = (d.depth < 0.3 ? 0.18 : 0.3) * (0.55 + 0.45 * Math.sin(V.t * wm.sp + wm.ph));
            g.fillRect(px, py, ww, len);
            g.fillRect(px - ww * 0.5, py + len, ww * 2, ww * 2);
          }
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }
    relight(g, V, tier, z);
    if (useBuf) { ctx.imageSmoothingEnabled = true; ctx.drawImage(BD.bufC, 0, 0, bw, bh, 0, 0, V.w, V.h); }
  };

  // passing echo rings light up the silhouettes they sweep over: the lit layers are drawn once into a
  // low-resolution buffer, which is masked by every live ring at once and laid over the backdrop. (One pass
  // whatever the number of rings; no clip paths, which are slow to rasterise.) out is in CSS px.
  function relight(out, V, tier, z) {
    if (!tier.relight || !V.rings || !V.rings.length) return;
    const TMP = BD._tmp || (BD._tmp = { x: 0, y: 0 }), SP = PP.data.tuning.ringSpeed;
    let live = 0;
    for (const rg of V.rings) { const rad = (V.t - rg.t0) * SP; if (rad <= rg.R && rad >= 30 && rg.kind !== 'drip') live++; }
    if (!live) return;
    const q = Math.max(1, tier.mask * z * 0.75), bw = Math.ceil(V.w / q) + 1, bh = Math.ceil(V.h / q) + 1;
    if (!BD.litC || BD.litC.width !== bw || BD.litC.height !== bh) {
      for (const old of [BD.litC, BD.maskC]) if (old) { old.width = 0; old.height = 0; }
      BD.litC = Kit.gfx.offscreen(bw, bh); BD.litG = BD.litC.getContext('2d');
      BD.maskC = Kit.gfx.offscreen(bw, bh); BD.maskG = BD.maskC.getContext('2d');
    }
    // the mask: every live ring as a band, its alpha how lit it is
    const m = BD.maskG;
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
    m.clearRect(0, 0, bw, bh);
    m.strokeStyle = '#fff';
    for (const rg of V.rings) {
      const rad = (V.t - rg.t0) * SP;
      if (rad > rg.R || rad < 30 || rg.kind === 'drip') continue;
      const k = 1 - rad / rg.R;
      Kit.cam.toScreen(rg.x, rg.y, TMP);
      const ro = rad * z + 12 * z, ri = Math.max(0, rad * z - 70 * z);
      m.globalAlpha = Math.min(1, k * 1.1) * (rg.kind === 'shriek' ? 0.7 : 1);
      m.lineWidth = (ro - ri) / q;
      m.beginPath(); m.arc(TMP.x / q, TMP.y / q, (ro + ri) / 2 / q, 0, TAU); m.stroke();
    }
    // the lit silhouettes, then kept only under the mask
    const g = BD.litG;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, bw, bh);
    g.setTransform(1 / q, 0, 0, 1 / q, 0, 0);
    for (const l of BD.layers) {
      const d = l.def, tw = d.tw * z, th = d.th * z;
      const ox = -Kit.wrap(V.camX * z * d.depth, 0, tw), oy = -Kit.wrap(V.camY * z * d.depth, 0, th);
      g.globalAlpha = d.depth < 0.3 ? 0.45 : 0.7;
      tileDraw(g, l.lit, tw, th, ox, oy, V.w, V.h, d.band || 0.42, l.dbl / z);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(BD.maskC, 0, 0);
    g.globalCompositeOperation = 'source-over';
    out.imageSmoothingEnabled = true;
    out.drawImage(BD.litC, 0, 0, bw, bh, 0, 0, bw * q, bh * q);
  }

  // near foreground: hanging tips at the top edge, darker than everything (vectors, so always crisp)
  BD.drawForeground = function (ctx, V) {
    const z = V.zoom, pal = BD.biome.palette, TW = 900 * z;
    const fo = -Kit.wrap(V.camX * z * 1.3, 0, TW), oy = -10 * z - Kit.wrap(V.camY * z * 0.05, 0, 30 * z);
    ctx.fillStyle = pal.fg || '#010206';
    ctx.beginPath();
    for (let x0 = fo; x0 < V.w; x0 += TW) for (const tp of BD.tips) {
      const xx = x0 + tp.x * z, w = tp.w * z, len = tp.len * z;
      if (xx + w < 0 || xx - w > V.w) continue;
      ctx.moveTo(xx - w, oy); ctx.quadraticCurveTo(xx - w * 0.3, oy + len * 0.6, xx, oy + len); ctx.quadraticCurveTo(xx + w * 0.3, oy + len * 0.6, xx + w, oy); ctx.closePath();
    }
    ctx.fill();
  };

  // moon shafts through roof fissures near the mouth, and motes drifting in any light (world space)
  BD.drawLightWorld = function (ctx, Vw, t) {
    const L = PP.L, B = BD.biome, amb = B.ambient || {};
    if (amb.shafts && !L.shafts) {
      L.shafts = [];
      for (let k = 0; k < amb.shafts; k++) {
        const p = L.path[Math.floor(L.path.length * (0.05 + k * 0.11))];
        let y = p.y;
        while (y > 0 && PP.world.fieldAt(p.x, y) < 0.5) y -= 6;
        L.shafts.push({ x: p.x + 20, y: y + 4, a: 0.9 - k * 0.3 });
      }
    }
    if (L.shafts) for (const s of L.shafts) {
      if (s.x < Vw.x0 - 400 || s.x > Vw.x1 + 400) continue;
      Kit.gfx.lightRays(ctx, s.x, s.y, { count: 4, length: 380, spread: 0.32, angle: Math.PI / 2 + 0.12 + Math.sin(t * 0.03 + s.x) * 0.07, width: 0.06, color: B.palette.moon || PP.P.moon, alpha: 0.05 * s.a, t });
      R.glow(ctx, s.x, s.y + 6, 40, B.palette.moon || PP.P.moon, 0.18 * s.a);
    }
    if (!amb.motes) return;
    const G = PP.G, b = G.bat, n = Math.min(900, R.quality.tier.ambient);
    const vw = Vw.x1 - Vw.x0, vh = Vw.y1 - Vw.y0, drift = amb.motes.drift || -12;
    if (!BD.motes || BD.motes.length !== n) { const r = Kit.rng(5); BD.motes = []; for (let k = 0; k < n; k++) BD.motes.push([r.next(), r.next(), r.range(0.4, 1.2), r.range(0, 6)]); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = amb.motes.color || '#dfe8ff';
    const sz = Vw.minW(1.6), rr = sz * 0.55, round = Vw.ppu >= 2, ex = L.W, ey = L.exitY, LV = 6; // round dust where pixels are fine enough to show it
    const buckets = BD.moteBuckets || (BD.moteBuckets = Array.from({ length: LV }, () => []));
    for (const bk of buckets) bk.length = 0;
    for (const m of BD.motes) {
      const x = Vw.x0 + Kit.wrap(m[0] * vw + t * drift * m[2], 0, vw), y = Vw.y0 + Kit.wrap(m[1] * vh + Math.sin(t * 0.5 + m[3]) * 10, 0, vh);
      const db = (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y), de = (x - ex) * (x - ex) + (y - ey) * (y - ey);
      const a = Math.max(db < 25600 ? 1 - db / 25600 : 0, de < 250000 ? (1 - de / 250000) * 0.8 : 0) * (0.5 + 0.5 * Math.sin(t * 2 + m[3]));
      if (a < 0.06) continue;
      buckets[Math.min(LV - 1, Math.floor(a * LV))].push(x, y);
    }
    for (let i = 0; i < LV; i++) {
      const bk = buckets[i];
      if (!bk.length) continue;
      ctx.globalAlpha = (i + 0.5) / LV * 0.45;
      ctx.beginPath();
      if (round) for (let k = 0; k < bk.length; k += 2) { ctx.moveTo(bk[k] + rr, bk[k + 1]); ctx.arc(bk[k], bk[k + 1], rr, 0, TAU); }
      else for (let k = 0; k < bk.length; k += 2) ctx.rect(bk[k], bk[k + 1], sz, sz);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
})();
