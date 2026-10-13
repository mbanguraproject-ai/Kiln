```json
{
 "scores": [
  {
   "proposal": "A",
   "fun": 8,
   "originality": 9,
   "atmosphere": 10,
   "progression": 7,
   "fairness": 9,
   "feasibility": 4,
   "notes": "Strongest sense of place by far. Each biome changes how you hear, not only how it looks: drip rain muffles echo returns, Choir slapback echoes, crystals that hold your echo, lantern gnats that dim when you shriek, dots that drift downwind so you can see the air. Old Scratches that can only be read in echo dots tie lore to the core mechanic. Bats are sidegrades with no stat grind, there is one currency, Notes never gate chapters, and the campaign can be finished with the starter bat. Those are the right premium instincts. Problems: v1 scope is enormous. It has 6 biomes plus the Hush, 25 caves, 16 hazards (9 new), 7 songs with 7 ambience beds, 19 moth species with 4K specimen plates, 79 named pups, 30 Carvings, 15 decor items and 7 Homeward Flights. The 7-day build plan is fantasy. The Homeward Flights are no-fail by design ('you cannot die'), so they are still cutscene-ish filler. The camera rule gives a portrait phone a 470 px wide view against 960 px on landscape, which hurts look-ahead in a left-to-right cave on the main platform. The Ultra tier's 'DPR 3 at 4K' row is not a real configuration. Mission depth is mostly checklist Notes (all pups, exit with N energy, under N chirps) rather than new ways to play."
  },
  {
   "proposal": "B",
   "fun": 7,
   "originality": 7,
   "atmosphere": 6,
   "progression": 8,
   "fairness": 6,
   "feasibility": 4,
   "notes": "The best-modelled economy: earn/sink tables, pacing targets, a pure-function economy simulator test, refundable training, Practice Hollow so you can try a bat before buying, and an explicit fairness charter (no streaks, no scarcity theatre, a new-item dot that clears once seen). It has a few excellent sound mechanics: glowworm lures that look gold but echo teal ('trust your ears over your eyes'), hushmoss that returns no echo, moonbeams where light is the danger, and a decoy wild colony where only your pups answer in pink. Real moon phase for the daily cave is lovely. But it is the grindiest of the three. About 43,000 moths of functional sinks, 21,700 of them in training ranks, is roughly 16 or more hours of replaying for +12-15% stats. That is exactly the filler a premium player resents, and it creates power creep against Moon/Mark balance. Two currencies plus a colony population is more bookkeeping than the game needs. Paid echo tints and chirp-voice skins touch the gameplay channel: the echo colour code and the chirp sound are information. Colony-gated bat arrivals mean daily and endless play accelerate unlocks, a mild engagement nudge. Some roster choices break tone: an Australian ghost bat whose Roar stuns owls (close to combat) in an English chalk hill. Seven bats, each with a different voice system (cone, beam, dash, hush, roar), plus 5 Heart set pieces and a tall layout make it as heavy as A while being less atmospheric."
  },
  {
   "proposal": "C",
   "fun": 9,
   "originality": 9,
   "atmosphere": 7,
   "progression": 8,
   "fairness": 9,
   "feasibility": 5,
   "notes": "The deepest game design. Each biome adds one new way of knowing the cave through sound, with no new controls: pup answers through rock as delayed pink edge arcs, drip clocks as free mini-sonar, crystal re-echoes as remote lamps and then as owl decoys, light versus deep sleeper owls, tiger moths that jam your echoes, a guide bat whose rings you follow silently. That is how Alto or Monument Valley deepen one verb. Moons that dim live the moment they become impossible, and bots that verify every Moon with an untrained Pip, are the right fairness guarantees. A bat never unlocks a Moon; it changes which skill the Moon tests, and the 'heard well by' table shows each bat is a real alternative route. Removing the night flight between campaign caves fixes the pacing complaint. The Grey Lady set piece (outwit, never harm) and the Chorus finale (ring radius = lifetime pups rescued) are memorable. Sound captions double as accessibility and teaching. Weaknesses: atmosphere is thinner than A (4 biomes, less sensory specification). The story ending is deferred to v1.2, which leaves v1 ending on 'older voices still below', a bad look for a premium standalone. Training plus tints still create a spend gap (about 15,200 sinks against about 8,700 earned from content), so it inherits some grind. Nine mission types plus 72 bot-verified Moons is a large QA surface, and some Moons need scripted routes. Survey, Silence and Follow risk feeling like restrictions rather than play if overused."
  }
 ],
 "bestIdeas": [
  "C: Moons per cave (Homecoming / Kin / Mastery), earned cumulatively across attempts. The HUD dims a Moon the instant it becomes impossible, with the reason ('Mastery lost: 13th chirp').",
  "C: Every Moon is verified achievable by a dev-time bot flying untrained Pip. A purchase changes which skill a Moon tests and never gates it. Show a single 'Heard well by: X' line on the cave brief, with no buy button there.",
  "C: Pup answers. When your ring passes a hidden pup it squeaks back, and a pink edge arc appears, delayed by distance, through rock. This is the single best new core-verb layer.",
  "C: Drip clocks. A landing drip is a free 90 px mini-sonar (B proposes the same as a 60 px micro-sonar). This gives rhythmic free light and makes Silence/low-chirp play possible.",
  "C: Crystal re-echo as a tool that grows over the game: remote lamp, then owl decoy (a woken owl flies to the loudest recent sound). Add owl light and deep sleepers, with a 160 px ring-front wake rule.",
  "C: Tiger moths that jam your echoes, found by the scramble itself. A guide bat (Follow) whose warm-white rings light the cave while you stay silent.",
  "C: Rising action inside each cave: a safe staged introduction of the new hazard at the mouth, the mission in the gallery, then a signature-hazard gauntlet before the arch, which stays out of view until then.",
  "C: No night flight between campaign caves. A few longer, eventful flights between biomes, skippable after the first viewing. The Long Night keeps a short 8 s flight. The flight world is a fixed size, letterboxed (A and B agree).",
  "C: Set pieces that create real but telegraphed dramatic failure: the collapse wave escape, the rising-flood vertical shaft (built by transposing the existing generator grid, which is cheap), and the Grey Lady, who is outwitted and never harmed.",
  "C: The finale Chorus ring radius = 600 + 4 x lifetime pups rescued. The ending's power is your save file. Ship an ending in v1, not v1.2.",
  "C: Sound captions. Directional edge glyphs for pup answers, ticks, hoots, gusts and rumbles. Accessibility, and a teaching tool for hearing players.",
  "A: Biome as data with one schema (palette, strata painter, parallax, lights, ambient, weather, audio bed, echo FX, song, hazard pool) so biome packs can be built in parallel and reviewed against a capture.",
  "A: Weather and light that alter perception as mechanics: Vaults drip rain low-passes echo returns; the Choir's double slapback; Amethyst crystals hold your echo glow for 4 s; Windpipes dots drift downwind to show the air; lantern-gnat ceilings that dim when you shriek.",
  "A: Old Scratches. Lore on cave walls that resolves only inside echo dots and is kept in the Journal. C's echo murals are the same idea; pick one and keep about 3 per biome.",
  "A: Chalk crusts that only a shriek cracks. This teaches the shriek as a tool and opens secret niches.",
  "A: The echo colour code is sacred. Biomes may shift rock-echo hue only inside the teal band and never change meanings. Add an 'echo shapes' colourblind mode (A), with danger as crosses (C).",
  "A: Bats are real species and sidegrades, with no stat-upgrade grind. The campaign can be finished with Pip. Bats are purchasable when you reach their home biome. One currency (moths/Larder). Coats are earned through achievements, never sold.",
  "A: Per-biome echo voice processing (reverb send, low-pass, slapback, bell partials) plus shared adaptive music layers: pups, danger, exit, deep.",
  "A+C: The Roost home screen visibly fills with every rescued pup, each named with the cave it was found in. It changes per chapter (A: the flood line fades, adults return, the bell rings at the end of Act I in C).",
  "B: Practice Hollow. Fly any available bat free at base stats before buying. A purchase confirm shows the exact price next to the exact balance.",
  "B: Glowworm lures that look like gold moths but echo teal. Hushmoss cells that return no echo, so you navigate by memory map and the edges of silence. Moonbeams where light makes you visible to owls.",
  "B: The fairness charter written into the design doc and checked in review. No streaks, no rotating stock, no countdowns, no red badges. A 'new' dot clears once seen. Banked moths are never lost.",
  "B: An economy table in one data file, plus a pure-function campaign simulator test that asserts the pacing milestones within +/-25%.",
  "B: The daily cave uses the real lunar phase computed offline (new moon darker with deeper-sleeping owls, full moon brighter with hunting owls). Untrained or base stats, no streak, an empty-sky calendar for missed nights.",
  "B: Night flight setting Full/Short/Skip, where Skip banks the average yield so skipping is never a loss.",
  "A/B/C: A constant visible-world-area camera instead of the 1.45 zoom cap. Quality tiers (Low/Med/High/Ultra) plus a frame-time governor. 256 px chunked cave art in an LRU cache, vector rims from segs, a 512 px dithered glow atlas, a native-resolution detail pattern, a UI scale anchored to safe-area corners, a wordmark that never wraps. Capture scenes use the real tier, never hiQ.",
  "A/B/C: Separate rng streams (gen/sim/fx), an event bus with run stats, a hazard registry (place/update/ping/draw), profile v2 in one key with a versioned migration from run/taught/runs/best, and a returning-player gift.",
  "A/B: Parametric bat art (ears, noseleaf, wing aspect, fur, flap rate) shared by flight, shop preview and HUD icon. B's Horseshoe beam with Doppler outlines on moving things is the most distinctive alternate voice.",
  "A: shell.over({ panel: false }) kit option (or a themed fallback) so Pipistrelle shows its own Results and 'The echoes fade' screens with no confetti."
 ],
 "cut": [
  "Training ranks and Knacks (B and C). 21,700 (B) and 8,500 (C) moths of +4-15% stat ranks is grind and power creep that undermines Moon balance. Bats as sidegrades are enough. If any long tail is wanted, use cosmetics earned through achievements.",
  "Amber as a second currency (B). Keep one currency. Coats and decor come from Carvings, Requests or Journal completion, not a separate wallet.",
  "Purchasable echo tints and chirp-voice skins (B). The echo colour and the chirp sound are gameplay information. Accessibility palettes stay free settings; voice skins are cut.",
  "Seven bats in v1 with five distinct voice systems (B). Ship Pip plus 4 purchasable bats (for example Daubenton's skimmer, brown long-eared listener, noctule or dash, and either a horseshoe beam or a tiny crack-runner) and defer the rest. Drop the Australian ghost bat's owl-stunning Roar: it breaks tone (combat-like) and setting.",
  "Six biomes plus the Hush in v1 (A). Ship 4 biomes (Chalk, Drowned, Glass/Amethyst, Owl crypt or Lantern Roots) plus a short finale cave so v1 has an ending. Windpipes, Ember Seep and Rime Hall move to v1.1+.",
  "Deferring the ending to v1.2 (C). A premium standalone v1 needs a complete arc. Move a compact finale (the Chorus, or the Old Echo) into v1 and treat later acts as expansions.",
  "19 moth species with 4K specimen plates and 79 individually authored pups (A). Cut to about 10 species with behaviours that matter (jammer, luna/echo-lit, herald, ghost moth) and generated pup names.",
  "No-fail Homeward Flights after every chapter plus daily, endless and campaign flight variants (A). Keep 3-4 eventful, skippable Dusk Flights (C) and the short endless flight. Defer weather variants and calendar events (B).",
  "Purchasable Roost decor (A's 15 items), calendar events (B), photo mode, gamepad, export/import save codes, Commission swap pools of 40 (B). All defer to v1.1. Keep about 15 Requests that never expire.",
  "Nine mission types at launch (C). Ship Homing, Kin, Hush, Escape, Larder and Silence. Fold Survey into Mastery Moons. Defer Follow and Bellringing (or keep one bell set piece) to cut the bot-verification and puzzle QA load.",
  "A's 'bell curtains', 'glass gates (3 re-echoes in 2 s)', siphons and scree as separate new hazards. Too many new systems. Keep at most 1-2 new hazards per biome, built from existing systems (lures, hushmoss, crusts, tide, collapse wave).",
  "Unrealistic tier rows such as 'DPR 3 at 4K / 8.3 MP Ultra on everything'. Tiers must be budgeted by measured frame time, not maximal numbers."
 ],
 "risks": [
  "Scope explosion. All three proposals are multi-month content plans dressed as day-based agent plans. Without a hard v1 cut line (4 biomes, about 20-24 caves, 5 bats, one currency, an ending) quality per cave will fall back to 'templated', which is exactly what the owner rejected.",
  "Portrait-phone camera fairness. Android is portrait-locked and caves progress left to right. A constant-area camera gives the phone about 430-470 world px of horizontal look-ahead against about 900 on landscape. Mission timing, chirp coverage (420 px radius now nearly fills a landscape screen) and 'arch out of sight' rules will differ. Each layout needs a camera lead or bias toward the travel direction, or tall layouts, and Moon bots must run at both orientations.",
  "Retuning everything. Changing the field of view, campaign energy (full refill per cave) and removing night flights invalidates the current difficulty curve, test.cjs expectations (autopilot clears, frame budget) and attract mode. Plan a full balance pass, not a port.",
  "The game-check frame budget (390x844 @2, software raster, p95 25 ms) against chunked art painting, the glow atlas, ambient particles and per-biome parallax. Chunk-paint hitches on cave entry and LRU memory pressure in the Android WebView are the likely failures. The governor must converge within the 3 s measurement window.",
  "Frozen curated seeds are brittle. Any generator change after cave curation silently changes the campaign caves, named pup placements and Moon verification. Version the generator, fingerprint every campaign cave in tests, and rescan on change.",
  "Kiln contract friction. A multi-screen DOM front end must still let __kilnTest.start() begin a run in phase play from any menu. The fuzzed taps in game-check must not strand the game in a menu. Results need a shell.over without the confetti panel (a kit change). tools/bundle.cjs must inline local scripts, and GAME_CONTRACT.md must allow multi-file games. These outside-folder decisions block milestone 0.",
  "Rng split and module split change the fingerprint and break deterministic tests once. Late-binding globals (loop, input, shell, SONG) must be resolved in boot order or the split introduces subtle bugs.",
  "Economy drift. With bats as sidegrades and no training, moths could pile up with nothing to buy late. Without the B-style simulator and a few cosmetic or decor sinks, the currency becomes meaningless. Too many sinks reintroduce grind. Tune with the simulator, not by feel.",
  "Readability creep. Biome tints, bloom, caustics, gnat ceilings and particles can drown the echo dots that are the whole game. Every biome capture must pass a 'can you read rock/water/danger/food/pups at a glance on Low tier' review, and hi-detail must never change silhouettes.",
  "Ability input collisions on one thumb. Beam, dash, hang and shriek all compete for hold-still and second-finger gestures. This needs a playtest and possibly an optional action button.",
  "Audio scope. Per-biome songs, ambience beds, convolution reverb and adaptive layers on Kit.music/Kit.sfx may exceed what the kit synth supports or cost CPU on low phones. Echo returns must stay audible over music (provide an echo volume channel or ducking).",
  "Tone and accuracy. Mixing real UK species with exotic ones (Kitti's hog-nosed, the ghost bat) and real moth facts invites errors. A short fact-check pass is needed if natural-history notes ship in a Journal."
 ]
}
```