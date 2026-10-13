# Biomes: how a biome is built

The campaign, "The Long Rain", is five biomes in `data/campaign.js` (`order`): Chalk Hollows, The Drowned Halls,
The Glass Vaults, The Owlstone Crypt (six caves each) and The Hush (the finale, one cave). Each biome is one file,
`web/data/biomes/<id>.js`, that calls `PP.registerBiome({...})`. `chalk.js` is the reference implementation.
A biome without `ready: true` shows on the map as still to come.

## The biome object

| Field | What it does |
| --- | --- |
| `id`, `index`, `name`, `line` | Identity, map order and the one-line description on the map and brief |
| `ready` | Playable in this build |
| `finale` | The last biome: its flight home shows the ending, and the Long Night skips it |
| `palette` | Sky gradient, darkness, rock tones, rim, strata, silhouettes, arch, water and accent colours |
| `painter(g, P)` | Paints one 256 px rock chunk (source-atop). `P` gives the chunk bounds, level, palette, quality tier, density, a seeded rng, `near(fn)` for decorations that cross chunk edges, and `minW(w)` |
| `parallax` | Two background layers, drawn behind the rock |
| `ambient` | Motes (colour, drift), light shafts, glowworms, crickets, cavefish |
| `crystalHold` | Seconds a lit crystal keeps glowing (The Glass Vaults: 4) |
| `echoLife` | Multiplier on how long echoes stay on the walls (The Hush: 0.45; crystals and Moon marks are exempt) |
| `hazards` | Which hazards the Long Night may use in this biome |
| `gen` | Default generator settings for Long Night caves: `drain`, `rad`, `H`, `screens`, `moths`, `branches`, `loops` |
| `audio` | Echo reverb and cutoff, ambience (wind, lap, hum, crickets, distant owl) and the `song` (bpm, key, scale, chords, tracks) |
| `flight` | The flight home after the last cave: `time`, `title`, `line`, `owl`, `colony`, `ending` |
| `caves` | The campaign caves, in order |

## A cave

```js
{
  id: '2-1', name: 'The Weeping Stair', seed: 2101, mission: 'homing',
  screens: 9, H: 1100, rad: 118, moths: 24, drain: 1.55, branches: 2, loops: 0,
  pups: [{ at: 0.42 }],                          // a path fraction, or 'chamber'; deep: true, sealed: true
  hazards: { river: { at: [[0.24, 0.34]], level: 0.4 }, drips: { n: 3 } },
  moons: [{ type: 'home' }, { type: 'pups', n: 1 }, { type: 'dry' }],
  intro: 'Water echoes blue. Skim it and you splash', heardWell: ['skimmer'],
  scratch: { at: 0.5, text: 'The rain came down the stair for nine nights.' },
  setPiece: true,                                // the sixth cave of a biome
}
```

- **Missions** (`data/missions.js` `types`): `homing`, `kin`, `hush`, `escape`.
- **Moons**: every cave has three. Their types are defined in `js/missions.js`, with the text in `data/missions.js`:
  `home`, `escape`, `pups`, `time`, `bumps`, `calls`, `survey`, `larder`, `noweb`, `untouched`, `energy`, `nowake`,
  `dry`, `tidefree`, `nosiphon`, `tigers`, `shrieks`, `wakes`, `talons`, `chorus`.
- **Hazards**: each one is a module in `web/js/hazards/` registered with `HZ.def(id, { place, steer, update, ping,
  holes, draw, debug })`. They are `stals`, `webs`, `drips`, `gust`, `owls`, `collapse`, `river`, `flood`, `tide`,
  `siphon`, `fish`, `crystal`, `tiger`, `bells`, `greylady`, `chorus` and `scratches`. A new hazard file goes in
  `web/index.html` before `js/gen/cave.js`.
- **Bats** arrive when their `arrives.after` cave is first cleared. If that cave is not in the build, the bat
  arrives with the last built cave before it (`js/profile.js`).

## Checks

`node tests/test.cjs --unit` checks every biome's data:

- six caves (one for the finale) with unique IDs;
- three known Moons, a mission, an intro, a lore scratch and pups in every cave;
- every hazard a cave uses is defined;
- each bat arrives after a cave that exists.

`node tests/test.cjs` then generates every cave and has the bot earn every Moon with Pip.
