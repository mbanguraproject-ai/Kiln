```json
{
 "scores": [
  {
   "proposal": "A (world: Under Hollin Hill)",
   "fun": 7,
   "originality": 9,
   "atmosphere": 10,
   "progression": 7,
   "fairness": 9,
   "feasibility": 4,
   "notes": "The best art direction and the most rigorous 4K spec of the three. Strongest ideas: a per-biome data schema that agents can fill in parallel; echo colours fixed in meaning, with biomes allowed to shift rock hue only inside the teal band; weather that changes your hearing (drip rain low-passes echo returns, the Choir's double returns, wind made visible as drifting dots); lantern gnats that dim when you shriek; Old Scratches readable only in echo dots; a dithered 64/256/512 glow atlas; the LOD size rule; capture scenes rendered at the real tier rather than a special hiQ path; a fixed list of 6 verification scenes at 3 sizes; ring pools kept the same on every tier. Bats are pure sidegrades with no stat grind, and there is one currency. Engineering problems. (1) Content volume is far beyond its own 7-day plan: 6 biomes plus the Hush, 9 new hazards, 7 songs, 7 ambience beds, 7 unique Homeward Flight landscapes, 19 moth species with 4K specimen plates, 79 named pups, 15 decor items, 30 Carvings and a practice tunnel. (2) Per-biome echo dot behaviours (water-mirrored copies, prism triplets, downwind drift, spore bloom) all land in drawEcho, the existing hot spot of ~1,500 additive blits per frame. (3) The Ultra budget is too rich for its value: 1,400-4,000 particles, 16 light rays per source, d=3 rock chunks. (4) It moves rock, mask and memory onto the full-resolution main canvas, which adds full-screen passes exactly where game-check measures in software raster. (5) Its camera formula gives a portrait phone 470x1017 world px against 960x540 on landscape, so 'the same field of view everywhere' is not true on the portrait-locked Android build. (6) The Homeward Flight's fixed 1000x560 band letterboxed in portrait makes the bat a few CSS px wide on a 390-wide phone."
  },
  {
   "proposal": "B (progression: economy first)",
   "fun": 7,
   "originality": 7,
   "atmosphere": 7,
   "progression": 9,
   "fairness": 8,
   "feasibility": 5,
   "notes": "The best-engineered economy: every number in one data table, a pure-function campaign simulator that asserts the pacing milestones to within \u00b125%, training refundable at any time, a Practice Hollow to try a bat before buying it, a Skip option for the night flight that pays the average yield, export/import of a save code, and a written fairness charter. The bats change how you perceive, not just stats: Nox's cone, Horace's beam with Doppler outlines, Hollis's passive Listen. The glowworm lure that echoes teal while it glows gold is an excellent 'trust your ears' hazard. Colony size as the trigger for species arrivals fits the theme. It is also the only proposal to notice the portrait lock (confirmed: AndroidManifest screenOrientation=portrait). Weaknesses. (1) Two currencies plus training (7 bats x 3 tracks x 3 ranks) plus 7 knacks plus ~43 cosmetics is a conventional mobile meta structure and a large balance surface. (2) Training is stat creep that leaks into the Migration best, which is the Kiln score. (3) Calendar events invite FOMO even with the 'returns every year' mitigation. (4) Seven bespoke voice systems (cone, continuous beam, dash, hush, roar that stuns owls, perch, trawl) is the most ability code of any proposal, and its own risk 4 admits the input clash on 'hold still'. (5) Echo pool sizes vary by tier, so a Low phone loses echoes earlier: the tier changes information. (6) 'Moonbeams' are described as screen-space shafts; they must be world-space for fairness. (7) The squeeze of radius 7 (14 px) is about one cell on the 12 px grid and will not survive the CA smoothing or the 3x3-averaged field."
  },
  {
   "proposal": "C (missions: The Long Rain)",
   "fun": 9,
   "originality": 9,
   "atmosphere": 8,
   "progression": 8,
   "fairness": 9,
   "feasibility": 6,
   "notes": "The deepest game and the tightest v1 scope: 4 biomes, 24 caves, 4 bought bats, one currency. It adds no new controls; each biome adds one new thing to listen for: pup answers as delayed pink edge arcs through rock, drip clocks, light and deep sleeper owls, crystal decoys, a guide's rings, jammer moths, bells. Every hazard is about sound. Moons that dim the instant they become impossible are excellent UX. The 'Heard well by' line with no buy button, and the table of how each bat opens a different route, make purchases expand play rather than gate it. The sound captions accessibility layer also teaches hearing players what to listen for. Survey coverage on a 48 px grid is nearly free. Set pieces give a real failure state. Problems. (1) Nine mission types plus guide NPC, bells, gate cells with a local flow-field rebuild, tide that changes passability, jammers, and two new layouts ('rise' by transposing the grid, 'nave' from hand primitives) is a lot of new simulation. Each is small, but they interact. (2) 'Moon bots' verifying all 72 Moons with untrained Pip is the right guarantee, but autopilot cannot play Silence (budget 1), Hush (wake no owl) or Follow (no own chirps). Those need scripted routes per cave, which is real work that may slip. (3) Mote's 18 px hairline cracks have the same 12 px grid and CA problem as B's squeeze. (4) Echo pools vary by tier (the same flaw as B). (5) The fixed 1000x600 Dusk Flight band has the same portrait problem as A. (6) Lore and narrative are thinner than A's, and the Chorus finale (its best payoff) is deferred to v1.2."
  }
 ],
 "bestIdeas": [
  "All (as engineering spine): classic ordered scripts under a window.PP namespace, split with zero behaviour change first. Separate rng streams for gen, sim and fx. An event bus plus a per-run stats record. A hazard registry {place, update, ping, draw, debug}. Profile v2 with a version field and migration of the v1 keys run/taught/runs/best. This is the M0 gate before any parallel agent work.",
  "C: the campaign shape. Discrete 60-150 s caves, each started at full energy. 3 Moons per cave, earnable independently and cumulatively. The HUD dims a Moon the moment it becomes impossible. Every Moon is verified achievable with untrained Pip.",
  "C: the knowledge layers: one new thing to listen for per biome, never a new control. Pup answers (delayed pink edge arcs through rock), drip clocks (landing drips paint a 90 px mini sonar; rate-limited), light and deep sleeper owls, crystal re-echo as a decoy, the guide's rings.",
  "C: the mission-type subset that reuses existing systems: Homing, Kin, Survey (48 px coverage grid), Hush, Escape (collapse wave, rising water), Larder, Silence. Bellringing and Follow only if M3 is on schedule.",
  "C: the 'Heard well by: X' line on the cave brief with no buy button. Bats open alternative routes and never the only route.",
  "C: sound captions. Off-screen gameplay sounds get directional glyphs at the screen edge. Also C: the 'Gentle Wings' assist, and Nightly Cave played with untrained Pip so every player is equal.",
  "C/A: no night flight between campaign caves. The moonlit exit leads straight to Results. One flight per chapter end. Endless mode keeps an 8 s night flight that can be skipped; skipping banks the average yield (B).",
  "A: the per-biome data schema (palette, strata painter, parallax, lights, ambient, weather, hazards, gen, audio echoFx, song layers), so one agent can build one biome pack in parallel with the others against a capture scene.",
  "A: echo colours keep their meaning in every biome. A biome may shift the rock echo only within hue 165-200 degrees. Cosmetics can never recolour hazard or food echoes (also B).",
  "A: weather that changes hearing rather than sight: drip rain low-passes echo returns, the Drowned Choir returns twice, Windpipes dots drift downwind and show the air, lantern gnats dim when you shriek. Biome-specific echo FX (reverb send and low-pass per biome) on the echo voice.",
  "A/C: lore readable only through sonar (A's Old Scratches, C's echo murals), filed in a Journal.",
  "A/B/C: the Roost as the home screen, where every rescued pup hangs, named for campaign pups. Cluster rendering past ~200 sprites.",
  "A/C: one currency (moths) earned only by play. Bats are sidegrades priced at roughly 500-6,000. The campaign can be finished with the starter bat. A returning-player gift from the v1 best, capped.",
  "B: all economy numbers in one data table (js/data/economy.js), plus a pure-function campaign simulator in test.cjs that asserts the pacing milestones to within \u00b125%.",
  "B: the Practice Hollow, a free trial flight of any arrived bat at base stats, before buying it.",
  "B: colony size (pups brought home) as the trigger for new species arriving.",
  "B: Hollis's passive Listen ripples, Nox's 140-degree Forward Call cone, and Horace's beam with Doppler outlines on moving things. These are the bats whose sonar differs, not their numbers. Implement by adding an optional arc parameter to the existing sonar().",
  "B: glowworm lures that glow gold but echo teal ('trust your ears'). Hushmoss cells that return no echo.",
  "B: export/import of a save code in Settings (offline backup, standalone readiness). B's fairness charter written into the game's design doc and checked in review.",
  "B/C: the real lunar phase computed offline from the device date, for the daily cave. No streak counter and no broken-streak state.",
  "A: the 4K render spec. A dithered glow atlas (64/256/512) instead of the single 128 px sprite. Bloom as core sprite plus halo sprite, with no ctx.filter or shadowBlur. The LOD rule: draw nothing below 2 device px, and draw hi detail only when it is at least 6 device px. Gameplay silhouettes never depend on tier. Ring pools and ray counts are identical on every tier.",
  "B/C: chunked rock at a capped density plus a per-biome 512 px detail pattern (createPattern) composited at device resolution, plus vector rims stroked from segs. This is cheaper than A's d=3 chunks and gives the same perceived sharpness at 4K. No canvas larger than 2048 squared (C).",
  "A/B/C: a constant-area camera (~400-480k world px squared), so 4K no longer shows the whole cave. A UI scale from the screen's short side, a HUD anchored to safe-area corners, rem-based DOM menus, and an SVG or canvas wordmark so 'Pipistrelle' never wraps.",
  "A: capture scenes rendered at the real play tier (delete the hiQ path), and 6 per-biome verification scenes at 390x844@3, 1280x800@1 and 3840x2160@1 with native crops of a rim, a light edge and the bat.",
  "A: an opt-in kit option shell.over({ panel: false }) so Pipistrelle can show its own Results and 'The echoes fade' screens with no confetti, while runEnd and phase 'over' still fire.",
  "C: set pieces with a real failure state but fair warnings (collapse wave, rising water, the Grey Lady who is outwitted and never harmed), with roost-ledge checkpoints (A/C).",
  "C (v1.2): the Chorus finale, a ring radius of 600 + 4 x lifetime pups. Keep it on the roadmap as the narrative payoff."
 ],
 "cut": [
  "B's second currency (amber) and the 43-item Amber Shelf. One currency is simpler to explain, test and balance. Earn cosmetic coats through achievements instead (A's Carvings to Coats).",
  "B/C's training trees and knacks in v1. They are stat creep that leaks into the endless-mode best (the Kiln score) and they multiply the balance surface by the number of bats. Ship bats as sidegrades (A); revisit training in v1.1 if moth sinks are too thin.",
  "Biome count. Ship 4 biomes x 6 caves (C's Act I shape), dressed with A's schema and art direction: for example Chalkmouth, Drowned, Amethyst, and an owl biome (C's Owlstone Crypt or A's Lantern Roots). Defer A's Vaults, Windpipes and the Hush, B's Reaches IV-V, and all of Ember Seep, Rime Hall, Rootways and Sulphur.",
  "Bats. Ship 4 bought bats plus the starter. Choose those whose ability reuses existing systems: Daubenton's skim (water flags), Long-eared Listen/whisper (a ping-like reveal), Noctule (bigger stats; plus B's cone or C's Bolt dash). Defer the horseshoe beam, the Ghost bat roar and B's perch/hang to v1.1.",
  "A's 7 unique Homeward Flight landscapes and C's 4 bespoke Dusk Flights. Ship one parametric night-flight scene, biome-tinted, with 1-2 random events.",
  "A's 19 moth species with 4K specimen plates and 79 hand-named pups. Ship about 8-10 species whose behaviour reuses existing systems (B/C lists) and generated pup names.",
  "B's calendar events (Bat Night, Bat Week, solstice). They are FOMO-adjacent and Bat Week is 2 weeks away. Defer them entirely.",
  "B's Wild Colony (hundreds of decoy bats). It is a particle-count risk on Low phones. Defer it.",
  "C's Bellringing, glass gates (A) and tide (C) in v1 if M3 slips. These need gate cells plus a local flow-field rebuild and passability changes during play. They are the first mission type to cut, as C's own cut line says.",
  "A's Ultra extras (1,400-4,000 ambient particles, 16 rays per light source, 96 px dot sprites, d=3 rock chunks, water-mirrored echo dots). Cap Ultra at roughly 2x the High budget. The 4K win comes from rims, the detail pattern and the glow atlas, not from particle counts.",
  "Different echo pool sizes per tier (B, C). Pools, ray counts and echo lifetimes must be identical on every tier. A tier may change fidelity, never information or simulation.",
  "The hiQ path and the special 'Gentle Dark' or 'Gentle Wings' variants beyond one assist toggle. Keep a single assist setting.",
  "Photo mode, gamepad, New Game+, Trials, Carry missions, Omens, and weekly expeditions. All of these belong to v1.1 or later."
 ],
 "risks": [
  "The game-check frame budget in software raster. Today's game already hits p95 33 ms in caves 5 and 8 on the phone profile. Moving rock, darkness mask and memory onto the full-resolution main canvas (A) adds full-screen passes exactly where game-check measures (390x844@2, software). Auto must detect software raster (a WebGL renderer string such as SwiftShader, or a 300 ms microbenchmark) and start at Low. The governor must settle inside game-check's 3 s window.",
  "Dynamic resolution below DPR 1 is impossible through Kit.view today. hub/kit.js line 689 floors DPR at 1 (Math.max(1, ...)). On a 4K DPR-1 desktop the backing store can never drop below 8.3 MP, so the proposed Ultra/High floors of 0.6-0.7 cannot work. Either add an opt-in minDpr in the kit or have Pipistrelle size its own backing store. Kit.view already accepts maxDpr and maxPixels (line 663).",
  "The Android build is portrait-locked (AndroidManifest screenOrientation=portrait) while caves scroll left to right. Every proposal's constant-area camera gives a portrait phone about 420-470 world px of width against 840-960 on landscape, so 'same field of view' is false on the primary platform. Mission timing (time Moons, Silence, Hush) must be balanced for portrait. Consider a forward-lead camera bias in portrait, or caves with more vertical play. B's tall caves and C's 'rise' layout suit portrait well.",
  "Night flight in portrait. A fixed 900-1000 px wide world band letterboxed on a 390 CSS px phone gives zoom of about 0.4 and a bat a few px wide. Fix the band height and the spawn rule (moths per world px scrolled, spawned at a fixed distance ahead), not the visible width.",
  "The 12 px grid with CA roughening and a 3x3-averaged field cannot represent 14-18 px squeezes or cracks (B's squeeze, C's Mote cracks). They need a post-CA carve, a field override and their own collision tests, or they will be silently sealed or will leak into every bat's path.",
  "Frozen curated seeds versus generator changes. Any generator edit after the cave data is frozen (new hazards, layouts, the rng split) changes every campaign cave, named pup and Moon verification. Lock the gen stream early, fingerprint all 24-25 caves in test.cjs, and require a rescan for any generator change.",
  "Moon and Mark verification bots. Autopilot cannot prove Silence, Hush, Follow or 'wake no owl' goals. Scripted routes per cave are a sizeable hidden workload. Without them the promise that 'every Moon is achievable with the starter bat' is unverified.",
  "Contract and toolchain prerequisites outside the folder. tools/bundle.cjs inlines only sdk.js and kit.js, so local js/*.js tags become dead URLs inside srcdoc. docs/GAME_CONTRACT.md still says single-file. Kit.shell.over always shows the panel and confetti on a new best. These need a decision and small, opt-in shared-code changes before M0 and M5.",
  "Test-hook semantics. The current test.cjs assumes an endless run: cave(n), Continue at Cave 2, a night flight that adds to score, energy carried over. __kilnTest.start() should keep starting an endless (Long Night or Migration) run with Pip, as B proposes. Otherwise all 17 existing tests need rewriting at the same moment the code is being split.",
  "Chunk painting hitches and WebView memory on mid-range Android. Bound the per-frame chunk budget, prefetch along the flight direction, paint behind the entry fade, use per-tier LRU caps, and release everything on cave exit. Validate on a real device, not only headless Chromium.",
  "Sonar CPU growth. Guide NPC rings, drip-clock mini-sonars, crystal re-echo chains, a beam firing 40 rays every 0.1 s, and jammer jitter all add rays on top of the existing shriek spike (320 rays x 210 steps). Cap the number of rays cast per frame globally, and pool the sortMem arrays.",
  "Parallel-agent merge conflicts. The 158 KB IIFE has late-bound globals (loop, input, shell, SONG, TMP) and a ctx that is switched mid-frame. Until M0 lands with the event bus and registries, agents cannot work in parallel safely.",
  "Scope. Every proposal's day-count plan underestimates content (biome art packs, songs, hazard art, menus). Enforce the cut line: camera, tiers, profile migration, missions engine, and 4 bats are never cut; biomes beyond 4, flights, cosmetics and extra mission types are cut first.",
  "Save migration. Existing players' keys (run, best, taught, runs) must load into profile v2 without loss. registry.js currently declares saves: 'run'; changing it to 'profile' needs checking against how the hub uses that field."
 ]
}
```