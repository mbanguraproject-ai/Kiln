/* The Roost: the inside of the old belfry, home. Every pup you ever brought home hangs from the beams, grouped and
 * named for the cave it came from; your bats hang among them. Drawn on the canvas behind the menus.
 *
 * It is alive (the owner, 14 October: "make the upper game world more interactive... subtle environmental
 * animation"; 15 October: the rescued bats appear as you progress). Pups brought home since the last visit fly in
 * through the window to their beams, the colony circling below grows with them, and the Long Rain drips from the
 * beams and falls past the window. Moonlight falls through a tall window, and clouds drift across the moon, so the light comes and goes;
 * dust turns in the moonbeam; moths flutter round the light; wild bats cross the moon outside. Inside, everything
 * hangs on a pendulum: pups sway and call to each other now and then, your bats stretch their wings, and every so
 * often one drops from the beam, flies a lap of the belfry, snaps up a moth and hangs back up. And it answers you:
 * tap anywhere to chirp, and the echo ring lights what it touches, as in the caves, and the pups it reaches call back;
 * tap a pup and it squeaks and its group answers; tap one of your bats and it flies a lap. None of this touches the
 * game's simulation or its random numbers. The menu's tiles and cards are read from the page, so nothing hangs
 * behind them. RO.postcard paints the Long Rain card's picture of the next cave. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const RO = PP.roost = {};
  const rnd = Kit.rng(4242);
  let cache = null, keep = null;
  // things that move: rings of sound, dust, moths, a bat on the wing, wild bats outside, the hint
  const S = { rings: [], motes: null, moths: [], flier: null, wild: [], calls: [], col: [], arr: [], drips: [], nextFly: 9, nextCall: 3, nextStretch: 5, nextWild: 2, nextDrip: 1.5, last: 0, tapped: false, shown: 0, boost: 0, colT: 0, scatter: 0, ropeA: 0, ropeV: 0 };
  const NM = 56;

  // where the menu sits, in canvas units (CSS px): the two columns of tiles, the top bar and the bottom cards
  function rectsOf(w, h, u) {
    const root = document.querySelector('.roost-ui');
    const rr = el => { const b = el.getBoundingClientRect(); return { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }; };
    if (root) {
      const cols = root.querySelectorAll('.mcol'), top = root.querySelector('.top'), menu = root.querySelector('.home-menu');
      if (cols.length === 2 && top && menu && cols[0].getBoundingClientRect().width > 1) keep = { L: rr(cols[0]), Rt: rr(cols[1]), top: rr(top), menu: rr(menu), w, h };
    }
    if (keep && keep.w === w && keep.h === h) return keep;
    // not on the page (another screen is over the Roost): the same shape, from the stylesheet's sizes
    const rem = 16 * u, land = w > h * 1.15, cw = Math.min(land ? 10.5 * rem : 8.6 * rem, w * (land ? 0.22 : 0.36)), sx = Math.max(rem, R.safe.l), ty = Math.max(0.9 * rem, R.safe.t) + 2.9 * rem;
    const th = 11.6 * rem, mh = land ? 13.5 * rem : 15.5 * rem;
    return { L: { x0: sx, y0: ty + 0.5 * rem, x1: sx + cw, y1: ty + 0.5 * rem + th }, Rt: { x0: w - sx - cw, y0: ty + 0.5 * rem, x1: w - sx, y1: ty + 0.5 * rem + th }, top: { x0: 0, y0: 0, x1: w, y1: ty }, menu: { x0: 0, y0: h - mh, x1: w, y1: h }, w, h };
  }

  function layout(ctx, w, h, u) {
    const p = PP.profile.get(), K = rectsOf(w, h, u), land = w > h * 1.15;
    const groups = [];
    for (const B of PP.data.campaign.order.map(id => PP.biomes[id]).filter(Boolean)) for (const c of B.caves) if (p.roost[c.id]) groups.push({ id: c.id, name: c.name, n: p.roost[c.id] });
    // the window, between the two columns of tiles and under the top bar
    const gx0 = K.L.x1, gx1 = K.Rt.x0, tilesBottom = Math.max(K.L.y1, K.Rt.y1);
    const ww = Math.max(34 * u, Math.min(gx1 - gx0 - 18 * u, 118 * u)), wx = (gx0 + gx1) / 2;
    const wy = K.top.y1 + 2 * u, wh = Math.max(60 * u, Math.min(tilesBottom - wy + 18 * u, (K.menu.y0 - wy) * (land ? 0.42 : 0.5)));
    // the beams, in the open belfry between the window and the cards at the bottom
    // (on a narrow screen the tiles leave no room beside them, so the beams start below the tiles)
    let ya = wy + wh + 30 * u, yb = K.menu.y0 - 62 * u;
    if (gx1 - gx0 < 160 * u) ya = Math.max(ya, tilesBottom + 14 * u);
    if (yb < ya) { ya = Math.min(ya, K.menu.y0 - 62 * u); yb = ya; }
    const room = yb - ya, roomBeams = room >= 150 * u ? 3 : room >= 70 * u ? 2 : 1, edge = Math.max(w * 0.04, 12 * u);
    const sp = 15 * u, gap = 22 * u, fs = 9 * u;
    ctx.font = '700 ' + fs + 'px Figtree, system-ui, sans-serif';
    // what is to hang: your bats first (under the window, by the lantern), then the pups, cave by cave, spread evenly
    // over the beams
    const items = p.bats.owned.map(id => ({ bat: id, need: 36 * u }));
    for (const g of groups) { const lw = ctx.measureText(g.name + (g.n > 1 ? ' ×' + g.n : '')).width; items.push({ g, lw, need: Math.max((g.n - 1) * sp + 14 * u, lw + 6 * u) }); }
    const totalNeed = items.reduce((s, it) => s + it.need + gap, 0);
    // only as many beams as the colony needs (two at least, the belfry's frame), a beam's height apart; what is left
    // below them is the lower belfry, where the colony flies (the owner, 14 October: use the space for the world)
    const nb = Math.min(roomBeams, Math.max(2, Math.ceil((totalNeed + 60 * u) / ((w - 2 * edge) * 0.9))));
    const step = nb > 1 ? Math.min(112 * u, (yb - ya) / (nb - 1)) : 0;
    const beams = [], spans = [];
    for (let i = 0; i < nb; i++) {
      const y = nb === 1 ? (ya + yb) / 2 : ya + step * i;
      beams.push(y);
      // what hangs from a beam stays clear of the tiles beside it
      const band0 = y - 12 * u, band1 = y + 52 * u;
      const l = band1 > K.L.y0 && band0 < K.L.y1 ? K.L.x1 + 8 * u : edge, r = band1 > K.Rt.y0 && band0 < K.Rt.y1 ? K.Rt.x0 - 8 * u : w - edge;
      spans.push([l, r]);
    }
    const last = beams[nb - 1], low = { y0: last + 58 * u, y1: K.menu.y0 - 10 * u };
    low.h = low.y1 - low.y0;
    // the bell rope, hanging from the lowest beam at its far end; nothing else hangs there
    const ropeLen = Math.min(190 * u, low.y1 - 30 * u - last);
    const rope = ropeLen > 90 * u ? { x: spans[nb - 1][1] - 16 * u, y0: last + 2 * u, len: ropeLen } : null;
    if (rope) spans[nb - 1][1] = rope.x - 20 * u;
    const x0 = spans[0][0], x1 = spans[0][1];
    const target = totalNeed / nb;
    const slots = [], ends = spans.map(sp2 => sp2[0] + 14 * u);
    let bi = 0, x = spans[0][0] + 44 * u, more = 0, used = 0;
    for (const it of items) {
      if (bi + 1 < nb && (x + it.need > spans[bi][1] || (it.g && used + it.need / 2 > target))) { ends[bi] = x; bi++; x = spans[bi][0] + 14 * u; used = 0; }
      const R1 = spans[bi][1];
      if (it.bat) { slots.push({ kind: 'bat', id: it.bat, x: x + 10 * u, y: beams[bi], beam: bi, ph: rnd.range(0, 6), a: 0, v: 0, lit: 0, st: 0 }); x += it.need; used += it.need; continue; }
      const g = it.g;
      let n = g.n, need = it.need;
      if (x + need > R1) {
        // a group longer than the room left hangs as many as fit
        const fit = Math.floor((R1 - x - 14 * u) / sp) + 1;
        if (fit < 1 || R1 - x < it.lw) { more += g.n; continue; }
        if (n > fit) { more += n - fit; n = fit; need = Math.max((n - 1) * sp + 14 * u, it.lw + 6 * u); }
      }
      const c0 = x + need / 2 - (n - 1) * sp / 2;
      g.cx = x + need / 2; g.beam = bi; g.slots = [];
      for (let k = 0; k < n; k++) { const s = { kind: 'pup', g, x: c0 + k * sp, y: beams[bi], beam: bi, ph: (k * 1.7 + g.id.length) % 6, a: 0, v: 0, lit: 0 }; slots.push(s); g.slots.push(s); }
      x += need + gap; used += need + gap;
    }
    ends[bi] = Math.max(ends[bi], x);
    // the rest (a long campaign's worth) are counted, at the end of the last beam if there is room
    let moreAt = null;
    if (more) { const lw = ctx.measureText('+' + more + ' more in the Journal').width; if (x + lw < spans[bi][1]) { moreAt = { x: x + lw / 2, y: beams[bi] + 40 * u }; ends[bi] = x + lw + 10 * u; } }
    // a new colony: say what the beams are for, under the second beam
    const total = groups.reduce((s2, g) => s2 + g.n, 0);
    let msgAt = null;
    if (!total) { const mb = Math.min(1, nb - 1); msgAt = { x: Math.max(ends[mb], spans[mb][0] + 14 * u) + 72 * u, y: beams[mb] + 24 * u }; ends[mb] = msgAt.x + 82 * u; }
    // the old colony sleeps in the dark at the free ends of the beams, so the belfry is never empty
    const looks = PP.data.bats;
    for (let b = 0; b < nb; b++) {
      const f0 = ends[b] + 10 * u, f1 = spans[b][1] - 8 * u, n = Math.min(b === 0 ? 2 : 3, Math.floor((f1 - f0) / (44 * u)));
      for (let k = 0; k < n; k++) slots.push({ kind: 'elder', x: f1 - 14 * u - k * 44 * u, y: beams[b], beam: b, ph: rnd.range(0, 6), a: 0, v: 0, lit: 0, st: 0, look: R.shadowLook(looks[(b * 3 + k) % looks.length].look), sc: rnd.range(0.85, 1) });
    }
    return { moreAt, msgAt, groups, beams, spans, slots, x0, x1, land, wx, wy, ww, wh, K, more, total, low, rope };
  }
  RO.invalidate = () => { cache = null; S.flier = null; S.calls.length = 0; };

  // pups brought home since the roost was last seen fly in through the window, one after another, to their places
  // on the beams (the owner, 15 October: "the rescued bats could appear gradually as the player progresses").
  // What has been shown is kept in the profile (seen.roost), so each pup arrives once; at most eight fly in.
  const slotOf = (Lo, a) => { for (const g of Lo.groups) if (g.id === a.gid) return g.slots ? g.slots[a.k] || null : null; return null; };
  function arrivals(Lo) {
    const p = PP.profile.get(), seen = p.seen.roost;
    // an older save: what hangs there now is what it has seen
    if (!seen) { p.seen.roost = Object.assign({}, p.roost); PP.profile.save(); return; }
    const fresh = [];
    for (const g of Lo.groups) {
      const was = seen[g.id] || 0;
      if (g.n > was && g.slots) for (let k = was; k < g.n && k < g.slots.length; k++) fresh.push({ gid: g.id, k });
    }
    let changed = false;
    for (const id in p.roost) if ((seen[id] || 0) !== p.roost[id]) changed = true;
    if (!changed) return;
    fresh.splice(0, Math.max(0, fresh.length - 8));
    fresh.forEach((a, i) => { a.T = -0.9 - i * 0.5; a.dur = 1.8; a.side = rnd.chance(0.5) ? 1 : -1; S.arr.push(a); });
    p.seen.roost = Object.assign({}, p.roost);
    PP.profile.save();
  }

  // a ring of sound from (x, y): teal for a chirp (it lights what it touches, and the pups it reaches answer),
  // pink for a pup's call
  function ring(x, y, kind, max) { S.rings.push({ x, y, kind, r: 0, max: max || 260 * R.u, hit: new Set() }); if (S.rings.length > 14) S.rings.shift(); }
  function pupCall(s, delay, loud) { S.calls.push({ s, at: S.last + delay, loud }); }
  const sfx = (name, o) => { try { PP.uiSfx(name, o); } catch (e) { /* audio not ready */ } };

  // one of your bats drops from the beam, flies a lap of the belfry and hangs back up
  function fly(s, w, h, u, loud) {
    if (S.flier || !s) return;
    const dir = s.x < w / 2 ? 1 : -1;
    S.flier = { s, T: 0, dur: 4.6, dx: dir * Math.min(w * 0.36, 260 * u), dy: Math.min(h * 0.26, 210 * u), loud, chirped: false, x: s.x, y: s.y };
    if (loud) sfx('swoop', { vol: 0.35 });
  }

  function step(dt, Lo, w, h, u) {
    S.boost = Math.max(0, S.boost - dt * 0.4);
    // the bell rope swings back; the colony below circles, faster for a while when startled
    S.ropeV += (-14 * S.ropeA - 1.1 * S.ropeV) * dt; S.ropeA += S.ropeV * dt;
    S.colT += dt * (0.32 + S.scatter * 1.1); S.scatter = Math.max(0, S.scatter - dt * 0.3);
    // pendulums: every hanging thing swings back to rest
    for (const s of Lo.slots) {
      s.v += (-38 * s.a - 2.6 * s.v) * dt; s.a += s.v * dt;
      if (s.a > 0.9) s.a = 0.9; else if (s.a < -0.9) s.a = -0.9;
      s.lit = Math.max(0, s.lit - dt * 0.9);
      if (s.st > 0) s.st = Math.max(0, s.st - dt);
    }
    // rings spread; a chirp lights what it reaches, and the pups it reaches call back
    let answers = 0;
    for (let i = S.rings.length - 1; i >= 0; i--) {
      const g = S.rings[i], r0 = g.r;
      g.r += (g.kind === 'chirp' ? 330 : g.kind === 'toll' ? 420 : 190) * u * dt;
      if (g.r > g.max) { S.rings.splice(i, 1); continue; }
      for (const s of Lo.slots) {
        if (g.hit.has(s)) continue;
        const d = Math.hypot(s.x - g.x, s.y + 14 * u - g.y);
        if (d < r0 || d > g.r) continue;
        g.hit.add(s);
        const push = (s.x >= g.x ? 1 : -1) * (g.kind === 'chirp' ? 1.6 : g.kind === 'toll' ? 2.2 : 0.6) * Math.max(0.25, 1 - d / g.max);
        s.v += push;
        if (g.kind === 'toll' && s.kind === 'elder') s.lit = 1;
        if (g.kind === 'chirp') { s.lit = 1; if (s.kind === 'pup' && answers < 6 && rnd.chance(0.5)) { answers++; pupCall(s, 0.25 + rnd.range(0, 0.6), answers <= 2 && g.loud); } }
      }
    }
    for (let i = S.calls.length - 1; i >= 0; i--) {
      const c = S.calls[i];
      if (S.last < c.at) continue;
      S.calls.splice(i, 1);
      c.s.v += rnd.range(-1.2, 1.2); c.s.lit = Math.max(c.s.lit, 0.5);
      ring(c.s.x, c.s.y + 14 * u, 'call', 70 * u);
      if (c.loud) sfx('squeak', { pitch: 9 + rnd.range(0, 4), vol: 0.22 });
    }
    // now and then: a pup calls, a bat stretches, a bat flies a lap
    const bats = Lo.slots.filter(s => s.kind === 'bat'), pups = Lo.slots.filter(s => s.kind === 'pup');
    if ((S.nextCall -= dt) <= 0) { S.nextCall = rnd.range(4, 9); if (pups.length) { const s = pups[rnd.int(0, pups.length - 1)]; pupCall(s, 0, false); for (const o of s.g.slots) if (o !== s && rnd.chance(0.5)) pupCall(o, rnd.range(0.4, 1.1), false); } }
    if ((S.nextStretch -= dt) <= 0) { const el = Lo.slots.filter(o => o.kind === 'elder'); if (el.length && rnd.chance(0.5)) el[rnd.int(0, el.length - 1)].v += rnd.range(-0.9, 0.9); S.nextStretch = rnd.range(7, 14); const s = bats[rnd.int(0, Math.max(0, bats.length - 1))]; if (s && (!S.flier || S.flier.s !== s)) s.st = 1.8; }
    if ((S.nextFly -= dt) <= 0) { S.nextFly = rnd.range(16, 28); if (bats.length) fly(bats[rnd.int(0, bats.length - 1)], w, h, u, false); }
    // the bat on the wing
    const F = S.flier;
    if (F) {
      F.T += dt;
      const k = F.T / F.dur;
      if (k >= 1) { F.s.v += 1.2; S.flier = null; }
      else {
        F.x = F.s.x + F.dx * Math.sin(TAU * k) * Math.min(1, k * 4);
        F.y = F.s.y + 20 * u + F.dy * Math.pow(Math.sin(Math.PI * k), 0.75);
        if (!F.chirped && k > 0.42) { F.chirped = true; ring(F.x, F.y, 'chirp', 300 * u); S.rings[S.rings.length - 1].loud = F.loud; if (F.loud) sfx('chirp', { vol: 0.3 }); }
        for (const m of S.moths) if (!m.gone && Math.hypot(m.x - F.x, m.y - F.y) < 24 * u) { m.gone = 5 + rnd.range(0, 4); m.pop = 0.5; if (F.loud) sfx('crunch', { vol: 0.25 }); }
      }
    }
    // moths round the light, and dust turning in it
    for (const m of S.moths) {
      if (m.gone) { m.gone = Math.max(0, m.gone - dt); m.pop = Math.max(0, m.pop - dt); if (!m.gone) { m.x = Lo.wx + rnd.range(-40, 40) * u; m.y = Lo.wy + Lo.wh + 30 * u; } continue; }
      m.ph += dt * m.sp;
      const hx = Lo.wx + Math.sin(m.ph) * m.ax + Math.sin(m.ph * 2.3 + m.o) * 12 * u, hy = Lo.wy + Lo.wh * 0.85 + Math.sin(m.ph * 1.7 + m.o) * m.ay + 30 * u;
      m.vx += ((hx - m.x) * 3 - m.vx * 1.6) * dt; m.vy += ((hy - m.y) * 3 - m.vy * 1.6) * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
    }
    const M = S.motes;
    for (let i = 0; i < NM; i++) {
      M.x[i] += (M.vx[i] + Math.sin(S.last * 0.3 + i) * 3 * u) * dt; M.y[i] += M.vy[i] * dt;
      if (M.y[i] > h + 4) { M.y[i] = -4; M.x[i] = rnd.range(0, w); }
      if (M.x[i] < -4) M.x[i] = w + 4; else if (M.x[i] > w + 4) M.x[i] = -4;
    }
    // pups flying in; each squeaks as it lands, and its group answers
    for (let i = S.arr.length - 1; i >= 0; i--) {
      const a = S.arr[i];
      a.T += dt;
      if (a.T < a.dur) continue;
      S.arr.splice(i, 1);
      const s = slotOf(Lo, a);
      if (!s) continue;
      s.v += 1.4; s.lit = 0.7;
      ring(s.x, s.y + 14 * u, 'call', 80 * u);
      sfx('squeak', { pitch: 10 + rnd.range(0, 3), vol: 0.12 });
      for (const o of s.g.slots) if (o !== s && !S.arr.some(b => slotOf(Lo, b) === o)) pupCall(o, rnd.range(0.2, 0.7), false);
    }
    // the Long Rain gets in: now and then a drop gathers under a beam, falls, and rings out on the floor below
    if ((S.nextDrip -= dt) <= 0) {
      S.nextDrip = rnd.range(1.8, 4.2);
      const bi = rnd.int(0, Lo.beams.length - 1), sp = Lo.spans[bi], floor = Lo.low.h > 50 * u ? Lo.low.y1 - rnd.range(6, 22) * u : Lo.K.menu.y0 - 6 * u;
      S.drips.push({ x: rnd.range(sp[0] + 20 * u, sp[1] - 20 * u), y: Lo.beams[bi] + 3 * u, vy: 0, hang: rnd.range(0.5, 1.1), floor, splash: 0 });
    }
    for (let i = S.drips.length - 1; i >= 0; i--) {
      const d = S.drips[i];
      if (d.splash > 0) { d.splash += dt; if (d.splash > 1.1) S.drips.splice(i, 1); continue; }
      if (d.hang > 0) { d.hang -= dt; continue; }
      d.vy += 900 * u * dt; d.y += d.vy * dt;
      if (d.y >= d.floor) { d.y = d.floor; d.splash = 1e-3; }
    }
    // wild bats crossing the moon outside
    if ((S.nextWild -= dt) <= 0) {
      S.nextWild = rnd.range(5, 11);
      const dir = rnd.chance(0.5) ? 1 : -1, n = rnd.int(1, 3);
      for (let i = 0; i < n; i++) S.wild.push({ x: Lo.wx - dir * (Lo.ww * 0.7 + i * 16 * u), y: Lo.wy + Lo.wh * rnd.range(0.2, 0.55), dir, sp: rnd.range(40, 70) * u, ph: rnd.range(0, 6), s: rnd.range(0.35, 0.6) });
    }
    for (let i = S.wild.length - 1; i >= 0; i--) { const b = S.wild[i]; b.x += b.dir * b.sp * dt; b.y += Math.sin(S.last * 3 + b.ph) * 6 * u * dt; if (Math.abs(b.x - Lo.wx) > Lo.ww + 60 * u) S.wild.splice(i, 1); }
  }

  RO.tap = function (x, y) {
    const Lo = cache;
    if (!Lo) return;
    const u = R.u, w = Lo.K.w, h = Lo.K.h;
    S.tapped = true;
    for (const m of S.moths) if (!m.gone && Math.hypot(m.x - x, m.y - y) < 30 * u) { const a = Math.atan2(m.y - y, m.x - x) + rnd.range(-0.6, 0.6); m.vx += Math.cos(a) * 420 * u; m.vy += Math.sin(a) * 420 * u; sfx('tick', { vol: 0.25 }); return; }
    // the bell rope: pull it and the bell above tolls through the whole belfry
    if (Lo.rope) {
      const R0 = Lo.rope, a = S.ropeA, ex = R0.x + Math.sin(a) * R0.len, ey = R0.y0 + Math.cos(a) * R0.len, mx = R0.x + Math.sin(a) * R0.len * 0.5, my = R0.y0 + R0.len * 0.5;
      const t2 = Math.max(0, Math.min(1, ((x - mx) * (ex - mx) + (y - my) * (ey - my)) / ((ex - mx) ** 2 + (ey - my) ** 2 || 1)));
      if (Math.hypot(x - (mx + (ex - mx) * t2), y - (my + (ey - my) * t2)) < 22 * u) {
        S.ropeV += 2.4; S.scatter = 1;
        ring(w / 2, Lo.K.top.y1 + 10 * u, 'toll', h); S.rings[S.rings.length - 1].loud = true;
        sfx('ring', { vol: 0.35 });
        return;
      }
    }
    // the colony circling below scatters, chittering
    for (const c of S.col) if (Math.hypot(c.x - x, c.y - y) < 26 * u) { S.scatter = 1; sfx('squeak', { pitch: 8, vol: 0.25 }); setTimeout(() => sfx('squeak', { pitch: 10, vol: 0.18 }), 110); ring(c.x, c.y, 'call', 70 * u); return; }
    let best = null, bd = 1e9;
    for (const s of Lo.slots) {
      if (S.flier && S.flier.s === s) continue;
      const big = s.kind !== 'pup', cy = s.y + (big ? 20 : 13) * u, d = Math.hypot(s.x - x, cy - y), r = (big ? 26 : 15) * u;
      if (d < r && d < bd) { bd = d; best = s; }
    }
    if (best && best.kind === 'bat') { fly(best, w, h, u, true); return; }
    // an elder of the old colony wakes, grumbles and settles again
    if (best && best.kind === 'elder') { best.v += (x < best.x ? 1 : -1) * 1.8; best.lit = 1; sfx('squeak', { pitch: 2, vol: 0.2 }); return; }
    if (best) {
      best.v += (x < best.x ? 1 : -1) * 2.4; best.lit = 1;
      ring(best.x, best.y + 14 * u, 'call', 90 * u);
      sfx('squeak', { pitch: 10 + rnd.range(0, 3), vol: 0.32 });
      let d = 0.3;
      for (const o of best.g.slots) if (o !== best) { pupCall(o, d, d < 0.8); d += rnd.range(0.12, 0.3); }
      return;
    }
    // the window: the clouds part, and more bats cross the moon
    if (Math.abs(x - Lo.wx) < Lo.ww / 2 && y > Lo.wy && y < Lo.wy + Lo.wh) { S.boost = 1; S.nextWild = 0; sfx('chime', { vol: 0.2 }); return; }
    // anywhere else: a chirp
    ring(x, y, 'chirp', Math.max(w, h) * 0.55);
    S.rings[S.rings.length - 1].loud = true;
    sfx('chirp', { vol: 0.32 });
  };

  // the bell rope: a long rope from the lowest beam with a striped woollen grip (the sally) and a knot at the end
  function drawRope(ctx, R0, now, u, lit) {
    const a = S.ropeA + Math.sin(now * 0.9) * 0.025, L = R0.len, px = f => R0.x + Math.sin(a * f) * L * f, py = f => R0.y0 + Math.cos(a * f) * L * f;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 3.4 * u;
    ctx.beginPath(); ctx.moveTo(R0.x, R0.y0); for (let f = 0.1; f <= 1.001; f += 0.1) ctx.lineTo(px(f), py(f)); ctx.stroke();
    ctx.strokeStyle = '#7a5c3a'; ctx.lineWidth = 1.8 * u;
    ctx.beginPath(); ctx.moveTo(R0.x, R0.y0); for (let f = 0.1; f <= 1.001; f += 0.1) ctx.lineTo(px(f), py(f)); ctx.stroke();
    // the sally: red, cream and blue bands of wool
    const cols = ['#9a2f35', '#e2d2ae', '#2d4785'];
    ctx.lineCap = 'butt'; ctx.lineWidth = 6.5 * u;
    for (let i = 0; i < 9; i++) {
      const f0 = 0.6 + i * 0.03, f1 = f0 + 0.03;
      ctx.strokeStyle = cols[i % 3];
      ctx.beginPath(); ctx.moveTo(px(f0), py(f0)); ctx.lineTo(px(f1), py(f1)); ctx.stroke();
    }
    ctx.globalAlpha = 0.25 * lit; ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 1.2 * u;
    ctx.beginPath(); ctx.moveTo(px(0.6) - 2.2 * u, py(0.6)); ctx.lineTo(px(0.87) - 2.2 * u, py(0.87)); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a4128'; ctx.beginPath(); ctx.arc(px(1), py(1), 3.4 * u, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
  }

  function drawLower(ctx, Lo, now, u, w, lit, ang, by) {
    const L = Lo.low;
    // where the moonbeam lands, a pool of light on the mist
    const fx = Lo.wx + (L.y1 - by) * Math.tan(ang) + Lo.ww * 0.3;
    ctx.save(); ctx.translate(fx, L.y1 - 8 * u); ctx.scale(1, 0.32);
    R.glow(ctx, 0, 0, Lo.ww * 1.7, PP.P.moon, 0.16 * lit);
    ctx.restore();
    for (let i = 0; i < 5; i++) {
      const span = w + 240 * u, x = ((now * (5 + i * 1.3) * u + i * span / 5) % span) - 120 * u, y = L.y1 - 16 * u - (i % 2) * 14 * u;
      R.glow(ctx, x, y, (95 + i * 9) * u, '#7d93c9', 0.06 * (0.6 + 0.4 * lit));
    }
    // the colony, circling the lower belfry (nearer when lower: bigger and brighter), lit as it crosses the moonbeam
    S.col.length = 0;
    if (L.h > 70 * u) {
      const cx = w / 2, cy = L.y0 + L.h * 0.4, rx = w * 0.3, ry = Math.min(L.h * 0.24, 46 * u), looks = PP.data.bats;
      // the colony grows with the pups brought home: five at first, up to thirteen
      const nc = Math.min(13, 5 + Math.floor(Lo.total / 4));
      for (let i = 0; i < nc; i++) {
        const th = S.colT + i * 0.31 + (i % 2) * 0.05, sn = Math.sin(th), d = (sn + 1) / 2;
        const x = cx + Math.cos(th) * rx, y = cy + sn * ry + Math.sin(now * 2.6 + i) * 3 * u;
        const beam = Lo.wx + (y - by) * Math.tan(ang) + Lo.ww * 0.3, inBeam = Math.abs(x - beam) < Lo.ww;
        S.col.push({ x, y });
        // far off in the dark: small, dim, nearly silhouettes until the moonbeam catches them
        ctx.globalAlpha = (0.3 + 0.32 * d) * (inBeam ? 1.4 : 1);
        R.drawBat(ctx, { x, y, vx: -sn * 400, face: sn > 0 ? -1 : 1, flap: now * (13 + i) + i, glide: 0, blink: 1, rim: inBeam ? 0.8 * lit : 0.05 }, now, (0.36 + 0.2 * d) * u, inBeam ? looks[(i + 1) % looks.length].look : R.shadowLook(looks[(i + 1) % looks.length].look), { glow: false, still: true });
        ctx.globalAlpha = 1;
      }
    }
    // fireflies rising slowly through the dark
    ctx.fillStyle = '#e9ffb0';
    for (let i = 0; i < 7; i++) {
      const xb = w * (0.08 + 0.84 * ((i * 0.377) % 1)), x = xb + Math.sin(now * 0.45 + i * 1.3) * 24 * u, y = L.y1 - ((now * 7 * u + i * 41 * u) % Math.max(1, L.h));
      const a = Math.max(0, Math.sin(now * 2.1 + i * 2.3));
      if (a < 0.05) continue;
      R.glow(ctx, x, y, 10 * u, '#c8ff6a', 0.4 * a);
      ctx.globalAlpha = a; ctx.fillRect(x - u, y - u, 2 * u, 2 * u); ctx.globalAlpha = 1;
    }
  }

  RO.draw = function (ctx, w, h, t, k) {
    const u = R.u, p = PP.profile.get(), now = performance.now() / 1000;
    const ver = p.stats.pups + p.bats.owned.length * 100 + p.bats.owned.indexOf(p.bats.selected) * 10000;
    if (!cache || cache.w !== w || cache.h !== h || cache.v !== ver || (!cache.settled && now - cache.t0 > 0.7)) {
      const settled = !!cache && cache.w === w && cache.h === h && cache.v === ver;
      const old = cache;
      cache = Object.assign(layout(ctx, w, h, u), { w, h, v: ver, t0: old && settled ? old.t0 : now, settled });
      arrivals(cache);
      // keep the swing of anything still hanging in the same place
      if (old && settled) for (let i = 0; i < Math.min(old.slots.length, cache.slots.length); i++) { cache.slots[i].a = old.slots[i].a; cache.slots[i].v = old.slots[i].v; }
      if (S.flier) { const i = old ? old.slots.indexOf(S.flier.s) : -1; S.flier.s = settled && i >= 0 ? cache.slots[i] : null; if (!S.flier.s) S.flier = null; }
      S.calls.length = 0;
      if (!S.motes || S.motes.w !== w || S.motes.h !== h) {
        S.motes = { x: new Float32Array(NM), y: new Float32Array(NM), vx: new Float32Array(NM), vy: new Float32Array(NM), s: new Float32Array(NM), w, h };
        for (let i = 0; i < NM; i++) { S.motes.x[i] = rnd.range(0, w); S.motes.y[i] = rnd.range(0, h); S.motes.vx[i] = rnd.range(-4, 4) * u; S.motes.vy[i] = rnd.range(3, 11) * u; S.motes.s[i] = rnd.range(0.8, 2.2) * u; }
      }
      if (S.moths.length !== 3) { S.moths.length = 0; for (let i = 0; i < 3; i++) S.moths.push({ x: cache.wx, y: cache.wy + cache.wh, vx: 0, vy: 0, ph: rnd.range(0, 6), sp: rnd.range(0.7, 1.2), o: rnd.range(0, 6), ax: rnd.range(30, 60) * u, ay: rnd.range(18, 40) * u, gone: 0, pop: 0 }); }
      if (!old) S.shown = now;
    }
    const Lo = cache;
    let dt = now - S.last;
    S.last = now;
    if (!(dt > 0) || dt > 0.1) dt = dt > 0.1 && dt < 1 ? 0.1 : 0;
    step(dt, Lo, w, h, u);
    R.ppu = k;

    // the moon's light: clouds drift across it, so the light comes and goes; tap the window to part them
    const cl = 0.5 + 0.5 * Math.sin(now * 0.11), cover = Math.max(0, Math.sin(now * 0.11 + 1.3)) * 0.45 * (1 - S.boost);
    const lit = Math.max(0.35, (1 - cover) * (0.92 + 0.08 * Math.sin(now * 0.37))) + S.boost * 0.35;

    // walls of the belfry
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1124'); g.addColorStop(0.5, '#070a16'); g.addColorStop(1, '#030409');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,180,220,0.035)'; ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    for (let y = 0, row = 0; y < h; y += 26 * u, row++) { ctx.moveTo(0, y); ctx.lineTo(w, y); for (let x = (row % 2) * 30 * u; x < w; x += 60 * u) { ctx.moveTo(x, y); ctx.lineTo(x, y + 26 * u); } }
    ctx.stroke();
    // moonlight washing the wall round the window, breathing with the clouds
    R.glow(ctx, Lo.wx, Lo.wy + Lo.wh * 0.5, Math.max(Lo.wh * 1.6, 220 * u), PP.P.moon, 0.13 * lit);

    // the tall window: sky, the moon, clouds over it, wild bats crossing
    const wx = Lo.wx, wy = Lo.wy, ww = Lo.ww, wh = Lo.wh;
    const arch = () => { ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); };
    ctx.save();
    arch();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#0d1d46'); sky.addColorStop(1, '#2c4a86');
    ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 10; s++) { ctx.globalAlpha = (0.3 + 0.4 * Math.sin(now * 1.5 + s * 2)) * (1 - cover * 0.8); ctx.fillRect(wx - ww / 2 + ((s * 37) % ww), wy + ((s * 53) % (wh * 0.8)), Math.max(1.2, u), Math.max(1.2, u)); }
    ctx.globalAlpha = 1;
    const mx = wx + ww * 0.08, my = wy + Math.min(wh * 0.3, ww * 0.9);
    Kit.gfx.blit(ctx, R.moonSprite(), mx, my, Math.min(ww, 110 * u) / 230);
    R.glow(ctx, mx, my, ww * 0.9, PP.P.moon, 0.25 * lit);
    // clouds: soft dark banks drifting past
    for (let c = 0; c < 3; c++) {
      const span = ww + 160 * u, cx = wx - span / 2 + ((now * (7 + c * 3) * u + c * span / 3) % span), cy = my + (c - 1) * 22 * u + Math.sin(now * 0.2 + c) * 6 * u;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46 * u);
      cg.addColorStop(0, 'rgba(10,18,40,' + (0.75 * (0.6 + 0.4 * cl)).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(10,18,40,0)');
      ctx.fillStyle = cg; ctx.fillRect(cx - 46 * u, cy - 46 * u, 92 * u, 92 * u);
    }
    // the Long Rain, falling past the glass
    ctx.strokeStyle = 'rgba(190,214,255,0.16)'; ctx.lineWidth = Math.max(1, 0.8 * u);
    ctx.beginPath();
    for (let r = 0; r < 16; r++) {
      const rx = wx - ww / 2 + ((r * 41.3 + now * 26 * u) % (ww + 30 * u)) - 15 * u, ry = wy + (((r * 67 + now * 260) * u) % (wh + 40 * u)) - 20 * u;
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 * u, ry + 11 * u);
    }
    ctx.stroke();
    ctx.fillStyle = '#05070f';
    for (const b of S.wild) {
      const fl = Math.sin(now * 14 + b.ph), sz = 10 * u * b.s;
      ctx.beginPath(); ctx.moveTo(b.x - sz, b.y - fl * sz * 0.6); ctx.quadraticCurveTo(b.x - sz * 0.4, b.y - sz * 0.1, b.x, b.y + sz * 0.15); ctx.quadraticCurveTo(b.x + sz * 0.4, b.y - sz * 0.1, b.x + sz, b.y - fl * sz * 0.6); ctx.quadraticCurveTo(b.x, b.y + sz * 0.5, b.x - sz, b.y - fl * sz * 0.6); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#141b2e'; ctx.lineWidth = 7 * u;
    arch(); ctx.stroke();
    ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.moveTo(wx, wy + ww * 0.15); ctx.lineTo(wx, wy + wh); ctx.moveTo(wx - ww / 2, wy + wh * 0.58); ctx.lineTo(wx + ww / 2, wy + wh * 0.58); ctx.stroke();
    // the sill
    ctx.fillStyle = '#1b2236'; ctx.fillRect(wx - ww / 2 - 8 * u, wy + wh - 2 * u, ww + 16 * u, 7 * u);
    ctx.fillStyle = 'rgba(223,232,255,' + (0.18 * lit).toFixed(3) + ')'; ctx.fillRect(wx - ww / 2 - 8 * u, wy + wh - 2 * u, ww + 16 * u, Math.max(1, u));

    // the moonbeam: a shaft falling from the window, swaying a little as the clouds move
    const sway = Math.sin(now * 0.23) * 0.05, ang = 0.22 + sway, len = h - wy;
    const bx0 = wx - ww / 2, bx1 = wx + ww / 2, by = wy + wh * 0.5, fx = Math.tan(ang) * len;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createLinearGradient(0, by, 0, h);
    sg.addColorStop(0, 'rgba(190,210,255,' + (0.11 * lit).toFixed(3) + ')'); sg.addColorStop(0.55, 'rgba(190,210,255,' + (0.045 * lit).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(190,210,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.lineTo(bx1 + fx + ww * 0.9, h); ctx.lineTo(bx0 + fx - ww * 0.3, h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(wx - ww * 0.15, by); ctx.lineTo(wx + ww * 0.15, by); ctx.lineTo(wx + fx * 1.05 + ww * 0.35, h); ctx.lineTo(wx + fx * 1.05 - ww * 0.1, h); ctx.closePath(); ctx.fill();
    ctx.restore();

    // beams, with iron hooks
    for (let i = 0; i < Lo.beams.length; i++) {
      const y = Lo.beams[i], bh = 12 * u;
      const bg = ctx.createLinearGradient(0, y - bh, 0, y + bh * 0.4);
      bg.addColorStop(0, '#3a2a20'); bg.addColorStop(0.6, '#24180f'); bg.addColorStop(1, '#120c08');
      ctx.fillStyle = bg; ctx.fillRect(0, y - bh, w, bh * 1.4);
      ctx.fillStyle = 'rgba(223,232,255,' + (0.05 + 0.05 * lit).toFixed(3) + ')'; ctx.fillRect(0, y - bh, w, Math.max(1, u * 1.5));
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, u);
      ctx.beginPath(); for (let x = (i * 70) % 140; x < w; x += 140 * u) { ctx.moveTo(x, y - bh * 0.6); ctx.quadraticCurveTo(x + 30 * u, y - bh * 0.3, x + 60 * u, y - bh * 0.7); } ctx.stroke();
      // a lantern on the top beam, warm against the moon, flickering
      if (i === 0) {
        const lx = Lo.x0 + 14 * u, ly = y + 26 * u, fl = 0.8 + 0.12 * Math.sin(now * 9.1) + 0.08 * Math.sin(now * 23.7 + 1);
        ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(lx, y + 2 * u); ctx.lineTo(lx, ly - 8 * u); ctx.stroke();
        R.glow(ctx, lx, ly, 70 * u, PP.P.warm, 0.2 * fl);
        R.glow(ctx, lx, ly, 18 * u, PP.P.warm, 0.6 * fl);
        ctx.fillStyle = '#1a1410'; ctx.fillRect(lx - 6 * u, ly - 9 * u, 12 * u, 3 * u); ctx.fillRect(lx - 5 * u, ly + 6 * u, 10 * u, 3 * u);
        ctx.fillStyle = 'rgba(255,200,120,' + (0.55 + 0.3 * fl).toFixed(3) + ')'; ctx.fillRect(lx - 4 * u, ly - 6 * u, 8 * u, 12 * u);
      }
    }
    if (Lo.rope) drawRope(ctx, Lo.rope, now, u, lit);
    // pups and bats hanging upside down, each on its own pendulum (a pup still flying in is drawn on the wing below)
    let arrBy = null;
    if (S.arr.length) { arrBy = new Map(); for (const a of S.arr) { const s2 = slotOf(Lo, a); if (s2) arrBy.set(s2, a); } }
    for (const s of Lo.slots) {
      if (S.flier && S.flier.s === s) continue;
      if (arrBy && arrBy.has(s)) continue;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a + Math.sin(now * 1.3 + s.ph) * 0.03);
      if (s.kind === 'pup') {
        if (s.lit > 0) R.glow(ctx, 0, 14 * u, 26 * u, PP.P.teal, 0.55 * s.lit);
        R.glow(ctx, 0, 16 * u, 16 * u, PP.P.pink, 0.08 + 0.05 * Math.sin(now * 2 + s.ph));
        R.drawPup(ctx, 0, 12 * u, now * 0.6 + s.ph, 0, 1.15 * u);
      } else if (s.kind === 'elder') {
        // asleep in the dark, eyes shut, until a sound reaches them
        if (s.lit > 0) R.glow(ctx, 0, 22 * u, 34 * u, PP.P.teal, 0.3 * s.lit);
        ctx.translate(0, 19 * u * s.sc); ctx.rotate(Math.PI);
        ctx.globalAlpha = 0.9;
        R.drawBat(ctx, { x: 0, y: 0, face: s.x > Lo.wx ? -1 : 1, flap: 0, glide: 0, blink: s.lit > 0.15 ? 1 : -1, rim: 0.12 + s.lit * 0.6 }, now, 1.05 * u * s.sc, s.look, { glow: false, folded: true, still: true });
        ctx.globalAlpha = 1;
      } else {
        const bat = PP.batById(s.id), sel = p.bats.selected === s.id;
        if (sel) R.glow(ctx, 0, 24 * u, 40 * u, PP.P.warm, 0.22);
        if (s.lit > 0) R.glow(ctx, 0, 22 * u, 38 * u, PP.P.teal, 0.45 * s.lit);
        ctx.translate(0, 20 * u); ctx.rotate(Math.PI);
        const st = s.st > 0 ? Math.sin(Math.PI * (1 - s.st / 1.8)) : 0;
        const b = { x: 0, y: 0, face: 1, flap: 0, glide: 0, blink: Math.sin(now * 0.7 + s.x) > 0.97 ? -1 : 1, rim: Math.max(sel ? 0.5 : 0, s.lit) };
        if (st > 0.05) { b.wa = -0.1 + 0.7 * st; b.ws = 0.55 + 0.4 * st; R.drawBat(ctx, b, now, 1.15 * u, bat.look, { glow: false, still: true }); }
        else R.drawBat(ctx, b, now, 1.15 * u, bat.look, { glow: false, folded: true, still: true });
      }
      ctx.restore();
    }
    // names of the caves the pups came from
    for (const gq of Lo.groups) {
      if (gq.cx === undefined) continue;
      Kit.gfx.text(ctx, gq.name + (gq.n > 1 ? ' ×' + gq.n : ''), gq.cx, Lo.beams[gq.beam] + 40 * u, { size: 8.5 * u, weight: 600, font: 'body', color: 'rgba(255,190,220,0.42)' });
    }
    if (Lo.moreAt) Kit.gfx.text(ctx, '+' + Lo.more + ' more in the Journal', Lo.moreAt.x, Lo.moreAt.y, { size: 8.5 * u, weight: 600, font: 'body', color: 'rgba(255,190,220,0.34)' });
    if (Lo.msgAt) {
      Kit.gfx.text(ctx, 'Bring the lost pups home,', Lo.msgAt.x, Lo.msgAt.y, { size: 10 * u, weight: 600, font: 'body', color: 'rgba(255,190,220,0.5)' });
      Kit.gfx.text(ctx, 'and they will hang here.', Lo.msgAt.x, Lo.msgAt.y + 13 * u, { size: 10 * u, weight: 600, font: 'body', color: 'rgba(255,190,220,0.5)' });
    }
    // the lower belfry: moonlit mist on the floor, the colony circling, fireflies rising
    if (Lo.low.h > 50 * u) drawLower(ctx, Lo, now, u, w, lit, ang, by);
    // drops of rain, catching the moon where they cross its beam, and their rings on the floor
    for (const d of S.drips) {
      const beam = wx + (d.y - by) * Math.tan(ang) + ww * 0.3, shine = d.y > by && Math.abs(d.x - beam) < ww ? 1 : 0.45;
      if (d.splash > 0) {
        const k2 = d.splash / 1.1, a = (1 - k2) * 0.5 * shine;
        ctx.globalAlpha = a; ctx.strokeStyle = '#bcd6ff'; ctx.lineWidth = Math.max(1, u);
        ctx.beginPath(); ctx.ellipse(d.x, d.y, (3 + 16 * k2) * u, (1 + 4 * k2) * u, 0, 0, TAU); ctx.stroke();
        if (k2 < 0.35) { ctx.fillStyle = '#dfe8ff'; const j = k2 / 0.35; ctx.fillRect(d.x - 5 * j * u, d.y - 7 * Math.sin(Math.PI * j) * u, 1.5 * u, 1.5 * u); ctx.fillRect(d.x + 4 * j * u, d.y - 6 * Math.sin(Math.PI * j) * u, 1.5 * u, 1.5 * u); }
        ctx.globalAlpha = 1;
        continue;
      }
      const sw = d.hang > 0 ? Math.max(0.3, 1 - d.hang) : 1;
      R.glow(ctx, d.x, d.y, 7 * u, '#9fc2ff', 0.3 * shine);
      ctx.globalAlpha = 0.8 * shine; ctx.fillStyle = '#d8e6ff';
      ctx.beginPath(); ctx.ellipse(d.x, d.y + 1.5 * u * sw, 1.4 * u * sw, (d.hang > 0 ? 1.8 : 2.8) * u * sw, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // pups flying in from the window, with a pink trail, turning over to hang as they reach their beam
    if (arrBy) for (const [s, a] of arrBy) {
      if (a.T < 0) continue;
      const k2 = Math.min(1, a.T / a.dur), e = k2 * k2 * (3 - 2 * k2);
      const x0 = wx + a.side * ww * 0.2, y0 = wy + wh * 0.62, x1 = s.x, y1 = s.y + 12 * u, cx = (x0 + x1) / 2, cy = Math.max(y0, y1) + 60 * u;
      const at = q => { const m = 1 - q; return [m * m * x0 + 2 * m * q * cx + q * q * x1, m * m * y0 + 2 * m * q * cy + q * q * y1]; };
      const [px, py] = at(e);
      for (let j = 1; j <= 6; j++) { const [tx, ty] = at(Math.max(0, e - j * 0.035)); ctx.globalAlpha = (1 - j / 7) * 0.45 * (1 - k2 * 0.6); ctx.fillStyle = PP.P.pink; ctx.fillRect(tx - u, ty - u, 2 * u, 2 * u); }
      ctx.globalAlpha = 1;
      R.glow(ctx, px, py, 24 * u, PP.P.pink, 0.4 * (1 - k2 * 0.5));
      const flip = k2 < 0.78 ? 1 : 1 - (k2 - 0.78) / 0.22, bob = k2 < 0.78 ? Math.sin(now * 28 + s.ph) * 1.5 * u : 0;
      R.drawPup(ctx, px, py + bob, now * 3 + s.ph, flip, 1.15 * u);
    }

    // moths round the light
    for (const m of S.moths) {
      if (m.gone) { if (m.pop > 0) R.glow(ctx, m.x, m.y, 26 * u * (1.5 - m.pop), PP.P.warm, m.pop); continue; }
      const fl = Math.abs(Math.sin(now * 26 + m.o)), sz = 4.2 * u;
      R.glow(ctx, m.x, m.y, 14 * u, PP.P.warm, 0.3);
      ctx.fillStyle = '#ffe2a8';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - sz, m.y - sz * fl); ctx.lineTo(m.x - sz * 0.8, m.y + sz * 0.5); ctx.closePath();
      ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + sz, m.y - sz * fl); ctx.lineTo(m.x + sz * 0.8, m.y + sz * 0.5); ctx.closePath(); ctx.fill();
    }
    // the bat on the wing
    const F = S.flier;
    if (F && F.T > 0) {
      const kk = F.T / F.dur, vx = F.dx * TAU / F.dur * Math.cos(TAU * kk), flip = kk < 0.1 ? 1 - kk / 0.1 : kk > 0.9 ? (kk - 0.9) / 0.1 : 0;
      const bat = PP.batById(F.s.id);
      R.glow(ctx, F.x, F.y, 50 * u, PP.P.warm, 0.18);
      ctx.save(); ctx.translate(F.x, F.y); ctx.rotate(Math.PI * flip);
      R.drawBat(ctx, { x: 0, y: 0, vx, face: vx >= 0 ? 1 : -1, flap: now * 15, glide: 0, blink: 1, rim: 0.3 }, now, 1.25 * u, bat.look, { glow: false, still: true });
      ctx.restore();
    }
    // rings of sound: a chirp drawn as echo dots, a pup's call as a soft pink ring
    for (const gr of S.rings) {
      const a = 1 - gr.r / gr.max;
      if (gr.kind === 'chirp') {
        ctx.fillStyle = PP.P.teal;
        const n = Math.max(24, Math.min(110, Math.round(gr.r / (6 * u)))), d = Math.max(2, 3 * u);
        for (let i = 0; i < n; i++) { const an = i / n * TAU + gr.x * 0.01; ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(i * 2.7)); ctx.fillRect(gr.x + Math.cos(an) * gr.r - d / 2, gr.y + Math.sin(an) * gr.r - d / 2, d, d); }
        R.glow(ctx, gr.x, gr.y, Math.min(gr.r * 0.6, 80 * u), PP.P.teal, 0.25 * a * a);
        ctx.globalAlpha = a * 0.3; ctx.strokeStyle = PP.P.teal; ctx.lineWidth = Math.max(1, 1.5 * u); ctx.beginPath(); ctx.arc(gr.x, gr.y, gr.r, 0, TAU); ctx.stroke();
      } else if (gr.kind === 'toll') {
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = Math.max(1.5, 3 * u); ctx.beginPath(); ctx.arc(gr.x, gr.y, gr.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = a * 0.2; ctx.lineWidth = Math.max(1, 1.2 * u); ctx.beginPath(); ctx.arc(gr.x, gr.y, gr.r * 0.9, 0, TAU); ctx.stroke();
      } else {
        ctx.globalAlpha = a * 0.55; ctx.strokeStyle = PP.P.pink; ctx.lineWidth = Math.max(1, 1.4 * u); ctx.beginPath(); ctx.arc(gr.x, gr.y, gr.r, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // dust turning in the air, brighter in the moonbeam
    const M = S.motes;
    ctx.fillStyle = '#dfe8ff';
    for (let i = 0; i < NM; i++) {
      const x = M.x[i], y = M.y[i];
      const cx = wx + (y - by) * Math.tan(ang) + ww * 0.3, inBeam = y > by && Math.abs(x - cx) < ww * 0.9 + (y - by) * 0.18;
      ctx.globalAlpha = (inBeam ? 0.55 * lit : 0.12) * (0.6 + 0.4 * Math.sin(now * 1.7 + i));
      ctx.fillRect(x, y, M.s[i], M.s[i]);
    }
    ctx.globalAlpha = 1;
    // a hint, until the first tap
    if (!S.tapped && now - S.shown > 1.2) {
      const a = Math.min(1, (now - S.shown - 1.2) / 0.8) * (0.55 + 0.25 * Math.sin(now * 2.4));
      const hy = Lo.low.h > 70 * u ? Lo.low.y1 - 12 * u : Lo.beams.length > 1 ? (Lo.beams[0] + Lo.beams[1]) / 2 + 18 * u : Math.min(Lo.K.menu.y0 - 14 * u, Lo.beams[0] + 62 * u);
      Kit.gfx.text(ctx, 'Tap the roost to chirp', w / 2, hy, { size: 10 * u, weight: 700, font: 'body', color: '#4ff0d8', alpha: a });
    }
    Kit.gfx.vignette(ctx, 0.55, '#000000');
  };

  // for tests: where to tap (an open spot, a pup, your first bat) and what is moving
  RO._dbg = function () {
    const Lo = cache, u = R.u;
    if (!Lo) return null;
    const pup = Lo.slots.find(s => s.kind === 'pup' && s.g.slots.length > 2) || Lo.slots.find(s => s.kind === 'pup'), bat = Lo.slots.find(s => s.kind === 'bat'), R0 = Lo.rope;
    return { open: { x: Lo.wx + Lo.ww, y: (Lo.beams[0] + (Lo.beams[1] || Lo.K.menu.y0)) / 2 + 20 * u }, pup: pup && { x: pup.x, y: pup.y + 13 * u }, bat: bat && { x: bat.x, y: bat.y + 20 * u }, rope: R0 && { x: R0.x + Math.sin(S.ropeA) * R0.len * 0.75, y: R0.y0 + R0.len * 0.75 }, ropeV: S.ropeV, toll: S.rings.some(g => g.kind === 'toll'), colony: S.col.length, elders: Lo.slots.filter(s => s.kind === 'elder').length, low: Lo.low, flier: !!S.flier, rings: S.rings.length, calls: S.calls.length, beams: Lo.beams.length, slots: Lo.slots.length, more: Lo.more, arriving: S.arr.length, drips: S.drips.length };
  };

  // for tests: the box each hanging thing (and its name) takes up
  RO._hang = function () {
    const Lo = cache, u = R.u;
    if (!Lo) return [];
    const out = Lo.slots.map(s => s.kind !== 'pup' ? { x0: s.x - 16 * u, x1: s.x + 16 * u, y0: s.y, y1: s.y + 46 * u } : { x0: s.x - 7 * u, x1: s.x + 7 * u, y0: s.y, y1: s.y + 24 * u });
    for (const g of Lo.groups) if (g.cx !== undefined) out.push({ x0: g.cx - 30 * u, x1: g.cx + 30 * u, y0: Lo.beams[g.beam] + 34 * u, y1: Lo.beams[g.beam] + 46 * u });
    return out;
  };

  // The Long Rain card's picture of a cave: its biome's air, stone and light, the route lit by echoes from your bat
  // to the moonlit arch, the pups waiting in it, and what lives there (water, crystal, owls, moss).
  RO.postcard = function (cv, def, batId) {
    const r = cv.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    const g = cv.getContext('2d'), w = r.width, h = r.height, pu = Math.min(h / 86, w / 280), B = PP.biome(def.biome), P = B.palette, rr = Kit.rng(PP.hashStr('pc:' + def.id));
    const ppu = R.ppu;
    R.ppu = dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, h);
    for (const [o, c] of P.sky) sky.addColorStop(o, c);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // a ridge of stone along the top or the bottom
    const ph = [rr.range(0, 6), rr.range(0, 6), rr.range(0, 6)];
    const ridge = (base, amp, top, fill, rim, sh) => {
      g.beginPath(); g.moveTo(0, top ? 0 : h);
      for (let x = 0; x <= w + 6; x += 6) { const y = base + amp * (Math.sin(x * 0.021 + ph[0] + sh) * 0.55 + Math.sin(x * 0.053 + ph[1] + sh) * 0.3 + Math.sin(x * 0.11 + ph[2]) * 0.15); g.lineTo(x, y); }
      g.lineTo(w, top ? 0 : h); g.closePath(); g.fillStyle = fill; g.fill();
      if (rim) { g.strokeStyle = rim; g.lineWidth = 1.2 * pu; g.stroke(); }
    };
    ridge(h * 0.2, h * 0.12, true, P.sil[0], null, 2);
    ridge(h * 0.82, h * 0.1, false, P.sil[1], null, 4);
    // the moonlit arch, the way out
    const ax = w * 0.86, ay = h * 0.5, aw = h * 0.36, ah = h * 0.5;
    R.glow(g, ax, ay, ah * 1.6, P.moon, 0.32);
    const ag = g.createLinearGradient(0, ay - ah / 2, 0, ay + ah / 2);
    ag.addColorStop(0, P.arch[0]); ag.addColorStop(0.6, P.arch[1]); ag.addColorStop(1, P.arch[2]);
    g.fillStyle = ag;
    g.beginPath(); g.moveTo(ax - aw / 2, ay + ah / 2); g.lineTo(ax - aw / 2, ay - ah / 2 + aw / 2); g.arc(ax, ay - ah / 2 + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw / 2, ay + ah / 2); g.closePath(); g.fill();
    Kit.gfx.blit(g, R.moonSprite(), ax + aw * 0.1, ay - ah * 0.12, aw / 330);
    // near stone
    const rg = g.createLinearGradient(0, 0, 0, h);
    rg.addColorStop(0, P.rock[0]); rg.addColorStop(0.5, P.rock[2]); rg.addColorStop(1, P.rock[1]);
    ridge(h * 0.1, h * 0.12, true, rg, P.rim, 0);
    ridge(h * 0.93, h * 0.1, false, rg, P.rim, 1.4);
    // what lives here
    const kind = def.biome;
    if (kind === 'drowned' || (def.hazards && def.hazards.river)) {
      const wy = h * 0.8, wg = g.createLinearGradient(0, wy, 0, h);
      wg.addColorStop(0, P.water[0]); wg.addColorStop(1, P.water[1]);
      g.globalAlpha = 0.9; g.fillStyle = wg; g.fillRect(0, wy, w, h - wy); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(180,220,255,0.35)'; g.lineWidth = pu;
      g.beginPath(); for (let x = 4 * pu; x < w; x += 22 * pu) { g.moveTo(x, wy + pu); g.lineTo(x + 10 * pu, wy + pu); } g.stroke();
    }
    if (kind === 'glass') for (let i = 0; i < 7; i++) {
      const x = rr.range(0.1, 0.75) * w, top = rr.chance(0.5), y = top ? h * 0.16 : h * 0.86, len = rr.range(0.12, 0.24) * h, sk = rr.range(-0.3, 0.3);
      R.glow(g, x, y + (top ? len : -len) * 0.5, len, P.accent, 0.25);
      g.fillStyle = P.accent; g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(x - 3 * pu, y); g.lineTo(x + sk * len, y + (top ? len : -len)); g.lineTo(x + 3 * pu, y); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    if (kind === 'owlstone') for (let i = 0; i < 2; i++) { const x = w * (0.42 + i * 0.2), y = h * 0.26; for (let e = -1; e <= 1; e += 2) { R.glow(g, x + e * 3.5 * pu, y, 7 * pu, '#ffb347', 0.8); g.fillStyle = '#ffd27a'; g.fillRect(x + (e * 3.5 - 1) * pu, y - pu, 2 * pu, 2 * pu); } }
    if (kind === 'chalk' || kind === 'hush') for (let i = 0; i < 14; i++) { const x = rr.range(0.05, 0.8) * w, y = h * rr.range(0.08, 0.2); R.glow(g, x, y, 5 * pu, P.glowworm, 0.7); }
    if (kind === 'hush') { g.fillStyle = 'rgba(200,200,214,0.12)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rr.range(0, w), h * 0.88, rr.range(14, 30) * pu, rr.range(4, 8) * pu, 0, 0, TAU); g.fill(); } }
    // the route, lit by echoes, from the bat into the moonlit arch, with arrows pointing the way; the lost pups wait
    // on it, each in a pink ring, so the way home passes through them (the owner, 15 October: make the relationship
    // between the pups and the destination clearer)
    const bx = w * 0.2, by = h * 0.55, ex = ax, ey = ay + ah * 0.18;
    const rx = k => bx + 16 * pu + (ex - bx - 16 * pu) * k, ry = k => by + (ey - by) * k + Math.sin(k * Math.PI * 2 + ph[0]) * h * 0.1 * Math.sin(k * Math.PI);
    const np = def.mission === 'kin' || (def.pups && (def.pups.length || def.pups > 0)) ? Math.min(3, Array.isArray(def.pups) ? def.pups.length : def.pups || 2) : 0;
    const pk = []; for (let i = 0; i < np; i++) pk.push(np === 1 ? 0.5 : 0.3 + i * 0.4 / (np - 1));
    const nearPup = k => pk.some(q => Math.abs(q - k) < 0.07);
    R.glow(g, ex, ey, aw * 0.9, P.moon, 0.35);
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const k = i / N, x = rx(k), y = ry(k);
      if (nearPup(k)) continue;
      g.globalAlpha = 0.95 - k * 0.35; g.fillStyle = PP.P.teal;
      if (i % 6 === 3 && i < N - 2) {
        // a chevron along the route
        const a = Math.atan2(ry(k + 0.01) - y, rx(k + 0.01) - x), c = 4.2 * pu;
        g.save(); g.translate(x, y); g.rotate(a);
        g.strokeStyle = PP.P.teal; g.lineWidth = 1.6 * pu; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-c * 0.6, -c); g.lineTo(c * 0.4, 0); g.lineTo(-c * 0.6, c); g.stroke();
        g.restore();
        R.glow(g, x, y, 9 * pu, PP.P.teal, 0.35 * (1 - k * 0.5));
      } else g.fillRect(x - pu, y - pu, 2 * pu, 2 * pu);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < np; i++) {
      const x = rx(pk[i]), y = ry(pk[i]), rr2 = 8.5 * pu;
      R.glow(g, x, y, 16 * pu, PP.P.pink, 0.5);
      g.fillStyle = 'rgba(20,8,24,0.55)'; g.beginPath(); g.arc(x, y, rr2, 0, TAU); g.fill();
      g.strokeStyle = PP.P.pink; g.lineWidth = 1.3 * pu; g.beginPath(); g.arc(x, y, rr2, 0, TAU); g.stroke();
      R.drawPup(g, x, y - 1.5 * pu, 0.4 + i, 1, 0.78 * pu);
    }
    // an escape: what is coming, behind you
    if (def.mission === 'escape') { const eg = g.createLinearGradient(0, 0, w * 0.16, 0); eg.addColorStop(0, kind === 'drowned' ? 'rgba(40,110,200,0.75)' : 'rgba(255,74,107,0.45)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.fillRect(0, 0, w * 0.16, h); }
    // your bat, on the wing
    const bat = PP.batById(batId) || PP.batById('pip');
    R.drawBat(g, { x: bx, y: by, vx: 200, face: 1, flap: 1.1, glide: 0, blink: 1, rim: 0.4 }, 0, Math.min(h / 74, w / 210), bat.look, { glow: true, still: true });
    R.ppu = ppu;
  };
})();
