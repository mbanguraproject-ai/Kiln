# Crosswake (working title)

Design brief for `games/crosswake/`. The name is a working title; it must be checked on Google Play before any store launch.

## Pitch

Drop stones in a pond: wherever two ripples cross, a spark runs across the water and lights every lantern it touches.

## How it plays (final rules, including the reviewer fixes)

Portrait pond with 6-14 paper lanterns and a stone budget.

Rings: a tap drops a stone, which sends out a ring. With the skeptic's fix, rings are SLOW, about 0.25 screen-widths per second, and fade at 0.8 W, so each ring lives about 3.2 s and a 50 ms timing error moves the curve only about 5 px. A single ring does nothing. Where two live rings cross, the crossing point carries a gold spark, and any lantern it passes lights up.

The geometry: two stones dropped together make the spark run a straight line halfway between them (the perpendicular bisector). Delaying the second stone bends that line into a curve around it (a hyperbola branch, where the difference in distance to the two stones equals v x delay). Wait too long and the rings never meet.

Aiming: press-and-hold aims, with a reticle 50 px above your thumb and a dashed preview of the spark curve against every live ring. The preview bends as the rings grow, so holding longer literally bends the line. Release to drop.

Chains: a lit lantern sends out a small ring (0.3 W). Because that ring is tangent to its parent rings, the chain spark runs straight outward from each stone through the lantern. This is a rule you can learn and the preview should show it, rather than Boomshine-style luck.

Ponds are generated BACKWARDS (the skeptic's fix): pick 2-3 hidden stone pairs and delays, place lanterns on the resulting curves and chain rays, add a few decoys, and set the budget from that known solution (+1 spare early on). Lanterns then visibly form arcs and lines, and each pond becomes 'read the constellation, find the pair'.

Scoring: 10 per lantern x chain depth, a Pair clear (the whole pond with 2 stones) +100, banked stones x50.

Obstacles over time: drifting lanterns (pond 8), rock shadows (12), red moth-lanterns that cost a stone (16), double-wick lanterns and lily pads (20).

The run ends when you have no stones left, no rings are alive, and lanterns are still unlit.

## The moment that should feel great

You hold the second stone and watch the predicted curve swing into line with a row of lanterns, then release. A bright seam zips across the water lighting lanterns one by one to a rising arpeggio, and their own rings fire rays outward that catch the last two.

## Controls (original proposal)

One thumb. A quick tap drops a stone right where you tap. Press-and-hold aims: a reticle sits 50 px above your thumb, and a dashed preview shows the near part of the spark curve against every live ring. The preview bends in real time as the existing rings grow, so holding longer is literally bending the line. Release drops the stone. An Assist toggle shows the full curve for players who want a calmer game. There is no undo, and a pause button sits in the top corner.

## Why it is ours

This is the freshest core rule of all the concepts (skeptic originality 7). I found no shipped game where the crossing point of two expanding rings is what does the work. It reads in 10 seconds ('where ripples cross, they spark') and has real depth underneath: bisector and hyperbola intuition, chain rays, multi-stone combos. The clip of two drops, two rings and a gold seam sweeping lanterns is new and calm, and it doesn't look like anything else on Play. Being a daily puzzle also gives it the best retention structure of the three.

## Closest existing games

Waves of the Imperial Garden (Playdate, itch.io): the same pond-and-stones fantasy, but a single wave is enough and there is no crossing rule. I only saw it in search results. Boomshine and Boomshine Plus: chains of expanding circles. Emitter (Global Game Jam 2017): place and time circular waves. Ripple: A Zen Wave Physics Puzzle and Skipping Stones to Lonely Homes: ripples as a force. Fractilume: Wave Lab: wave interference.

## Retention ideas (later; build the core first)

Daily Pond: the same seed for everyone, only the first attempt counts, unlimited practice afterwards. Streak calendar. A pond takes 20-40 s and a run of 10-25 ponds takes 6-10 minutes. The end-of-run share card is an ink-wash 'pond print' with gilded spark curves and lanterns drawn as red seals.

## Risks

(1) As specced, the skeptic scored fun 5. The slow-ring and backwards-generation fixes are my bet, not proven.
(2) Decisions come every 5-10 s, not every 1-2 s, so it's the weakest of the three on fun every few seconds.
(3) Casual players may lean on the preview and never learn the geometry, so it plays like 'aim the laser'.
(4) The pond generator is the game. If generated ponds lack an 'aha', it dies after about 50 ponds.
(5) Heightfield water shading may stutter on low-end WebViews; a drawn-ring fallback is required.
(6) Spark particles flicker at tangency, so derive their positions from the closed form.

## Skeptic review: fun

The rule is fresh and reads in a clip, but the spec as written breaks its own pitch. (1) THE NUMBERS MAKE IT A TWITCH GAME. Rings move at 0.9 W/s and fade at 0.8 W, so each ring lives about 0.89 s. The delay that bends the curve, and the whole 'hold the second stone and watch the curve swing into line' moment, has to happen in under a second, with one thumb, while you also aim a reticle. At that ring speed, a 50 ms timing error moves the curve by about 0.045 W, roughly 18 px on a 400 px-wide screen and about one lantern's width. That is a dexterity test, not the calm geometry puzzle described, and players will feel the result is random. (2) A hyperbola through random points rarely hits more than 2-3 lanterns, so with randomly scattered lanterns most stones feel weak and a Pair clear almost never happens. (3) With hold-to-aim, the preview does the geometry for you: wiggle until the dashed line runs through the dots. That is a common 'aim the laser' feel, and it hides the bisector and hyperbola intuition that is supposed to be the depth. (4) Chain behaviour the author seems to have missed: a lantern lit at a crossing sits exactly on both parent rings when its own ring is born. Its ring is therefore internally tangent to each parent forever, so the chain spark is a single point running along the straight ray from each stone out through the lantern, for up to 0.3 W. This is good news, because chains are a learnable rule ('lit lanterns fire sparks straight away from the stones'), not Boomshine-style luck. But the preview does not show chains, and the scoring rewards chain depth most, which is the part the player can least see. (5) Decision cadence: one real decision about every 10 s, then sub-second execution and a lot of waiting. Would players come back for a second session? Yes, the first seam is delightful. A tenth? Only if ponds are built around intended solutions, so each one feels like a puzzle with an 'aha' rather than an aim test.

## Skeptic review: feasibility

The core is cheap and deterministic. Using the closed-form test (| |LA| - |LB| - v*delay | < r, lit at t = tA + |LA|/v) is the right call, and pairwise ring checks are trivial. Pitfalls: (a) parent and chain rings are exactly tangent (see above), so if spark particles are drawn from circle-circle intersections they will flicker between 0, 1 and 2 points under floating-point error. Special-case tangency, or derive spark positions from the closed form. (b) A Monte Carlo solver over continuous space (5 parameters per pair) finds poor minimums. Budgets will be either loose, or exact but demanding pixel-and-millisecond precision when there is no spare stone. (c) A 90x160 heightfield is about 14k cells, which is fine. Blitting it every frame through putImageData plus upscaling can still stutter on low-end WebViews, so the fallback is needed. (d) Recording a replay with canvas.captureStream and MediaRecorder works in Chrome/TWA, but saving or sharing the video from a Capacitor WebView is unreliable. Make the PNG share the must-have and the video a stretch goal. (e) No backend is needed; a seeded daily works offline. The core is realistic in 3 days. The full obstacle roster plus tuning plus video share puts something genuinely good at 5-7 days.

## Skeptic fix list

1) Make it turn-based, or slow it down a lot. Either drop rings to about 0.2-0.25 W/s (3-4 s lifetimes), or better, let the player place stone A and stone B, set the delay by dragging out from B (drag length = delay, with the preview curve bending live), then tap 'Release' to run the pair deterministically. That turns the hold-to-bend fantasy into a considered move. 2) Generate ponds backwards: pick 2-4 hidden stone pairs and delays, put lanterns on the resulting curves and chain rays (plus a few decoys), and set the budget from that known solution. Lanterns then visibly form arcs and lines, and the puzzle becomes 'read the constellation and find the pair that draws it', which is the real aha. 3) Teach and preview the chain rule (radial rays from each stone through a lit lantern) so that high-scoring chains are planned. 4) Gate: a 1-day greybox with only the core rule and 10 constructed ponds. Kill the concept if testers do not voluntarily replay.

## Prototype plan

- Single file: rings as analytic circles. A lantern lights when | |LA| - |LB| - v x delay | < lantern radius and both rings are still alive when they reach it; schedule the lighting for t = tA + |LA|/v. Use a fixed timestep.
- Tap to drop, hold to aim with the reticle and the dashed live curve preview; release drops the stone.
- Chain rings from lit lanterns, with chain sparks drawn as outward rays from the closed form, not from circle intersections.
- Ten hand-built ponds that teach 'same time = straight line', 'wait = curve' and 'chains fire outward', plus a backwards generator from 2-3 hidden pairs with a known-solution budget.
- Stone budget, scoring, end-of-run state, FM bell lanterns climbing with chain depth, falling-pitch stone plop, haptic tick per lantern.
- Drawn rings on a flat gradient pond only; leave heightfield shading for later.
- Gate: do testers replay voluntarily, and do they start predicting curves before the preview finishes? If they only wiggle the preview, try the turn-based variant (place A, drag from B to set the delay, tap Release) before killing the concept.

