# Handoff: where the work stands and how to continue

This file is the memory of the project. A chat with an AI assistant can be lost at any time, so everything needed to
carry on lives here and in the repo, never only in a chat. **A new chat should read this file first**, then
`docs/DECISIONS.md` (D12, D13), `docs/CATALOGUE.md` and `docs/GAME_BUILD.md`.

Keep this file current: update the status table at the end of every task.

## The owner's standing instructions

1. **Current priority (12 October, D14)**: games start in Kiln, and the good ones graduate into standalone
   products in `products/<id>/` (own Android app, build, tests and CI; nothing outside its folder). First
   **Pipistrelle as a full product**: full 4K, different caves, atmosphere, missions, bats to buy with earned
   currency, and lots more (design and build plan in `docs/pipistrelle/`). Next, **Napwalk's full rollout**. Then
   the rest of the 60 catalogue games are built in Kiln, and the owner reviews each to pick the next graduates.
1. Catalogue goals (resume after Pipistrelle and Napwalk): 60 new games, 10 in each category (Action, Adventure, Racing, Puzzle, Sports, Arcade), with space and
   animal games among them, all high quality and fun; and a visual overhaul of the four existing games, which look
   templated and unfinished. The hub follows the owner's mockup; Continue playing cards have no Play button.
2. Ship in batches. Each batch gets its own pull request, which the assistant merges once its checks and the APK
   build are green.
3. **After finishing any task, give the owner the Codespace commands** to pull, merge and build (below), not only
   the download link.
4. Games are immersive: they fill the whole screen edge to edge with no hub bar, and the Android system bars hide
   while one plays. A game's own pause menu holds Back to games, Sound and Vibration.
5. Speed matters: one agent per game builds and self-tests it end to end, and the assistant does the final check
   and ships it as soon as it passes; no separate review round unless something fails.
6. **Never leave work only in the chat or its container.** Commit and push work in progress to the working branch
   (use `[skip ci]` in the message for unfinished checkpoints, so the published APK is not replaced by a broken
   build). Anything that matters (specs, plans, workflow scripts, status) goes into the repo.

## Commands for the owner (Codespace)

Get the latest `main` and build the APK:

```sh
git checkout main && git pull origin main && npm run android:apk
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. To try a branch before it is merged, put
its name in place of `main`, for example `git fetch origin && git checkout <branch> && git pull && npm run android:apk`.
Every push to `main` (or a `claude/*` branch) also publishes
[kiln-debug.apk](https://github.com/mbanguraproject-ai/Kiln/releases/download/android-preview/kiln-debug.apk).

## Status

| Work | State |
| --- | --- |
| **Pipistrelle product (D14)** | **In progress**: design run (code map, player assessment, three proposals, judges, design and build plan, critics) writing `docs/pipistrelle/` and `docs/PRODUCTS.md`; then the build of `products/pipistrelle/` follows the plan's work packages. Workflow: `.claude/workflows/pipistrelle-full-design.js` |
| Napwalk product | Next, after Pipistrelle ships |
| Foundation: mockup Home, six categories, game kit, game checker, 60-game plan | Done, merged in #10 |
| Batch 1: Scrapwing, Pipistrelle, Tinplate GP, Napwalk, Long Ball Night, Night Bloom | Done: all six shipped (#12, #14, #15 and the PR that adds the last two) |
| Visual overhaul of Tessera, Goldmend, Lariat, Crosswake | Paused (D14). Crosswake is part-rewritten on the working branch (not shippable yet); the others untouched |
| Batch 2: Riposte, Thimblekeep, Bramble Cup, Orrery, Swellrider, Sunken Bell | Paused (D14). Riposte and Thimblekeep have first drafts on the working branch, not in the registry |
| Batches 3 to 10 | Not started; line-ups in `docs/CATALOGUE.md` |

New games are built with `.claude/workflows/kiln-games-fast.js` (one agent per game, end to end; args
`{ games: [{ id, title, category }], portBase }`, with a `portBase` other runs are not using). Ship each game as soon
as it passes. The overhaul uses `.claude/workflows/kiln-legacy-overhaul.js` (args `{ games: [{ id, title, note? }],
portBase }`). After a usage-limit stop, rerun either one with a `note` telling the agent to continue from the files
already in its game folder.

**Shipping a new game while a live game is mid-overhaul**: the working branch may hold half-edited live games from
the checkpoints. Stop the checkpoint loop, then stage the live game folders back to `main`'s version without
touching the files on disk (`git restore --source=origin/main --staged games/<live-id>`), commit and push the new
game, merge when green, restart the branch from `main` and the checkpoint loop. The pull request then carries only
finished work.

Work in progress is pushed to the working branch named in the latest pull request. A game folder in
`games/<id>/` that is not yet in `games/registry.js` is unfinished: check it with `node tools/game-check.cjs --game
<id>` before continuing it.

## How a batch is built

Each game goes through four steps; `docs/GAME_BUILD.md` is the full spec every step follows.

1. **Build**: one builder writes `games/<id>/` from its brief in `docs/catalogue.json`, on the kit (`docs/KIT.md`,
   reference game `tools/kit-demo/`). It must pass `node tools/game-check.cjs --game <id>` and its own `test.cjs`,
   and generate its card art and screenshots (`tools/make-art.cjs`, `tools/make-shots.cjs`).
2. **Playtest**: an independent critic plays it and scores fun, visuals, juice, clarity and polish from 1 to 10.
   It ships only with every score at 7 or more and no blocking problem.
3. **Fix**: the builder fixes what the playtest found, when needed.
4. **Integrate**: the six games are added to `games/registry.js`, every new game passes game-check, `npm test`
   passes, and the bundle smoke test passes. Then: pull request, green APK build, merge, update this file.

With the Claude Code Workflow tool, one batch is one run of `.claude/workflows/kiln-game-batch.js`. Get its
`games` argument from the catalogue:

```sh
node -e "const n=2; console.log(JSON.stringify(require('./docs/catalogue.json').games.filter(g=>g.batch===n).map(g=>({id:g.id,title:g.title,category:g.category}))))"
```

and pass `{ games: <that list>, date: "<today, YYYY-MM-DD>" }` (plus `repo` if the checkout is not
`/home/user/Kiln`). Agents can hit a usage limit mid-run: work already written stays on disk, so checkpoint it,
then resume the run or continue the unfinished games from their folders.

## Where things are

| Path | What |
| --- | --- |
| `docs/CATALOGUE.md`, `docs/catalogue.json` | The 60 game briefs and their batch order |
| `docs/GAME_BUILD.md` | How a game is built, playtested and judged |
| `docs/KIT.md`, `hub/kit.js`, `tools/kit-demo/` | The game kit, its reference and its demo game |
| `docs/GAME_CONTRACT.md` | What every game must do for the hub |
| `tools/game-check.cjs` | The gate every new game must pass |
| `.claude/workflows/kiln-game-batch.js` | The batch workflow |
| `docs/DECISIONS.md` | Decisions, including D12 (catalogue growth) and D13 (the kit) |
