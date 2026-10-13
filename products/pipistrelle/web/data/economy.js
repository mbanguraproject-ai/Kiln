/* The economy: every number that touches moths lives here (one currency, earned only by playing).
 * Fairness charter: no real money, no ads except a rewarded one the player chooses at the Last Echo (D15), no
 * timers, no streaks, no rotating or expiring stock, the exact
 * price next to the balance, banked moths are never lost, and the story is gated by skill alone.
 * tests/test.cjs runs PP.economy.simulate() over `model` and checks `targets` within `tolerance`. */
(function () {
  'use strict';
  const PP = window.PP;
  const E = PP.data.economy = {
    bank: { multCap: 6 },                          // banked at the arch: carried x (1 + pups home), capped
    moonBonus: { home: 15, kin: 35, mastery: 60 }, // first time each Moon is earned
    setPieceMult: 2,                               // set-piece caves (the sixth of each biome, the finale) pay double
    nightly: 60,                                   // the Nightly Cave, first clear of the day; no streaks
    longNight: { rate: 1, skipYield: 12 },         // The Long Night banks 1:1; skipping a night flight banks this
    prices: { pip: 0, skimmer: 600, hark: 900, comb: 1300, gale: 1800 },
    requests: {                                    // Colony Request rewards (definitions in data/requests.js)
      'first-light': 25, 'little-voices': 50, 'nursemaid-1': 100, 'nursemaid-2': 200, 'nursemaid-3': 300,
      'three-calls': 150, 'no-scratch': 150, 'chalk-moons': 150, 'loud-and-clear': 50, 'mothwatcher': 100,
      'old-scratches': 125, 'cartographer': 150, 'long-night-5': 100, 'long-night-10': 200, 'nightly': 60,
    },
    // Pacing model for the campaign simulator: what a competent first pass earns per cave.
    model: {
      moonsPerCave: 2,                              // Homecoming and Kin; Mastery is the bonus
      biomes: [
        { id: 'chalk', caves: 6, carried: 10, pups: 2, setPiece: [6] },
        { id: 'drowned', caves: 6, carried: 18, pups: 3, setPiece: [6] },
        { id: 'glass', caves: 6, carried: 20, pups: 3, setPiece: [6] },
        { id: 'owlstone', caves: 6, carried: 22, pups: 3, setPiece: [6] },
        { id: 'hush', caves: 1, carried: 30, pups: 3, setPiece: [1] },
      ],
      // requests a typical player completes, by the cave index (1-based, campaign order) it happens around
      requestsAt: { 'little-voices': 2, 'first-light': 1, 'loud-and-clear': 3, 'nursemaid-1': 10, 'mothwatcher': 8,
        'chalk-moons': 9, 'old-scratches': 12, 'nursemaid-2': 22, 'cartographer': 16, 'no-scratch': 18, 'three-calls': 20 },
      nightlyEvery: 4,                              // one Nightly Cave clear every four campaign caves
    },
    targets: {
      firstBat: 6,      // the first bought bat is affordable around the end of Chalk Hollows (cave 6)
      allBats: 25,      // all four by the end of the campaign (cave 25)
      tolerance: 0.25,
    },
  };

  PP.economy = {
    bankValue(carried, pupsHome) { return Math.max(0, carried | 0) * Math.min(E.bank.multCap, 1 + (pupsHome | 0)); },
    moonBonus(slot, setPiece) { const k = ['home', 'kin', 'mastery'][slot]; return E.moonBonus[k] * (setPiece ? E.setPieceMult : 1); },
    price: id => E.prices[id] || 0,
    // Pure campaign simulator: cumulative moths after each cave of a first pass at `moonsPerCave`.
    simulate(model) {
      model = model || E.model;
      const out = [];
      let total = 0, idx = 0;
      const reqAt = {};
      for (const id in model.requestsAt) (reqAt[model.requestsAt[id]] = reqAt[model.requestsAt[id]] || []).push(id);
      for (const b of model.biomes) {
        for (let c = 1; c <= b.caves; c++) {
          idx++;
          const sp = b.setPiece.indexOf(c) >= 0;
          total += PP.economy.bankValue(b.carried, Math.round(b.pups));
          for (let s = 0; s < model.moonsPerCave; s++) total += PP.economy.moonBonus(s, sp);
          for (const id of reqAt[idx] || []) total += E.requests[id] || 0;
          if (model.nightlyEvery && idx % model.nightlyEvery === 0) total += E.nightly;
          out.push({ cave: idx, biome: b.id, total });
        }
      }
      return out;
    },
    // First cave index (1-based) at which a running total reaches `amount`.
    reachAt(sim, amount) { for (const s of sim) if (s.total >= amount) return s.cave; return Infinity; },
  };
})();
