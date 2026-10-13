/* The Grey Lady (the Owlstone Crypt's set piece): a great grey owl who hunts the crypt by ear. She sits on a perch
 * and listens. A call within 1,100 px turns her head (a hoot and a red caption, 0.8 s), then she flies to the
 * loudest sound she heard, which is where you called, not where you are now, and searches there before going back
 * to a perch. A crystal's re-echo is louder than a chirp, so it draws her off. In the last stretch of the crypt she
 * gives up listening and follows you to the arch, a little slower than a bat. Caught in her talons, you lose energy
 * and are thrown clear. She is never harmed, only outwitted: at the arch the old bell rings and she flies out into
 * the night. Hark's whispers and Gale's bolt are the bats' other answers to her. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, HZ = PP.hazards;
  const { dist, clamp } = Kit;

  HZ.def('greylady', {
    place(lv, r, cfg, Q) {
      const perches = [];
      for (const f of cfg.perches || [0.18, 0.34, 0.5, 0.64, 0.8]) {
        const p = Q.pathAt(f), c = Q.ceilingAbove(p.x, p.y, 320);
        perches.push({ x: p.x, y: c === null ? p.y - 60 : Math.min(p.y - 30, c + 34) });
      }
      const p0 = perches[0];
      lv.lady = { perches, x: p0.x, y: p0.y, state: 'perch', t: 0, tx: 0, ty: 0, vx: 0, vy: 0, face: 1, lit: -99, heardT: -1, hootCd: 0, chaseAt: cfg.chaseAt || 0.8, speed: cfg.speed || 235, chaseSpeed: cfg.chaseSpeed || 205, cfg, flap: 0 };
    },
    update(dt, G, L) {
      const D = L.lady;
      if (!D || G.mode !== 'play') return;
      const b = G.bat, alive = !b.dead;
      D.hootCd = Math.max(0, D.hootCd - dt);
      D.flap += dt * (D.state === 'perch' ? 0 : 9);
      // the loudest sound she could hear since she last listened
      const fresh = () => {
        let best = null;
        for (const s of PP.owlSounds || []) {
          if (s.t <= D.heardT || s.loud < 0.5 || dist(s.x, s.y, D.x, D.y) > 1100) continue;
          if (!best || s.loud > best.loud || (s.loud === best.loud && s.t > best.t)) best = s;
        }
        return best;
      };
      const flyTo = (x, y, sp) => {
        const d = Math.max(1, dist(D.x, D.y, x, y));
        const want = Math.min(sp, d * 3);
        D.vx += ((x - D.x) / d * want - D.vx) * Math.min(1, dt * 4);
        D.vy += ((y - D.y) / d * want - D.vy) * Math.min(1, dt * 4);
        D.x += D.vx * dt; D.y += D.vy * dt;
        D.face = D.vx < 0 ? -1 : 1;
        return d;
      };
      if (alive && D.state !== 'chase' && b.x > L.W * D.chaseAt && G.sub === 'cave') {
        D.state = 'chase';
        PP.run.banner('She is coming!', 'Fly to the arch', 2.4);
        PP.sfx('hoot', { vol: 1, pitch: -5 });
        PP.caption('HOOO', D.x, D.y, CH.HAZ);
      }
      if (D.state === 'perch') {
        const p = D.perches.reduce((a, q) => (dist(q.x, q.y, D.x, D.y) < dist(a.x, a.y, D.x, D.y) ? q : a));
        flyTo(p.x, p.y, 90);
        const s = fresh();
        if (s) { D.state = 'turn'; D.t = 0.8; D.tx = s.x; D.ty = s.y; D.heardT = s.t; PP.sfx('hoot', { pan: HZ.pan(D.x), pitch: -4 }); PP.caption('hooo', D.x, D.y, CH.HAZ); }
      } else if (D.state === 'turn') {
        D.t -= dt;
        D.face = D.tx < D.x ? -1 : 1;
        if (D.t <= 0) { D.state = 'fly'; PP.sfx('swoop', { pan: HZ.pan(D.x) }); }
      } else if (D.state === 'fly') {
        const d = flyTo(D.tx, D.ty, D.speed);
        const s = fresh();
        if (s) { D.tx = s.x; D.ty = s.y; D.heardT = s.t; }
        if (d < 24) { D.state = 'search'; D.t = 1.6; }
      } else if (D.state === 'search') {
        D.t -= dt;
        flyTo(D.tx + Math.cos(G.t * 3) * 50, D.ty + Math.sin(G.t * 3) * 30, 150);
        const s = fresh();
        if (s) { D.state = 'turn'; D.t = 0.4; D.tx = s.x; D.ty = s.y; D.heardT = s.t; }
        else if (D.t <= 0) D.state = 'perch';
      } else if (D.state === 'chase') {
        flyTo(b.x, b.y, D.chaseSpeed + (b.x - D.x > 700 ? 120 : 0));
        if (D.hootCd <= 0 && dist(b.x, b.y, D.x, D.y) < 600) { D.hootCd = 1.4; PP.sfx('hoot', { pan: HZ.pan(D.x), pitch: -5, vol: 0.7 }); PP.caption('hooo', D.x, D.y, CH.HAZ); }
      } else if (D.state === 'climb') {
        D.t -= dt;
        flyTo(D.x - D.face * 60, D.y - 120, 160);
        if (D.t <= 0) D.state = b.x > L.W * D.chaseAt ? 'chase' : 'perch';
      }
      // talons: caught, thrown clear, never killed outright
      if (alive && D.state !== 'climb' && D.state !== 'perch' && D.state !== 'turn' && b.dash <= 0 && dist(D.x, D.y, b.x, b.y) < b.r + 20) {
        PP.emit('talon', D);
        PP.run.hurt(PP.data.tuning.damage.owl + 4, D.x, D.y, 'talon');
        PP.caption('caught!', b.x, b.y, CH.HAZ);
        D.state = 'climb'; D.t = 1.6;
      }
      if (D.state !== 'perch') G.danger = Math.max(G.danger || 0, D.state === 'chase' ? 3 : 2);
    },
    ping(E) {
      const D = PP.L.lady;
      if (D) E.ping(D, D.x, D.y, CH.HAZ, 8, 14);
    },
    draw(ctx, t, V) {
      const D = PP.L.lady;
      if (!D || !V.inView(D.x, D.y, 80)) return;
      const b = PP.G.bat, near = Math.max(0, 1 - dist(b.x, b.y, D.x, D.y) / 220);
      const a = Math.max(PP.R.litA(D.lit, t), near * 0.9, D.state === 'perch' ? 0.06 : 0.75);
      const flying = D.state !== 'perch' && D.state !== 'turn';
      ctx.save();
      ctx.translate(D.x, D.y);
      ctx.scale(1.9, 1.9);
      ctx.globalAlpha = a;
      // wings
      ctx.fillStyle = '#4b4a52';
      if (flying) {
        const fl = Math.sin(D.flap) * 9;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -4); ctx.quadraticCurveTo(s * 24, -18 - fl, s * 40, -6 - fl); ctx.quadraticCurveTo(s * 22, 4, s * 6, 7); ctx.fill(); }
      }
      // body and the great grey facial disc with its rings
      ctx.fillStyle = '#5e5d66';
      ctx.beginPath(); ctx.ellipse(0, 2, 12, 16, 0, 0, PP.TAU); ctx.fill();
      ctx.fillStyle = '#8e8d96';
      ctx.beginPath(); ctx.arc(0, -6, 10, 0, PP.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,48,0.7)'; ctx.lineWidth = 0.7;
      for (const s of [-1, 1]) for (let q = 1; q <= 3; q++) { ctx.beginPath(); ctx.arc(s * 4.4, -6, q * 1.9 + 1, 0, PP.TAU); ctx.stroke(); }
      ctx.strokeStyle = Kit.gfx.alpha(PP.P.red, 0.75); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 2, 12, 16, 0, 0, PP.TAU); ctx.stroke();
      // the white "bow tie" at her throat
      ctx.fillStyle = '#e6e3ea';
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(0, 5.5); ctx.lineTo(4, 4); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      // eyes: closed slits while she rests, bright yellow when she listens or hunts
      if (D.state === 'perch') {
        ctx.save(); ctx.translate(D.x, D.y); ctx.scale(1.9, 1.9); ctx.globalAlpha = a; ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-3, -6); ctx.moveTo(3, -6); ctx.lineTo(6, -6); ctx.stroke(); ctx.restore();
      } else {
        for (const s of [-1, 1]) {
          const ex = D.x + s * 4.4 * 1.9, ey = D.y - 6 * 1.9;
          ctx.globalCompositeOperation = 'lighter';
          PP.R.glow(ctx, ex, ey, 14, '#ffd36a', 0.85);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.max(a, 0.8);
          ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, PP.TAU); ctx.fill();
          ctx.fillStyle = '#120806'; ctx.beginPath(); ctx.arc(ex + D.face, ey, 1.5, 0, PP.TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    debug: L => (L.lady ? L.lady.state : null),
  });
  // at the arch the old bell rings, and she flies out into the night
  PP.on('exit', () => {
    const L = PP.L, G = PP.G;
    if (!L || !L.lady || !G || G.mode !== 'play') return;
    PP.sfx('ring', { pitch: -12, vol: 1 });
    PP.sfx('ring', { pitch: -5, vol: 0.7, delay: 260 });
    PP.run.banner('The old bell rings', 'The Grey Lady flies out into the night', 3);
  });
})();
