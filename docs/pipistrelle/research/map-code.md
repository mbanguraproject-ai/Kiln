# Pipistrelle: technical map of the current game (v1.0.0)

Scope: every line of `games/pipistrelle/index.html` (2,962 lines, 158 KB), `games/pipistrelle/test.cjs` (230 lines), `hub/sdk.js`, the parts of `hub/kit.js` that Pipistrelle relies on (view, gfx, camera, loop, fx, shell, save), `docs/KIT.md`, `docs/GAME_CONTRACT.md`, `docs/GAME_BUILD.md`, `tools/game-check.cjs`, `tools/build-web.cjs`, `tools/bundle.cjs` and `sw.js`. No repo file was edited. The measurements below came from two throwaway Playwright scripts in the session scratchpad, run in headless Chromium, which renders in software.

---

## 1. Architecture and module boundaries

Everything lives in one IIFE (`'use strict'`, lines 73-2959) inside one inline `<script>`. Shared state is held in module-level `let`/`const` variables rather than in a namespace. The file loads `../../hub/sdk.js` and then `../../hub/kit.js` (lines 70-71).

| Lines | Block | Contents |
|---|---|---|
| 1-65 | Head and CSS | Colour tokens on `:root` with dark and light variants (menus only; the cave stays night in both themes). `#pp-low` is fixed behind `#game`. Kit-shell overrides: a sonar-ring title halo and four "How to play" pictograms as SVG data URIs. |
| 67-69 | DOM | `<canvas id="game">` (play canvas, transparent) and `<canvas id="pp-low">` (the back layer). |
| 75-104 | Boot constants | `Arcade.init`. Tuning constants (80-84). Palette `COL`/`P`/`SKY`/`NIGHT_SKY` (86-96). `Kit.view(#game)` with default options and the `fit()` zoom (98-104). |
| 106-114 | Helpers | `hash2` (integer hash used for seeding), `compact` (in-place filter). |
| 116-159 | Cave specs | `INTRO` banner texts for caves 1-8 (122-131), `caveSpec` (133-150), `genCave` with 8 retries and then a forced fallback (152-159). |
| 161-529 | `tryCave` | The whole generator plus every hazard's placement code, in one function (detail in section 3). |
| 531-578 | World queries | `newMoth`, `fieldAt` (bilinear field sample), `typeAt`, `solidAt`, `riverAt`, and the `cast` ray-march with its shared `HIT` result. |
| 580-693 | Cave art | `buildCaveArt` (marching squares, texture, rim, water, crystals, and the `L.rock`/`L.mem` canvases) and `paintShards`. |
| 695-812 | Backdrop | `bgTile`, `buildBg` (two parallax silhouette layers, glowworms, the `BG.fg` foreground tips), `tileDraw`, and `drawBg` including the echo-ring relight. |
| 814-859 | Echo pools | Dot ring buffer `EN=3600`, line ring buffer `LN=2600`, memory queue `MQ=8000` with `memPush`/`memFlush`, and `dotSprites`. |
| 861-942 | Run state | `newState` (the `G` object), `enterCave`, `saveRun`/`clearRun`, `newRun`/`continueRun`/`attract`. |
| 944-1222 | Verbs | `sonar`, `sortMem`, `visibleFrom`, `pingAll`, `chirp`, `shriek`, `drainRate`, `eatMoth`, `rescuePup`, `hurt`, `bump`, `wakeOwl`, `die`, `finishRun`, `exitCave`. |
| 1224-1249 | Night entry | `startNight`, `spawnNightMoth`, `endNight`. |
| 1251-1298 | Input and AI | `touch` state, `steerInput` (relative stick), `autoSteer` (flow-field autopilot). |
| 1300-1694 | Update | `update` (fades, dive into the next cave), `updateCave`, `moveBat`/`hitsWall`/`collide`, `tearWeb`, `updateWorld` (every hazard's update), `crash`, `updateTrail`, `updateCam`, `updateNight`. |
| 1696-1761 | Frame composer | `draw()`: low-resolution back layers, then the full-resolution front (detail in section 4). |
| 1763-2075 | World drawing | `drawDark`, `blitCave`, moon sprite, `archPath`, `drawOutside`, `drawMoonlight`, `drawWater`, `drawProximity`, `litA`, `drawEntities`. |
| 2077-2375 | Sprites in code | `drawWeb`, `drawMoth`, `drawHeart`, `drawOwl`, `drawRings`, `drawEcho` (lines bucketed by colour and brightness, then dots), bat art (`wingPath`, `drawWing`, `drawBatAt`), `drawPup`, `drawTrailPups`. |
| 2377-2439 | Night drawing | `stars`, `buildTrees` (`gfx.layers`), `drawNight`, `fogSprite`. |
| 2441-2468 | Overlays | Moonlight wipe and fade. |
| 2470-2643 | HUD | Moth-wing energy pips, `drawHud` (sonar arcs, score, cave label, carried ×mult, pup icons, night timer, moon compass, banners, hints), ghost-hand tutorial. |
| 2645-2730 | Audio | 23 `Kit.sfx.define` voices and `makeSong(deep)`. |
| 2732-2813 | Wiring | `Kit.loop`, `Kit.input` handlers, `Kit.shell` config, an injected "New run" button, `syncTitle`, and the `pagehide` save. |
| 2815-2854 | Test hooks | `Arcade.test({...})`, listed in section 10. |
| 2856-2949 | Scenes | `sceneRun`, `placeBat`, `nearestOpen`, and `Arcade.scenes({ art, shot1, shot2 })`. |
| 2951-2959 | Boot | `buildSprites`, `buildBg`, `buildTrees`, `attract(7)`, `loop.step(40)`, `Kit.music.play(SONG)`, `loop.start()`. |

**Hidden ordering dependencies.** Splitting the file needs care because some functions use names that are declared later and only work because they run after boot:
- `hurt`, `die` and `normalTime` use `loop` (declared at 2735).
- `updateCave` and `steerInput` use `input` (2736).
- `enterCave` uses `SONG` and `SONG_DEEP` (2730).
- `finishRun` uses `shell` (2764).
- `TMP` is declared at 812 but used from 799 onward.

**Module-level mutable globals:** `L` (current cave), `G` (run), `ctx` (the current draw target, switched between `mainCtx` and `lowG` in the middle of a frame), `zoom`, `xray`, `nextSeed`, `forceNew`, `autopilotFlag`, `safeFlag`, `lowC`/`lowG`/`hiQ`/`lowKey`, `darkC`/`darkG`, `BG`, `trees`, `stars`, the echo typed arrays with `eHead`/`lHead`/`mqHead`/`mqTail`, `touch`, `lastInput`, `camTarget`.

**Dead fields:** `lv.archPainted`, `G.pathI`, `G.lastMult`, `G.tutT`, `G.shriekWarned`, `stal.floor` (computed, never read), and `hurt(..., why)`.

---

## 2. Game state model

### `G`: the run (`newState`, 867-877; extra fields added on the fly)
- **Identity:** `mode` (`'play'` or `'attract'`), `runSeed`, and `rng = Kit.rng(hash2(seed, 99))`. A continued run uses `hash2(seed, cave*31)` instead, so entity motion differs after a Continue even though the layout is identical.
- **Phase within the run:** `sub` is one of `'cave' | 'exit' | 'night' | 'dive' | 'dead'`. `fade`/`fadeDir` and `wipe`/`wipeX`/`wipeY` drive the transitions.
- **Progress and economy:** `cave`, `energy` (0-100), `score` (banked moths, which is also the Kiln score), `carried` (moths held in this cave), `trail[]` (rescued pups following the bat), `pupsTotal`, `mothsEaten`, `chirps`, `bumps`, `bankFrom`/`bankTo`, `saveE` (energy at cave entry).
- **Timers:** `t`, `cd` (chirp cooldown), `scd` (shriek cooldown), `exitT`, `nightT`, `deadT`, `dripT`, `lowBeat`, `autoChirp`, `firstChirp`, `saveT`.
- **Transient lists:** `rings[]` (sonar rings), `reechoes[]` (pending crystal answers), `minis[]` (water ripples), `night` (`{ scroll, moths[], spawn, caught, h }`).
- **Bat** (`G.bat`): `x, y, vx, vy, face, flap, puff, rim, stun, sx, sy, bumpCd, web, wig, webT, lastAx, lastAy, blink, glide, dead, charge`.
- **Position history:** `hx`/`hy` `Float32Array(300)` plus `hHead`, so pups can follow the path the bat flew.
- **Tutorial and UI:** `tut` (0-3), `tutMoved`, `banner`, `hint`, `webTaught`, `pipPop`/`pipFrom`, `multPop`, `testIn` (test-injected input), `overSent`.

### `L`: the cave (built by `tryCave` and `buildCaveArt`)
- **Grid:** `n`, `sp` (the spec), `W` (mouth x), `WT = W + 320`, `H`, `cols`, `rows`.
- **Per-cell arrays:** `type: Uint8Array` (0 air, 1 rock, 2 water, 3 crystal rock, 5 the arch opening), `dist: Uint8Array` (cells to the nearest rock), `field: Float32Array` (3×3-averaged solidity; walls are its 0.5 contour), `flow: Int32Array` (BFS distance to the exit for the autopilot).
- **Geometry:** `path[]` (main spline points `{ x, y, r }`), `chambers[]`, `branches[]`, `exitY`, `startY`, `archH`.
- **Entities:** `moths[]`, `pups[]`, `webs[]`, `stals[]`, `rivers[]`, `crystals[]`, `gusts[]`, `owls[]`, `drips[]`.
- **Render data:** `segs` (marching-squares edge segments as a Float32Array), `segStart` (per-square index into `segs`), `rock` and `mem` (offscreen canvases at half resolution), `memG`.
- **Methods:** `cellOf`, `isSolid`, `addCrystals`.

### Run lifecycle
`onStart` either continues the saved run or starts a new one with `enterCave(1)`. In the cave, a death goes `dead` → `finishRun` → `shell.over`. Reaching the mouth goes `exitCave` → `sub='exit'` (2 s count-up of the haul) → `startNight` (15 s) → `endNight` → `sub='dive'` (fade to black) → energy refill → `enterCave(n+1)`. In attract mode the death or exit path calls `attract(seed+1)` instead.

---

## 3. Cave generation

### Seeding
- Geometry is `tryCave(hash2(runSeed, n) + attempt*7919)`, so a cave is deterministic for a given run seed and cave index (test 12 checks this with a fingerprint).
- Cosmetic seeds use **only** the cave index: the stone strata and blotches (`Kit.rng(lv.n*31+7)`, line 637), the noise texture (`seed: lv.n*13+1`, line 634) and the arch vines (`Kit.rng(L.n*7+3)`, line 1859).
- The backdrop uses fixed seeds 11, 23 and 91, so it is the same in every cave of every run.
- The gameplay rng `G.rng` is shared by simulation and cosmetics: moth jitter, sonar jitter, sfx pitch and drip timing all draw from it. Changing any cosmetic call therefore shifts the simulation.

### `tryCave` pipeline (12 px grid, `CELL = 12`)
1. **Main path (178-214).** Catmull-Rom control points every 190-270 px, pulled towards `exitY` (22-34% of H) past 45% of the width. Radius `p.r` is modulated by sines around `sp.rad`, never below 44, with a roomy entrance and exit. Every point is carved out.
2. **Branches (216-248).** `nb` random walks of 18-34 steps. Some loop back to the path; the rest end in a carved chamber.
3. **Gust chimneys (250-260).** Vertical shafts carved up from the path.
4. **Roughening (262-286).** Edge cells are randomised, then 4 passes of a cellular automaton (≥5 of 9 neighbours solid → solid).
5. **Connectivity (287-309).** Passage cores are re-carved, a solid frame is added (open only at the right mouth), and a flood fill from the start turns sealed pockets to rock. If the exit is not reachable the attempt returns `null`.
6. **Arch and distance (311-329).** The arch cells get type 5; a BFS computes the distance field.
7. **Rivers (342-399).** A dip in the path is found, a basin is flood-filled below a water level (bounded to ±340 px and 2,600 cells), and `passable()` checks that a bat-sized body can still get from start to exit. A flooded tunnel also gets drips under the ceiling.
8. **Smoothed field (400-410)**, then crystals (412-441).
9. **Entities (451-510).** Moths on the path and in chambers (via `openSpot`), pups on chamber or path ceilings, webs at the narrowest path points (at least 340 px apart), stalactites over the path, owls on chamber floors.
10. **Flow field (511-526).** Two BFS passes from the exit column; the second prefers cells at least 2 from rock.

**Layout assumptions baked in:** progression is left to right, the start is at x≈110-150, there is a single exit on the right through a moonlit arch, and caves are 1,040-1,500 px tall.

### Cave index → spec (`caveSpec`, 133-150, plus the counts derived in `tryCave`)

| n | width (screens×420) | H | rad | moths | pups | branches | max webs | max stals | drain/s | dive refill | hazards switched on |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2520 | 1040 | 118 | 22 | 1 | 2 | n/a | n/a | 1.75 | +6 | none |
| 2 | 2520 | 1080 | 112.5 | 21 | 2 | 2 | 2 | n/a | 1.80 | +8 | webs |
| 3 | 2940 | 1120 | 107 | 21 | 2 | 3 | 3 | 5 | 1.85 | +10 | + stalactites |
| 4 | 2940 | 1160 | 101.5 | 20 | 3 | 3 | 3 | 6 | 1.90 | +12 | + river |
| 5 | 3360 | 1200 | 96 | 20 | 3 | 3 | 3 | 6 | 1.95 | +14 | + crystals |
| 6 | 3360 | 1240 | 90.5 | 19 | 3 | 3 | 4 | 7 | 2.00 | +16 | + gusts |
| 7 | 3780 | 1280 | 85 | 18 | 3 | 4 | 4 | 7 | 2.05 | +18 | + owls |
| 8 | 3780 | 1320 | 79.5 | 18 | 3 | 4 | 4 | 8 | 2.10 | +20 | + flood (2nd river, drips) |
| 9+ | 4200 | to 1500 | to 54 | to 14 | 3 | 4 | to 6 | to 11 | to 2.30 | +20 | each of the 7 hazards on with p=0.55, at least 4 forced on |

- Difficulty stops scaling at cave 13 (rad 54, H 1500) and cave 15 (14 moths). After that only the random hazard mix changes.
- Cap counts per cave: gusts 2 (3 from cave 10), owls at most 2, crystals 1 chamber plus 2 patches.
- Banner texts exist only for caves 1-8. After that the banner alternates between two generic lines.
- Measured placements for seed 42 (`__ppGenMs`): generation 13-128 ms plus art 13-63 ms per cave on desktop headless. Cave 9 rolled no webs and no crystals; cave 10 rolled no stalactites and no river.

---

## 4. Rendering pipeline

### Canvases and layers (`draw()`, 1710-1761)

**A. `#pp-low`, the back layer** (2D context with `alpha:false`). It is sized at CSS size × `LOW_S`, where `LOW_S = 0.6` in play and `1` only when `hiQ` is set (key art and capture scenes). It ignores device pixel ratio entirely and is stretched by CSS under `#game`; `placeLow()` re-syncs its box when the layout changes. Drawn in this order:
1. `gfx.sky(SKY)`.
2. `drawBg`: 2 parallax silhouette tiles (560×520 and 720×640, painted at 1×, only the top and bottom 42% bands drawn) at alpha 0.85, plus glowworms (46 and 18 per tile, 1 px rectangles, additive). For **each live sonar ring** an annulus clip is set and the cyan-lit copies of both layers are drawn again.
3. Under the camera: `blitCave(L.rock)` with **nearest-neighbour** sampling (`imageSmoothingEnabled = hiQ`).
4. `drawDark`: a mask canvas at **¼ CSS resolution**, filled `#020309` at alpha 0.94 (0.92 attract, 0.8 key art, 0.15 x-ray). Holes are cut with `destination-out`: the bat glow (r 150, scaled by energy), the arch (380 and 220), lit crystals, and 3 stroked bands per sonar ring. The mask is then stretched onto the low layer.
5. `blitCave(L.mem, 0.55, 'lighter')`: the permanent memory of echoes.
6. `drawMoonlight` near the exit: 2 `gfx.light`, `gfx.lightRays`, 40 dust motes.
7. Back on screen space: the `BG.fg` hanging-tips strip (900×140 at 1×), then `gfx.vignette`.

**B. `#game`, the main canvas** (`Kit.view` defaults: `maxDpr 2`, `maxPixels 3.4e6`, transparent). `clearRect`, then under the camera:
1. `drawOutside`: arch, night sky, moon, vines and stone lip, as vectors at full resolution.
2. `drawWater`: surface lines and current flecks.
3. `drawProximity`: the bat's warm light traced along `segs` within 92 px, in 3 distance bands.
4. `drawEntities`: crystals with lights, webs, stalactites, drips, minis, owls, pups, moths, gust dashes.
5. `drawRings`.
6. `drawEcho`: lines bucketed into 8 colours × 6 brightness levels, then dots as `drawImage` of 32 px sprites.
7. Wipe (on exit), trail pups, the bat (`drawBatAt` at scale 1.3), `fx.draw`.

After restoring the camera: overlays (wipe, fade), then the HUD in CSS px.

**C. Night flight.** The main canvas only, filled opaque: sky, stars, moon light, rays and sprite, 3 tree layers (`gfx.layers`, which respects DPR), 3 fog bands, moths, pups, bat, fx, vignette, HUD.

### Offscreen caches
| Cache | Resolution | Notes |
|---|---|---|
| `L.rock`, `L.mem` | `ceil(WT·0.5) × ceil(H·0.5)`, up to 2260×750 (≈6.8 MB each) | Half a world px per texel. |
| `dotSprites` | 8 × 32×32 | Not DPR-aware. |
| BG tiles (dark and lit), `BG.fg` | 1× | Not DPR-aware. |
| `noiseTexture` | 256×256 | Fixed size. |
| `darkC` | w/4 × h/4 | Rebuilt on resize. |
| `gfx.sprite` sprites (hole, moon, fog, wipe, pips) | Current `gfx.dpr` | DPR-aware. |
| Kit glow sprite behind every `gfx.light` | 128×128 | Fixed size. |

### Device pixel ratio and resolution today
- `fit()` sets `zoom = clamp(sqrt(w·h)/600, 0.82, 1.45)` in CSS px. Above about 1,000 CSS px of geometric mean the zoom is pinned at 1.45. A 1920×1080 or 3840×2160 window therefore shows 1,324 or 2,648 world px of width: often the whole cave height. On a 4K screen the bat is about 15 CSS px across. The field of view grows with screen size, which also changes fairness: sonar covers a smaller share of the screen, and the night flight has more on screen.
- `Kit.view` caps DPR at 2. Its 3.4 MP budget then lowers DPR on big canvases (floor 1):

| Viewport | Backing store measured | Sharpness |
|---|---|---|
| 390×844 @2 | 780×1688 | full |
| 1920×1080 @2 | 2459×1383 (DPR 1.28) | 0.64 of native 4K; game-check's layout test would warn at this size |
| 3840×2160 @1 | 3840×2160 (8.3 MP, well over budget) | full but slow |

  The low layer was 234×507 on the phone and 2304×1296 at 4K.
- **Frame cadence measured** (cave 7, autopilot, 3 s, headless software raster; read the ratios, not the absolute numbers):

| Viewport | avg | p95 |
|---|---|---|
| 390×844 @2 | 18 ms | 16.8 ms |
| 1280×800 @2 | 29 ms | 33 ms |
| 1920×1080 @1 | 35 ms | 50 ms |
| 3840×2160 @1 | 102 ms | 117 ms |

### What looks blurry or breaks at 3840×2160 (or 1920×1080 at DPR 2)
1. **The rock.** It is painted at 0.5 world px per texel, blitted with nearest-neighbour into a 0.6× CSS layer, then stretched by CSS. At zoom 1.45 one texel covers about 2.9 CSS px (5.8 device px at DPR 2), so the strata and noise turn into blocky mush. The memory layer behaves the same way (2.5 px lines at RS 0.5).
2. **Everything on `#pp-low`**: sky, silhouettes, glowworms, moonlight, the dark mask and the foreground tips. That is 60% of CSS resolution at most and ignores DPR. The darkness mask is ¼ CSS resolution.
3. **Echo dots.** 32 px sprites drawn at up to 2×12.6 world px × zoom × DPR, about 2.3× upscaled at DPR 2.
4. **Lights.** The kit's fixed 128 px glow sprite is stretched up to about 870 px at 4K, which shows 8-bit gradient banding on dark backgrounds.
5. **The main canvas** is undersampled whenever `maxPixels` lowers DPR. At 4K CSS with DPR 1 it is full size but around 6× the phone's fill cost, with nothing adaptive.
6. **HUD and text** are fixed CSS px sizes (10-24 px) with no UI scale, so they are unreadable at TV distance. The pips, pup icons and night timer use hardcoded offsets (`left + 182`, etc.).
7. **The capture scenes set `hiQ = true`**, so the store art renders at higher quality than real play.
8. **Painting the cave at native 4K density is not possible as one image.** At 2 texels per world px a cave would be 9040×3000 (27 MP, about 108 MB per canvas). That exceeds iOS canvas limits and the 8192 px texture limit of many Android GPUs, so cave art must be tiled or drawn as vectors.

---

## 5. Echolocation and the memory of echoes

### `sonar(ox, oy, R, rays, kind)` (952-1004)
- If the origin is inside rock, the ring re-centres on the nearest open air (up to 48 px away). A ring `{ x, y, t0, R, kind, c }` is pushed.
- One ray is cast per angle (`cast`: 4 px steps, then bisection; water and crystal surfaces are classified; the arch returns Infinity).
- Each hit adds 2-3 echo dots, timed to appear when the ring arrives (`t0 + d / RING_SPEED`, 600 px/s). If the neighbouring ray hit the same type within 28 px, a contour line is added as well. Every hit also goes to the memory queue (`memPush`) as a line or a dot. The contour loop is closed, and the ring's slice of the memory queue is re-sorted by time (`sortMem` allocates arrays on each call).
- `pingAll` lights entities that are in range **and in line of sight** (`visibleFrom` costs one more cast each). Moths get 3 dots, pups 4 (visible for 6 s), webs a ring of dots, stalactites a dot outline, owls 5 dots, drips a column of water dots.
- A shriek also wakes owls within 560 and shakes stalactites within 380.
- Audio: 6 sampled directions each play an `echo` voice delayed by `d/600 s`, panned by `cos(angle)`, with pitch dropping by distance.

| Kind | Radius | Rays | Cooldown | Trigger |
|---|---|---|---|---|
| chirp | 420 | 200 | 0.6 s | tap |
| shriek | 840 | 320 | 3 s | hold still 950 ms, or Shift |
| crystal re-echo | 320 | 150 | none | 0.42 s after a ray hits a crystal cluster not lit in the last 1.2 s |
| crash | 230 | 90 | none | a stalactite lands (tinted red) |
| death chirp | 300 | 90 | none | the bat dies |

### Lifetimes
- Dots and lines fade over `ECHO_LIFE = 2.2 s` (`litA`).
- The ring pools are fixed: 3,600 dots, 2,600 lines. A chirp makes about 470 dots and a shriek about 750, so overlapping shrieks and crystal echoes can overwrite live dots early.
- The memory queue (8,000 entries) is drained by `memFlush` into `L.mem` as each entry's arrival time passes, up to 900 entries per frame, with no batching (one `beginPath`/`stroke` per segment). When the queue is full, new pushes are **dropped silently**.
- `L.mem` never fades within a cave. It is blitted additively at 0.55 over the darkness, so it builds into a faint map of everything heard.

### Other light sources
The bat's own warm light (`drawProximity`, about 92 px) and the dark-mask holes (bat glow, arch, rings, crystals).

---

## 6. Entities and hazards (update logic in `updateWorld`, 1496-1606)

| Entity | Data | Behaviour | Telegraph | Cost to the player |
|---|---|---|---|---|
| Moth | `{x, y, hx, hy, ang, sp, ph, lit, dead}` | Flits within 46 px of home; avoids rock and water | Gold light when lit or near | +4 energy, +1 carried (+2 when energy is full) |
| Pup | `{x, y, state: hang/trail, flip, heart, lit}` | Hangs from the ceiling; when flown through it joins `trail` and follows `hx`/`hy` history at a lag of 9 frames × index | Pink pulsing light | Multiplier is 1 + trail length at the exit |
| Web | `{x, y, r, torn, wob, lit}` | Holds the bat (speed cap 40, strong damping) until 4 wiggles or 2.6 s | Visible when lit or within 120 px; first time shows a hint | Time |
| Stalactite | `{x, y, len, w, state: hang/shake/fall/gone, fy, vy, tick}` | Shakes 0.55 s when the bat is under it (within ±48 px, up to 330 px below), ticking audibly, then falls at 1500 px/s² | Ticks, red outline, dust | −10 and a crash sonar |
| River (flood) | `{x0, x1, y, dir, speed, flood}` | Current pushes along the surface (80 px band); touching water bounces the bat up | Blue echoes, flecks | −3 per splash |
| Crystal cluster | `{x, y, r, lit, shards[]}` | Rock cells of type 3; hits tint purple and trigger a re-echo | Chime | Helpful |
| Gust | `{x, y0, y1, w, ph, period: 4.6}` | Cycle: idle 2.3 s → warning 0.8 s → blowing; `vy −= 900·dt` inside the shaft | Dust streaks, `gust` sound | Displacement |
| Owl | `{hx, hy, state: sleep/alert/swoop/back, cool}` | Woken by a shriek or by the bat within 70 px; 0.9 s alert, then swoops at 400 px/s for 1.3 s and flies home; 3.5 s cooldown | Hoot, burning eyes | −16 |
| Drip | `{x, y0, y1, period, ph, drop, glint}` | Periodic drop falling at 900 px/s² | Glint 0.45 s before it falls | −3, a small stun |

### Bat physics (constants at 83)
- `BAT_R = 8`, `ACC = 1050`, `MAXV = 255` (hard cap +140), damping 1.1 while steering and 1.9 while gliding.
- Sub-stepped movement in steps of at most 4 px. `hitsWall` takes 9 field samples; on contact the bat is pushed out along the field gradient and reflected with factor 1.45.
- A bump counts when the normal speed is over 85: it costs `1.5 + impact/110` energy and stuns for 0.3 s if impact > 150.
- Energy drains at `drainRate()` per second; a heartbeat sounds below 25.

### Input
- Relative drag stick: 5 px deadzone, full deflection at 57 px, and the origin follows the finger beyond 64 px.
- Tap (no move) chirps. Holding still shrieks at 950 ms, with a charge ring from 300 ms.
- A second finger: tap chirps, hold 500 ms shrieks.
- Keys: arrows or WASD to fly, Space/X/J to chirp, Shift/Z/K to shriek.

### Autopilot (`autoSteer`)
Follows the flow field 8 steps ahead to the farthest cell in line of sight, and detours to moths within 90 px and pups within 150 px. It is used by attract mode, the test autopilot and the capture scenes.

---

## 7. Night flight (1224-1249, 1640-1694, 2377-2432)
- `NIGHT_TIME = 15 s`. The world is screen-sized (`nh = view.h / zoom`) and auto-scrolls at 70 px/s with a constant +84 px/s push on the bat. The bat is clamped to the visible screen and between y = 110/zoom and 74% of the height.
- 10 moths at the start, then one every 0.32 s at the right edge. 12% are gold (worth 3). Each catch adds **straight to `score`** (no multiplier) and gives +0.8 energy.
- With no input the autopilot chases the nearest moth ahead.
- Music: the `stars` layer is switched on.
- The HUD shows a waning-moon timer and "+N moths".
- `endNight` → `dive` (0.7 s fade to black) → refill `min(20, 6 + 2(n−1))` → next cave.
- Because the playfield is the screen, wider screens see moths for longer. The same is true of cave field of view.

---

## 8. Audio and music
- **Effects** (`Kit.sfx.define`, 2648-2710, 23 voices): chirp, echo, shriek, crunch, squeak, tick, crack, fallwhoosh, crash, web, tear, pup, hoot, swoop, exit, splash (replaces the kit preset), drip, gust, chime, bank, nightmoth, fade, heartbeat. Kit presets also used: `select`, `thud`, `whoosh`, `click`. Spatial cues come from `pan` relative to the bat and from `delay` (the echoes).
- **Gating:** `S()` plays only in play mode, so attract mode is silent. A few calls use `Kit.sfx` directly and are guarded by `loud()`.
- **Music:** `makeSong(deep)` (2712-2730) builds two hand-made songs, both seeded with `Kit.rng(77)`, so their melodies are identical:
  - `SONG`: 70 bpm, D minor.
  - `SONG_DEEP`: 78 bpm, with the `pulse` track on.
  - Tracks: `drone` (pad), `low` (bass), `pluck`, `drips`, `pulse`, `stars` (bell, off until the night flight).
- **Selection:** `n >= 6` plays the deep song (in `enterCave` and `onStart`). The title plays `SONG`.
- **Ducking:** shriek, hurt, exit, death and game over duck the music.
- **Not used:** `Kit.music.song` styles (such as `mystery`), and any per-cave or per-biome music.

---

## 9. Saves and `Arcade.progress`
All keys are `Arcade.store` keys, which become `localStorage` `kiln:pipistrelle:<key>`, with an in-memory fallback.

| Key | Written by | Shape |
|---|---|---|
| `run` | `saveRun` at cave entry, every 5 s in a cave, on pause and on `pagehide`; cleared on death | `{ seed, cave, energy, score, pups, moths, chirps }`. Mid-cave saves keep `min(energy at entry, energy now)`, so Continue never refills. |
| `taught` | first moth eaten after the chirp tutorial step | `true` |
| `runs` | each `onStart` | count (the keyboard and touch hint shows while ≤ 3) |
| `best` | `Kit.shell.over` (`save.setBest`) and also the SDK's `runEnd` | number (moths banked) |
| `progress` | SDK, via `Arcade.progress({ label: 'Cave N' })` | `{ label, ts }`, no `pct` |

- Continue resumes **at the entrance of the saved cave**, with score and totals restored. `carried` and the trail are lost.
- The title's Play button becomes "Continue · Cave N", and an injected "New run" button appears.
- `registry.js` declares `saves: 'run'`.
- There is no profile, no currency other than score, no version field and no migration code.

---

## 10. Test hooks, scenes and `test.cjs`

**`window.__kilnTest`** exists only with `?debug`. Nothing is called `window.__pipistrelle`; the only other debug global is `window.__ppGenMs` (set under `Kit.debug`).
- **From the shell:** `start, lose, state → { phase, score, paused, frame }, pause, resume`.
- **Added by the game:**
  - Run control: `seed(n)`, `run(n)`, `cave(n)` (jumps to cave n with no fade and an early chirp), `win()` (teleports to the mouth and calls `exitCave`), `skipNight()`, `step(sec)`.
  - Actions and input: `chirp()`, `shriek()` (both reset the cooldown first), `input(dx, dy)`, `teleport(x, y)`, `give('energy' | 'moth' | 'pup')`, `energy(v)`, `drainEnergy()`, `autopilot(on)`, `safe(on)`, `xray(on)`.
  - Inspection: `info()` (mode, sub, cave, energy, score, carried, pups, position and velocity, W/H/exitY, cooldowns, live moth and pup lists, hazard counts, live echo count, bumps, `solidAtBat`, ...), `path()`, `stalList()`, `webList()`, `owlList()`, `debugNear(x, y, r)`, `wallDist(dx, dy)`, `fingerprint()`.

**Scenes** (`Arcade.scenes`, 2879-2949) all go through `sceneRun`, which forces `hiQ`, seeds fx, makes the player safe and skips the tutorial:
- `art`: seed 4, cave 5; adds a 300 px crystal chamber near the exit and re-paints the cave art, places moths, fires two chirps, zooms ×1.3 (×0.95 on tall screens).
- `shot1`: seed 3, cave 1; 150 autopilot steps, 2 moths, a chirp.
- `shot2`: seed 9, cave 5 by a river; 3 trailing pups, a stalactite placed mid-fall, 3 sonars.

**`test.cjs`** (Playwright, 390×844 at DPR 1, `?debug`) checks:
1. Boots to the title.
2. Cave 1 starts with full energy; the automatic first chirp paints more than 100 echo dots; `run_start` is logged; the run is saved at the entrance.
3. A real tap chirps; the cooldown swallows a second tap.
4. A real drag steers; releasing glides to a stop.
5. Holding about 1 s shrieks; 0.6 s does not.
6. Eating a moth.
7. Rescuing a pup.
8. A wall bump costs between 1 and 8 energy and leaves the bat in open air.
9. The exit banks carried × multiplier; `level_complete` is logged; night moths add to the score; cave 2 starts fresh; the save holds cave 2.
10. A web catches the bat and wiggling frees it.
11. Stalactites shake, then fall.
12. Owls sleep, a chirp does not wake them, a shriek does.
13. The fingerprint is deterministic.
14. Pause freezes the frame counter.
15. Running out of energy ends the run: `run_end` reports the score, the save is cleared, the best is kept.
16. Reload shows "Continue · Cave 2"; Continue resumes with the score; leaving at low energy keeps it low.
17. The autopilot clears cave 1 in 4/4 seeds.

Plus: no console errors.

**Not covered:** river current and splash, crystal re-echo, gusts, drips, owl swoop damage, keyboard play, second-finger gestures, caves past 8 (the random spec), the dive refill, tutorial progression, autopilot beyond cave 1, high DPR and frame time, visual output, save migration.

**`tools/game-check.cjs` checks:**
- Load, `Arcade.ready` within 4 s, and `game_open` with the right id.
- The first frame is not blank; a still title only warns.
- The test hook's shape; `start` logs `run_start` with phase `play`.
- About 4 s of fuzzed taps, swipes, drags and keys.
- Frame time over 3 s of play at 390×844 @2 in software raster: warn above p95 25 ms, fail above 60 ms. Phases other than title, paused and over count as play.
- `lose` logs `run_end` with a numeric score and changes the phase.
- The hub's pause message: `paused` must be true and `frame` must stop.
- Layout at 320×560, 390×844, 768×1024 and 1280×800 @2: no horizontal overflow; the biggest canvas covers at least 98% of the width and at least 90% of the area; sharpness below 0.9 (measured against `min(dpr, 2)`) warns.
- `?keyart`: no visible DOM text or controls, and no canvas text except `world: true`.
- The scenes `art`/`shot1`/`shot2` finish within 8 s with the run still alive.
- Launch inside the hub.

---

## 11. Performance hot spots
1. **`drawBg` ring relight.** For every live ring (usually 2-4), an annulus clip plus a redraw of both lit parallax layers' bands across the screen.
2. **Fill rate of the composition.** Low layer: sky, BG ×2 bands, lit BG per ring, rock blit, dark mask, memory blit, moonlight, vignette. Main canvas: a clear plus additive lights. Fill grows with CSS area × DPR²; this is why the measured frame time rises roughly 6× from phone to 4K.
3. **`sonar` CPU spikes.** A shriek is 320 rays of up to 210 steps, each a bilinear `fieldAt`, so tens of thousands of samples, plus one `visibleFrom` cast per entity, plus `sortMem` array allocation and sort. Crystal re-echoes add 150 rays each.
4. **`memFlush`.** Up to 900 unbatched stroke or fill calls per frame on `L.mem` after a shriek.
5. **`drawEcho`.** Scans all 3,600 dots and 2,600 lines every frame and draws up to about 1,500 additive sprite blits.
6. **`gfx.light` calls.** Hundreds per frame: every moth, pup, crystal shard, owl eye, drip, the bat ×3.
7. **Cave transitions.** `genCave` takes 13-128 ms and `buildCaveArt` 13-63 ms on desktop; expect several times more on a phone. It runs synchronously behind the black fade.
8. **Per-frame allocations.** `steerInput`/`autoSteer` objects, `[[90, .22], ...]` literals in `drawDark`, closures in `drawEntities`, the `for...of` over `touch.second`.
9. **Smaller items.** `drawProximity` loops over `segs` 3 times. `HUD pipPop` decays per draw rather than per update (it depends on frame rate).

---

## 12. Concrete obstacles to the expansion

**Many caves and biomes**
- Caves are an endless index `n` driven by `n >= k` thresholds in `caveSpec`. Hazard on/off flags are booleans with placement code written inline in `tryCave`, and update and draw code are hardcoded per hazard in `updateWorld`/`drawEntities`/`pingAll`. There is no hazard registry and no biome data.
- The look is global constants: `P`, `COL`, `SKY`, the rock gradient `#111a30…`, the strata colours, the `noiseTexture` colour, the BG tile colours, `bgTile` shapes, glowworms, the arch and moon. The backdrop is identical in every cave, and the cave texture is seeded by index only.
- The generator assumes horizontal progress, an exit arch on the right, the start on the left, `H ≤ 1500` and a 12 px grid. Vertical shafts, hubs, multiple exits, boss rooms or fixed hand-authored caves would need generator changes.
- `INTRO` covers only caves 1-8. There is no world map, no named caves and no level select. `__kilnTest.cave(n)` assumes index-based caves.
- Difficulty is flat after cave 13.

**Several playable bats**
- Every flight and sonar number is a top-level `const` used directly in about 40 places: `BAT_R, ACC, MAXV, EAT_R, PUP_R, E_MAX, CHIRP_R/SHRIEK_R/…_CD/…_RAYS, ECHO_LIFE`, `drainRate`, the hurt values (10/16/3) and the night clamps.
- The HUD assumes `E_MAX = 100` as 10 pips and two chirp arcs plus one shriek arc.
- The bat's look is one hand-drawn function (`drawBatAt`/`wingPath`/`drawWing`) using `P.body/belly/wing/bone`, with no parameters for silhouette, ears or wing shape, and no other abilities.

**Missions**
- There is no event bus. Outcomes happen inline (`eatMoth`, `rescuePup`, `bump`, `hurt`, `tearWeb`, `crash`, `exitCave`, `die`), and stats are partial (`mothsEaten`, `chirps`, `pupsTotal`, `bumps`). Nothing tracks time, damage taken, shrieks, owls dodged or no-bump runs.
- Field of view and the night-flight field depend on screen size, which makes missions unequal across devices.
- `G.rng` mixes cosmetic and simulation randomness, so replayable mission seeds are fragile.

**Shop, currency and a persistent profile**
- Score (banked moths) is the only number. There is no currency, no profile object, no schema version and no migration. Saves are flat keys (`run`, `taught`, `runs`, `best`).
- `Kit.shell` is a fixed DOM: a title with Play (plus one injected "New run"), a pause menu and game over. It has no hangar, map, mission or shop screens, and its `onStart` equals "begin a run".
- A full front end must keep the contract: game-check's `start()` must begin a run with phase `play`, `state().phase` must be valid, frames in any phase other than title, paused and over count as gameplay frames, the pause menu must keep Back to games, Sound and Vibration, and every menu must hide in `?keyart`.
- `Arcade.progress` labels would need a true `pct` if the campaign has a fixed length.

**4K and quality tiers**
- `Kit.view` defaults (DPR ≤ 2, 3.4 MP, floor 1) fight native 4K: 1920×1080 @2 drops to 1.28. `gfx.dpr` also starts capped at 2.
- The low layer at 0.6 CSS, rock and memory at 0.5 world px with nearest-neighbour, the ¼-resolution darkness, 1× BG tiles, 32 px dot sprites, the 128 px glow sprite and the unscaled HUD all need rework.
- Whole-cave canvases cannot simply scale up (texture limits, memory), so tiled or chunked cave art or vector edge rendering is needed.
- Nothing adapts at runtime: no quality tiers, no dynamic resolution.
- game-check keeps measuring at 390×844 @2 in software, so the phone tier must stay at or under 25 ms p95.

**Multi-file layout and the toolchain**
- `docs/GAME_CONTRACT.md` and `GAME_BUILD.md` still say "the whole game in `index.html`, inline CSS and JS", which conflicts with the computed task's statement that a game folder may hold several files.
- `tools/build-web.cjs` copies the whole folder, so the APK works.
- `sw.js` runtime-caches anything fetched, as it already does for `kit.js`.
- **`tools/bundle.cjs` (`dist/kiln.html`) breaks.** It inlines only the `sdk.js` and `kit.js` tags into iframe `srcdoc`, so a relative `<script src="js/...">` becomes a dead URL. Either extend the bundler to inline local scripts (a tools edit) or drop the single-file bundle for Pipistrelle.
- ES modules also fail when the page is opened via `file://`. Classic ordered `<script>` tags sharing one namespace (for example `window.PP`) keep every host working.
- `test.cjs` and `game-check` serve `.js` files with the right MIME type.

---

## 13. Recommended module split

Use classic scripts loaded in order, one global namespace `PP`, no build step. `index.html` keeps the markup, CSS tokens and script tags, and ends with a two-line boot. Paths are relative to `games/pipistrelle/`.

```
index.html              markup, CSS tokens, shell CSS, <script> tags in this order, PP.boot()
js/core.js              PP namespace; math/hash2/compact; separate rng streams (gen, sim, fx);
                        tiny event bus (PP.on/emit: moth, pup, bump, hurt, web, crash, exit, death, chirp, shriek...)
js/data/tuning.js       global balance tables (former consts 80-84, drain, refill, hurt values)
js/data/biomes.js       per-biome palette, rock painter params, backdrop layer defs, ambient fx,
                        song/layers, hazard pool and weights, generator params (rad, H, length, layout)
js/data/caves.js        world map: named caves (biome, seed, length, hazards, intro text, mission slots);
                        endless-mode spec (today's caveSpec generalised)
js/data/bats.js         bat roster: stats (radius, accel, maxV, energy, sonar R/rays/cooldowns, echo life,
                        drain), ability flags, look params (palette, ear/wing shape), price, unlock rule
js/data/missions.js     mission defs bound to bus events and run stats; rewards
js/gen/cave.js          tryCave steps as functions: path, branches, CA, connectivity, distance, flow, field
js/gen/hazards/*.js     one file per hazard {place(lv, r), update(dt), ping(sonar), draw(ctx), debug()};
                        registered by name so biomes can enable them (webs, stals, rivers/flood+drips,
                        crystals, gusts, owls; new ones drop in)
js/world/field.js       fieldAt, typeAt, cast, visibleFrom, collision (hitsWall/collide)
js/sim/echo.js          dot/line pools, sonar, pingAll, memory queue (batched flush, no per-ring alloc)
js/sim/bat.js           bat physics from the selected bat's stats, input mapping (stick/tap/hold/keys), autopilot
js/sim/run.js           run state machine (cave/exit/night/dive/dead), energy, scoring, currency payout, stats
js/sim/night.js         night flight with a fixed world size (independent of screen)
js/render/quality.js    tiers (Low/Med/High/Ultra) and dynamic resolution: DPR target, maxPixels,
                        low-layer scale, chunk texel density, particle and ring caps; frame-time governor
js/render/camera.js     zoom by a target visible world height, the same field of view on every device
js/render/caveArt.js    chunked cave art (world tiles painted on demand at the tier's density, LRU cache),
                        crisp vector rims from segs, chunked memory layer
js/render/backdrop.js   biome parallax via gfx.layers (DPR-aware), ambient particles, light shafts
js/render/dark.js       darkness mask (resolution from the tier)
js/render/entities.js   moths, pups, hazards' draw delegates, echo dots (DPR-aware sprites)
js/render/batArt.js     parametric bat drawing from bats.js look params (also used by the hangar preview)
js/render/hud.js        HUD with a UI scale (min-side based), mission tracker, energy driven by bat E_MAX
js/render/night.js      night sky scene
js/audio.js             sfx defs, songs per biome (Kit.music song data), adaptive layers
js/profile.js           versioned profile {v, currency, ownedBats, selectedBat, caves cleared/best,
                        missions, stats, settings}; migration from v1 keys (run/taught/runs/best);
                        Arcade.progress with true pct for the campaign
js/ui/menus.js          front end (title, world map, hangar/shop, missions, results) as DOM over the
                        canvas, coexisting with Kit.shell (pause, game over, test-hook defaults);
                        hidden in ?keyart
js/debug.js             Arcade.test hooks (keep every current name test.cjs uses; add bat(id),
                        biome(id), mission(id), currency(n), profile()) and Arcade.scenes
                        (registered before Arcade.ready)
test.cjs                kept; add tests per hazard and module, migration, shop/profile, quality tiers
```

**Order constraints:** `core` → `data/*` → `world` → `gen` → `sim` → `render` → `audio` → `profile` → `ui` → `debug` → boot. Boot creates `loop`, `input` and `shell` before anything references them, which removes today's late-binding dependencies.

**Prerequisite decisions outside `games/pipistrelle/`:**
- `tools/bundle.cjs`: inline local scripts, or exclude Pipistrelle from the single-file bundle.
- `docs/GAME_CONTRACT.md`: state that multi-file games are allowed.
- Possibly `Kit.view` options: Pipistrelle can pass `maxDpr`/`maxPixels` itself, but `gfx.dpr` starts capped at 2 in the kit.
