/* Global tuning: the numbers every bat and cave share. Bat-specific numbers live in data/bats.js,
 * money in data/economy.js, caves in data/biomes/*.js. */
(function () {
  'use strict';
  window.PP.data.tuning = {
    ringSpeed: 600,           // world px per second: how fast a sonar ring sweeps out
    history: 300,             // bat positions remembered, for the pups that follow you
    trailLag: 9,              // frames of history between trailing pups (a bat's ability can tighten it)
    eatEnergy: 6,             // energy per moth eaten: eating is how you survive (the drain is doubled, drainScale)
    drainScale: 2,            // every cave's drain doubled (14 October): a full bar lasts about 32 s without moths
    // losing is real (the owner, 14 October: "the game is too easy for reward ads to be meaningful"): hazards hit
    // hard, crashes into stone cost far more than a brush, and the dark grows hungry past a cave's par time
    damage: { stal: 22, owl: 30, splash: 7, drip: 6, collapse: 35 },
    bump: { minSpeed: 85, base: 2.5, perSpeed: 45, stunAbove: 150, stun: 0.3, crashAbove: 200, crash: 6 },
    hunger: { perScreen: 4.5, ramp: 1, max: 2 },  // par = 4.5 s a screen; past it the drain climbs to double
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
