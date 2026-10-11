# Kiln game contract

Every game in Kiln is one self-contained page, `games/<id>/index.html`, that runs inside the hub (in an iframe) and also on its own when opened directly. This page lists what a game must do. New games are built on the kit (`hub/kit.js`, see [docs/KIT.md](KIT.md)); `tools/kit-demo/index.html` shows every piece of it in one small game. `games/tessera/index.html` is the reference for a game built by hand.

## Files

- `games/<id>/index.html`: the whole game. Inline CSS and JS. No build step, no npm packages, no image or audio files: draw with canvas and synthesise sound with WebAudio (the kit does both).
- `games/<id>/test.cjs` (optional but expected): a Playwright test or bot that plays the game headlessly. See "Testing".
- Do not edit anything outside `games/<id>/`. The hub (`index.html`, `hub/`, `games/registry.js`, `tools/`) is shared.

The only external resource allowed is the house fonts from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&family=Unbounded:wght@600;800&display=swap">
```

Always give a fallback stack; the game must look right if the fonts never load (offline first run).

## The SDK and the kit

Load the SDK, then the kit, before your game script, exactly like this (`tools/bundle.cjs` inlines both tags into the single-file build):

```html
<script src="../../hub/sdk.js"></script>
<script src="../../hub/kit.js"></script>
```

The kit is standard for new games and optional for the older ones. It gives you the canvas view, fixed-step loop, input, synthesised sound effects and music, particles and screen effects, tweens, camera, drawing helpers, a seeded random generator and a themeable shell (title screen, pause menu, game-over panel) that already makes the SDK calls below for you. Its API reference and the art-direction guide are in [docs/KIT.md](KIT.md).

The SDK calls, in your script or through the kit:

| Call | When |
| --- | --- |
| `const kiln = Arcade.init({ id, title, version })` | Once, at boot. `id` is the folder name. `kiln.embedded` and `kiln.settings` come back. |
| `Arcade.ready()` | Once the first frame is drawn and the game is playable. The hub shows "Loading" until then. It also sets `data-kiln-ready="1"` on `<html>` for the tools. |
| `Arcade.runStart(props?)` | When an attempt begins (first move, or Play pressed). |
| `Arcade.runEnd({ score, reason, ...props })` | When the attempt ends. `reason`: `'lose'`, `'win'`, `'restart'`, `'quit'`, or a game-specific word. Include the numbers that describe the run (level, lines, accuracy...). A finished run's score updates the best (`kiln:<id>:best`) and the hub's card; a run given up (`'restart'`, `'quit'`, `'abandoned'`) is logged with its score but never sets a best. |
| `Arcade.track(name, props?)` | Key moments only: `tutorial_complete`, `level_complete`, `daily_complete`, `share`. Never per frame or per tap. |
| `Arcade.store.get(key, fallback)` / `.set(key, value)` | All saved data (best score, progress, tutorial seen). Never touch `localStorage` directly. |
| `Arcade.progress({ label, pct? } \| null)` | Only for games that save a run between visits. Call it whenever the save changes: `{ label: 'Pond 6' }` (short, true, shown on Home's Continue card) while a run is saved and worth resuming, `null` once it is over or restarted. Add `pct` (0 to 100, rounded and clamped by the SDK) only when it is a true completion measure, such as level 7 of 30 (`pct: 7 / 30 * 100`); Home then shows a progress bar with that percentage. Never invent one. Games that never call it show "Played today". |
| `Arcade.haptic(pattern)` | All vibration. It respects the player's setting. |
| `Arcade.settings` | `{ sound, vibration, theme, shareStats }`. Read `sound` before playing audio. |
| `Arcade.on('settings', fn)` | Settings changed in the hub. Update sound and vibration at once. |
| `Arcade.on('pause', fn)` | The app was hidden or the hub opened a sheet. Real-time games must freeze immediately and show their pause menu. |
| `Arcade.on('resume', fn)` | Informational. Real-time games stay on their pause menu until the player resumes. |
| `Arcade.exit()` | "Back to games" button in your pause menu, shown only when `Arcade.embedded`. Call `Arcade.runEnd({ score, reason: 'quit' })` first so the run keeps its score (otherwise `exit()` ends it with no score). |
| `Arcade.setSetting(key, value)` | Your pause menu's Sound and Vibration toggles call this, standalone and embedded alike: the hub has no settings button while a game plays, and when embedded the SDK passes the change to the hub, which keeps it for every game. |
| `Arcade.scenes({ art, shot1, shot2 })` | Capture scenes for the card art and screenshots. See "Capture scenes". |
| `Arcade.test({ start, lose, state })` | The test hook `tools/game-check.cjs` drives. See "Test hook". |

Save the best score with `Arcade.store.set('best', n)` (or `Kit.save.setBest(n)`). The hub reads `best` for the card.

### Capture scenes

The card art (`art-wide.jpg`, `art-tall.jpg`) and the two phone screenshots (`shot-1.jpg`, `shot-2.jpg`) are rendered from the real game, never mocked. Register one function per capture, before you call `Arcade.ready()`:

```js
Arcade.scenes({
  art: () => { rng.seed(7); newRun(); simulate(4.5); },          // the most beautiful moment, no HUD
  shot1: () => { rng.seed(3); newRun(); simulate(6); },          // mid-run, HUD visible
  shot2: async () => { rng.seed(9); newRun(); await bigCombo(); }, // a high point: a combo, a boss, the results
});
```

- With `?debug&scene=<name>` in the URL (both: a scene never runs from a player's link), the SDK runs that scene once after `Arcade.ready()`, then sets `data-scene-done="1"` on `<html>` (or `"error"`, with the message in `data-scene-error`). A scene may return a promise; it must finish within 8 seconds.
- Seed everything, so the same scene gives the same picture on every run, and drive the game with its own engine (simulate frames, place the pieces, fire the shots); do not draw a fake picture.
- When the scene returns, the frame must be ready to capture: the tools take the screenshot two frames later. Freeze or slow what moves if it matters.
- A scene plays the game for real: it starts runs, logs events and may write saves (in the capture tools' throwaway browser). Keep its run alive: drive it with an autopilot or make the player safe while it runs. A run that ends inside a scene opens the game-over panel a moment later, over the capture, and `game-check` fails it.
- `art` is captured from `?debug&keyart&scene=art` at 800×450 and 400×500 (device scale 2): no HUD, no text (see key-art mode below). `shot1` and `shot2` are captured from `?debug&scene=shot1|shot2` at 360×760 (scale 1.5) with the HUD visible: they show what the player will see.
- Render them with `node tools/make-art.cjs --game <id> --port <port>` and `node tools/make-shots.cjs --game <id> --port <port>`, then look at the images.

### Test hook

```js
Arcade.test({
  start: () => beginRun(),        // begin a run as if the player pressed Play
  lose: () => endRun('lose'),     // end the current run as a loss, now
  state: () => ({ phase, score, paused }),
});
```

- `state()` returns `{ phase, score, paused, frame? }`: `phase` is `'title'`, `'play'`, `'paused'`, `'over'` or a game-specific word, `score` a number, `paused` a boolean. `paused: true` must mean the game really stands still: `game-check` checks that `frame` (a count of simulation steps; the kit's shell reports the loop's) does not move while paused, or, without `frame`, that the play canvas does not change.
- It is exposed as `window.__kilnTest` only with `?debug` in the URL. Later calls add to or override earlier ones: the kit's shell registers `start`, `lose` and `state` for you, and a game can extend them.
- A turn-based game that does not freeze on pause may add `turnBased: true`; `game-check` then reports its pause as a warning instead of checking it.

## Layout

- The game fills its page (`html, body { height: 100% }`, no page scroll) and its play canvas fills the viewport. Inside the hub it is the whole screen, edge to edge: the hub shows no bar, and in the Android app the status and navigation bars hide while it plays. So the game's own pause button and pause menu (Resume, How to play, Sound, Vibration, and Back to games when embedded) are the only way out besides Android Back; never leave the player without a visible pause button.
- Portrait first. Must work from 320×560 up to 1280×800 with no horizontal scroll. Wide screens may rearrange.
- Respect safe areas when standalone: pad `html` with `env(safe-area-inset-top/bottom)` and use `max(16px, env(safe-area-inset-left/right))` for side gutters.
- Play surface: `touch-action: none`. Use pointer events so touch, mouse and pen all work. Add keyboard play where it makes sense.
- Hit targets at least 44px. Do not hide the action under the player's thumb (offset or lift what they drag).
- `[hidden] { display: none !important; }` in your CSS.

## Look and feel

Kiln will hold 64 games. Each must feel finished and have its **own look**; the most common complaint about early games was that they felt templated (the same navy panels, the same pill HUD, sparse flat backgrounds).

- Pick a palette, a font pairing (the house fonts Unbounded and Figtree, or system stacks) and a shell style (`glass`, `solid`, `outline`, `paper`, `neon`, `pixel`) that suit this game's world, not the hub's. [docs/KIT.md](KIT.md) has the art-direction guide: layered backgrounds, lighting, ambient motion, palettes, juice.
- Colours as tokens on `:root`. Menus and panels must stay readable in light and dark: switch tokens with `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` (the SDK sets `data-theme` from the hub's theme setting). A game world may keep one palette in both themes (a night sky stays night). `body` has an explicit background.
- The first frame must look good: show a live board, a demo state or an attract animation, never an empty screen. `game-check` warns when the play canvas stands still for a second on the title.
- Key-art mode: with `?keyart` the SDK adds the class `kiln-keyart` to `<html>` and sets `Arcade.keyart`. Hide every control and text overlay in that mode (the kit's shell hides itself; hide your own HUD with `.kiln-keyart .hud { display: none }` and so on), skip floating text, and let the play surface fill the page. A HUD drawn on the canvas counts too: skip it when `Arcade.keyart`. `game-check` fails key art with any text drawn on a visible canvas, except text that belongs to the world drawn with `Kit.gfx.text(..., { world: true })` (a sign, letters on tiles).

### Quality bar

Every game must clear this before it joins Kiln:

- **Its own look**: a distinct palette, background and HUD treatment; rich, layered backgrounds with ambient motion, not a flat fill.
- **Finished menus**: a title screen with the game's name, a one-line hint and the best score; a pause menu with Resume, Restart and How to play; a game-over panel with a count-up score, best score, a "new best" moment and Play again.
- **Juice**: anticipation, impact, particles, screen shake on big moments, hit-stop, count-ups, floating score text. Respect `prefers-reduced-motion` (no shake, fewer particles).
- **Audio**: synthesised effects for every action and a music loop that fits the mood, off when the player's sound setting is off.
- **60 fps on a mid-range phone**: cap `devicePixelRatio` at 2, pre-render static layers, pool particles, stop the loop while paused.

## Teaching

- A new player understands the game within 10 seconds without reading a wall of text: a one-line hint, a ghost hand, or a first level that teaches by doing.
- A short "How to play" in the pause menu.
- Track `tutorial_complete` when the player first succeeds on their own.

## Runs and fairness

- Every loss should feel like the player's fault. Telegraph hazards; keep hit boxes slightly smaller than what is drawn.
- No pay-to-win, no energy, no timers that block play, no ads. The hub decides monetisation later.
- Restart is one tap and instant.

## Testing

Use the global Playwright install (`require('playwright')` works with `NODE_PATH` set); Chromium is preinstalled. Never run `playwright install`. Pass `--port` to every tool so several runs can share a machine.

1. `node tools/game-check.cjs --game <id> --port <port>` passes: no FAIL lines. It loads the page standalone, checks `Arcade.ready()` within 4 s and the right `Arcade.init` id, drives the test hook (`start` logs `run_start`, `lose` logs `run_end` with a numeric score and changes the phase), mashes taps, swipes, drags and keys for about 4 s, sends the hub's pause message (a real-time game must report `paused: true` and then stand still), measures frame time over 3 s of play (frames on the title, pause or game-over screen are left out and an ended run is restarted; an over-budget sample is retaken once; warning above 25 ms p95, failure above 60 ms), checks the layout at 320×560, 390×844, 768×1024 and 1280×800 (no horizontal overflow, canvas fills the viewport), checks `?keyart` shows no text or controls, DOM or canvas, runs the `art`, `shot1` and `shot2` scenes (each must finish with its run still alive), and launches the game inside the hub. Any console error fails the step it happened in. Screenshots of every step go to `/tmp/kiln-check/<id>/` (or `--out`): look at them. `--json` prints a JSON summary.
2. `node tools/smoke.cjs --game <id> --port <port>` passes: it launches the game from the hub and opens its page standalone.
3. Your own `games/<id>/test.cjs` plays real runs headlessly (simulated input, or the test hook and a `?debug` step/bot function) and asserts the rules work: scoring, failure, restart, persistence of the best score, no exceptions over many runs.
4. Screenshots at 360×740 and 1280×800, in light and dark, look right.

## Registry

Games are listed in `games/registry.js` (id, title, pitch, genre, accent, status, path). The hub maintainer edits it.

- **Categories**: `window.KILN_CATEGORIES` lists the six categories in order: Action, Adventure, Racing, Puzzle, Sports, Arcade. A game's `genre` is its category's name. Home shows a chip and a shelf per category, so pick the one a player would look in.
- Each playable game also carries what its page in Kiln shows (blueprint section 6): `about` (two to four sentences on the real loop), `controls` ('Touch' or 'Touch or keyboard'), `saves` ('run' if it calls `Arcade.progress`, else 'best') and `shots` (phone screenshots rendered from the real game by `tools/make-shots.cjs`). `tools/detail-test.cjs` checks these against the game's code, so keep them true when the game changes.
- For search on Discover (blueprint section 7), each game also lists `mechanics` (what you do, such as 'Loops') and `moods` (how it feels, such as 'Calm'): two or three short tags each, in sentence case, true of the game as it plays now and in agreement with its collections.
- The same file holds `KILN_COLLECTIONS`, the editorial shelves on Home. Each has a one-line `why` that must stay true of every game in it; check it whenever a game in the collection changes.

## New-game checklist

1. Read this page and [docs/KIT.md](KIT.md). Pick the category, the core verb and the look (palette, fonts, shell style, background layers) before writing code.
2. Create `games/<id>/index.html` with the SDK and kit tags, `Arcade.init({ id: '<id>', ... })` and `Arcade.ready()` once the first frame is drawn.
3. Build the loop on the kit; make the menus, juice, sound and music meet the quality bar.
4. Register `Arcade.test` (the kit's shell gives you the defaults) and `Arcade.scenes({ art, shot1, shot2 })` with seeded scenes.
5. Hide every HUD element and text overlay under `.kiln-keyart`, and skip canvas HUD drawing when `Arcade.keyart`.
6. Render the images: `node tools/make-art.cjs --game <id> --port <port>` and `node tools/make-shots.cjs --game <id> --port <port>`. Look at all four.
7. Write `games/<id>/test.cjs` and run it.
8. Ask the hub maintainer for the registry entry (category, about, controls, saves, mechanics, moods, art, shots).
9. `node tools/game-check.cjs --game <id> --port <port>` passes with no FAIL lines, and you have looked at its screenshots.
