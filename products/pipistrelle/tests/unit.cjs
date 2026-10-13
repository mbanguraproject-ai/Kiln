// Pipistrelle's unit tests: no browser needed, so CI runs them before building the APK (tests/test.cjs --unit).
// They load the real data and logic files into a plain Node context with a minimal stand-in for the kit, and check
// the economy pacing, save migrations, and that every biome's data is complete and consistent.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.join(__dirname, '..', 'web');
let failed = 0;
const check = (ok, name, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' (' + detail + ')' : ''}`); if (!ok) failed++; };

// the kit's pure helpers the data files touch at load time
function rng(seed) {
  let a = seed >>> 0;
  const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, range: (x, y) => x + (y - x) * next(), int: (x, y) => x + Math.floor(next() * (y - x + 1)), chance: p => next() < p, pick: arr => arr[Math.floor(next() * arr.length)] };
}
const Kit = { rng, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t, dist: (a, b, c, d) => Math.hypot(c - a, d - b), wrap: (v, a, b) => { const r = b - a; return ((((v - a) % r) + r) % r) + a; }, fmt: n => String(n) };
const store = {};
const Arcade = { store: { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; } }, settings: { sound: true, vibration: true }, setSetting() {}, emit() {}, on() {} };
const ctx = { Kit, Arcade, console, Date, Math, JSON, location: { search: '' } };
ctx.window = ctx;
vm.createContext(ctx);
const load = rel => vm.runInContext(fs.readFileSync(path.join(WEB, rel), 'utf8'), ctx, { filename: rel });
const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
// core, the data files, the mission logic and the profile (pure enough to run outside a browser)
for (const s of scripts) if (s === 'js/core.js' || s.startsWith('data/') || s === 'js/missions.js' || s === 'js/profile.js') load(s);
const PP = ctx.PP;

// ---- economy pacing (docs/pipistrelle/BRIEF.md: the first bat around the end of Chalk Hollows, all four by the end)
const E = PP.data.economy, sim = PP.economy.simulate();
const reach = amt => { for (const s of sim) if (s.total >= amt) return s.cave; return Infinity; };
const bought = Object.entries(E.prices).filter(([id]) => id !== 'pip').map(([, p]) => p).sort((a, b) => a - b);
const first = reach(bought[0]), all = reach(bought.reduce((a, b) => a + b, 0)), T = E.targets;
check(Math.abs(first - T.firstBat) <= T.firstBat * T.tolerance, 'economy: the first bat is affordable around the end of Chalk Hollows', `cave ${first}`);
check(Math.abs(all - T.allBats) <= T.allBats * T.tolerance, 'economy: all four bats by the end of the campaign', `cave ${all}`);

// ---- save migrations
const m0 = PP.profile.migrate({ best: 9000, taught: true });
check(m0.v === 2 && m0.moths === 500 && m0.legacy.gift === 500 && m0.tutorial.taught, 'save: the pilot save migrates, its best returned as a gift of at most 500');
const m1 = PP.profile.migrate({ v: 1, moths: 742, caves: { '1-1': { moons: [true, false, true] } }, settings: { music: 0.3 } });
check(m1.v === 2 && m1.moths === 742 && m1.caves['1-1'].moons.join() === 'true,false,true' && m1.settings.music === 0.3, 'save: a version 1 save keeps moths, Moons and settings');

// ---- the campaign's data
const order = PP.data.campaign.order, ids = new Set(), moonTypes = PP.moonTypes, missionTypes = PP.data.missions.types;
for (const b of order) {
  const B = PP.biomes[b];
  check(B && B.ready, `biome ${b} is ready`);
  if (!B) continue;
  const want = B.finale ? 1 : 6;
  check(B.caves.length === want, `${B.name} has ${want} caves`, B.caves.length);
  check(B.palette && typeof B.painter === 'function' && B.parallax && B.parallax.length === 2 && B.audio && B.audio.song && B.flight, `${B.name} has its own look, music and flight home`);
  for (const c of B.caves) {
    const ok = !ids.has(c.id) && c.moons.length === 3 && c.moons.every(m => moonTypes[m.type] && PP.data.missions.moons[m.type]) && missionTypes[c.mission] && c.intro && c.scratch && Array.isArray(c.pups) && c.pups.length >= 1;
    check(ok, `cave ${c.id} ${c.name}: three known Moons, a mission, an intro, a lore scratch and pups`);
    ids.add(c.id);
  }
  if (!B.finale) check(B.caves[5].setPiece, `${B.name} ends in a set piece`);
}
check(ids.size === 25, 'The Long Rain has 25 caves: four biomes of six and the finale', ids.size);
for (const bat of PP.data.bats) if (bat.arrives) check(ids.has(bat.arrives.after), `${bat.name} arrives after a cave that exists`, bat.arrives.after);
// every hazard a cave switches on is a real hazard module
const hzFiles = scripts.filter(s => s.startsWith('js/hazards/'));
const hzSrc = hzFiles.map(f => fs.readFileSync(path.join(WEB, f), 'utf8')).join('\n');
const defined = new Set([...hzSrc.matchAll(/HZ\.def\('([a-z]+)'/g)].map(m => m[1]));
const used = new Set();
for (const b of order) for (const c of PP.biomes[b].caves) for (const k of Object.keys(c.hazards || {})) used.add(k);
const missing = [...used].filter(k => !defined.has(k));
check(missing.length === 0, 'every hazard a cave uses exists', missing.join(', ') || [...used].join(', '));

console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
