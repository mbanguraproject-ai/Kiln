/* Global tuning: the numbers every bat and cave share. Bat-specific numbers live in data/bats.js,
 * money in data/economy.js, caves in data/biomes/*.js. */
(function () {
  'use strict';
  window.PP.data.tuning = {
    ringSpeed: 600,           // world px per second: how fast a sonar ring sweeps out
    history: 300,             // bat positions remembered, for the pups that follow you
    trailLag: 9,              // frames of history between trailing pups (a bat's ability can tighten it)
    eatEnergy: 4,             // energy per moth eaten
    damage: { stal: 10, owl: 16, splash: 3, drip: 3, collapse: 25 },
    bump: { minSpeed: 85, base: 1.5, perSpeed: 110, stunAbove: 150, stun: 0.3 },
    camera: { area: 420000, minShort: 420 },   // constant visible world area on every screen
    dive: { refill: n => Math.min(20, 6 + (n - 1) * 2) },
    night: { time: 15, scroll: 70, spawn: 0.32, gold: 0.12, energy: 0.8, worldH: 640 },
    echo: { dots: 4096, lines: 3072, memory: 12000 },
    // The Long Night: today's endless game, cave by cave (n = depth)
    endless: {
      screens: n => Math.min(10, 6 + Math.floor((n - 1) / 2)),
      rad: n => Math.max(54, 118 - (n - 1) * 5.5),
      moths: n => Math.max(14, Math.round(22 - (n - 1) * 0.6)),
      H: n => Math.min(1500, 1000 + n * 40),
      pups: n => (n === 1 ? 1 : Math.min(3, n < 4 ? 2 : 3)),
      drain: n => 1.75 + Math.min(0.55, (n - 1) * 0.05),
      unlock: { webs: 2, stals: 3, river: 4, crystal: 5, gust: 6, owls: 7, flood: 8 },
    },
  };
})();
