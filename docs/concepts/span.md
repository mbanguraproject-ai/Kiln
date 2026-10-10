# Span (working title)

Design brief for `games/span/`. The name is a working title; it must be checked on Google Play before any store launch.

## Pitch

Everyone gets the same canyon and the same truck today: build the cheapest bridge that gets it across, and laugh at all the ones that don't.

## Original proposal: core loop

LEVEL: a portrait canyon with road ends on the left and right cliffs, fixed anchor pins on both walls (some days a rock pillar too) and a snap grid of about 9x16. Today's vehicle (van, truck or tanker) waits on the left. Portrait suits this well: the deck spans the screen width, and the depth below leaves room for trusses and arches.

BUILD: three materials. Road: the vehicle drives on it ($$). Beam: resists push and pull ($). Cable: pull only, goes slack when compressed, cheapest. Maximum segment length is 2 grid cells. Cost updates live.

TEST: tap DRIVE. Verlet physics: joints are particles and segments are distance constraints. Each segment shows its strain from white through yellow to red and snaps past its limit. The vehicle (two wheel particles plus a chassis) drives right. PASS = it reaches the far flag. FAIL = it falls, stalls, or the deck collapses. Tests are unlimited; your cheapest passing design is your score, locked at local midnight.

SCORING: cost in $. Par = an auto-generated reference truss (Warren pattern fitted to the gap, verified to pass when the seed is chosen). Medals: Gold under par, Silver within 115%, Bronze for any pass. Side stat: peak stress % (style points for 99%).

DIFFICULTY GROWTH (weekly): Monday is a short gap with a light van. Midweek brings uneven cliffs (a ramp), fewer anchors and a heavier truck. Thursday adds a 'boat clearance' box under the deck where nothing may be built, which forces arches over the deck or cables above it. Saturday brings a tanker and a mid pillar. Sunday sends two vehicles at once, with clearance and a tight budget cap. Over the season, gaps widen and anchors thin out.

SATISFYING MOMENT: the deck sags deep red, one beam creaks at 98%, the truck crawls... and makes it, and the flag pops. Or you delete a beam, re-test, it still holds, and the cost rolls down from $1,840 to $1,620. Failure is entertainment too: beams snap with pitched cracks, the truck nose-dives, and crates tumble into the river with a splash.

## Controls

One thumb, portrait. Drag from any joint or anchor to a grid point to lay a segment of the selected material. A ghost segment shows its length and cost, and a magnifier bubble above your thumb shows the snap point. Tap a segment to select it, then tap the bin to delete it; there is also an undo button. Three material chips and the DRIVE button sit along the bottom within thumb reach. During a test, tap to switch to slow motion. After a fail, the broken segments stay highlighted for a 'fix it' second pass.

## Hook

Physical comedy on a shared daily problem. A collapse is funny and explains itself in 2 seconds, so even your failures are worth sharing, which is rare for a puzzle. It is an optimisation daily with a natural number to brag about ($1,620) on a canyon everyone fought. Bridge builders on mobile are premium campaign games, and nobody seems to own the 'one bridge a day, compare with friends' format.

## Closest existing games

Poly Bridge 1-3 (Dry Cactus; Poly Bridge 3 on mobile is free to try with a full-game unlock, leaderboards, a solution gallery and 150+ campaign levels). Bridge Constructor series (Headup). Cargo Bridge (Flash era). Bridge Builder (Chronic Logic, 2000). World of Goo (structural physics). Over Bridge (iOS). Format cousin: enclose.horse (daily optimisation with medals). I found no daily-format bridge builder. Honest verdict: the genre is well loved and proven, and the daily social wrapper is the new part. The incumbents are polished, but they are premium and campaign-driven, not F2P giants.

## Retention

Daily: one canyon, 5-15 minutes of build-and-test loops with many small wins, a streak, and an engineer rank built from medals. The weekly curve has themed days (Boat Thursday, Tanker Saturday). Endless 'Contracts' (random canyons) and a sandbox canyon editor whose levels share as links (user-made levels, no server). Async: 'beat my $1,620' links; once you pass, the friend's design loads as a ghost overlay with a replay.

Monetisation: the daily is free, with no ads while building. A one-time 'Chief Engineer' unlock (~$4.99) adds the archive, Contracts, the editor and themes. Never sell materials or stronger beams; that would be pay-to-win. An optional rewarded ad gives one hint beam from the reference design. For ads, use Capacitor.

## Skeptic review: fun

The strongest core loop of the three, and a proven one. Small decisions come every few seconds (add, delete or swap a member), there is real tension in every test (will it hold?), and failure is entertaining, which makes losing shareable. Cost optimisation on a shared daily canyon gives a natural brag number and passes the tenth-session test, since there is always a cheaper design. Weak points: building on a phone is fiddly. A 5-15 minute daily is long, so casual players will bounce after a few frustrating builds. A template Warren par will be beaten by enthusiasts within days, which leaves Gold meaningless for them.

## Skeptic review: feasibility

The hardest of the three and the most likely to blow the budget. A Verlet truss with about 100 particles x 8 substeps x 12 iterations is cheap on a low-end Android phone. The time goes to wheel-versus-thin-deck collision (tunnelling), constraint explosions with long cables, tuning break thresholds so cheap designs fail and good ones pass, and making the generated canyons solvable with a sensible par. Determinism: JS doubles with +, -, *, / and Math.sqrt are IEEE-exact, so with a fixed timestep and no trig, replays do reproduce on one engine, and design-in-link replays double as proof against fake brag scores. Physics exploits are the real threat to a cost metric: players will find glitch bridges, just as Poly Bridge players do. A touch editor with snap, magnifier and undo is a day's work by itself. Realistic: 3-4 days to good, not 2.5. Precompute a year of seeds and par offline in Node, as the plan's own fallback suggests. No backend is needed.

## REQUIRED scope cuts and fixes (these override the original proposal)

Cut scope so it is a 2-4 minute daily, not a mini Poly Bridge. (1) Pre-place the road deck. The player adds only supports (beam and cable) on a coarse 7x10 lattice with fat snap targets, which removes most touch fiddliness and the hardest physics case (custom road segments). (2) Use rolling weights or one rigid vehicle with 2 wheels at a fixed slow speed, with sub-stepped capsule collision against deck segments. (3) Guard against exploits: a minimum member length, no overlapping joints, members cannot cross anchors, and every daily is checked offline against a brute-force or genetic optimiser to set par and catch degenerate cheap solutions. (4) Lead with the comedy: the 4-second fail clip and the 'will it hold?' tension are the store video, and 'Beat my $1,620' links that replay the friend's design are the social loop. (5) Name it something the bridge giants don't own, and check Play for collisions.

