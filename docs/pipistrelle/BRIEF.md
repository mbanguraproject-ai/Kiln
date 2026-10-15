# Pipistrelle, the full game: version 1 brief

This is the binding scope for building Pipistrelle as a standalone product (decision D14). It is distilled from the
research in `research/`: three design proposals (A world, B progression, C missions) and three judges who agreed on
most points. Where this brief is silent, follow proposal C (`research/propose-missions.md`), then A for art and
atmosphere (`research/propose-world.md`), then B for economy and fairness (`research/propose-progression.md`). The
current game is mapped in `research/map-code.md` and assessed in `research/map-player.md`.

## The product

- Lives in `products/pipistrelle/`, self-contained: its own Android app (app ID `game.devbangs.pipistrelle` since D18,
  name Pipistrelle, own icon and splash), web root, build scripts, tests and README. Nothing at runtime or build
  time comes from outside the folder (copy what it reuses, such as `hub/kit.js`, and own the copy). Its CI is
  `.github/workflows/pipistrelle.yml`, which builds its APK and publishes `pipistrelle-debug.apk` to the release
  tag `pipistrelle-preview`.
- The pilot in `games/pipistrelle/` stays untouched in the Kiln hub.
- Immersive: full screen edge to edge, Android system bars hidden while flying, Android Back goes up one screen.

## Soul (never lose)

Pitch-black caves that the player paints with sonar rings; echoes that fade; the bat's floaty feel; rescuing pups
who follow you home. The echo colour code is sacred: teal rock, gold food, pink pups, red danger, in every cave
and at every effect level.

## Version 1 content

- **Campaign "The Long Rain"**: 4 biomes x 6 caves, plus a finale cave, so version 1 has an ending.
  1. Chalk Hollows (teaching biome), 2. The Drowned Halls (water, rising flood escape), 3. The Glass Vaults
  (crystals that hold and re-echo, bells), 4. The Owlstone Crypt (owl hearing, decoys, the Grey Lady set piece,
  outwitted, never harmed), then **The Hush** (finale: the Chorus, whose ring radius is 600 + 4 x lifetime pups
  rescued).
  Each biome is data with one schema (palette, strata painter, parallax, lights, ambient life, weather, hazard
  pool, generator params, echo audio FX, song layers) and has its own look, ambience and music. At most two new
  hazards per biome, built from existing systems.
- **Caves are 60 to 150 seconds**, start at full energy, with rising action: safe introduction of the new thing
  at the mouth, the mission in the gallery, a gauntlet before the moonlit arch.
- **Moons**: three per cave (Homecoming, Kin, Mastery), earned independently across attempts. The HUD dims a Moon
  the moment it becomes impossible and says why. A headless bot proves every Moon is earnable with the starter bat.
- **Mission types**: Homing, Kin (rescue), Hush (stealth past owls), Escape (collapse wave, rising water), with
  Survey, Larder and Silence used as Mastery Moons. Bellringing only if time allows.
- **New ways of knowing** (one new thing to listen for per biome, never a new control): pup answers (pink edge arcs
  delayed by distance, through rock), drip clocks (a landing drip paints a 90 px mini-sonar), light and deep
  sleeper owls that fly to the loudest recent sound, crystal re-echo as a decoy, tiger moths that jam echoes,
  glowworm lures that look like gold moths but echo teal, hushmoss that returns no echo, chalk crusts that only a
  shriek cracks, Old Scratches (lore readable only inside echo dots, kept in the Journal).
- **Bats you can buy** (one currency: moths, earned only by playing; sidegrades, not upgrades; the campaign can be
  finished with Pip):

  | Bat | Species | Ability | Price | Arrives |
  | --- | --- | --- | --- | --- |
  | Pip | Common pipistrelle | Steady: shortest bump stun; pups follow tightest | free | start |
  | Skimmer | Daubenton's bat | Skim: fast low over water, ignores current and splashes; water echoes last twice as long | 600 | after Chalk Hollows |
  | Hark | Brown long-eared bat | Hark: passive sound sparks within 320 px every 1.2 s; whisper chirps never wake owls; hovers | 900 | after Drowned Halls 3 |
  | Comb | Natterer's bat | Glean: plucks moths off walls without bumping, tightest turns, squeezes through narrow gaps | 1,300 | after Glass Vaults 2 |
  | Gale | Noctule | Bolt: flick to dash 200 px (tears webs, outruns a swoop); big chirp; loud, wakes light sleepers | 1,800 | after Glass Vaults 6 |

  Each bat has its own look from one parametric bat renderer (ears, noseleaf, wing aspect, fur, flap rate) used in
  flight, in the Hangar and in the Roost. Before buying, the Practice Hollow lets you fly any arrived bat free. The
  cave brief shows one line, "Heard well by: Hark, Skimmer", never a buy button.
- **Economy**: all numbers in one data file; a pure-function campaign simulator test asserts the pacing (first
  bought bat affordable around the end of Chalk Hollows; all four by the end of the campaign at about two Moons
  per cave), within 25 percent. Earnings: banked moths at each exit (carried x (1 + pups home), multiplier capped
  at 6), first-time Moon bonuses, Colony Requests (about 15, never expiring), the Nightly Cave (+60 first clear of
  the day, real lunar phase computed offline, no streaks), and The Long Night.
- **The Long Night**: today's endless game (seeded caves, energy carried over, short skippable night flight;
  skipping banks the average yield), now one mode in the menu.
- **No night flight between campaign caves**: the arch leads straight to Results. One short eventful flight at the
  end of each biome, skippable after the first viewing.
- **Fairness charter**: earned currency only, no real money, no timers, no streaks, no rotating or expiring
  stock, exact price shown next to the balance, a "new" dot that clears once seen, banked moths never lost, the
  story gated by skill alone. Cosmetic coats come from Moons and Requests, never from a wallet. One opt-in rewarded
  ad at the Last Echo, once per attempt and never by itself; no other ads anywhere (D15).

## Screens

Title (painted wordmark, never wraps) → **The Roost** (home: every rescued pup hangs there, named for the cave it
came from) → World map (biomes and caves with Moons) → Cave brief (mission, Moons, "Heard well by") → Flight (HUD
anchored to safe-area corners, sound captions at the screen edge, pause) → Results (Moons, moths banked, pups home;
its own screen, no confetti) → Hangar (bats, Practice Hollow, buy with price next to balance) → Journal (Old
Scratches, moths, pups) → Requests → Settings (sound, music, echo volume, vibration, Battery saver, Gentle Wings
assist, Echo shapes colourblind mode, save export and import) → Pause (Resume, Restart, How to play, Settings,
Quit to map).

## Full 4K

- A camera that shows a constant world area (about 400,000 to 480,000 world px squared, chosen on the short side),
  so a 4K screen shows the same play space as a phone, only sharper.
- Native resolution up to 4K by default, with every effect on (the owner, 13 October: "4K should be the default
  resolution ... not lousy tiers"). A safety net sheds effects first and lowers resolution only as a last resort,
  never below 75%. Battery saver is the one setting. Effects change fidelity, never information: echo pools, ray
  counts and lifetimes are the same at every level.
- Losing is real (the owner, 14 October: "the game is too easy for reward ads to be meaningful"):
  - the drain is doubled, and moths are worth 6;
  - hazards hit hard and full-speed crashes cost more;
  - past a cave's par time the drain climbs to double.

  The bot must still earn every Moon (the tests check it).
- Variety (14 October): six cave architectures. Biomes open after the third cave of the one before, the Nightly Cave
  visits every biome, and colony bats fly by.
- Rock and echo memory in 256 px chunks (LRU cache) with vector rims stroked from the segments, a per-biome 512 px
  detail pattern composited at device resolution, a dithered glow atlas (64, 256, 512 px), bloom as core plus halo
  sprites (no `ctx.filter`, no `shadowBlur`), nothing drawn below 2 device px, high detail only from 6 device px,
  no canvas larger than 2048 squared. UI scale from the screen's short side; menus in rem units.
- Verified with screenshots at 390x844 at DPR 3, 1280x800 and 3840x2160, read by the builder.

## Engineering

Classic scripts under one `window.PP` namespace, no bundler. Separate random streams (generation, simulation,
effects); an event bus with per-run stats; a hazard registry (`place`, `update`, `ping`, `draw`, `debug`); a
profile with a version field and migrations; biome, bat, mission and economy data in data files. Debug and test
hooks (`?debug`) so headless tests and the screenshot tool can reach any screen and cave. Tests: economy simulator,
save migration, every cave generates and is completable by the bot, every Moon earnable with Pip, frame-time
budget at each size.

## Deferred to later versions

Beam and cone sonar bats, training ranks and knacks, a second currency, purchasable cosmetics, calendar events,
photo mode, gamepad, New Game+, vertical cave layouts, hairline cracks as a cell type, more biomes (Windpipes, Ember
Seep, Rime Hall, Lantern Roots).

## Build order

1. **Foundation and first playable** (one agent): the product scaffold with its Android project and CI; the
   current game ported into modules; the 4K renderer; profile, economy and data loading; every screen; Chalk
   Hollows complete with its six caves and Moons; all five bats in the Hangar; The Long Night; tests. Ships an APK.
2. **Biomes in parallel** (two agents, disjoint files): The Drowned Halls and The Glass Vaults; The Owlstone Crypt
   and The Hush finale.
3. Final check, pull request and merge by the assistant.
