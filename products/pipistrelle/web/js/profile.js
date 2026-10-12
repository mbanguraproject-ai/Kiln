/* The profile: one versioned save object (key "profile") with migrations, the larder (moths), Moons, the Roost's
 * pups, bats, requests, journal and settings. Banked moths are never lost. Export and import as a text code. */
(function () {
  'use strict';
  const PP = window.PP, A = window.Arcade;
  const VERSION = 2;
  const E = () => PP.data.economy;

  function fresh() {
    return {
      v: VERSION, created: Date.now(), moths: 0,
      stats: { caves: 0, pups: 0, moths: 0, chirps: 0, shrieks: 0, time: 0, moons: 0, cleanCaves: 0, quietest: 999, bestSurvey: 0, nightlies: 0, earned: 0, attempts: 0 },
      caves: {}, roost: {}, bats: { owned: ['pip'], selected: 'pip' },
      requests: { done: {} }, journal: { scratches: {} }, nightly: { last: '' }, longNight: { best: 0, bestCave: 0, runs: 0 },
      flights: {}, seen: { bats: {}, requests: {}, night: false }, tutorial: { taught: false },
      settings: { sound: true, music: 0.8, sfx: 1, echo: 1, vibration: true, quality: 'auto', gentle: false, shapes: false, captions: true },
      legacy: { gift: 0 },
    };
  }
  // Migrations: each takes a profile of version n and returns version n + 1.
  //  0: the pilot's flat Kiln keys (run, taught, runs, best). The old best comes back as a gift, up to 500.
  //  1: the first product save ({ v: 1, moths, caves: { id: { moons } }, settings }).
  const MIGRATIONS = {
    0(old) {
      const p = { v: 1, moths: Math.min(500, Math.max(0, old.best | 0)), caves: {}, settings: {}, taught: !!old.taught, gift: Math.min(500, Math.max(0, old.best | 0)) };
      return p;
    },
    1(p1) {
      const p = fresh();
      p.moths = Math.max(0, p1.moths | 0);
      for (const id in p1.caves || {}) {
        const c = p1.caves[id];
        p.caves[id] = { cleared: !!(c.cleared || (c.moons && c.moons[0])), moons: [!!(c.moons && c.moons[0]), !!(c.moons && c.moons[1]), !!(c.moons && c.moons[2])], best: c.best || null, tries: c.tries || 0 };
      }
      Object.assign(p.settings, p1.settings || {});
      p.tutorial.taught = !!p1.taught;
      p.legacy.gift = p1.gift || 0;
      return p;
    },
  };
  function migrate(raw) {
    let p = raw;
    let guard = 0;
    while (p && (p.v | 0) < VERSION && guard++ < 10) {
      const m = MIGRATIONS[p.v | 0];
      if (!m) break;
      p = m(p);
    }
    // fill any field a newer build added
    const f = fresh();
    for (const k in f) if (p[k] === undefined) p[k] = f[k];
    for (const k of ['stats', 'settings', 'seen', 'longNight', 'bats', 'requests', 'journal']) for (const kk in f[k]) if (p[k][kk] === undefined) p[k][kk] = f[k][kk];
    p.v = VERSION;
    return p;
  }

  let P = null;
  function load() {
    let raw = A.store.get('profile', null);
    if (!raw) {
      // the pilot's keys, if this origin ever ran it
      const ls = A.store.raw && A.store.raw();
      let legacy = null;
      if (ls) { try { const g = k => { const v = ls.getItem('kiln:pipistrelle:' + k); return v == null ? undefined : JSON.parse(v); }; const best = g('best'); if (best !== undefined || g('run') !== undefined) legacy = { v: 0, best: best || 0, taught: !!g('taught'), runs: g('runs') || 0 }; } catch (e) { legacy = null; } }
      raw = legacy || fresh();
    }
    P = migrate(raw);
    save();
  }
  function save() { A.store.set('profile', P); }

  const PR = PP.profile = {
    VERSION, migrate, fresh,
    get() { if (!P) load(); return P; },
    save,
    update(fn) { fn(PR.get()); save(); },
    reset() { P = fresh(); save(); },
    caveMoons(id) { const c = PR.get().caves[id]; return c ? c.moons.slice() : [false, false, false]; },
    moonsIn(prefix) { let n = 0; const cs = PR.get().caves; for (const id in cs) if (!prefix || id.indexOf(prefix) === 0) n += cs[id].moons.filter(Boolean).length; return n; },
    totalMoons() { return PR.moonsIn(''); },
    cleared: id => !!(PR.get().caves[id] && PR.get().caves[id].cleared),
    // is a cave open? the first is; each next one opens when the one before it is cleared; biomes need Moons
    caveOpen(biome, idx) {
      const B = PP.biome(biome), gate = PP.data.campaign.gates[biome] || 0;
      if (!B.ready || PR.totalMoons() < gate) return false;
      if (idx === 0) {
        const order = PP.data.campaign.order, bi = order.indexOf(biome);
        if (bi <= 0) return true;
        const prev = PP.biomes[order[bi - 1]];
        return !!(prev && prev.caves.length && PR.cleared(prev.caves[prev.caves.length - 1].id));
      }
      return PR.cleared(B.caves[idx - 1].id);
    },
    // A bat arrives when its arrival cave is cleared. If that cave is not in this build yet, it arrives with the
    // last campaign cave that is (so every bat can be met now, and the real rule takes over as biomes land).
    arrivalCave(bat) {
      if (!bat.arrives) return null;
      const id = bat.arrives.after;
      const all = [];
      for (const b of PP.data.campaign.order) { const B = PP.biomes[b]; if (B && B.ready) for (const c of B.caves) all.push(c.id); }
      if (all.indexOf(id) >= 0) return id;
      const before = all.filter(c => c < id);
      return before.length ? before[before.length - 1] : all[all.length - 1];
    },
    arrived(bat) { const c = PR.arrivalCave(bat); return !c || PR.cleared(c); },
    owns: id => PR.get().bats.owned.indexOf(id) >= 0,
    buy(id) {
      const p = PR.get(), bat = PP.batById(id), price = PP.economy.price(id);
      if (PR.owns(id) || !PR.arrived(bat) || p.moths < price) return false;
      p.moths -= price; p.bats.owned.push(id); p.bats.selected = id;
      save();
      return true;
    },
    select(id) { if (PR.owns(id)) { PR.get().bats.selected = id; save(); } },
    readScratch(s) { const p = PR.get(); if (!p.journal.scratches[s.id]) { p.journal.scratches[s.id] = { text: s.text, at: Date.now() }; save(); } },
    nightlyDone() { return PR.get().nightly.last === PP.today(); },

    // Long Night: banked at every arch and after every night flight; never lost
    bankEndless(amount, G, night) {
      if (!amount) return;
      const p = PR.get();
      p.moths += amount; p.stats.earned += amount;
      G.bankedTotal = (G.bankedTotal || 0) + amount;
      if (!night) { p.stats.caves++; p.stats.pups += G.pupsHome; }
      save();
    },

    // Record a finished run (won: reached the arch). Returns the results the Results screen shows.
    recordRun(G, won) {
      const p = PR.get(), s = G.stats, res = { kind: G.kind, won, banked: 0, bonus: [], newMoons: [false, false, false], moons: [], requests: [], pupsHome: G.pupsHome, time: s.time, stats: Object.assign({}, s), cave: G.caveDef, depth: G.cave, larder: 0 };
      p.stats.chirps += s.chirps; p.stats.shrieks += s.shrieks; p.stats.time += s.time; p.stats.moths += s.moths; p.stats.attempts++;
      if (G.kind === 'campaign' || G.kind === 'nightly') {
        const def = G.caveDef;
        if (won) {
          res.banked = G.bankedNow || 0;
          p.moths += res.banked; p.stats.earned += res.banked;
          p.stats.caves++; p.stats.pups += G.pupsHome;
          if (G.pupsHome) p.roost[def.id] = (p.roost[def.id] || 0) + G.pupsHome;
          if (!s.bumps) p.stats.cleanCaves++;
          p.stats.quietest = Math.min(p.stats.quietest, s.calls);
          p.stats.bestSurvey = Math.max(p.stats.bestSurvey, PP.missions.coverage(PP.L));
        }
        if (G.kind === 'campaign') {
          const c = p.caves[def.id] || (p.caves[def.id] = { cleared: false, moons: [false, false, false], best: null, tries: 0 });
          c.tries++;
          const won3 = won ? (G.moonsWon || [false, false, false]) : [false, false, false];
          res.firstClear = won && !c.cleared;
          if (won) c.cleared = true;
          for (let i = 0; i < 3; i++) {
            if (won3[i] && !c.moons[i]) {
              c.moons[i] = true; res.newMoons[i] = true;
              const b = PP.economy.moonBonus(i, def.setPiece);
              p.moths += b; p.stats.earned += b; p.stats.moons++;
              res.bonus.push({ label: PP.data.missions.slots[i] + ' Moon', amount: b });
            }
          }
          res.moons = c.moons.slice();
          res.moonsThisRun = won3;
          if (won) c.best = { time: Math.min(c.best ? c.best.time : 1e9, s.time), bank: Math.max(c.best ? c.best.bank : 0, res.banked) };
          // bats that arrive with this cave
          if (res.firstClear) res.arrivals = PP.data.bats.filter(b => PR.arrivalCave(b) === def.id).map(b => b.id);
        } else if (won && !PR.nightlyDone()) {
          p.nightly.last = PP.today(); p.stats.nightlies++;
          const b = E().nightly;
          p.moths += b; p.stats.earned += b;
          res.bonus.push({ label: 'Nightly Cave, first clear today', amount: b });
        }
      } else if (G.kind === 'endless') {
        res.banked = G.bankedTotal || 0;
        p.longNight.runs++;
        p.longNight.best = Math.max(p.longNight.best, G.score);
        p.longNight.bestCave = Math.max(p.longNight.bestCave, G.cave);
        res.depth = G.cave; res.score = G.score;
      } else if (G.kind === 'flight') {
        res.banked = G.score;
        p.moths += G.score; p.stats.earned += G.score;
        p.flights[G.flightBiome] = true;
      }
      res.requests = PR.checkRequests();
      res.larder = p.moths;
      save();
      return res;
    },
    // complete any request whose goal is met, paying its reward once
    checkRequests() {
      const p = PR.get(), out = [];
      for (const rq of PP.data.requests) {
        if (p.requests.done[rq.id]) continue;
        const [have, need] = rq.goal(p);
        if (have >= need) {
          const rw = E().requests[rq.id] || 0;
          p.requests.done[rq.id] = Date.now();
          p.moths += rw; p.stats.earned += rw;
          out.push({ id: rq.id, name: rq.name, amount: rw });
        }
      }
      return out;
    },
    exportCode() { return 'PIP' + VERSION + ':' + btoa(unescape(encodeURIComponent(JSON.stringify(PR.get())))); },
    importCode(code) {
      const m = /^PIP(\d+):(.+)$/.exec(String(code || '').trim());
      if (!m) return false;
      try {
        const raw = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
        if (!raw || typeof raw !== 'object') return false;
        P = migrate(raw); save();
        return true;
      } catch (e) { return false; }
    },
  };

  // settings, with the live effects
  PP.settings = {
    get(k) { return PR.get().settings[k]; },
    set(k, v) { PR.get().settings[k] = v; save(); PP.settings.apply(); },
    apply() {
      const s = PR.get().settings;
      PP.audio.applySettings(s);
      if (PP.R && PP.R.quality && PP.R.quality.setting !== s.quality) PP.R.quality.set(s.quality);
    },
  };
})();
