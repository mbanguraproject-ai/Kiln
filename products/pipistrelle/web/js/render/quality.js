/* Quality tiers and the frame-time governor (dynamic resolution). Tiers change fidelity, never information:
 * echo pools, ray counts and lifetimes are the same on every tier. */
(function () {
  'use strict';
  const PP = window.PP;
  const R = PP.R = PP.R || {};

  R.TIERS = {
    low: { id: 'low', name: 'Low', maxPx: 1.1e6, minScale: 0.5, chunkMax: 1.5, mask: 3, relight: false, ambient: 80, detail: false, decals: false, lru: 30, bloom: false },
    medium: { id: 'medium', name: 'Medium', maxPx: 2.3e6, minScale: 0.55, chunkMax: 2.5, mask: 2.5, relight: true, ambient: 200, detail: true, decals: false, lru: 42, bloom: true },
    high: { id: 'high', name: 'High', maxPx: 4.6e6, minScale: 0.6, chunkMax: 3, mask: 2, relight: true, ambient: 450, detail: true, decals: true, lru: 56, bloom: true },
    ultra: { id: 'ultra', name: 'Ultra', maxPx: 9.5e6, minScale: 0.6, chunkMax: 4, mask: 1.5, relight: true, ambient: 900, detail: true, decals: true, lru: 80, bloom: true },
  };
  const ORDER = ['low', 'medium', 'high', 'ultra'];

  const Q = R.quality = {
    setting: 'auto',     // 'auto' or a tier id (from Settings)
    tier: R.TIERS.high,
    g: 1,                // governor scale (dynamic resolution)
    ema: 16.7, work: 4, slowT: 0, fastT: 0, frames: 0,
    log: [],             // recent frame intervals, for tests
    set(id) {
      Q.setting = id || 'auto';
      Q.tier = R.TIERS[Q.setting] || R.TIERS[Q.autoTier()];
      Q.g = 1; Q.slowT = 0; Q.fastT = 0;
      R.dirty = true;
    },
    // the starting tier for 'auto': by device pixel count
    autoTier() {
      const px = innerWidth * innerHeight * Math.pow(window.devicePixelRatio || 1, 2);
      return px > 6e6 ? 'ultra' : 'high';
    },
    // the scale of the backing store relative to device pixels
    scale(cssW, cssH, dpr) {
      const t = Q.tier, full = cssW * cssH * dpr * dpr;
      return Math.min(1, Math.sqrt(t.maxPx / full)) * Q.g;
    },
    // called once per displayed frame with the interval since the last one and the CPU time spent
    frame(dtMs, workMs) {
      if (!(dtMs > 0) || dtMs > 250) return;
      Q.frames++;
      Q.ema += (dtMs - Q.ema) * 0.08;
      Q.work += (workMs - Q.work) * 0.08;
      Q.log.push(dtMs); if (Q.log.length > 240) Q.log.shift();
      if (Q.frames < 20) return;
      const t = Q.tier, slow = Q.ema > 19.5, fast = Q.ema < 17.6 && Q.work < 9;
      Q.slowT = slow ? Q.slowT + dtMs : 0;
      Q.fastT = fast ? Q.fastT + dtMs : 0;
      if (Q.slowT > 500) {
        Q.slowT = 0;
        if (Q.g > t.minScale + 0.01) { Q.g = Math.max(t.minScale, Q.g * 0.88); R.dirty = true; }
        else if (Q.setting === 'auto') { const i = ORDER.indexOf(t.id); if (i > 0) { Q.tier = R.TIERS[ORDER[i - 1]]; Q.g = 0.9; R.dirty = true; } }
      } else if (Q.fastT > 2500) {
        Q.fastT = 0;
        if (Q.g < 1) { Q.g = Math.min(1, Q.g * 1.08); R.dirty = true; }
        else if (Q.setting === 'auto') { const i = ORDER.indexOf(t.id); if (i < ORDER.length - 1 && i < ORDER.indexOf(Q.autoTier())) { Q.tier = R.TIERS[ORDER[i + 1]]; R.dirty = true; } }
      }
    },
    stats() {
      const a = Q.log.slice().sort((x, y) => x - y);
      const avg = a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
      return { tier: Q.tier.id, g: +Q.g.toFixed(2), avg: +avg.toFixed(1), p95: a.length ? +a[Math.floor(a.length * 0.95)].toFixed(1) : 0, work: +Q.work.toFixed(1) };
    },
  };
})();
