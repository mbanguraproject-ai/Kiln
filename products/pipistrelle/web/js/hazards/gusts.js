/* Wind gusts up the chimneys: idle 2.3 s, a dusty warning for 0.8 s, then a blast upward. (Placed by the generator,
 * which carves the chimneys; this module times, pushes and draws them.) */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, HZ = PP.hazards;

  HZ.def('gust', {
    steer(dt, b) {
      const G = PP.G;
      for (const gu of PP.L.gusts) {
        const ph = (G.t + gu.ph) % gu.period;
        gu.state = ph < 2.3 ? 0 : ph < 3.1 ? 1 : 2;
        if (gu.state === 2 && Math.abs(b.x - gu.x) < gu.w * 0.65 && b.y > gu.y0 - 20 && b.y < gu.y1 + 30) b.vy -= 900 * dt * (b.r < 7 ? 1.3 : 1);
      }
    },
    update(dt, G, L) {
      const b = G.bat;
      for (const gu of L.gusts) {
        if (gu.state >= 1 && Math.abs(b.x - gu.x) < 700 && G.fxr.chance(gu.state === 2 ? 0.7 : 0.35)) {
          Kit.fx.burst(gu.x + G.fxr.range(-gu.w / 2, gu.w / 2), gu.y1, { count: 1, color: ['#cfe8ff', PP.P.teal], size: [1, 2], speed: gu.state === 2 ? [380, 520] : [140, 220], angle: -Math.PI / 2, spread: 0.08, life: [0.6, 0.9], drag: 0.2, glow: true, shape: 'spark' });
        }
        if (gu.state === 1 && gu.lastState !== 1 && Math.abs(b.x - gu.x) < 520) { PP.sfx('gust', { pan: HZ.pan(gu.x) }); PP.caption('wind rising', gu.x, gu.y1, PP.CH.ROCK); }
        gu.lastState = gu.state;
      }
    },
    draw(ctx, t, V) {
      for (const gu of PP.L.gusts) {
        if (!V.inView(gu.x, (gu.y0 + gu.y1) / 2, 300) || gu.state === 0) continue;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#cfe8ff';
        ctx.globalAlpha = gu.state === 2 ? 0.16 : 0.08;
        ctx.lineWidth = V.minW(1);
        for (let k = -2; k <= 2; k++) {
          const xx = gu.x + k * 12, off = (t * (gu.state === 2 ? 520 : 200) + k * 37) % 80;
          ctx.setLineDash([22, 58]); ctx.lineDashOffset = off;
          ctx.beginPath(); ctx.moveTo(xx, gu.y1); ctx.lineTo(xx, gu.y0); ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    debug: L => L.gusts.length,
  });
})();
