# Lariat (working title)

Design brief for `games/lariat/`. The name is a working title; it must be checked on Google Play before any store launch.

## Pitch

Draw loops to catch the stars, but every loop you close comes alive and keeps circling, and touching one ends your run.

## How it plays (final rules, including the reviewer fixes)

One thumb, relative drag anywhere (spark moves by thumb delta x 1.4, capped at 900 px/s). The spark trails a glowing rope covering the last 1.6 s of movement.

Capture: when the newest rope segment crosses an older one, the loop closes. The last 6 segments are ignored, and the loop must enclose at least 2,500 px squared. Every mote inside is captured (point-in-polygon), scoring count^2 x 10 x chain, and the motes pop in order around the loop as a rising pentatonic arpeggio.

Halos, with the skeptic's fixes: the closed loop becomes a HALO orb that retraces that exact loop forever, at the speed you drew it, clamped to 120-420 px/s. The orb spawns at the point on the loop farthest from you and fades in over 0.6 s, harmless while it fades. At most 5 halos exist; the oldest dissolves early. Orbs are coloured by age, and each loop's path stays on screen as a faint ring. The rope changes colour with your drawing speed, so you can see that a slower loop makes a safer halo.

Unravel: close a new loop around a halo's orb to shatter it (+50 x chain, fuse +20%). Three or more at once is a KNOT CUT bonus. The new loop still becomes a halo, so clearing the arena always costs you a new hazard.

Fuse: it drains (fully in 10 s at the start, 6 s by 90 s) and refills 12% per captured mote, so you can't sit back and play safe.

Motes: clusters of 3-7, drifting, each lasting 8 s. Later, prism motes (x3) slowly flee you. Wisps arrive from 30 s: lethal hunters that can be lassoed.

You die by touching an orb or a wisp, or when the fuse runs out. Runs last 30-90 s, with a one-tap restart.

## The moment that should feel great

One big greedy loop around a seven-mote cluster and two old halos: an arpeggio of pops, two halos shattering, and the loop pulling in to a new orb that starts tracing your exact path. The funniest moment, and the one people will share, is dying to a halo you drew 20 seconds earlier.

## Controls (original proposal)

Relative drag anywhere. The spark moves by thumb delta x 1.4, capped at 900 px/s, so your thumb is never on top of it. Lifting the thumb makes the spark coast to a stop over 0.2 s, and the rope keeps fading. There is only one verb: move. Loops close automatically. Tap the end screen to restart.

## Why it is ours

This has the strongest move-to-move decisions of any concept here (the skeptic agreed). Every capture is a choice between size, speed and the hazard it leaves behind, every 1-3 s, and since you create the difficulty yourself, no two arenas are alike. Lasso capture is known, from Trail Bind and the GMTK 2025 jam games. Ghost replays are known, from Everlapping and ReRun. I found no game where each lasso becomes a lethal patrol of its own shape and timing that you can then unravel. The originality lives in that consequence, and the store video and the first 5 seconds of the tutorial must lead with it.

## Closest existing games

Trail Bind (KAYAC, mobile): drag a trail and loop it around enemies. This is the closest commercial match for the verb; I couldn't confirm its download count. GMTK 2025 jam games include Stitch Lasso, Loop Ranger, Encircle and Tie 'Em Up!. For lethal replays of your own path: Everlapping, ReRun and Copy Run. Ancestors: Qix, Libble Rabble, Pokemon Ranger.

## Retention ideas (later; build the core first)

A daily seed fixes the mote spawns so everyone faces the same field. Personal bests are kept per mode. Challenge modes: No Unravel, Big Loops Only, One Halo Max. An end-screen knot print (Celtic-style ribbon over/under crossings, coloured by time) is saved to a gallery.

## Risks

(1) In a 2-second muted clip it reads as Trail Bind; the twist takes 3-4 seconds to land, so it has the weakest storefront clarity of the three.
(2) Drawing loops by relative drag on a small phone can feel imprecise. Budget real time for tuning gain, smoothing and minimum area.
(3) Even with the 5-halo cap, overlapping rings can get noisy.
(4) Constant circling tires the thumb.
(5) Comparable daily scores need a leaderboard backend (Play Games Services); without one, the daily is local only.

## Skeptic review: fun

This has the strongest decision structure of the three. Every capture is a real size-versus-speed-versus-future-hazard trade, made every 1-3 s. Score is count^2, so greed is rewarded, and greed is exactly what fills the arena with big, fast patrols. Unravel costs you a new halo, so cleanup is never free. Because difficulty comes from your own past choices, every run's arena is different, which is a good sign for session 10. 'Killed by the loop I drew 20 s ago' is a funny, shareable story. Real problems: (1) Spec bug that kills fun. The halo orb starts at the closure point, which is where the player is, and moves in the player's direction at the player's drawing speed. Without a spawn grace it chases you from frame one and causes cheap deaths. (2) 30 s halo lifetime with a loop every 2-3 s means 10-15 overlapping orbs on hand-drawn, self-crossing paths. Prediction then breaks down and deaths read as noise, not your own fault. (3) The fuse forces constant thumb circling, so fatigue and sloppy micro-loops on small phones are real risks. (4) In a muted 2-second clip the verb reads as Trail Bind, and the novel rule needs another beat to land.

## Skeptic review: feasibility

Feasible in 2-3 days. Rope self-intersection (O(n) per new segment against about 100 segments), polygon extraction, point-in-polygon tests and timestamped loop replay are all cheap. The arena holds at most a few dozen entities, which is fine on low-end Android if glows are pre-rendered sprites rather than shadowBlur. The edge cases are fiddly but tractable: figure-8 crossings, a loop closing through two old segments in one frame, and accidental micro-loops at low speed. Budget a day of tuning for gain, smoothing and minimum area. Two items to cut from v1: (a) MediaRecorder/captureStream WebM export. It works in Chromium WebView in principle, but sharing WebM to social apps that prefer MP4 is unreliable; this is my general knowledge, not confirmed here. (b) Comparable daily-seed scores need a leaderboard backend (Play Games Services or a small endpoint). Everything else is single-file friendly. As with Rosette, AdMob needs Capacitor plus a community AdMob plugin.

## Skeptic fix list

Spawn grace: the halo orb starts at the point on the loop farthest from the player, fades in over 0.6 s and is harmless while fading. Cap active halos at 5-6, with the oldest dissolving early, and colour orbs by age, so the arena stays readable while the 'my past self' tension stays. Clamp orb speed to a band (for example 120-420 px/s) so a frantic 0.4 s scribble doesn't leave an unreadable bullet. Lead the store video and the first 5 s of the tutorial with the halo beat, not the lasso: the loop closes, the motes pop, the ghost runs your exact path, and it later kills you. Otherwise the game reads as a Trail Bind clone. Make the knot print look designed rather than scribbled, for example ribbon rendering with over/under crossings in the style of Celtic knotwork, coloured by time. Drop WebM in v1 and ship the PNG print plus an in-app replay of the death. Optional: a 'draw slower = safer halo' indicator on the rope (its colour shifts with speed) so the size/speed trade is visible while drawing.

## Prototype plan

- Single file: canvas, relative drag, spark with coasting, rope as a 60 Hz sampled polyline of 1.6 s.
- Self-intersection: test the newest segment against older segments (skip the last 6). On a hit, extract the loop polygon, check its area is at least 2,500 px squared, and capture motes inside it.
- Mote clusters, count^2 scoring, chain, pentatonic pop arpeggio.
- Halos: store the loop's timestamped points and replay them modulo the loop duration, clamped to the speed band. Spawn at the farthest point with a 0.6 s harmless fade-in. Cap at 5, faint ring, colour by age.
- Unravel and knot cut, fuse bar, death by orb or fuse, instant restart.
- Wisps at 30 s. Juice: hit-stop on capture, shatter particles reused from Tessera, haptics.
- Gate on a phone: are players choosing loop size deliberately by run 5, and do deaths feel like their own fault? If deaths feel like noise, cut the halo lifetime before adding any features.

