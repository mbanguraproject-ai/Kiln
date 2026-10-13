export const meta = {
  name: 'kiln-legacy-overhaul',
  description: 'Visual overhaul of the four original Kiln games: one agent per game rebuilds the look to the new standard, keeping mechanics, saves and test hooks',
  phases: [{ title: 'Overhaul', detail: 'one agent per game, end to end' }],
}
const REPO = '/home/user/Kiln'
const PORT = args.portBase || 8900
const RESULT = { type: 'object', properties: {
  summary: { type: 'string' },
  selfScores: { type: 'object', properties: { fun: { type: 'number' }, visual: { type: 'number' }, juice: { type: 'number' }, clarity: { type: 'number' }, polish: { type: 'number' } }, required: ['fun', 'visual', 'juice', 'clarity', 'polish'] },
  registryChanges: { type: 'string', description: 'any registry fact (pitch, about, controls, saves, mechanics, moods, accent) that is no longer true and its new value, or "none"' },
  verify: { type: 'string' }, issues: { type: 'array', items: { type: 'string' } },
}, required: ['summary', 'selfScores', 'registryChanges', 'verify', 'issues'] }

const KEEP = {
  tessera: 'window.__tessera must keep: seed(n), newGame(bool), skipFiring(), fits(board, shape, r, c), simulate(board, shape, r, c), placePiece(slot, r, c), N, and G with board, tray (items have .s with h and wd), score, over. Saves (kiln:tessera:* keys: best, the saved run, tutorial flags) must keep loading.',
  goldmend: 'window.__goldmend (skipTutorial, manual, warp, advance, phase) and games/goldmend/bot.js (makeBot) are used by tools and its test; keep them working. Saves (kiln:goldmend:*) must keep loading.',
  lariat: 'window.__lariat (manual, seed, newGame, trace, spawnCluster, circle, advance, size {W,H,U}, G with fuse, spark, rope) is used by its test and tools; keep it working. Saves (kiln:lariat:*) must keep loading.',
  crosswake: 'window.__crosswake must keep: manual(bool), newRun(), startPond(n), P with n and solution (items with A, B, delay), placeDelay(A, B, delay), place(A, B, delay), release(), finish(), advance(seconds), phase. The hub tests drive it. Saves (kiln:crosswake:* including the saved run and Arcade.progress) must keep loading.',
}

phase('Overhaul')
const results = await parallel(args.games.map((g, i) => () => agent(`Repo ${REPO}. Binding spec for quality and verification (read fully first): ${REPO}/docs/GAME_BUILD.md. Also read docs/KIT.md and docs/GAME_CONTRACT.md.
Your game: the EXISTING game "${g.title}" in games/${g.id}/ (its registry entry is in games/registry.js; its original brief, if any, is in docs/concepts/).${g.note ? '\n' + g.note : ''}
The owner's words about the four original games: "their visuals are weak, feel templated, not finished". Your job is a MASSIVE visual overhaul so it stands next to the new games (look at games/scrapwing, pipistrelle, tinplate-gp, napwalk, long-ball-night, night-bloom: their art-*.jpg and shot-*.jpg) as an equal: a rich, distinctive, finished world with depth, lighting, ambient motion, characterful objects, a HUD and menus in the game's own style, juice on every action, music and sound that fit.
Rules:
- Keep the core mechanics and what makes the game itself; improve feel and clarity where the playtest shows it, but do not turn it into a different game.
- It must fill the whole screen edge to edge at every size from 320x560 to 1280x800 (today it covers only part of wide screens); games in Kiln have no hub bar, so keep a visible pause button and a pause menu with Resume, How to play, Sound, Vibration and Back to games (when embedded).
- You may move it onto the kit (hub/kit.js: Kit.shell themed in the game's own style, loop, fx, audio) where that helps; register Arcade.scenes({ art, shot1, shot2 }) before Arcade.ready() and Arcade.test({...}) so that node tools/game-check.cjs --game ${g.id} passes WITHOUT --legacy (18 pass, 0 fail).
- Compatibility: ${KEEP[g.id]} Its own test.cjs must still pass (update it if you change internals, keeping its coverage).
- Touch ONLY games/${g.id}/ (and /tmp). Never edit the registry, hub, kit, SDK, tools or docs. Do not commit or touch git. Use ports ${PORT + i * 10}-${PORT + i * 10 + 9} only. Be economical with tokens.
Then be your own harsh playtester (Playwright at 390x844 DPR 2 and 1280x800, screenshots read), score fun, visual, juice, clarity, polish 1-10 honestly, fix until every score is at least 7, and finish with the spec's verification loop including make-art and make-shots (read the four images). Report any registry fact that is no longer true.`,
  { label: `overhaul:${g.id}`, phase: 'Overhaul', schema: RESULT, effort: 'high' })))
return results
