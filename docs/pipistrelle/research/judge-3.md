```json
{
 "scores": [
  {
   "proposal": "A (world): Under Hollin Hill",
   "fun": 7.5,
   "originality": 8.5,
   "atmosphere": 10,
   "progression": 7.5,
   "fairness": 8.5,
   "feasibility": 4.5,
   "notes": "The strongest at making each cave a place. Its best ideas make the biomes change how sonar behaves, not just how the caves look: lantern gnats that dim when you shriek, crystals that hold your echo for 4 s, dots in the Windpipes drifting downwind so you can see the air, the Choir's double returns, the Hush where echoes never fade, and Old Scratches you can only read in echo dots. The 4K section is the most rigorous of the three: a glow atlas with baked dither, core-plus-halo bloom with no blur filters, rock moved to the main canvas, capture scenes rendered on the real tier, and a 2-device-px level-of-detail rule. Problems: (1) The scope is not credible. It has 6 biomes plus the Hush, 9 new hazards, 4 finale mechanics, 19 moths, 12 cave-life entries, 79 named pups, 7 flights, 7 songs and 30 Carvings, against a 7-day plan. (2) Drip rain lowers and muffles the echo audio. Mobile players often play muted and it hurts deaf players, so information must never live only in audio. (3) Several bats trivialise their own biome's Notes. Barbastelle means owls never wake from sonar, which empties 'Wake no owl'. Daubenton's means water never hurts, which empties 'Never splash'. Sidegrades are fine, but Notes must then be validated per bat or reworded. (4) The Lesser Horseshoe beam replaces the ring, the game's hero moment. (5) The camera rule gives a portrait phone 470x1017 world px and a 4K landscape screen 960x540. That is not 'the same field of view'. It matters because the APK is portrait-locked and 4K is landscape. (6) Mission depth is mostly checklist Notes (chirp counts, energy thresholds) rather than new ways to listen."
  },
  {
   "proposal": "B (progression): Full Game Design Proposal",
   "fun": 7.5,
   "originality": 7.5,
   "atmosphere": 7,
   "progression": 9.5,
   "fairness": 9.5,
   "feasibility": 5,
   "notes": "The best economy and fairness thinking. Its strengths: the fairness charter (no streaks, no scarcity theatre, exact prices shown next to balances, a dot for new items only), Practice Hollow so you can try before you buy, training refundable at any time, the rule that skipping the night flight still banks the average yield, an economy table held as data plus a simulator test with \u00b125% milestones, colony size bringing new species to the Roost (a thematic way to gate a purchase), and save export/import for a future standalone app. It also contributes three of the purest sonar ideas: glowworm lures that look gold but echo as teal rock ('trust your ears over your eyes'), hushmoss that returns no echo, and the Thousand Wings cave, where only your own pups answer in pink. The family music layer (each trailing pup adds a voice) is lovely. It is the only proposal to notice that the Android shell is portrait-locked. Problems: (1) Two currencies plus a population plus 3 training tracks plus knacks plus a 43-item Amber Shelf is a lot of free-to-play machinery. Amber reads like a premium currency even though it is earned. (2) The training sink is about 21.7k moths for up to +15% stats. That is grind and mild power creep, which contradicts 'skill dominates'. (3) Five different voice strategies (cone, beam, dash, hush, roar), with Nox and Horace's 'hold' conflicting with the shriek gesture, is costly in design and testing. Horace's beam also replaces the ring. (4) The species mix breaks the naturalism: the Ghost bat is Australian, and luna, Atlas, emperor and rosy maple moths are American or Asian, in what is otherwise an English chalk-hill world. (5) The Fen squeeze is a gap of radius 7 or less on a 12 px grid. The 3x3-averaged field and the cellular-automaton smoothing will close it, so it needs a dedicated passage type that overrides collision. (6) Biome atmosphere is a short table and much thinner than A."
  },
  {
   "proposal": "C (missions): The Long Rain",
   "fun": 9,
   "originality": 9,
   "atmosphere": 8,
   "progression": 8,
   "fairness": 9,
   "feasibility": 6,
   "notes": "The only proposal that deepens the core verb instead of wrapping systems around it. It adds new things to listen for without adding controls: pups that answer through rock as delayed pink edge arcs, drip clocks (every landing drip is a 90 px mini-sonar), tiger moths that jam echoes and are found by the scramble itself, light- and deep-sleeping owls, decoys (a woken owl flies to the loudest sound, including a crystal's re-echo), a guide bat whose rings paint the cave for you, and bells that open membranes. Moons that dim the moment they become impossible, with a bot run by an untrained Pip proving every Moon, is the best fairness mechanism in any proposal. Sound captions keep the game playable without audio. The 'Heard well by' line on the cave brief has no buy button. Cutting the night flight from the campaign fixes the pacing. The Chorus finale, whose radius comes from lifetime pups, is a superb payoff. Problems: (1) v1 has only 4 biomes and 4 purchasable bats, and the Chorus payoff is deferred to v1.2. The owner asked for the full suite now, so this risks shipping an 'Act I' that never finishes. (2) Nine mission types is too many. Silence (chirp budgets) works against the joy of chirping, and Survey and Follow can feel like chores. Keep budgets as Mastery Moons only. (3) Building the `rise` layout by transposing the grid breaks the arch, the flow-field assumptions, gravity hazards (stalactites would hang from what was a wall) and rivers. It needs real generator work, not a transpose. (4) Mote's 18 px hairline cracks are 1.5 cells and will not survive cellular-automaton smoothing or field-based collision. They need their own cell type and a collision exception. (5) Kitti's hog-nosed bat is Thai, the same naturalism problem as B. (6) Its HUD formula, uiScale = max(1, min(w/1280, h/720)), stays at 1.0 on every phone, so text size on small screens is left to the existing fixed sizes."
  }
 ],
 "bestIdeas": [
  "C: Pup answers. When the ring passes a hidden pup it squeaks back, shown as a pink arc at the screen edge, delayed by its distance and working through rock. It is cheap and is the best new 'way of knowing'.",
  "C: Drip clocks. A landing drip is a 90 px mini-sonar, so steady drips become free, rhythmic light. B has the same idea at 60 px.",
  "C: Owl hearing (light and deep sleepers) and decoys: a woken owl flies to the loudest recent sound, and a crystal re-echo counts. Predators are outwitted, never fought. The Grey Lady set piece belongs with these.",
  "C: Tiger-moth jammers that scramble echoes within 120 px and are found by the scramble itself. Also crystal bells that open membranes, merged with A's glass gates (chain 3 re-echoes).",
  "C: Moons (three per cave, earned independently across attempts) that dim live the instant they become impossible, plus bot verification that every Moon can be earned with an untrained Pip.",
  "C: Sound captions (directional edge glyphs for pup answers, ticks, hoots, gust warnings and the collapse rumble), so no information lives only in audio.",
  "C: No night flight between campaign caves. Use one Homeward or Dusk Flight per chapter with a real event. Long Night keeps an 8 s flight that can be skipped, and per B, skipping banks the average yield.",
  "C: 'Heard well by: X' on the cave brief, with no buy button, and the rule that a bat changes which skill a Moon tests but never unlocks a Moon Pip cannot earn.",
  "C: The Chorus finale, whose ring radius comes from lifetime pups rescued. Ship it in v1 as the finale cave (A's Hush and Old Echo meeting), not in v1.2.",
  "A: Biomes that change how sonar behaves: crystals that hold the echo for 4 s (Amethyst), lantern gnats that dim when you shriek (Roots), echo dots drifting downwind so the air is visible (Windpipes), mirrored and doubled echo returns (Drowned Choir), echoes that never fade (Hush). The echo colour code stays fixed, and rock hue may move only inside the teal band.",
  "A: Old Scratches, lore that resolves only inside echo dots (C's echo murals are the same idea). One per cave, kept in the Journal.",
  "A: Biome data schema (palette, strata painter, decals, parallax, lights, ambient, weather, hazard pool, gen params, audio and echo FX), so one agent can build each biome pack in parallel.",
  "A: Bell curtains that ring when a sonar ring hits them and shake stalactites within 300 px (clear a path from a distance, or trigger it by accident). Chalk crusts that teach the shriek as a tool. The Organ that answers a chirp with a chord.",
  "A: The 4K render spec: a glow atlas (64, 256 and 512 px) with baked dither, core-plus-halo bloom with no ctx.filter or shadowBlur, rock and memory in 256 px LRU chunks on the main canvas with vector rims from segs, a size rule that draws nothing below 2 device px with 'hi' detail only at 6 device px or more, gameplay silhouettes independent of tier, and capture scenes on the real tier (remove hiQ).",
  "A/B/C: Quality tiers Low, Medium, High and Ultra with a dynamic-resolution governor, under one rule: tiers change fidelity and never information. Echo pools of at least 6,000 dots and 4,000 lines in every tier so shrieks never overwrite live dots (A's rule, not B and C's per-tier pools). Split rng into gen, sim and fx streams.",
  "A/B/C: A camera that holds visible world area constant, chosen on the short side so a portrait-locked phone and a 4K landscape screen both hide the arch from the cave start (B noted the portrait lock). A fixed-size night-flight world letterboxed with sky.",
  "B: Fairness charter written into the docs and checked in review: no streaks, no expiring or rotating stock, exact price shown next to balance, a dot for new items only, the story gated by skill alone, banked moths never lost.",
  "B: Practice Hollow, to fly any arrived species free before buying. Training fully refundable.",
  "B: Colony size brings species to the Roost ('Arrives when your colony reaches 36'), shown as plain information. Every rescued pup is drawn hanging in the Roost, named (all three proposals share this).",
  "B: Glowworm lures that look like gold moths but echo as teal rock. Hushmoss that returns no echo, so you fly by the memory map. The Thousand Wings decoy colony where only your pups answer in pink.",
  "B: Family music layer, where each trailing pup adds a voice to a music-box melody. Reverb sized from the local dist field.",
  "B: Economy as one data table plus a pure-function simulator test of pacing milestones. Save export and import code.",
  "A/B/C: One currency (moths) for bats and functional items. Cosmetics are earned through Moons, Requests and Carvings, not bought with a second currency.",
  "A: A shell.over option with no panel, so Pipistrelle shows its own Results and 'The echoes fade' screens with no confetti. Per-mode runEnd props, so the Kiln best comes from Long Night only.",
  "A/C: Long Night (today's endless game with energy carry-over) keeps the Kiln score. Tonight's Flight or Nightly Cave is seeded by date, with no streak, and B's real moon phase changes owls and moths.",
  "A: An echo volume separate from music, plus an 'Echo shapes' colourblind mode where dot shape carries meaning (crosses or triangles for danger, hearts for pups).",
  "B/A: Parametric bat renderer (ears, noseleaf, wing aspect, fur, flap rate) shared by flight, Perch preview and Roost.",
  "Bat roster to keep (real species that fit an English chalk hill, each with one perception twist): Pip; Brown long-eared (passive Listen sparks, whisper chirps, long echo life); Daubenton's (skim, current boost, water echoes last longer); Natterer's or Soprano (small, nimble, squeezes); Noctule (fast, loud, dash); Barbastelle (quiet calls, unjammable). The Greater Horseshoe Old Echo is earned at the end."
 ],
 "cut": [
  "Beam- and cone-sonar bats (A's Lesser Horseshoe, B's Horace and Nox Forward Call, C's Hollow). They replace the ring, which is the hero moment. Defer, and if ever added, add them as an extra on top of a normal chirp, never instead of it.",
  "B's second currency (Amber) and the 43-item Amber Shelf. Earn cosmetics from Moons, Requests and Carvings so the game reads as one honest currency.",
  "Most of B and C's Training (up to +15% stats, about 21.7k and 8.5k moth sinks) and Knacks. Training is a grind sink and power creep. Keep at most one Knack per bat as a sidegrade, or defer it entirely.",
  "A's drip rain muffling the echo audio, unless the same information is also shown visually. An audio-only handicap is an accessibility and muted-phone problem.",
  "C's mission-type sprawl. Keep Homing, Kin, Hush, Escape and Bellringing as primaries. Fold Survey and Larder into Moons. Use Silence and chirp budgets only as Mastery Moons. Defer Follow, or limit it to one or two guide caves.",
  "Non-native species in a British setting: B's Ghost bat, luna, Atlas, emperor and rosy maple moths, and C's Kitti's hog-nosed bat. Use the European roster and native moths (A's list) to keep the naturalist identity.",
  "C's `rise` layout built by transposing the grid, and B's tall layout, in v1. Do set pieces (rising water, cave-in wave, global wind) on the existing left-to-right generator, as A recommends. Vertical shafts go to v2.",
  "B's calendar events (Bat Week is about two weeks away), Roost decor slots beyond a handful, night-flight mini-events, and 30 Carvings with 19 moths with 4K specimen plates. Defer them to v1.1.",
  "A's full v1 biome count (6 plus the Hush, 9 new hazards, 4 finale mechanics). Ship 5 biomes plus the finale cave in v1, with about 2 new hazards per biome. Ember Seep, Rime Hall and Rootways go to v1.1.",
  "A's Homeward Flight per chapter with 7 bespoke landscapes. Use one shared flight engine with per-chapter palette and one event each.",
  "Hairline cracks or squeezes as plain carved gaps (B's radius-7 squeeze, C's 18 px cracks). Cut them unless a dedicated cell type and collision exception is built. Otherwise defer them.",
  "C's 'v1 ends at Act I'. Do not ship a cliffhanger. The finale (Hush and Chorus) must be in v1, even if smaller."
 ],
 "risks": [
  "Scope. All three proposals are 2-4x what their day estimates claim. Without a hard v1 cut (about 5 biomes, about 25 caves, 5-6 bats, one currency) the build will stall half-finished. Lock the merged scope and cut order before M0.",
  "game-check budget. 390x844 @2 in software must stay at or under 25 ms p95. Moving the rock and memory chunks onto the full-DPR main canvas adds roughly a full-screen blit of fill on top of today's layers. Auto must start at Low or Medium in headless runs, and each milestone must be measured against it.",
  "Camera fairness versus the portrait lock. The APK is portrait-only and 4K is landscape. None of the proposed formulas gives equal fields of view (A's gives 470x1017 against 960x540). Moon time targets, the arch being hidden from the start, and owl wake distances must be tuned for the worst case, or the camera must normalise the long side.",
  "Kiln contract and scores. The SDK's runEnd also writes best. Campaign per-cave scores would pollute the hub best unless runEnd gains a mode or new_best control. shell.over with no panel is a shared kit change that could affect other games. registry `saves: 'run'` to `'profile'` must not break the hub's Continue or reset handling.",
  "Generator limits. Squeezes, cracks, stamped landmarks, set pieces and frozen curated seeds all depend on generator code. Any later generator change silently alters 25 curated caves and their named pups. A seed-scan plus fingerprint test per cave is mandatory, and generator changes after the caves are frozen require a rescan.",
  "Bat and mission interaction. Sidegrades that switch off a hazard (whisper, skim, web immunity) can trivialise Moons. Every Moon needs per-bat validation, and Moon bots must check both that Pip can earn it and that no bat makes it trivially automatic.",
  "Phone memory and hitches. Chunk LRU budgets of 16-160 MB in an Android WebView, and painting chunks synchronously on cave entry (generation already takes 13-128 ms plus art on desktop), risk out-of-memory errors and stalls. Paint behind the fade under a per-frame budget, and release chunks on cave exit.",
  "Soul drift. Adding lights (moon shafts, gnat ceilings, caustics, moonbeams, glowworms) can light the cave 'for free' and erode 'darkness is the canvas'. Every biome light must be sparse, tied to sound or a sonar mechanic, and checked in captures for how much of the cave is readable without chirping.",
  "Tooling prerequisites. tools/bundle.cjs breaks on a multi-file game. GAME_CONTRACT.md still says single-file. The kit caps gfx.dpr at 2. These outside-folder decisions block M0 and touch shared code.",
  "Save migration. v1 keys (run, taught, runs, best) must migrate to profile v2 without losing a Long Night Continue in progress. Returning-player gifts must be capped so the early economy is not broken. Fixture-based migration tests are required.",
  "Audio-centric design on a device that is often muted. Pup answers, ticks and jammers must always have a visual twin (C's captions), or the game fails for most mobile sessions."
 ]
}
```