# Kiln (working title)

A collection of original, handmade games in one app. The hub lists the games, runs each one full screen, keeps shared settings, and records play events so we can see which games people actually play, replay and give up on.

Everything is plain HTML, CSS and JavaScript with no build step and no dependencies at runtime. It installs as a PWA and plays offline.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The hub: home screen, game player, settings, play insights |
| `hub/sdk.js` | The SDK every game loads. The contract between hub and game |
| `hub/config.js` | Deployment settings (analytics endpoint) |
| `games/registry.js` | The list of games shown in the hub |
| `games/<id>/index.html` | One game, self-contained; also playable on its own |
| `docs/GAME_CONTRACT.md` | What every game must do (SDK calls, layout, theme, testing) |
| `docs/concepts/` | Design briefs for each game |
| `tools/smoke.cjs` | Headless test: hub plus every game, inside and outside the hub |
| `tools/bundle.cjs` | Packs hub and games into one HTML file (`dist/kiln.html`) |
| `tools/make-covers.cjs` | Screenshots each game's first frame for the hub cards |
| `tools/make-icons.cjs` | Renders the app icons |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA install and offline support |

## Run it

```sh
npx http-server -p 8080 .
# open http://localhost:8080
```

Add `?debug` to expose `window.__kiln` (and each game's own debug hook) for automated tests.

## Test

The tools use Playwright (`npm i -D playwright`, or a global install on `NODE_PATH`).

```sh
node tools/smoke.cjs                 # hub + every game
node tools/smoke.cjs --game tessera  # one game
node tools/bundle.cjs && node tools/smoke.cjs --bundle dist/kiln.html
```

## Play data

Every launch, run start, run end (with score, reason and duration) and play-time segment is written to an event log on the device. The **Play insights** screen compares games: play time, opens, runs, median run length, runs per open, give-up rate, days played and best score.

To compare games across all players, set `analyticsEndpoint` in `hub/config.js` to a URL that accepts POSTed JSON (`{ app, v, events: [...] }`). Events are only sent when that is set **and** the player turns on "Share anonymous play stats" in Settings. Before publishing with an endpoint, add a privacy policy and declare the data in Google Play's Data safety form.

## Adding a game

1. Read `docs/GAME_CONTRACT.md`.
2. Build `games/<id>/index.html` (see `games/tessera/` for a complete example).
3. Add it to `games/registry.js` with `status: 'beta'`.
4. Run `node tools/smoke.cjs --game <id>` until it reports no problems, then `node tools/make-covers.cjs`.
