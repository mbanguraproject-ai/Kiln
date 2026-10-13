/* World drawing above the darkness: the moonlit arch, the bat's warm light on nearby walls, moths, pups (and their
 * pink answers), sonar rings and the echo dots and contour lines themselves. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU, CELL = PP.CELL;
  const { dist } = Kit;

  R.litA = (lit, t) => { const a = t - lit, L = PP.bat.stats().echoLife; return a < 0 ? 0 : a < 0.08 ? 1 : Math.max(0, 1 - (a - 0.08) / (L - 0.08)); };

  const moonSprite = () => Kit.gfx.sprite('pp-moon', 120, 120, g => {
    const gr = g.createRadialGradient(52, 50, 6, 60, 60, 56);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#dbe9ff'); gr.addColorStop(1, '#a9c2ee');
    g.fillStyle = gr; g.beginPath(); g.arc(60, 60, 56, 0, TAU); g.fill();
    g.fillStyle = 'rgba(120,145,200,0.28)';
    for (const [x, y, r] of [[42, 70, 11], [72, 42, 8], [76, 76, 6], [48, 38, 5], [64, 62, 4]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  });
  R.moonSprite = moonSprite;
  function archPath(ctx, cx, cy, hw, hh) {
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + hh);
    ctx.lineTo(cx - hw, cy - hh * 0.25);
    ctx.bezierCurveTo(cx - hw, cy - hh * 1.15, cx + hw, cy - hh * 1.15, cx + hw, cy - hh * 0.25);
    ctx.lineTo(cx + hw, cy + hh);
    ctx.closePath();
  }
  R.drawOutside = function (ctx, V, t) {
    const L = PP.L;
    if (V.x1 < L.W - 20) return;
    const W = L.W, ey = L.exitY, ah = L.archH, aw = 46, pal = PP.biome(L.biome).palette, arch = pal.arch || ['#0b1a3e', '#27427a', '#3b5a94'];
    const cx = W + 34;
    ctx.save();
    archPath(ctx, cx, ey, aw, ah);
    ctx.clip();
    const gr = ctx.createLinearGradient(0, ey - ah, 0, ey + ah);
    gr.addColorStop(0, arch[0]); gr.addColorStop(0.65, arch[1]); gr.addColorStop(1, arch[2]);
    ctx.fillStyle = gr;
    ctx.fillRect(cx - aw - 2, ey - ah * 1.2, aw * 2 + 4, ah * 2.4);
    Kit.gfx.blit(ctx, moonSprite(), cx + 18, ey - ah * 0.45, 0.32);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 9; k++) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + k * 1.7); ctx.fillRect(cx - aw + 6 + (k * 23) % (aw * 2 - 10), ey - ah * 0.9 + (k * 37) % (ah * 1.1), V.minW(1.4), V.minW(1.4)); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a1430';
    for (let k = -1; k < 6; k++) { ctx.beginPath(); ctx.arc(cx - aw + k * 22 + 6, ey + ah * 0.78 + Math.sin(k * 2.1) * 6, 16, 0, TAU); ctx.fill(); }
    ctx.fillRect(cx - aw - 4, ey + ah * 0.8, aw * 2 + 8, ah);
    ctx.restore();
    const vr = Kit.rng(L.seed * 7 + 3);
    ctx.save();
    archPath(ctx, cx, ey, aw, ah); ctx.clip();
    ctx.strokeStyle = '#050a18'; ctx.fillStyle = '#050a18'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) {
      const vx = cx - aw + 6 + vr.next() * (aw * 2 - 12), len = vr.range(ah * 0.3, ah * 1.1), sw = Math.sin(t * 0.8 + k) * 3;
      ctx.beginPath(); ctx.moveTo(vx, ey - ah * 1.2); ctx.quadraticCurveTo(vx + sw, ey - ah + len * 0.5, vx + sw * 1.5, ey - ah + len); ctx.stroke();
      for (let y = ey - ah + 8; y < ey - ah + len; y += 9) { ctx.beginPath(); ctx.ellipse(vx + sw * ((y - ey + ah) / len) * 1.5 + (Math.floor(y / 9) % 2 ? 3 : -3), y, 3.4, 1.8, 0.5, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#0a1122';
    archPath(ctx, cx, ey, aw + 7, ah + 7); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = Kit.gfx.alpha('#dbe9ff', 0.85);
    archPath(ctx, cx, ey, aw + 1, ah + 1); ctx.stroke();
    ctx.lineWidth = 10;
    ctx.strokeStyle = Kit.gfx.alpha(PP.P.moon, 0.14);
    archPath(ctx, cx, ey, aw + 2, ah + 2); ctx.stroke();
    ctx.fillStyle = '#0a1122';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(cx - aw + 8 + k * (aw * 2 - 16) / 4, ey + ah + 2, vr.range(5, 11), vr.range(3, 6), 0, 0, TAU); ctx.fill(); }
  };
  R.drawMoonlight = function (ctx, V, t) {
    const L = PP.L;
    if (V.x1 < L.W - 700) return;
    const W = L.W, ey = L.exitY;
    R.glow(ctx, W + 10, ey, 300, PP.P.moon, 0.32);
    R.glow(ctx, W + 20, ey - 10, 110, '#dbe9ff', 0.45);
    Kit.gfx.lightRays(ctx, W + 30, ey - 40, { count: 7, length: 620, spread: 0.75, angle: Math.PI + 0.18, width: 46 / 620, color: PP.P.moon, alpha: 0.07, t });
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#dbe9ff';
    const s = V.minW(1.6);
    for (let k = 0; k < 40; k++) {
      const px = W - 30 - ((k * 53.7 + t * (8 + (k % 5) * 3)) % 420), py = ey - 70 + ((k * 31.3) % 160) + Math.sin(t * 0.8 + k) * 12;
      ctx.globalAlpha = 0.18 + 0.3 * (1 - (W - px) / 420) * (0.5 + 0.5 * Math.sin(t * 2 + k));
      ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // the bat's own warm glow licks the nearby walls
  R.drawProximity = function (ctx, V) {
    const L = PP.L, b = PP.G.bat, Rr = 92;
    const i0 = Math.max(0, Math.floor((b.x - Rr) / CELL)), i1 = Math.min(L.cols - 2, Math.floor((b.x + Rr) / CELL));
    const j0 = Math.max(0, Math.floor((b.y - Rr) / CELL)), j1 = Math.min(L.rows - 2, Math.floor((b.y + Rr) / CELL));
    const S = L.segs, ST = L.segStart, cols = L.cols;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = V.minW(1.6);
    ctx.lineCap = 'round';
    for (let band = 0; band < 3; band++) {
      const lo = band * Rr / 3, hi = lo + Rr / 3;
      ctx.strokeStyle = band === 0 ? '#ffd2a8' : band === 1 ? '#c99b7a' : '#3f8f8a';
      ctx.globalAlpha = band === 0 ? 0.55 : band === 1 ? 0.3 : 0.16;
      ctx.beginPath();
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const sq = j * cols + i;
        for (let s = ST[sq]; s < ST[sq + 1]; s++) {
          const ax = S[s * 4], ay = S[s * 4 + 1], d = dist(b.x, b.y, ax, ay);
          if (d >= lo && d < hi) { ctx.moveTo(ax, ay); ctx.lineTo(S[s * 4 + 2], S[s * 4 + 3]); }
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  R.drawCritters = function (ctx, V, t) {
    const L = PP.L, b = PP.G.bat;
    // pups hanging in their nooks, pulsing softly with a heart; their answers ring out pink, even through stone
    for (const p of L.pups) {
      if (p.state !== 'hang') continue;
      const ans = t - p.answer;
      if (ans >= 0 && ans < 1.6) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = PP.P.pink;
        for (let k = 0; k < 3; k++) {
          const f = ans / 1.6 - k * 0.12;
          if (f <= 0 || f >= 1) continue;
          ctx.globalAlpha = (1 - f) * 0.55;
          ctx.lineWidth = V.minW(2.2);
          ctx.beginPath(); ctx.arc(p.x, p.y + 6, 14 + f * 90, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        R.glow(ctx, p.x, p.y + 4, 40, PP.P.pink, 0.4 * (1 - ans / 1.6));
      }
      if (!V.inView(p.x, p.y, 40)) continue;
      const near = Math.max(0, 1 - dist(b.x, b.y, p.x, p.y) / 130);
      const la = t - p.lit;
      const a = Math.max(la >= 0 && la < 6 ? Math.min(1, 1.15 - la / 6) : 0, near);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + p.ph);
      R.glow(ctx, p.x, p.y + 2, 26 + pulse * 10, PP.P.pink, (p.deep && !p.woke ? 0.04 : 0.1 + 0.32 * a) * (0.6 + 0.4 * pulse));
      if (a > 0.02) {
        ctx.globalAlpha = Math.min(1, a * 1.2);
        R.drawPup(ctx, p.x, p.y, t + p.ph, 0, 1);
        if (p.deep && !p.woke) { ctx.globalAlpha = a * 0.8; Kit.gfx.text(ctx, 'z', p.x + 12, p.y + 10 - ((t * 0.6 + p.ph) % 1) * 12, { size: 9, color: PP.P.pink, font: 'body', weight: 700, world: true }); }
        else R.drawHeart(ctx, p.x + 14, p.y - 6 - pulse * 3, 4 + pulse, PP.P.pink, a);
        ctx.globalAlpha = 1;
      }
    }
    // moths: gold flecks, lit by echoes and by your glow
    for (const m of L.moths) {
      if (m.dead || !V.inView(m.x, m.y, 20)) continue;
      const near = Math.max(0, 1 - dist(b.x, b.y, m.x, m.y) / 85);
      const a = Math.max(R.litA(m.lit, t) * 0.95, near * 0.9);
      if (a <= 0.02) continue;
      R.glow(ctx, m.x, m.y, 16, PP.P.gold, 0.55 * a);
      R.drawMoth(ctx, m.x, m.y, t + m.ph, a, m.ang, m.tiger);
    }
  };

  R.drawTrailPups = function (ctx, t) {
    const G = PP.G;
    for (let k = G.trail.length - 1; k >= 0; k--) {
      const p = G.trail[k];
      R.glow(ctx, p.x, p.y, 22, PP.P.pink, 0.18);
      const fl = Math.sin(t * 16 + k * 1.7);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#5a3a40';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 2, -1); ctx.quadraticCurveTo(s * 9, -6 - fl * 5, s * 14, -2 - fl * 6); ctx.quadraticCurveTo(s * 8, 2, s * 2, 3); ctx.fill(); }
      ctx.restore();
      R.drawPup(ctx, p.x, p.y, t + k, p.flip, 1);
      if (p.heart > 0.02) R.drawHeart(ctx, p.x, p.y - 18 - (1 - p.heart) * 14, 6, PP.P.pink, p.heart);
    }
  };

  R.drawRings = function (ctx, V, t) {
    const G = PP.G, SP = PP.data.tuning.ringSpeed;
    ctx.globalCompositeOperation = 'lighter';
    for (const rg of G.rings) {
      const age = t - rg.t0, rad = age * SP;
      if (rad > rg.R || rad < 1) continue;
      const k = 1 - rad / rg.R, col = PP.COL[rg.c];
      ctx.strokeStyle = col;
      ctx.globalAlpha = (rg.kind === 'shriek' ? 0.6 : rg.kind === 'drip' ? 0.3 : 0.45) * k;
      ctx.lineWidth = V.minW(rg.kind === 'shriek' ? 3 : 1.8);
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rad, 0, TAU); ctx.stroke();
      if (rg.kind === 'shriek') { ctx.globalAlpha = 0.3 * k; ctx.lineWidth = V.minW(1.2); ctx.beginPath(); ctx.arc(rg.x, rg.y, rad * 0.86, 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // echo dots and contour lines: the cave painted in sound
  const NC = PP.COL.length, LB = 6;
  const P0 = PP.echo.pools;
  const lBuckets = [];
  for (let c = 0; c < NC; c++) { lBuckets.push([]); for (let b = 0; b < LB; b++) lBuckets[c].push(new Int32Array(P0.LN)); }
  const lCount = new Int32Array(NC * LB);
  R.drawEcho = function (ctx, V, t) {
    const P = PP.echo.pools, { x0, y0, x1, y1 } = V;
    const shapes = PP.settings.get('shapes');
    ctx.globalCompositeOperation = 'lighter';
    lCount.fill(0);
    for (let i = 0; i < P.LN; i++) {
      const a = t - P.lt[i], life = P.ll[i];
      if (a < 0 || a > life) continue;
      if ((P.lx1[i] < x0 && P.lx2[i] < x0) || (P.lx1[i] > x1 && P.lx2[i] > x1) || (P.ly1[i] < y0 && P.ly2[i] < y0) || (P.ly1[i] > y1 && P.ly2[i] > y1)) continue;
      const v = a < 0.1 ? 1 : 1 - (a - 0.1) / (life - 0.1);
      const bk = Math.min(LB - 1, Math.floor(v * LB)), c = P.lc[i], slot = c * LB + bk;
      lBuckets[c][bk][lCount[slot]++] = i;
    }
    ctx.lineCap = 'round';
    for (let c = 0; c < NC; c++) for (let bk = 0; bk < LB; bk++) {
      const n = lCount[c * LB + bk];
      if (!n) continue;
      const list = lBuckets[c][bk];
      ctx.strokeStyle = PP.COL[c];
      ctx.globalAlpha = ((bk + 0.5) / LB) * 0.42;
      ctx.lineWidth = V.minW(1.3);
      ctx.beginPath();
      for (let k = 0; k < n; k++) { const i = list[k]; ctx.moveTo(P.lx1[i], P.ly1[i]); ctx.lineTo(P.lx2[i], P.ly2[i]); }
      ctx.stroke();
      if (bk === LB - 1 && R.quality.tier.bloom) { ctx.globalAlpha = 0.1; ctx.lineWidth = 6; ctx.stroke(); }
    }
    for (let i = 0; i < P.EN; i++) {
      const a = t - P.et[i], life = P.el[i];
      if (a < 0 || a > life) continue;
      const x = P.ex[i], y = P.ey[i];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const fresh = a < 0.12 ? 1 - a / 0.12 : 0;
      const v = a < 0.06 ? 1 : Math.pow(1 - (a - 0.06) / (life - 0.06), 1.4);
      const al = Math.min(1, v * (0.75 + fresh * 0.5));
      if (al < 0.03) continue;
      const r = P.es[i] * (4.2 + fresh * 4.2) * (shapes ? 1.25 : 1);
      ctx.globalAlpha = al;
      ctx.drawImage(R.dotSprite(P.ec[i], shapes), x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  const wipeSprite = () => Kit.gfx.sprite('pp-wipe', 128, 128, g => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(225,238,255,1)'); gr.addColorStop(0.55, 'rgba(159,198,255,0.92)'); gr.addColorStop(1, 'rgba(159,198,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  // reaching the exit floods the screen with moonlight from the arch (screen space)
  R.drawWipe = function (ctx, w, h) {
    const G = PP.G, big = Math.hypot(w, h) * 1.25;
    const r = Kit.ease.quadIn(G.wipe) * big * 1.3 + 60;
    ctx.globalAlpha = Math.min(1, 0.25 + G.wipe * 0.75);
    ctx.drawImage(wipeSprite(), G.wipeX - r, G.wipeY - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    Kit.gfx.lightRays(ctx, G.wipeX, G.wipeY, { count: 9, length: big, spread: TAU, angle: 0, width: 70 / big, color: '#ffffff', alpha: 0.12 * (1 - G.wipe * 0.6), t: G.t });
  };
})();
