export const meta = {
  name: 'pipistrelle-full-design',
  description: 'Design Pipistrelle as a full game: map the current game, three independent design proposals, judge panel, synthesized design and build plan, completeness critic',
  phases: [
    { title: 'Understand', detail: 'code map and player assessment of the current game' },
    { title: 'Propose', detail: 'three designers, three angles' },
    { title: 'Judge', detail: 'independent judges score every proposal' },
    { title: 'Synthesize', detail: 'design doc and build plan in docs/pipistrelle/' },
    { title: 'Critique', detail: 'completeness critic, then revision' },
  ],
}
const REPO = '/home/user/Kiln'
const OWNER = `The owner's words (verbatim): "Let me be honest Pipistrelle has the potential of being an original product high quality. The idea of trapping these high quality games like this is wrong. Stop, let's rethink this. Pipistrelle needs the full suite, that's all: Full 4K, different caves, atmosphere, missions, different bats you can purchase and lots more."`
const CONTEXT = `${OWNER}
Project context: Kiln is a mobile game app (plain HTML/CSS/JS, no build step, Capacitor 8 Android WebView, offline, PWA). Games live in games/<id>/ and talk to the hub through hub/sdk.js (window.Arcade: init/ready/runStart/runEnd/progress/scenes/test/store/haptic/exit/settings); many use the kit hub/kit.js (docs/KIT.md). The contract is docs/GAME_CONTRACT.md; the quality bar and verification loop are docs/GAME_BUILD.md; every game must pass node tools/game-check.cjs --game <id>. A game folder may hold several files (index.html plus .js modules); tools/build-web.cjs copies the whole folder into the APK. Games fill the whole screen edge to edge (no hub bar); the game's own pause menu holds Back to games, Sound and Vibration.
Pipistrelle today: games/pipistrelle/index.html (one 158 KB file, on the kit), games/pipistrelle/test.cjs, registry entry in games/registry.js. A bat flies through pitch-black seeded caves; tapping chirps a sonar ring that paints the walls in fading echoes; moths are energy; rescued pups multiply banked moths at the exit; a night flight between caves; each new cave adds a hazard (webs, falling stalactites, rivers, crystal chambers, gusts, owls, drips).
Decisions already made (do not reopen): purchases use in-game currency earned by playing, never real money, no ads, no dark patterns, no energy timers; Pipistrelle stays playable inside Kiln (same folder, same SDK contract, existing saves keep loading or migrate) but is built as a complete, standalone-quality product with its own title screen, menus and progression, so it could later ship as its own app; "Full 4K" means it must look crisp and rich when rendered at native resolution up to 3840x2160 (and on phones at full device pixel ratio), with quality tiers or dynamic resolution so phones still hold a smooth frame rate.`

const PRODUCT = `OVERRIDING DECISION from the owner, made after the proposals were written (it replaces the earlier "stays playable inside Kiln, same folder" decision): "Pipistrelle should be its own sub repo in Kiln. It's a roll out. Picture this: all high quality original games in Kiln [start there]; the good ones become standalone products in the Kiln repo. After we have pushed Pipistrelle, the next is Napwalk's full rollout."
So the full Pipistrelle is a STANDALONE PRODUCT living in its own self-contained folder of the Kiln repo: ${REPO}/products/pipistrelle/. It has its own Android app (its own Capacitor project: package.json, capacitor.config.json with appId com.mbanguraproject.pipistrelle and appName Pipistrelle, its own android/ project, icon and splash), its own web root, build scripts, tests, README, and its own CI workflow (.github/workflows/pipistrelle.yml, path-filtered to products/pipistrelle/**) that builds its APK and publishes it to a GitHub release tag pipistrelle-preview as pipistrelle-debug.apk, the way .github/workflows/android.yml does for Kiln. It must not depend on files outside its folder at runtime or build time, so it could be split into its own git repository later (git subtree split) without changes: anything it reuses from Kiln (hub/kit.js, parts of hub/sdk.js, tools such as game-check or make-art) is copied into the product folder, which then owns and adapts it. It does not need the Kiln hub's Arcade contract; it needs its own equivalents (settings, pause, haptics, Android Back handling, immersive full screen with hidden system bars, its own save storage, debug/test hooks for its headless tests and screenshot tooling). The current games/pipistrelle/ in the Kiln hub stays exactly as it is (the pilot that proved the idea); saves do not migrate between apps, so no save migration from kiln:pipistrelle:* is needed, but the product needs its own save versioning and migration for its own future updates. Napwalk will follow the same pattern later (products/napwalk/), so put anything generic about the product layout in a short ${REPO}/docs/PRODUCTS.md as well.`

const MAP_SCHEMA = { type: 'object', properties: { report: { type: 'string', description: 'the full markdown report' } }, required: ['report'] }

phase('Understand')
const [codeMap, playerMap] = await parallel([
  () => agent(`${CONTEXT}

Your job: a precise technical map of the current Pipistrelle so designers and builders can plan a large expansion. Read games/pipistrelle/index.html fully, games/pipistrelle/test.cjs, hub/kit.js's API (docs/KIT.md), hub/sdk.js, docs/GAME_CONTRACT.md, docs/GAME_BUILD.md and tools/game-check.cjs (what it checks).
Report, in markdown: architecture and module boundaries (with line ranges), the game state model, cave generation (seeding, specs, hazards per cave index), the rendering pipeline (canvases/layers, how it handles device pixel ratio and resolution today, offscreen caches, what would look blurry or break at 3840x2160), echolocation and memory-of-echoes system, entities and hazards, the night flight, audio and music (Kit.music songs/layers, sfx), saves and Arcade.progress, test hooks (window.__pipistrelle or similar, Arcade.test, scenes), what test.cjs covers, performance hot spots, and the concrete obstacles to adding many caves/biomes, several playable bats with different stats and looks, missions, a shop and a persistent profile. End with a recommended file/module split for a multi-file version. Do not edit any file.`,
    { label: 'map:code', phase: 'Understand', schema: MAP_SCHEMA, effort: 'high' }),
  () => agent(`${CONTEXT}

Your job: play the current Pipistrelle as a demanding player and art director, and report honestly. Serve the repo (e.g. a tiny node static server on port 8990-8999 only) and open games/pipistrelle/index.html?debug with Playwright (Chromium is pre-installed; PLAYWRIGHT_BROWSERS_PATH is set; NODE_PATH may need /opt/node22/lib/node_modules). Play several runs at 390x844 with deviceScaleFactor 3, at 1280x800, and at 3840x2160 (deviceScaleFactor 1), using touch/keys like a player, and use its debug/test hooks to reach later caves and every hazard. Take screenshots of the title, early cave, later caves, each hazard, the night flight, pause, game over, and the 4K views; READ every screenshot. Measure frame times at each size.
Report, in markdown: what is genuinely great and must be kept (the soul of the game), what feels thin, templated or unfinished, how it looks at 4K (crisp? blurry? empty? too small?), performance at each size, how the caves differ (or fail to), the pacing and difficulty, the meta loop (is there a reason to come back?), and a ranked list of the 15 biggest gaps between this and a premium, original, standalone mobile game. Write screenshots under /tmp only. Do not edit any file in the repo.`,
    { label: 'map:player', phase: 'Understand', schema: MAP_SCHEMA, effort: 'high' }),
])
const MAPS = `Technical map of the current game:\n${codeMap ? codeMap.report : '(missing)'}\n\nPlayer and art-direction assessment of the current game:\n${playerMap ? playerMap.report : '(missing)'}`

const PROPOSAL_SCHEMA = { type: 'object', properties: { title: { type: 'string' }, proposal: { type: 'string', description: 'the full design proposal in markdown' } }, required: ['title', 'proposal'] }
const ANGLES = [
  { key: 'world', brief: 'WORLD AND ATMOSPHERE FIRST. Design the caves as distinct, unforgettable places: biomes with their own art direction, light, colour, ambient life, weather, sound and music, lore, and the hazards and secrets that belong to each. Define exactly what "full 4K" means for the art: layered parallax, lighting, particles, detail that rewards a big screen, and how it scales down to a phone.' },
  { key: 'progression', brief: 'PROGRESSION AND ECONOMY FIRST. Design the bats you can buy (species, looks, stats, abilities that genuinely change how you play, not just numbers), the currencies and how they are earned, the shop, upgrades, cosmetics, the world map and unlock order, and the reasons a player comes back tomorrow, while staying fair: earned currency only, no real money, no ads, no timers, nothing that feels like a dark pattern.' },
  { key: 'missions', brief: 'GAMEPLAY DEPTH AND MISSIONS FIRST. Design how the core echolocation flight deepens over a long game: mission types per cave (rescue, survey, chase, stealth past owls, timed escapes, collection, no-chirp challenges, boss encounters), set pieces, events, a story spine, mastery goals and stars, difficulty curve, and how each purchasable bat\'s ability opens new ways to complete missions.' },
]

phase('Propose')
const proposals = await parallel(ANGLES.map(a => () => agent(`${CONTEXT}

${MAPS}

You are a senior game designer. Write a complete design proposal for Pipistrelle as a full game. Your angle: ${a.brief}
Still cover the whole game (caves, atmosphere, missions, purchasable bats, progression, meta, menus and screens, audio, 4K art direction, onboarding), but go deepest on your angle. Keep the soul of the current game (sonar painting the dark, the bat's feel, rescue of pups) and build on what exists rather than replacing it. Be concrete: names, numbers, lists, mission examples, prices and earn rates, cave-by-cave tables, bat-by-bat tables, screen list. Be original: avoid generic mobile-game tropes. Be realistic about a canvas/JavaScript game in an Android WebView built by a small team of AI agents in days, not months: say what is in version 1 and what comes later. You may read files in ${REPO} for reference; do not edit any file.`,
  { label: `propose:${a.key}`, phase: 'Propose', schema: PROPOSAL_SCHEMA, effort: 'high' })))
const props = proposals.map((p, i) => p ? { key: ANGLES[i].key, ...p } : null).filter(Boolean)
log(`${props.length} proposals in`)
const ALL_PROPS = props.map((p, i) => `=== Proposal ${String.fromCharCode(65 + i)} (${p.key}): ${p.title} ===\n${p.proposal}`).join('\n\n')

const JUDGE_SCHEMA = { type: 'object', properties: {
  scores: { type: 'array', items: { type: 'object', properties: { proposal: { type: 'string' }, fun: { type: 'number' }, originality: { type: 'number' }, atmosphere: { type: 'number' }, progression: { type: 'number' }, fairness: { type: 'number' }, feasibility: { type: 'number' }, notes: { type: 'string' } }, required: ['proposal', 'fun', 'originality', 'atmosphere', 'progression', 'fairness', 'feasibility', 'notes'] } },
  bestIdeas: { type: 'array', items: { type: 'string' }, description: 'the specific ideas from any proposal that must be in the final design, each with its proposal letter' },
  cut: { type: 'array', items: { type: 'string' }, description: 'ideas that should be cut or deferred, and why' },
  risks: { type: 'array', items: { type: 'string' } },
}, required: ['scores', 'bestIdeas', 'cut', 'risks'] }
const LENSES = [
  'a player who loves premium mobile games (Alto, Monument Valley, Sky, Hollow Knight) and hates filler and grind',
  'a lead engineer who must ship this in an Android WebView with canvas/JavaScript, at a smooth frame rate on a mid-range phone and crisp at 4K, built by AI agents working in parallel',
  'a game director guarding the soul of the original (sonar painting the dark) and the owner\'s request: full 4K, different caves, atmosphere, missions, bats to buy, and lots more',
]

phase('Judge')
const verdicts = (await parallel(LENSES.map((lens, i) => () => agent(`${CONTEXT}

${MAPS}

${ALL_PROPS}

You are an independent judge with this lens: ${lens}. Score each proposal from 1 to 10 on fun, originality, atmosphere, progression, fairness (no dark patterns, earned currency only) and feasibility, with notes. Then list the best specific ideas across all proposals that must be in the final design, what to cut or defer, and the main risks. Be critical and specific. Do not edit any file.`,
  { label: `judge:${i + 1}`, phase: 'Judge', schema: JUDGE_SCHEMA, effort: 'high' })))).filter(Boolean)
const VERDICTS = verdicts.map((v, i) => `=== Judge ${i + 1} (${LENSES[i]}) ===\n${JSON.stringify(v, null, 1)}`).join('\n\n')

const SYN_SCHEMA = { type: 'object', properties: { summary: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, workPackages: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, owns: { type: 'array', items: { type: 'string' } }, dependsOn: { type: 'array', items: { type: 'string' } } }, required: ['id', 'title', 'owns', 'dependsOn'] } } }, required: ['summary', 'files', 'workPackages'] }

phase('Synthesize')
const syn = await agent(`${CONTEXT}

${MAPS}

${ALL_PROPS}

${VERDICTS}

${PRODUCT}

You are the game director and lead architect. Write the final design for Pipistrelle as a full game, taking the best of the proposals as the judges weighed them, cutting what they cut, and resolving every contradiction. Write two files (create the folder):

1. ${REPO}/docs/pipistrelle/DESIGN.md: the game design document. Vision and pillars; the core loop and the long loop; every cave/biome (version 1 set) with its art direction, palette, light, ambient life, sound/music, hazards, secrets and missions; the mission system and every mission type with examples; the bats (version 1 roster) with looks, stats, abilities, prices and unlock rules; currencies, earn rates and a sanity check of the economy (how many runs to buy each bat); upgrades and cosmetics if any; the world map and progression order; story/lore spine; every screen and menu (title, world map, hangar/shop, mission briefing, run HUD, pause, results, settings, collection/achievements); onboarding; audio; the 4K art direction and quality tiers; accessibility; what is in version 1 and what is deferred. Concrete numbers and names throughout. Plain British English.

2. ${REPO}/docs/pipistrelle/BUILD_PLAN.md: the technical plan for agents building it in parallel. The layout of the product folder products/pipistrelle/ (web root with index.html plus modules as plain classic scripts sharing one namespace, no bundler; its Capacitor/Android project; build and test scripts; CI workflow), each module's responsibility and public interface; data schemas for caves, bats, missions, the profile/save (with its own save versioning); the renderer plan for crisp native resolution up to 3840x2160 with quality tiers / dynamic resolution and a frame budget; the scene/screen manager; the product's own platform layer (settings, pause, haptics, Android Back, immersive full screen, storage) and debug/test hooks; the Android packaging and CI that publishes pipistrelle-debug.apk; a test plan (headless tests that verify economy, missions, saves, every cave loads and is completable by a bot, frame-time budgets, plus its own copies of whatever Kiln tools it adapts, such as a game-check and screenshot/art tooling); and WORK PACKAGES: a foundation package first (product scaffold and Android project, architecture, renderer, scene manager, profile/save, data loading, the existing gameplay ported from games/pipistrelle/index.html without touching that file), then packages that can run IN PARALLEL with strictly disjoint file ownership (for example one per cave/biome, bats and hangar, missions and world map, menus/UI, audio/music), then an integration and polish package. For each package: files it owns, files it may read, dependencies, acceptance criteria that can be checked.

Also write ${REPO}/docs/PRODUCTS.md (short: what a Kiln product is, its folder layout, how it is built, tested and released, so Napwalk can follow). Read the current code where you need detail. Do not edit anything outside docs/pipistrelle/ and docs/PRODUCTS.md. Return a summary, the files written, and the work packages.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYN_SCHEMA, effort: 'xhigh' })

const CRIT_SCHEMA = { type: 'object', properties: { blocking: { type: 'array', items: { type: 'string' } }, improvements: { type: 'array', items: { type: 'string' } } }, required: ['blocking', 'improvements'] }

phase('Critique')
const critics = (await parallel([
  'COMPLETENESS AND FUN: what is missing for this to be a premium, original, complete game the owner will be proud of (the owner asked for full 4K, different caves, atmosphere, missions, bats to buy and lots more)? Is the economy fair and is every bat worth buying? Is anything generic, grindy or dull? Is every screen specified?',
  'BUILDABILITY: can agents build this from BUILD_PLAN.md in parallel without colliding? Are file ownerships disjoint, interfaces precise, data schemas complete, the save migration safe, the renderer plan realistic for 60 fps on a mid-range phone and crisp at 3840x2160, Kiln\'s contract and game-check kept, the tests sufficient? Find contradictions between DESIGN.md and BUILD_PLAN.md.',
].map((lens, i) => () => agent(`${CONTEXT}

${PRODUCT}

Read ${REPO}/docs/pipistrelle/DESIGN.md, ${REPO}/docs/pipistrelle/BUILD_PLAN.md and ${REPO}/docs/PRODUCTS.md (and the current game where needed). You are an adversarial reviewer. Check too that the plan really makes a self-contained standalone product as decided. Lens: ${lens}
List blocking problems (must fix before building) and improvements. Be specific: section, problem, fix. Do not edit any file.`,
  { label: `critic:${i + 1}`, phase: 'Critique', schema: CRIT_SCHEMA, effort: 'high' })))).filter(Boolean)

const revised = await agent(`${CONTEXT}

${PRODUCT}

You wrote ${REPO}/docs/pipistrelle/DESIGN.md, ${REPO}/docs/pipistrelle/BUILD_PLAN.md and ${REPO}/docs/PRODUCTS.md. Two adversarial reviewers found these problems:
${JSON.stringify(critics, null, 1)}

Fix every blocking problem and every improvement you agree with, directly in those files (keep them coherent with each other). For any you reject, add a short "Review notes" section at the end of BUILD_PLAN.md saying what and why. Do not edit anything outside docs/pipistrelle/ and docs/PRODUCTS.md. Return a summary, the files, and the final work packages.`,
  { label: 'revise', phase: 'Critique', schema: SYN_SCHEMA, effort: 'xhigh' })

return { codeMap: codeMap && codeMap.report, playerMap: playerMap && playerMap.report, proposals: props.map(p => p.title), verdicts, critics, final: revised || syn }
