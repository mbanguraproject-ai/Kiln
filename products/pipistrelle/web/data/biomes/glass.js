/* Biome 3: The Glass Vaults. Where the hill's bones turned to glass. Crystals hold your echo and ring it back, so
 * this biome is lit by your own voice (crystalHold: a lit cluster glows for about four seconds and dims slowly).
 * New things to listen for: crystal bells, which free pups sealed in amber when an echo reaches them, and tiger
 * moths, which click back and scramble every echo near them (js/hazards/glass.js). */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;

  function notes(seed, n, p, pool) { const r = Kit.rng(seed), out = []; for (let i = 0; i < n; i++) out.push(r.chance(p) ? String(r.pick(pool)) : '.'); return out.join(' '); }

  PP.registerBiome({
    id: 'glass', index: 3, ready: true,
    name: 'The Glass Vaults',
    line: 'Crystals that hold your echo and ring it back.',
    crystalHold: 4,
    palette: {
      sky: [[0, '#06040c'], [0.5, '#0d0818'], [1, '#07040d']],
      dark: '#030208', darkAlpha: 0.94,
      rock: ['#1d1630', '#161026', '#0f0b1b'],
      rim: '#4d4373', texture: '#c9b8ff',
      strata: { light: 'rgba(200,180,255,0.09)', dark: 'rgba(3,1,10,0.45)', band: 'rgba(200,180,255,0.07)', flint: '#0b0816', flintHi: 'rgba(210,190,255,0.35)' },
      sil: ['#0c0818', '#120c22'], silLit: ['#2c2357', '#43357a'], glowworm: '#d6c8ff', fg: '#020106', vignette: '#0a0412',
      moon: '#e4dcff', arch: ['#160e36', '#3b2a78', '#5a45a6'], water: ['#1a1450', '#06041a'], accent: '#b48cff',
    },
    // glass-shot stone: agate bands curving round hidden geodes, white quartz veins, and (High and Ultra) clusters
    // of tiny crystals that catch the light
    painter(g, P) {
      const S = P.pal.strata, TAU = Math.PI * 2;
      P.near((r, cx, cy) => {
        // soft violet blotches
        for (let k = 0; k < 3; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rad = r.range(50, 150), lite = r.chance(0.5);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? S.light : S.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // agate: nested rings round a buried geode
        if (r.chance(0.6)) {
          const x = cx + r.range(30, 226), y = cy + r.range(30, 226), n = r.int(4, 8), rx = r.range(22, 48), ry = rx * r.range(0.55, 0.9), rot = r.range(0, Math.PI);
          for (let q = 0; q < n; q++) {
            g.strokeStyle = q % 2 ? 'rgba(210,190,255,0.10)' : 'rgba(0,0,0,0.25)';
            g.lineWidth = P.minW(r.range(1.5, 3.5));
            g.beginPath(); g.ellipse(x, y, rx * (1 - q / (n + 1)), ry * (1 - q / (n + 1)), rot, 0, TAU); g.stroke();
          }
        }
        // white quartz veins
        g.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), len = r.range(40, 130), a = r.range(0, Math.PI);
          g.strokeStyle = 'rgba(235,228,255,0.12)';
          g.lineWidth = P.minW(r.range(1.2, 2.6));
          g.beginPath(); g.moveTo(x, y);
          for (let s = 1; s <= 5; s++) g.lineTo(x + Math.cos(a) * len * s / 5 + r.range(-6, 6), y + Math.sin(a) * len * s / 5 + r.range(-6, 6));
          g.stroke();
        }
        // crystal druse (High and Ultra)
        if (P.tier.decals && r.chance(0.55)) {
          const x = cx + r.range(20, 236), y = cy + r.range(20, 236);
          for (let q = 0; q < r.int(5, 11); q++) {
            const a = r.range(0, TAU), len = r.range(3, 8), bx = x + r.range(-10, 10), by = y + r.range(-10, 10);
            g.fillStyle = q % 3 ? 'rgba(190,160,255,0.22)' : 'rgba(255,255,255,0.22)';
            g.beginPath(); g.moveTo(bx - Math.sin(a) * 1.6, by + Math.cos(a) * 1.6); g.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); g.lineTo(bx + Math.sin(a) * 1.6, by - Math.cos(a) * 1.6); g.closePath(); g.fill();
          }
        }
      });
    },
    parallax: [
      { seed: 51, tw: 580, th: 540, depth: 0.22, band: 0.44, spikes: 30, columns: 1 },
      { seed: 57, tw: 740, th: 650, depth: 0.45, band: 0.44, spikes: 40, columns: 2 },
    ],
    ambient: { motes: { color: '#e2d6ff', drift: -6 }, shafts: 0, glowworms: false },
    hazards: ['crystal', 'bells', 'tiger', 'webs', 'stals', 'drips'],
    gen: { drain: 1.62, rad: 112, H: 1180, screens: 10, moths: 24, branches: 3, loops: 0.25 },
    audio: {
      echo: { verb: 0.7, cut: 5200 },
      ambience: { hum: 0.5 },
      song: {
        bpm: 76, swing: 0.06, key: 'F', scale: 'lydian', steps: 16, chords: [0, 1, 4, 3],
        tracks: [
          { name: 'pad', inst: 'pad', chord: true, wave: 'sine', cutoff: 900, attack: 1.6, release: 2.4, vol: 0.42, verb: 0.7 },
          { name: 'low', inst: 'bass', notes: '0 - - - - - - - . . . . 4 - - -', follow: true, wave: 'sine', cutoff: 240, vol: 0.36, oct: -1 },
          { name: 'arp', inst: 'pluck', notes: notes(301, 32, 0.32, [0, 2, 4, 6, 7, 9, 11]), follow: true, wave: 'triangle', vol: 0.3, delay: 0.5, verb: 0.6, oct: 1 },
          { name: 'glass', inst: 'bell', notes: notes(302, 64, 0.08, [7, 9, 11, 12, 14]), vol: 0.22, verb: 0.8, oct: 2 },
          { name: 'pups', inst: 'lead', notes: '4 . 6 . 7 . . . 6 . 4 . 2 . . . 4 . 6 . 9 . 7 . 4 . . . . . . .', wave: 'triangle', vol: 0.2, verb: 0.6, oct: 1, on: false },
          { name: 'danger', inst: 'bass', notes: '0 . . 0 . 0 . . 0 . . 0 . 0 . .', follow: true, wave: 'triangle', cutoff: 420, gate: 0.4, vol: 0.32, on: false },
          { name: 'exit', inst: 'bell', notes: '7 . . 11 . . 12 . . . 11 . 9 . . . 7 . . 9 . . 11 . . . . . . . . .', vol: 0.42, oct: 1, on: false },
          { name: 'deep', inst: 'pluck', notes: notes(303, 16, 0.4, [0, 4, 6, 7]), follow: true, wave: 'square', cutoff: 1100, vol: 0.1, oct: 0, gate: 0.3, on: false },
        ],
      },
    },
    flight: { time: 18, title: 'Up through the rain', line: 'Behind you the crystals are still ringing.', owl: true, colony: true },

    caves: [
      {
        id: '3-1', name: 'The Prism Door', seed: 3101, mission: 'homing',
        screens: 9, H: 1120, rad: 116, moths: 24, drain: 1.58, branches: 2, loops: 0.1,
        pups: [{ at: 0.45 }],
        hazards: { crystal: { chamber: true, patches: 3 } },
        moons: [{ type: 'home' }, { type: 'pups', n: 1 }, { type: 'calls', max: 14 }],
        intro: 'Crystals hold your echo and ring it back: let them light the way', heardWell: ['comb', 'gale'],
        scratch: { at: 0.55, text: 'The glass remembers every voice. Sing once, and it sings for you twice.' },
      },
      {
        id: '3-2', name: 'Bellringer', seed: 3202, mission: 'kin',
        screens: 10, H: 1160, rad: 112, moths: 24, drain: 1.6, branches: 3, loops: 0.15,
        pups: [{ at: 'chamber', sealed: true }, { at: 'chamber', sealed: true }, { at: 0.6, sealed: true }],
        hazards: { crystal: { chamber: false, patches: 2 }, bells: {} },
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'time', max: 100 }],
        intro: 'Pups sealed in amber: ring their bell with your echo to free them', heardWell: ['gale', 'hark'],
        scratch: { at: 0.4, text: 'Each little one has a bell. Call, and listen for the one that answers.' },
      },
      {
        id: '3-3', name: 'The Glass Gallery', seed: 3303, mission: 'homing',
        screens: 10, H: 1180, rad: 108, moths: 24, drain: 1.62, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 'chamber' }, { at: 0.7 }],
        hazards: { crystal: { chamber: true, patches: 2 }, webs: { n: 4, from: 0.35, to: 0.9 }, stals: { n: 4, from: 0.25, to: 0.9 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'bumps', max: 3 }],
        intro: 'Silk across the glass, stone above it', heardWell: ['comb'],
        scratch: { at: 0.62, text: 'The spiders love the glass. It shows them where we fly.' },
      },
      {
        id: '3-4', name: 'The Geode Map', seed: 3404, mission: 'homing',
        screens: 10, H: 1220, rad: 108, moths: 24, drain: 1.64, branches: 4, loops: 0.3,
        pups: [{ at: 'chamber' }, { at: 'chamber' }],
        hazards: { crystal: { chamber: true, patches: 3 }, stals: { n: 3, from: 0.3, to: 0.9 }, drips: { n: 3 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'survey', pct: 75 }],
        intro: 'Light the geodes and see the whole vault', heardWell: ['gale', 'hark'],
        scratch: { at: 'chamber', text: 'Whole rooms of glass, hidden in the stone like seeds in a fruit.' },
      },
      {
        id: '3-5', name: 'Jammers', seed: 3505, mission: 'homing',
        screens: 10, H: 1200, rad: 108, moths: 28, drain: 1.66, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 0.5 }],
        hazards: { tiger: { n: 7, from: 0.12, to: 0.9 }, crystal: { chamber: false, patches: 2 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'tigers', n: 6 }],
        intro: 'Tiger moths click back and scramble your echoes: find them by the noise', heardWell: ['hark', 'comb'],
        scratch: { at: 0.45, text: 'Some moths shout back. Where the echoes fall apart, supper is waiting.' },
      },
      {
        id: '3-6', name: 'The Chorister', seed: 3606, mission: 'kin', setPiece: true,
        screens: 13, H: 1240, rad: 112, moths: 30, drain: 1.62, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber', sealed: true }, { at: 0.5, sealed: true }, { at: 'chamber', sealed: true }],
        hazards: { crystal: { chamber: false, patches: 3 }, bells: {}, tiger: { n: 3, from: 0.3, to: 0.85 }, webs: { n: 2, from: 0.55, to: 0.9 } },
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'calls', max: 18 }],
        intro: 'The great glass choir: three bells, three pups in amber', heardWell: ['gale', 'hark'],
        scratch: { at: 0.72, text: 'When the choir sings all three, the vault opens like a flower.' },
      },
    ],
  });
})();
