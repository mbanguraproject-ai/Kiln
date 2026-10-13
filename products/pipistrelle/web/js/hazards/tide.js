/* The rising flood (Escape missions in the Drowned Halls): the hill's water pours in behind you. Its front moves
 * 85 px/s rising to 130 px/s, and behind the front the surface climbs steeply, so the low passages fill first and a
 * bat that keeps high has a little more room than one that hugs the floor. In the water you are dragged, slowed
 * and lose energy; 3 s under and you are overtaken. It speaks in blue and red: blue echoes along its surface, red
 * at its foaming front, a rushing roar with a caption at the screen edge. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;

  // The water lies in level terraces, one per 120 px step of the stair: each step behind the front holds water a
  // little higher than the one ahead, and spills over into it. surfaceAt(x) is that step's level (Infinity where
  // the flood has not reached).
  const TW = 120;
  function levelOf(T, k) {
    const lv = PP.L, behind = T.x - (k + 0.5) * TW;
    return Math.max(-80, lv.H + 40 - Math.max(0, behind) * (T.cfg.slope || 1.15));
  }
  function surfaceAt(T, x, t) {
    if (x >= T.x) return Infinity;
    return levelOf(T, Math.floor(x / TW)) + Math.sin(x * 0.045 + t * 2.6) * 2.2 + Math.sin(x * 0.013 - t * 1.4) * 2.8;
  }
  HZ.tideSurface = (x, t) => { const T = PP.L && PP.L.tide; return T && T.on ? surfaceAt(T, x, t === undefined ? PP.G.t : t) : Infinity; };

  HZ.def('tide', {
    place(lv, r, cfg) {
      lv.tide = { x: cfg.x0 === undefined ? -260 : cfg.x0, v: 0, cfg, t: 0, on: false, under: 0, touchCd: 0, ping: 0, roar: 0, bubbles: [] };
    },
    update(dt, G, L) {
      const T = L.tide;
      if (!T) return;
      const b = G.bat, cfg = T.cfg;
      T.t += dt;
      if (!T.on) {
        if (T.t >= (cfg.delay || 3) && G.sub === 'cave') { T.on = true; PP.run.banner('The water is rising!', 'Keep ahead of the flood', 2.4); PP.sfx('rush', { vol: 1 }); Kit.fx.shake(6, 500); }
        else return;
      }
      if (G.sub !== 'cave' && G.sub !== 'dead') return;
      const k = Math.min(1, (T.t - (cfg.delay || 3)) / (cfg.ramp || 50));
      T.v = (cfg.v0 || 85) + ((cfg.v1 || 130) - (cfg.v0 || 85)) * k;
      // the flood never lets the bat get impossibly far ahead: it runs faster when far behind
      const gap = b.x - T.x;
      T.x = Math.min(L.W - 160, T.x + T.v * dt * (gap > 900 ? 1.6 : 1));
      T.touchCd = Math.max(0, T.touchCd - dt);
      G.danger = Math.max(G.danger || 0, gap < 520 ? 2 : 0);
      // cosmetic bubbles rising at the front
      if (T.bubbles.length < 50 && G.fxr.chance(0.7)) {
        const bx = T.x - G.fxr.range(1, 260), sy = surfaceAt(T, bx, G.t);
        if (sy < L.H) T.bubbles.push({ x: bx, y: Math.min(L.H, sy + G.fxr.range(30, 220)), vy: -G.fxr.range(40, 110), s: G.fxr.range(1.5, 4), top: sy });
      }
      for (const s of T.bubbles) { s.y += s.vy * dt; s.x += Math.sin(s.y * 0.05) * 10 * dt; }
      PP.compact(T.bubbles, s => s.y > s.top && s.x > T.x - 700);
      // blue echoes along the surface near the bat and red ones at the front, so the flood can be heard coming
      if ((T.ping -= dt) <= 0) {
        T.ping = 0.32;
        for (let n = 0; n < 9; n++) {
          const x = b.x + G.fxr.range(-460, 160), y = surfaceAt(T, x, G.t);
          if (y < L.H && y > -60 && PP.world.fieldAt(x, y - 4) < 0.5) PP.echo.addDot(x, y, G.t, CH.WATER, G.fxr.range(0.5, 1.1));
        }
        for (let n = 0; n < 4; n++) {
          const y = b.y + G.fxr.range(-380, 380);
          if (y > surfaceAt(T, T.x - 30, G.t) && PP.world.fieldAt(T.x - 20, y) < 0.5) PP.echo.addDot(T.x - G.fxr.range(0, 30), y, G.t, CH.HAZ, G.fxr.range(0.6, 1.2));
        }
      }
      if ((T.roar -= dt) <= 0) {
        T.roar = 0.6;
        const d = Math.max(0, b.x - T.x);
        if (d < 1200) { PP.sfx('rush', { vol: Math.max(0.15, 1 - d / 1200), pan: -0.6 }); PP.caption('rushing water', T.x, b.y, CH.WATER); Kit.fx.shake(1.5 + 3 * Math.max(0, 1 - d / 700), 300); }
      }
      if (b.dead) return;
      const sy = surfaceAt(T, b.x, G.t);
      if (b.y + b.r * 0.4 > sy) {
        T.under += dt;
        // dragged, slowed and pushed back up towards the air
        b.vx *= Math.max(0, 1 - 2.4 * dt);
        b.vy -= 340 * dt;
        PP.run.damage((cfg.drain || 7) * dt, 'tide');
        if (T.touchCd <= 0) {
          T.touchCd = 1.1;
          PP.emit('tideTouch', T);
          PP.sfx('splash', { vol: 1, pitch: -3 });
          PP.haptic(22);
          Kit.fx.burst(b.x, sy, { count: 18, color: [PP.P.water, '#a9c8ff', '#ffffff'], size: [1.2, 3], speed: [60, 200], angle: -Math.PI / 2, spread: 1.2, gravity: 520, life: [0.4, 0.8], glow: true });
          PP.run.toast('In the flood', 'Fly up and on', 1.6, 'lost');
        }
        if (T.under > (cfg.breath || 3)) PP.run.overtaken();
      } else T.under = Math.max(0, T.under - dt * 0.6);
    },
    holes(hole, t) {
      const T = PP.L.tide;
      if (!T || !T.on) return;
      const b = PP.G.bat, y = surfaceAt(T, Math.min(b.x, T.x - 40), t);
      if (y < PP.L.H) hole(Math.min(b.x, T.x - 40), y, 230, 0.3);
    },
    draw(ctx, t, V) {
      const T = PP.L.tide;
      if (!T || !T.on || T.x < V.x0 - 40) return;
      const k0 = Math.floor(V.x0 / TW) - 1, k1 = Math.floor(Math.min(T.x, V.x1 + TW) / TW);
      const g = ctx.createLinearGradient(0, V.y0, 0, V.y1);
      g.addColorStop(0, 'rgba(18,56,92,0.9)'); g.addColorStop(1, 'rgba(3,10,22,0.97)');
      // each terrace: a body of water with a moving skin
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let k = k0; k <= k1; k++) {
        const xa = k * TW, xb = Math.min((k + 1) * TW, T.x), y = levelOf(T, k);
        if (xb <= xa || y > V.y1 + 10) continue;
        ctx.moveTo(xa, V.y1 + 10);
        for (let x = xa; x <= xb; x += 10) ctx.lineTo(x, surfaceAt(T, Math.min(x, xb - 0.01), t));
        ctx.lineTo(xb, V.y1 + 10);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = V.minW(1.6);
      for (let k = k0; k <= k1; k++) {
        const xa = k * TW, xb = Math.min((k + 1) * TW, T.x), y = levelOf(T, k);
        if (xb <= xa || y > V.y1) continue;
        // the skin, and a fainter caustic line under it
        for (let q = 0; q < 2; q++) {
          ctx.strokeStyle = q ? '#9fd0ff' : PP.P.water;
          ctx.globalAlpha = q ? 0.12 : 0.5;
          ctx.beginPath();
          for (let x = xa; x <= xb; x += 10) ctx.lineTo(x, surfaceAt(T, Math.min(x, xb - 0.01), t) + q * (6 + Math.sin(x * 0.08 + t * 3) * 2));
          ctx.stroke();
        }
        // the spill into the next step down: a short white fall with spray at its foot
        const yNext = k + 1 < T.x / TW ? levelOf(T, k + 1) : Infinity;
        if (xb === (k + 1) * TW && yNext - y > 6) {
          const yb = Math.min(yNext, V.y1 + 10);
          ctx.strokeStyle = '#d8ecff';
          for (let q = 0; q < 3; q++) {
            ctx.globalAlpha = 0.18 - q * 0.04;
            ctx.lineWidth = V.minW(2.4 - q * 0.6);
            ctx.beginPath();
            for (let yy = y; yy <= yb; yy += 8) ctx.lineTo(xb + q * 3 + Math.sin(yy * 0.12 + t * 9 + q) * 1.5, yy);
            ctx.stroke();
          }
          if (yNext < V.y1) PP.R.glow(ctx, xb + 4, yNext, 16, '#cfe6ff', 0.18 + 0.06 * Math.sin(t * 11 + k));
        }
      }
      // the foaming front, in danger red
      const fy = levelOf(T, Math.floor((T.x - 1) / TW));
      for (let y = Math.max(V.y0, fy); y < Math.min(V.y1, PP.L.H); y += 70) PP.R.glow(ctx, T.x - 18, y + Math.sin(y + t * 6) * 16, 90, PP.P.red, 0.1 + 0.05 * Math.sin(t * 8 + y));
      ctx.fillStyle = '#cfe2ff';
      for (const s of T.bubbles) {
        if (!V.inView(s.x, s.y, 10)) continue;
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, PP.TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    debug: L => (L.tide ? Math.round(L.tide.x) : null),
  });
})();
