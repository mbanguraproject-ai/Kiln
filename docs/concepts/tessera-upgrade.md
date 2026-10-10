# Tessera upgrade brief

Tessera is the block puzzle already in `games/tessera/`. This brief upgrades it inside the hub.

## Honest assessment today

Short answer: right now Tessera has no differentiator a player would notice in the store. Smooth animation, good visuals and sound are the minimum players expect, not a reason to switch. Block Blast has them, reports 70M daily users and runs more than 10,000 experiments a year. We will not out-polish it.

What is table stakes in Tessera today:
- The rules are the Block Blast formula: 8x8 board, a tray of 3, no rotation, rows and columns clear, combos.
- Color Block: Combo Blast even uses the same keep-the-combo-going-within-3-moves rule.
- The juice is also table stakes: placement pop, clear preview, shards, shake, plaques, count-up score, haptics.

What is genuinely ours, but not yet a selling point:
1. The ceramic glaze identity. No major or mid-tier title is glazed ceramic or azulejo-themed. But today it is a skin, the same way Woodoku's wood is a skin.
2. Fair dealing. This is only partly true. index.html line 488 (`fair = rand() < Math.max(0.6, 1 - G.score / 7000)`) drops the all-three-fit check to 60% of trays as the score rises. In my rerun of the skeptic simulation with a reasonable bot, 12 to 15 of every 40 losses came from a tray that could not all be placed in any order. With always-checked dealing, 40 of 40 losses were the player's own placements. Block Peak already markets 'calm, fair, offline' with provably playable hands, so 'fair' cannot be the headline anyway.
3. A PWA that plays in a browser tab from a link. Useful for sharing, but invisible in a store listing.

Two more problems:
- The name 'Tessera' collides with 'Tessera: Classic Block Puzzle' on Google Play and the App Store, which also advertises zero forced ads and 100% offline, and with tessera.day.
- We have no daily mode, no progression and no music, which the leaders all have.

So the differentiator has to be built. It should come from the one asset nobody else has, the ceramic identity, and turn it from a skin into something the player gets out of every run.

## Differentiator to build: Rose Window: every run is fired into a ceramic artwork you keep (the Glaze Wall, made automatic and per-run)

Every line you clear is fired into your own glazed rose window, so every run ends as a one-of-a-kind ceramic artwork you keep and share, not an ad screen.

## How it plays

The classic rules and scoring do not change. The proven Block Blast loop stays; what changes is what a run produces.

1. Per-run palette. Each run draws 4 of the 6 glazes, and every tray uses 3 distinct glazes from those 4. The window gets a coherent colour scheme and a name such as 'Cobalt & Saffron, No. 142'.

2. Every clear becomes a wedge. Each cleared row (read left to right) or column (read top to bottom) is stored as its exact 8 glazes plus the combo level. It becomes one wedge of a three-ring rose window with 16, 32 and 64 wedges, 112 lines in all. Each wedge runs from the centre to the rim, one band per tile, drawn with the same glaze gradient and glint as the board tiles, with grout between wedges. Wedges not yet filled show as matte bisque, so a short run reads as an unfinished window, not an empty one.

3. Gold accents. A line cleared at combo x3 or higher gets a gold lustre edge. A line that happens to be all one glaze becomes a gold-leaf wedge. It is a rare collectible with no effect on the score, so chasing colour never costs survival. In my rerun of the simulation, a 4-glaze palette gives about 1 such line per run without any colour planning, against about 0.4 with all 6 glazes.

4. During play:
- A 40px medallion beside the score shows the window filling.
- When lines clear, the existing shards fly into the medallion instead of falling away, and each new wedge clicks in with a soft tick.
- Completing a ring (16, 48 or 112 lines) rings a bell and shows a 'Ring complete' plaque, which gives mid-run goals beyond the high score.
- With the reasonable bot under today's dealing, 95-100% of runs complete ring 1, about 68% complete ring 2, and 10-23% complete the whole window. The full window is an aspiration, not a given.

5. Game over becomes the firing:
- The leftover board crumbles to bisque, as it does now.
- A kiln glow comes up and the window glazes wedge by wedge in the order you cleared them, with a glint running round each ring and a bell at each ring boundary.
- A maker's-mark stamp shows score, lines, best combo and date.
- It takes about 3 seconds, a tap skips it, and 'Again' is always one tap away.
- A small 'See how your last tray fit' button replays the solver's placement as ghost tiles, which proves the loss was fair.

6. Keep and share. 'Save' renders a 1080x1350 image of the window and the stamp and shares it, falling back to a download. A 'Studio wall' hangs your last 30 windows on plaster, and your best-score window gets a cobalt frame. The Daily Firing later feeds the same wall: everyone gets the same pieces, yet every daily window looks different, which is what makes daily share images worth posting.

The moment: a triple clear sends shards up into the medallion and three wedges click in. Then the run you just lost glazes ring by ring into an object you own.

## Why this wins

How it scores on each criterion:
- Originality: none of the research found a block puzzle that turns your actual cleared lines into a generated artwork. Picture-reveal games fill in studio-drawn art however you play, and decoration metas spend coins on ready-made items.
- Storefront clarity: the first screenshot (a finished glazed rose window beside the board) is an image no competitor's store page has. Every share image is unique, and that is the only kind of reach a solo developer can afford.
- Identity fit: firing, glaze, bisque, lustre and the maker's mark give the ceramic theme a job instead of leaving it as a texture. That answers 'they have nicer visuals too': visuals can be copied, but the visuals here are generated by how you played.
- Strategic moat: Block Blast, Color Block Jam and the clones make their money at game over (revive ads, interstitials, $4.99 fail offers), so their business pushes them to make losing feel urgent and unfinished. Tessera can make game over the best-looking moment of the run, with nothing to buy. They are unlikely to copy that.
- Fun every move: honestly, it does not change the move-to-move decision. That is deliberate. The rule-changing ideas either look like boosters (Nippers), read badly (Overglaze) or risk wrecking the difficulty curve (Glaze Bonds). It does add a beat to every clear (shards into the medallion), mid-run goals (rings) and a reason to play one more run (finish the window).
- Pain points: game over stops being the ad funnel players hate; progression stops being only a number; the fairness proof answers 'rigged'; and there is finally something worth sharing.
- Feasibility: the data already exists. G.board stores the glaze per cell, and placePiece already reads `G.board[i] - 1` into `clearing[]` before zeroing each cell. It is all client-side, with no server and no art pipeline, about 5-6 days for the core.

## Risks and mitigations

1. Cosmetic-only may not stop a store browser. Lead with it visually: first screenshot, video and share card. Use store listing experiments to check it lifts installs, and keep Glaze Bonds as the rule-level follow-up if it doesn't.
2. Windows may look samey. Per-run 4-glaze palettes, gold edges and leaf, clearing order, and ring completion vary every window. Render 20 simulated runs before shipping, and add a second window form (for example a hexagonal rosette for the daily) if they blur together.
3. The firing sequence may annoy repeat players. Keep it to 3 seconds, skippable with one tap, with 'Again' always visible and a static version for reduced motion.
4. Short beginner runs make sparse windows. Bisque wedges look intentional, ring 1 is only 16 lines, and the tutorial game should be tuned to complete ring 1.
5. Storage loss would wipe the studio wall. Use storage.persist() plus a backup code, and save the share image to the device.
6. Monetization could undercut the pitch. Put no interstitials at game over and offer no paid revives. If you add income, use a one-time supporter unlock or cosmetic frames and palettes (optional rewarded ads only for cosmetics), and never sell help mid-run.
7. Fixing fairness lengthens runs: about 35-60% more lines in the simulation. Rebalance through visible shape weights and check with the bot.
8. Someone may already do run-generated art. Do the 15-minute store search first; if one exists, the ceramic firing and maker's mark are still the angle, so adjust the claim wording.
9. The name collision with 'Tessera: Classic Block Puzzle', which also advertises zero forced ads and offline play. Rename or add a distinct subtitle before launch.

## Build plan (from the research; line numbers refer to the pre-hub file and have moved)

- Day 0, before writing code: pick a distinct store name or subtitle, because 'Tessera' is taken on Google Play and the App Store and by tessera.day. Search Google Play for mosaic, stained-glass and rose-window block puzzles to confirm no one generates artwork from clears.
- Record what each clear made. In placePiece (index.html around line 862), before cells are zeroed, push one strip per cleared row (left to right) and column (top to bottom): 8 glaze indices plus the current combo. Store the strips in G.strips and add them to serialize() and restore(). An old save without the field restores with an empty list, so the save version (v: 1) can stay.
- Per-run palette. In newGame (line 934), pick G.palette as 4 of the 6 glazes with a seeded RNG. Change dealTray's colour pick (line 497, currently a shuffle of all 6) to 3 distinct glazes from G.palette. Save the palette. Write a name generator from the glaze names ('Cobalt & Saffron, No. N').
- Window renderer. Write drawWindow(ctx, strips, palette, size, upto): three rings of 16, 32 and 64 wedges, each wedge drawn as 8 bands from centre to rim using the gradient and glint from makeTile (line 579), grout strokes, bisque for unfilled wedges, a gold edge for combo x3 or higher, and gold leaf for a single-glaze line. Cache it to an offscreen canvas and redraw only when a wedge is added. Before going further, render 20 simulated runs side by side to check the windows don't look samey.
- In-game medallion. Draw a 40px window beside the score. Add a target to the shards in spawnShards (line 1065) so they fly into the medallion; on arrival, light the new wedge and play a soft tick (a short WebAudio blip in Sound). At 16, 48 and 112 lines, play the bell and show a 'Ring complete' plaque through the existing texts[] system.
- Game-over firing. Extend gameOver (line 909) and the #over overlay (line 328): kiln glow, wedges glazing in clearing order with glints and ring bells, then the maker's-mark stamp (score, lines, top combo, date). Keep it to about 3 seconds, let a tap skip it, keep 'Again' visible, and with reduced motion show a static fade.
- Fair-deal proof and fix. Replace the score ramp at line 488 with an always-check-solvable deal, and get difficulty from shape weights instead (more 5-tile and 3x3 pieces as the score rises). Use the existing headless simulation (skeptic/sim.cjs) to tune it so the median run length stays within about 15% of today and full-window completion stays around 15-25%; without retuning, always-solvable dealing pushed completion to about 40%. Give solvable() a placement result and add 'See how your last tray fit' to the end card, drawn as ghost tiles.
- Save and share. Render a 1080x1350 PNG (window, stamp, small wordmark and store name) with canvas toBlob and share it with navigator.share({files}), falling back to a download link.
- Studio wall and safety. Store the last 30 windows as strips (about 10 KB) and draw them on plaster, with a cobalt frame on the best-score window. Call navigator.storage.persist() and add an export/import backup code to the pause menu, because the wall is now something players would hate to lose.
- Accessibility. Give each glaze a distinct glyph or motif in makeTile, carried into the wedges. Colour now carries meaning in the artwork, so this is required, not optional.
- Store assets. The first screenshot is a finished window next to a mid-game board, captioned 'Every line you clear becomes part of your window'. Make a 15-second video ending on the firing sequence, and a feature graphic showing the studio wall. Use Play Console store listing experiments to test a window-first screenshot against a board-first one.
- Version 1.1, Daily Firing as the habit loop: generate a fixed 60-piece daily sequence from its own mulberry32 instance. Do not swap the global rand at line 364, because the shards and the screen shake call it. Each daily stamps a dated window, and the share card is that window plus the score, followed later by a 'beat my day' link with a ghost. Meanwhile, test Glaze Bonds behind ?rule=bonds as an optional 'Kiln' mode, tuned with the simulation bot; it would also produce more gold-leaf wedges.

## Table stakes still missing

- A steady 60fps drag with the lifted piece and forgiving snap, checked on a low-end Android phone inside the actual Play Store wrapper (a Trusted Web Activity), not just desktop Chrome.
- Placement and clear feedback at the current level (pop, preview pulse, shards, shake, plaques, count-up), with a reduced-motion path.
- A calm background music loop with its own toggle. Missing today, and every leader has it.
- A daily challenge (Blockudoku, Woodoku and Block Blast all have one). Ship the Daily Firing in v1.1.
- Some goal beyond the high score. The window rings and studio wall cover this.
- Save and resume, quick cold start and full offline play (already done; keep them).
- Colour-blind glyphs per glaze and a large-tile or one-handed-friendly layout.
- Haptics and sound toggles, light and dark themes, and pausing (already done).
- A clear ads decision before launch: no interstitials during play or at game over, and no paid revives. A one-time supporter unlock or cosmetic-only rewarded ads if you want income.
- Play Store packaging: a Trusted Web Activity with Digital Asset Links, the current target API level, the data safety form ('Data not collected' if you add no analytics), a privacy policy, 8 screenshots, a 15-30 second video, a feature graphic, and a localized short description in the top 5 languages.
- Basic quality monitoring from Play Console vitals (crashes, ANRs). Optional privacy-respecting run-length telemetry would help tune difficulty.
- A distinct name or subtitle, so the game is not confused with 'Tessera: Classic Block Puzzle' in store search.

