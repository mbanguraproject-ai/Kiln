/* Biome 1: Chalk Hollows, the teaching biome. The pale throat of the hill, where moonlight still reaches.
 * This file is the reference implementation of the biome interface in docs/BIOMES.md. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;

  // seeded note strings for the song (a scale degree per step, '.' rests)
  function notes(seed, n, p, pool) { const r = Kit.rng(seed), out = []; for (let i = 0; i < n; i++) out.push(r.chance(p) ? String(r.pick(pool)) : '.'); return out.join(' '); }

  PP.registerBiome({
    id: 'chalk', index: 1, ready: true,
    name: 'Chalk Hollows',
    line: 'The pale throat of the hill, where moonlight still reaches.',
    palette: {
      sky: [[0, '#05070d'], [0.5, '#0b0f1c'], [1, '#07080e']],
      dark: '#030409', darkAlpha: 0.94,
      rock: ['#24262e', '#1b1d25', '#13151c'],
      rim: '#4b4d58', texture: '#d8d1bb',
      strata: { light: 'rgba(216,209,187,0.10)', dark: 'rgba(2,3,8,0.42)', band: 'rgba(216,209,187,0.07)', flint: '#0b0d14', flintHi: 'rgba(160,170,200,0.35)' },
      sil: ['#0b0f1d', '#10141f'], silLit: ['#173a3e', '#24585a'], glowworm: '#9fe8ff', fg: '#010206', vignette: '#04060f',
      moon: '#dfe8ff', arch: ['#0b1a3e', '#27427a', '#3b5a94'], water: ['#0b2150', '#040a1c'], accent: '#d9b77a',
    },
    // chalk: pale bands with rows of dark flint nodules, and (High and Ultra) fossil urchins, ammonites and claw marks.
    // painter(g, P) paints one 256 px chunk inside the rock (source-atop); P: { x0, y0, x1, y1, lv, pal, tier, d,
    // rng, near(fn(rng, cx, cy)) for decorations that cross chunk edges, minW(w) }
    painter(g, P) {
      const S = P.pal.strata, TAU = Math.PI * 2;
      // strata: long wavy bands, continuous across chunks because they are functions of world x
      for (let k = Math.floor(P.y0 / 46) - 1; k <= Math.ceil(P.y1 / 46) + 1; k++) {
        const base = k * 46 + Math.sin(k * 12.9898) * 14, w = 5 + Math.abs(Math.sin(k * 3.7)) * 12;
        g.strokeStyle = k % 3 === 0 ? S.band : 'rgba(0,0,0,0.18)';
        g.lineWidth = w;
        g.beginPath();
        for (let x = P.x0 - 16; x <= P.x1 + 16; x += 16) g.lineTo(x, base + Math.sin(x * 0.004 + k) * 14 + Math.sin(x * 0.017 + k * 2.1) * 4);
        g.stroke();
      }
      P.near((r, cx, cy) => {
        // soft light and dark blotches
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rad = r.range(40, 150), lite = r.chance(0.5);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? S.light : S.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // a row of flint nodules along a band
        if (r.chance(0.7)) {
          const y = cy + r.range(20, 236), x = cx + r.range(0, 120), n = r.int(3, 7);
          for (let k = 0; k < n; k++) {
            const fx = x + k * r.range(18, 34), fy = y + Math.sin(fx * 0.004) * 14 + r.range(-4, 4), rx = r.range(5, 12), ry = rx * r.range(0.5, 0.8);
            g.fillStyle = S.flint; g.beginPath(); g.ellipse(fx, fy, rx, ry, r.range(-0.3, 0.3), 0, TAU); g.fill();
            g.strokeStyle = S.flintHi; g.lineWidth = P.minW(1.2); g.beginPath(); g.ellipse(fx, fy, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
          }
        }
        // hairline cracks
        g.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), len = r.range(20, 90), a = r.range(-0.4, 0.4) + (r.chance(0.3) ? 1.4 : 0);
          g.lineWidth = P.minW(r.range(1, 2.4));
          g.strokeStyle = r.chance(0.5) ? S.light : S.dark;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + r.range(-6, 6), y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
        }
        // fossils and old claw marks (High and Ultra)
        if (P.tier.decals && r.chance(0.45)) {
          const x = cx + r.range(20, 236), y = cy + r.range(20, 236), kind = r.int(0, 2);
          g.strokeStyle = 'rgba(232,224,200,0.16)'; g.fillStyle = 'rgba(232,224,200,0.12)'; g.lineWidth = P.minW(1.4);
          if (kind === 0) { // a shepherd's crown (fossil urchin)
            const rr = r.range(7, 11);
            g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
            for (let a = 0; a < 5; a++) { const an = a / 5 * TAU; for (let q = 1; q <= 3; q++) { g.beginPath(); g.arc(x + Math.cos(an) * rr * q / 3.6, y + Math.sin(an) * rr * q / 3.6, P.minW(0.9), 0, TAU); g.fill(); } }
          } else if (kind === 1) { // an ammonite
            g.beginPath();
            for (let t = 0; t < 14; t += 0.25) { const rr = 1.2 + t * 0.9; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
            g.stroke();
          } else { // claw marks
            const a = r.range(-0.6, 0.6);
            g.beginPath();
            for (let c = 0; c < 3; c++) { const ox = c * 5; g.moveTo(x + ox, y); g.lineTo(x + ox + Math.sin(a) * 22, y + Math.cos(a) * 22); }
            g.stroke();
          }
        }
      });
    },
    parallax: [
      { seed: 11, tw: 560, th: 520, depth: 0.22, band: 0.42, spikes: 24, columns: 2 },
      { seed: 23, tw: 720, th: 640, depth: 0.45, band: 0.42, spikes: 34, columns: 1 },
    ],
    ambient: { motes: { color: '#dfe8ff', drift: -14 }, shafts: 2, glowworms: true, crickets: true },
    hazards: ['webs', 'stals', 'drips', 'river', 'crystal', 'gust', 'owls'],
    gen: { drain: 1.55, rad: 114, H: 1120, screens: 8, moths: 22, branches: 3, loops: 0.25 },
    audio: {
      echo: { verb: 0.3, cut: 4200 },
      ambience: { wind: 0.5, crickets: true, owlFar: true },
      song: {
        bpm: 72, swing: 0.05, key: 'D', scale: 'dorian', steps: 16, chords: [0, 3, 6, 4],
        tracks: [
          { name: 'drone', inst: 'pad', chord: true, wave: 'sine', cutoff: 640, attack: 1.8, release: 2.6, vol: 0.5, verb: 0.6 },
          { name: 'low', inst: 'bass', notes: '0 - - - - - - - - - - - - - - -', follow: true, wave: 'sine', cutoff: 220, vol: 0.4, oct: -1 },
          { name: 'pluck', inst: 'pluck', notes: notes(71, 32, 0.24, [0, 2, 3, 4, 6, 7, 9]), follow: true, wave: 'triangle', vol: 0.36, delay: 0.62, verb: 0.45, oct: 1 },
          { name: 'drips', inst: 'pluck', notes: notes(72, 64, 0.1, [7, 9, 10, 11, 14]), wave: 'sine', vol: 0.22, delay: 0.35, verb: 0.6, oct: 2, gate: 0.2 },
          { name: 'pups', inst: 'lead', notes: '4 . 2 . 0 . . . 2 . 4 . 2 . . . 4 . 5 . 4 . 2 . 0 . . . . . . .', wave: 'triangle', vol: 0.2, verb: 0.5, oct: 1, on: false },
          { name: 'danger', inst: 'bass', notes: '0 . . 0 . . 0 . 0 . . 0 . . 0 .', follow: true, wave: 'triangle', cutoff: 380, gate: 0.4, vol: 0.34, on: false },
          { name: 'exit', inst: 'bell', notes: '7 . . 9 . . 11 . . . 9 . 7 . . . 4 . . 7 . . 9 . . . . . . . . .', vol: 0.42, oct: 1, on: false },
          { name: 'deep', inst: 'pluck', notes: notes(73, 16, 0.4, [0, 3, 4, 7]), follow: true, wave: 'square', cutoff: 900, vol: 0.12, oct: 0, gate: 0.3, on: false },
        ],
      },
    },
    // the short eventful flight home at the end of the biome (skippable after the first viewing)
    flight: { time: 20, title: 'The flight home', line: 'The colony comes out to meet you.', owl: true, colony: true },

    caves: [
      {
        id: '1-1', name: 'First Flight', seed: 1101, mission: 'homing',
        screens: 9, H: 1040, rad: 120, moths: 24, drain: 1.5, branches: 2, loops: 0,
        pups: [{ at: 0.36 }],
        hazards: {},
        moons: [{ type: 'home' }, { type: 'pups', n: 1 }, { type: 'time', max: 75 }],
        intro: 'Chirp to see in the dark', tutorial: true, heardWell: ['hark'],
        scratch: { at: 0.52, text: 'We came in with the rain. Mother said: sing, and the stone sings back.' },
      },
      {
        id: '1-2', name: 'Little Voices', seed: 1202, mission: 'kin',
        screens: 9, H: 1080, rad: 116, moths: 23, drain: 1.52, branches: 3, loops: 0,
        pups: [{ at: 'chamber' }, { at: 'chamber' }, { at: 'chamber' }],
        hazards: {},
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'bumps', max: 3 }],
        intro: 'Lost pups answer your call: follow the pink', heardWell: ['hark', 'pip'],
        scratch: { at: 0.3, text: 'The little ones answer before you see them. Listen for the pink.' },
      },
      {
        id: '1-3', name: 'The Loud Dark', seed: 1303, mission: 'kin',
        screens: 10, H: 1120, rad: 112, moths: 22, drain: 1.55, branches: 3, loops: 0,
        pups: [{ at: 'chamber' }, { at: 'chamber', deep: true }, { at: 0.56 }],
        hazards: { stals: { n: 6, from: 0.6, to: 0.94, stage: 0.17 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'calls', max: 12 }],
        intro: 'Hold still to shriek: deep sleepers only wake to a shriek', heardWell: ['gale', 'hark'],
        scratch: { at: 0.4, text: 'Loud voices wake old stone. Loud voices also find the lost.' },
      },
      {
        id: '1-4', name: 'Chalk Map', seed: 1404, mission: 'homing',
        screens: 10, H: 1180, rad: 110, moths: 23, drain: 1.6, branches: 4, loops: 0.3,
        pups: [{ at: 'chamber' }, { at: 'chamber' }],
        hazards: { stals: { n: 4, from: 0.3, to: 0.92 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'survey', pct: 80 }],
        intro: 'Every wall you hear is drawn on your map', heardWell: ['gale'],
        scratch: { at: 'chamber', text: 'Every wall you hear is a wall you will not hit.' },
      },
      {
        id: '1-5', name: 'Silk Gallery', seed: 1505, mission: 'homing',
        screens: 10, H: 1200, rad: 106, moths: 32, drain: 1.65, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 0.45 }, { at: 'chamber' }],
        hazards: { webs: { n: 5, from: 0.5, to: 0.95, stage: 0.14 }, drips: { n: 5, from: 0.2, to: 0.75 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'larder', n: 25 }],
        intro: 'Webs hold you: wiggle free. A drip paints the stone it lands on', heardWell: ['comb', 'hark'],
        scratch: { at: 0.62, text: 'The silk is patient. Be wigglier than the silk.' },
      },
      {
        id: '1-6', name: 'The Chalk Stair Falls', seed: 1606, mission: 'escape', setPiece: true,
        screens: 15, H: 1180, rad: 116, moths: 26, drain: 1.6, branches: 1, loops: 0,
        pups: [{ at: 0.3, ledge: true }, { at: 0.55, ledge: true }, { at: 0.8, ledge: true }],
        hazards: { collapse: { delay: 4, x0: -240, v0: 90, v1: 140, ramp: 50 }, stals: { n: 3, from: 0.4, to: 0.9 }, webs: { n: 2, from: 0.55, to: 0.9 } },
        moons: [{ type: 'escape' }, { type: 'pups', all: true }, { type: 'untouched' }],
        intro: 'The ceiling is coming down behind you. Fly!', heardWell: ['gale'],
        scratch: { at: 0.68, text: 'The stair fell behind us. We did not look back. We flew.' },
      },
    ],
  });
})();
