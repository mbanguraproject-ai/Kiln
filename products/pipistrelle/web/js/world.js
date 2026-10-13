/* World queries on the current cave (PP.L): the walls are the 0.5 contour of a smoothed field on a 12 px grid.
 * Cell types: 0 air, 1 rock, 2 water, 3 crystal rock, 5 the arch opening. */
(function () {
  'use strict';
  const PP = window.PP, CELL = PP.CELL, CH = PP.CH;
  const W = PP.world = {};

  W.fieldAt = function (x, y) {
    const L = PP.L, c = L.cols, rws = L.rows, F = L.field;
    const gx = x / CELL - 0.5, gy = y / CELL - 0.5;
    const i = Math.floor(gx), j = Math.floor(gy), tx = gx - i, ty = gy - j;
    const a = (i < 0 || j < 0 || i >= c || j >= rws) ? 1 : F[j * c + i];
    const b = (i + 1 < 0 || j < 0 || i + 1 >= c || j >= rws) ? 1 : F[j * c + i + 1];
    const d = (i < 0 || j + 1 < 0 || i >= c || j + 1 >= rws) ? 1 : F[(j + 1) * c + i];
    const e = (i + 1 < 0 || j + 1 < 0 || i + 1 >= c || j + 1 >= rws) ? 1 : F[(j + 1) * c + i + 1];
    return (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
  };
  W.typeAt = function (x, y) {
    const L = PP.L, i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    if (i < 0 || j < 0 || i >= L.cols || j >= L.rows) return 1;
    return L.type[j * L.cols + i];
  };
  W.solidAt = (x, y) => W.fieldAt(x, y) >= 0.5;
  W.riverAt = function (x) { for (const rv of PP.L.rivers) if (x >= rv.x0 - CELL * 2 && x <= rv.x1 + CELL * 2) return rv; return null; };

  // March a ray through the field. Returns the hit distance (Infinity for none) and fills W.HIT.
  const HIT = W.HIT = { x: 0, y: 0, t: CH.ROCK };
  W.cast = function (ox, oy, dx, dy, R) {
    const fieldAt = W.fieldAt, typeAt = W.typeAt;
    let d = 0;
    while (d < R) {
      d += 4;
      const x = ox + dx * d, y = oy + dy * d;
      const tp = typeAt(x, y);
      if (tp === 5) return Infinity;
      if (tp === 2) {
        let a = d - 4, b = d;
        for (let k = 0; k < 3; k++) { const m = (a + b) / 2; if (typeAt(ox + dx * m, oy + dy * m) === 2) b = m; else a = m; }
        HIT.x = ox + dx * b; HIT.y = oy + dy * b; HIT.t = CH.WATER;
        return b;
      }
      if (fieldAt(x, y) >= 0.5) {
        let a = d - 4, b = d;
        for (let k = 0; k < 4; k++) { const m = (a + b) / 2; if (fieldAt(ox + dx * m, oy + dy * m) >= 0.5) b = m; else a = m; }
        HIT.x = ox + dx * b; HIT.y = oy + dy * b;
        HIT.t = typeAt(HIT.x + dx * 5, HIT.y + dy * 5) === 3 ? CH.CRYS : CH.ROCK;
        return b;
      }
    }
    return Infinity;
  };
  W.visibleFrom = function (ox, oy, x, y) {
    const d = PP.dist(ox, oy, x, y);
    if (d < 1) return true;
    const w = W.cast(ox, oy, (x - ox) / d, (y - oy) / d, d);
    return w >= d - 14;
  };

  // A body of radius r touches a wall: 9 field samples.
  const SAMP = [];
  for (let k = 0; k < 8; k++) SAMP.push([Math.cos(k / 8 * PP.TAU), Math.sin(k / 8 * PP.TAU)]);
  W.hitsWall = function (x, y, r) {
    if (W.fieldAt(x, y) >= 0.5) return true;
    for (let k = 0; k < 8; k++) if (W.fieldAt(x + SAMP[k][0] * r, y + SAMP[k][1] * r) >= 0.5) return true;
    return false;
  };
  W.normalAt = function (x, y, out) {
    let gx = W.fieldAt(x + 4, y) - W.fieldAt(x - 4, y), gy = W.fieldAt(x, y + 4) - W.fieldAt(x, y - 4);
    const gl = Math.hypot(gx, gy);
    out.ok = gl > 1e-4;
    if (out.ok) { out.x = -gx / gl; out.y = -gy / gl; }
    return out;
  };
  W.nearestOpen = function (x, y, minClear) {
    const L = PP.L;
    let best = [x, y], bd = 1e18;
    for (let j = 0; j < L.rows; j++) for (let i = 0; i < L.cols; i++) {
      if (L.dist[j * L.cols + i] < minClear || L.type[j * L.cols + i] !== 0) continue;
      const px = (i + 0.5) * CELL, py = (j + 0.5) * CELL, d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < bd) { bd = d; best = [px, py]; }
    }
    return best;
  };
})();
