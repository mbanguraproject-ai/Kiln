# Pipistrelle

Fly a thumb-sized bat through pitch-black caves, painting them with your own echoes. A standalone game that grew
out of Kiln (D14): its own Android app (`com.mbanguraproject.pipistrelle`), build, tests and CI, and nothing outside
this folder.

## What is in v1

- **The Long Rain**, the campaign: 25 caves across five biomes, each with its own painter, palette, parallax, music,
  hazards, flight home and cave architecture (`js/gen/cave.js`, LAYOUTS):
  - tunnels, shafts and caverns in Chalk Hollows;
  - pillared halls in the Drowned Halls;
  - geode chains in the Glass Vaults;
  - square crypts in the Owlstone Crypt;
  - one vast cavern in The Hush.

  A biome opens after the third cave of the one before. The Nightly Cave visits a different biome each night.
  - Chalk Hollows: stalactites, webs, drips, the collapse.
  - The Drowned Halls: the rising flood, siphons, cavefish.
  - The Glass Vaults: crystals that hold your voice, crystal bells, tiger moths.
  - The Owlstone Crypt: owls that hunt by ear, and the Grey Lady.
  - The Hush: echoes die fast, until the Chorus.
- **Missions and Moons**: Homing, Kin, Hush and Escape, three Moons per cave (20 Moon types), lore scratches, Requests
  and the Journal.
- **The Colony**: five bats with their own flight and ability (Pip, plus four bought with moths you earn). No real
  money, no timers.
  - The Hangar shows six stats, each read from the bat's real numbers: speed, turning, sonar reach, echo life, energy
    and efficiency. A bar places the bat among the colony, and a figure gives its difference from Pip.
  - Practice Hollow flies any arrived bat for free.
- **The Roost** (home):
  - a living belfry where every pup you bring home hangs from the beams;
  - new pups fly in through the window on your return;
  - the colony circling below grows with them.
- **Modes**: the Nightly Cave (one seeded cave a day, real lunar phase) and The Long Night (endless, through every
  opened biome).
- **A real chance of losing**: energy drains fast, so a full bar lasts about 32 s without moths and eating keeps
  you alive. Hazards hit hard, a full-speed crash into stone costs far more than a brush, and past a cave's par time
  the dark grows hungry. Gentle Wings in Settings softens all of it.
- **A living cave**: flocks of the colony's bats fly by, and call back when you chirp near them.
- **The Last Echo**: losing is a moment, not a cut.
  - The Second Wind is four heartbeats; tap three in time to fly on, free and skill only.
  - After that, one opt-in rewarded ad per attempt lets you fly on (owner decisions D15 and D17).
- **Ads** (Google AdMob, D17):
  - the rewarded ad above;
  - an interstitial at the break after every third run;
  - no banners.
  - If an ad can't load, Settings says why with Google's own error name and retries. In test builds it has test
    buttons for both ads.
- **Native 4K by default**: every screen is drawn at its full resolution, up to 4K, with every effect on, and
  there are no quality tiers to pick. A quiet safety net sheds effects before it ever lowers the resolution (never
  below 75%), and once it has stepped down it does not bounce back and forth. Settings has a Battery saver.
- **Smooth on any screen**: the camera and the bat are blended between the 60 Hz simulation steps, so 90 and 120 Hz
  screens get even motion. A 120 Hz screen draws a steady 60 fps.
- **No splash**: opening the app goes straight to the title and its Fly button.
- **The bats** are drawn in the app icon's style. The icon is built from `art/icon.webp` by `tools/make-icons.py`:
  - the adaptive launcher icon, with a themed monochrome layer;
  - the 512 px Play Store icon (`store/play-icon-512.png`);
  - the web icons.

## Run, test, build

```sh
npm ci
npm run serve                 # http://localhost:8920 (add ?debug for test hooks, ?fakeads for the stand-in ads)
node tests/test.cjs --unit    # data and economy checks, no browser (CI runs these)
node tests/test.cjs           # the full suite in Chromium: every cave, every Moon, screens, Last Echo, frame budgets
npm run shots                 # screenshots into shots/ (every effect on; --quality=native keeps the safety net)
npm run android:apk           # android/app/build/outputs/apk/debug/app-debug.apk
node tools/trailer.cjs        # the store trailer: store/trailer-1080p60.mp4 (about 25 min; --preview for one still a shot)
```

The trailer (`tools/trailer.cjs`) is real gameplay captured frame by frame: the game is stepped exactly 1/60 s per
frame with its clock made virtual, so the video is perfectly smooth on any machine. Every sound the game plays is
logged and the soundtrack (the music and those sounds) is rendered offline through the game's own synths
(`Kit.audio.renderOffline`). ffmpeg joins the shots with crossfades into H.264 High at 1080p60 with AAC audio. For the
Play listing, upload it to YouTube (public or unlisted, no ads) and paste the link into Play Console, Store listing,
Video.

Every push that touches this folder builds the APK in CI (`.github/workflows/pipistrelle.yml`) and publishes it to the
`pipistrelle-preview` release as `pipistrelle-debug.apk`.

## Ads (Google AdMob, D17)

- **Rewarded**: shown only at the Last Echo, only when the player taps "Watch and fly on", and at most once per
  attempt.
- **Interstitial**: shown at the break after every third finished run (campaign, Nightly Cave or Long Night), before
  the results.
  - Never mid-flight, never after practice or a story flight.
  - Never within two minutes of another ad.
- No banners.
- **SDK**: Google Mobile Ads SDK 24 plus the User Messaging Platform (consent), through
  `android/.../PipAdsPlugin.java`.
- **Privacy**: ads are non-personalised unless the player turns on "Personalised ads" in Settings. Settings also has
  "Privacy options" where the law requires consent.
- **Test ads**: debug builds always use Google's demo ad units. Settings shows the ad state, with "Test rewarded"
  and "Test interstitial" buttons. To read the logs: `adb logcat -s PipAds`.
- **In a browser**: `?debug` plays a stand-in rewarded ad. `?fakeads` plays the stand-in interstitial too.

To earn from ads (see D17 in `docs/DECISIONS.md`):

1. In [AdMob](https://admob.google.com), add the app "Pipistrelle" (Android). Create a **Rewarded** ad unit and an
   **Interstitial** ad unit.
2. Put the app ID (`ca-app-pub-…~…`) in `android/app/src/main/res/values/strings.xml` as `admob_app_id`.
3. Put the two ad unit IDs (`ca-app-pub-…/…`) in `web/js/ads.js`, in `CFG.live`. Until then, release builds show
   Google's demo ads, which earn nothing.
4. In AdMob, Privacy & messaging, publish a GDPR message (European regulations).
5. Add AdMob's line to `app-ads.txt` on the developer website.
6. Publish a privacy policy that names Google AdMob.
7. In the Play Console:
   - answer "Contains ads: yes";
   - declare the advertising ID;
   - fill in Data safety: device or other IDs, app interactions, diagnostics and approximate location, collected
     for advertising and analytics and shared with Google;
   - keep the target audience 13+.

## Where things are

| Path | What |
| --- | --- |
| `web/js/core.js`, `run.js`, `bat.js`, `echo.js` | The game loop, the bat and the echo engine |
| `web/js/gen/` | The cave generator |
| `web/js/hazards/` | One module per hazard |
| `web/js/render/` | Renderer, chunks, backdrop, bat art, resolution and the safety net (`quality.js`) |
| `web/js/rescue.js`, `ads.js` | The Last Echo, and the ads (AdMob: rewarded and interstitial) |
| `web/js/ui/` | Screens: title, map, brief, results, Hangar, Roost, Journal, Requests, settings |
| `web/data/` | Tuning, economy, bats, missions, requests, campaign and `biomes/` (see `docs/BIOMES.md`) |
| `tests/` | `unit.cjs` (Node) and `test.cjs` (browser) |
| `STATUS.md` | The build log, one line per step |
