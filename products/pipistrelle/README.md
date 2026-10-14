# Pipistrelle

Fly a thumb-sized bat through pitch-black caves, painting them with your own echoes. A standalone game that grew
out of Kiln (D14): its own Android app (`com.mbanguraproject.pipistrelle`), build, tests and CI, and nothing outside
this folder.

## What is in v1

- **The Long Rain**, the campaign: 25 caves across five biomes, each with its own painter, palette, parallax, music,
  hazards and flight home.
  - Chalk Hollows: stalactites, webs, drips, the collapse.
  - The Drowned Halls: the rising flood, siphons, cavefish.
  - The Glass Vaults: crystals that hold your voice, crystal bells, tiger moths.
  - The Owlstone Crypt: owls that hunt by ear, and the Grey Lady.
  - The Hush: echoes die fast, until the Chorus.
- **Missions and Moons**: Homing, Kin, Hush and Escape, three Moons per cave (20 Moon types), lore scratches, Requests
  and the Journal.
- **The Colony**: five bats with their own flight and ability (Pip, plus four bought with moths you earn). No real
  money, no timers.
- **Modes**: the Nightly Cave (one seeded cave a day, real lunar phase) and The Long Night (endless, through every
  opened biome).
- **The Last Echo**: losing is a moment, not a cut.
  - The Second Wind is four heartbeats; tap three in time to fly on, free and skill only.
  - After that, one opt-in rewarded ad per attempt lets you fly on (owner decision D15). There are no other ads.
- **Native 4K by default**: every screen is drawn at its full resolution, up to 4K, with every effect on, and
  there are no quality tiers to pick. A quiet safety net sheds effects before it ever lowers the resolution (never
  below 75%). Settings has a Battery saver.
- **The bats** are drawn in the app icon's style. The icon is built from `art/icon.webp` by `tools/make-icons.py`:
  - the adaptive launcher icon, with a themed monochrome layer;
  - the 512 px Play Store icon (`store/play-icon-512.png`);
  - the web icons.

## Run, test, build

```sh
npm ci
npm run serve                 # http://localhost:8920 (add ?debug for test hooks, ?fakeads for the stand-in ad)
node tests/test.cjs --unit    # data and economy checks, no browser (CI runs these)
node tests/test.cjs           # the full suite in Chromium: every cave, every Moon, screens, Last Echo, frame budgets
npm run shots                 # screenshots into shots/ (every effect on; --quality=native keeps the safety net)
npm run android:apk           # android/app/build/outputs/apk/debug/app-debug.apk
```

Every push that touches this folder builds the APK in CI (`.github/workflows/pipistrelle.yml`) and publishes it to the
`pipistrelle-preview` release as `pipistrelle-debug.apk`.

## Ads (Unity Ads, D15)

- Rewarded only. Shown only at the Last Echo, only when the player taps "Watch and fly on", and at most once per
  attempt.
- Unity Ads SDK 4.21 through `android/.../PipAdsPlugin.java`. The Game ID and placement are in `web/js/ads.js`.
- Non-personalised unless the player turns on "Personalised ads" in Settings.
- Debug builds show Unity test ads; release builds show live ads.
- In a browser there is no ad network. `?debug` or `?fakeads` plays a three-second stand-in instead.

Before the Play listing, the owner needs to do the following (see D15 in `docs/DECISIONS.md`):

- publish a privacy policy that names Unity Ads;
- in the Play Console, set "Contains ads" to yes and fill in Data safety and the advertising ID declaration;
- set a 13+ target audience;
- put Unity's line in `app-ads.txt`.

## Where things are

| Path | What |
| --- | --- |
| `web/js/core.js`, `run.js`, `bat.js`, `echo.js` | The game loop, the bat and the echo engine |
| `web/js/gen/` | The cave generator |
| `web/js/hazards/` | One module per hazard |
| `web/js/render/` | Renderer, chunks, backdrop, bat art, resolution and the safety net (`quality.js`) |
| `web/js/rescue.js`, `ads.js` | The Last Echo and rewarded ads |
| `web/js/ui/` | Screens: title, map, brief, results, Hangar, Roost, Journal, Requests, settings |
| `web/data/` | Tuning, economy, bats, missions, requests, campaign and `biomes/` (see `docs/BIOMES.md`) |
| `tests/` | `unit.cjs` (Node) and `test.cjs` (browser) |
| `STATUS.md` | The build log, one line per step |
