export const meta = {
  name: 'kiln-games-fast',
  description: 'Build Kiln catalogue games fast: one agent per game builds, self-playtests and fixes it end to end',
  phases: [{ title: 'Build', detail: 'one agent per game, end to end' }],
}
const REPO = args.repo || '/home/user/Kiln'
const PORT = args.portBase || 8900
const SPEC = `${REPO}/docs/GAME_BUILD.md`
const RESULT = { type: 'object', properties: {
  summary: { type: 'string' },
  selfScores: { type: 'object', properties: { fun: { type: 'number' }, visual: { type: 'number' }, juice: { type: 'number' }, clarity: { type: 'number' }, polish: { type: 'number' } }, required: ['fun', 'visual', 'juice', 'clarity', 'polish'] },
  registry: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, pitch: { type: 'string' }, genre: { type: 'string' }, accent: { type: 'string' }, about: { type: 'string' }, controls: { type: 'string' }, saves: { type: 'string' }, mechanics: { type: 'array', items: { type: 'string' } }, moods: { type: 'array', items: { type: 'string' } } }, required: ['id', 'title', 'pitch', 'genre', 'accent', 'about', 'controls', 'saves', 'mechanics', 'moods'] },
  verify: { type: 'string' }, issues: { type: 'array', items: { type: 'string' } },
}, required: ['summary', 'selfScores', 'registry', 'verify', 'issues'] }

phase('Build')
const results = await parallel(args.games.map((g, i) => () => agent(`Binding spec (read fully first): ${SPEC}
Your game: id "${g.id}" ("${g.title}", ${g.category}). Its brief is the entry with that id in ${REPO}/docs/catalogue.json.${g.note ? '\n' + g.note : ''}
Other agents build other games at the same time: touch ONLY games/${g.id}/ (and temporary files under /tmp). Never edit the registry, hub, kit, SDK, tools or docs. Do not commit or touch git. Use ports ${PORT + i * 10}-${PORT + i * 10 + 9} only (pass --port to every tool). Be economical with tokens.
Games in Kiln now fill the whole screen edge to edge (no hub bar); your pause menu (the kit shell's) is the only way out besides Android Back, so keep a clear pause button visible during play.

You own this game END TO END, fast and to a high bar: there is no separate reviewer.
1) Build the complete game to the spec's quality bar: rich, distinctive visuals, real fun, finished menus, music and sound, juice everywhere.
2) Then be your own harsh playtester: play it with Playwright at 390x844 (deviceScaleFactor 2) as a player would (touch/mouse/keys), several runs, reach later content with your test hooks, screenshot title, early play, later levels, a dramatic moment, pause, game over and 1280x800, and READ every screenshot. Score fun, visual, juice, clarity, polish from 1 to 10 honestly (7 = good commercial mobile game). Fix whatever keeps any score below 7 and any bug you find, then play again.
3) Finish with the spec's verification loop: game-check with 0 FAIL (and ideally 0 WARN), test.cjs passing, make-art and make-shots, and read the four images.
Return your honest final self-scores and the registry entry (spec schema), true of the game as built.`,
  { label: `game:${g.id}`, phase: 'Build', schema: RESULT, effort: 'high' })))
return results
