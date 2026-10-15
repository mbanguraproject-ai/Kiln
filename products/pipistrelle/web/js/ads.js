/* Ads (owner decision D17, 15 October 2026, replacing D15's Unity Ads). Google AdMob, two kinds:
 *  - a rewarded ad, offered only at the Last Echo (js/rescue.js), at most once per attempt, and never shown without
 *    the player tapping "Fly on";
 *  - an interstitial at the break after every third finished run (campaign, nightly or endless; never practice, a
 *    story flight or the demo behind the menus), before the results, never in the middle of play. A run where the
 *    player chose to watch a rewarded ad starts the count again, and no two ads play within two minutes.
 * Consent comes first: Google's User Messaging Platform asks where the law requires it (EEA, UK, Switzerland), and
 * Settings reopens it ("Privacy options"). Ads are non-personalised unless the player allows personalised ads.
 *
 * Ad units: debug builds always use Google's demo units, so our own installs never count as real traffic. Release
 * builds use the live units below, and fall back to the demo units (which earn nothing) until they are filled in;
 * Settings says which is in use. The AdMob app ID lives in android/app/src/main/res/values/strings.xml.
 *
 * On Android the native side is the PipAds plugin (android/.../PipAdsPlugin.java, Google Mobile Ads SDK 24 and UMP
 * 3). Nothing fails silently: every step has a timeout, the last error is kept with Google's own error name
 * (NO_FILL, NETWORK_ERROR, ...), PP.ads.status() describes the state in words (Settings shows it, with test buttons
 * in test builds) and every change emits 'adsStatus'. In a browser there is no ad network: with ?debug or ?fakeads a
 * stand-in rewarded ad plays instead, and with ?fakeads a stand-in interstitial too, so both can be tried without a
 * phone. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const CFG = PP.data.ads = {
    // Google's demo ad units (https://developers.google.com/admob/android/test-ads)
    test: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
    // Pipistrelle's own ad units from the AdMob console (Apps > Pipistrelle > Ad units): fill these in before release
    live: { rewarded: '', interstitial: '' },
    interstitialEvery: 3,             // an interstitial at the break after every third finished run
    gap: 120,                         // seconds: never two ads closer together than this
    retry: [5, 15, 30, 60, 120],      // seconds between attempts after a failure (no network, no fill)
    initTimeout: 90,                  // seconds: long, as the consent form may be on screen meanwhile
    loadTimeout: 40,
    maxAge: 50 * 60,                  // seconds: AdMob ads expire an hour after loading; fetch a fresh one before
  };
  const KINDS = ['rewarded', 'interstitial'];
  const COUNTS = { campaign: 1, nightly: 1, endless: 1 }; // the runs that count toward the interstitial
  const NAME = { rewarded: 'rewarded ad', interstitial: 'interstitial' };
  const plugin = () => { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.PipAds || null; };
  const fakeAds = /[?&]fakeads\b/.test(location.search), fake = PP.debug || fakeAds;
  const slot = () => ({ state: 'off', error: null, tries: 0, timer: 0, retryAt: 0, at: 0 });
  const sdk = slot(), slots = { rewarded: slot(), interstitial: slot() };
  let lastAd = 0, announced = false;
  const changed = () => PP.emit('adsStatus', A.status());
  // a native call that rejects if it has not answered in time
  const within = (p, s, stage) => new Promise((res, rej) => {
    const t = setTimeout(() => rej({ code: 'TIMEOUT', message: stage + ' did not answer in ' + s + ' s' }), s * 1000);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
  const errOf = (e, stage) => ({ stage, code: (e && e.code) || 'ERROR', message: (e && (e.message || e.errorMessage)) || String(e), at: Date.now() });
  const later = (s, again) => {
    s.state = 'wait';
    clearTimeout(s.timer);
    const sec = CFG.retry[Math.min(s.tries++, CFG.retry.length - 1)];
    s.retryAt = Date.now() + sec * 1000;
    changed();
    s.timer = setTimeout(() => { if (s.state !== 'wait') return; s.state = 'off'; again(); }, sec * 1000);
  };
  // what the plugin reports about itself (each answer carries it; keep what an answer leaves out)
  const info = r => {
    if (!r) return;
    if ('testMode' in r) A.testMode = !!r.testMode;
    if (r.version) A.version = r.version;
    if ('privacyRequired' in r) A.privacyRequired = !!r.privacyRequired;
  };
  const toast = t => { if (PP.ui && PP.ui.toast) PP.ui.toast(t); };
  // the finished runs since the last interstitial, kept across sessions so quitting does not reset the count
  const runs = n => {
    try { if (n === undefined) return +localStorage.getItem('pp.adRuns') || 0; localStorage.setItem('pp.adRuns', String(n)); } catch (e) { /* private mode */ }
    if (n === undefined) return A._runs || 0;
    A._runs = n; return n;
  };

  const A = PP.ads = {
    testMode: null, version: '', privacyRequired: false,
    sdk, slots,
    // the stand-in interstitial in a browser (?fakeads, or set by the tests)
    fakeInterstitial: fakeAds,
    native: () => !!plugin(),
    // the ad unit a kind loads from: the demo units in test builds and until the live ones are filled in
    unit: kind => (A.testMode !== false || !CFG.live[kind] ? CFG.test[kind] : CFG.live[kind]),
    live: kind => A.testMode === false && !!CFG.live[kind],
    // the state the Settings card and the tests read: the SDK's while it starts, then the rewarded ad's
    get state() { return sdk.state !== 'on' ? sdk.state : slots.rewarded.state; },
    get error() { return sdk.error || slots.rewarded.error || slots.interstitial.error; },
    // an ad of this kind can be shown right now
    ready(kind) {
      kind = kind || 'rewarded';
      if (!plugin()) return kind === 'rewarded' ? fake : A.fakeInterstitial;
      const s = slots[kind];
      if (s.state !== 'ready') return false;
      if (Date.now() - s.at > CFG.maxAge * 1000) { A.load(kind, true); return false; }
      return true;
    },
    // there is an ad network at all (an Android build, or the stand-in)
    exists: () => !!plugin() || fake,
    init() {
      const P = plugin();
      if (!P || sdk.state === 'init' || sdk.state === 'on') return;
      clearTimeout(sdk.timer);
      sdk.state = 'init'; changed();
      within(P.init({ personalised: !!PP.settings.get('adsPersonal') }), CFG.initTimeout, 'Starting Google Mobile Ads')
        .then(r => { info(r); sdk.state = 'on'; sdk.error = null; sdk.tries = 0; changed(); KINDS.forEach(k => A.load(k)); })
        .catch(e => { sdk.error = errOf(e, 'init'); later(sdk, A.init); });
    },
    // fetch an ad of this kind (fresh: drop the one loaded, it has grown too old)
    load(kind, fresh) {
      const P = plugin(), s = slots[kind];
      if (!P || !s || sdk.state !== 'on' || s.state === 'loading' || s.state === 'showing') return;
      if (s.state === 'ready' && !fresh) return;
      clearTimeout(s.timer);
      s.state = 'loading'; changed();
      within(P.load({ kind, unitId: A.unit(kind), replace: !!fresh }), CFG.loadTimeout, 'Loading the ' + NAME[kind])
        .then(r => {
          info(r);
          s.state = 'ready'; s.at = Date.now(); s.error = null; s.tries = 0; changed();
          if (A.testMode && kind === 'rewarded' && !announced) { announced = true; toast('AdMob test ad ready'); }
        })
        .catch(e => { s.error = errOf(e, 'load'); later(s, () => A.load(kind)); });
    },
    // try again now (Settings), instead of waiting for the next retry
    retry() {
      if (!plugin()) return;
      if (sdk.state !== 'on') { if (sdk.state === 'wait') { sdk.tries = 0; sdk.state = 'off'; A.init(); } return; }
      KINDS.forEach(k => { const s = slots[k]; if (s.state === 'wait') { clearTimeout(s.timer); s.state = 'off'; s.tries = 0; A.load(k); } });
    },
    privacy(personalised) {
      const P = plugin();
      if (!P || !P.setPrivacy) return;
      // the ads already loaded were requested under the old choice: the plugin drops them, so load fresh ones
      P.setPrivacy({ personalised: !!personalised }).then(() => KINDS.forEach(k => { const s = slots[k]; if (s.state === 'ready') { s.state = 'off'; A.load(k); } })).catch(() => {});
    },
    // Google's consent form again, where the law requires it (Settings, "Privacy options")
    privacyOptions() {
      const P = plugin();
      if (!P || !P.privacyOptions) return Promise.resolve(false);
      return P.privacyOptions().then(r => { info(r); changed(); return true; }).catch(e => { toast('Privacy options did not open: ' + errOf(e, 'privacy').code); return false; });
    },
    // play an ad; resolves { shown, rewarded }: rewarded only when a rewarded ad was watched through
    show(kind) {
      kind = kind || 'rewarded';
      const P = plugin(), s = slots[kind];
      if (!P) return (kind === 'rewarded' ? fake : A.fakeInterstitial) ? fakeShow(kind).then(done(kind)) : Promise.resolve({ shown: false, rewarded: false });
      if (!A.ready(kind)) return Promise.resolve({ shown: false, rewarded: false });
      s.state = 'showing'; changed();
      Kit.audio.hold(true);
      return P.show({ kind })
        .then(r => ({ shown: !!(r && r.shown), rewarded: kind === 'rewarded' && !!(r && r.rewarded) }))
        .catch(e => { s.error = errOf(e, 'show'); return { shown: false, rewarded: false }; })
        .then(r => { Kit.audio.hold(false); s.state = 'off'; changed(); A.load(kind); return done(kind)(r); });
    },
    // the break after a run: on every third run that counts, an interstitial plays before the results (if one is
    // loaded and no ad played in the last two minutes; otherwise it waits for the next break). Resolves when the
    // break is over: at once when no ad plays.
    runBreak(res) {
      if (!res || !COUNTS[res.kind] || !A.exists()) return Promise.resolve(false);
      const n = runs(runs() + 1);
      if (n < CFG.interstitialEvery || Date.now() - lastAd < CFG.gap * 1000) return Promise.resolve(false);
      if (!A.ready('interstitial')) { if (plugin()) A.load('interstitial'); return Promise.resolve(false); }
      // the results never wait on an ad that never says it closed
      return Promise.race([A.show('interstitial').then(r => r.shown), new Promise(res => setTimeout(() => res(true), 90000))]);
    },
    runsSinceAd: () => runs(),
    // the state in words, for Settings and the offer card
    status() {
      if (!plugin()) return { ok: fake, text: fake ? 'Browser build: stand-in test ads play instead of AdMob.' : 'Ads play in the Android app only.' };
      const why = e => e.code + (e.message && e.message !== e.code ? ' (' + e.message + ')' : '');
      if (sdk.state === 'init') return { ok: false, text: 'Starting Google Mobile Ads…' };
      if (sdk.state !== 'on') {
        const e = sdk.error;
        if (sdk.state === 'wait') return { ok: false, error: true, text: 'Google Mobile Ads could not start: ' + why(e) + '. Trying again in ' + Math.max(1, Math.round((sdk.retryAt - Date.now()) / 1000)) + ' s.' };
        return { ok: false, text: e ? 'Google Mobile Ads could not start: ' + why(e) + '.' : 'Not started yet.' };
      }
      const line = k => {
        const s = slots[k], N = k === 'rewarded' ? 'Rewarded ad' : 'Interstitial';
        if (s.state === 'ready') return N + ': ready.';
        if (s.state === 'showing') return N + ': playing.';
        if (s.state === 'loading') return N + ': loading…';
        if (s.state === 'wait') return N + ': ' + (s.error && s.error.stage === 'show' ? 'the last one failed to play' : 'none loaded') + ', ' + why(s.error) + '. Trying again in ' + Math.max(1, Math.round((s.retryAt - Date.now()) / 1000)) + ' s.';
        return N + ': ' + (s.error ? why(s.error) : 'not loaded yet') + '.';
      };
      const mode = A.testMode ? 'Google test ads' : KINDS.every(A.live) ? 'Live AdMob ads' : 'Google demo ads (live ad units not set yet)';
      return { ok: slots.rewarded.state === 'ready', error: slots.rewarded.state === 'wait' || slots.interstitial.state === 'wait', text: mode + (A.version ? ' · SDK ' + A.version : '') + '. ' + line('rewarded') + ' ' + line('interstitial') };
    },
    // Settings, in test builds: play an ad now to check the whole chain works (no reward)
    test(kind) {
      kind = kind || 'rewarded';
      if (A.ready(kind) || (!plugin() && fake)) return A.show(kind).then(r => { toast(!r.shown ? 'The test ad did not play' : kind === 'rewarded' ? (r.rewarded ? 'Test ad watched through' : 'Test ad closed early') : 'Test interstitial closed'); return r; });
      A.retry();
      toast('No ' + NAME[kind] + ' loaded yet');
      return Promise.resolve({ shown: false, rewarded: false });
    },
  };
  // after an ad that played, the next one waits; a rewarded ad the player chose also starts the run count again
  function done(kind) {
    return r => {
      if (r && r.shown) { lastAd = Date.now(); if (kind === 'interstitial' || r.rewarded) runs(0); }
      return r;
    };
  }
  if (plugin()) setTimeout(() => A.init(), 1200); // after boot, so the profile's privacy choice is known

  // the browser stand-ins: a three-second rewarded "test ad" that can be closed early (no reward then), and an
  // interstitial that can be closed after two seconds
  function fakeShow(kind) {
    return new Promise(resolve => {
      const inter = kind === 'interstitial';
      const el = document.createElement('div');
      el.className = 'fake-ad';
      el.innerHTML = '<div class="fake-ad-card"><b>' + (inter ? 'Test interstitial' : 'Test ad') + '</b><span>' + (inter ? 'A full-screen AdMob ad plays here on Android, after every third run.' : 'A rewarded AdMob ad plays here on Android.') + '</span><i></i><button type="button">Close</button></div>';
      document.body.appendChild(el);
      Kit.audio.hold(true);
      const left = PP.debug && window.__ppFastAds ? 0.2 : inter ? 2 : 3;
      const bar = el.querySelector('i'), btn = el.querySelector('button');
      if (inter) btn.disabled = true;
      const t0 = performance.now();
      let watched = false;
      const done = () => { clearInterval(iv); el.remove(); Kit.audio.hold(false); resolve({ shown: true, rewarded: !inter && watched }); };
      const iv = setInterval(() => {
        const k = (performance.now() - t0) / 1000 / left;
        bar.style.width = Math.min(100, k * 100) + '%';
        if (k >= 1) { watched = true; if (inter) btn.disabled = false; else done(); }
      }, 50);
      btn.addEventListener('click', () => { if (!btn.disabled) done(); });
    });
  }
})();
