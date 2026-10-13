/* The collapse wave (Escape missions): the ceiling behind you comes down as a band of falling stone that moves
 * 90 px/s, rising to 140 px/s. Touching it costs 25 energy and shoves you forward; 3 s inside it and you are
 * overtaken. It speaks in red: danger echoes along its front, a rumble, and a caption at the screen edge. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const BAND = 150;

  HZ.def('collapse', {
    place(lv, r, cfg) {
      lv.collapse = { x: cfg.x0 === undefined ? -240 : cfg.x0, v: 0, cfg, t: 0, on: false, inside: 0, iframes: 0, ping: 0, rumble: 0, rocks: [] };
    },
    update(dt, G, L) {
      const C = L.collapse;
      if (!C) return;
      const b = G.bat, cfg = C.cfg;
      C.t += dt;
      if (!C.on) { if (C.t >= (cfg.delay || 3) && G.sub === 'cave') { C.on = true; PP.run.banner('Run!', 'The stair is falling', 2.2); PP.sfx('crash'); Kit.fx.shake(10, 600); } else return; }
      if (G.sub !== 'cave' && G.sub !== 'dead') return;
      const k = Math.min(1, (C.t - (cfg.delay || 3)) / (cfg.ramp || 50));
      C.v = (cfg.v0 || 90) + ((cfg.v1 || 140) - (cfg.v0 || 90)) * k;
      // never let the bat get impossibly far ahead of the wave: it catches up a little faster when far behind
      const gap = b.x - C.x;
      C.x = Math.min(L.W - 160, C.x + C.v * dt * (gap > 900 ? 1.6 : 1));
      C.iframes = Math.max(0, C.iframes - dt);
      G.danger = Math.max(G.danger || 0, gap < 450 ? 2 : 0);
      // falling stones in the band (cosmetic stream)
      if (C.rocks.length < 60 && G.fxr.chance(0.9)) C.rocks.push({ x: C.x - G.fxr.range(0, BAND), y: b.y - G.fxr.range(260, 520), vy: G.fxr.range(80, 220), s: G.fxr.range(3, 9), a: G.fxr.range(0, 6) });
      for (const s of C.rocks) { s.vy += 900 * dt; s.y += s.vy * dt; s.a += dt * 4; }
      PP.compact(C.rocks, s => s.y < b.y + 600 && s.x > C.x - BAND - 40);
      // red danger echoes along the front, so the wave can be heard as well as felt
      if ((C.ping -= dt) <= 0) {
        C.ping = 0.3;
        for (let k2 = 0; k2 < 7; k2++) {
          const y = b.y + G.fxr.range(-420, 420);
          if (PP.world.fieldAt(C.x, y) < 0.5) PP.echo.addDot(C.x + G.fxr.range(-20, 10), y, G.t, CH.HAZ, G.fxr.range(0.6, 1.3));
        }
      }
      if ((C.rumble -= dt) <= 0) {
        C.rumble = 0.55;
        const d = Math.max(0, b.x - C.x);
        if (d < 1100) { PP.sfx('rumble', { vol: Math.max(0.15, 1 - d / 1100), pan: -0.6 }); PP.caption('rumbling', C.x, b.y, CH.HAZ); Kit.fx.shake(2 + 5 * Math.max(0, 1 - d / 600), 300); }
      }
      if (b.dead) return;
      if (b.x - b.r < C.x + 4) {
        C.inside += dt;
        if (C.iframes <= 0) {
          C.iframes = 1.2;
          PP.emit('collapseTouch', C);
          PP.run.hurt(PP.data.tuning.damage.collapse, b.x - 40, b.y, 'collapse');
          b.vx = Math.max(b.vx, 420);
        } else b.vx = Math.max(b.vx, 200);
        if (C.inside > 3) PP.run.overtaken();
      } else C.inside = Math.max(0, C.inside - dt * 0.5);
    },
    holes(hole) { const C = PP.L.collapse; if (C && C.on) { const b = PP.G.bat; hole(C.x - 40, b.y, 260, 0.35); } },
    draw(ctx, t, V) {
      const C = PP.L.collapse;
      if (!C || !C.on || C.x < V.x0 - 40) return;
      const x1 = Math.min(C.x - BAND * 0.6, V.x1);
      // the rubble behind the front buries the map you made
      if (x1 > V.x0) {
        ctx.fillStyle = '#050508';
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.moveTo(V.x0 - 10, V.y0 - 10);
        for (let y = V.y0 - 10; y <= V.y1 + 10; y += 24) ctx.lineTo(x1 + Math.sin(y * 0.05 + t * 3) * 14 + Math.sin(y * 0.13) * 10, y);
        ctx.lineTo(V.x0 - 10, V.y1 + 10);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // the red front
      ctx.globalCompositeOperation = 'lighter';
      for (let y = Math.floor(V.y0 / 90) * 90; y < V.y1 + 90; y += 90) PP.R.glow(ctx, C.x - 30, y + Math.sin(y + t * 5) * 20, 120, PP.P.red, 0.12 + 0.05 * Math.sin(t * 9 + y));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#2a2630';
      ctx.strokeStyle = PP.P.red;
      ctx.lineWidth = V.minW(1);
      for (const s of C.rocks) {
        if (!V.inView(s.x, s.y, 20)) continue;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.beginPath(); ctx.moveTo(-s.s, -s.s * 0.6); ctx.lineTo(s.s * 0.8, -s.s); ctx.lineTo(s.s, s.s * 0.7); ctx.lineTo(-s.s * 0.6, s.s); ctx.closePath();
        ctx.fill(); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.restore();
      }
    },
    debug: L => (L.collapse ? Math.round(L.collapse.x) : null),
  });
})();
