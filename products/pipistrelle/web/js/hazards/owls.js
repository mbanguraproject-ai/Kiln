/* Owls roost in side chambers. A shriek (or flying right up to one) wakes it: 0.9 s alert, then a swoop.
 * Hark's whisper chirps never wake them; Gale's loud chirps wake light sleepers within 260 px. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist } = Kit;

  function wakeOwl(o) {
    const G = PP.G;
    o.state = 'alert'; o.t = 0.9;
    PP.sfx('hoot', { pan: HZ.pan(o.x) });
    PP.caption('hoo-hoo', o.x, o.y, CH.HAZ);
    Kit.fx.burst(o.x, o.y - 10, { count: 10, color: [PP.P.red, '#ffb0bd'], glow: true, size: [1.5, 3], speed: [20, 70], life: [0.4, 0.8] });
    PP.emit('owlWake', o);
    if (G) G.danger = Math.max(G.danger || 0, 3);
  }
  PP.wakeOwl = wakeOwl;

  HZ.def('owls', {
    place(lv, r, cfg, Q) {
      const spots = lv.chambers.length ? lv.chambers.slice() : [Q.pathAt(0.4), Q.pathAt(0.7)];
      for (const c of spots) {
        if (lv.owls.length >= (cfg.n || 2)) break;
        const fl = Q.floorBelow(c.x, c.y, 400);
        if (fl === null) continue;
        lv.owls.push({ hx: c.x, hy: fl - 15, x: c.x, y: fl - 15, state: 'sleep', t: 0, vx: 0, vy: 0, lit: -99, cool: 0, ph: r.range(0, 6), face: 1 });
      }
    },
    update(dt, G, L) {
      const b = G.bat, alive = !b.dead;
      for (const o of L.owls) {
        o.cool = Math.max(0, o.cool - dt);
        if (o.state === 'sleep') {
          if (alive && o.cool <= 0 && dist(b.x, b.y, o.x, o.y) < 70) wakeOwl(o);
        } else if (o.state === 'alert') {
          o.t -= dt;
          o.face = b.x < o.x ? -1 : 1;
          if (o.t <= 0) {
            const d = Math.max(1, dist(o.x, o.y, b.x, b.y));
            o.vx = (b.x - o.x) / d * 400; o.vy = (b.y - o.y) / d * 400;
            o.state = 'swoop'; o.t = 1.3;
            PP.sfx('swoop', { pan: HZ.pan(o.x) });
          }
        } else if (o.state === 'swoop') {
          o.t -= dt;
          o.x += o.vx * dt; o.y += o.vy * dt;
          if (alive && b.dash <= 0 && dist(o.x, o.y, b.x, b.y) < b.r + 13) { PP.run.hurt(PP.data.tuning.damage.owl, o.x, o.y, 'owl'); o.state = 'back'; }
          else if (o.t <= 0 || PP.world.fieldAt(o.x, o.y) >= 0.5) {
            if (PP.world.fieldAt(o.x, o.y) >= 0.5) { Kit.fx.burst(o.x, o.y, { count: 12, color: ['#6b5040', '#c9b29a'], size: [2, 4], speed: [40, 120], gravity: 200, shape: 'square', spin: [-5, 5], life: [0.5, 1] }); PP.sfx('thud', { vol: 0.5 }); }
            o.state = 'back';
          }
        } else if (o.state === 'back') {
          const d = dist(o.x, o.y, o.hx, o.hy);
          if (d < 6) { o.state = 'sleep'; o.cool = 3.5; o.x = o.hx; o.y = o.hy; }
          else { o.x += (o.hx - o.x) / d * 190 * dt; o.y += (o.hy - o.y) / d * 190 * dt; }
        }
        if (o.state !== 'sleep') G.danger = Math.max(G.danger || 0, 1);
      }
    },
    ping(E) {
      const L = PP.L;
      for (const o of L.owls) E.ping(o, o.x, o.y, CH.HAZ, 5, 8);
      const loud = E.kind === 'shriek' ? 560 : (E.kind === 'chirp' && PP.bat.ability('bolt')) ? 260 : 0;
      if (loud && !(E.kind === 'chirp' && PP.bat.ability('hark'))) {
        for (const o of L.owls) if (o.state === 'sleep' && o.cool <= 0 && dist(E.ox, E.oy, o.x, o.y) < loud) wakeOwl(o);
      }
    },
    draw(ctx, t, V) {
      const b = PP.G.bat;
      for (const o of PP.L.owls) {
        if (!V.inView(o.x, o.y, 40)) continue;
        const near = Math.max(0, 1 - dist(b.x, b.y, o.x, o.y) / 110);
        const a = Math.max(PP.R.litA(o.lit, t), near * 0.8, o.state !== 'sleep' ? 1 : 0);
        if (a > 0.01) drawOwl(ctx, o, t, a);
        if (o.state === 'sleep' && a > 0.2) {
          const z = (t * 0.6 + o.ph) % 1;
          Kit.gfx.text(ctx, 'z', o.x + 12 + z * 10, o.y - 22 - z * 16, { size: 10 + z * 4, color: '#ffb0bd', alpha: a * (1 - z) * 0.8, font: 'body', weight: 700, world: true });
        }
      }
    },
    debug: L => L.owls.length,
  });

  function drawOwl(ctx, o, t, a) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.globalAlpha = a;
    const swoop = o.state === 'swoop';
    if (swoop) ctx.rotate(Math.atan2(o.vy, o.vx) * 0.25);
    const bob = o.state === 'alert' ? Math.sin(t * 20) * 1.5 : Math.sin(t * 1.5 + o.ph) * 0.8;
    ctx.fillStyle = '#3a2a24';
    if (swoop || o.state === 'back') {
      const fl = Math.sin(t * 14) * 8;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -4); ctx.quadraticCurveTo(s * 22, -16 - fl, s * 34, -6 - fl); ctx.quadraticCurveTo(s * 22, 2, s * 6, 6); ctx.fill(); }
    }
    ctx.fillStyle = PP.P.owl;
    ctx.beginPath(); ctx.ellipse(0, bob, 12, 15, 0, 0, PP.TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -9 + bob); ctx.lineTo(-12, -19 + bob); ctx.lineTo(-4, -12 + bob); ctx.moveTo(10, -9 + bob); ctx.lineTo(12, -19 + bob); ctx.lineTo(4, -12 + bob); ctx.fill();
    ctx.strokeStyle = Kit.gfx.alpha(PP.P.red, 0.8); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, bob, 12, 15, 0, 0, PP.TAU); ctx.stroke();
    ctx.fillStyle = '#4a3a33';
    ctx.beginPath(); ctx.ellipse(0, 5 + bob, 7, 8, 0, 0, PP.TAU); ctx.fill();
    // breast barring
    ctx.strokeStyle = 'rgba(30,20,16,0.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(-4, 1 + k * 3 + bob); ctx.quadraticCurveTo(0, 3 + k * 3 + bob, 4, 1 + k * 3 + bob); } ctx.stroke();
    if (o.state === 'sleep') {
      ctx.strokeStyle = '#8a6a5a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-7, -4 + bob); ctx.quadraticCurveTo(-4.5, -2 + bob, -2, -4 + bob); ctx.moveTo(2, -4 + bob); ctx.quadraticCurveTo(4.5, -2 + bob, 7, -4 + bob); ctx.stroke();
    } else {
      ctx.restore();
      PP.R.glow(ctx, o.x - 4.5, o.y - 4 + bob, 12, '#ff6a3a', 0.9);
      PP.R.glow(ctx, o.x + 4.5, o.y - 4 + bob, 12, '#ff6a3a', 0.9);
      ctx.save(); ctx.translate(o.x, o.y); ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.arc(-4.5, -4 + bob, 3.4, 0, PP.TAU); ctx.arc(4.5, -4 + bob, 3.4, 0, PP.TAU); ctx.fill();
      ctx.fillStyle = '#1a0a08';
      ctx.beginPath(); ctx.arc(-4.5 + o.face, -4 + bob, 1.6, 0, PP.TAU); ctx.arc(4.5 + o.face, -4 + bob, 1.6, 0, PP.TAU); ctx.fill();
    }
    ctx.fillStyle = '#c99a4a';
    ctx.beginPath(); ctx.moveTo(-1.5, bob); ctx.lineTo(1.5, bob); ctx.lineTo(0, 3 + bob); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
})();
