/* Echolocation: sonar rings, the echo dots and contour lines they leave (fixed pools, the same on every quality
 * tier), the memory of everything heard (stored as vectors per 256 px chunk, drawn by render/chunks.js), and the
 * pups' answers. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, CH = PP.CH, TAU = PP.TAU;
  const { clamp, dist } = Kit;
  const E = PP.echo = {};
  const T = PP.data.tuning;
  const SPEED = T.ringSpeed;

  // ---- dot and line pools ----
  const EN = T.echo.dots, LN = T.echo.lines;
  const ex = new Float32Array(EN), ey = new Float32Array(EN), et = new Float32Array(EN).fill(-99), es = new Float32Array(EN), el = new Float32Array(EN).fill(2.2), ec = new Uint8Array(EN);
  const lx1 = new Float32Array(LN), ly1 = new Float32Array(LN), lx2 = new Float32Array(LN), ly2 = new Float32Array(LN), lt = new Float32Array(LN).fill(-99), ll = new Float32Array(LN).fill(2.2), lc = new Uint8Array(LN);
  let eHead = 0, lHead = 0;
  E.pools = { EN, LN, ex, ey, et, es, el, ec, lx1, ly1, lx2, ly2, lt, ll, lc };
  // a biome can make echoes die sooner (the Hush's moss swallows them); crystals always carry sound
  let lifeMul = 1;
  PP.on('caveEnter', lv => { lifeMul = (PP.biome(lv.biome) || {}).echoLife || 1; });
  const lifeFor = c => { const b = PP.bat.stats(); return b.echoLife * (c === CH.WATER && PP.bat.ability('skim') ? 2 : 1) * (c === CH.CRYS || c === CH.MOON ? 1 : lifeMul); };
  E.addDot = function (x, y, t0, c, s) { const i = eHead; eHead = (eHead + 1) % EN; ex[i] = x; ey[i] = y; et[i] = t0; ec[i] = c; es[i] = s; el[i] = lifeFor(c); };
  E.addLine = function (x1, y1, x2, y2, t0, c) { const i = lHead; lHead = (lHead + 1) % LN; lx1[i] = x1; ly1[i] = y1; lx2[i] = x2; ly2[i] = y2; lt[i] = t0; lc[i] = c; ll[i] = lifeFor(c); };

  // ---- memory: a time-ordered queue, flushed into per-chunk vector stores as each echo arrives ----
  const MQ = T.echo.memory, mqx = new Float32Array(MQ), mqy = new Float32Array(MQ), mqx2 = new Float32Array(MQ), mqy2 = new Float32Array(MQ), mqt = new Float32Array(MQ), mqc = new Uint8Array(MQ);
  let mqHead = 0, mqTail = 0;
  function memPush(x, y, x2, y2, t0, c) {
    if ((mqTail + 1) % MQ === mqHead) return;
    mqx[mqTail] = x; mqy[mqTail] = y; mqx2[mqTail] = x2; mqy2[mqTail] = y2; mqt[mqTail] = t0; mqc[mqTail] = c;
    mqTail = (mqTail + 1) % MQ;
  }
  // keep the queue ordered by time: insertion-sort this ring's entries (they are nearly sorted already)
  function sortMem(qStart) {
    const n = (mqTail - qStart + MQ) % MQ;
    for (let k = 1; k < n; k++) {
      const i = (qStart + k) % MQ, tv = mqt[i], xv = mqx[i], yv = mqy[i], x2v = mqx2[i], y2v = mqy2[i], cv = mqc[i];
      let j = k - 1;
      while (j >= 0 && mqt[(qStart + j) % MQ] > tv) {
        const a = (qStart + j) % MQ, b2 = (qStart + j + 1) % MQ;
        mqt[b2] = mqt[a]; mqx[b2] = mqx[a]; mqy[b2] = mqy[a]; mqx2[b2] = mqx2[a]; mqy2[b2] = mqy2[a]; mqc[b2] = mqc[a];
        j--;
      }
      const d = (qStart + j + 1) % MQ;
      mqt[d] = tv; mqx[d] = xv; mqy[d] = yv; mqx2[d] = x2v; mqy2[d] = y2v; mqc[d] = cv;
    }
  }
  // per-chunk vector store (x1, y1, x2, y2, c); x2 < -1e5 marks a dot
  const CS = 256;
  const mem = PP.mem = { CS, chunks: new Map(), total: 0, version: 0 };
  mem.key = (ci, cj) => ci * 4096 + cj;
  mem.add = function (x1, y1, x2, y2, c) {
    const ci = Math.floor(x1 / CS), cj = Math.floor(y1 / CS), k = mem.key(ci, cj);
    let ch = mem.chunks.get(k);
    if (!ch) { ch = { ci, cj, n: 0, a: new Float32Array(5 * 64), drawn: 0 }; mem.chunks.set(k, ch); }
    if ((ch.n + 1) * 5 > ch.a.length) { const na = new Float32Array(ch.a.length * 2); na.set(ch.a); ch.a = na; }
    const o = ch.n * 5;
    ch.a[o] = x1; ch.a[o + 1] = y1; ch.a[o + 2] = x2; ch.a[o + 3] = y2; ch.a[o + 4] = c;
    ch.n++; mem.total++;
    // a line that crosses into a neighbour is stored there too, so each chunk draws it clipped
    if (x2 > -1e5) {
      const ci2 = Math.floor(x2 / CS), cj2 = Math.floor(y2 / CS);
      if (ci2 !== ci || cj2 !== cj) {
        const k2 = mem.key(ci2, cj2);
        let c2 = mem.chunks.get(k2);
        if (!c2) { c2 = { ci: ci2, cj: cj2, n: 0, a: new Float32Array(5 * 64), drawn: 0 }; mem.chunks.set(k2, c2); }
        if ((c2.n + 1) * 5 > c2.a.length) { const na = new Float32Array(c2.a.length * 2); na.set(c2.a); c2.a = na; }
        const o2 = c2.n * 5;
        c2.a[o2] = x1; c2.a[o2 + 1] = y1; c2.a[o2 + 2] = x2; c2.a[o2 + 3] = y2; c2.a[o2 + 4] = c;
        c2.n++;
      }
    }
  };
  E.memFlush = function (t) {
    let n = 0;
    while (mqHead !== mqTail && mqt[mqHead] <= t && n < 2000) {
      mem.add(mqx[mqHead], mqy[mqHead], mqx2[mqHead], mqy2[mqHead], mqc[mqHead]);
      mqHead = (mqHead + 1) % MQ;
      n++;
    }
    if (n) mem.version++;
  };
  E.clear = function () {
    et.fill(-99); lt.fill(-99); mqHead = mqTail = 0;
    mem.chunks.clear(); mem.total = 0; mem.version++;
  };

  const loud = () => PP.G && PP.G.mode === 'play';
  const SR = 400;
  const hitD = new Float32Array(SR * 2), hitX = new Float32Array(SR * 2), hitY = new Float32Array(SR * 2), hitT = new Uint8Array(SR * 2);

  // Send a sonar ring from (ox, oy). kind: 'chirp' | 'shriek' | 'crystal' | 'crash' | 'drip' | 'death'
  E.sonar = function (ox, oy, R, rays, kind) {
    const G = PP.G, L = PP.L, W = PP.world, HIT = W.HIT;
    rays = Math.min(rays, SR * 2);
    // a ring that would start inside stone starts from the nearest open air instead
    if (W.fieldAt(ox, oy) >= 0.45) {
      let found = false;
      for (let d = 6; d <= 48 && !found; d += 6) for (let k = 0; k < 12; k++) {
        const a = k / 12 * TAU, x = ox + Math.cos(a) * d, y = oy + Math.sin(a) * d;
        if (W.fieldAt(x, y) < 0.4) { ox = x; oy = y; found = true; break; }
      }
      if (!found) return;
    }
    const t0 = G.t;
    const ringCol = kind === 'crystal' ? CH.CRYS : kind === 'crash' ? CH.HAZ : kind === 'drip' ? CH.WATER : kind === 'chorus' ? CH.MOON : CH.ROCK;
    G.rings.push({ x: ox, y: oy, t0, R, kind, c: ringCol });
    const tint = kind === 'crystal' ? CH.CRYS : -1;
    const off = G.rng.range(0, TAU / rays);
    const qStart = mqTail;
    const fr = G.fxr;
    for (let k = 0; k < rays; k++) {
      const a = off + k / rays * TAU, dx = Math.cos(a), dy = Math.sin(a);
      const d = W.cast(ox, oy, dx, dy, R);
      hitD[k] = d < 5 ? Infinity : d;
      if (d === Infinity || d < 5) continue;
      const c = tint >= 0 && HIT.t === CH.ROCK ? (k % 2 ? CH.CRYS : CH.ROCK) : (kind === 'crash' && HIT.t === CH.ROCK && k % 3 === 0 ? CH.HAZ : HIT.t);
      // a tiger moth's clicks scramble an echo near it: it comes back jittered and doubled, and is not mapped
      const jam = kind !== 'crystal' && PP.jamAt ? PP.jamAt(HIT.x, HIT.y) : 0;
      if (jam > 0.05) {
        const tj = t0 + d / SPEED, sj = 10 + jam * 34;
        E.addDot(HIT.x + fr.range(-sj, sj), HIT.y + fr.range(-sj, sj), tj + fr.range(0, 0.06), c, 0.9);
        E.addDot(HIT.x + fr.range(-sj, sj), HIT.y + fr.range(-sj, sj), tj + fr.range(0.03, 0.12), c, 0.6);
        hitD[k] = Infinity;
        continue;
      }
      hitX[k] = HIT.x; hitY[k] = HIT.y; hitT[k] = c;
      const ta = t0 + d / SPEED;
      E.addDot(HIT.x, HIT.y, ta, c, 1);
      const dp = fr.range(4, 16), sd = fr.range(-5, 5);
      E.addDot(HIT.x + dx * dp - dy * sd, HIT.y + dy * dp + dx * sd, ta + 0.025, c, 0.45);
      if (k % 3 === 1) { const s2 = (fr.chance(0.5) ? 1 : -1) * fr.range(3, 6); E.addDot(HIT.x - dy * s2, HIT.y + dx * s2, ta + 0.012, c, 0.7); }
      if (k > 0 && hitD[k - 1] !== Infinity && Math.abs(hitD[k - 1] - d) < 28 && hitT[k - 1] === c) {
        E.addLine(hitX[k - 1], hitY[k - 1], HIT.x, HIT.y, ta, c);
        memPush(hitX[k - 1], hitY[k - 1], HIT.x, HIT.y, ta, c);
      } else memPush(HIT.x, HIT.y, -1e6, 0, ta, c);
      if (d < 220) PP.gen.surveyMark(L, HIT.x - dx * 4, HIT.y - dy * 4);
      if (c === CH.CRYS && kind !== 'crystal') {
        for (const cl of L.crystals) if (G.t - cl.lit > 1.2 && dist(HIT.x, HIT.y, cl.x, cl.y) < cl.r + 12) { cl.lit = ta; G.reechoes.push({ cl, at: ta + 0.42 }); }
      }
    }
    if (hitD[0] !== Infinity && hitD[rays - 1] !== Infinity && Math.abs(hitD[0] - hitD[rays - 1]) < 28) E.addLine(hitX[rays - 1], hitY[rays - 1], hitX[0], hitY[0], t0 + hitD[0] / SPEED, hitT[0]);
    sortMem(qStart);
    pingAll(ox, oy, R, t0, kind);
    if (kind === 'chirp' || kind === 'shriek') {
      // the cave answers: echo copies delayed by the distance they travelled, panned by direction
      const fxA = (PP.biome(L.biome).audio || {}).echo || {};
      for (let s = 0; s < 6; s++) {
        const k = Math.floor((s + 0.5) / 6 * rays), d = hitD[k];
        if (d === Infinity) continue;
        const a = off + k / rays * TAU;
        if (loud()) PP.sfx('echo', { delay: d / SPEED * 1000, vol: (0.35 + 0.65 * (1 - d / R)) * PP.settings.get('echo'), pan: Math.cos(a) * 0.8, pitch: -d / R * 6 - (kind === 'shriek' ? 3 : 0), force: true, verb: fxA.verb });
      }
      pupAnswers(ox, oy, t0, kind);
    }
  };

  function pingAll(ox, oy, R, t0, kind) {
    const L = PP.L, G = PP.G, W = PP.world, fr = G.fxr;
    const api = {
      ox, oy, R, t0, kind, speed: SPEED, addDot: E.addDot,
      ping(e, x, y, c, n, spread) {
        const d = dist(ox, oy, x, y);
        if (d > R || !W.visibleFrom(ox, oy, x, y)) return false;
        const ta = t0 + d / SPEED;
        e.lit = ta;
        for (let k = 0; k < n; k++) E.addDot(x + fr.range(-spread, spread), y + fr.range(-spread, spread), ta + k * 0.012, c, k === 0 ? 1.5 : 0.7);
        return true;
      },
    };
    for (const m of L.moths) if (!m.dead) api.ping(m, m.x, m.y, CH.MOTH, 3, 5);
    for (const p of L.pups) if (p.state === 'hang') api.ping(p, p.x, p.y, CH.PUP, 4, 6);
    PP.hazards.each('ping', api);
  }

  // Lost pups answer a call through the rock: a pink answer, delayed by distance. Deep sleepers wake only to a shriek.
  function pupAnswers(ox, oy, t0, kind) {
    const G = PP.G;
    for (const p of PP.L.pups) {
      if (p.state !== 'hang') continue;
      const d = dist(ox, oy, p.x, p.y), reach = kind === 'shriek' ? 1900 : 1150;
      if (d > reach || (p.deep && kind !== 'shriek')) continue;
      if (d < 140) continue;
      G.answers.push({ p, at: t0 + 0.3 + d / 1400, d });
    }
  }
  E.updateAnswers = function (G) {
    for (let i = G.answers.length - 1; i >= 0; i--) {
      const a = G.answers[i];
      if (G.t < a.at) continue;
      G.answers.splice(i, 1);
      if (a.p.state !== 'hang') continue;
      a.p.answer = G.t;
      if (a.p.deep) a.p.woke = true;
      PP.sfx('pupcall', { pan: PP.hazards.pan(a.p.x), vol: clamp(1.1 - a.d / 1900, 0.2, 1), pitch: a.p.deep ? -3 : 0 });
      PP.caption('peep', a.p.x, a.p.y, CH.PUP);
      PP.emit('pupAnswer', a.p);
    }
  };

  // live dot count (for tests and the debug hook)
  E.live = function (t) { let n = 0; for (let i = 0; i < EN; i++) if (t - et[i] >= 0 && t - et[i] < el[i]) n++; return n; };
  E.near = function (x, y, r, t) { const out = []; for (let i = 0; i < EN; i++) if (Math.hypot(ex[i] - x, ey[i] - y) < r && t - et[i] < el[i] && t >= et[i]) out.push([ec[i], +es[i].toFixed(1)]); return out; };
})();
