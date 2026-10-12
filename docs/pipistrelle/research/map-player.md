I played Pipistrelle at all three sizes. The core idea is genuinely original and worth building the full game around. What surrounds it is a well-made prototype: one cave look reused for every cave, flat placeholder hazards, and nothing that persists between runs except a best score. At 4K it is broken in three ways: the title wraps, the HUD is tiny and off-centre, and the whole cave fits on one screen.

## How I tested
- **Setup:** a local static server on ports 8991 to 8995, Chromium through Playwright, `games/pipistrelle/index.html?debug`.
- **Sizes:** 390x844 at DPR 3 with touch, 1280x800 at DPR 1, and 3840x2160 at DPR 1.
- **Input:** real button taps and keys (arrows, Space, Escape), autopilot, and the `__kilnTest` hooks (`cave(n)`, `win`, `owlList`, `stalList`, `webList`, `xray`, `drainEnergy`) to reach caves 2 to 14 and every hazard.
- **Pacing:** three seeded autopilot runs from cave 1 until death.
- **Repo:** no repo files were edited; the scripts live in `/tmp/pp/` (`play.cjs`, `haz.cjs`).

## Keep this: the soul of the game
1. **Echolocation as sight.** The black screen, the tap, the teal ring sweeping out and painting the walls in glowing dots that fade is a real, ownable mechanic. It looks best at 1280x800 (`/tmp/pp/desk/04-cave1-autopilot.png`). Rock is only lit while a ring passes over it, so the cave is genuinely remembered rather than shown.
2. **Readable colour codes.** Teal is rock, blue is water, violet is crystal (which re-echoes nicely, `/tmp/pp/phone/20-cave5-shriek.png`), pink-red is danger and gold is moths. A deep-cave screen is still easy to read.
3. **The bat itself.** Big ears, fangs, glowing body and a trail of pups with hearts. It has charm and is the best-drawn thing in the game.
4. **The exit moment.** Moonlight floods through the arch while "+7 x3" counts up and the pups fly out (`/tmp/pp/desk/06-exit.png`). It is a real emotional payoff.
5. **Fair rules.** Walls stun and never kill, hazards warn first (ticking stalactites, dust before gusts, owls that go alert before they swoop), and webs need a wiggle to escape. Generation is seeded and each cave adds one hazard. This design should stay.
6. **Sound design intent.** There are 23 synth sound effects, echoes return with distance-matched delays, and there are two procedural songs (normal and deep).

## Thin, templated or unfinished
- **Every cave looks the same.** The background, palette and sky are built once at boot (`buildBg()`), and the x-ray view shows the same navy noise with diagonal scratches in cave 1, 4, 8 and 12 (`/tmp/pp/haz/09-xray-cave4.png`, `11-xray-cave12.png`). The rock edges are stair-stepped because the rock is painted at half resolution and blitted nearest-neighbour. Nothing in the art says "flooded grotto" or "crystal cavern"; only a few hazard sprites change.
- **Caves differ only in layout and hazard count.** Size grows (2520x1040 in cave 1 to 4200x1500 in cave 11+), moths fall from 22 to 14 and the tunnel narrows. After cave 8 the caves are random mixes of the same seven hazards, and every such cave reuses the same two subtitles, "Deeper. Narrower. Fewer moths." or "Every echo counts down here". There is no biome, landmark, set piece, boss or story beat.
- **Hazard art is placeholder:**
  - Stalactites are red outlined triangles that read like debug shapes (`/tmp/pp/phone/13-cave3-hazard.png`).
  - The owl is a dark ellipse with a red outline and two orange eyes (`/tmp/pp/haz/02-owl-awake.png`).
  - Rivers are a single blue dotted line.
  - Webs are thin line art.
  - A stalactite crash is a white particle blob (`/tmp/pp/haz/05-stal-fall.png`).
  - Gusts and drips were not visible in any capture: at most a few faint vertical streaks.
- **Night flight is filler.** It is 15 seconds of the same clip-art moon, the same stacked-circle treeline and free moths, every time (`/tmp/pp/phone/07-night-early.png`). Autopilot clears early caves in 11 to 25 seconds, so the night flight takes up roughly 35 to 50% of early play time.
- **Shell screens are the shared kit template:**
  - **Title:** a dot-matrix logo, a tagline and Fly / New run. There is no menu, settings, collection, shop, stats or credits.
  - **Pause:** Resume, Restart, How to play, Sound, Vibration.
  - **Game over:** a stats card with confetti and only "Play again" (`/tmp/pp/phone/37-gameover.png`). Confetti clashes with "The echoes fade".
- **No meta progression.** The only saves are `run`, `runs` and `taught`, plus the kit's best score. Moths become score and nothing else: no currency, unlocks, bats, upgrades, missions, achievements, codex, map, daily seed or lifetime stats.
- **The cave-1 tutorial carries all the onboarding.** Later hazards get a one-line banner that sits over play for several seconds (`/tmp/pp/haz/02-owl-awake.png`).

## How it looks at 4K (3840x2160)
- **The title breaks.** "Pipistrelle" wraps to "Pipistrell / e", both at 4K and at 1280x800 (`/tmp/pp/4k/01-title.png`, `/tmp/pp/desk/01-title.png`). The kit caps `.k-title-inner` at 560px while the logo font grows.
- **The camera zoom is capped at 1.45 (`fit()`).** At 4K you see 2648x1490 world pixels, which is the whole of cave 1 including the exit arch from the start. The mystery of a dark cave is gone, and the cave sits as a small scribble in a huge black field (`/tmp/pp/4k/03-cave1-played.png`).
- **Everything is tiny:**
  - The bat is about 140 px wide out of 3840 (3.6% of the width).
  - The HUD text is about 12 px tall.
  - The pause menu is about 380x380 px in the middle of the screen (`/tmp/pp/4k/05-pause.png`).
  - The HUD is locked into a 1100 px centre column (`drawHud`), so it floats at x≈1380 instead of the corner.
- **Sharpness:**
  - The sprites, echo dots and rings are drawn at full resolution and are genuinely sharp at native 4K (`/tmp/pp/4k/crop-bat.png`, `crop-mid.png`).
  - The background, rock and darkness layers are drawn at 0.6x into the `#pp-low` canvas (2304x1296 at 4K) and stretched up, so they look soft and blocky.
- **Phones don't get full resolution either.** The kit caps DPR at 2, so a DPR 3 phone renders at 780x1688. The low layer is 234x507, a fifth of device resolution. Text and sprites still look good on the phone, but "full device pixel ratio" is not met.
- **Overall:** at 4K the cave reads as empty and too small. It needs a zoom that scales with screen size (so the visible world area stays about constant), a HUD and menus scaled with the screen, and real high-resolution rock art instead of an upscaled noise texture.

## Performance
Headless Chromium uses software rendering, so the absolute numbers are pessimistic. The relative costs are what matter.

| Size | Scene | fps | frame p95 (ms) | JS per frame avg / p95 (ms) |
|---|---|---|---|---|
| 390x844 @3 | title | 59 | 16.8 | 0.8 / 2.2 |
| | cave 1 | 57 | 16.8 | 1.1 / 3.1 |
| | cave 5 | 56 | 33.3 | 0.9 / 3.1 |
| | cave 8 | 50 | 33.4 | 1.3 / 3.7 |
| | cave 9 | 58 | 16.8 | 1.1 / 2.8 |
| | night | 40* | 33.4 | 0.5 / 1.1 |
| 1280x800 (clean rerun) | title | 54 | 33.3 | 1.0 / 2.7 |
| | cave 1 | 49 | 33.4 | 1.3 / 3.2 |
| | cave 5 | 48 | 33.4 | 1.2 / 4.0 |
| | cave 8 | 44 | 33.4 | 1.5 / 4.5 |
| | night | 59 | 16.8 | 0.5 / 1.2 |
| 3840x2160 | title / caves | 9.6–10.7 | 100–200 | 2–3 / 5–9 |
| | night | 11.6 | 133 | **37 / 92** |

\* The phone night measurement overlapped a moth burst during the exit-to-night transition, so treat it as noisy.

- **Cost tracks the size of the background layer, not the game code.** The JavaScript is cheap at 1 to 3 ms per frame. The phone, with a 0.12 MP back layer, ran faster than the 1280x800 desktop with 0.37 MP, and 4K with 3 MP fell to about 10 fps. The full-screen low layer (tiled background, darkness mask, rock blit, vignette) is the fill-rate cost.
- **The 4K night scene also costs about 37 ms of JS per frame**, likely from large gradient and tree fills.
- **There is no quality tier or dynamic resolution;** the only knob is the hard 0.6x on the low layer.
- **No console errors** at any size.

## Pacing and difficulty
- **Autopilot runs:** seed 11 died in cave 9 after 317 s, seed 23 in cave 7 after 228 s, and seed 57 in cave 8 after 266 s.
- **Cave length:** 11 to 25 s each, plus a fixed 15 s night flight.
- **The energy squeeze is the only difficulty curve,** and it works mechanically. Drain rises from 1.75/s to 2.3/s, and by cave 5 the bat leaves each cave at 20 to 40 energy. Death always comes the same way, slowly running out of moths, with no dramatic failure.
- **Early caves are too short to build tension;** cave 1 takes about 11 s. Then the night flight resets the mood every time. The rhythm is cave, cutscene-like break, cave, with little rising action inside a cave.
- **The hazards are gentle.** Webs, drips and gusts are mostly nuisances. Owls and stalactites cost 10 to 16 energy each. Nothing forces you to master the shriek or crystal re-echo.
- **Runs end around minutes 4 to 5 with nothing carried forward** except a high score.

## Meta loop: is there a reason to come back?
Barely. The only reasons are beating your best score and maybe seeing a hazard you haven't met. Moths have no value after the run, pups are a per-cave multiplier, and the runs counter is invisible to the player. There is no collection, unlocks, missions, alternate bats, cave map, daily or weekly seed, or lore. This is the biggest gap against the owner's brief.

## The 15 biggest gaps to a premium standalone game (most important first)
1. **No progression economy.** Moths and pups should become a persistent currency, with a roost or home screen where you spend it.
2. **No other bats to buy.** Different species with distinct stats and abilities, such as longer sonar range, a faster shriek cooldown, river resistance or a bigger moth magnet, with their own art and wing animation.
3. **No missions or goals.** Per-cave objectives (rescue all pups, exit with N energy, use few chirps), run challenges, a daily seeded cave and achievements.
4. **Caves have no identity.** Every cave uses the same rock, background and palette. It needs distinct biomes (limestone, flooded, crystal, root cave, lava or sulphur, glowworm grotto, ice), each with its own palette, echo tint, background layers, ambient particles and music stem.
5. **The 4K and large-screen presentation is broken:** title wraps, zoom is capped so the whole cave and its exit are visible, HUD is stuck in a 1100 px column, pause menu is tiny, background layers are upscaled from 0.6x. It needs resolution-independent zoom, UI scaling, and high-resolution rock and background art.
6. **No quality tiers or dynamic resolution.** About 10 fps at 4K, with fill-rate bound background layers. It needs auto-tiering (low layer scale, DPR cap, particle budget) and a resolution scaler driven by measured frame time, plus lifting the DPR 2 cap where the device can hold the frame rate.
7. **Hazard art is placeholder.** Triangle stalactites, ellipse owl, line rivers, near-invisible gusts and drips. Each needs real sprites, animation, sound-led tells and better death and hit feedback.
8. **There is no world structure.** Caves are endless numbered levels; after cave 8 they are random mixes with two generic subtitles. It needs a map or chapters, a named handcrafted cave per biome, landmarks, secret side chambers and an ending.
9. **The title and menus are a generic kit template.** A premium title screen (animated roost, parallax), a main menu (Play, Roost/Shop, Missions, Collection, Settings, Credits), real settings (music and sound volume, haptics, graphics quality, colourblind palette, left-handed controls) and a designed results screen with rewards earned are all missing.
10. **The night flight is repetitive filler** at 35 to 50% of early play. It should vary: weather, moon phases, different landscapes, mini-events (a hawk, a fireflies swarm, a storm), or be shorter or optional.
11. **The difficulty curve is flat.** There is no real threat or set-piece in a cave and runs die slowly from energy. It needs boss or chase caves (a flood rising, a cave-in, an owl hunt), elite hazard variants and a difficulty that grows inside each cave.
12. **Skills go unused.** Shriek and crystal re-echo are optional. Upgrades, unlockable abilities (echo pulse that stuns, dash, glide) and puzzles that need sonar mastery would give depth.
13. **No collection or lore.** There are no collectible moth species, cave journal or pup names. The "bring the pups home" heart is never paid off with a roost that fills up over time.
14. **Audio is two procedural loops.** It needs per-biome music and ambience beds, adaptive layers for danger and the exit, and richer positional cave reverb. This matters doubly for a game about sound.
15. **Onboarding and feedback are minimal.** One cave-1 tutorial, then banners that sit over play. Hazard introduction moments, a clear explanation of the multiplier, a run summary that shows progress toward unlocks, and a "next goal" teaser are needed. There is also no resume-aware polish beyond Continue.

## Screenshots
- **Phone** (`/tmp/pp/phone/`):
  - Title and cave 1: `01-title`, `02-cave1-start`, `03-cave1-played`, `04-cave1-autopilot`
  - Pause and game over: `05-pause`, `37-gameover`
  - Exit and night flight: `06-exit`, `07-night-early`, `08-night-mid`
  - Later caves, each as `caveN-entry`, `caveN-hazard` and `caveN-shriek`, for caves 2–8, 11 and 14
- **1280x800:** `/tmp/pp/desk/` and `/tmp/pp/desk2/`, same names.
- **4K:** `/tmp/pp/4k/`, same names, plus native-resolution crops `crop-bat.png`, `crop-hud.png`, `crop-mid.png` and `crop-exit.png`.
- **Hazards in action and x-ray layouts:** `/tmp/pp/haz/`
  - Owls: `01-owl-sleep-chirped`, `02-owl-awake`, `03-owl-swoop`
  - Stalactites: `04-stal-shake`, `05-stal-fall`, `06-stal-crash`
  - Web: `07-web-caught`
  - X-ray views: `08`–`11-xray-cave1/4/8/12`
- **Logs:** `/tmp/pp/desk.log` and `/tmp/pp/desk2.log`.