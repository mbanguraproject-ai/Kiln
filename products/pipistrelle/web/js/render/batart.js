/* The one parametric bat renderer: membrane wings with finger bones, ears, noseleaf, fur and feet, all from a
 * bat's look (data/bats.js). Used in flight, in the Hangar and in the Roost. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const { clamp } = Kit;

  function wingPath(s, a, span, chord) {
    const sx = s * 4, sy = -3;
    const wx = sx + s * Math.cos(a) * 12 * span, wy = sy - Math.sin(a) * 12;
    const f = [[a + 0.55, 17], [a - 0.15, 20], [a - 0.85 * chord, 15 * (0.6 + 0.4 * chord)]];
    const tips = f.map(([fa, l]) => [wx + s * Math.cos(fa) * l * span, wy - Math.sin(fa) * l * (0.7 + 0.3 * chord)]);
    return { sx, sy, wx, wy, tips, hx: s * 3.5, hy: 5 + 2.5 * chord };
  }
  function drawWing(ctx, W, rim, s, look) {
    const { sx, sy, wx, wy, tips, hx, hy } = W;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + wx) / 2, Math.min(sy, wy) - 3, wx, wy);
    ctx.lineTo(tips[0][0], tips[0][1]);
    ctx.quadraticCurveTo((tips[0][0] + tips[1][0]) / 2 - s, (tips[0][1] + tips[1][1]) / 2 + 2, tips[1][0], tips[1][1]);
    ctx.quadraticCurveTo((tips[1][0] + tips[2][0]) / 2 - s * 3, (tips[1][1] + tips[2][1]) / 2 + 1, tips[2][0], tips[2][1]);
    ctx.quadraticCurveTo((tips[2][0] + hx) / 2 + s, (tips[2][1] + hy) / 2 + 4, hx, hy);
    ctx.closePath();
    ctx.fillStyle = look.wing;
    ctx.fill();
    ctx.fillStyle = look.wingHi;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(wx, wy); ctx.lineTo(tips[0][0], tips[0][1]); ctx.lineTo(tips[1][0], tips[1][1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = look.bone;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(wx, wy);
    for (const tp of tips) { ctx.moveTo(wx, wy); ctx.lineTo(tp[0], tp[1]); }
    ctx.stroke();
    ctx.fillStyle = look.bone;
    ctx.beginPath(); ctx.arc(wx, wy, 1.3, 0, TAU); ctx.fill();
    if (rim > 0.01) {
      ctx.strokeStyle = Kit.gfx.alpha(PP.P.rimLight, Math.min(1, rim));
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(wx, wy); ctx.lineTo(tips[0][0], tips[0][1]); ctx.stroke();
    }
  }

  // b: { x, y, vx, face, flap, glide, web, dead, rim, puff, blink, stun, sx, sy, charge }; o: { glow, deadT, energy, still }
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
    ctx.save();
    ctx.translate(x, y);
    const tilt = clamp((b.vx || 0) / 900, -0.3, 0.3) + (b.dead ? (o.deadT || 0) * 3 : 0);
    ctx.rotate(tilt);
    const sz = scale * (look.size || 1);
    ctx.scale(sz * (b.sx || 1) * 1.05, sz * (b.sy || 1) * 1.05);
    const ph = (b.flap || 0) % TAU;
    let a = Math.sin(ph) * 0.85 + 0.12, span = (0.82 + 0.18 * Math.cos(ph)) * (look.span || 1);
    if (b.glide > 0.25 && !b.web) { a = 0.18 + Math.sin(t * 2) * 0.05; span = look.span || 1; }
    if (b.web) { a = Math.sin(t * 22) * 0.4 + 0.1; span = 0.7; }
    if (b.dead) { a = -0.4 + Math.sin(t * 9) * 0.2; span = 0.6; }
    if (o.folded) { a = -1.25; span = 0.45; }
    const rim = b.rim || 0, chord = look.chord || 1;
    for (const s of [-1, 1]) drawWing(ctx, wingPath(s, a, span, chord), rim, s, look);
    // ears: length, width and tip from the look; a tragus spike inside for the long-eared
    const hx = (b.face || 1) * 1.3, el = look.ear || 1, ew = look.earW || 1, tip = look.earTip || 1;
    ctx.fillStyle = look.fur;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(hx + s * 1.5, -10);
      ctx.quadraticCurveTo(hx + s * 7.5 * ew, -10 - 10 * el, hx + s * (5 + 1.2 * tip) * ew, -10 - 11.5 * el);
      ctx.quadraticCurveTo(hx + s * 7.8 * ew, -10 - 4 * el, hx + s * 6 * ew, -8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = look.inner;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(hx + s * 3, -11); ctx.quadraticCurveTo(hx + s * 6.5 * ew, -10 - 8 * el, hx + s * 5.8 * ew, -10 - 9 * el);
      ctx.quadraticCurveTo(hx + s * 6.4 * ew, -10 - 4 * el, hx + s * 5.2 * ew, -10); ctx.closePath(); ctx.fill();
    }
    if (look.tragus) {
      ctx.fillStyle = Kit.gfx.mix(look.inner, '#ffffff', 0.25);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 3.4, -11); ctx.lineTo(hx + s * 4.4 * ew, -10 - 5.5 * el * look.tragus); ctx.lineTo(hx + s * 4.6, -11); ctx.closePath(); ctx.fill(); }
    }
    // body and head
    ctx.fillStyle = look.fur;
    ctx.beginPath(); ctx.ellipse(0, 2.5, 5.6, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = look.belly;
    ctx.beginPath(); ctx.ellipse(0, 4, 3.4, 5.4, 0, 0, TAU); ctx.fill();
    if (look.fringe) {
      ctx.strokeStyle = Kit.gfx.alpha(look.belly, 0.8); ctx.lineWidth = 0.6;
      ctx.beginPath(); for (let k = -4; k <= 4; k++) { ctx.moveTo(k * 1.4, 9.5 + Math.abs(k) * 0.3); ctx.lineTo(k * 1.6, 12 + Math.abs(k) * 0.3); } ctx.stroke();
    }
    ctx.fillStyle = look.fur;
    ctx.beginPath(); ctx.arc(hx, -6.5, 6.4, 0, TAU); ctx.fill();
    // fur tufts
    ctx.strokeStyle = Kit.gfx.mix(look.fur, '#ffffff', 0.18); ctx.lineWidth = 0.6;
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const an = Math.PI * (1.15 + k * 0.17); ctx.moveTo(hx + Math.cos(an) * 5.6, -6.5 + Math.sin(an) * 5.6); ctx.lineTo(hx + Math.cos(an) * 7.2, -6.5 + Math.sin(an) * 7.2); } ctx.stroke();
    if (b.puff > 0.02) {
      ctx.fillStyle = Kit.gfx.mix(look.fur, '#ffcfae', 0.4);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * 4.6, -4.2, 2.2 + b.puff * 2.4, 0, TAU); ctx.fill(); }
    }
    const blink = (b.blink !== undefined && b.blink < 0) || b.stun > 0 ? 0.15 : 1, f = b.face || 1;
    ctx.fillStyle = '#120a0a';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * 2.6 + f * 0.6, -7.4, 1.6, 1.9 * blink, 0, 0, TAU); ctx.fill(); }
    if (blink > 0.5) { ctx.fillStyle = '#ffffff'; for (const s of [-1, 1]) ctx.fillRect(hx + s * 2.6 + f * 0.6 - 0.2, -8.6, 0.9, 0.9); }
    ctx.fillStyle = Kit.gfx.mix(look.fur, '#2a1410', 0.5);
    ctx.beginPath(); ctx.ellipse(hx + f * 0.8, -3.6, 2.2, 1.5, 0, 0, TAU); ctx.fill();
    if (look.noseleaf) { ctx.beginPath(); ctx.moveTo(hx + f * 0.8 - 1.6, -4); ctx.lineTo(hx + f * 0.8, -7 - look.noseleaf * 2); ctx.lineTo(hx + f * 0.8 + 1.6, -4); ctx.fill(); }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(hx - 1.6 + f * 0.8, -2.4); ctx.lineTo(hx - 1 + f * 0.8, -0.6); ctx.lineTo(hx - 0.4 + f * 0.8, -2.4); ctx.moveTo(hx + 0.4 + f * 0.8, -2.4); ctx.lineTo(hx + 1 + f * 0.8, -0.6); ctx.lineTo(hx + 1.6 + f * 0.8, -2.4); ctx.fill();
    // feet (Skimmer's are big, for trawling the water)
    const fs = look.feet || 1;
    ctx.strokeStyle = look.bone; ctx.lineWidth = 1 * Math.min(1.6, fs);
    ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(-3 * fs, 10 + 2.5 * fs); ctx.moveTo(2, 10); ctx.lineTo(3 * fs, 10 + 2.5 * fs); ctx.stroke();
    if (fs > 1.5) { ctx.beginPath(); for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { ctx.moveTo(s * 3 * fs, 10 + 2.5 * fs); ctx.lineTo(s * 3 * fs + k * 1.4, 12 + 3 * fs); } ctx.stroke(); }
    if (rim > 0.01) {
      ctx.strokeStyle = Kit.gfx.alpha(PP.P.rimLight, Math.min(1, rim));
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(hx, -6.5, 6.4, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 2.5, 5.6, 8, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    }
    ctx.restore();
    if (b.stun > 0 && !b.dead) for (let k = 0; k < 3; k++) { const an = t * 8 + k * TAU / 3; R.glow(ctx, x + Math.cos(an) * 12, y - 20 + Math.sin(an) * 4, 5, '#fff2a8', 0.9); }
  };

  // a hanging or flying pup (pups look like their colony)
  R.drawPup = function (ctx, x, y, t, upright, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI * (1 - upright));
    ctx.scale(s * 0.62, s * 0.62);
    ctx.rotate(Math.sin(t * 2) * 0.12);
    ctx.fillStyle = '#5a3a40';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 3, -2); ctx.quadraticCurveTo(sd * 10, 2, sd * 6, 10); ctx.quadraticCurveTo(sd * 3, 7, sd * 2, 6); ctx.fill(); }
    ctx.fillStyle = '#9a6a52';
    ctx.beginPath(); ctx.ellipse(0, 3, 5, 7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -5, 5.5, 0, TAU); ctx.fill();
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 1.5, -8); ctx.lineTo(sd * 5.5, -15); ctx.lineTo(sd * 5, -6); ctx.fill(); }
    ctx.fillStyle = '#120a0a';
    ctx.beginPath(); ctx.arc(-2.1, -5.5, 1.3, 0, TAU); ctx.arc(2.1, -5.5, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.4, -6.4, 0.8, 0.8); ctx.fillRect(1.8, -6.4, 0.8, 0.8);
    ctx.fillStyle = '#ffb3c7';
    ctx.beginPath(); ctx.arc(-3.4, -3.2, 1.2, 0, TAU); ctx.arc(3.4, -3.2, 1.2, 0, TAU); ctx.fill();
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
