# Kiln (working title)

A collection of original, handmade games in one app. The hub lists the games, runs each one full screen, keeps shared settings, and records play events so we can see which games people actually play, replay and give up on.

Everything is plain HTML, CSS and JavaScript with no build step and no dependencies at runtime. It installs as a PWA and plays offline.

**Continuing the work in a new chat?** Read `docs/HANDOFF.md` first: status, the owner's standing instructions, and how to build the next batch of games.

## Get the latest build on your phone

One command in the Codespace (after the one-time setup under "Android app"):

```sh
git checkout main && git pull origin main && npm run android:apk
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. Every push to `main` also publishes it as
[kiln-debug.apk](https://github.com/mbanguraproject-ai/Kiln/releases/download/android-preview/kiln-debug.apk).

## What is built

| Area | Status |
| --- | --- |
| Games | Tessera (live), Goldmend, Lariat and Crosswake (beta), Span (coming soon, card only). 60 more are planned in `docs/CATALOGUE.md` |
| Categories | Action, Adventure, Racing, Puzzle, Sports, Arcade (10 games each when the catalogue is done) |
| Visual system | The owner's mockup on the blueprint's dark tokens: Unbounded and Figtree, glowing violet actions, real key art for every game |
| Navigation | Home, Library, a raised Play button (resumes your last game), Discover and Settings; Android Back follows real history |
| Home | Search and profile in the header, a swipeable featured carousel, category tiles, Continue playing (tap to resume; a progress bar only when the game reports real progress), Top picks, collections and a shelf per category |
| Game pages | Art, Play or Resume, quick facts, how it plays, real screenshots, your record, related games, favourites |
| Discover | Search across titles, genres, mechanics, moods and collections that forgives typos; recent searches kept on the phone with Clear; genre and keyboard filters; every collection; all games |
| Library | Favourites and recently played |
| Launch recovery | A game that does not start offers Try again and Back |
| Game kit | `hub/kit.js`: loop, input, synthesised sound and music, particles, camera, drawing helpers and a themeable menu shell, so each new game can look and feel finished |
| Next | Batch 1 of the catalogue (six new games), then a visual overhaul of the four existing games |

Decisions and the roadmap are in `docs/DECISIONS.md`; the design source is `docs/blueprint/`.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The hub: home screen, game player, settings, play insights |
| `hub/sdk.js` | The SDK every game loads. The contract between hub and game |
| `hub/kit.js`, `docs/KIT.md` | The game kit new games are built on, and its reference |
| `tools/kit-demo/` | Lanternwing, the kit's demo game and the reference for new games (not in the hub) |
| `hub/config.js` | Deployment settings (analytics endpoint) |
| `games/registry.js` | The categories, the games (with their page facts and search tags) and the editorial collections |
| `games/<id>/index.html` | One game, self-contained; also playable on its own |
| `docs/GAME_CONTRACT.md` | What every game must do (SDK calls, layout, theme, testing) |
| `docs/CATALOGUE.md`, `docs/catalogue.json` | The 60 planned games: full briefs and the order they are built in |
| `docs/concepts/` | Design briefs for the first games |
| `tools/game-check.cjs` | The gate every new game must pass: loads, plays, pauses, ends a run, fits every screen, clean card art, launches from the hub, frame time |
| `tools/smoke.cjs` | Headless test: hub plus every game, inside and outside the hub |
| `tools/kit-test.cjs` | Tests the game kit |
| `tools/nav-test.cjs`, `tools/home-test.cjs`, `tools/detail-test.cjs`, `tools/discover-test.cjs` | Hub tests: navigation and Back, the Home feed, game pages, Discover and search |
| `tools/bundle.cjs` | Packs hub and games into one HTML file (`dist/kiln.html`) |
| `tools/make-art.cjs` | Renders each game's card art (16:9 and 4:5) from the real game, from the scene the game registers |
| `tools/make-shots.cjs` | Renders two phone screenshots per game from the real game, with its HUD |
| `tools/make-icons.cjs` | Renders the app icons, Android launcher icons and splash screens |
| `tools/build-web.cjs` | Copies the web app into `www/` for Capacitor |
| `tools/setup-android.sh` | Installs the Android SDK in a Codespace or on Linux |
| `android/`, `capacitor.config.json`, `package.json` | The Android app (Capacitor) |
| `.github/workflows/android.yml` | Builds the APK on every push |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA install and offline support |

## Run it

```sh
npx http-server -p 8080 .
# open http://localhost:8080
```

Add `?debug` to expose `window.__kiln` (and each game's own debug hook) for automated tests.

## Android app

The hub is packaged for Android with Capacitor (`android/`, `capacitor.config.json`).

- **Automatic:** every push runs `.github/workflows/android.yml`, which builds a debug APK and attaches it to the
  `android-preview` release: `https://github.com/mbanguraproject-ai/Kiln/releases/download/android-preview/kiln-debug.apk`.
- **By hand (Codespace or Linux with Java 21 and Node 22):**

  ```sh
  bash tools/setup-android.sh && source ~/.bashrc   # once: installs the Android SDK
  npm ci
  npm run android:apk
  # -> android/app/build/outputs/apk/debug/app-debug.apk
  ```

After changing any game or the hub, `npm run android:sync` copies the web files into the Android project.

## Test

The tools use Playwright (`npm i -D playwright`, or a global install on `NODE_PATH`).

```sh
npm test                             # smoke, navigation, Home, game page, Discover and kit tests
node tools/game-check.cjs --game <id>   # the full check for one game (add --legacy for the first four)
node tools/smoke.cjs --game tessera  # one game in the hub
node games/tessera/test.cjs          # one game's own rules and bot test
node tools/bundle.cjs && node tools/smoke.cjs --bundle dist/kiln.html
```

## Play data

Every launch, run start, run end (with score, reason and duration) and play-time segment is written to an event log on the device, along with what the hub shows and what gets tapped: `game_impression` (game, shelf, position), `category_select`, `game_detail_open` (with its source), `game_launch` (with its shelf), `launch_result` (success and time, or timeout), `favourite_change`, `search_submit` (what kind of thing matched, such as a title or a mood, and how many games; never the words typed) and `filter_change`. Recent searches are kept on the device only, and Discover has a Clear button for them. The **Play insights** screen compares games: play time, opens, runs, median run length, runs per open, give-up rate, days played and best score.

To compare games across all players, set `analyticsEndpoint` in `hub/config.js` to a URL that accepts POSTed JSON (`{ app, v, events: [...] }`). Events are only sent when that is set **and** the player turns on "Share anonymous play stats" in Settings. Before publishing with an endpoint, add a privacy policy and declare the data in Google Play's Data safety form.

## Adding a game

1. Take its brief from `docs/CATALOGUE.md`, and read `docs/GAME_CONTRACT.md` and `docs/KIT.md`.
2. Build `games/<id>/index.html` on the kit (`tools/kit-demo/index.html` is the reference), with its own look.
3. Register its `art`, `shot1` and `shot2` scenes with `Arcade.scenes()` and its test hooks with `Arcade.test()`, and call `Arcade.progress()` if it keeps a run between visits.
4. Run `node tools/game-check.cjs --game <id>` until every check passes, then `node tools/make-art.cjs --game <id>` and `node tools/make-shots.cjs --game <id>`.
5. Add it to `games/registry.js` with `status: 'beta'`, its page facts (`pitch`, `about`, `controls`, `saves`) and its search tags (`mechanics`, `moods`).
6. Run `npm test` until everything passes; `tools/detail-test.cjs` checks the page facts against the game's code, and `tools/discover-test.cjs` checks the moods agree with the game's collections.
