/* The Colony: five bats, sidegrades not upgrades. Pip is today's bat exactly. Prices are in data/economy.js.
 * stats   flight, sonar and energy numbers read by js/bat.js and js/echo.js
 * ability one named ability, implemented in js/bat.js (steady, skim, hark, glean, bolt)
 * look    parameters for the one parametric bat renderer (js/render/batart.js), used in flight, Hangar and Roost
 * arrives the campaign cave whose first clear brings the bat to the Hangar (see docs/BIOMES.md for the rule
 *         when that cave is not built yet) */
(function () {
  'use strict';
  const base = { r: 8, maxV: 255, acc: 1050, energy: 100, chirpR: 420, chirpCd: 0.6, chirpRays: 200, shriekR: 840, shriekCd: 3,
    shriekRays: 320, echoLife: 2.2, drain: 1, bumpStun: 0.3, trailLag: 9, eatR: 21, pupR: 26, glideDamp: 1.9, steerDamp: 1.1 };
  const S = o => Object.assign({}, base, o);
  window.PP.data.bats = [
    {
      id: 'pip', name: 'Pip', species: 'Common pipistrelle', latin: 'Pipistrellus pipistrellus',
      ability: { id: 'steady', name: 'Steady', text: 'Shortest stun after a bump, and pups follow tightest.' },
      blurb: 'A thumb-sized bat with a big heart. Light, quick and forgiving.',
      stats: S({ bumpStun: 0.2, trailLag: 7 }),
      look: { fur: '#6e4a62', belly: '#a77f8c', wing: '#3d2350', wingHi: 'rgba(150,96,140,0.35)', bone: '#e0a85a', inner: '#eaa070', edge: '#ffc45e', eyeGlow: '#ffc35a',
        ear: 1, earW: 1, earTip: 0.9, noseleaf: 0, span: 1, chord: 1, flap: 1, size: 1, feet: 1, tragus: 0 },
      arrives: null, heard: ['moths', 'pups'],
    },
    {
      id: 'skimmer', name: 'Skimmer', species: "Daubenton's bat", latin: 'Myotis daubentonii',
      ability: { id: 'skim', name: 'Skim', text: 'Fast and low over water; ignores currents and splashes. Water echoes last twice as long.' },
      blurb: 'Trawls still water for insects with its big feet, a hand-width above the surface.',
      stats: S({ maxV: 260, acc: 1000 }),
      look: { fur: '#76695f', belly: '#cdbfa8', wing: '#2b3242', wingHi: 'rgba(140,170,200,0.3)', bone: '#9fb6cc', inner: '#d19a90', edge: '#a9e4ff', eyeGlow: '#7fe3ff',
        ear: 0.82, earW: 0.9, earTip: 0.6, noseleaf: 0, span: 1.08, chord: 0.95, flap: 1.05, size: 1, feet: 2.1, tragus: 0 },
      arrives: { after: '1-6' }, heard: ['water'],
    },
    {
      id: 'hark', name: 'Hark', species: 'Brown long-eared bat', latin: 'Plecotus auritus',
      ability: { id: 'hark', name: 'Hark', text: 'Hears moths, pups, owls and drips within 320 px as sound sparks every 1.2 s. Whisper chirps never wake owls. Hovers.' },
      blurb: 'Ears nearly as long as its body. It hears a moth walking on a leaf.',
      stats: S({ r: 9, maxV: 220, acc: 950, chirpR: 360, shriekR: 720, shriekCd: 3.5, echoLife: 3.0, drain: 0.9, glideDamp: 4.2 }),
      look: { fur: '#9a7b62', belly: '#d8c2a6', wing: '#45333f', wingHi: 'rgba(180,140,130,0.3)', bone: '#e2b49a', inner: '#eba6a8', edge: '#ffc9a8', eyeGlow: '#ffcf86',
        ear: 2.35, earW: 1.45, earTip: 0.35, noseleaf: 0, span: 0.95, chord: 1.15, flap: 0.85, size: 1.05, feet: 1, tragus: 1 },
      arrives: { after: '2-3' }, heard: ['owls', 'moths', 'drips'],
    },
    {
      id: 'comb', name: 'Comb', species: "Natterer's bat", latin: 'Myotis nattereri',
      ability: { id: 'glean', name: 'Glean', text: 'Plucks moths off walls without bumping, turns tightest, and squeezes through narrow gaps.' },
      blurb: 'A fringe of stiff hairs along its tail combs insects off the stone.',
      stats: S({ r: 6.5, maxV: 235, acc: 1400, energy: 95, chirpR: 400, chirpCd: 0.55, shriekR: 800, echoLife: 2.4, drain: 0.95, steerDamp: 1.6, eatR: 26 }),
      look: { fur: '#a39588', belly: '#efe6da', wing: '#353442', wingHi: 'rgba(200,190,180,0.28)', bone: '#d6dcea', inner: '#e7b3a8', edge: '#eef3ff', eyeGlow: '#c9dcff',
        ear: 1.25, earW: 0.85, earTip: 0.8, noseleaf: 0, span: 0.9, chord: 1.2, flap: 1.2, size: 0.9, feet: 1, tragus: 0.6, fringe: 1 },
      arrives: { after: '3-2' }, heard: ['moths', 'webs'],
    },
    {
      id: 'gale', name: 'Gale', species: 'Noctule', latin: 'Nyctalus noctula',
      ability: { id: 'bolt', name: 'Bolt', text: 'Flick to dash 200 px (tears webs, outruns a swoop). Big chirp. Loud: chirps wake light sleepers.' },
      blurb: 'The first bat out at dusk, high and fast on long narrow wings.',
      stats: S({ r: 10, maxV: 330, acc: 1300, energy: 120, chirpR: 560, chirpCd: 0.8, shriekR: 1100, shriekCd: 3.5, echoLife: 1.8, drain: 1.25 }),
      look: { fur: '#b4733f', belly: '#d9a066', wing: '#3a2018', wingHi: 'rgba(200,120,70,0.25)', bone: '#e08a4a', inner: '#8a4a36', edge: '#ff9548', eyeGlow: '#ffae4a',
        ear: 0.75, earW: 1.15, earTip: 1.2, noseleaf: 0, span: 1.32, chord: 0.72, flap: 0.8, size: 1.12, feet: 0.9, tragus: 0 },
      arrives: { after: '3-6' }, heard: ['owls'],
    },
  ];
  window.PP.batById = id => window.PP.data.bats.find(b => b.id === id) || window.PP.data.bats[0];
})();
