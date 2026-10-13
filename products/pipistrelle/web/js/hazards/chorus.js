/* The Chorus (the finale, The Hush). Somewhere in the Hush is its heart, a ring of old stone that hums. Shriek
 * there and every pup you have ever brought home sings with you: one ring whose radius is
 * 600 + 4 x (pups rescued in the whole save, plus the ones trailing you), capped at 3,000 px. A player who rescued
 * everyone lights the entire final cavern with one call. Until it is sung, the heart hums: a silver spark and a
 * caption when you are within 700 px. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;

  HZ.chorusRadius = trail => {
    const P = PP.profile.get();
    return Math.min(3000, 600 + 4 * ((P.stats.pups | 0) + (trail | 0)));
  };

  HZ.def('chorus', {
    place(lv, r, cfg, Q) {
      // the biggest chamber in the second half, or a roomy spot on the path
      let best = null;
      for (const c of lv.chambers) if (c.x > lv.W * 0.45 && c.x < lv.W * 0.9 && (!best || c.r > best.r)) best = c;
      const p = best || Q.pathAt(cfg.at || 0.7);
      lv.heart = { x: p.x, y: p.y, r: 70, sung: false, t: -99, hum: 0, hinted: false };
    },
    update(dt, G, L) {
      const H = L.heart;
      if (!H) return;
      const b = G.bat, d = dist(b.x, b.y, H.x, H.y);
      if (!H.sung) {
        if ((H.hum -= dt) <= 0) {
          H.hum = 1.6;
          if (d < 700) {
            for (let k = 0; k < 6; k++) { const a = k / 6 * PP.TAU + G.t; PP.echo.addDot(H.x + Math.cos(a) * H.r, H.y + Math.sin(a) * H.r * 0.5, G.t + k * 0.04, CH.MOON, 0.8); }
            PP.sfx('ring', { pitch: -12, vol: Math.max(0.15, 1 - d / 700) * 0.5, pan: HZ.pan(H.x) });
            if (d < 500) PP.caption('hum', H.x, H.y, CH.MOON);
          }
        }
        if (d < 160 && !H.hinted && G.mode === 'play') { H.hinted = true; PP.run.hint('Shriek here: the colony will sing with you'); }
      }
    },
    holes(hole, t) {
      const H = PP.L.heart;
      if (!H) return;
      const since = t - H.t;
      if (H.sung && since < 6) hole(H.x, H.y, 600 * (1 - since / 6) + 120, 0.5 * (1 - since / 6));
      else if (!H.sung) hole(H.x, H.y, 90, 0.18 + 0.06 * Math.sin(t * 2));
    },
    draw(ctx, t, V) {
      const H = PP.L.heart;
      if (!H || !V.inView(H.x, H.y, H.r + 80)) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = PP.COL[CH.MOON];
      ctx.lineWidth = V.minW(1.6);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = (H.sung ? 0.25 : 0.1 + 0.12 * pulse) * (1 - k * 0.25);
        ctx.beginPath(); ctx.ellipse(H.x, H.y, H.r * (1 + k * 0.28), H.r * 0.5 * (1 + k * 0.28), 0, 0, PP.TAU); ctx.stroke();
      }
      PP.R.glow(ctx, H.x, H.y, 60, PP.COL[CH.MOON], H.sung ? 0.3 : 0.12 + 0.08 * pulse);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    debug: L => (L.heart ? { sung: L.heart.sung, R: HZ.chorusRadius(0) } : null),
  });

  // shriek at the heart: the Chorus
  PP.on('shriek', () => {
    const G = PP.G, L = PP.L;
    if (!G || !L || !L.heart || L.heart.sung || G.sub !== 'cave') return;
    const H = L.heart, b = G.bat;
    if (dist(b.x, b.y, H.x, H.y) > 150) return;
    H.sung = true; H.t = G.t; G.hint = null;
    const R = HZ.chorusRadius(G.trail.length);
    PP.echo.sonar(H.x, H.y, R, 800, 'chorus');
    for (const p of G.trail) Kit.fx.shockwave(p.x, p.y, { radius: 120, color: PP.P.pink, width: 3, ms: 900, glow: true });
    Kit.fx.shockwave(H.x, H.y, { radius: 300, color: PP.COL[CH.MOON], width: 4, ms: 1400, glow: true });
    PP.sfx('exit', { vol: 1 });
    PP.sfx('ring', { pitch: 0, vol: 1, delay: 200 });
    PP.sfx('ring', { pitch: 4, vol: 0.8, delay: 500 });
    PP.sfx('ring', { pitch: 7, vol: 0.8, delay: 800 });
    Kit.fx.shake(6, 900);
    PP.emit('chorus', { R });
    if (G.mode === 'play') PP.run.banner('The Chorus', 'Every pup you have brought home sings with you', 3.6);
  });
})();
