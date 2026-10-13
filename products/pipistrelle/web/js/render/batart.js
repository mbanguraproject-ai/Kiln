/* The one parametric bat renderer, drawn in the style of the app icon: a clean silhouette, scalloped membrane wings
 * on fine tapering finger bones with a glowing leading edge, big ears, a soft furred body and glowing almond eyes.
 * Every bat comes from its look (data/bats.js). Detail grows with the bat's size on screen, so it stays clean in
 * flight and rich in the Hangar. Used in flight, in the Hangar, the bat picker and the Roost. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const { clamp } = Kit;
  const mix = (a, b, t) => Kit.gfx.mix(a, b, t), alpha = (c, a) => Kit.gfx.alpha(c, a);
  const SHOULDER = [3.4, -2.2], ARM = 12.5, TIP = 19.5, HEAD = [-6.2, 6.5, 5.7], HIP = [3.1, 8.2];

  // colours and gradients derived from a look, built once; the gradients live in the bat's own coordinates, so
  // one set serves every pose, size and canvas
  const kits = new WeakMap();
  function kitOf(ctx, look) {
    let K = kits.get(look);
    if (K) return K;
    const edge = look.edge || mix(look.bone, '#ffd890', 0.55), span = look.span || 1;
    K = {
      edge, eye: look.eye || '#fff8e6', eyeGlow: look.eyeGlow || '#ffc35a',
      bone: mix(look.wing, look.bone, 0.5), arm: mix(look.wing, look.bone, 0.22),
      furHi: mix(look.fur, '#ffffff', 0.22), furLo: mix(look.fur, '#000000', 0.4),
      muzzle: mix(look.fur, look.belly, 0.38), nose: mix(look.fur, '#120808', 0.72),
      claw: mix(look.bone, '#1a1010', 0.5), tail: mix(look.wing, '#000000', 0.15),
      wing: [], ear: [],
    };
    for (const s of [-1, 1]) {
      const g = ctx.createRadialGradient(s * SHOULDER[0], SHOULDER[1], 1, s * SHOULDER[0], SHOULDER[1], 38 * span);
      g.addColorStop(0, mix(look.wing, '#000000', 0.38));
      g.addColorStop(0.42, look.wing);
      g.addColorStop(0.85, mix(look.wing, edge, 0.12));
      g.addColorStop(1, alpha(mix(look.wing, edge, 0.22), 0.88));
      K.wing.push(g);
      const e = ctx.createLinearGradient(s * 2.4, -4.6, s * 4.2 * (look.earW || 1), -4.4 - 9 * (look.ear || 1));
      e.addColorStop(0, mix(look.inner, '#3a1a1a', 0.35));
      e.addColorStop(0.55, look.inner);
      e.addColorStop(1, mix(look.inner, '#ffffff', 0.2));
      K.ear.push(e);
    }
    const b = ctx.createRadialGradient(-1.4, -0.5, 0.5, 0, 3, 9);
    b.addColorStop(0, K.furHi); b.addColorStop(0.5, look.fur); b.addColorStop(1, K.furLo);
    K.body = b;
    const bl = ctx.createRadialGradient(0, 4.6, 0.3, 0, 4.6, 5.4);
    bl.addColorStop(0, alpha(look.belly, 0.95)); bl.addColorStop(0.6, alpha(look.belly, 0.55)); bl.addColorStop(1, alpha(look.belly, 0));
    K.belly = bl;
    const hd = ctx.createRadialGradient(-1.7, -2.2, 0.4, 0, 0, 7.4);
    hd.addColorStop(0, K.furHi); hd.addColorStop(0.55, look.fur); hd.addColorStop(1, K.furLo);
    K.head = hd;
    const ey = ctx.createRadialGradient(0, -0.2, 0, 0, 0, 1.9);
    ey.addColorStop(0, '#ffffff'); ey.addColorStop(0.45, K.eye); ey.addColorStop(1, K.eyeGlow);
    K.eyeG = ey;
    const eh = ctx.createRadialGradient(0, 0, 0.6, 0, 0, 3.2);
    eh.addColorStop(0, alpha(K.eyeGlow, 0.38)); eh.addColorStop(0.5, alpha(K.eyeGlow, 0.12)); eh.addColorStop(1, alpha(K.eyeGlow, 0));
    K.eyeHalo = eh;
    kits.set(look, K);
    return K;
  }

  // the wing for side s at raise angle a, extension span (0..1+) and chord (how deep the inner wing is)
  function wingGeo(s, a, span, chord) {
    const ca = Math.cos(a), sa = Math.sin(a), Sx = s * SHOULDER[0], Sy = SHOULDER[1];
    const dx = s * ca, dy = -sa, px = s * sa, py = ca, arm = ARM * span;
    const Wx = Sx + dx * arm, Wy = Sy + dy * arm;
    const fing = (phi, len) => { const an = a + phi; return [Wx + s * Math.cos(an) * len, Wy - Math.sin(an) * len]; };
    return {
      Sx, Sy, Wx, Wy, dx, dy, px, py, arm,
      Ex: Sx + dx * arm * 0.46 + px * 1.5, Ey: Sy + dy * arm * 0.46 + py * 1.5,
      t1: fing(-0.3, TIP * span), t2: fing(-0.95, 15.5 * span * (0.75 + 0.25 * chord)), t3: fing(-1.6, 11.5 * span * (0.6 + 0.4 * chord)),
      Hx: s * HIP[0], Hy: HIP[1],
    };
  }
  function leading(ctx, W) {
    ctx.moveTo(W.Sx, W.Sy);
    ctx.quadraticCurveTo(W.Sx + W.dx * W.arm * 0.5 - W.px * 1.7, W.Sy + W.dy * W.arm * 0.5 - W.py * 1.7, W.Wx, W.Wy);
    ctx.quadraticCurveTo((W.Wx + W.t1[0]) / 2 - W.px * 1.1, (W.Wy + W.t1[1]) / 2 - W.py * 1.1, W.t1[0], W.t1[1]);
  }
  function scallop(ctx, p, q, W, k) {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    ctx.quadraticCurveTo(mx + (W.Wx - mx) * k, my + (W.Wy - my) * k, q[0], q[1]);
  }
  // a finger bone: a thin wedge, wide at the wrist and fine at the tip
  function bone(ctx, x0, y0, x1, y1, w0, w1) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath();
  }
  function drawWing(ctx, K, W, s, edge, det) {
    ctx.beginPath();
    leading(ctx, W);
    scallop(ctx, W.t1, W.t2, W, 0.3);
    scallop(ctx, W.t2, W.t3, W, 0.3);
    scallop(ctx, W.t3, [W.Hx, W.Hy], W, 0.22);
    ctx.lineTo(s * 2.4, 3);
    ctx.closePath();
    ctx.fillStyle = K.wing[s > 0 ? 1 : 0];
    ctx.fill();
    if (det >= 1) {
      ctx.fillStyle = K.bone;
      ctx.beginPath();
      bone(ctx, W.Wx, W.Wy, W.t1[0], W.t1[1], 0.48, 0.1);
      bone(ctx, W.Wx, W.Wy, W.t2[0], W.t2[1], 0.42, 0.09);
      bone(ctx, W.Wx, W.Wy, W.t3[0], W.t3[1], 0.38, 0.09);
      ctx.fill();
      ctx.strokeStyle = K.arm; ctx.lineWidth = 0.85;
      ctx.beginPath(); ctx.moveTo(W.Sx, W.Sy); ctx.lineTo(W.Ex, W.Ey); ctx.lineTo(W.Wx, W.Wy); ctx.stroke();
    }
    // the glowing leading edge, as on the icon
    ctx.beginPath(); leading(ctx, W);
    if (det >= 1) { ctx.strokeStyle = alpha(edge, 0.16); ctx.lineWidth = 1.8; ctx.stroke(); }
    ctx.strokeStyle = alpha(edge, 0.9); ctx.lineWidth = det >= 1 ? 0.55 : 0.9; ctx.stroke();
    if (det >= 2) {
      // the thumb, a small hooked claw at the wrist
      ctx.strokeStyle = K.claw; ctx.lineWidth = 0.55;
      ctx.beginPath(); ctx.moveTo(W.Wx, W.Wy);
      ctx.quadraticCurveTo(W.Wx - W.px * 1.6, W.Wy - W.py * 1.6, W.Wx - W.px * 1.4 + W.dx * 1.1, W.Wy - W.py * 1.4 + W.dy * 1.1);
      ctx.stroke();
    }
  }
  // folded wings, wrapped round the body like a cloak (the Roost)
  function drawCloak(ctx, K, s, edge, det) {
    ctx.beginPath();
    ctx.moveTo(s * 2.2, -3.6);
    ctx.quadraticCurveTo(s * 7.8, -2.2, s * 7.0, 5.4);
    ctx.quadraticCurveTo(s * 6.2, 11.8, s * 2.4, 13.6);
    ctx.quadraticCurveTo(s * 3.8, 6.4, s * 1.0, 1.6);
    ctx.closePath();
    ctx.fillStyle = K.wing[s > 0 ? 1 : 0];
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 2.9, -4.8); ctx.quadraticCurveTo(s * 7.6, -1.6, s * 6.9, 6.4);
    if (det >= 1) { ctx.strokeStyle = K.arm; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.strokeStyle = alpha(edge, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
    if (det >= 1) {
      ctx.strokeStyle = K.bone; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(s * 6.6, 3); ctx.quadraticCurveTo(s * 5.4, 8.5, s * 3.2, 12.4); ctx.moveTo(s * 5.4, 1.5); ctx.quadraticCurveTo(s * 4.4, 6, s * 2.6, 9.6); ctx.stroke();
    }
    if (det >= 2) { ctx.strokeStyle = K.claw; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(s * 2.9, -4.8); ctx.quadraticCurveTo(s * 2.2, -6.4, s * 1.4, -6.0); ctx.stroke(); }
  }
  // the head: wide at the temples, narrowing to the chin
  function headPath(ctx) {
    ctx.moveTo(-6.5, -0.6);
    ctx.quadraticCurveTo(-6.4, -5.7, 0, -5.8);
    ctx.quadraticCurveTo(6.4, -5.7, 6.5, -0.6);
    ctx.quadraticCurveTo(6.0, 3.4, 0, 5.4);
    ctx.quadraticCurveTo(-6.0, 3.4, -6.5, -0.6);
    ctx.closePath();
  }
  function earPath(ctx, s, el, ew, tip, k) {
    const tx = s * (3.4 + 1.4 * tip) * ew * k, ty = -4.4 - 10.5 * el * k;
    ctx.moveTo(s * (1.4 + (1 - k) * 2.2), -4.4 - (1 - k) * 0.6);
    ctx.quadraticCurveTo(s * 1.7 * ew, -4.4 - 7 * el * k, tx, ty);
    ctx.quadraticCurveTo(s * 7.4 * ew * k, -4.4 - 4.6 * el * k, s * (6.2 * ew * k), -1.6 - (1 - k) * 1.4);
    ctx.closePath();
  }

  // the size of a bat in its own units at size 1, for framing a portrait: half the wingspan, the top of the
  // ears and the feet
  // a bat that has not arrived yet: a shadow that keeps its glowing eyes
  const shadows = new WeakMap();
  R.shadowLook = function (look) {
    let sh = shadows.get(look);
    if (!sh) {
      sh = Object.assign({}, look, { fur: '#161a28', belly: '#1c2032', wing: '#0c0f1a', wingHi: 'rgba(0,0,0,0)', bone: '#262c42', inner: '#1f2436', edge: '#3c4566' });
      shadows.set(look, sh);
    }
    return sh;
  };

  R.batBox = function (look) {
    const span = look.span || 1, el = look.ear || 1;
    return { half: (SHOULDER[0] + (ARM + TIP) * span) + 1, top: Math.min(HEAD[0] - 4.4 - 10.5 * el, -2.2 - 16 * span) - 1.5, bottom: 13.8 + ((look.feet || 1) > 1.5 ? 2.5 : 0) };
  };

  // b: { x, y, vx, face, flap, glide, web, dead, rim, puff, blink, stun, sx, sy, charge, dash, wa, ws };
  // o: { glow, deadT, energy, still, folded }
  R.drawBat = function (ctx, b, t, scale, look, o) {
    o = o || {};
    const x = b.x, y = b.y + (o.still ? 0 : Math.sin(t * 3.1) * 1.2);
    if (o.glow !== false) {
      const glowA = b.dead ? Math.max(0, 1 - (o.deadT || 0) * 0.8) : clamp(0.55 + (o.energy === undefined ? 100 : o.energy) / 220, 0.4, 1);
      R.glow(ctx, x, y, 92, PP.P.warm, 0.07 * glowA);
      R.glow(ctx, x, y, 34, PP.P.warm, 0.42 * glowA);
      if (b.rim > 0) R.glow(ctx, x, y, 46, PP.P.teal, 0.3 * Math.min(1, b.rim));
      if (b.dash > 0) R.glow(ctx, x, y, 60, '#ffffff', 0.25);
    }
    if (b.charge > 0) {
      ctx.strokeStyle = PP.P.teal; ctx.globalAlpha = 0.25 + b.charge * 0.5; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 30 - b.charge * 8, -Math.PI / 2, -Math.PI / 2 + TAU * b.charge); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const K = kitOf(ctx, look);
    ctx.save();
    ctx.translate(x, y);
    const tilt = clamp((b.vx || 0) / 900, -0.3, 0.3) + (b.dead ? (o.deadT || 0) * 3 : 0);
    ctx.rotate(tilt);
    const sz = scale * (look.size || 1);
    ctx.scale(sz * (b.sx || 1) * 1.05, sz * (b.sy || 1) * 1.05);
    // how many screen pixels one of the bat's units covers decides the detail
    const m = ctx.getTransform(), px = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const det = px < 1.4 ? 0 : px < 3 ? 1 : 2;
    const ph = (b.flap || 0) % TAU;
    let a = Math.sin(ph) * 0.85 + 0.12, span = (0.82 + 0.18 * Math.cos(ph)) * (look.span || 1);
    if (b.glide > 0.25 && !b.web) { a = 0.18 + Math.sin(t * 2) * 0.05; span = look.span || 1; }
    if (b.wa !== undefined) { a = b.wa; span = (b.ws || 1) * (look.span || 1); }
    if (b.web) { a = Math.sin(t * 22) * 0.4 + 0.1; span = 0.7; }
    if (b.dead) { a = -0.4 + Math.sin(t * 9) * 0.2; span = 0.6; }
    const rim = b.rim || 0, chord = look.chord || 1, f = b.face || 1, hx = f * 1.2;
    const edge = rim > 0.01 ? mix(K.edge, PP.P.rimLight, Math.min(1, rim) * 0.7) : K.edge;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (!o.folded) {
      for (const s of [-1, 1]) drawWing(ctx, K, wingGeo(s, a, span, chord), s, edge, det);
      // the tail membrane between the legs, and the feet
      ctx.fillStyle = K.tail;
      ctx.beginPath(); ctx.moveTo(-HIP[0], HIP[1] - 1); ctx.quadraticCurveTo(-2.6, 12.6, 0, 13.4); ctx.quadraticCurveTo(2.6, 12.6, HIP[0], HIP[1] - 1); ctx.closePath(); ctx.fill();
      if (look.fringe && det >= 1) {
        ctx.strokeStyle = alpha(look.belly, 0.7); ctx.lineWidth = 0.35;
        ctx.beginPath(); for (let k = -5; k <= 5; k++) { const u = k / 5, ex = u * 3, ey = 13.4 - u * u * 3.4; ctx.moveTo(ex, ey); ctx.lineTo(ex * 1.12, ey + 1.1); } ctx.stroke();
      }
    }
    const fs = look.feet || 1;
    if (det >= 1) {
      ctx.strokeStyle = K.claw; ctx.lineWidth = 0.55 * Math.min(1.5, fs);
      ctx.beginPath();
      for (const s of [-1, 1]) {
        const fx = s * (o.folded ? 1.4 : 2.6 + 0.5 * fs), fy = o.folded ? 13.6 : 10.6 + 1.2 * fs;
        ctx.moveTo(s * (o.folded ? 1.2 : 2.6), o.folded ? 12.2 : 9.4); ctx.lineTo(fx, fy);
        for (let k = -1; k <= 1; k++) { ctx.moveTo(fx, fy); ctx.lineTo(fx + k * 0.55 * fs, fy + 0.9 * fs); }
      }
      ctx.stroke();
    }
    // body, with a soft lighter belly
    ctx.fillStyle = K.body;
    ctx.beginPath(); ctx.ellipse(0, 3, 5.1, 7.4, 0, 0, TAU); ctx.fill();
    if (det >= 1) { ctx.fillStyle = K.belly; ctx.beginPath(); ctx.ellipse(0, 4.4, 3.8, 5.6, 0, 0, TAU); ctx.fill(); }
    if (o.folded) for (const s of [-1, 1]) drawCloak(ctx, K, s, edge, det);
    // the head: ears behind, a wide soft skull, the muzzle, and the eyes
    ctx.save();
    ctx.translate(hx, HEAD[0]);
    const el = look.ear || 1, ew = look.earW || 1, tip = look.earTip || 1;
    ctx.fillStyle = look.fur;
    ctx.beginPath(); for (const s of [-1, 1]) earPath(ctx, s, el, ew, tip, 1); ctx.fill();
    if (det >= 1) {
      for (const s of [-1, 1]) { ctx.fillStyle = K.ear[s > 0 ? 1 : 0]; ctx.beginPath(); earPath(ctx, s, el, ew, tip, 0.8); ctx.fill(); }
      // long ears fold in soft ridges
      if (el > 1.6 && det >= 2) {
        ctx.strokeStyle = alpha(mix(look.inner, '#000000', 0.3), 0.55); ctx.lineWidth = 0.3;
        ctx.beginPath();
        for (const s of [-1, 1]) for (let k = 1; k <= 5; k++) { const yy = -4.4 - 10.5 * el * 0.8 * k / 6, xx = s * (2.6 + 1.4 * k / 6) * ew; ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + s * 0.9 * ew, yy - 0.7, xx + s * 1.8 * ew, yy + 0.1); }
        ctx.stroke();
      }
      if (look.tragus) {
        ctx.fillStyle = mix(look.inner, '#ffffff', 0.32);
        ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(s * 2.3, -4.2); ctx.quadraticCurveTo(s * 2.6 * ew, -4.4 - 3 * el * look.tragus, s * 3.3 * ew, -4.4 - 4.6 * el * look.tragus); ctx.lineTo(s * 3.5, -4.0); ctx.closePath(); } ctx.fill();
      }
      ctx.strokeStyle = alpha(edge, 0.5); ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const s of [-1, 1]) { const tx = s * (3.4 + 1.4 * tip) * ew, ty = -4.4 - 10.5 * el; ctx.moveTo(tx, ty); ctx.quadraticCurveTo(s * 7.4 * ew, -4.4 - 4.6 * el, s * 6.2 * ew, -1.6); }
      ctx.stroke();
    }
    ctx.fillStyle = K.head;
    ctx.beginPath(); headPath(ctx); ctx.fill();
    if (b.puff > 0.02) {
      ctx.fillStyle = mix(look.fur, '#ffcfae', 0.4);
      ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(s * 4.4 + 2.2 + b.puff * 2.2, 2.0); ctx.arc(s * 4.4, 2.0, 2.2 + b.puff * 2.2, 0, TAU); } ctx.fill();
    }
    const mx = f * 0.6;
    if (det >= 1) { ctx.fillStyle = K.muzzle; ctx.beginPath(); ctx.ellipse(mx, 2.7, 2.3, 1.7, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = K.nose;
    ctx.beginPath(); ctx.ellipse(mx, 2.0, 1.05, 0.66, 0, 0, TAU); ctx.fill();
    if (look.noseleaf) { ctx.beginPath(); ctx.moveTo(mx - 1.1, 1.9); ctx.lineTo(mx, -0.4 - look.noseleaf * 1.6); ctx.lineTo(mx + 1.1, 1.9); ctx.fill(); }
    // glowing almond eyes, closed in a blink, a stun or a fall
    const shut = b.dead || b.stun > 0 || (b.blink !== undefined && b.blink < 0);
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 2.7 + f * 0.5, -1.0);
      ctx.rotate(-s * 0.24);
      if (shut) {
        ctx.strokeStyle = alpha(K.eyeGlow, 0.85); ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.quadraticCurveTo(0, 0.7, 1.6, 0); ctx.stroke();
      } else {
        if (det >= 1) { ctx.fillStyle = K.eyeHalo; ctx.fillRect(-3.2, -3.2, 6.4, 6.4); }
        ctx.fillStyle = K.eyeG;
        ctx.beginPath(); ctx.moveTo(-1.9, 0.1); ctx.quadraticCurveTo(-0.3, -2.05, 1.9, -0.2); ctx.quadraticCurveTo(0.3, 1.75, -1.9, 0.1); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    if (b.stun > 0 && !b.dead) for (let k = 0; k < 3; k++) { const an = t * 8 + k * TAU / 3; R.glow(ctx, x + Math.cos(an) * 12, y - 20 + Math.sin(an) * 4, 5, '#fff2a8', 0.9); }
  };

  // a hanging or flying pup (pups look like their colony): a round fluffy body, wings wrapped, big dark eyes
  const pupK = {};
  function pupKit(ctx) {
    if (pupK.body) return pupK;
    const g = ctx.createRadialGradient(-1.6, -3, 0.5, 0, 0, 10);
    g.addColorStop(0, '#c4927a'); g.addColorStop(0.55, '#9a6a52'); g.addColorStop(1, '#5e3c30');
    pupK.body = g;
    const w = ctx.createLinearGradient(0, -3, 0, 10);
    w.addColorStop(0, '#4a2d3a'); w.addColorStop(1, '#6e4452');
    pupK.wing = w;
    return pupK;
  }
  R.drawPup = function (ctx, x, y, t, upright, s) {
    const P = pupKit(ctx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI * (1 - upright));
    ctx.scale(s * 0.62, s * 0.62);
    ctx.rotate(Math.sin(t * 2) * 0.12);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // ears
    ctx.fillStyle = '#9a6a52';
    ctx.beginPath(); for (const sd of [-1, 1]) { ctx.moveTo(sd * 1.4, -8.4); ctx.quadraticCurveTo(sd * 3.2, -14.6, sd * 5.4, -15); ctx.quadraticCurveTo(sd * 6.6, -10, sd * 5.2, -6.4); ctx.closePath(); } ctx.fill();
    ctx.fillStyle = '#e3a0a0';
    ctx.beginPath(); for (const sd of [-1, 1]) { ctx.moveTo(sd * 2.6, -8.6); ctx.quadraticCurveTo(sd * 3.6, -12.8, sd * 5.0, -13.2); ctx.quadraticCurveTo(sd * 5.6, -10, sd * 4.6, -7.6); ctx.closePath(); } ctx.fill();
    // body and head, one soft shape
    ctx.fillStyle = P.body;
    ctx.beginPath(); ctx.ellipse(0, 3, 5, 6.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -5, 5.9, 5.3, 0, 0, TAU); ctx.fill();
    // little wings wrapped round
    ctx.fillStyle = P.wing;
    ctx.beginPath(); for (const sd of [-1, 1]) { ctx.moveTo(sd * 3.2, -1.6); ctx.quadraticCurveTo(sd * 8.6, 1.4, sd * 5.6, 9.6); ctx.quadraticCurveTo(sd * 3.6, 7.4, sd * 1.8, 6.4); ctx.closePath(); } ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,150,0.55)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); for (const sd of [-1, 1]) { ctx.moveTo(sd * 3.2, -1.6); ctx.quadraticCurveTo(sd * 8.6, 1.4, sd * 5.6, 9.6); } ctx.stroke();
    // big dark eyes with two catchlights, rosy cheeks, a tiny nose
    ctx.fillStyle = '#140c0e';
    ctx.beginPath(); ctx.ellipse(-2.2, -5.3, 1.45, 1.6, 0, 0, TAU); ctx.ellipse(2.2, -5.3, 1.45, 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2.6, -5.9, 0.5, 0, TAU); ctx.arc(1.8, -5.9, 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-1.8, -4.8, 0.25, 0, TAU); ctx.arc(2.6, -4.8, 0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,180,0.55)';
    ctx.beginPath(); ctx.ellipse(-3.7, -3.1, 1.3, 0.85, 0, 0, TAU); ctx.ellipse(3.7, -3.1, 1.3, 0.85, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2020';
    ctx.beginPath(); ctx.ellipse(0, -3.4, 0.8, 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  R.drawHeart = function (ctx, x, y, s, c, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = c;
    ctx.translate(x, y);
    ctx.scale(s / 6, s / 6);
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.bezierCurveTo(-7, 0, -5, -6, 0, -2.6); ctx.bezierCurveTo(5, -6, 7, 0, 0, 5);
    ctx.fill();
    ctx.restore();
  };
  // tiger: the Glass Vaults' jamming moth, a little bigger, orange with dark bars on its forewings
  R.drawMoth = function (ctx, x, y, t, a, ang, tiger) {
    const f = Math.abs(Math.sin(t * (tiger ? 40 : 34))), z = tiger ? 1.35 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.cos(ang) * 0.2);
    ctx.scale(z, z);
    ctx.globalAlpha = a;
    ctx.fillStyle = tiger ? '#ff9a3c' : '#ffe6a3';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 3.6 * (0.4 + f * 0.6), -1.2, 3.8 * (0.4 + f * 0.6), 2.8, s * 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 2.4 * (0.4 + f * 0.6), 2, 2.2 * (0.4 + f * 0.6), 1.8, -s * 0.4, 0, TAU); ctx.fill();
    }
    if (tiger) {
      ctx.fillStyle = '#2a1408';
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(s * (2 + k * 2.2) * (0.4 + f * 0.6), -1.6 + k * 0.6, 0.8, 1.7, s * 0.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd36b';
    }
    ctx.fillStyle = '#b8762e';
    ctx.fillRect(-0.8, -3, 1.6, 6.5);
    ctx.restore();
    ctx.globalAlpha = 1;
  };
})();
