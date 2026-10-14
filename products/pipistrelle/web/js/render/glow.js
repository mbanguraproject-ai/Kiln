/* Light without banding: a dithered glow atlas (64, 256 and 512 px per colour), hole sprites for the darkness, and
 * the echo dot sprites (round, or shaped per channel in Echo shapes mode). No ctx.filter, no shadowBlur. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R;
  const parse = Kit.gfx.parse;
  const cache = new Map();
  const STOPS = [[0, 1], [0.18, 0.75], [0.42, 0.32], [0.7, 0.09], [1, 0]];
  const HOLE = [[0, 1], [0.45, 0.7], [1, 0]];

  function falloff(stops, k) {
    for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) { const a = stops[i - 1], b = stops[i], f = (k - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (f * f * (3 - 2 * f)); }
    return 0;
  }
  // a radial sprite of `size` px with ordered + random dither so 8-bit steps never show on dark backgrounds
  function radial(color, size, stops) {
    const c = Kit.gfx.offscreen(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), v = parse(color), h = size / 2;
    const r = Kit.rng(size * 7 + v[0] * 3 + v[1] * 5 + v[2]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const k = Math.hypot(x + 0.5 - h, y + 0.5 - h) / h, i = (y * size + x) * 4;
      const a = k >= 1 ? 0 : falloff(stops, k) * 255 + (r.next() - 0.5) * 1.6;
      img.data[i] = v[0]; img.data[i + 1] = v[1]; img.data[i + 2] = v[2]; img.data[i + 3] = a < 0 ? 0 : a > 255 ? 255 : a;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  R.glowSprite = function (color, devR) {
    const size = devR < 36 ? 64 : devR < 150 ? 256 : 512, key = color + '|' + size;
    let s = cache.get(key);
    if (!s) { s = radial(color, size, STOPS); cache.set(key, s); }
    return s;
  };
  R.holeSprite = function () { let s = cache.get('hole'); if (!s) { s = radial('#ffffff', 256, HOLE); cache.set('hole', s); } return s; };

  // additive soft light at (x, y) radius r in the current units (R.ppu = device px per unit)
  R.glow = function (ctx, x, y, r, color, a) {
    if (r <= 0 || a <= 0.003) return;
    const dr = r * (R.ppu || 1);
    if (dr < 1) return;
    const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(R.glowSprite(color, dr), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = pa;
    ctx.globalCompositeOperation = pc;
  };
  // bloom: a sharp core plus a wide halo
  R.bloom = function (ctx, x, y, r, color, a) { R.glow(ctx, x, y, r * 3.2, color, a * 0.22); R.glow(ctx, x, y, r, color, a); };

  // echo dot sprites: a hot core fading out; in Echo shapes mode each channel has its own mark
  const dotCache = [[], []];
  R.dotSprite = function (ch, shapes) {
    const row = dotCache[shapes ? 1 : 0];
    let s = row[ch];
    if (s) return s;
    const c = PP.COL[ch], S = 64, cv = Kit.gfx.offscreen(S, S), g = cv.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, Kit.gfx.mix(c, '#ffffff', 0.8));
    gr.addColorStop(0.14, Kit.gfx.mix(c, '#ffffff', 0.45));
    gr.addColorStop(0.29, Kit.gfx.alpha(c, shapes ? 0.35 : 0.75));
    gr.addColorStop(0.6, Kit.gfx.alpha(c, shapes ? 0.1 : 0.18));
    gr.addColorStop(1, Kit.gfx.alpha(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    if (shapes) {
      const CH = PP.CH;
      g.translate(S / 2, S / 2);
      g.strokeStyle = Kit.gfx.mix(c, '#ffffff', 0.5); g.fillStyle = g.strokeStyle; g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      if (ch === CH.WATER) { g.arc(0, 0, 11, 0, PP.TAU); g.stroke(); }
      else if (ch === CH.WEB) { g.moveTo(-12, 0); g.lineTo(12, 0); g.moveTo(0, -12); g.lineTo(0, 12); g.stroke(); }
      else if (ch === CH.MOTH) { g.moveTo(0, -14); g.lineTo(12, 0); g.lineTo(0, 14); g.lineTo(-12, 0); g.closePath(); g.fill(); }
      else if (ch === CH.HAZ) { g.moveTo(0, -14); g.lineTo(13, 11); g.lineTo(-13, 11); g.closePath(); g.fill(); }
      else if (ch === CH.CRYS) { for (let k = 0; k < 8; k++) { const a = k / 8 * PP.TAU, rr = k % 2 ? 5 : 14; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
      else if (ch === CH.PUP) { g.moveTo(0, 12); g.bezierCurveTo(-16, 0, -10, -14, 0, -5); g.bezierCurveTo(10, -14, 16, 0, 0, 12); g.fill(); }
      else { g.arc(0, 0, 7, 0, PP.TAU); g.fill(); }
    }
    row[ch] = cv;
    return cv;
  };
})();
