/* Resolution and fidelity. Pipistrelle draws at the screen's full native resolution, up to 4K (3840 x 2160; a
 * bigger screen is drawn at 4K's pixel count and scaled), with every effect on. There are no quality tiers to
 * pick. On a device that cannot keep the frame rate, a quiet safety net steps in: it sheds the costliest effects
 * first, one level at a time (the relight of the far silhouettes, bloom, dust, then the caches' extra
 * sharpness), and only when nothing is left to shed does it lower the resolution, never below 75% of native. It
 * climbs back as soon as frames are fast again. Battery saver (Settings) draws at about 1080p with lighter effects.
 * Effects change fidelity, never information: echo pools, ray counts and lifetimes are the same at every level.
 *
 * rockMax and memMax cap the density (device px per world px) of the cached rock and echo-memory chunks, and
 * rockMB and memMB bound those caches (js/render/chunks.js); rock edges are stroked live at full resolution
 * (drawRims), so rock texture can sit a little below native without the stone looking soft. bgMax caps the
 * parallax silhouettes, which are far away, and sets the resolution of the backdrop buffer they are drawn into
 * (js/render/backdrop.js). mask is the darkness mask's texel in world px. */
(function () {
  'use strict';
  const PP = window.PP;
  const R = PP.R = PP.R || {};

  const NATIVE_MAX = 3840 * 2160 * 1.07, SAVER_MAX = 2.1e6, FLOOR = 0.75;
  // the safety net's levels, best first (the old tier names are kept for the tests and tools that pin one)
  R.TIERS = {
    ultra: { id: 'ultra', name: 'Full', rockMax: 2.5, memMax: 3.5, bgMax: 2, rockMB: 32, memMB: 40, mask: 1.5, relight: true, ambient: 900, detail: true, decals: true, lru: 96, bloom: true },
    high: { id: 'high', name: 'Lean', rockMax: 2, memMax: 3, bgMax: 1.5, rockMB: 20, memMB: 24, mask: 2, relight: true, ambient: 450, detail: true, decals: true, lru: 64, bloom: true },
    medium: { id: 'medium', name: 'Light', rockMax: 1.5, memMax: 2.5, bgMax: 1.25, rockMB: 12, memMB: 14, mask: 2.5, relight: false, ambient: 200, detail: true, decals: false, lru: 42, bloom: true },
    low: { id: 'low', name: 'Minimal', rockMax: 1.25, memMax: 2, bgMax: 1, rockMB: 8, memMB: 10, mask: 3, relight: false, ambient: 80, detail: false, decals: false, lru: 30, bloom: false },
  };
  const ORDER = ['low', 'medium', 'high', 'ultra'];

  const Q = R.quality = {
    setting: 'native',   // 'native' (the default) or 'saver' (Settings)
    pinned: null,        // a level pinned by a test or tool, which the safety net then leaves alone
    tier: R.TIERS.ultra, // the current level
    g: 1,                // the safety net's resolution scale (1 = native)
    ema: 16.7, work: 4, slowT: 0, fastT: 0, frames: 0,
    log: [],             // recent frame intervals, for tests
    steps: [],           // what the safety net did, for tests: 'level:<id>' or 'scale:<g>'
    set(id) {
      if (R.TIERS[id]) { Q.setting = 'native'; Q.pinned = id; }
      else { Q.setting = id === 'saver' ? 'saver' : 'native'; Q.pinned = null; }
      Q.tier = R.TIERS[Q.pinned || Q.top()];
      Q.g = 1; Q.slowT = 0; Q.fastT = 0; Q.steps.length = 0;
      R.dirty = true;
    },
    // the best level the setting allows
    top() { return Q.setting === 'saver' ? 'medium' : 'ultra'; },
    // the scale of the backing store relative to device pixels: native, unless the screen is bigger than 4K or
    // Battery saver is on, times the safety net's scale
    scale(cssW, cssH, dpr) {
      const full = cssW * cssH * dpr * dpr, max = Q.setting === 'saver' ? SAVER_MAX : NATIVE_MAX;
      return Math.min(1, Math.sqrt(max / full)) * Q.g;
    },
    // called once per displayed frame with the interval since the last one and the CPU time spent
    frame(dtMs, workMs) {
      // a gap over a second is a pause (app hidden, a breakpoint), not a slow frame; anything else counts, capped,
      // so a device that is very slow still steps down instead of being ignored
      if (!(dtMs > 0) || dtMs > 1000) return;
      dtMs = Math.min(dtMs, 250);
      Q.frames++;
      Q.ema += (dtMs - Q.ema) * 0.08;
      Q.work += (workMs - Q.work) * 0.08;
      Q.log.push(dtMs); if (Q.log.length > 240) Q.log.shift();
      if (Q.frames < 20 || Q.pinned) return;
      const slow = Q.ema > 19.5, fast = Q.ema < 17.6 && Q.work < 9;
      Q.slowT = slow ? Q.slowT + dtMs : 0;
      Q.fastT = fast ? Q.fastT + dtMs : 0;
      const i = ORDER.indexOf(Q.tier.id);
      if (Q.slowT > 500) {
        Q.slowT = 0;
        // shed effects first; lower the resolution only when there is nothing left to shed
        if (i > 0) { Q.tier = R.TIERS[ORDER[i - 1]]; Q.steps.push('level:' + Q.tier.id); R.dirty = true; }
        else if (Q.g > FLOOR + 0.001) { Q.g = Math.max(FLOOR, Q.g * 0.92); Q.steps.push('scale:' + Q.g.toFixed(2)); R.dirty = true; }
      } else if (Q.fastT > 2500) {
        Q.fastT = 0;
        // and climb back the same way: resolution first, then effects
        if (Q.g < 1) { Q.g = Math.min(1, Q.g / 0.92); Q.steps.push('scale:' + Q.g.toFixed(2)); R.dirty = true; }
        else if (i < ORDER.indexOf(Q.top())) { Q.tier = R.TIERS[ORDER[i + 1]]; Q.steps.push('level:' + Q.tier.id); R.dirty = true; }
      }
    },
    stats() {
      const a = Q.log.slice().sort((x, y) => x - y);
      const avg = a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
      return { tier: Q.tier.id, g: +Q.g.toFixed(2), avg: +avg.toFixed(1), p95: a.length ? +a[Math.floor(a.length * 0.95)].toFixed(1) : 0, work: +Q.work.toFixed(1) };
    },
  };
  R.quality.FLOOR = FLOOR;
})();
