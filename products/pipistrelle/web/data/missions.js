/* Mission types and Moon types. Every cave has three Moons: Homecoming (crescent), Kin (half) and Mastery (full),
 * earned independently across attempts. The logic for each Moon type is in js/missions.js; this file holds the
 * words. A Moon type can be used in any slot; `lost` text explains the moment a Moon becomes impossible. */
(function () {
  'use strict';
  window.PP.data.missions = {
    slots: ['Homecoming', 'Kin', 'Mastery'],
    types: {
      homing: { name: 'Homing', line: 'Find the moonlit arch.' },
      kin: { name: 'Kin', line: 'Bring the lost pups home.' },
      hush: { name: 'Hush', line: 'Slip past the owls.' },
      escape: { name: 'Escape', line: 'Outrun what is coming.' },
      endless: { name: 'The Long Night', line: 'One cave after another, until your wings give out.' },
      practice: { name: 'Practice', line: 'No moths to lose, no energy to spend.' },
    },
    moons: {
      home: { text: () => 'Reach the moonlit arch' },
      escape: { text: () => 'Escape through the arch' },
      pups: { text: m => (m.all ? 'Bring every pup home' : 'Bring ' + m.n + ' pups home'), lost: () => 'a pup was lost' },
      time: { text: m => 'Reach the arch within ' + m.max + ' s', lost: m => m.max + ' s have passed' },
      bumps: { text: m => (m.max === 0 ? 'Never bump a wall' : 'Bump the walls ' + m.max + ' times or fewer'), lost: m => 'bump ' + (m.max + 1) },
      calls: { text: m => 'Use ' + m.max + ' calls or fewer', lost: m => 'call ' + (m.max + 1) },
      survey: { text: m => 'Hear ' + m.pct + '% of the walls' },
      larder: { text: m => 'Eat ' + m.n + ' moths', lost: () => 'too few moths left' },
      noweb: { text: () => 'Never get caught in a web', lost: () => 'caught in a web' },
      untouched: { text: () => 'Never let the collapse touch you', lost: () => 'the collapse caught you' },
      energy: { text: m => 'Never drop below ' + m.min + ' energy', lost: m => 'energy fell below ' + m.min },
      nowake: { text: () => 'Wake no owl', lost: () => 'an owl woke' },
      dry: { text: () => 'Never touch the water', lost: () => 'a splash' },
      tidefree: { text: () => 'Never let the flood touch you', lost: () => 'the flood caught you' },
      nosiphon: { text: () => 'Never get pulled by a siphon', lost: () => 'a siphon pulled you' },
      tigers: { text: m => 'Eat ' + m.n + ' tiger moths', lost: () => 'too few tiger moths left' },
      shrieks: { text: m => (m.max === 0 ? 'Never shriek' : 'Shriek ' + m.max + ' times or fewer'), lost: m => 'shriek ' + (m.max + 1) },
    },
  };
})();
