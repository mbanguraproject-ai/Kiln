/* Stalactites over the main path: they tick when you pass under, then fall. A shriek shakes them loose. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;

  function crash(s, x, y) {
    const G = PP.G;
    s.state = 'gone';
    if (dist(G.bat.x, G.bat.y, x, y) < 700) {
      PP.sfx('crash'); PP.haptic(25);
      Kit.fx.shake(7, 280);
      PP.caption('crash', x, y, CH.HAZ);
    }
    Kit.fx.burst(x, y, { count: 26, color: ['#9aa9c8', '#5c6886', PP.P.red], size: [1.5, 4], speed: [40, 200], angle: -Math.PI / 2, spread: 1.4, gravity: 420, shape: 'square', spin: [-8, 8], life: [0.5, 1] });
    Kit.fx.burst(x, y, { count: 16, color: ['#7f90b8', '#a9b6d6'], size: [3, 7], sizeEnd: 1.8, speed: [20, 70], angle: -Math.PI / 2, spread: 1.6, life: [0.7, 1.2], drag: 2.4, glow: true });
    PP.echo.sonar(x, y - 4, 230, 90, 'crash');
  }
  PP.stalCrash = crash;

  const mk = (x, y, r, o) => Object.assign({ x, y: y - 2, len: r.range(30, 48), w: r.range(9, 13), state: 'hang', t: 0, fy: y - 2, vy: 0, lit: -99, tick: 0 }, o || {});

  HZ.def('stals', {
    place(lv, r, cfg, Q) {
      const k = cfg.n || 4, path = lv.path;
      const [i0, i1] = HZ.range(lv, cfg, 0.1, 0.92);
      if (cfg.stage) {
        // the introduction: one drops onto empty rock ahead of you, ticking first
        for (let d = 0; d < 6; d++) {
          const p = Q.pathAt(cfg.stage + d * 0.01), c = Q.ceilingAbove(p.x, p.y, 280);
          if (c !== null && p.y - c > 60) { lv.stals.push(mk(p.x, c, r, { stage: true })); break; }
        }
      }
      let lastX = -999;
      for (let i = i0; i < i1 && lv.stals.filter(s => !s.stage).length < k; i += r.int(10, 22)) {
        const p = path[i];
        if (p.x - lastX < 150) continue;
        const sx = p.x + r.range(-20, 20);
        const c = Q.ceilingAbove(sx, p.y, 280);
        if (c === null || p.y - c < 50) continue;
        lv.stals.push(mk(sx, c, r));
        lastX = p.x;
      }
    },
    update(dt, G, L) {
      const b = G.bat, alive = !b.dead;
      for (const s of L.stals) {
        if (s.state === 'hang') {
          const trig = s.stage ? (b.x > s.x - 340 && b.x < s.x) : (Math.abs(b.x - s.x) < 48 && b.y > s.y && b.y - s.y < 330);
          if (alive && trig) {
            s.state = 'shake'; s.t = s.stage ? 1.1 : 0.55;
            if (s.stage && G.mode === 'play') PP.run.hint('Listen: stalactites tick before they fall');
          }
        } else if (s.state === 'shake') {
          s.t -= dt;
          if ((s.tick -= dt) <= 0) {
            s.tick = 0.11;
            if (dist(b.x, b.y, s.x, s.y) < 520) { PP.sfx('tick', { pan: HZ.pan(s.x) }); PP.caption('tick tick', s.x, s.y, CH.HAZ); }
            PP.echo.addDot(s.x + G.fxr.range(-5, 5), s.fy + s.len * G.fxr.range(0.2, 0.9), G.t, CH.HAZ, 0.7);
            Kit.fx.burst(s.x, s.y + 4, { count: 2, color: ['#ff8c9e', '#9aa9c8'], size: [1, 2], speed: [10, 40], angle: Math.PI / 2, spread: 0.6, gravity: 500, life: [0.4, 0.7], glow: true });
          }
          if (s.t <= 0) { s.state = 'fall'; s.vy = 40; if (dist(b.x, b.y, s.x, s.y) < 600) { PP.sfx('crack'); PP.sfx('fallwhoosh'); } }
        } else if (s.state === 'fall') {
          s.vy += 1500 * dt;
          s.fy += s.vy * dt;
          const tip = s.fy + s.len;
          if (alive && Kit.segCircle(s.x, s.fy, s.x, tip, b.x, b.y, b.r + 3)) {
            PP.run.hurt(PP.data.tuning.damage.stal, s.x, s.fy, 'stal');
            crash(s, b.x, b.y);
          } else if (PP.world.fieldAt(s.x, tip) >= 0.5 || PP.world.typeAt(s.x, tip) === 2) crash(s, s.x, tip);
        }
      }
    },
    ping(E) {
      for (const s of PP.L.stals) if (s.state !== 'gone') {
        const x = s.x, y = s.fy + s.len * 0.5;
        if (E.ping(s, x, y, CH.HAZ, 0, 0)) {
          const ta = E.t0 + dist(E.ox, E.oy, x, y) / E.speed;
          for (let k = 0; k <= 4; k++) { const f = k / 4; E.addDot(x + (k % 2 ? -1 : 1) * s.w * (1 - f) * 0.5, s.fy + s.len * f, ta + f * 0.03, CH.HAZ, 0.8); }
        }
      }
      if (E.kind === 'shriek') for (const s of PP.L.stals) if (s.state === 'hang' && dist(E.ox, E.oy, s.x, s.fy) < 380) { s.state = 'shake'; s.t = 0.35 + dist(E.ox, E.oy, s.x, s.fy) / 1200; }
    },
    draw(ctx, t, V) {
      const b = PP.G.bat;
      for (const s of PP.L.stals) {
        if (s.state === 'gone' || !V.inView(s.x, s.fy, 80)) continue;
        const near = Math.max(0, 1 - dist(b.x, b.y, s.x, s.fy + s.len) / 110);
        const a = Math.max(PP.R.litA(s.lit, t), near * 0.8, s.state === 'shake' ? 0.55 + 0.45 * Math.sin(t * 40) : 0, s.state === 'fall' ? 1 : 0);
        if (a <= 0.01) continue;
        const jx = s.state === 'shake' ? Math.sin(t * 70) * 1.6 : 0;
        ctx.save();
        ctx.translate(s.x + jx, s.fy);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#1b2236';
        ctx.beginPath(); ctx.moveTo(-s.w, -2); ctx.quadraticCurveTo(-s.w * 0.35, s.len * 0.5, 0, s.len); ctx.quadraticCurveTo(s.w * 0.35, s.len * 0.5, s.w, -2); ctx.closePath(); ctx.fill();
        if (V.detail) { ctx.strokeStyle = 'rgba(200,210,235,0.18)'; ctx.lineWidth = V.minW(0.8); ctx.beginPath(); for (let k = 1; k < 4; k++) { const yy = s.len * k / 4.5; ctx.moveTo(-s.w * (1 - yy / s.len) * 0.8, yy); ctx.lineTo(s.w * (1 - yy / s.len) * 0.6, yy + 2); } ctx.stroke(); }
        ctx.strokeStyle = PP.P.red; ctx.lineWidth = V.minW(1.4);
        ctx.beginPath(); ctx.moveTo(-s.w, -2); ctx.quadraticCurveTo(-s.w * 0.35, s.len * 0.5, 0, s.len); ctx.quadraticCurveTo(s.w * 0.35, s.len * 0.5, s.w, -2); ctx.stroke();
        ctx.restore();
        if (s.state !== 'hang') PP.R.glow(ctx, s.x, s.fy + s.len * 0.6, 30, PP.P.red, 0.4 * a);
        if (s.state === 'fall') {
          const L2 = Math.min(90, s.vy * 0.09);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = PP.P.red; ctx.lineWidth = V.minW(1.2);
          for (const [ox, k] of [[-s.w * 0.6, 0.35], [0, 0.55], [s.w * 0.6, 0.35]]) {
            ctx.globalAlpha = k;
            ctx.beginPath(); ctx.moveTo(s.x + ox, s.fy - 4); ctx.lineTo(s.x + ox * 0.6, s.fy - 4 - L2); ctx.stroke();
          }
          ctx.globalAlpha = 0.8; ctx.fillStyle = '#c9d2ea';
          for (let k = 0; k < 4; k++) ctx.fillRect(s.x + Math.sin(k * 2.3) * s.w * 0.9, s.fy - 10 - k * L2 * 0.25, V.minW(2), V.minW(2));
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    },
    debug: L => L.stals.length,
  });
})();
