# Building a catalogue game (binding for builders, playtesters and fixers)

How every game in `docs/CATALOGUE.md` is built and judged. The batch workflow
(`.claude/workflows/kiln-game-batch.js`) gives this file to every agent; a person building a game by hand follows it too.
The tools need Playwright (`npm i -D playwright`, or a global install on `NODE_PATH`).

## What the owner wants
Kiln is growing from 4 to 64 original games (decision D12). The owner's words: "High quality and fun", and the current games'
"visuals are weak, feel templated, not finished". Every game must feel like a finished commercial mobile game with its
own world: you could not mistake its screenshot for another Kiln game.

## Inputs
- Your game's brief: the entry with your id in `docs/catalogue.json` (full text also in `docs/CATALOGUE.md`). Follow it.
  You may improve on it when something proves unfun or unbuildable; say what you changed and why in your report.
- `docs/KIT.md` (read fully), `docs/GAME_CONTRACT.md` (read fully), and `tools/kit-demo/index.html` (the reference for
  code quality and the minimum visual bar; exceed it).
- Look at other games' art (`games/*/art-tall.jpg`) so yours looks different from all of them.

## Files you own: ONLY `games/<id>/`
- `index.html`: the whole game (inline CSS/JS) loading `../../hub/sdk.js` then `../../hub/kit.js`. No image/audio files,
  no network, no npm packages; house fonts link is allowed with fallbacks. `Arcade.init({ id, title, version: '1.0.0' })`.
- `test.cjs`: a headless Playwright rules test for your game (`node games/<id>/test.cjs --port N`): checks the core rules
  and scoring with seeded state through your test hook, that a run can be lost (and a level won where levels exist),
  and that there are no console errors. Print PASS/FAIL lines, exit 1 on failure.
- `art-wide.jpg`, `art-tall.jpg`, `shot-1.jpg`, `shot-2.jpg`: generated, never hand-made:
  `node tools/make-art.cjs --game <id> --port P` and `node tools/make-shots.cjs --game <id> --port P`.
- Never edit `games/registry.js`, the hub, the kit, the SDK, tools or docs. If the kit has a real bug, work around it in
  your game and report it (with a minimal repro) in `kitIssues`.

## Required integration (game-check enforces most of it)
- `Kit.shell` themed in the game's own style (panel style, colours, fonts, button shapes): not the default look.
  Title screen shows the live world in attract mode behind it. Game over shows score count-up, best, NEW BEST, stats.
- `Arcade.scenes({ art, shot1, shot2 })` registered BEFORE `Arcade.ready()`, deterministic (seeded): `art` = the most
  beautiful representative moment, no HUD/text (`?keyart`); `shot1` = early play with HUD; `shot2` = a later, more
  dramatic or advanced moment with HUD.
- `Arcade.test({...})` extended with helpers the playtester needs: `start`, `lose`, `state` (phase, score, paused) plus
  game-specific ones such as `seed(n)`, `level(n)` / `wave(n)` (jump ahead), `win()` (finish the current level),
  `give(powerup)`, `step(seconds)` for deterministic time, and anything else that makes testing later content possible.
- Saves: `saves: 'run'` games keep the run/level between visits and call `Arcade.progress({ label, pct })` with a true
  pct when level-based (else no pct); `'best'` games keep only the best score (the shell does that).
- Pause instantly on `Arcade.on('pause')` (real-time games show the pause menu); sound only via the kit (respects the
  setting); vibration only via `Arcade.haptic`; respect `prefers-reduced-motion`.
- Portrait first; must work 320x560 to 1280x800 (wide screens may letterbox or widen the playfield, but no tiny centre
  strip on desktop: fill the screen tastefully); safe areas; 44px+ touch targets; keyboard play where natural.

## Quality bar (the reviewer scores these 1-10; ship needs >= 7 on each and no blockers)
1. Fun: instantly fun in the first 10 seconds; still fun after 5 minutes; a difficulty curve; variety (new enemies,
   hazards, layouts, mechanics introduced over time); 15-20 minutes before it feels repetitive; every loss feels fair.
2. Visual finish: rich layered backgrounds with depth (3+ parallax or depth layers), lighting (glow, light shafts, rim
   light, shadows), ambient motion (weather, particles, swaying, water), characters/objects with personality
   (squash and stretch, idle animation, blinking, anticipation), a cohesive palette, a HUD in the game's own style
   (not generic navy pills), crisp at DPR 2. Nothing looks placeholder or programmer-art.
3. Juice and audio: every action has feedback (particles, shake, flash, float text, hitstop, haptic, sound); music fits
   the mood and loops without being annoying; 15+ distinct sound effects.
4. Clarity: a new player understands it in 10 seconds without reading (ghost hand, first level that teaches, one-line
   hint); short How to play in the pause menu.
5. Polish and robustness: no bugs, no console errors, 60 fps (game-check frame p95 <= 25 ms), restart is instant.

## Verification loop (builders and fixers must do this before reporting)
1. `node tools/game-check.cjs --game <id> --port P --out /tmp/kiln-check/<id>` until every check passes (WARN only if
   explained). Read the step screenshots it saves.
2. `node games/<id>/test.cjs --port P` passes.
3. Playwright screenshots at 390x844 (deviceScaleFactor 2) of: title, first seconds of play, a later level/wave (use
   your test hooks), a dramatic moment (combo/boss/explosion), pause menu, game over; plus 1280x800 play. READ every
   screenshot and judge it against the quality bar like a harsh art director. Improve and repeat at least twice.
4. make-art and make-shots; READ the four images: they are the game's store cards, so they must look stunning.
5. Run `git -C /home/user/Kiln status --short` and make sure you changed nothing outside `games/<id>/` (delete stray
   files you created elsewhere).

## Registry entry (builders return it; the orchestrator adds it)
`{ id, title, pitch (<= 90 chars, says what you do), genre (category name), accent ('--g1'..'--g6', the closest glaze to
the art), about (2-4 sentences on the real loop and what makes it different, true of the game), controls ('Touch' or
'Touch or keyboard': keyboard only if it is fully playable by keys with ArrowLeft/ArrowUp style handling), saves ('run' if
the source calls Arcade.progress(, else 'best'), mechanics (2-3 sentence-case tags, e.g. 'Dodging'), moods (1-3
sentence-case tags, e.g. 'Calm') }`. Tags must be true of the game as built.
