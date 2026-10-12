/* Spider webs across the narrow places: they hold the bat until it wiggles free (4 wiggles or 2.6 s). */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CELL = PP.CELL, CH = PP.CH, HZ = PP.hazards;
  const { clamp, dist } = Kit;

  function tearWeb(w) {
    const b = PP.G.bat;
    w.torn = true;
    b.web = null; b.wig = 0;
    b.vx += (b.lastAx || 1) * 120;
    Kit.fx.burst(w.x, w.y, { count: 22, color: [PP.P.web, '#b8c6e0'], size: [0.8, 2], speed: [40, 180], life: [0.4, 0.9], shape: 'spark', gravity: 120 });
    PP.sfx('tear');
    PP.haptic(14);
    PP.emit('webFree', w);
  }
  PP.tearWeb = tearWeb;

  HZ.def('webs', {
    place(lv, r, cfg, Q) {
      const k = cfg.n || 3, path = lv.path;
      const [i0, i1] = HZ.range(lv, cfg, 0.12, 0.9);
      if (cfg.stage) {
        // the introduction: a web in a nook beside the line, lit by your glow as you pass
        const p = Q.pathAt(cfg.stage), up = Q.ceilingAbove(p.x, p.y, 200);
        if (up !== null && p.y - up > 60) lv.webs.push({ x: p.x, y: up + 30, r: 28, torn: false, lit: -99, wob: 0, ph: r.range(0, 6), stage: true });
      }
      const cand = [];
      for (let i = i0; i < i1; i += 6) { const p = path[i], c = Q.clearAt(p.x, p.y); if (c >= 3) cand.push({ p, c }); }
      cand.sort((a, b) => a.c - b.c);
      for (const cd of cand) {
        if (lv.webs.filter(w => !w.stage).length >= k) break;
        if (lv.webs.some(w => Math.abs(w.x - cd.p.x) < 340)) continue;
        lv.webs.push({ x: cd.p.x, y: cd.p.y, r: clamp(cd.c * CELL * 0.85, 30, 56), torn: false, lit: -99, wob: 0, ph: r.range(0, 6) });
      }
    },
    steer(dt, b, inp) {
      if (!b.web) return;
      const w = b.web;
      if (b.dash > 0) { tearWeb(w); return; }
      b.vx *= Math.exp(-10 * dt); b.vy *= Math.exp(-10 * dt);
      const dirx = Math.sign(inp.x);
      if (dirx !== 0 && dirx !== b.lastAx) { b.wig += 1; w.wob = 1; PP.sfx('web', { pitch: b.wig }); }
      if (dirx !== 0) b.lastAx = dirx;
      if (Math.abs(inp.y) > 0.5 && Math.sign(inp.y) !== b.lastAy) { b.wig += 0.7; b.lastAy = Math.sign(inp.y); w.wob = 1; }
      b.webT += dt;
      if (b.wig >= 4 || b.webT > 2.6) tearWeb(w);
    },
    update(dt, G, L) {
      const b = G.bat, alive = !b.dead;
      for (const w of L.webs) {
        w.wob = Math.max(0, w.wob - dt * 3);
        if (w.torn || !alive || b.web || dist(b.x, b.y, w.x, w.y) >= w.r * 0.8) continue;
        if (b.dash > 0) { w.lit = G.t; b.web = null; b.lastAx = Math.sign(b.vx) || 1; tearWeb(w); continue; }
        b.web = w; b.wig = 0; b.webT = 0; b.lastAx = Math.sign(b.vx) || 1; b.lastAy = Math.sign(b.vy) || 1;
        w.wob = 1; w.lit = G.t;
        PP.sfx('web');
        Kit.fx.burst(b.x, b.y, { count: 8, color: [PP.P.web], size: [0.8, 1.6], speed: [20, 60], life: [0.3, 0.6], shape: 'spark' });
        PP.haptic(10);
        PP.emit('web', w);
        if (G.mode === 'play' && !G.webTaught) { G.webTaught = true; PP.run.hint(PP.input.lastInput === 'keys' ? 'Wiggle ← → to break free' : 'Wiggle side to side to break free'); }
      }
    },
    ping(E) {
      for (const w of PP.L.webs) if (!w.torn && E.ping(w, w.x, w.y, CH.WEB, 0, 0)) {
        const ta = E.t0 + dist(E.ox, E.oy, w.x, w.y) / E.speed;
        for (let k = 0; k < 8; k++) { const a = k / 8 * PP.TAU + w.ph; E.addDot(w.x + Math.cos(a) * w.r * 0.85, w.y + Math.sin(a) * w.r * 0.85, ta + 0.03, CH.WEB, 0.6); }
        for (let k = 0; k < 5; k++) { const a = k / 5 * PP.TAU; E.addDot(w.x + Math.cos(a) * w.r * 0.4, w.y + Math.sin(a) * w.r * 0.4, ta + 0.02, CH.WEB, 0.5); }
      }
    },
    draw(ctx, t, V) {
      const b = PP.G.bat;
      for (const w of PP.L.webs) {
        if (w.torn || !V.inView(w.x, w.y, w.r)) continue;
        const near = Math.max(0, 1 - dist(b.x, b.y, w.x, w.y) / 120);
        const a = Math.max(PP.R.litA(w.lit, t) * 0.9, near * 0.75, b.web === w ? 0.9 : 0);
        if (a <= 0.01) continue;
        ctx.save();
        ctx.translate(w.x, w.y);
        const wob = Math.sin(t * 30) * w.wob * 2;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = PP.P.web;
        ctx.lineWidth = V.minW(0.9);
        ctx.globalAlpha = 0.55 * a;
        const n = 8;
        ctx.beginPath();
        for (let k = 0; k < n; k++) { const an = k / n * PP.TAU + w.ph; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * w.r + wob, Math.sin(an) * w.r); }
        const rings = V.detail ? 4 : 3;
        for (let ring = 1; ring <= rings; ring++) {
          const rr = w.r * ring / (rings + 0.4);
          for (let k = 0; k <= n; k++) {
            const an = k / n * PP.TAU + w.ph, sag = rr * (k % 2 ? 0.9 : 1);
            const px = Math.cos(an) * sag + wob * ring / 4, py = Math.sin(an) * sag;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        if (V.detail) {
          // dew on the silk catches the echo
          ctx.fillStyle = '#ffffff';
          for (let k = 0; k < 8; k++) { const an = k / 8 * PP.TAU + w.ph + 0.3, rr = w.r * (0.35 + (k % 3) * 0.2); ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.arc(Math.cos(an) * rr, Math.sin(an) * rr, V.minW(0.9), 0, PP.TAU); ctx.fill(); }
        }
        ctx.restore();
      }
    },
    debug: L => L.webs.length,
  });
})();
