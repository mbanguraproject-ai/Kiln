/* Cave generation: a carved, roughened cellular-automaton cave on a 12 px grid, smoothed into a scalar field
 * (walls are its 0.5 contour). Deterministic for a spec (seed, size, hazards). Hazards place themselves through
 * the registry (js/hazards/registry.js) in two phases: 'terrain' (water, crystals) and 'entities' (the rest).
 * Rising action: the mouth (first quarter) is roomy and safe, the gallery holds the mission, and hazard configs
 * can concentrate a gauntlet before the arch with { from, to }. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CELL = PP.CELL, TAU = PP.TAU;
  const { clamp, lerp, dist } = Kit;
  const GEN = PP.gen = {};

  GEN.newMoth = function (x, y, r) {
    return { x, y, hx: x, hy: y, ang: r.range(0, TAU), sp: r.range(40, 70), ph: r.range(0, 6), lit: -99, dead: false };
  };

  // Build a cave from a spec; retries with new seeds when the exit is unreachable.
  GEN.cave = function (spec) {
    for (let a = 0; a < 10; a++) {
      const lv = tryCave(PP.hash2(spec.seed >>> 0, 7) + a * 7919, spec, false);
      if (lv) return lv;
    }
    return tryCave(12345, Object.assign({}, spec, { rad: 110 }), true);
  };

  // Cave architectures (the owner, 14 October: "why is it only one cave theme and structure"). Each biome has its
  // own, and a cave can ask for another (data/biomes/*.js, layout):
  //   tunnel  a winding passage with side branches (Chalk Hollows)
  //   shafts  steep climbs and drops: the passage swings through most of the cave's height
  //   halls   long, flat, wide halls held up by pillars you weave between (the Drowned Halls)
  //   geodes  round geode rooms strung on narrow throats (the Glass Vaults)
  //   crypt   straight corridors at right angles and rectangular rooms, kept square (the Owlstone Crypt)
  //   cavern  one vast open cavern scattered with islands of rock (The Hush)
  GEN.LAYOUTS = {
    tunnel: { step: [190, 270], swing: 0.24, radK: 1, radVar: 1 },
    shafts: { step: [140, 200], swing: 0.62, radK: 0.92, radVar: 0.8 },
    halls: { step: [280, 380], swing: 0.06, radK: 1.32, radVar: 0.35, pillars: true, dips: true },
    geodes: { step: [200, 280], swing: 0.2, radK: 0.6, radVar: 0.4, geodes: true },
    crypt: { step: [240, 340], swing: 0, radK: 0.78, radVar: 0, ortho: true, rooms: true },
    cavern: { step: [190, 270], swing: 0.3, radK: 0.9, radVar: 1, cavern: true },
  };
  GEN.layoutOf = sp => sp.layout || (PP.biome(sp.biome || 'chalk').gen || {}).layout || 'tunnel';

  const pathLength = path => { let s = 0; for (let i = 1; i < path.length; i++) s += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y); return s; };
  function tryCave(seed, sp, force) {
    const r = Kit.rng(seed);
    const LY = GEN.LAYOUTS[GEN.layoutOf(sp)] || GEN.LAYOUTS.tunnel;
    const W = Math.round(sp.screens * 420), WT = W + 320, H = sp.H;
    const cols = Math.ceil(WT / CELL), rows = Math.ceil(H / CELL), N = cols * rows;
    const exitCol = Math.floor((W - 30) / CELL);
    let solid = new Uint8Array(N).fill(1);
    const carve = (x, y, rad) => {
      const i0 = Math.max(0, Math.floor((x - rad) / CELL)), i1 = Math.min(cols - 1, Math.floor((x + rad) / CELL));
      const j0 = Math.max(0, Math.floor((y - rad) / CELL)), j1 = Math.min(rows - 1, Math.floor((y + rad) / CELL));
      const r2 = rad * rad;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * CELL - x, dy = (j + 0.5) * CELL - y;
        if (dx * dx + dy * dy <= r2) solid[j * cols + i] = 0;
      }
    };
    // a square brush (the crypt's straight walls), and filling rock back in (pillars, islands)
    const carveRect = (x, y, hw, hh) => {
      if (hh === undefined) hh = hw;
      const i0 = Math.max(0, Math.floor((x - hw) / CELL)), i1 = Math.min(cols - 1, Math.floor((x + hw) / CELL));
      const j0 = Math.max(0, Math.floor((y - hh) / CELL)), j1 = Math.min(rows - 1, Math.floor((y + hh) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) solid[j * cols + i] = 0;
    };
    const fill = (x, y, rad) => {
      const i0 = Math.max(0, Math.floor((x - rad) / CELL)), i1 = Math.min(cols - 1, Math.floor((x + rad) / CELL));
      const j0 = Math.max(0, Math.floor((y - rad) / CELL)), j1 = Math.min(rows - 1, Math.floor((y + rad) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * CELL - x, dy = (j + 0.5) * CELL - y;
        if (dx * dx + dy * dy <= rad * rad) solid[j * cols + i] = 1;
      }
    };
    // main path: control points across the cave, drifting up towards the exit on the right
    const exitY = H * r.range(0.22, 0.34);
    let x = 150, y = H * r.range(0.46, 0.6);
    const ctrl = [[120, y], [x + 20, y]];
    const m = sp.rad + 70;
    while (x < W - 420) {
      x += r.range(LY.step[0], LY.step[1]);
      const pull = clamp((x - W * 0.45) / (W * 0.55), 0, 1);
      if (LY.ortho) {
        // a level run, then a straight drop or climb at the corner
        ctrl.push([x, y]);
        y = clamp(y + (r.chance(0.5) ? -1 : 1) * r.range(120, 260) + (exitY - y) * pull * 0.6, m, H - m);
        ctrl.push([x, y]);
        continue;
      }
      y = clamp(y + r.range(-1, 1) * H * LY.swing + (exitY - y) * pull * 0.55, m, H - m);
      ctrl.push([x, y]);
    }
    if (LY.ortho) ctrl.push([W - 220, ctrl[ctrl.length - 1][1]]);
    ctrl.push([W - 220, exitY]);
    ctrl.push([W + 10, exitY]);
    const path = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      const steps = Math.ceil(dist(p1[0], p1[1], p2[0], p2[1]) / 8);
      if (LY.ortho) { for (let k = 0; k < steps; k++) path.push({ x: lerp(p1[0], p2[0], k / steps), y: lerp(p1[1], p2[1], k / steps), r: 0 }); continue; }
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        path.push({ x: cr(p0[0], p1[0], p2[0], p3[0]), y: cr(p0[1], p1[1], p2[1], p3[1]), r: 0 });
      }
    }
    const ph = r.range(0, 100);
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      p.y = clamp(p.y, sp.rad * 0.7 + 30, H - sp.rad * 0.7 - 30);
      p.r = sp.rad * LY.radK * (1 + LY.radVar * (0.26 * Math.sin(i * 0.021 + ph) * Math.sin(i * 0.0071 + ph * 2) + 0.14 * Math.sin(i * 0.057 + ph * 3) - 0.14));
      p.r = Math.max(p.r, 44);                                            // never narrower than a bat can turn in
      if (p.x < 260) p.r = Math.max(p.r, Math.min(110, sp.rad * 0.95));   // a roomy entrance
      if (sp.roomyMouth && p.x < W * 0.22) p.r = Math.max(p.r, sp.rad * 0.92);
      if (p.x > W - 300) p.r = Math.max(p.r * 0.95, 70);
      if (p.x > W) p.r = Math.min(p.r, 60);
    }
    if (LY.dips || sp.basins) {
      // sunken basins along the flat halls, where water gathers into pools (rivers need a dip to fill): one where
      // each river or flood of the cave's data lies, and a few more between
      const hz = sp.hazards || {}, want = [];
      for (const k of ['river', 'flood']) {
        const at = hz[k] && (hz[k].at || (k === 'river' ? [0.3, 0.42] : [0.62, 0.74]));
        if (at) for (const a of (Array.isArray(at[0]) ? at : [at])) want.push(path[Math.floor((a[0] + a[1]) / 2 * (path.length - 1))].x);
      }
      if (LY.dips) for (let dx = 560 + r.range(0, 120); dx < W - 560; dx += r.range(560, 720)) if (want.every(w => Math.abs(w - dx) > 420)) want.push(dx);
      for (const dx of want) {
        if (dx < 420 || dx > W - 520) continue;
        // deep enough that the pool's surface sits below the hall floor on either side
        let pc = path[0];
        for (const p of path) if (Math.abs(p.x - dx) < Math.abs(pc.x - dx)) pc = p;
        const depth = pc.r * r.range(1.1, 1.25);
        for (const p of path) {
          const d = Math.abs(p.x - dx);
          if (d < 190) p.y = Math.min(H - p.r * 0.7 - 30, p.y + depth * Math.pow(Math.cos(d / 190 * Math.PI / 2), 2));
        }
      }
    }
    for (const p of path) if (LY.ortho) carveRect(p.x, p.y, p.r); else carve(p.x, p.y, p.r);
    carve(175, path[0].y, Math.min(125, sp.rad * 1.05));
    carve(W - 230, exitY, Math.max(80, sp.rad * 1.05));
    carve(W - 70, exitY, Math.max(76, sp.rad * 0.9));

    // side branches: some end in chambers (moths, pups, owls), some loop back to the main path
    const branches = [], chambers = [];
    const nb = sp.branches === undefined ? 2 + (sp.n > 2 ? 1 : 0) + (sp.n > 6 ? 1 : 0) : sp.branches;
    const loopP = sp.loops === undefined ? 0.3 : sp.loops;
    for (let b = 0; b < nb; b++) {
      const span = 0.7 / Math.max(1, nb);
      const i0 = Math.floor(clamp(0.16 + b * span + r.range(0, span * 0.7), 0.1, 0.84) * path.length) + 4;
      const p = path[Math.min(path.length - 1, i0)];
      let ang = (r.chance(0.5) ? -1 : 1) * Math.PI / 2 + r.range(-0.7, 0.7);
      let bx = p.x, by = p.y;
      const pts = [], steps = r.int(18, 34), br = sp.rad * r.range(0.48, 0.66);
      const loop = b > 0 && r.chance(loopP);
      for (let s = 0; s < steps; s++) {
        ang += r.range(-0.35, 0.35);
        if (by < 150) ang = lerp(ang, Math.PI / 2, 0.35);
        if (by > H - 150) ang = lerp(ang, -Math.PI / 2, 0.35);
        if (bx < 140) ang = lerp(ang, 0, 0.35);
        if (bx > W - 320) ang = lerp(ang, Math.PI, 0.35);
        bx = clamp(bx + Math.cos(ang) * 16, 60, W - 260);
        by = clamp(by + Math.sin(ang) * 16, 60, H - 60);
        pts.push({ x: bx, y: by, r: br });
      }
      if (loop) {
        const tg = path[Math.min(path.length - 1, i0 + r.int(50, 110))];
        const n2 = Math.ceil(dist(bx, by, tg.x, tg.y) / 14);
        for (let s = 1; s <= n2; s++) pts.push({ x: lerp(bx, tg.x, s / n2), y: lerp(by, tg.y, s / n2), r: br * 0.9 });
      } else {
        const cr = Math.max(70, sp.rad * r.range(0.85, 1.15));
        const cx = clamp(bx, cr + 30, W - 300), cy = clamp(by, cr + 30, H - cr - 30);
        chambers.push({ x: cx, y: cy, r: cr, branch: b, used: false });
      }
      for (const q of pts) carve(q.x, q.y, q.r);
      branches.push(pts);
    }
    for (const c of chambers) carve(c.x, c.y, c.r);

    // the layout's own architecture
    const pillars = [];
    const pathAtX = xx => { let best = path[0]; for (const p of path) if (Math.abs(p.x - xx) < Math.abs(best.x - xx)) best = p; return best; };
    if (LY.geodes) {
      // geode rooms strung along the path, the narrow throats between them
      for (let gx = 520 + r.range(0, 160); gx < W - 520; gx += r.range(520, 680)) {
        const p = pathAtX(gx), gr = clamp(sp.rad * r.range(1.45, 1.8), 110, Math.min(220, H * 0.3));
        const gy = clamp(p.y + r.range(-0.3, 0.3) * gr, gr + 40, H - gr - 40);
        carve(p.x, gy, gr);
        chambers.push({ x: p.x, y: gy, r: gr, branch: -1, used: false, geode: true });
      }
    }
    if (LY.rooms) {
      // rectangular rooms at some of the corners
      for (let i = 2; i < ctrl.length - 3; i += 2) {
        if (!r.chance(0.55)) continue;
        const cx = ctrl[i][0], cy = ctrl[i][1], hw = r.range(120, 190), hh = r.range(95, 140);
        const yy = clamp(cy, hh + 40, H - hh - 40);
        carveRect(cx, yy, hw, hh);
        chambers.push({ x: cx, y: yy, r: Math.min(hw, hh) * 0.9, branch: -1, used: false, room: true });
      }
    }
    if (LY.cavern) {
      // one vast cavern, then islands of rock that stay clear of the main path
      const ex = W * 0.5, ey = H * 0.5, rx = W * 0.4, ry = H * 0.36;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const dx = ((i + 0.5) * CELL - ex) / rx, dy = ((j + 0.5) * CELL - ey) / ry;
        if (dx * dx + dy * dy <= 1) solid[j * cols + i] = 0;
      }
      const isles = r.int(6, 10);
      for (let k = 0, tries = 0; k < isles && tries < 80; tries++) {
        const ir = r.range(55, 130), ix = ex + r.range(-0.85, 0.85) * rx, iy = ey + r.range(-0.75, 0.75) * ry;
        let clear = ix > 360 && ix < W - 420;
        for (let q = 0; clear && q < path.length; q += 4) { const p = path[q]; if (dist(p.x, p.y, ix, iy) < p.r + ir + 30) clear = false; }
        if (!clear) continue;
        fill(ix, iy, ir);
        k++;
      }
    }
    if (LY.pillars) {
      // pillars down the middle of the halls, with a way round on both sides
      for (let px = 520 + r.range(0, 120); px < W - 520; px += r.range(300, 440)) {
        const p = pathAtX(px);
        if (p.r < 100) continue;
        pillars.push({ x: p.x, y: p.y + r.range(-0.12, 0.12) * p.r, r: clamp(p.r * r.range(0.22, 0.3), 26, 46) });
      }
    }

    // chimneys for wind gusts: vertical shafts off the main path
    const gusts = [];
    const gcfg = sp.hazards && sp.hazards.gust;
    if (gcfg) {
      const k = gcfg.n || 2;
      for (let g = 0; g < k; g++) {
        const p = path[Math.floor(path.length * (0.25 + g * 0.5 / k + r.range(0, 0.1)))];
        const top = Math.max(40, p.y - r.range(300, 420));
        for (let yy = p.y; yy > top; yy -= 10) carve(p.x + Math.sin(yy * 0.02) * 10, yy, 42);
        gusts.push({ x: p.x, y0: top, y1: p.y + p.r * 0.6, w: 70, ph: r.range(0, 4), period: 4.6, state: 0, lastState: 0 });
      }
    }

    // roughen the edges, then cellular-automaton smoothing
    const edgeAt = (i, j) => {
      const v = solid[j * cols + i];
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
        const ii = i + a, jj = j + b;
        if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
        if (solid[jj * cols + ii] !== v) return true;
      }
      return false;
    };
    if (!LY.ortho) {
      const s2 = solid.slice();
      for (let j = 1; j < rows - 1; j++) for (let i = 1; i < cols - 1; i++) if (edgeAt(i, j)) s2[j * cols + i] = r.chance(0.5) ? 1 : 0;
      solid = s2;
    }
    for (let it = 0; it < (LY.ortho ? 1 : 4); it++) {
      const nx = new Uint8Array(N);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let c = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
          const ii = i + a, jj = j + b;
          c += (ii < 0 || jj < 0 || ii >= cols || jj >= rows) ? 1 : solid[jj * cols + ii];
        }
        nx[j * cols + i] = c >= 5 ? 1 : 0;
      }
      solid = nx;
    }
    // the core of every passage stays open, so the cave is always connected
    for (const p of path) if (LY.ortho) carveRect(p.x, p.y, Math.max(30, p.r * 0.6)); else carve(p.x, p.y, Math.max(30, p.r * 0.6));
    for (const pts of branches) for (const q of pts) carve(q.x, q.y, Math.max(26, q.r * 0.5));
    for (const pl of pillars) fill(pl.x, pl.y, pl.r);
    for (const c of chambers) carve(c.x, c.y, c.r * 0.7);
    for (const g of gusts) for (let yy = g.y1; yy > g.y0 + 20; yy -= 10) carve(g.x + Math.sin(yy * 0.02) * 10, yy, 30);
    // frame: solid border, except the moonlit mouth on the right
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (i < 2 || j < 2 || j >= rows - 2 || i >= cols - 2 || (i + 0.5) * CELL > W + 40) solid[j * cols + i] = 1;
    }
    // flood fill from the start: sealed pockets become rock
    const seen = new Uint8Array(N), q = new Int32Array(N);
    const si = Math.floor(150 / CELL), sj = Math.floor(path[0].y / CELL);
    let qh = 0, qt = 0;
    if (solid[sj * cols + si]) return null;
    q[qt++] = sj * cols + si; seen[sj * cols + si] = 1;
    while (qh < qt) {
      const id = q[qh++], i = id % cols, j = (id - i) / cols;
      if (i > 0 && !seen[id - 1] && !solid[id - 1]) { seen[id - 1] = 1; q[qt++] = id - 1; }
      if (i < cols - 1 && !seen[id + 1] && !solid[id + 1]) { seen[id + 1] = 1; q[qt++] = id + 1; }
      if (j > 0 && !seen[id - cols] && !solid[id - cols]) { seen[id - cols] = 1; q[qt++] = id - cols; }
      if (j < rows - 1 && !seen[id + cols] && !solid[id + cols]) { seen[id + cols] = 1; q[qt++] = id + cols; }
    }
    const ej = Math.floor(exitY / CELL);
    if (!seen[ej * cols + exitCol] && !force) return null;
    for (let i = 0; i < N; i++) if (!solid[i] && !seen[i]) solid[i] = 1;

    const type = new Uint8Array(N);
    for (let i = 0; i < N; i++) type[i] = solid[i] ? 1 : 0;
    const ah = Math.max(54, sp.rad * 0.62);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const xx = (i + 0.5) * CELL, yy = (j + 0.5) * CELL;
      if (xx > W - 6 && xx < W + 78 && yy > exitY - ah * 0.95 && yy < exitY + ah) { solid[j * cols + i] = 0; type[j * cols + i] = 5; }
    }

    // distance (in cells) from rock, for placing things in open air
    const dst = new Uint8Array(N).fill(255);
    qh = 0; qt = 0;
    for (let i = 0; i < N; i++) if (solid[i]) { dst[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const id = q[qh++], i = id % cols, j = (id - i) / cols, d = dst[id] + 1;
      if (i > 0 && dst[id - 1] > d) { dst[id - 1] = d; q[qt++] = id - 1; }
      if (i < cols - 1 && dst[id + 1] > d) { dst[id + 1] = d; q[qt++] = id + 1; }
      if (j > 0 && dst[id - cols] > d) { dst[id - cols] = d; q[qt++] = id - cols; }
      if (j < rows - 1 && dst[id + cols] > d) { dst[id + cols] = d; q[qt++] = id + cols; }
    }

    // the smoothed field: walls are its 0.5 contour (water counts as open air)
    const field = new Float32Array(N);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let s = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        const ii = i + a, jj = j + b;
        s += (ii < 0 || jj < 0 || ii >= cols || jj >= rows) ? 1 : solid[jj * cols + ii];
      }
      field[j * cols + i] = s / 9;
    }

    const lv = {
      id: sp.id || ('n' + sp.n), n: sp.n || 1, sp, biome: sp.biome || 'chalk', seed: sp.seed >>> 0, layout: GEN.layoutOf(sp), pathLen: pathLength(path),
      W, WT, H, cols, rows, archH: ah, type, solid, dist: dst, field, path, chambers, exitY, startY: path[0].y,
      moths: [], pups: [], webs: [], stals: [], rivers: [], crystals: [], gusts, owls: [], drips: [], scratches: [], siphons: [], fish: [], branches,
      collapse: null,
    };
    const cellOf = (x, y) => { const i = Math.floor(x / CELL), j = Math.floor(y / CELL); return (i < 0 || j < 0 || i >= cols || j >= rows) ? -1 : j * cols + i; };
    const isSolid = (x, y) => { const c = cellOf(x, y); return c < 0 || type[c] === 1 || type[c] === 3; };
    const clearAt = (x, y) => { const c = cellOf(x, y); return c < 0 ? 0 : dst[c]; };
    const inWater = (x, y) => { const c = cellOf(x, y); return c >= 0 && type[c] === 2; };
    const Q = {
      r, q, N, cols, rows, exitCol, cellOf, isSolid, clearAt, inWater,
      ceilingAbove: (x, y, max) => { for (let d = 0; d < max; d += 4) if (isSolid(x, y - d)) return y - d; return null; },
      floorBelow: (x, y, max) => { for (let d = 0; d < max; d += 4) if (isSolid(x, y + d)) return y + d; return null; },
      pathAt: f => path[clamp(Math.floor(f * path.length), 0, path.length - 1)],
      pathIndex: f => clamp(Math.floor(f * path.length), 0, path.length - 1),
      openSpot(x, y, minClear, tries, spread) {
        for (let t = 0; t < tries; t++) {
          const xx = x + r.range(-spread, spread), yy = y + r.range(-spread, spread);
          if (clearAt(xx, yy) >= minClear && !inWater(xx, yy + 20)) return [xx, yy];
        }
        return null;
      },
      // can a bat-sized body still get from the entrance to the mouth? (cells with open air all around)
      passable() {
        const ok = id => { if (type[id] !== 0) return false; const i = id % cols; return i > 0 && i < cols - 1 && type[id - 1] === 0 && type[id + 1] === 0 && type[id - cols] === 0 && type[id + cols] === 0; };
        const sn = new Uint8Array(N);
        let h = 0, tl = 0;
        const s0 = Math.floor(path[0].y / CELL) * cols + Math.floor(150 / CELL);
        if (!ok(s0)) return false;
        q[tl++] = s0; sn[s0] = 1;
        const goal = Math.floor(exitY / CELL) * cols + exitCol;
        while (h < tl) {
          const id = q[h++];
          if (id === goal || (id % cols >= exitCol && Math.abs(Math.floor(id / cols) * CELL - exitY) < 60)) return true;
          for (const k of [id - 1, id + 1, id - cols, id + cols]) if (k > cols && k < N - cols && !sn[k] && ok(k)) { sn[k] = 1; q[tl++] = k; }
        }
        return false;
      },
      takeChamber() { const c = chambers.find(ch => !ch.used); if (c) c.used = true; return c || null; },
    };
    lv.q = Q;
    lv.cellOf = cellOf; lv.isSolid = isSolid;

    // hazards that shape the terrain (water, crystals) come first, then moths, pups and the rest
    PP.hazards.place(lv, r, 'terrain');
    placeMoths(lv, sp, Q);
    placePups(lv, sp, Q);
    PP.hazards.place(lv, r, 'entities');
    lv.flow = GEN.flowField(lv);
    lv.survey = buildSurvey(lv);
    delete lv.q.q;
    return lv;
  }

  function placeMoths(lv, sp, Q) {
    const r = Q.r, chambers = lv.chambers;
    if (sp.firstMoth || sp.n === 1) { const p = Q.pathAt(0.06); lv.moths.push(GEN.newMoth(p.x + 120, p.y - 10, r)); }
    for (let k = lv.moths.length; k < sp.moths; k++) {
      let spot = null;
      if (k % 3 === 2 && chambers.length) { const c = chambers[k % chambers.length]; spot = Q.openSpot(c.x, c.y, 3, 20, c.r * 0.6); }
      if (!spot) { const p = Q.pathAt(r.range(0.05, 0.95)); spot = Q.openSpot(p.x, p.y, 3, 20, p.r * 0.55); }
      if (spot) lv.moths.push(GEN.newMoth(spot[0], spot[1], r));
    }
  }

  // pups hang upside down from the ceiling: in chambers, on ledges over the path, or where the spec says
  function placePups(lv, sp, Q) {
    const r = Q.r;
    const list = Array.isArray(sp.pups) ? sp.pups : null;
    const hang = (s, opts) => {
      const c = Q.ceilingAbove(s.x, s.y, 320);
      if (c === null || s.y - c < 40 || Q.inWater(s.x, c + 13) || Q.inWater(s.x, c + 40)) return false;
      lv.pups.push(Object.assign({ x: s.x, y: c + 13, hx: s.x, hy: c + 13, state: 'hang', lit: -99, flip: 0, ph: r.range(0, 6), heart: 0, deep: false, answer: -99, idx: lv.pups.length }, opts || {}));
      return true;
    };
    if (list) {
      for (const ps of list) {
        let ok = false;
        const o = { deep: !!ps.deep, sealed: !!ps.sealed };
        if (ps.at === 'chamber') { const ch = Q.takeChamber(); if (ch) ok = hang(ch, o) || hang({ x: ch.x + ch.r * 0.3, y: ch.y }, o); }
        else if (typeof ps.at === 'number') {
          for (let d = 0; d < 8 && !ok; d++) { const p = Q.pathAt(clamp(ps.at + (d % 2 ? 1 : -1) * d * 0.012, 0.05, 0.95)); ok = hang(p, Object.assign({ ledge: !!ps.ledge }, o)); }
        }
        // fallback: along the path, so the count always matches the mission
        for (let d = 0; d < 30 && !ok; d++) ok = hang(Q.pathAt(0.2 + (d * 0.023) % 0.7), o);
      }
      return;
    }
    const want = sp.pups || 0, spots = [];
    if (sp.n === 1) spots.push(Q.pathAt(0.36));
    for (const c of lv.chambers) spots.push(c);
    for (let k = 0; k < 3; k++) spots.push(Q.pathAt(0.3 + k * 0.22));
    for (const s of spots) { if (lv.pups.length >= want) break; hang(s); }
  }

  // Breadth-first distance to the exit column (or to `target` cells), preferring the middle of passages.
  GEN.flowField = function (lv, targetCells) {
    const { cols, rows, type, dist: dst, exitY } = lv, N = cols * rows, exitCol = Math.floor((lv.W - 30) / CELL);
    const flow = new Int32Array(N).fill(-1), q = new Int32Array(N);
    for (const minD of [1, 2]) {
      const f2 = minD === 1 ? flow : new Int32Array(N).fill(-1);
      let h = 0, tl = 0;
      if (targetCells) { for (const id of targetCells) if (id >= 0 && type[id] !== 1 && type[id] !== 3) { f2[id] = 0; q[tl++] = id; } }
      else for (let j = 2; j < rows - 2; j++) { const id = j * cols + exitCol; if (type[id] === 0 && Math.abs(j * CELL - exitY) < 80) { f2[id] = 0; q[tl++] = id; } }
      while (h < tl) {
        const id = q[h++];
        const nb = [id - 1, id + 1, id - cols, id + cols];
        for (let n = 0; n < 4; n++) {
          const k = nb[n];
          if (k < cols || k >= N - cols || f2[k] >= 0 || (type[k] !== 0 && type[k] !== 5) || dst[k] < minD) continue;
          f2[k] = f2[id] + 1; q[tl++] = k;
        }
      }
      if (minD === 2) {
        const sc = Math.floor(lv.startY / CELL) * cols + Math.floor(150 / CELL);
        if (f2[sc] >= 0 || targetCells) for (let k = 0; k < N; k++) flow[k] = f2[k] >= 0 ? f2[k] : (flow[k] >= 0 ? flow[k] + 4000 : -1);
      }
    }
    return flow;
  };

  // Survey: a coarse 48 px grid of wall cells (open air next to rock); ray hits mark them heard.
  function buildSurvey(lv) {
    const cs = 48, sc = Math.ceil(lv.W / cs), sr = Math.ceil(lv.H / cs), wall = new Uint8Array(sc * sr);
    const { cols, rows, type } = lv;
    for (let j = 1; j < rows - 1; j++) for (let i = 1; i < cols - 1; i++) {
      const id = j * cols + i;
      if (type[id] !== 0) continue;
      if (type[id - 1] === 1 || type[id + 1] === 1 || type[id - cols] === 1 || type[id + cols] === 1 || type[id - 1] === 3 || type[id + 1] === 3) {
        const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL;
        if (x >= lv.W - 10) continue;
        wall[Math.floor(y / cs) * sc + Math.floor(x / cs)] = 1;
      }
    }
    let total = 0;
    for (let i = 0; i < wall.length; i++) total += wall[i];
    return { cs, cols: sc, rows: sr, wall, heard: new Uint8Array(sc * sr), total, count: 0 };
  }
  GEN.surveyMark = function (lv, x, y) {
    const s = lv.survey;
    if (!s) return;
    const i = Math.floor(x / s.cs), j = Math.floor(y / s.cs);
    if (i < 0 || j < 0 || i >= s.cols || j >= s.rows) return;
    const id = j * s.cols + i;
    if (s.wall[id] && !s.heard[id]) { s.heard[id] = 1; s.count++; }
  };

  // The Long Night: today's endless caves, generalised. Every hazard switches on by depth, then mixes.
  GEN.endlessSpec = function (runSeed, n, biome) {
    const T = PP.data.tuning.endless, U = T.unlock;
    const f = {};
    for (const k in U) f[k] = n >= U[k];
    if (n > 8) {
      const r = Kit.rng(PP.hash2(runSeed, n * 977)), keys = Object.keys(U);
      let on = 0;
      for (const k of keys) { f[k] = r.chance(0.55); if (f[k]) on++; }
      while (on < 4) { const k = r.pick(keys); if (!f[k]) { f[k] = true; on++; } }
    }
    const hz = {};
    if (f.webs) hz.webs = { n: Math.min(6, 2 + Math.floor(n / 3)), from: 0.12, to: 0.9 };
    if (f.stals) hz.stals = { n: Math.min(11, 4 + Math.floor(n / 2)), from: 0.1, to: 0.92 };
    if (f.river) hz.river = { at: [0.3, 0.42], level: 0.38 };
    if (f.flood) hz.flood = { at: [0.62, 0.74], level: 0.1 };
    if (f.crystal) hz.crystal = { chamber: true, patches: 2 };
    if (f.gust) hz.gust = { n: 2 + (n > 9 ? 1 : 0) };
    if (f.owls) hz.owls = { n: 2 };
    // each biome brings its own things to listen for
    if (biome === 'drowned') { hz.river = { at: [[0.22, 0.32], [0.56, 0.66]], level: 0.38 }; if (n >= 4) hz.siphon = { n: 1 }; }
    if (biome === 'glass') { hz.crystal = { chamber: true, patches: 3 }; hz.tiger = { n: Math.min(5, 2 + Math.floor(n / 4)) }; }
    if (biome === 'owlstone') hz.owls = { n: Math.min(4, 2 + Math.floor(n / 6)), light: true, deep: 1 };
    const first = biome && biome !== 'chalk' && n > 1 && (n - 1) % 3 === 0;
    const pool = LAYOUT_POOL[biome || 'chalk'] || LAYOUT_POOL.chalk, layout = n === 1 ? 'tunnel' : pool[Kit.rng(PP.hash2(runSeed, n * 131)).int(0, pool.length - 1)];
    return {
      id: 'night-' + n, n, seed: PP.hash2(runSeed, n), biome: biome || 'chalk', mission: 'endless', layout,
      screens: T.screens(n), rad: T.rad(n), moths: T.moths(n), H: T.H(n), pups: T.pups(n), drain: T.drain(n), hazards: hz,
      intro: first ? PP.biome(biome).name + ': ' + PP.biome(biome).line.replace(/\.$/, '') : ENDLESS_INTRO[n] || (n % 3 === 0 ? 'Deeper. Narrower. Fewer moths.' : 'Every echo counts down here'),
    };
  };
  const LAYOUT_POOL = { chalk: ['tunnel', 'shafts', 'cavern', 'tunnel'], drowned: ['halls', 'halls', 'tunnel'], glass: ['geodes', 'geodes', 'cavern'], owlstone: ['crypt', 'crypt', 'shafts'], hush: ['cavern'] };
  const ENDLESS_INTRO = {
    1: 'Chirp to see in the dark', 2: 'Spider webs: wiggle to break free', 3: 'Listen: stalactites tick before they fall',
    4: 'Underground rivers pull you along', 5: 'Crystals echo a second time', 6: 'Wind gusts up the chimneys',
    7: 'Shrieks wake the owls', 8: 'Flooded tunnels drip',
  };

  // A campaign cave's spec from its data (biome defaults, then the cave's own numbers).
  GEN.caveSpec = function (cave, opts) {
    const b = PP.biome(cave.biome), g = b.gen || {};
    return Object.assign({ n: 1, screens: g.screens || 8, H: g.H || 1100, rad: g.rad || 112, moths: g.moths || 22, drain: g.drain || 1.6, branches: g.branches, loops: g.loops },
      cave, { hazards: Object.assign({}, cave.hazards || {}), biome: cave.biome, roomyMouth: true }, opts || {});
  };
})();
