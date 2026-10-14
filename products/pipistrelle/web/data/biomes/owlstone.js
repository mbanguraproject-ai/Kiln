/* Biome 4: The Owlstone Crypt. A collapsed church crypt where worked stone ribs meet raw cave: bone dust, owl
 * feathers, moonlight falling through cracks. New things to listen for: owls that breathe in their sleep, light
 * sleepers that wake to a chirp and deep sleepers that wake only to a shriek, and decoys (a woken owl swoops at
 * the loudest sound, so a crystal's re-echo draws it away). The set piece is The Grey Lady, a great grey owl who
 * hunts by ear; she is outwitted, never harmed (js/hazards/greylady.js). */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;

  function notes(seed, n, p, pool) { const r = Kit.rng(seed), out = []; for (let i = 0; i < n; i++) out.push(r.chance(p) ? String(r.pick(pool)) : '.'); return out.join(' '); }

  PP.registerBiome({
    id: 'owlstone', index: 4, ready: true,
    name: 'The Owlstone Crypt',
    line: 'Old stone ribs, owl feathers, and something listening.',
    palette: {
      sky: [[0, '#07060a'], [0.5, '#100d12'], [1, '#08070a']],
      dark: '#040305', darkAlpha: 0.95,
      rock: ['#29231f', '#1f1a17', '#161210'],
      rim: '#5a4c42', texture: '#d9c7b0',
      strata: { light: 'rgba(220,200,175,0.09)', dark: 'rgba(5,3,2,0.45)', band: 'rgba(220,200,175,0.07)', flint: '#120e0c', flintHi: 'rgba(230,210,185,0.3)' },
      sil: ['#0e0b0b', '#141010'], silLit: ['#3a2f2a', '#54453c'], glowworm: '#ffd9a8', fg: '#030202', vignette: '#0a0605',
      moon: '#e8e2d6', arch: ['#1a1414', '#4a3b33', '#6e5a4c'], water: ['#1a1830', '#08070f'], accent: '#c9a27a',
    },
    // crypt stone: courses of cut blocks with mortar lines where the builders worked, raw rock elsewhere, and (High
    // and Ultra) carved ribs, feathers and the scratched owl marks the old colony left as a warning
    painter(g, P) {
      const S = P.pal.strata, TAU = Math.PI * 2;
      // masonry courses: block rows, continuous across chunks because they are functions of world position
      const BH = 34;
      for (let k = Math.floor(P.y0 / BH) - 1; k <= Math.ceil(P.y1 / BH) + 1; k++) {
        const y = k * BH, worked = Math.sin(k * 0.7) + Math.sin(Math.floor(P.x0 / 900) * 2.3 + k * 0.11) > 0.2;
        if (!worked) continue;
        g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = P.minW(2.2);
        g.beginPath(); g.moveTo(P.x0 - 8, y); g.lineTo(P.x1 + 8, y); g.stroke();
        const off = (k % 2) * 30;
        for (let x = Math.floor((P.x0 - off) / 60) * 60 + off; x < P.x1 + 60; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + BH); g.stroke(); }
        g.strokeStyle = S.band; g.lineWidth = P.minW(1.2);
        g.beginPath(); g.moveTo(P.x0 - 8, y + 2); g.lineTo(P.x1 + 8, y + 2); g.stroke();
      }
      P.near((r, cx, cy) => {
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rad = r.range(40, 150), lite = r.chance(0.45);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? S.light : S.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // cracks through the worked stone
        g.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256);
          g.strokeStyle = S.dark; g.lineWidth = P.minW(r.range(1, 2.2));
          g.beginPath(); g.moveTo(x, y);
          let px = x, py = y;
          for (let s = 0; s < 4; s++) { px += r.range(-14, 14); py += r.range(6, 18); g.lineTo(px, py); }
          g.stroke();
        }
        if (P.tier.decals && r.chance(0.5)) {
          const x = cx + r.range(24, 232), y = cy + r.range(24, 232), kind = r.int(0, 2);
          g.strokeStyle = 'rgba(235,220,200,0.15)'; g.fillStyle = 'rgba(235,220,200,0.11)'; g.lineWidth = P.minW(1.3);
          if (kind === 0) { // a carved rib, the springing of an arch
            g.beginPath(); g.arc(x, y + 30, 30, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
            g.beginPath(); g.arc(x, y + 30, 24, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
          } else if (kind === 1) { // a fallen feather
            const a = r.range(-0.8, 0.8);
            g.save(); g.translate(x, y); g.rotate(a);
            g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(0, -5, 12, 0); g.quadraticCurveTo(0, 5, -12, 0); g.fill();
            g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.stroke();
            g.restore();
          } else { // the old colony's warning: two eyes scratched in the stone
            for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 6, y, 4, 0, TAU); g.stroke(); }
            g.beginPath(); g.moveTo(x - 2, y + 5); g.lineTo(x, y + 9); g.lineTo(x + 2, y + 5); g.stroke();
          }
        }
      });
    },
    parallax: [
      { seed: 71, tw: 600, th: 560, depth: 0.22, band: 0.4, spikes: 14, columns: 4 },
      { seed: 77, tw: 780, th: 680, depth: 0.45, band: 0.4, spikes: 20, columns: 3 },
    ],
    ambient: { motes: { color: '#efe2cc', drift: -9 }, shafts: 3, glowworms: false },
    hazards: ['owls', 'greylady', 'crystal', 'webs', 'stals', 'drips'],
    gen: { drain: 1.66, rad: 110, H: 1200, screens: 10, moths: 24, branches: 3, loops: 0.25, layout: 'crypt' },
    audio: {
      echo: { verb: 0.8, cut: 3600 },
      ambience: { wind: 0.3, owlFar: true },
      song: {
        bpm: 64, swing: 0.03, key: 'E', scale: 'phrygian', steps: 16, chords: [0, 1, 5, 4],
        tracks: [
          { name: 'organ', inst: 'pad', chord: true, wave: 'triangle', cutoff: 700, attack: 2, release: 2.8, vol: 0.44, verb: 0.85 },
          { name: 'low', inst: 'bass', notes: '0 - - - - - - - 0 - - - - - - -', follow: true, wave: 'sine', cutoff: 200, vol: 0.42, oct: -1 },
          { name: 'pluck', inst: 'pluck', notes: notes(401, 32, 0.18, [0, 1, 3, 5, 7, 8]), follow: true, wave: 'triangle', vol: 0.28, delay: 0.7, verb: 0.75, oct: 1 },
          { name: 'bell', inst: 'bell', notes: notes(402, 64, 0.05, [0, 7, 12]), vol: 0.22, verb: 0.9, oct: 0 },
          { name: 'pups', inst: 'lead', notes: '3 . 1 . 0 . . . 1 . 3 . 5 . . . 3 . 5 . 3 . 1 . 0 . . . . . . .', wave: 'triangle', vol: 0.2, verb: 0.7, oct: 1, on: false },
          { name: 'danger', inst: 'bass', notes: '0 . 0 0 . . 0 . 0 . 0 0 . . 1 .', follow: true, wave: 'triangle', cutoff: 360, gate: 0.4, vol: 0.38, on: false },
          { name: 'exit', inst: 'bell', notes: '7 . . 8 . . 12 . . . 8 . 7 . . . 5 . . 7 . . 8 . . . . . . . . .', vol: 0.42, oct: 1, on: false },
          { name: 'deep', inst: 'pluck', notes: notes(403, 16, 0.38, [0, 1, 5, 7]), follow: true, wave: 'square', cutoff: 700, vol: 0.1, oct: 0, gate: 0.3, on: false },
        ],
      },
    },
    flight: { time: 20, title: 'Out of the belfry', line: 'The old bell is still humming. The rain is thinning.', owl: false, colony: true },

    caves: [
      {
        id: '4-1', name: 'Feathers', seed: 4101, mission: 'hush', layout: 'tunnel',
        screens: 9, H: 1140, rad: 114, moths: 24, drain: 1.62, branches: 3, loops: 0.15,
        pups: [{ at: 'chamber' }, { at: 0.6 }],
        hazards: { owls: { n: 3, light: true } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'nowake' }],
        intro: 'Owls breathe in their sleep. Light sleepers wake to a chirp close by', heardWell: ['hark'],
        scratch: { at: 0.45, text: 'Count their breathing. Call only where nothing breathes.' },
      },
      {
        id: '4-2', name: 'The Crypt Larder', seed: 4202, mission: 'homing',
        screens: 10, H: 1180, rad: 112, moths: 32, drain: 1.66, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 'chamber' }],
        hazards: { owls: { n: 2, light: true }, webs: { n: 3, from: 0.4, to: 0.9 }, stals: { n: 3, from: 0.3, to: 0.9 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'larder', n: 24 }],
        intro: 'The crypt is full of moths, and of owls who know it', heardWell: ['comb', 'hark'],
        scratch: { at: 'chamber', text: 'Moths love the old candles. So do the owls that eat them.' },
      },
      {
        id: '4-3', name: 'Bone Galleries', seed: 4303, mission: 'homing',
        screens: 10, H: 1220, rad: 108, moths: 24, drain: 1.68, branches: 4, loops: 0.3,
        pups: [{ at: 'chamber' }, { at: 'chamber', deep: true }],
        hazards: { owls: { n: 2, deep: 1 }, stals: { n: 4, from: 0.3, to: 0.92 }, drips: { n: 3 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'survey', pct: 70 }],
        intro: 'A deep sleeper wakes only to a shriek. Map the galleries without one', heardWell: ['gale', 'hark'],
        scratch: { at: 0.58, text: 'The deep sleepers dream of mice. Do not be the loudest mouse.' },
      },
      {
        id: '4-4', name: 'Decoy', seed: 4404, mission: 'kin', layout: 'tunnel',
        screens: 10, H: 1200, rad: 110, moths: 24, drain: 1.66, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 'chamber' }, { at: 0.7 }],
        hazards: { owls: { n: 3, light: true }, crystal: { chamber: true, patches: 3 } },
        moons: [{ type: 'pups', n: 2 }, { type: 'pups', all: true }, { type: 'wakes', max: 1 }],
        intro: 'A woken owl hunts the loudest sound: let a crystal ring louder than you', heardWell: ['hark', 'gale'],
        scratch: { at: 0.4, text: 'Sing near the glass. The owl will go to the glass.' },
      },
      {
        id: '4-5', name: 'Under the Owl', seed: 4505, mission: 'kin',
        screens: 11, H: 1240, rad: 108, moths: 26, drain: 1.7, branches: 4, loops: 0.25,
        pups: [{ at: 'chamber' }, { at: 'chamber' }, { at: 'chamber', deep: true }, { at: 0.55 }],
        hazards: { owls: { n: 3, light: true, deep: 1 }, crystal: { chamber: false, patches: 2 }, webs: { n: 2, from: 0.5, to: 0.9 } },
        moons: [{ type: 'pups', n: 3 }, { type: 'pups', all: true }, { type: 'wakes', max: 1 }],
        intro: 'Four pups under the owls. Quiet wings', heardWell: ['hark'],
        scratch: { at: 'chamber', text: 'We hid the little ones where the owls sleep. The owls never look under themselves.' },
      },
      {
        id: '4-6', name: 'The Grey Lady', seed: 4606, mission: 'escape', setPiece: true,
        screens: 15, H: 1260, rad: 116, moths: 28, drain: 1.62, branches: 2, loops: 0.1,
        pups: [{ at: 0.3, ledge: true }, { at: 0.5, ledge: true }, { at: 0.68, ledge: true }],
        hazards: { greylady: { chaseAt: 0.8 }, crystal: { chamber: false, patches: 3 }, stals: { n: 2, from: 0.4, to: 0.8 } },
        moons: [{ type: 'escape' }, { type: 'pups', all: true }, { type: 'talons' }],
        intro: 'The Grey Lady hunts by ear. Call, then move', heardWell: ['hark', 'gale'],
        scratch: { at: 0.6, text: 'She is old and she is kind to no one. But she is never cruel. Outwit her.' },
      },
    ],
  });
})();
