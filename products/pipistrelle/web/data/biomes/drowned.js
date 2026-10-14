/* Biome 2: The Drowned Halls. Water, and a flood that rises behind you. Half air, half black water, and everything
 * echoes back off the surface. New things to listen for: the current (rivers drag you along the surface), the
 * siphons' gurgle (they pull you under; their bubbles rise before you are close), and the pale cavefish that flash
 * silver in your echo. The set piece, The Flood Stair, is an escape from the rising water (js/hazards/tide.js). */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;

  function notes(seed, n, p, pool) { const r = Kit.rng(seed), out = []; for (let i = 0; i < n; i++) out.push(r.chance(p) ? String(r.pick(pool)) : '.'); return out.join(' '); }

  PP.registerBiome({
    id: 'drowned', index: 2, ready: true,
    name: 'The Drowned Halls',
    line: 'Water, and a flood that rises behind you.',
    palette: {
      sky: [[0, '#02070b'], [0.5, '#06131a'], [1, '#030a10']],
      dark: '#01060a', darkAlpha: 0.95,
      rock: ['#13232a', '#0f1c22', '#0a1419'],
      rim: '#3a5a66', texture: '#9fc8d6',
      strata: { light: 'rgba(160,210,225,0.09)', dark: 'rgba(0,4,8,0.45)', band: 'rgba(170,215,230,0.08)', flint: '#06121a', flintHi: 'rgba(150,200,230,0.32)' },
      sil: ['#07141c', '#0a1a22'], silLit: ['#123d48', '#1f5a66'], glowworm: '#a9e6ff', fg: '#00050a', vignette: '#020c10',
      moon: '#cfe6ff', arch: ['#082238', '#1f4a6e', '#33658f'], water: ['#0a2a52', '#030b1c'], accent: '#7fb8d8',
    },
    // wet stone: tide lines where the water once stood, flowstone curtains streaked down the walls, and (High and
    // Ultra) the white crust of calcite rafts and the lace of old ripple marks
    painter(g, P) {
      const S = P.pal.strata, TAU = Math.PI * 2;
      // tide lines: level bands, continuous across chunks because they are functions of world y
      for (let k = Math.floor(P.y0 / 70) - 1; k <= Math.ceil(P.y1 / 70) + 1; k++) {
        const y = k * 70 + Math.sin(k * 7.13) * 18;
        g.strokeStyle = k % 2 ? S.band : 'rgba(0,0,0,0.22)';
        g.lineWidth = k % 2 ? 3 + Math.abs(Math.sin(k * 2.3)) * 5 : 9;
        g.beginPath();
        for (let x = P.x0 - 16; x <= P.x1 + 16; x += 16) g.lineTo(x, y + Math.sin(x * 0.0021 + k) * 3);
        g.stroke();
      }
      P.near((r, cx, cy) => {
        // soft wet blotches
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rad = r.range(50, 160), lite = r.chance(0.45);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? S.light : S.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // flowstone curtains: bundles of streaks running down the stone
        g.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(-40, 200), n = r.int(3, 7), len = r.range(40, 140);
          for (let s = 0; s < n; s++) {
            const sx = x + s * r.range(3, 7), sl = len * r.range(0.6, 1.1);
            g.strokeStyle = s % 2 ? S.light : 'rgba(150,205,225,0.06)';
            g.lineWidth = P.minW(r.range(1.4, 3.2));
            g.beginPath(); g.moveTo(sx, y); g.quadraticCurveTo(sx + r.range(-4, 4), y + sl * 0.5, sx + r.range(-3, 3), y + sl); g.stroke();
            // a bead of water at the tip
            g.fillStyle = 'rgba(190,230,245,0.14)';
            g.beginPath(); g.arc(sx, y + sl, P.minW(1.6), 0, TAU); g.fill();
          }
        }
        // hairline seams
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), len = r.range(20, 80), a = r.range(-0.3, 0.3);
          g.lineWidth = P.minW(r.range(1, 2));
          g.strokeStyle = S.dark;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
        }
        // calcite rafts and ripple marks (High and Ultra)
        if (P.tier.decals && r.chance(0.5)) {
          const x = cx + r.range(20, 236), y = cy + r.range(20, 236);
          if (r.chance(0.5)) {
            g.fillStyle = 'rgba(225,240,245,0.13)';
            for (let q = 0; q < r.int(4, 9); q++) { g.beginPath(); g.ellipse(x + r.range(-20, 20), y + r.range(-6, 6), r.range(3, 8), r.range(1.5, 3), r.range(-0.2, 0.2), 0, TAU); g.fill(); }
          } else {
            g.strokeStyle = 'rgba(190,225,240,0.12)'; g.lineWidth = P.minW(1.2);
            for (let q = 0; q < 4; q++) { g.beginPath(); for (let t = 0; t <= 1; t += 0.1) g.lineTo(x - 24 + t * 48, y + q * 6 + Math.sin(t * 9 + q) * 2); g.stroke(); }
          }
        }
      });
    },
    parallax: [
      { seed: 31, tw: 600, th: 560, depth: 0.22, band: 0.4, spikes: 18, columns: 3 },
      { seed: 37, tw: 760, th: 660, depth: 0.45, band: 0.42, spikes: 26, columns: 2 },
    ],
    ambient: { motes: { color: '#bfe2f0', drift: 5 }, shafts: 0, glowworms: false, fish: true },
    hazards: ['river', 'flood', 'drips', 'siphon', 'tide', 'stals', 'webs'],
    gen: { drain: 1.6, rad: 114, H: 1160, screens: 9, moths: 24, branches: 3, loops: 0.2, layout: 'halls' },
    audio: {
      echo: { verb: 0.55, cut: 3200 },
      ambience: { lap: 0.8 },
      song: {
        bpm: 60, swing: 0.04, key: 'B', scale: 'minor', steps: 16, chords: [0, 5, 3, 4],
        tracks: [
          { name: 'choir', inst: 'pad', chord: true, wave: 'sine', cutoff: 520, attack: 2.6, release: 3.2, vol: 0.5, verb: 0.75 },
          { name: 'low', inst: 'bass', notes: '0 - - - - - - - 0 - - - - - - -', follow: true, wave: 'sine', cutoff: 180, vol: 0.42, oct: -1 },
          { name: 'pluck', inst: 'pluck', notes: notes(201, 32, 0.2, [0, 2, 3, 5, 7, 10]), follow: true, wave: 'triangle', vol: 0.32, delay: 0.75, verb: 0.6, oct: 1 },
          { name: 'drips', inst: 'pluck', notes: notes(202, 64, 0.12, [7, 9, 10, 12, 14]), wave: 'sine', vol: 0.2, delay: 0.5, verb: 0.7, oct: 2, gate: 0.18 },
          { name: 'pups', inst: 'lead', notes: '4 . 3 . 0 . . . 3 . 4 . 7 . . . 4 . 5 . 4 . 3 . 0 . . . . . . .', wave: 'triangle', vol: 0.2, verb: 0.6, oct: 1, on: false },
          { name: 'danger', inst: 'bass', notes: '0 . 0 . . 0 . . 0 . 0 . . 0 . .', follow: true, wave: 'triangle', cutoff: 340, gate: 0.4, vol: 0.36, on: false },
          { name: 'exit', inst: 'bell', notes: '7 . . 9 . . 10 . . . 9 . 7 . . . 3 . . 7 . . 9 . . . . . . . . .', vol: 0.4, oct: 1, on: false },
          { name: 'deep', inst: 'pluck', notes: notes(203, 16, 0.38, [0, 3, 5, 7]), follow: true, wave: 'square', cutoff: 760, vol: 0.11, oct: 0, gate: 0.3, on: false },
        ],
      },
    },
    flight: { time: 18, title: 'Out over the river', line: 'The rain has stopped. The colony waits on the bank.', owl: false, colony: true },

    caves: [
      {
        id: '2-1', name: 'The Weeping Stair', seed: 2101, mission: 'homing',
        screens: 9, H: 1100, rad: 118, moths: 24, drain: 1.55, branches: 2, loops: 0,
        pups: [{ at: 0.42 }],
        hazards: { river: { at: [[0.24, 0.34], [0.58, 0.68]], level: 0.4 }, drips: { n: 3, from: 0.15, to: 0.6 } },
        moons: [{ type: 'home' }, { type: 'pups', n: 1 }, { type: 'dry' }],
        intro: 'Water echoes blue. Skim it and you splash', heardWell: ['skimmer'],
        scratch: { at: 0.5, text: 'The rain came down the stair for nine nights. We learned to fly high.' },
      },
      {
        id: '2-2', name: 'Fish Lanterns', seed: 2202, mission: 'kin',
        screens: 10, H: 1140, rad: 114, moths: 24, drain: 1.58, branches: 3, loops: 0.1,
        pups: [{ at: 'chamber' }, { at: 'chamber' }, { at: 0.62 }],
        hazards: { river: { at: [[0.22, 0.32], [0.5, 0.6], [0.74, 0.82]], level: 0.38 }, drips: { n: 3 } },
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'time', max: 85 }],
        intro: 'The pale fish flash in your echo. The current pulls along the surface', heardWell: ['skimmer', 'hark'],
        scratch: { at: 0.36, text: 'The pale fish see nothing. They hear everything. So do we.' },
      },
      {
        id: '2-3', name: 'The Siphon Pool', seed: 2303, mission: 'homing',
        screens: 10, H: 1160, rad: 112, moths: 23, drain: 1.6, branches: 3, loops: 0.15,
        pups: [{ at: 'chamber' }, { at: 'chamber' }],
        hazards: { river: { at: [[0.26, 0.36], [0.6, 0.7]], level: 0.36 }, siphon: { n: 1 }, stals: { n: 3, from: 0.4, to: 0.9 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'nosiphon' }],
        intro: 'Bubbles rise over a siphon: keep high, or it pulls you under', heardWell: ['skimmer', 'hark'],
        scratch: { at: 0.48, text: 'Where the water bubbles, the hill is drinking. Do not let it drink you.' },
      },
      {
        id: '2-4', name: 'The Drowned Map', seed: 2404, mission: 'homing',
        screens: 10, H: 1200, rad: 110, moths: 24, drain: 1.62, branches: 4, loops: 0.3,
        pups: [{ at: 'chamber' }, { at: 'chamber' }],
        hazards: { river: { at: [0.28, 0.38], level: 0.4 }, flood: { at: [0.62, 0.72] }, stals: { n: 3, from: 0.3, to: 0.9 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'survey', pct: 75 }],
        intro: 'Every wall you hear is drawn on your map, the water too', heardWell: ['gale', 'skimmer'],
        scratch: { at: 'chamber', text: 'Mother drew the halls in echoes, so the young would know the way home.' },
      },
      {
        id: '2-5', name: 'Twice-Heard', seed: 2505, mission: 'kin',
        screens: 10, H: 1200, rad: 108, moths: 32, drain: 1.65, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 0.5 }, { at: 'chamber', deep: true }],
        hazards: { river: { at: [[0.25, 0.35], [0.62, 0.72]], level: 0.38 }, siphon: { n: 1 }, webs: { n: 3, from: 0.45, to: 0.9 }, drips: { n: 4, from: 0.2, to: 0.8 } },
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'larder', n: 26 }],
        intro: 'Here every call comes back twice. Trust the first voice', heardWell: ['hark', 'comb'],
        scratch: { at: 0.64, text: 'Here every call comes back twice. Trust the first voice.' },
      },
      {
        id: '2-6', name: 'The Flood Stair', seed: 2606, mission: 'escape', layout: 'tunnel', setPiece: true,
        screens: 15, H: 1220, rad: 118, moths: 26, drain: 1.6, branches: 1, loops: 0,
        pups: [{ at: 0.3, ledge: true }, { at: 0.56, ledge: true }, { at: 0.8, ledge: true }],
        hazards: { tide: { delay: 4, x0: -260, v0: 85, v1: 128, ramp: 50, slope: 1.15 }, stals: { n: 3, from: 0.35, to: 0.9 }, drips: { n: 3, from: 0.1, to: 0.6 } },
        moons: [{ type: 'escape' }, { type: 'pups', all: true }, { type: 'tidefree' }],
        intro: 'The flood is coming up the stair. Fly high, fly on!', heardWell: ['gale'],
        scratch: { at: 0.7, text: 'When the hill floods, it floods fast. The arch is high. Go up, always up.' },
      },
    ],
  });
})();
