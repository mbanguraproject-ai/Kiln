/* The finale: The Hush. The bottom of the hill, where sound goes to be remembered. Grey felt-moss swallows echoes
 * (echoLife: they fade in less than half the usual time; crystals still carry sound), so you find your way by the
 * map you have drawn and by what still answers. At its heart, shriek, and every pup you have ever brought home
 * sings with you: the Chorus (js/hazards/chorus.js). Then the arch, and the flight home: the end of The Long Rain. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;

  function notes(seed, n, p, pool) { const r = Kit.rng(seed), out = []; for (let i = 0; i < n; i++) out.push(r.chance(p) ? String(r.pick(pool)) : '.'); return out.join(' '); }

  PP.registerBiome({
    id: 'hush', index: 5, ready: true, finale: true,
    name: 'The Hush',
    line: 'The bottom of the hill, where sound goes to be remembered.',
    echoLife: 0.45,
    palette: {
      sky: [[0, '#050506'], [0.5, '#0b0b0d'], [1, '#060607']],
      dark: '#030304', darkAlpha: 0.96,
      rock: ['#222224', '#1a1a1c', '#121214'],
      rim: '#4e4e54', texture: '#c8c8cc',
      strata: { light: 'rgba(210,210,220,0.08)', dark: 'rgba(2,2,4,0.5)', band: 'rgba(210,210,220,0.06)', flint: '#0c0c0e', flintHi: 'rgba(220,220,235,0.28)' },
      sil: ['#0a0a0c', '#0f0f12'], silLit: ['#2a2a32', '#3e3e48'], glowworm: '#e8e8f0', fg: '#020203', vignette: '#060608',
      moon: '#f0f0f6', arch: ['#121218', '#3a3a48', '#5c5c6e'], water: ['#16161e', '#06060a'], accent: '#c9c9d6',
    },
    // felt-moss: soft round cushions that drink sound, and between them pale threads of old roots
    painter(g, P) {
      const S = P.pal.strata, TAU = Math.PI * 2;
      P.near((r, cx, cy) => {
        for (let k = 0; k < 4; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rad = r.range(50, 150), lite = r.chance(0.4);
          const bg = g.createRadialGradient(x, y, 0, x, y, rad);
          bg.addColorStop(0, lite ? S.light : S.dark); bg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = bg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        }
        // moss cushions
        for (let k = 0; k < 6; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256), rr = r.range(8, 22);
          const mg = g.createRadialGradient(x, y - rr * 0.3, 0, x, y, rr);
          mg.addColorStop(0, 'rgba(200,200,210,0.12)'); mg.addColorStop(1, 'rgba(200,200,210,0)');
          g.fillStyle = mg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        }
        // root threads
        g.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const x = cx + r.range(0, 256), y = cy + r.range(0, 256);
          g.strokeStyle = 'rgba(220,220,230,0.07)'; g.lineWidth = P.minW(r.range(1, 1.8));
          g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x + r.range(-40, 40), y + r.range(10, 50), x + r.range(-40, 40), y + r.range(40, 90), x + r.range(-30, 30), y + r.range(80, 140));
          g.stroke();
        }
      });
    },
    parallax: [
      { seed: 91, tw: 620, th: 560, depth: 0.22, band: 0.38, spikes: 12, columns: 2 },
      { seed: 97, tw: 800, th: 680, depth: 0.45, band: 0.38, spikes: 18, columns: 1 },
    ],
    ambient: { motes: { color: '#f2f2f8', drift: -3 }, shafts: 0, glowworms: false },
    hazards: ['chorus', 'owls', 'crystal', 'webs', 'stals'],
    gen: { drain: 1.6, rad: 116, H: 1300, screens: 14, moths: 30, branches: 3, loops: 0.2 },
    audio: {
      echo: { verb: 0.9, cut: 2600 },
      ambience: { hum: 0.25 },
      song: {
        bpm: 50, swing: 0, key: 'D', scale: 'minor', steps: 16, chords: [0, 5, 3, 0],
        tracks: [
          { name: 'pad', inst: 'pad', chord: true, wave: 'sine', cutoff: 420, attack: 3.2, release: 4, vol: 0.4, verb: 0.9 },
          { name: 'low', inst: 'bass', notes: '0 - - - - - - - - - - - - - - -', follow: true, wave: 'sine', cutoff: 150, vol: 0.38, oct: -1 },
          { name: 'pluck', inst: 'pluck', notes: notes(501, 32, 0.1, [0, 3, 7, 10]), follow: true, wave: 'sine', vol: 0.22, delay: 0.85, verb: 0.85, oct: 1 },
          { name: 'pups', inst: 'lead', notes: '4 . 2 . 0 . . . 2 . 4 . 2 . . . 4 . 5 . 4 . 2 . 0 . . . . . . .', wave: 'triangle', vol: 0.22, verb: 0.7, oct: 1, on: false },
          { name: 'danger', inst: 'bass', notes: '0 . . . 0 . . . 0 . . . 0 . . .', follow: true, wave: 'triangle', cutoff: 300, gate: 0.4, vol: 0.3, on: false },
          { name: 'exit', inst: 'bell', notes: '7 . . 9 . . 10 . . . 9 . 7 . . . 4 . . 7 . . 9 . . . . . . . . .', vol: 0.44, oct: 1, on: false },
          { name: 'deep', inst: 'bell', notes: notes(503, 16, 0.25, [0, 7, 12]), vol: 0.14, oct: 0, on: false },
        ],
      },
    },
    flight: { time: 24, title: 'Home', line: 'The Long Rain is over. Every bat you found flies home with you.', owl: false, colony: true, ending: true },

    caves: [
      {
        id: '5-1', name: 'The Hush', seed: 5101, mission: 'kin', setPiece: true,
        screens: 14, H: 1300, rad: 116, moths: 30, drain: 1.6, branches: 3, loops: 0.2,
        pups: [{ at: 'chamber' }, { at: 0.4, deep: true }, { at: 'chamber' }],
        hazards: { chorus: {}, owls: { n: 1, deep: 1 }, crystal: { chamber: false, patches: 3 }, webs: { n: 2, from: 0.3, to: 0.6 } },
        moons: [{ type: 'home' }, { type: 'pups', all: true }, { type: 'chorus' }],
        intro: 'Here the moss drinks every echo. Find the heart, and sing', heardWell: ['gale', 'hark'],
        scratch: { at: 0.3, text: 'Down here nothing is forgotten. Not even us. Sing, and we will answer.' },
      },
    ],
  });
})();
