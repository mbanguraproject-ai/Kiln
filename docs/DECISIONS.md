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
| 60 new games (`docs/CATALOGUE.md`) | Owner-developed (planned) | Built in batches of six, one per category |

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
- No contacts, precise location, keystrokes or other sensitive data. `search_submit` records what kind of thing matched (title, genre, mood...) and how many games did, never the words typed. Recent searches stay on the device, and Discover can erase them.
- *Open:* privacy policy URL and the "report a problem" contact address, both needed before the Play listing.

## D10. Visual system

The hub adopts the blueprint's dark foundation (§10): background `#07101E`, surface `#101C31`, raised `#192841`, primary violet `#6557FF`, secondary cyan `#45C4D7`, reward gold `#F0C75E` for rare highlights only, text `#F5F7FC` and `#AAB8CC`, radii 12 / 18 / 26, spacing 4 / 8 / 12 / 16 / 24 / 32. One display family and one body family. Game art supplies most of the colour; the games keep their own look.

## D11. Discover: search and filters

Discover searches titles, genres, mechanics, moods, collections, controls and each game's pitch. It matches while a word is still being typed, and allows one typo in a word of four letters or more (two from eight), but only when the word matches nothing as typed, so a real word is never widened into a different one.

A filter is shown only when it splits the catalogue. Today that is genre and keyboard play. Every game plays offline, in portrait, with no ads or purchases and no download, so Discover says that once instead of offering filters that change nothing (blueprint section 2: remove what does not improve comprehension).

- Search tags (`mechanics`, `moods` in `games/registry.js`) describe the game as it plays now and must agree with the collections it is in (`tools/discover-test.cjs` checks this).
- *Open:* a session-length filter (blueprint section 7: quick, medium, long). It needs measured play on the reference devices, not an estimate.
- Revisit the filter set when a game adds controller support, landscape play or a download.

## D12. Catalogue growth and the owner's mockup (decided 11 October 2026)

The owner set new priorities: more high-quality, fun games and a hub that looks like the owner's mockup.

- Kiln grows to 64 games: the first four plus 60 new ones, 10 in each of six categories: Action, Adventure, Racing,
  Puzzle, Sports, Arcade. Space and animal games are spread across them. Tessera, Crosswake and Span are Puzzle;
  Goldmend and Lariat are Arcade. The briefs and build order are in `docs/CATALOGUE.md`.
- The blueprint's phase-by-phase process is on hold. Its honesty rules stay: the mockup's star ratings, "Go Pro"
  banner, Challenges and Social tabs and percentage bars are left out until there is something real behind them.
  A Continue playing card shows a progress bar only when the game reports a true percentage.
- Continue playing cards have no Play button: tapping the card resumes the game.
- The four existing games get a visual overhaul: the owner finds them templated and unfinished.

## D13. A shared game kit

New games are built on `hub/kit.js` (loop, input, synthesised audio and music, particles, camera, drawing helpers and a
themeable menu shell), loaded after the SDK. This amends D2's "self-contained page": a game still ships as one page
with no image or audio files, but shares engine code with the others.

- Why: 60 games at a finished standard need engine pieces that are already correct (pause, safe areas, audio
  unlock, key art, test hooks), so each build spends its effort on the game and its look.
- The kit gives engine pieces, not a look: each game chooses its own palette, fonts, panel style and music.
- Every new game must pass `tools/game-check.cjs` and a playtest review before it is listed.

## D14. Kiln is where games start; the best become standalone products (decided 12 October 2026)

The owner, on 12 October: "Pipistrelle has the potential of being an original product, high quality ... Pipistrelle
needs the full suite: full 4K, different caves, atmosphere, missions, different bats you can purchase and lots
more." Then: "Pipistrelle should be its own sub repo in Kiln. It's a roll out. Picture this: all high quality
original games in Kiln ... After we have pushed Pipistrelle, the next is Napwalk full rollout. And the rest of the
60 games we will build them in Kiln and I'll look at each; if I spot any good one, it's getting out."

- **The model**: every game starts in Kiln. The owner looks at each one; the good ones graduate into standalone
  products with a full rollout.
- **A product** lives in its own self-contained folder of this repo, `products/<id>/`, with its own Android app
  (own app ID, name, icon), web root, build, tests, README and CI workflow that publishes its own APK. It depends on
  nothing outside its folder, so it can later move to its own git repository unchanged. `docs/PRODUCTS.md`
  describes the layout.
- **Order**: Pipistrelle first (full 4K, distinct caves, atmosphere, missions, bats bought with earned currency,
  and more), then Napwalk's full rollout, then the remaining catalogue games are built in Kiln (D12) for the owner
  to review. The overhaul of the four original games is paused until then; drafts stay on the working branch.
- The pilot version of a graduated game stays in the Kiln hub as a short taste of it, sharing the product's look
  where it can: Pipistrelle's pilot draws its bats with the product's renderer (13 October).
- Bats and other unlocks are bought with currency earned by playing. No real money, no energy timers, no dark
  patterns. (No ads, until D15 allowed one opt-in rewarded ad at the Last Echo and D17 an interstitial every third run.)
- Pipistrelle's design and build plan live in `docs/pipistrelle/` (`DESIGN.md`, `BUILD_PLAN.md`).

## D15. Pipistrelle: rewarded ads at the Last Echo, nowhere else (decided 13 October 2026; network and interstitials superseded by D17)

The owner, on 13 October: "Add Unity Ads integration, 2026 standards ... strategically place reward ads at the
pressure point when the player loses, add losing mechanics, fun and interactive, then a continue or something."
This replaces "no ads" in D14 and in Pipistrelle's fairness charter, for Pipistrelle only. D6 still holds for the
Kiln hub.

- **Losing is a moment** (the Last Echo, `products/pipistrelle/web/js/rescue.js`): when the bat runs out of energy
  or is overtaken, it falls in slow motion and the world stops. First comes the **Second Wind**: four heartbeats,
  and a player who taps three of them in time flies on with a little energy. It is free, once per attempt, and
  skill only.
- **Fly on?** After a missed or spent Second Wind, a card offers a **rewarded ad** to fly on with most of the energy
  and a moment of safety. It is once per attempt, and only when the player taps "Watch and fly on". It never plays by
  itself, and "Let the echoes fade" is always one tap away. The card closes on its own after 9 s.
- **Never elsewhere**: no interstitials, no banners, no ads on menus, results or the flight home, and none in
  practice. Moths, bats, Moons and the story are never sold or gated behind ads. A revive pushes back whatever caught
  the bat, but a Moon already lost stays lost.
- **Network**: Unity Ads SDK 4.21 (`RewardedAd` API) through the app's own `PipAds` plugin. Game ID `800397328`,
  placement `BP_Rewarded_Android` (`web/js/ads.js`).
- **Privacy**: ads are non-personalised unless the player turns on "Personalised ads" in Settings (off by default).
  Debug builds use Unity's test ads, so our own installs never count as real traffic. Release builds show live ads.
- **Before the Play listing**, the owner must:
  - publish a privacy policy that names Unity Ads;
  - in the Play Console, answer "Contains ads: yes";
  - fill in Data safety: Unity collects the device or advertising ID and app interactions, for advertising and
    analytics, shared with Unity;
  - set the target audience to 13+. Anything younger brings the Families policy, which needs a certified ad
    network setup instead.
  - Add `app-ads.txt` with Unity's line on the developer website.

## Open items

- App name and package ID. `com.mbanguraproject.kiln` is a placeholder and becomes permanent on the first Play upload.
- Store-safe names for each game (see D3).
- The owner's reference phone (D4), privacy policy URL and support contact (D9).

## D16. Pipistrelle stays one Android app with a web renderer; stutter is fixed at its causes (14 October 2026)

The owner, on 14 October: "the game is super laggy, stutter in game music when playing at particular time, if the
problem is because it's a web game make it a full Android game." Pipistrelle already ships as a full Android app
(Capacitor, its own APK and Play listing); what runs inside it is the game's JavaScript and a 2D canvas. The
stutters had two causes, neither of which a native rewrite would have removed by itself:

- **The music was synthesised live on the main thread**, note by note, scheduled only 0.12 s ahead from timers, so
  any long frame delayed or dropped notes. Songs are short loops, so each is now rendered once, off the main thread
  (an OfflineAudioContext), into looping stems: the base and one per adaptive layer, which fade in and out in sync.
  The music no longer depends on the frame rate at all (`web/vendor/kit.js`, PRE).
- **The graphics safety net re-learned the device at the start of every cave.** It counted the cheap menu frames
  too, so it climbed back to full quality in every menu and then stepped down again in the cave, repainting its
  caches at every step: several hitches each time. It now counts only frames that draw a cave and remembers what the
  device can hold between sessions (`web/js/render/quality.js`).

A native rewrite (Kotlin with OpenGL, or a game engine) would mean months of work redoing 25 caves, their hazards,
missions, tests and art, for the same rendering cost unless the renderer were redesigned anyway. If a phone still
cannot hold a steady frame, the next step is a GPU (WebGL) renderer inside the same app, judged on that phone's
numbers: Settings → Display now shows the frame rate measured in the caves.

## D17. Pipistrelle: Google AdMob, a rewarded ad and an interstitial every third run (15 October 2026)

The owner, on 15 October: "Remove that Unity Ads, add the latest Google AdMob integration for rewarded ads, and an
interstitial ad after every 3 runs at game breaks." This replaces D15's ad network and its "no interstitials" rule.
The Last Echo itself (the Second Wind, then "Fly on?") is unchanged.

- **Network**: Google Mobile Ads SDK 24 (`play-services-ads`) with Google's User Messaging Platform 3 for consent,
  through the app's own `PipAds` plugin (`android/.../PipAdsPlugin.java`). Unity Ads is removed.
- **Rewarded**: as in D15. It is offered only at the Last Echo, at most once per attempt, and plays only when the
  player taps "Watch and fly on".
- **Interstitial**: at the break after every third finished run (campaign, Nightly Cave or Long Night), between the
  end of the run and the results. It never plays mid-flight, and never after practice, a story flight or the demo
  behind the menus. Two ads never play within two minutes of each other; when one is not loaded or would come too
  soon, it waits for the next break. A run where the player chose a rewarded ad starts the count again. The count
  survives closing the app (`web/js/ads.js`).
- **Still never**: banners, ads on the menus, or anything sold or gated behind an ad.
- **Consent**: UMP asks for consent where the law requires it (the EEA, the UK, Switzerland) before any ad is
  requested. Settings has "Privacy options" to reopen it. Ads are non-personalised (the `npa` extra) unless the
  player turns on "Personalised ads".
- **Test ads**: debug builds always use Google's demo ad units. Release builds use the live units in
  `web/js/ads.js` and fall back to the demo units (which earn nothing) while those are empty. Settings shows
  which units are in use, the SDK version, and each ad's state with Google's error name.
- **Before the Play listing**, the owner must:
  - create the app in AdMob, with a rewarded and an interstitial ad unit;
  - put the AdMob app ID in `android/app/src/main/res/values/strings.xml` (`admob_app_id`) and the two unit IDs in
    `web/js/ads.js` (`live`);
  - in AdMob, Privacy & messaging, publish a GDPR message (and a US states message if wanted). Without one, UMP
    shows nothing and EEA users get no ads;
  - add AdMob's line to `app-ads.txt` on the developer website;
  - publish a privacy policy that names Google AdMob;
  - in the Play Console:
    - answer "Contains ads: yes";
    - declare the advertising ID;
    - fill in Data safety: device or other IDs, app interactions, diagnostics, and approximate location, collected
      for advertising and analytics and shared with Google;
    - keep the target audience 13+. Anything younger brings the Families policy.

## D18. Pipistrelle's package name: `game.devbangs.pipistrelle` (15 October 2026)

The owner, on 15 October: "Package name game.devbangs.pipistrelle". It replaces the placeholder
`com.mbanguraproject.pipistrelle` as the app ID, Gradle namespace and Java package
(`android/app/src/main/java/game/devbangs/pipistrelle/`). It becomes permanent with the first Play upload.

- Android treats the renamed app as a new app. A phone that had the old build keeps it as a separate app, with its
  own save. To move progress across: Settings, Save, Export in the old app, then Import in the new one.
- When Pipistrelle is added in AdMob and the Play Console, use this package name.

## Roadmap status (blueprint §18)

| Phase | State |
| --- | --- |
| 0. Decisions | Done (this document) |
| 1. Design foundation: tokens, navigation, card families, home, detail, discover and library | Done for the owner's mockup (D12); the blueprint's later phases are on hold while the catalogue grows |
| 2. Vertical slice: discover → detail → launch → return → history | Not started |
| 3. Catalogue foundation: metadata, categories, favourites, search, image pipeline | Not started |
| 4. Private beta | Not started |
| 5. Public release | Not started |
| 6. Retention polish | Not started |
