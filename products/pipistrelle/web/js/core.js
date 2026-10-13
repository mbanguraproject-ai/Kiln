/* Pipistrelle core: the PP namespace, shared constants, helpers, random streams and the event bus.
 * Every module is a classic script that adds to window.PP; load order is set in index.html. */
(function () {
  'use strict';
  const Kit = window.Kit;
  const PP = window.PP = window.PP || {};
  PP.version = '1.0.0';
  PP.debug = /[?&]debug\b/.test(location.search);
  PP.keyart = /[?&]keyart\b/.test(location.search);

  PP.TAU = Math.PI * 2;
  PP.CELL = 12;
  // Echo channels. The colour code is sacred: teal rock, gold food, pink pups, red danger.
  PP.CH = { ROCK: 0, WATER: 1, WEB: 2, MOTH: 3, HAZ: 4, CRYS: 5, PUP: 6, MOON: 7, LORE: 8 };
  PP.COL = ['#4ff0d8', '#3a7bff', '#e8f0ff', '#ffcf5a', '#ff4a6b', '#c7a8ff', '#ff9ccf', '#9fc6ff', '#f2ead6'];
  PP.P = {
    void0: '#05060d', body: '#8a5a44', belly: '#b98262', wing: '#4a2d38', bone: '#c99478', rimLight: '#8ff8ff',
    ink: '#e9fbff', warm: '#ffb27a', moon: '#9fc6ff', gold: '#ffcf5a', red: '#ff4a6b', teal: '#4ff0d8', pink: '#ff9ccf',
    water: '#3a7bff', crystal: '#c7a8ff', web: '#e8f0ff', owl: '#2a1e1c',
  };

  PP.clamp = Kit.clamp; PP.lerp = Kit.lerp; PP.dist = Kit.dist; PP.wrap = Kit.wrap;
  PP.hash2 = function (a, b) {
    let h = (a ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ ((b + 0x7f4a7c15) >>> 0), 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  };
  PP.hashStr = function (s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
  PP.compact = function (arr, keep) { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; };
  PP.rng = seed => Kit.rng(seed >>> 0);
  // Separate random streams: generation (layout), simulation (gameplay) and effects (cosmetic only),
  // so a quality tier or a particle never shifts the simulation.
  PP.streams = seed => ({ gen: Kit.rng(PP.hash2(seed, 1)), sim: Kit.rng(PP.hash2(seed, 2)), fx: Kit.rng(PP.hash2(seed, 3)) });

  /* ---------- event bus ---------- */
  const subs = {};
  PP.on = (evt, fn) => { (subs[evt] = subs[evt] || []).push(fn); return fn; };
  PP.off = (evt, fn) => { const l = subs[evt]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
  PP.emit = (evt, data) => { const l = subs[evt]; if (l) for (let i = 0; i < l.length; i++) l[i](data, evt); };

  /* ---------- registries (data files fill these) ---------- */
  PP.data = PP.data || {};
  PP.biomes = PP.biomes || {};
  PP.registerBiome = function (def) {
    if (!def || !def.id) throw new Error('registerBiome: id required');
    PP.biomes[def.id] = def;
    for (const c of def.caves || []) { c.biome = def.id; }
    return def;
  };
  PP.biome = id => PP.biomes[id] || PP.biomes.chalk;

  /* ---------- time: the date key and the real lunar phase, computed offline ---------- */
  PP.today = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  PP.lunar = function (d) {
    d = d || new Date();
    const SYN = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const age = ((((d.getTime() - ref) / 86400000) % SYN) + SYN) % SYN, k = age / SYN;
    const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    const idx = Math.floor((k * 8) + 0.5) % 8;
    return { age, phase: k, name: names[idx], idx, light: (1 - Math.cos(k * PP.TAU)) / 2 };
  };

  PP.fmt = Kit.fmt;
  PP.plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
})();
