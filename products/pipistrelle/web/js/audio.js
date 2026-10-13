/* Sound: synthesised effects (the echo is the most important sound in the game), each biome's song with adaptive
 * layers (pups, danger, exit, deep), and a sparse ambience of accents. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const D = Kit.sfx.define;
  D('chirp', [
    { wave: 'sine', freq: 2000, to: 6000, slide: 0.06, attack: 0.002, hold: 0.045, release: 0.03, vol: 0.16 },
    { wave: 'sine', freq: 4000, to: 7800, slide: 0.05, attack: 0.002, hold: 0.03, release: 0.03, vol: 0.05 },
  ]);
  D('whisper', [
    { wave: 'sine', freq: 2600, to: 5200, slide: 0.05, attack: 0.004, hold: 0.03, release: 0.04, vol: 0.08 },
    { wave: 'noise', freq: 6000, hold: 0.03, release: 0.04, vol: 0.03, filter: 'highpass', cut: 5000 },
  ]);
  D('echo', { wave: 'sine', freq: 2200, to: 5200, slide: 0.05, attack: 0.004, hold: 0.03, release: 0.06, vol: 0.06, filter: 'lowpass', cut: 3600, verb: 0.45 });
  D('shriek', [
    { wave: 'sawtooth', freq: 1400, to: 4800, slide: 0.16, attack: 0.005, hold: 0.14, release: 0.08, vol: 0.08, filter: 'bandpass', cut: 3200, q: 2 },
    { wave: 'sine', freq: 2600, to: 6400, slide: 0.12, hold: 0.12, release: 0.06, vol: 0.12, vib: 0.8, vibRate: 30 },
    { wave: 'noise', freq: 5000, hold: 0.08, release: 0.1, vol: 0.05, filter: 'highpass', cut: 4000 },
  ]);
  D('crunch', [
    { wave: 'noise', freq: 2600, attack: 0.001, hold: 0.025, release: 0.04, vol: 0.22, filter: 'bandpass', cut: 2400, q: 1.5, jitter: 3 },
    { wave: 'square', freq: 220, to: 120, slide: 0.04, hold: 0.02, release: 0.03, vol: 0.05, at: 0.035 },
    { wave: 'noise', freq: 3200, at: 0.065, hold: 0.02, release: 0.04, vol: 0.14, filter: 'bandpass', cut: 3000, q: 1.5 },
  ]);
  D('squeak', { wave: 'sine', freq: 2300, to: 1500, slide: 0.09, attack: 0.003, hold: 0.06, release: 0.05, vol: 0.13, vib: 1.2, vibRate: 28, jitter: 2 });
  D('tick', { wave: 'noise', freq: 6000, attack: 0.001, hold: 0.006, release: 0.02, vol: 0.12, filter: 'highpass', cut: 3500, jitter: 4 });
  D('crack', [
    { wave: 'noise', freq: 1800, attack: 0.001, hold: 0.05, release: 0.12, vol: 0.3, filter: 'lowpass', cut: 2400 },
    { wave: 'square', freq: 160, to: 70, slide: 0.08, hold: 0.04, release: 0.06, vol: 0.07 },
  ]);
  D('fallwhoosh', { wave: 'noise', freq: 600, attack: 0.05, hold: 0.25, release: 0.15, vol: 0.13, filter: 'bandpass', cut: 500, cutTo: 2200, q: 1.4 });
  D('crash', [
    { wave: 'sine', freq: 110, to: 38, slide: 0.25, attack: 0.002, hold: 0.12, release: 0.25, vol: 0.5 },
    { wave: 'noise', freq: 900, hold: 0.12, release: 0.35, vol: 0.3, filter: 'lowpass', cut: 1400, cutTo: 300 },
    { wave: 'noise', freq: 4000, at: 0.05, hold: 0.05, release: 0.2, vol: 0.07, filter: 'highpass', cut: 3000 },
  ]);
  D('rumble', [
    { wave: 'noise', freq: 300, attack: 0.08, hold: 0.3, release: 0.3, vol: 0.32, filter: 'lowpass', cut: 260 },
    { wave: 'sine', freq: 52, to: 40, slide: 0.5, attack: 0.05, hold: 0.3, release: 0.25, vol: 0.3 },
  ]);
  D('web', [
    { wave: 'sawtooth', freq: 190, to: 140, slide: 0.32, attack: 0.02, hold: 0.24, release: 0.1, vol: 0.08, vib: 1.4, vibRate: 9, filter: 'lowpass', cut: 900 },
    { wave: 'sawtooth', freq: 197, to: 146, slide: 0.32, attack: 0.02, hold: 0.24, release: 0.1, vol: 0.06, vib: 1.1, vibRate: 7, filter: 'lowpass', cut: 900 },
  ]);
  D('tear', [
    { wave: 'noise', freq: 3000, hold: 0.04, release: 0.08, vol: 0.14, filter: 'bandpass', cut: 2800, q: 2 },
    { wave: 'triangle', freq: 520, to: 880, slide: 0.08, hold: 0.05, release: 0.08, vol: 0.1 },
  ]);
  D('pup', { wave: 'sine', freq: 1320, arp: [0, 4, 7, 12, 16], arpStep: 0.05, attack: 0.003, hold: 0.25, release: 0.12, vol: 0.14, vib: 0.4, vibRate: 18 });
  D('pupcall', [
    { wave: 'sine', freq: 2640, to: 3300, slide: 0.05, attack: 0.003, hold: 0.04, release: 0.05, vol: 0.09, verb: 0.6 },
    { wave: 'sine', freq: 2960, to: 3500, slide: 0.04, at: 0.11, attack: 0.003, hold: 0.04, release: 0.06, vol: 0.08, verb: 0.6 },
  ]);
  D('hoot', [
    { wave: 'sine', freq: 400, attack: 0.04, hold: 0.16, release: 0.08, vol: 0.26, vib: 0.3, vibRate: 6 },
    { wave: 'triangle', freq: 800, attack: 0.04, hold: 0.12, release: 0.08, vol: 0.04 },
    { wave: 'sine', freq: 330, at: 0.3, attack: 0.04, hold: 0.32, release: 0.15, vol: 0.26, vib: 0.5, vibRate: 5 },
  ]);
  D('swoop', { wave: 'noise', freq: 800, attack: 0.08, hold: 0.3, release: 0.2, vol: 0.16, filter: 'bandpass', cut: 400, cutTo: 2600, q: 2 });
  D('bolt', [
    { wave: 'noise', freq: 1200, attack: 0.01, hold: 0.1, release: 0.12, vol: 0.18, filter: 'bandpass', cut: 900, cutTo: 3800, q: 1.6 },
    { wave: 'sine', freq: 900, to: 1800, slide: 0.12, hold: 0.05, release: 0.06, vol: 0.06 },
  ]);
  D('exit', [
    { wave: 'triangle', freq: 261.6, attack: 0.04, hold: 0.9, release: 1.2, vol: 0.11, verb: 0.6 },
    { wave: 'triangle', freq: 329.6, attack: 0.06, hold: 0.85, release: 1.2, vol: 0.09, verb: 0.6 },
    { wave: 'triangle', freq: 392, attack: 0.08, hold: 0.8, release: 1.2, vol: 0.09, verb: 0.6 },
    { wave: 'sine', freq: 523.3, arp: [0, 4, 7, 12], arpStep: 0.09, attack: 0.01, hold: 0.6, release: 0.8, vol: 0.08, verb: 0.7 },
    { wave: 'sine', freq: 130.8, attack: 0.05, hold: 0.9, release: 1.2, vol: 0.12 },
  ]);
  D('splash', [
    { wave: 'noise', freq: 3000, attack: 0.003, hold: 0.06, release: 0.25, vol: 0.2, filter: 'lowpass', cut: 3200, cutTo: 500 },
    { wave: 'sine', freq: 600, to: 1400, slide: 0.06, hold: 0.03, release: 0.05, vol: 0.06 },
  ]);
  D('rush', { wave: 'noise', freq: 600, attack: 0.25, hold: 0.5, release: 0.6, vol: 0.14, filter: 'lowpass', cut: 900, cutTo: 420 });
  D('gurgle', [
    { wave: 'sine', freq: 320, to: 180, slide: 0.12, attack: 0.005, hold: 0.05, release: 0.06, vol: 0.09, verb: 0.5 },
    { wave: 'sine', freq: 410, to: 220, slide: 0.1, at: 0.11, attack: 0.005, hold: 0.04, release: 0.06, vol: 0.08, verb: 0.5 },
    { wave: 'sine', freq: 280, to: 150, slide: 0.12, at: 0.24, attack: 0.005, hold: 0.05, release: 0.08, vol: 0.07, verb: 0.5 },
  ]);
  D('lap', { wave: 'noise', freq: 900, attack: 0.18, hold: 0.25, release: 0.5, vol: 0.05, filter: 'bandpass', cut: 500, cutTo: 900, q: 1.2 });
  D('ring', [
    { wave: 'sine', freq: 1568, attack: 0.002, hold: 0.08, release: 1.4, vol: 0.07, verb: 0.8 },
    { wave: 'sine', freq: 2349, attack: 0.002, hold: 0.05, release: 1.1, vol: 0.04, verb: 0.8 },
    { wave: 'sine', freq: 3136, attack: 0.002, hold: 0.03, release: 0.8, vol: 0.025, verb: 0.8 },
  ]);
  D('drip', { wave: 'sine', freq: 1700, to: 900, slide: 0.05, attack: 0.001, hold: 0.012, release: 0.06, vol: 0.1, verb: 0.55, jitter: 3 });
  D('gust', { wave: 'noise', freq: 400, attack: 0.3, hold: 0.9, release: 0.5, vol: 0.13, filter: 'bandpass', cut: 300, cutTo: 900, q: 3 });
  D('chime', { wave: 'sine', freq: 2093, arp: [0, 7, 12, 19], arpStep: 0.07, attack: 0.002, hold: 0.3, release: 0.5, vol: 0.08, verb: 0.7 });
  D('bank', { wave: 'triangle', freq: 1046, attack: 0.001, hold: 0.02, release: 0.05, vol: 0.07 });
  D('nightmoth', { wave: 'triangle', freq: 1568, arp: [0, 5], arpStep: 0.04, hold: 0.06, release: 0.08, vol: 0.08, jitter: 1 });
  D('fade', { wave: 'sine', freq: 880, to: 220, slide: 0.9, hold: 0.7, release: 0.4, vol: 0.13, vib: 0.5, vibRate: 6 });
  D('heartbeat', [
    { wave: 'sine', freq: 70, to: 45, attack: 0.004, hold: 0.04, release: 0.1, vol: 0.45 },
    { wave: 'sine', freq: 64, to: 42, at: 0.16, attack: 0.004, hold: 0.03, release: 0.12, vol: 0.32 },
  ]);
  D('cricket', [
    { wave: 'sine', freq: 4400, attack: 0.002, hold: 0.012, release: 0.01, vol: 0.03 },
    { wave: 'sine', freq: 4400, at: 0.05, attack: 0.002, hold: 0.012, release: 0.01, vol: 0.03 },
    { wave: 'sine', freq: 4400, at: 0.1, attack: 0.002, hold: 0.012, release: 0.01, vol: 0.025 },
  ]);
  D('wind', { wave: 'noise', freq: 300, attack: 0.9, hold: 1.4, release: 1.4, vol: 0.06, filter: 'lowpass', cut: 400, cutTo: 260 });
  D('owlfar', [
    { wave: 'sine', freq: 360, attack: 0.05, hold: 0.14, release: 0.1, vol: 0.06, verb: 0.8 },
    { wave: 'sine', freq: 300, at: 0.32, attack: 0.05, hold: 0.3, release: 0.2, vol: 0.06, verb: 0.8, vib: 0.5, vibRate: 5 },
  ]);
  D('ui', { wave: 'triangle', freq: 1320, to: 1760, slide: 0.03, attack: 0.002, hold: 0.02, release: 0.05, vol: 0.06 });
  D('buy', { wave: 'sine', freq: 784, arp: [0, 4, 7, 12, 16], arpStep: 0.06, attack: 0.003, hold: 0.25, release: 0.3, vol: 0.1, verb: 0.5 });
  D('moon', { wave: 'sine', freq: 1046, arp: [0, 7, 12], arpStep: 0.11, attack: 0.004, hold: 0.4, release: 0.6, vol: 0.09, verb: 0.7 });

  const loud = () => PP.G && PP.G.mode === 'play';
  PP.sfx = (name, o) => { if (loud()) Kit.sfx(name, o); };
  PP.uiSfx = (name, o) => Kit.sfx(name || 'ui', o);
  PP.haptic = p => { if (loud()) Kit.haptic(p); };

  const songs = {};
  const A = PP.audio = {
    song(biomeId) {
      if (songs[biomeId]) return songs[biomeId];
      const B = PP.biome(biomeId), def = B.audio && B.audio.song;
      songs[biomeId] = def ? JSON.parse(JSON.stringify(def)) : PP.biome('chalk').audio.song;
      return songs[biomeId];
    },
    enterCave(biomeId, kind) {
      Kit.music.play(A.song(biomeId), { restart: kind !== 'endless' });
      A.cur = { pups: false, danger: false, exit: false, deep: false };
    },
    menu() { Kit.music.play(A.song('chalk')); },
    layers(G, L) {
      if (!A.cur) return;
      const want = {
        pups: G.trail.length >= 2,
        danger: (G.danger || 0) > 0,
        exit: Math.hypot(L.W - G.bat.x, L.exitY - G.bat.y) < 600,
        deep: G.bat.x > L.W * 0.5,
      };
      for (const k in want) if (want[k] !== A.cur[k]) { A.cur[k] = want[k]; Kit.music.layer(k, want[k]); }
    },
    // a sparse ambience: drips, crickets in the dark, wind at the mouth, an owl far outside
    ambient(G) {
      if (G.mode !== 'play') return;
      const B = PP.biome(PP.L.biome), amb = (B.audio && B.audio.ambience) || {}, r = G.fxr, x = r.next();
      if (x < 0.4) Kit.sfx('drip', { pan: r.range(-0.9, 0.9), vol: r.range(0.2, 0.5), pitch: r.range(-4, 4) });
      else if (x < 0.65 && amb.crickets) Kit.sfx('cricket', { pan: r.range(-1, 1), vol: r.range(0.4, 1), pitch: r.range(-2, 2) });
      else if (x < 0.65 && amb.lap) Kit.sfx('lap', { pan: r.range(-0.8, 0.8), vol: amb.lap * r.range(0.6, 1), pitch: r.range(-3, 3) });
      else if (x < 0.65 && amb.hum) Kit.sfx('ring', { pan: r.range(-0.8, 0.8), vol: amb.hum * r.range(0.3, 0.7), pitch: r.pick([0, 2, 4, 7, 9]) });
      else if (x < 0.85 && amb.wind && G.bat.x < PP.L.W * 0.3) Kit.sfx('wind', { vol: amb.wind, pan: -0.5 });
      else if (amb.owlFar && r.chance(0.3)) Kit.sfx('owlfar', { pan: 0.8, vol: 0.6 });
    },
    applySettings(s) {
      Kit.audio.volume({ music: s.music, sfx: s.sfx });
      if (window.Arcade.settings.sound !== s.sound) window.Arcade.setSetting('sound', s.sound);
      window.Arcade.settings.vibration = s.vibration;
    },
  };
})();
