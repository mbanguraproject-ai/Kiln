export const meta = {
  name: 'kiln-game-batch',
  description: 'Build one catalogue batch of new Kiln games: each game built, playtested by an independent critic, fixed, then integrated into the hub',
  whenToUse: 'Building the next batch from docs/CATALOGUE.md. args: { games: [{ id, title, category }], date: "YYYY-MM-DD", repo?, basePort? } (see docs/HANDOFF.md)',
  phases: [
    { title: 'Build', detail: 'one builder per game, verified with game-check and screenshots' },
    { title: 'Playtest', detail: 'independent player/art-director critic per game' },
    { title: 'Fix', detail: 'builder fixes what the playtest found' },
    { title: 'Integrate', detail: 'registry entries, hub tests, all checks green' },
  ],
}
// The repo's own copies keep this resumable from any session: the spec is docs/GAME_BUILD.md, briefs are docs/catalogue.json.
const REPO = args.repo || '/home/user/Kiln'
const SPEC = args.spec || `${REPO}/docs/GAME_BUILD.md`
const GAMES = args.games
const BASE = args.basePort || 8900
const DATE = args.date

const BUILD = { type: 'object', properties: {
  summary: { type: 'string' },
  deviations: { type: 'string', description: 'where and why you departed from the brief' },
  registry: { type: 'object', properties: {
    id: { type: 'string' }, title: { type: 'string' }, pitch: { type: 'string' }, genre: { type: 'string' }, accent: { type: 'string' },
    about: { type: 'string' }, controls: { type: 'string' }, saves: { type: 'string' },
    mechanics: { type: 'array', items: { type: 'string' } }, moods: { type: 'array', items: { type: 'string' } } },
    required: ['id', 'title', 'pitch', 'genre', 'accent', 'about', 'controls', 'saves', 'mechanics', 'moods'] },
  verify: { type: 'string', description: 'game-check result line, test.cjs result, screenshots reviewed' },
  testHooks: { type: 'string', description: 'the Arcade.test helpers you added and what they do' },
  kitIssues: { type: 'array', items: { type: 'string' } },
  issues: { type: 'array', items: { type: 'string' } },
}, required: ['summary', 'deviations', 'registry', 'verify', 'testHooks', 'kitIssues', 'issues'] }
const REVIEW = { type: 'object', properties: {
  scores: { type: 'object', properties: { fun: { type: 'number' }, visual: { type: 'number' }, juice: { type: 'number' }, clarity: { type: 'number' }, polish: { type: 'number' } }, required: ['fun', 'visual', 'juice', 'clarity', 'polish'] },
  findings: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, title: { type: 'string' }, detail: { type: 'string' } },
    required: ['severity', 'title', 'detail'] } },
  verdict: { type: 'string', enum: ['ship', 'fix'] },
  summary: { type: 'string' },
}, required: ['scores', 'findings', 'verdict', 'summary'] }

const port = (i, k) => BASE + i * 10 + k
const COMMON = (g, i) => `Binding spec (read fully first): ${SPEC}
Your game: id "${g.id}" ("${g.title}", ${g.category}). Its brief is the entry with that id in ${REPO}/docs/catalogue.json.
Other agents are building other games in the repo at the same time: touch ONLY games/${g.id}/ (and temporary files under /tmp). Never edit the registry, hub, kit, SDK, tools or docs. Do not commit or touch git.
Use ports ${port(i, 0)}-${port(i, 4)} only (pass --port to every tool). Be economical with tokens: targeted reads, no pasting huge outputs back to yourself.`

phase('Build')
const results = await pipeline(
  GAMES,
  (g, _, i) => agent(`${COMMON(g, i)}

ROLE: BUILDER. Build the complete game in games/${g.id}/ to the spec's quality bar, then run the spec's verification loop (game-check passing, test.cjs passing, screenshots read and improved at least twice, make-art and make-shots, images read). This game must be one the owner is proud to show: rich, distinctive visuals, real fun, finished menus, music and sound, juice everywhere. Report honestly.`,
    { label: `build:${g.id}`, phase: 'Build', schema: BUILD, effort: 'high' }),
  (built, g, i) => built && agent(`${COMMON(g, i)}

ROLE: PLAYTESTER and ART DIRECTOR (independent critic). Read-only on the repo except temporary files under /tmp. Ports ${port(i, 5)}-${port(i, 9)}.
1) Read the brief and the spec's quality bar. 2) Play the game for real with Playwright at 390x844 (deviceScaleFactor 2) using touch/mouse/keys the way a player would, across several runs, and reach later content with the builder's test hooks (${built.testHooks}). Screenshot title, early play, later levels/waves, dramatic moments, pause, game over, and 1280x800; READ every screenshot. Compare against other Kiln games' art (games/*/art-tall.jpg) and the kit demo: is this distinctive and finished, or templated? 3) Run node tools/game-check.cjs --game ${g.id} --port ${port(i, 5)} and node games/${g.id}/test.cjs --port ${port(i, 6)}. 4) Read the code for bugs, unfair deaths, softlocks, missing pause handling, audio gaps, perf hot spots, and whether the registry facts the builder claims are true: ${JSON.stringify(built.registry)}.
Score fun, visual, juice, clarity, polish from 1 to 10 honestly (7 = good commercial mobile game). Verdict 'ship' only if every score >= 7 and no blocker. Findings must be concrete and actionable (what you did, what happened, what should happen).
Builder's report: ${JSON.stringify(built)}`,
    { label: `playtest:${g.id}`, phase: 'Playtest', schema: REVIEW, effort: 'high' }).then(review => ({ built, review })),
  (r, g, i) => {
    if (!r || !r.built) return null
    const rv = r.review
    const needs = !rv || rv.verdict !== 'ship' || rv.findings.some(f => f.severity !== 'minor')
    if (!needs) return { id: g.id, built: r.built, review: rv, fix: null }
    return agent(`${COMMON(g, i)}

ROLE: BUILDER, fix pass. An independent playtester reviewed your game. Fix every blocker and major finding and raise every score below 7 with concrete improvements (verify each finding first; if one is wrong say why). Apply cheap, clearly-right minor fixes too. Then rerun the full verification loop from the spec, including make-art and make-shots, and read the images.
Your build report: ${JSON.stringify(r.built)}
Playtest: ${JSON.stringify(rv)}
Return the updated registry entry (same schema as before) if any fact changed.`,
      { label: `fix:${g.id}`, phase: 'Fix', schema: BUILD, effort: 'high' })
      .then(fix => ({ id: g.id, built: r.built, review: rv, fix }))
  },
)

phase('Integrate')
const done = results.filter(Boolean).filter(r => r.built)
const entries = done.map(r => (r.fix && r.fix.registry) || r.built.registry)
log(`${done.length}/${GAMES.length} games built; integrating`)
const integration = await agent(`Repo ${REPO}. ROLE: INTEGRATOR for a batch of new games. Spec: ${SPEC}. Do not commit. Ports ${BASE + 60}-${BASE + 69} (pass --port to tools).
1) Add these games to games/registry.js (KILN_GAMES), after the existing games, in the order given, each with: id, title, pitch, genre, accent, status 'beta', path 'games/<id>/index.html', added '${DATE}', artWide, artTall, shots (shot-1/shot-2 paths), about, controls, saves, mechanics, moods. Verify each fact against the game (the detail test checks saves/controls/about/shots): ${JSON.stringify(entries)}
   Choose the featured carousel (registry 'featured: true', in order): the 3 best-looking of the new games by their art-wide.jpg (Read them) followed by the existing featured games, at most 6 in total.
   Collections must stay true: add a new game to an existing collection only if its 'why' is true of it; add at most one new collection if it is clearly true and useful (e.g. space games), with a 'why'.
2) node tools/game-check.cjs --game <id> --port ... for every new game: all must pass with no FAIL. If one fails, fix it only if the fix is small and clearly correct inside games/<id>/, otherwise report it.
3) npm test must pass. Hub tests that hard-code catalogue contents (for example discover-test search expectations or home-test counts) must be updated to the new catalogue while keeping their coverage; prefer deriving expectations from the registry over hard-coding. Do not weaken checks.
4) node tools/bundle.cjs && node tools/smoke.cjs --bundle dist/kiln.html --port ${BASE + 65}.
5) Screenshot Home at 390x844 (dpr 2) and the category tiles; Read them; fix hub problems that the new games expose (e.g. long titles, art crops).
Report each command's final result.`, { label: 'integrate', phase: 'Integrate', schema: {
  type: 'object', properties: { summary: { type: 'string' }, testResults: { type: 'string' }, featured: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'string' } } },
  required: ['summary', 'testResults', 'featured', 'remaining'] }, effort: 'high' })

return {
  games: results.map((r, i) => r ? { id: r.id || GAMES[i].id, scores: r.review && r.review.scores, verdict: r.review && r.review.verdict, fixed: !!r.fix, summary: r.built && r.built.summary, deviations: r.built && r.built.deviations, kitIssues: [].concat(r.built ? r.built.kitIssues : [], r.fix ? r.fix.kitIssues : []), issues: r.fix ? r.fix.issues : r.built && r.built.issues } : { id: GAMES[i].id, failed: true }),
  integration,
}
