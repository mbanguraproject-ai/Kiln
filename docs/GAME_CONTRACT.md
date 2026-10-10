# Kiln game contract

Every game in Kiln is one self-contained page, `games/<id>/index.html`, that runs inside the hub (in an iframe) and also on its own when opened directly. This page lists what a game must do. `games/tessera/index.html` is the reference implementation.

## Files

- `games/<id>/index.html`: the whole game. Inline CSS and JS. No build step, no npm packages, no image or audio files: draw with canvas and synthesise sound with WebAudio.
- `games/<id>/test.cjs` (optional but expected): a Playwright test or bot that plays the game headlessly. See "Testing".
- Do not edit anything outside `games/<id>/`. The hub (`index.html`, `hub/`, `games/registry.js`, `tools/`) is shared.

The only external resource allowed is the house fonts from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&family=Unbounded:wght@600;800&display=swap">
```

Always give a fallback stack; the game must look right if the fonts never load (offline first run).

## The SDK

Load it before your game script:

```html
<script src="../../hub/sdk.js"></script>
```

Then, in your script:

| Call | When |
| --- | --- |
| `const kiln = Arcade.init({ id, title, version })` | Once, at boot. `kiln.embedded` and `kiln.settings` come back. |
| `Arcade.ready()` | Once the first frame is drawn and the game is playable. The hub shows "Loading" until then. |
| `Arcade.runStart(props?)` | When an attempt begins (first move, or Play pressed). |
| `Arcade.runEnd({ score, reason, ...props })` | When the attempt ends. `reason`: `'lose'`, `'win'`, `'restart'`, `'quit'`, or a game-specific word. Include the numbers that describe the run (level, lines, accuracy...). |
| `Arcade.track(name, props?)` | Key moments only: `tutorial_complete`, `level_complete`, `daily_complete`, `share`. Never per frame or per tap. |
| `Arcade.store.get(key, fallback)` / `.set(key, value)` | All saved data (best score, progress, tutorial seen). Never touch `localStorage` directly. |
| `Arcade.progress({ label } \| null)` | Only for games that save a run between visits. Call it whenever the save changes: `{ label: 'Pond 6' }` (short, true, shown on Home's Continue card with a Resume button) while a run is saved and worth resuming, `null` once it is over or restarted. Games that never call it show "Played today" and Play. |
| `Arcade.haptic(pattern)` | All vibration. It respects the player's setting. |
| `Arcade.settings` | `{ sound, vibration, theme, shareStats }`. Read `sound` before playing audio. |
| `Arcade.on('settings', fn)` | Settings changed in the hub. Update sound and vibration at once. |
| `Arcade.on('pause', fn)` | The app was hidden or the hub opened a sheet. Real-time games must freeze immediately and show their pause menu. |
| `Arcade.on('resume', fn)` | Informational. Real-time games stay on their pause menu until the player resumes. |
| `Arcade.exit()` | "Back to games" button in your pause menu, shown only when `Arcade.embedded`. |
| `Arcade.setSetting(key, value)` | Only for standalone mode: when not embedded, show your own Sound and Vibration toggles that call this. When embedded, hide them (the hub owns settings). |

Save the best score with `Arcade.store.set('best', n)`. The hub reads `best` for the card.

## Layout

- The game fills its page (`html, body { height: 100% }`, no page scroll). Inside the hub the page sits under a 52px bar, so never assume the full phone height.
- Portrait first. Must work from 320×560 up to 1280×800 with no horizontal scroll. Wide screens may rearrange.
- Respect safe areas when standalone: pad `html` with `env(safe-area-inset-top/bottom)` and use `max(16px, env(safe-area-inset-left/right))` for side gutters.
- Play surface: `touch-action: none`. Use pointer events so touch, mouse and pen all work. Add keyboard play where it makes sense.
- Hit targets at least 44px. Do not hide the action under the player's thumb (offset or lift what they drag).
- `[hidden] { display: none !important; }` in your CSS.

## Look and feel (house style)

- Fonts: Unbounded (display: titles, scores) and Figtree (everything else).
- Colours as tokens on `:root` with a light set and a dark set, switched by `@media (prefers-color-scheme: dark)` guarded with `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` (the SDK sets `data-theme` from the hub's theme setting). `body` has an explicit background. Canvas code reads colours from the tokens and redraws when the theme changes (watch `data-theme` with a MutationObserver and listen to the media query).
- House tokens worth reusing: `--plaster`, `--grout`, `--slot`, `--card`, `--ink`, `--ink-soft`, `--accent`, and the six glazes `--g1`..`--g6` (see Tessera). A game may add its own palette on top.
- Juice is required, not optional: anticipation, impact, particles, a little screen shake on big moments, count-up scores, satisfying synthesised sound, haptics. Respect `prefers-reduced-motion` (no shake, fewer particles).
- 60fps on a mid-range phone. Cap `devicePixelRatio` at 2–3. Pre-render static layers to offscreen canvases. Stop the animation loop when nothing moves.
- The first frame must look good: show a live board, a demo state or an attract animation, never an empty screen.
- Key-art mode: with `?keyart` the SDK adds the class `kiln-keyart` to `<html>` and sets `Arcade.keyart`. Hide every control and text overlay in that mode (`.kiln-keyart .hud { display: none }` and so on), skip floating text, and let the play surface fill the page. `tools/make-art.cjs` drives a representative scene through your `?debug` hook and captures the card art.

## Teaching

- A new player understands the game within 10 seconds without reading a wall of text: a one-line hint, a ghost hand, or a first level that teaches by doing.
- A short "How to play" in the pause menu.
- Track `tutorial_complete` when the player first succeeds on their own.

## Runs and fairness

- Every loss should feel like the player's fault. Telegraph hazards; keep hit boxes slightly smaller than what is drawn.
- No pay-to-win, no energy, no timers that block play, no ads. The hub decides monetisation later.
- Restart is one tap and instant.

## Testing

Before you finish:

1. `NODE_PATH=/opt/node22/lib/node_modules node tools/smoke.cjs --game <id> --port <your port>` passes with no problems. It opens the hub, launches your game, checks `ready`, `game_open`, `run_start` and `game_close`, and opens your page standalone; any console error fails it.
2. Your own `games/<id>/test.cjs` plays real runs headlessly (simulated pointer input, or a `?debug` hook such as `window.__game` that exposes state and a step/bot function) and asserts the rules work: scoring, failure, restart, persistence of the best score, no exceptions over many runs.
3. Screenshots at 360×740 and 1280×800, in light and dark, look right.

Use the Playwright install at `/opt/node22/lib/node_modules` (`NODE_PATH=/opt/node22/lib/node_modules`); Chromium is preinstalled. Never run `playwright install`.

## Registry

Games are listed in `games/registry.js` (id, title, pitch, genre, accent, status, path). The hub maintainer edits it.
Each playable game also carries what its page in Kiln shows (blueprint section 6): `about` (two to four sentences on the real loop), `controls` ('Touch' or 'Touch or keyboard'), `saves` ('run' if it calls `Arcade.progress`, else 'best') and `shots` (phone screenshots rendered from the real game by `tools/make-shots.cjs`; add a scene there for a new game). `tools/detail-test.cjs` checks these against the game's code, so keep them true when the game changes.
The same file holds `KILN_COLLECTIONS`, the editorial shelves on Home. Each has a one-line `why` that must stay true of every game in it; check it whenever a game in the collection changes.
