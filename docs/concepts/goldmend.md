# Goldmend (working title)

Design brief for `games/goldmend/`. The name is a working title; it must be checked on Google Play before any store launch.

## Pitch

Cracks race across a glazed bowl. Trace them with your finger to fill them with gold before they reach the rim, then keep every gold-veined vessel you save.

## How it plays (final rules, including the reviewer fixes)

Portrait, one finger. A procedurally shaped vessel (bowl, cup, vase or plate in a glaze reused from Tessera) fills the middle 85% of the screen. Each vessel has a hidden fracture map of about 30 Voronoi cells.

The crack: every 3-6 s a 'tock' sounds and an impact point flashes. A hairline crack grows from it along the fracture edges at v px/s. A faint stress line shows where it will be 0.6 s ahead.

Catching it (this replaces the original rule, which had a degenerate optimum: just tap each tip the moment it appears): a crack only stops when it is gold all the way from its origin to its tip. Your stroke gilds any part of the crack it passes within 18 px of. The gold front only advances continuously from the origin, or from any point that is already gold. When your gold front reaches the moving tip, you catch it with a bell 'ting' and a firm haptic. Tapping the tip does nothing, so you are always racing the crack along its own path.

Forks: there is a 10% chance per 100 px that a crack splits. Each branch has its own tip, so you trace one, then jump back to the gold junction and chase the other. That choice is the triage decision.

Failure: if a tip reaches the rim, the fracture cell it outlines chips off and falls, with a ceramic clatter and a heavy haptic. Three chips on one vessel end the run, and the chipped vessel still goes on your shelf.

Gold leaf meter: it holds 100. Drawing off the crack costs 1 per 3 px, each catch refunds 20, and it regenerates 4 per second. This stops you scribbling over the whole vessel. Dams are cut from v1, because drawing a dam right at the origin is another degenerate strategy.

Scoring: a catch is worth 50 x seam quality x combo. Quality is the stroke's mean deviation from the true crack: 4 px or less is Fine (x3), 9 px or less is Steady (x2), anything else is Rough (x1). Combo adds +0.1 for each catch in a row without a chip. A vessel with no chips earns 'Whole' (+500). A vessel is done after 5 + n cracks: light sweeps across your seams and every ting from that vessel replays as a chord.

Difficulty by vessel:
- Vessel 1: one crack at a time, 60 px/s, no forks.
- Vessels 2-3: 75 px/s, two cracks overlapping, forks on.
- Vessels 4-6: 90 px/s, up to three cracks, plus 'crazing bursts' of 5 short, fast cracks.
- Vessel 7 onward: busy glazes that hide the hairlines, narrow vases with less distance to the rim, and cracks that speed up as they grow. Speed caps at 160 px/s.

Controls: drag anywhere on the vessel, and lift and retouch freely. Nothing to press during play. An optional pen offset draws 40 px above the fingertip.

## The moment that should feel great

A crack is about 20 px from the rim and your gold line catches its tip with a bright ting. The second best is a fork: you save one branch, swing back along your own gold, and catch the other branch just as the vessel was about to chip. At the end of each vessel, light sweeps over your seams and plays your catches back as a chord.

## Controls (original proposal)

One finger drags anywhere on the vessel. You can lift and re-touch freely, and there are no buttons during play. Portrait; the vessel fills the middle 85% of the screen, all within thumb reach. Haptics: a light tick per sealed segment, a firm pulse on a catch, a heavy thud on a chip. To keep your finger from hiding the crack, the tip has a large glow halo and the stress line runs ahead of it. An optional 'pen offset' setting draws 40 px above the fingertip.

## Why it is ours

The kintsugi theme is crowded, but every kintsugi game I found is about reassembling shards or tracing cracks that sit still. Racing a crack that grows in real time, where the gold is your own stroke, wobbles included, looks unclaimed. The 2-second clip (a crack races, a finger chases, gold floods the line, a ting at the rim) needs no sound and no text, which matters most when you can't pay for installs. It also suits your existing look and audio better than any other concept. To be honest about the limits: you can't own the theme, a hyper-casual studio could copy the verb quickly, and the name 'Goldmend' is already used by a kintsugi browser game. What you can own is the feel, the art, the daily vessel ritual and getting there first on Play. Before naming it, check these candidates on Play (all unverified): Gildline, Gold Seam, Mendwork.

## Closest existing games

'Goldmend' on tool.teamzlab.com is a browser game: throw a pot, fire it, then trace each crack with your finger to fill it with gold. It's the closest match and it takes the name. I couldn't load the page, so I can't confirm whether its cracks grow in real time; the snippet reads as static. Kinflow (Android, September 2026, about 10 installs) rotates tiles so gold flows through. Kintsukuroi (Android, 2015) is about reassembling shards. KINTSUGI: A Journey Through the Broken Pieces is on Steam (2025). The Global Game Jam 2020 'Kintsugi' was a vase-repair game against a timer. On the control side, Flight Control and Fruit Ninja are the precedents for drawing under time pressure on a phone.

## Retention ideas (later; build the core first)

Daily Vessel: the same seeded cracks for everyone, with only the first attempt counting, and a Wordle-style share line ('#212 · 9/9 caught · Fine · 0 chips') plus the vessel image. A shelf you can arrange holds every vessel you've mended, chipped ones too. Glazes (celadon, tenmoku, shino, ruri) and vessel forms unlock through skill goals such as 'catch 10 at Fine'. Zen mode (no chips, no score) for winding down. Runs last 3-7 minutes and a vessel takes about 45 s, so it fits a short wait.

## Risks

(1) The skeptic's verdict was cut off in what I received, right after 'the rules have a degenerate optim...'. I inferred the problem (tap the tip at spawn) and fixed it with the trace-from-origin rule, but test that fix first.
(2) Your finger can hide the crack tip. Use a large glow halo on the tip, the stress line, the pen offset and the 18 px tolerance.
(3) Identity clash: it's sold as cozy but plays as a reflex game. Keep the tempo and audio calm early, and keep Zen mode.
(4) It may feel samey after about 20 minutes. Variety has to come from crack behaviours and vessel shapes.
(5) Copycats.
(6) The name is taken.
(7) Handle kintsugi with respect and avoid 'zen' kitsch.

## Skeptic review: fun

The 2-second clip is real: a crack races, a finger chases it, gold fills the line, and a bell rings at the rim. Fruit Ninja and Flight Control show that drawing under time pressure works on phones. As specified, though, the rules have a degenerate optimal strategy. Rule 2 says touching the growing tip catches the crack, and a poke costs almost no gold (off-crack cost is per px drawn). It also scores 'Fine' x3, because a poke's deviation from the crack is about 0. So best play is whack-a-mole: when you hear the 'tock', jab the new tip, repeat. Chasing, gilding and dams all become optional extras, and by session 10 players will just be poking. The 0.6 s stress line is the only place for skill, and at 60-90 px/s a dam 36-54 px ahead is trivial. Because the fracture map is hidden, crack paths are random from the player's point of view, so play is pure reaction with no reading or planning. Variety (forks, bursts, camouflage glazes) only adds difficulty, not new decisions. The tone may also clash: kintsugi players expect calm, while this is a twitch game. Zen mode has no stakes, so it is a toy, not a fix. The kept vessel and the Daily Vessel share are a genuinely good retention loop if the minute-to-minute play holds up.

## Skeptic review: feasibility

This is the most buildable of the three. A Voronoi map of about 30 cells via O(n^2) half-plane clipping, random walks along its edges, point-to-segment tests and a gold meter are all trivial. Gotchas: (1) Raw Voronoi edges look like straight polygon sides, not hairline cracks, so each edge needs midpoint-displacement jitter, and hit-tests must use the jittered polyline. (2) 'The cell it outlines chips off' is under-defined, because one crack path rarely closes a cell. You need a rule such as 'chip the cell adjacent to the exit edge', and that cell must be clipped to the vessel silhouette, which is polygon clipping against a profile curve (doable, but half a day). (3) On low-end Android, cache the glazed vessel to an offscreen canvas and redraw only cracks, gold and particles each frame. Cap devicePixelRatio at 2, and avoid shadowBlur on the gold glint every frame. No backend is needed: the daily seed comes from the date, and the share card uses toBlob. A playable core in 1-2 days and a shippable loop in 3 is realistic. Tuning is the real cost.

## Skeptic fix list

1) Kill the poke. A crack can only be caught by gold that is continuous from where the crack started: you must lay a stroke along the crack and overtake the tip. Tapping the tip does nothing; it only 'pins' the crack for 0.3 s at a gold cost. The chase is then the game. 2) Make cracks visible before they move: show the impact point and its first 2-3 fracture edges glowing 1 s early. Players can then pre-route a dam or pick which crack to triage, giving one read-and-commit decision every few seconds. 3) Spawn cracks faster than one finger can chase from vessel 2 on, so letting a cheap chip go to save a 'Whole' seam elsewhere is a real choice. 4) Rename before any marketing ('Goldmend' already appears as a kintsugi game), and run a Play Store search on the new name. 5) Prototype only the chase-and-catch loop for a day, with greybox visuals. If it is not fun with ugly lines and a beep, the ceramics will not save it.

## Prototype plan

- Copy Tessera's index.html into a new file. Keep makeTile's glaze rendering, spawnShards, buzz, mulberry32, the AudioContext setup, the PWA shell and save/restore. Delete the grid, tray and line-clear logic.
- Draw one bowl: an ellipse-plus-rim silhouette with a glaze gradient and a specular highlight, fitted to 85% of the portrait screen.
- Fracture: scatter about 30 seeded sites inside the bowl and build Voronoi edges by half-plane clipping (O(n^2), so it's cheap). Store them as an edge graph. If time is short, fall back to jittered random-walk polylines from an interior point to the rim, and make the 'chip' a wedge polygon.
- Cracks: a spawn timer (3-6 s) with a tock and an impact flash. The tip walks the edge graph at v px/s with a stress-line preview 0.6 s ahead, and forks with a 10% chance per 100 px.
- Trace-to-catch: on pointer move, if the finger is within 18 px of the next crack point beyond the gold front, advance the front. Catch when the front reaches the tip. Track mean deviation for seam quality.
- Failure: when a tip reaches the rim, remove that cell as a falling polygon using shatter particles, play a filtered-noise clatter and a heavy haptic. Three chips end the run.
- Gold leaf meter, score, combo and HUD. FM bell 'ting' whose pitch rises with combo. Haptic tick per sealed segment, firm pulse per catch.
- Hard-code the vessel 1-6 difficulty table. End-of-vessel light sweep, tings replayed as a chord, then on to the next vessel. Instant restart.
- Add a ?debug hook and play on a real low-end Android phone. Gate before polishing: do people replay three or more runs without being asked, and does a catch at the rim make them react out loud? If not, move to Lariat.

