# Kiln (working title)

A collection of original, handmade games in one app. The hub lists the games, runs each one full screen, keeps shared settings, and records play events so we can see which games people actually play, replay and give up on.

Everything is plain HTML, CSS and JavaScript with no build step and no dependencies at runtime. It installs as a PWA and plays offline.

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
| Games | Tessera (live), Goldmend, Lariat and Crosswake (beta), Span (coming soon, card only) |
| Visual system | Kiln blueprint v2.0, section 10: dark tokens, Unbounded and Figtree, real key art for every game |
| Navigation | Home, Discover, Library and Settings tabs; Android Back follows real history |
| Home | Search in the header, featured game, category chips, Continue playing with true Resume state, an editorial collection, New on Kiln, More to explore |
| Game pages | Art, Play or Resume, quick facts, how it plays, real screenshots, your record, related games, favourites |
| Discover | Search across titles, genres, mechanics, moods and collections that forgives typos; recent searches kept on the phone with Clear; genre and keyboard filters; every collection; all games |
| Library | Favourites and recently played |
| Launch recovery | A game that does not start offers Try again and Back |
| Next | Library and history (Phase 1, item 7, blueprint section 8) |

Decisions and the roadmap are in `docs/DECISIONS.md`; the design source is `docs/blueprint/`.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The hub: home screen, game player, settings, play insights |
| `hub/sdk.js` | The SDK every game loads. The contract between hub and game |
| `hub/config.js` | Deployment settings (analytics endpoint) |
| `games/registry.js` | The games (with their page facts and search tags) and the editorial collections |
| `games/<id>/index.html` | One game, self-contained; also playable on its own |
| `docs/GAME_CONTRACT.md` | What every game must do (SDK calls, layout, theme, testing) |
| `docs/concepts/` | Design briefs for each game |
| `tools/smoke.cjs` | Headless test: hub plus every game, inside and outside the hub |
| `tools/nav-test.cjs`, `tools/home-test.cjs`, `tools/detail-test.cjs`, `tools/discover-test.cjs` | Hub tests: navigation and Back, the Home feed, game pages, Discover and search |
| `tools/bundle.cjs` | Packs hub and games into one HTML file (`dist/kiln.html`) |
| `tools/make-art.cjs` | Renders each game's card art (16:9 and 4:5) from the real game in key-art mode |
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
npm test                             # smoke, navigation, Home, game page and Discover tests
node tools/smoke.cjs --game tessera  # one game in the hub
node games/tessera/test.cjs          # one game's own rules and bot test
node tools/bundle.cjs && node tools/smoke.cjs --bundle dist/kiln.html
```

## Play data

Every launch, run start, run end (with score, reason and duration) and play-time segment is written to an event log on the device, along with what the hub shows and what gets tapped: `game_impression` (game, shelf, position), `category_select`, `game_detail_open` (with its source), `game_launch` (with its shelf), `launch_result` (success and time, or timeout), `favourite_change`, `search_submit` (what kind of thing matched, such as a title or a mood, and how many games; never the words typed) and `filter_change`. Recent searches are kept on the device only, and Discover has a Clear button for them. The **Play insights** screen compares games: play time, opens, runs, median run length, runs per open, give-up rate, days played and best score.

To compare games across all players, set `analyticsEndpoint` in `hub/config.js` to a URL that accepts POSTed JSON (`{ app, v, events: [...] }`). Events are only sent when that is set **and** the player turns on "Share anonymous play stats" in Settings. Before publishing with an endpoint, add a privacy policy and declare the data in Google Play's Data safety form.

## Adding a game

1. Read `docs/GAME_CONTRACT.md`.
2. Build `games/<id>/index.html` (see `games/tessera/` for a complete example).
3. Add it to `games/registry.js` with `status: 'beta'`.
4. Fill in its page facts in the registry (`pitch`, `about`, `controls`, `saves`) and its search tags (`mechanics`, `moods`), and call `Arcade.progress()` if it keeps a run between visits.
5. Add a key-art scene in `tools/make-art.cjs` and screenshot scenes in `tools/make-shots.cjs`, then run `node tools/make-art.cjs --game <id>` and `node tools/make-shots.cjs --game <id>`.
6. Run `npm test` until everything passes; `tools/detail-test.cjs` checks the page facts against the game's code, and `tools/discover-test.cjs` checks the moods agree with the game's collections.
