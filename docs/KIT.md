# Kiln game kit (`hub/kit.js`)

`window.Kit` is a small engine for canvas games on Kiln: a DPR-aware view, a fixed-step loop, touch and
keyboard input, synthesised sound and music, particles and screen juice, tweens, a camera, drawing helpers
and a themeable title/pause/game-over shell wired to the SDK (`hub/sdk.js`). It gives you engine pieces,
not a look: every game picks its own palette, fonts, panel style, music mood and art.

- No dependencies, no build step, no fetches: it works opened directly, embedded in the hub's iframe and
  inlined into the single-file bundle (`srcdoc`).
- Load it after the SDK, in this order:

```html
<script src="../../hub/sdk.js"></script>
<script src="../../hub/kit.js"></script>
```

- The demo game, **Lanternwing** (`tools/kit-demo/index.html`), uses every module. Read it next to this file.
- `node tools/kit-test.cjs --port 8800` checks the kit itself; `node tools/game-check.cjs --game <id>` checks a
  game against the contract (`docs/GAME_CONTRACT.md`).

Contents: [Quick start](#quick-start) · [view](#kitview) · [loop](#kitloop) · [input](#kitinput) ·
[audio and sfx](#kitaudio-kitsfx) · [music](#kitmusic) · [fx](#kitfx) · [tween and ease](#kittween-kitease) ·
[camera](#kitcam-kitcamera) · [gfx](#kitgfx) · [rng, math, collision](#kitrng-math-collision) · [save](#kitsave) ·
[shell](#kitshell) · [other helpers](#other-helpers) · [Art direction](#art-direction) ·
[Performance budget](#performance-budget) · [New game skeleton](#new-game-skeleton)

## Quick start

```js
Arcade.init({ id: 'my-game', title: 'My Game', version: '1.0.0' });
const view = Kit.view(document.getElementById('game'));
const loop = Kit.loop({
  view,
  update(dt) { /* game logic, dt = 1/60 s (times timeScale) */ },
  draw(ctx) { view.clear('#123'); Kit.fx.draw(ctx); },
});
const shell = Kit.shell({ title: 'My Game', loop, score: () => score });
loop.start(); // first frame calls Arcade.ready()
```

All sizes and positions are CSS pixels. Times passed to the kit are milliseconds unless the name says
seconds (`dt`, `life`, `loop.time`).

## `Kit.view`

`Kit.view(canvas, opts)` sizes the canvas backing store to its CSS box times the device pixel ratio and
sets the context to draw in CSS px.

| Option | Default | |
|---|---|---|
| `maxDpr` | `2` | DPR cap (phones at 3x draw at 2x). |
| `maxPixels` | `3.4e6` | Backing-store pixel budget; big tablet/desktop canvases get a lower DPR (>= 1). |
| `fill` | `true` | Style the canvas `display:block; width:100%; height:100%`. `false` keeps your CSS size. |
| `alpha` | `true` | `false` for an opaque canvas (slightly faster when you always paint a sky). |

Returns `{ canvas, ctx, w, h, dpr, onResize(fn), resize(), clear(color?) }`.
`w`/`h` are CSS px, kept current by a `ResizeObserver`. `onResize(fn)` calls `fn(view)` after each resize
(chainable). `clear(color)` resets the transform to CSS px, alpha 1, `source-over`, and clears or fills.
The first view also becomes `Kit.cam`'s view and sets `Kit.gfx.dpr` (sprites and layers render at it).

```js
const view = Kit.view(canvas, { alpha: false });
view.onResize(v => { cam.zoom = Math.min(v.w / 400, v.h / 700); });
```

## `Kit.loop`

`Kit.loop({ update(dt), draw(ctx, alpha), view, ctx, ready, autoPause, auto })`: fixed 1/60 s updates with
an accumulator (at most 6 catch-up steps, `dt` capped at 0.1 s after a stall), one `draw` per display frame.

- `update(dt)`: `dt` is `Kit.STEP` (1/60) times `timeScale`.
- `draw(ctx, alpha)`: `ctx` is `view.ctx` (or `opts.ctx`); `alpha` is the leftover fraction of a step.
- After each update the loop also runs `Kit.fx.update`, `Kit.tween.update` and `Kit.cam.update` (turn off
  with `auto: false` and call them yourself), then clears input edges (`pressed`/`released`).
- The first `start()` draws a frame and calls `Arcade.ready()` (opt out with `ready: false`).
- When paused, stopped or the tab is hidden, no animation frame is requested: zero CPU.
- `autoPause` (default `true`): pauses on `Arcade.on('pause')` (the hub). `Kit.shell` turns this off and
  decides itself (pause menu in play, plain freeze elsewhere).

| Member | |
|---|---|
| `start()` / `stop()` | Run from scratch / stop for good (scenes hold a frame with `stop()`). |
| `pause()` / `resume()` | Freeze / continue (input edges are flushed on resume). |
| `timeScale` | `0.3` for slow motion; dt scales, the step count does not. |
| `hitstop(ms)` | Freeze updates for `ms` of real time (impact frames); drawing and shake continue. |
| `step(n = 1)` | Run `n` updates right now and draw once (tests, capture scenes, pre-warming). |
| `render()` | Draw once without updating (after a theme change while paused). |
| `running`, `paused`, `time` (s of game time), `frame`, `alpha`, `view` | State. |

```js
function hit() { loop.hitstop(70); Kit.fx.shake(8, 200); }
function bulletTime(on) { Kit.tween(loop, { timeScale: on ? 0.3 : 1 }, 250); }
```

## `Kit.input`

`Kit.input(el, opts)` (default `document.body`): pointers on `el` in CSS px relative to it, keys on `window`.
Options: `swipeDist` (32 px), `swipeMs` (320), `tapMs` (280), `tapSlop` (12 px).

Events, via `on(type, fn)` (chainable):

| Type | Payload |
|---|---|
| `down`, `move`, `up` | pointer `p` |
| `tap` | `p` (short press, little movement, no swipe) |
| `swipe` | `p` with `p.dir` = `'up'|'down'|'left'|'right'` (once per gesture) |
| `key` | the `KeyboardEvent` (also `onKey(fn)`) |

A pointer `p` is `{ id, type, x, y, sx, sy, dx, dy, t0, swiped, dir }`: `x/y` now, `sx/sy` where it went
down, `dx/dy` the delta of the last move (drag deltas), `t0` the `performance.now()` of the press.
`I.pointers` is a `Map` of every active pointer (multi-touch); `I.pointer` is the primary game pointer.

Keyboard: `isDown(k)`, `pressed(k)` (went down since the last update), `released(k)`. Keys match by
`KeyboardEvent.key` (single letters case-insensitive) or `code`: `'a'`, `'A'`, `'KeyA'`, `'ArrowLeft'`,
`'Space'`, `' '`. `axisX()` / `axisY()` return -1, 0 or 1 from the arrows and WASD. Arrow keys and Space never
scroll the page. Keys typed into form fields and Enter/Space on buttons are ignored.

`reset()` drops held keys and pointers, `flush()` clears the edges (the loop calls it), `destroy()` unbinds.
While the shell shows a menu, game input is blocked and reset.

**Virtual joystick and buttons.** Controls claim the touches that start on them; the game's `down`/`move`
handlers never see those touches.

```js
const stick = input.joystick({ zone: (x, y, w, h) => x < w / 2, radius: 56, deadzone: 0.12 /*, fixed: (w, h) => ({ x: 90, y: h - 110 }) */ });
const jump = input.button({ place: (w, h) => ({ x: w - 70, y: h - 90, r: 38 }), key: 'Space', label: 'JUMP', onPress: () => Kit.sfx('jump') });
// update: player.vx = stick.x * SPEED;  if (input.pressed('Space')) jump();   (the button stands in for its key)
// draw:   stick.draw(ctx, { base, ring, knob });  jump.draw(ctx, { fill, active, color, font });
```

Joystick: `{ active, x, y, mag, ox, oy, px, py, radius }` (`x`/`y` in -1..1 after the deadzone; `ox/oy` the
origin, `px/py` the knob). Without `fixed` it floats to where the thumb lands. Button: `{ down, pressed, x, y, r, label }`.
Draw them yourself from these fields when the default look does not fit.

## `Kit.audio`, `Kit.sfx`

WebAudio, created lazily on the first gesture (pointer, key or touch) and resumed with it. Everything
follows `Arcade.settings.sound` immediately (`Arcade.on('settings')`) and suspends on the hub's pause.
Graph: voices -> sfx/music buses -> master -> glue compressor -> limiter, so piles of sounds never clip.

`Kit.audio`: `ctx` (null before the first gesture), `ready`, `muted`, `voices`, `unlock()`,
`note('A4' | midi)` -> Hz, `volume({ music, sfx })` (0..1, defaults 0.5 / 0.8), `hold(on)` (effects silent,
music low and muffled: the shell does this while paused), `peak()` (0..1 after the limiter).

`Kit.sfx(name | params | [layers], opts)` plays a sound and returns `true` if it did. Presets (29):

`coin pickup jump land hit hurt explosion laser shoot powerup levelup click select whoosh swish splash thud
bounce bell win lose error pop tick zap charge step unlock combo`

Options: `vol` (multiplier), `pitch` (semitones: vary repeated sounds), `pan` (-1..1), `delay` (ms),
`force` (skip the 30 ms same-sound guard and the 48-voice cap), `n` (for `combo`).

```js
Kit.sfx('coin');
Kit.sfx('hit', { pitch: Kit.rng().range(-2, 2), vol: 0.8 });
Kit.sfx.combo(streak);                  // rises a note per step of the streak
Kit.sfx.define('chirp', { wave: 'triangle', freq: 900, to: 1600, slide: 0.08, release: 0.1, vol: 0.25 });
const engine = Kit.sfx.engine({ base: 55, vol: 0.14, wave: 'sawtooth' });
engine.set(throttle);                   // 0..1 each frame; engine.stop() fades it out
```

`Kit.sfx.list()` returns the preset names. A preset may be one params object, an array of layers, or a
function `(opts) => params | layers`.

**Synth params** (one voice; layers play together):

| Param | Default | |
|---|---|---|
| `wave` | `'square'` | `'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'` |
| `freq` | 440 | Hz (`Kit.audio.note('C5')` helps). For noise: the filter cutoff. |
| `to`, `slide` | | Pitch slide target (Hz) and its time (s). |
| `attack`, `hold`, `decay`, `sustain`, `release` | 0.003, 0.06, 0, 1, 0.1 | Envelope (s; sustain 0..1). |
| `vol` | 0.3 | Peak level. |
| `filter`, `cut`, `cutTo`, `q` | | `'lowpass' | 'highpass' | 'bandpass'`, cutoff Hz, sweep target, resonance. |
| `arp`, `arpStep` | , 0.06 | Semitone steps (`[0, 4, 7]`) and seconds per step. |
| `vib`, `vibRate` | , 7 | Vibrato depth (semitones) and rate (Hz). |
| `jitter` | | Random pitch spread (semitones) per play. |
| `pan`, `verb`, `at` | | Stereo position, reverb send (0..1), start offset (s) within the sound. |

## `Kit.music`

A step sequencer playing songs defined as data, scheduled on the audio clock (sample accurate, swing).

```js
Kit.music.play(Kit.music.song('night', { seed: 3 }));   // built-in moods, varied by seed
Kit.music.layer('kick', true);                          // adaptive: switch named tracks on and off live
Kit.music.duck(0.3, 400);                               // dip and muffle for 400 ms (or duck(0.3) ... duck(1))
Kit.music.stop(600);                                    // fade out over 600 ms (stop(0): cut)
```

`play(song)` (no-op when that song already plays; music asked for before the first gesture starts with it),
`stop(ms)`, `layer(name, on)`, `duck(level = 0.35, ms?)`, `playing` (the song object), `step`,
`song(style, { seed, key, bpm, lead })`, `styles`:

| Style | Mood |
|---|---|
| `calm` | 76 bpm lydian: pad, plucked arpeggio, bells. Puzzles, idle. |
| `night` | 88 bpm dorian, light swing: soft beat, pad, keys. Calm action, exploration. |
| `drive` | 116 bpm minor: four-on-the-floor, octave bass, arp, lead. Racing, runners. |
| `chip` | 140 bpm major square-wave chiptune. Arcade. |
| `bounce` | 104 bpm mixolydian, swung: stabs and a hook. Sports, casual. |
| `mystery` | 70 bpm phrygian: drone, sparse beat, bells. Adventure, caves. |
| `tense` | 132 bpm harmonic minor: driving hats, stabs. Bosses, timers. |

**Song format.**

```js
const SONG = {
  bpm: 96, swing: 0.15, key: 'D', scale: 'dorian', steps: 16,   // steps per bar (16ths)
  chords: [0, 3, 5, 4],                                         // scale degree per bar, loops
  tracks: [
    { name: 'kick', inst: 'kick', hits: 'x...x...x...x...' },
    { name: 'hat', inst: 'hat', hits: 'x.g.x.gox.g.x.g.' },
    { name: 'pad', inst: 'pad', chord: true, seventh: true, cutoff: 1200 },
    { name: 'bass', inst: 'bass', notes: '0 - . 0 . . 4 . 0 - . . 2 . 4 .', follow: true },
    { name: 'lead', inst: 'lead', notes: '7 - 6 4 . . 2 - 4 . . . . . . .', on: false },
  ],
};
```

- `scale`: `major minor dorian mixolydian lydian phrygian harmonic pentatonic minorPent`. `key`: `C`..`B`
  with `#`/`b`.
- `inst`: `kick snare hat` (drums), `bass pad pluck lead bell` (pitched).
- Drum `hits`: one char per step: `.` rest, `x` hit, `X` accent, `g` ghost, `o` open (longer hat).
- `notes`: space-separated scale degrees (0 = root of the key; 7 = an octave up in a 7-note scale), `.` rest,
  `-` holds the previous note. `follow: true` transposes the line by the bar's chord.
- `chord: true` plays the bar's triad (`seventh: true` adds the 7th) every `every` steps (default once a bar).
- Per track: `on`, `vol`, `oct` (octave offset), `gate` (note length 0..1), `wave`, `cutoff`, `verb`,
  `delay`; pads also `attack`, `release`.

## `Kit.fx`

Pooled particles (1,600 max: the oldest are recycled), floating text, shockwaves, screen shake and flash.
Updated by the loop; draw with `Kit.fx.draw(ctx)` (inside `cam.apply` for world-space effects). With
`prefers-reduced-motion` there is no shake, fewer particles and a softer flash (`Kit.fx.reduced`).

```js
fx.burst(x, y, { count: 24, color: ['#FFD166', '#fff'], shape: 'star', speed: [80, 260], life: [0.3, 0.7], gravity: 400, glow: true });
const smoke = fx.fountain(x, y, { rate: 20, angle: -Math.PI / 2, spread: 0.5, area: 30, life: [0.6, 1.2], sizeEnd: 2 });
const tr = fx.trail(player, { spacing: 6, color: '#8BE9FD', glow: true });   // tr.stop() when done
fx.float('+50', x, y, { color: '#FFD166', size: 24 });
fx.shockwave(x, y, { radius: 120, color: '#fff' });
fx.shake(10, 300);
fx.flash('#ffffff', 120, 0.5);
```

Particle options (`burst`, `fountain`, `trail`): `count` (burst, default 16), `speed` (px/s, `[60, 220]`),
`angle` and `spread` (radians; default all around), `life` (s, `[0.4, 0.9]`), `size` (`[2, 5]`), `sizeEnd`
(ratio at death, default 0), `color` (one or an array to pick from), `shape` (`circle spark square star ring
glow text`), `text`, `gravity` (px/s²), `drag` (default 1.5), `spin`, `rot`, `glow` (additive blend),
`fade` (default true). Any option may be a number or a `[min, max]` range.

`fountain(x, y, o)` adds `rate` (per s), `duration` (ms, 0 = until `stop()`), `follow` (object with x, y),
`area`/`areaY` (spawn box). It returns `{ stop(), move(x, y) }`. `trail(target, o)` spawns every `spacing` px
travelled. `float(text, x, y, { color, size, stroke, font, weight, rise, ms })` pops in and rises (skipped in key
art). `shockwave(x, y, { radius, from, ms, color, width, glow })`. `shake(amount px, ms)`,
`flash(color, ms, alpha)`, `seed(n)` (seeded effects for capture scenes), `clear()`, `count`, `shakeX/shakeY/
shakeRot` (applied by `Kit.cam.apply`; add them yourself if you draw without the camera).

## `Kit.tween`, `Kit.ease`

`Kit.tween(target, props, ms, ease = 'quadOut', { delay, onUpdate, onDone })` animates numeric props in game
time (it freezes with the loop and follows `timeScale`). A new tween on the same target and prop replaces the
old one. Returns `{ stop() }`. `Kit.tween.clear(target?)`, `Kit.tween.count`.

```js
Kit.tween(card, { y: 0, alpha: 1 }, 400, 'backOut', { delay: 80 });
Kit.tween(hud, { pop: 1.4 }, 90, 'quadOut', { onDone: () => Kit.tween(hud, { pop: 1 }, 220, 'elasticOut') });
```

`Kit.ease`: `linear`, `quadIn/Out/InOut`, `cubicIn/Out/InOut`, `sineInOut`, `expoOut`, `backIn/Out/InOut`,
`elasticIn/Out/InOut`, `bounceIn/Out/InOut`. Every curve maps 0 -> 0 and 1 -> 1; pass a name or a function.

## `Kit.cam`, `Kit.camera`

`Kit.cam` is the default camera (sized by the first view, updated by the loop); `Kit.camera({ x, y, zoom,
bounds, shake })` makes more. The camera looks at `(x, y)` in world units at the centre of the view.

```js
cam.follow(player, 6);              // lerp rate: higher is snappier
cam.offsetY = -80;                  // look ahead
cam.bounds = { minX: 0, minY: 0, maxX: worldW, maxY: worldH };
// draw: cam.apply(ctx); drawWorld(); fx.draw(ctx); cam.restore(ctx); drawHud();
```

Fields: `x, y, zoom, rot, w, h, target, rate, offsetX, offsetY, bounds, shake` (include `Kit.fx` shake,
default true). Methods: `follow(target, rate)`, `snap()`, `update(dt)`, `apply(ctx)` / `restore(ctx)`,
`toWorld(sx, sy, out?)`, `toScreen(wx, wy, out?)`, `visible(x, y, r)` (cheap culling), `resize(w, h)`.

## `Kit.gfx`

Drawing helpers. Everything expensive is cached (sprites, noise, vignette, gradients).

| Function | |
|---|---|
| `roundRect(ctx, x, y, w, h, r)` | Builds the path; returns `ctx` (`.fill()`, `.stroke()`). |
| `glow(ctx, color, blur, fn)` | Real `shadowBlur` glow around what `fn(ctx)` draws. Costly on big shapes. |
| `light(ctx, x, y, r, color, a)` | Additive soft light from a cached sprite: cheap, use hundreds. |
| `softShadow(ctx, x, y, rx, ry, a = 0.35)` | Soft elliptical contact shadow. |
| `sky(ctx, stops, h0?, h1?)` | Full-canvas vertical gradient. Stops `['#top', '#bottom']` or `[[0, c], [0.6, c], [1, c]]`; pass the same array each frame (cached on it). |
| `vignette(ctx, strength = 0.5, color = '#000')` | Darkened edges, cached per size. |
| `grain(ctx, amount = 0.05, t)` | Film grain over the canvas; pass time so it shimmers. |
| `noiseTexture(w, h, { seed, alpha, color, scale, mono })` | Cached tiling noise canvas (textures, paper, stone). |
| `lightRays(ctx, x, y, { count, length, spread, angle, width, color, alpha, t })` | God rays fanning from a point, swaying with `t`. |
| `starfield({ count, seed, layers, color, size, twinkle })` | `.draw(ctx, w, h, t, ox, oy)`: twinkling, parallax by depth. |
| `layers([{ depth, paint(g, w, h), axis, tile, alpha }])` | Parallax layers painted once into tiles; `.draw(ctx, w, h, sx, sy)` scrolls each at its depth; `.invalidate()` repaints (theme change). Only the painted rows/columns of a tile are drawn. |
| `ridge(g, w, h, { color, base, amp, rough, seed, points })` | Seamless silhouette (hills, dunes, roofline) for a layer tile. |
| `sprite(key, w, h, drawFn)` | Draw once at the view DPR, cached by key; `drawFn(g, w, h)` paints in CSS px. `clearSprites(prefix?)`. |
| `blit(ctx, sprite, x, y, scale, rot, a)` | Centred draw of a sprite or image. |
| `text(ctx, str, x, y, { size, weight, font, color, stroke, strokeWidth, shadow, shadowBlur, align, baseline, alpha })` | Canvas text. `font`: `display` (default) `body system rounded mono serif condensed` or any CSS family. |
| `offscreen(w, h)` | A canvas of that size. |
| `hsl(h, s, l, a?)`, `mix(c1, c2, t)`, `shade(c, amt)` (+ lighter, - darker), `alpha(c, a)`, `rgba(r, g, b, a)`, `parse(c)` -> `[r, g, b, a]`, `css(name, fallback)` | Colour helpers; any CSS colour in. |
| `fonts`, `dpr` | Font stacks; the current sprite DPR. |

```js
const hills = gfx.layers([
  { depth: 0.2, paint: (g, w, h) => gfx.ridge(g, w, h, { color: pal.far, base: 0.65, amp: 0.2, seed: 2 }) },
  { depth: 0.6, paint: (g, w, h) => gfx.ridge(g, w, h, { color: pal.near, base: 0.8, amp: 0.12, seed: 5 }) },
]);
// draw: gfx.sky(ctx, SKY); hills.draw(ctx, view.w, view.h, cam.x, 0);
const coin = () => gfx.sprite('coin', 24, 24, (g, w) => { g.fillStyle = '#FFD166'; g.beginPath(); g.arc(w / 2, w / 2, 10, 0, 7); g.fill(); });
gfx.blit(ctx, coin(), x, y, 1 + pop * 0.3);
```

## `Kit.rng`, math, collision

`Kit.rng(seed?)`: seeded mulberry32 (number or string seed; none = random). `next()` 0..1, `range(a, b)`,
`int(a, b)` (inclusive), `pick(arr)`, `chance(p)`, `sign()`, `shuffle(arr)` (in place), `reset(seed)`.
Seed every run and every capture scene so they are reproducible.

Math: `clamp(v, a, b)`, `lerp(a, b, t)`, `dist(ax, ay, bx, by)`, `angle(ax, ay, bx, by)`,
`approach(v, target, step)`, `wrap(v, min, max)`, `smooth(v, target, rate, dt)` (frame-rate independent easing:
rate 10 closes ~63% of the gap in 0.1 s), `smoothstep(e0, e1, x)`, `angleDiff(a, b)`.

Collision: `circleCircle(ax, ay, ar, bx, by, br)`, `rectRect(a, b)` (`{ x, y, w, h }`), `pointInRect(px, py, r)`,
`segCircle(x1, y1, x2, y2, cx, cy, r)` (fast movers: test the swept segment, not the end point).

## `Kit.save`

A thin wrapper over `Arcade.store` (per-game `localStorage`): `get(key, default)`, `set(key, value)`,
`best()`, `setBest(n)` (stores only a better score; returns whether it did). The shell keeps the best score
for you; use `save` for settings, unlocks and progress.

## `Kit.shell`

The title screen, pause menu and game-over panel as a DOM overlay, wired to the SDK. One per game.

```js
const shell = Kit.shell({
  title: 'Lanternwing', kicker: 'A night flight', tagline: 'Climb the canopy. Keep your light alive.',
  playLabel: 'Play',
  how: ['Drag to steer.', 'Tap to dash through bats.'],
  loop,
  score: () => score,                 // whole points: the shell rounds what it shows and reports
  lose: () => die(),                  // optional: what Arcade.test's lose() should do in play
  theme: { panel: 'neon', layout: 'left', button: 'cut', titleStyle: 'glow', font: 'condensed', radius: 10,
           colors: { accent: '#FF3EA5', accentInk: '#0A0618' } },
  onStart() { newRun(); },            // also: onPause, onResume, onOver({ score, best, isBest, reason })
});
// when the run ends:
shell.over({ stats: [{ label: 'Altitude', value: '412 m' }, { label: 'Best chain', value: '9' }], delay: 900 });
```

**What it does.** Title screen with the title, tagline, Play (focused, so Enter/Space start) and the best
score. In play, a 48 px pause button (and Escape or P) opens the pause menu: Resume, Restart, How to play
(when `how` is given), Sound and Vibration switches (standalone only: the hub owns them when embedded) and
Back to games (embedded only). The hub's pause message opens the same menu. Game over counts the score up,
shows the best or a NEW BEST celebration (confetti, `win` sound, haptic), up to 4 stat rows and Play again
(plus Back to games when embedded); its buttons wake 550 ms later so a stray tap cannot skip it. Focus is
trapped in dialogs, every target is 44 px+, padding respects safe areas, and the whole shell is hidden in
`?keyart`. It plays the `click` sound on its buttons (`uiSound: false` to turn off) and holds the audio
while paused.

**SDK wiring.** Play calls `Arcade.runStart(runProps?())`; `over()` saves the best and calls
`Arcade.runEnd({ score, reason, new_best, ...props })`; Restart ends the run with `reason: 'restart'` first.
It registers `Arcade.test` defaults: `start()`, `lose()`, `state()` -> `{ phase, score, paused }`, `pause()`,
`resume()`. Add your own with `Arcade.test({ ... })` (merged; the demo adds `seed`, `autopilot`, `info`).

**Options.** `title`, `kicker`, `tagline`, `playLabel`, `how` (string or lines), `loop`, `focus` (element to
focus in play; default the loop's canvas), `score()`, `format(n)` (default `Kit.fmt`), `lose()`,
`runProps()`, `pauseButton: false` (draw your own and call `shell.pause()`), `uiSound: false`, `theme`,
`onStart`, `onPause`, `onResume`, `onOver`.

**Theme.**

| Key | Values |
|---|---|
| `panel` | `glass` (frosted), `solid` (white card), `outline` (no fill, strong lines), `paper` (warm card, ink border), `neon` (dark with glowing edges), `pixel` (hard shadows, square) |
| `layout` | `center` (default), `bottom` (title high, Play low: one-thumb), `left` (editorial, left aligned), `card` (title inside a panel) |
| `button` | `pill`, `rounded`, `cut` (angled corners), `square`; each panel has a default |
| `titleStyle` | `solid`, `gradient`, `outline`, `stamp`, `glow` |
| `font` | `house` (Unbounded + Figtree), `system`, `rounded`, `mono`, `serif`, `condensed`, or `{ display, body }` CSS stacks |
| `colors` | `{ ink, inkSoft, panel, accent, accentInk, scrim, line }`, any CSS colour or `var(--token)` |
| `radius` | panel corner radius in px |
| `pauseCorner` | `'tr'` (default) or `'tl'` |

The house fonts need the Google Fonts link in the page (see the skeleton); without it the stacks fall back to
system fonts.

**Methods.** `start()`, `pause()`, `resume()`, `restart()`, `over({ score?, reason, stats, props, title, delay })`
(`title` replaces "Game over", e.g. "Level clear"; `delay` ms before the panel, default 650), `toast(text, ms)`,
`theme(t)` (re-theme live), `state()`, `phase` (`title | play | paused | over`), `best`, `el`.

## Other helpers

`Kit.fmt(n)` whole number with thousands separators. `Kit.haptic(pattern)` = `Arcade.haptic` without browser
warnings before the first gesture. `Kit.isDark()`, `Kit.onTheme(fn)` (hub light/dark setting or the system
changed: re-read your palette, `layers.invalidate()`), `Kit.css('--token', fallback)`. Flags: `Kit.keyart`,
`Kit.embedded`, `Kit.reducedMotion`, `Kit.debug` (`?debug`), `Kit.STEP`, `Kit.version`.

## Art direction

The owner's complaint about early games was "templated, not finished": the same navy panels, the same pill
HUD, flat sparse backgrounds. The kit makes rich art cheap; the decisions are yours. Aim for a frame that
would work as a poster with the HUD hidden.

1. **Pick a world and a palette first.** One sentence ("a moonlit forest seen by a moth"), then 5 to 7
   colours as CSS tokens: two or three for the sky, two or three for depth layers (far ones closer to the sky
   colour, near ones darker and more saturated), one accent for what the player wants, one danger colour.
   Define a light and a dark set (`prefers-color-scheme`, `[data-theme]`) and read them with `Kit.css`.
   Never the hub's violet and navy unless the game is about them.
2. **Layer the background, back to front:** `sky` gradient, `starfield` or distant shapes, a light source
   (`light` + `lightRays`), two or three parallax `layers` (`ridge` or your own painter), a mid-ground the
   action happens in, then a near foreground layer at the edges (depth > 1, darker, partly out of frame).
   Fog bands or a `noiseTexture` between layers sell distance.
3. **Light the scene.** Put a light where the eye should go (the player, pickups, the goal) with
   `gfx.light`. A darkness or tint pass with holes for lights reads as atmosphere (Lanternwing's dark closes in
   as your light runs out: the mechanic is the lighting). Finish with `vignette` and a little `grain`.
4. **Keep everything moving a little.** Twinkle, sway (`Math.sin(t + phase)`), drifting motes, idle
   animations, a slow camera drift on the title screen. A still frame looks broken on a phone.
5. **Juice every action.** Each player action gets sound + particles + a number or a squash; each hit gets
   `hitstop` + `shake` + `flash`; each streak gets a rising `sfx.combo` and a growing multiplier. Ease
   everything (`backOut` for pops, `cubicOut` for moves). Scale the effect to the event: a coin is a sparkle, a
   boss kill is a shockwave and a slow-motion beat.
6. **Make the HUD part of the world.** Draw it on the canvas in the game's own font and colours, with a soft
   shadow from the scene's light; keep it to the top corners and away from the pause button. No generic pills.
7. **Give the shell the game's personality.** Choose `panel`, `layout`, `button`, `titleStyle`, fonts and
   colours that match the art. Run an attract mode behind the title (the game playing itself) instead of a
   static image.
8. **Sound and music set the mood.** Pick a `music.song` style and seed that fits, layer tracks in as
   intensity rises (`layer`), `duck` on big moments and game over.
9. **Respect players.** Honour reduced motion (the kit does for fx), keep text contrast high over busy art,
   keep important things out of the safe-area edges.
10. **Key art and screenshots** come from `Arcade.scenes`: seed them, place the best moments by hand
    (a near miss, a big combo), and check them with `node tools/make-art.cjs --game <id>`.

## Performance budget

Canvas fill rate is the cost that bites: every full-screen pass (a sky, a layer, a darkness overlay, a
vignette) touches every pixel. `node tools/game-check.cjs` measures frame time in software-rendered headless
Chromium, which is slower than a phone's GPU, so treat it as a strict, honest budget:

- Aim for no more than ~8 full-screen passes per frame. Layers only draw their painted rows/columns, so
  side walls and hills are cheaper than full images.
- Prefer cached images over per-frame gradients: `sky` (cached strip), `vignette`, `sprite`, `light`, a
  pre-rendered radial sprite stretched into place instead of a full-screen `createRadialGradient` fill.
- Avoid `shadowBlur` (`gfx.glow`, text shadows) on big or many shapes, `ctx.filter`, and composite modes like
  `overlay`/`multiply` over the whole screen; `lighter` on small lights is fine.
- Cull with `cam.visible`, pool objects (no per-frame allocations), and keep particle counts moderate.

## New game skeleton

A complete, contract-passing game to copy into `games/<id>/index.html` (change the id, title and everything
else). It passes `node tools/game-check.cjs --game <id>` as is: title, play, pause, game over, best score,
key art and capture scenes, test hooks, light/dark palettes, layered background, juice, sound and music.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Orbfall</title>
<meta name="description" content="Pop the glowing orbs before they float away.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&family=Unbounded:wght@600;800&display=swap">
<style>
/* Palette as CSS tokens: the canvas reads them, so light/dark (hub setting) reaches the art. */
:root { --sky-1: #3A2C7A; --sky-2: #C8638A; --sky-3: #F4B183; --hill-1: #5B3F8C; --hill-2: #2E2160; --orb: #FFE3B0; --glow: #FFB547; --ink: #FFF4E6; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --sky-1: #0E0A26; --sky-2: #3B1E52; --sky-3: #8A3F5E; --hill-1: #2A1F55; --hill-2: #140E30; color-scheme: dark; }
}
:root[data-theme="dark"] { --sky-1: #0E0A26; --sky-2: #3B1E52; --sky-3: #8A3F5E; --hill-1: #2A1F55; --hill-2: #140E30; color-scheme: dark; }
html, body { height: 100%; margin: 0; overflow: hidden; overscroll-behavior: none; background: var(--sky-1); -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
#game { display: block; width: 100%; height: 100%; outline: none; }
</style>
</head>
<body>
<canvas id="game" aria-label="Orbfall game"></canvas>
<script src="../../hub/sdk.js"></script>
<script src="../../hub/kit.js"></script>
<script>
(() => {
  'use strict';
  Arcade.init({ id: 'orbfall', title: 'Orbfall', version: '1.0.0' });
  const { gfx, fx, cam } = Kit;

  const view = Kit.view(document.getElementById('game'), { alpha: false });
  const ctx = view.ctx;
  // World = screen CSS px here; the camera exists for shake (and for scrolling, in bigger games).
  const centre = v => { cam.x = v.w / 2; cam.y = v.h / 2; };
  view.onResize(centre);
  centre(view);

  /* palette and layered background, rebuilt when the theme changes */
  const pal = {};
  let sky = null, hills = null;
  const stars = gfx.starfield({ count: 70, seed: 2, size: [0.5, 1.8] });
  function readPalette() {
    for (const k of ['sky-1', 'sky-2', 'sky-3', 'hill-1', 'hill-2', 'orb', 'glow', 'ink']) pal[k] = Kit.css('--' + k);
    sky = [pal['sky-1'], pal['sky-2'], pal['sky-3']];
    hills = gfx.layers([
      { depth: 0.25, paint: (g, w, h) => gfx.ridge(g, w, h, { color: pal['hill-1'], base: 0.74, amp: 0.2, seed: 3 }) },
      { depth: 0.6, paint: (g, w, h) => gfx.ridge(g, w, h, { color: pal['hill-2'], base: 0.86, amp: 0.14, seed: 8 }) },
    ]);
  }
  readPalette();
  Kit.onTheme(() => { readPalette(); loop.render(); });

  /* run state */
  const SONG = Kit.music.song('bounce', { seed: 4 });
  let G = null, rand = Kit.rng(1), nextSeed;
  function newRun(seed) {
    rand = Kit.rng(seed === undefined ? Date.now() : seed);
    G = { t: 0, score: 0, lives: 3, combo: 0, popped: 0, orbs: [], spawn: 0.4, over: false };
  }

  function update(dt) {
    if (!G || G.over) return;
    G.t += dt;
    if ((G.spawn -= dt) <= 0) {
      G.spawn = Math.max(0.4, 1 - G.t * 0.01);
      G.orbs.push({ x: rand.range(36, view.w - 36), y: view.h + 30, r: rand.range(18, 28), vy: rand.range(70, 100) + G.t * 1.5, ph: rand.range(0, 6) });
    }
    for (let i = G.orbs.length - 1; i >= 0; i--) {
      const o = G.orbs[i];
      o.y -= o.vy * dt;
      if (o.y < -40) { G.orbs.splice(i, 1); miss(); }
    }
  }
  function pop(o) {
    G.combo++;
    const pts = 10 * Math.min(5, G.combo);
    G.score += pts;
    G.popped++;
    fx.burst(o.x, o.y, { count: 22, color: [pal.orb, pal.glow], glow: true, speed: [60, 240], size: [2, 4.5], life: [0.3, 0.7] });
    fx.shockwave(o.x, o.y, { radius: o.r * 2.6, color: pal.orb });
    fx.float('+' + pts, o.x, o.y - o.r, { color: pal.ink });
    Kit.sfx.combo(G.combo);
    Kit.haptic(12);
  }
  function miss() {
    G.combo = 0;
    G.lives--;
    fx.shake(9, 260);
    fx.flash('#ff3355', 140, 0.25);
    Kit.sfx('hurt');
    Kit.haptic(40);
    if (G.lives <= 0) end();
  }
  function end() {
    if (!G || G.over) return;
    G.over = true;
    Kit.sfx('lose');
    shell.over({ stats: [{ label: 'Orbs popped', value: Kit.fmt(G.popped) }, { label: 'Time', value: Math.round(G.t) + ' s' }] });
  }

  function draw() {
    const w = view.w, h = view.h, t = loop.time;
    view.clear();
    gfx.sky(ctx, sky);
    stars.draw(ctx, w, h, t);
    hills.draw(ctx, w, h, t * 12, 0);
    cam.apply(ctx);
    if (G) {
      for (const o of G.orbs) {
        const y = o.y, x = o.x + Math.sin(t * 2 + o.ph) * 6;
        gfx.light(ctx, x, y, o.r * 2.6, pal.glow, 0.55);
        ctx.fillStyle = pal.orb;
        ctx.beginPath(); ctx.arc(x, y, o.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    fx.draw(ctx);
    cam.restore(ctx);
    gfx.vignette(ctx, 0.4);
    // The HUD lives on the canvas, inside the scene's light; never in key art.
    if (G && shell.phase !== 'title' && !Kit.keyart) {
      gfx.text(ctx, Kit.fmt(G.score), w / 2, 52, { size: 34, color: pal.ink, stroke: 'rgba(0,0,0,0.3)' });
      for (let i = 0; i < 3; i++) gfx.light(ctx, w / 2 - 20 + i * 20, 88, 9, i < G.lives ? pal.glow : pal.ink, i < G.lives ? 0.9 : 0.18);
    }
  }

  const loop = Kit.loop({ view, update, draw });
  const input = Kit.input(view.canvas);
  input.on('down', p => {
    if (!G || G.over) return;
    for (let i = G.orbs.length - 1; i >= 0; i--) {
      const o = G.orbs[i];
      if (Kit.dist(p.x, p.y, o.x, o.y) <= o.r + 14) { G.orbs.splice(i, 1); pop(o); return; } // generous for thumbs
    }
  });

  const shell = Kit.shell({
    title: 'Orbfall',
    tagline: 'Pop the glowing orbs before they float away.',
    how: ['Tap an orb to pop it. Pop them in a row for up to 5x points.', 'Three orbs escape and the night is over.'],
    loop,
    score: () => (G ? G.score : 0),
    lose: end,
    theme: { panel: 'glass', layout: 'bottom', colors: { accent: '#FFB547', accentInk: '#2A1405' } },
    onStart() { newRun(nextSeed); nextSeed = undefined; Kit.music.play(SONG); },
  });
  // Extras for tools/game-check.cjs and capture scenes, on top of the shell's start/lose/state.
  Arcade.test({ seed(n) { nextSeed = n; }, info: () => (G ? { orbs: G.orbs.length, lives: G.lives } : null) });

  // Deterministic states for the card art and store screenshots, registered before Arcade.ready().
  function scene(seed, steps) {
    fx.seed(seed);
    nextSeed = seed;
    shell.start();
    loop.step(steps);
    loop.stop(); // hold this exact frame for the capture
  }
  Arcade.scenes({ art: () => scene(7, 300), shot1: () => scene(11, 180), shot2: () => scene(23, 420) });

  Kit.music.play(SONG);
  loop.start(); // first frame calls Arcade.ready()
})();
</script>
</body>
</html>
```

Checklist after copying: own palette and world, own shell theme, music style and seed, HUD drawn in the game's
style, `how` lines, the three scenes show the game at its best, `Arcade.progress` if the game has levels, then
`node tools/game-check.cjs --game <id>` and look at every screenshot it saves.
