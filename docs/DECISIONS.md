# Kiln decisions (blueprint Phase 0)

The blueprint (`docs/blueprint/Kiln_Proprietary_High_End_UI_UX_Blueprint.pdf`, v2.0) asks for these decisions to be written down before design and production. Each one records what was decided, why, and what would make us revisit it.

Status: **decided 10 October 2026** unless marked *open*.

## Product rule

Kiln is single-owner and curated. Every game is owner-developed, commissioned under contract, or explicitly licensed. There is no public submission portal, developer account system, creator marketplace or "publish with us" flow, and none will be built unless the product direction explicitly changes.

## D1. Hub technology: web hub inside the Android app

The hub (home, discover, library, detail, settings) stays a web app running in Capacitor's WebView, rather than a native Kotlin + Jetpack Compose rebuild (blueprint §13).

- Why: one codebase for the Android app and the web, fast iteration, and the games are web games already.
- The blueprint's layering still applies inside the web code: UI, screen state, use cases (search, filter, favourite, launch, continue), data (catalogue metadata kept separate from player history and preferences), runtime adapter (the game iframe and `hub/sdk.js`), observability.
- Revisit if, on the reference low-end device, cold start p95 exceeds 2.5 s, scrolling falls below 60 fps, or WebView input latency makes a game feel worse than in Chrome.

## D2. Game delivery: embedded web games bundled in the APK

Each game is a self-contained page (`games/<id>/index.html`) that follows `docs/GAME_CONTRACT.md`, ships inside the APK and plays offline. Games update with app releases.

- No separate installs, no downloads at play time, no code from outside the app.
- A game runs in an iframe and talks to the hub only through `hub/sdk.js`.

## D3. Catalogue and rights

| Game | Source | State |
| --- | --- | --- |
| Tessera | Owner-developed (this repo) | Live |
| Goldmend | Owner-developed (this repo) | Beta |
| Lariat | Owner-developed (this repo) | Beta |
| Crosswake | Owner-developed (this repo) | Beta |
| Span | Owner-developed (planned) | In development, card hidden until playable |

All code, art (drawn in code) and sound (synthesised) are original. *Open:* the names are working titles. "Tessera" and "Goldmend" are already used by other games; every store-facing name must be cleared before a public listing.

## D4. Android support

- Minimum: **Android 8.0 (API 26)**. Target and compile: API 36.
- Reference devices: the owner's phone (*open: record its model and Android version here*) and one low-end device or emulator (2–3 GB RAM, Android 8–10).
- The games depend on the Android System WebView, which Google Play keeps updated on Android 8 and later.

## D5. Accounts: none in v1

No sign-in at launch. Progress is saved on the device. Settings and game details say plainly that uninstalling or clearing the app's data removes progress. Revisit when cloud saves or cross-device play would give players a real benefit.

## D6. Monetization: postponed for v1

The first public version has no ads, no in-app purchases and no paid placement. The AdMob publisher ID (`app-ads.txt`) is kept for later. When monetization is added, it will be one understandable model at a time, following blueprint §17.

## D7. Art direction for cards, screenshots and trailers

- Card art and screenshots are real captures of the shipped game (`tools/make-covers.cjs`), never mock scenes.
- Each card family gets a fixed aspect ratio and a crop-safe focal area; titles sit in a controlled text zone, not over busy art.
- Nothing pre-release is shown as playable.

## D8. Release-ready thresholds

Targets from blueprint §14, measured on the reference devices: cold start p95 ≤ 2.5 s, warm start p95 ≤ 1.2 s, 60 fps scrolling, crash-free sessions ≥ 99.5 %, every launch failure offers a next step. These are targets to validate, not guarantees.

## D9. Analytics and privacy

- Events are logged on the device. They leave the device only when an endpoint is configured in `hub/config.js` **and** the player turns on "Share anonymous play stats".
- North-star metric: weekly players who launch a game successfully and return to play again.
- Event names follow blueprint §16 as features land: `home_view`, `game_impression`, `game_detail_open`, `play_tap`, `launch_result`, `favourite_change`, `search_submit`, `session_end`, `report_issue`.
- No contacts, precise location, keystrokes or other sensitive data. *Open:* privacy policy URL and the "report a problem" contact address, both needed before the Play listing.

## D10. Visual system

The hub adopts the blueprint's dark foundation (§10): background `#07101E`, surface `#101C31`, raised `#192841`, primary violet `#6557FF`, secondary cyan `#45C4D7`, reward gold `#F0C75E` for rare highlights only, text `#F5F7FC` and `#AAB8CC`, radii 12 / 18 / 26, spacing 4 / 8 / 12 / 16 / 24 / 32. One display family and one body family. Game art supplies most of the colour; the games keep their own look.

## Open items

- App name and package ID. `com.mbanguraproject.kiln` is a placeholder and becomes permanent on the first Play upload.
- Store-safe names for each game (see D3).
- The owner's reference phone (D4), privacy policy URL and support contact (D9).

## Roadmap status (blueprint §18)

| Phase | State |
| --- | --- |
| 0. Decisions | Done (this document) |
| 1. Design foundation: tokens, navigation, card families, home, detail, discover and library | In progress: visual system done |
| 2. Vertical slice: discover → detail → launch → return → history | Not started |
| 3. Catalogue foundation: metadata, categories, favourites, search, image pipeline | Not started |
| 4. Private beta | Not started |
| 5. Public release | Not started |
| 6. Retention polish | Not started |
