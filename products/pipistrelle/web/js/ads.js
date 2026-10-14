/* Rewarded ads (owner decision D15, 13 October 2026). Unity Ads, rewarded only: never an interstitial or a banner,
 * offered only at the Last Echo (js/rescue.js), at most once per attempt, and never shown without the player
 * tapping "Fly on". Ads are non-personalised unless the player allows personalised ads in Settings. Debug builds use
 * Unity's test mode ('auto' below), so our own installs never count as real traffic.
 *
 * On Android the native side is the PipAds plugin (android/.../PipAdsPlugin.java, Unity Ads SDK 4.21). Nothing
 * fails silently: every step has a timeout, the last error is kept with Unity's own error name (INVALID_ARGUMENT,
 * NO_FILL, ...), PP.ads.status() describes the state in words (Settings shows it, with a test-ad button in test
 * builds) and every change emits 'adsStatus'. In a browser there is no ad network: with ?debug or ?fakeads a
 * stand-in test ad plays instead, so the whole flow can be tried without a phone. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const CFG = PP.data.ads = {
    gameId: '800397328',             // Unity Game ID (Android)
    placement: 'BP_Rewarded_Android', // the rewarded placement (ad unit) ID
    testMode: 'auto',                 // 'auto': test ads in debug builds, live ads in release builds
    retry: [5, 15, 30, 60, 120],      // seconds between attempts after a failure (no network, no fill)
    initTimeout: 20, loadTimeout: 40, // seconds before a step that has not answered counts as failed
  };
  const plugin = () => { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.PipAds || null; };
  const fake = PP.debug || /[?&]fakeads\b/.test(location.search);
  let tries = 0, timer = 0, inited = false, retryAt = 0, announced = false;
  const changed = () => PP.emit('adsStatus', A.status());
  // a native call that rejects if it has not answered in time
  const within = (p, s, stage) => new Promise((res, rej) => {
    const t = setTimeout(() => rej({ code: 'TIMEOUT', message: stage + ' did not answer in ' + s + ' s' }), s * 1000);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
  const errOf = (e, stage) => ({ stage, code: (e && e.code) || 'ERROR', message: (e && (e.message || e.errorMessage)) || String(e), at: Date.now() });

  const A = PP.ads = {
    state: 'off',      // off | init | loading | ready | showing | wait
    error: null,       // { stage, code, message } of the last failure, until something succeeds
    testMode: null, version: '',
    native: () => !!plugin(),
    // an ad can be offered right now
    ready: () => (plugin() ? A.state === 'ready' : fake),
    // there is an ad network at all (an Android build, or the stand-in)
    exists: () => !!plugin() || fake,
    init() {
      const P = plugin();
      if (!P || A.state !== 'off') return;
      A.state = 'init'; changed();
      within(P.init({ gameId: CFG.gameId, testMode: CFG.testMode, personalised: !!PP.settings.get('adsPersonal') }), CFG.initTimeout, 'Starting Unity Ads')
        .then(r => { inited = true; A.testMode = !!(r && r.testMode); A.version = (r && r.version) || ''; A.error = null; A.state = 'off'; A.load(); })
        .catch(e => { A.error = errOf(e, 'init'); A.later(); });
    },
    load() {
      const P = plugin();
      if (!P || A.state === 'loading' || A.state === 'ready' || A.state === 'showing') return;
      A.state = 'loading'; changed();
      within(P.load({ placementId: CFG.placement }), CFG.loadTimeout, 'Loading an ad')
        .then(() => {
          A.state = 'ready'; A.error = null; tries = 0; changed();
          if (A.testMode && !announced) { announced = true; if (PP.ui && PP.ui.toast) PP.ui.toast('Unity test ad ready'); }
        })
        .catch(e => { A.error = errOf(e, 'load'); A.later(); });
    },
    later() {
      A.state = 'wait';
      clearTimeout(timer);
      const s = CFG.retry[Math.min(tries++, CFG.retry.length - 1)];
      retryAt = Date.now() + s * 1000;
      changed();
      timer = setTimeout(() => { if (A.state !== 'wait') return; A.state = 'off'; if (inited) A.load(); else A.init(); }, s * 1000);
    },
    // try again now (Settings), instead of waiting for the next retry
    retry() { if (!plugin() || A.state !== 'wait') return; clearTimeout(timer); A.state = 'off'; tries = 0; if (inited) A.load(); else A.init(); },
    privacy(personalised) { const P = plugin(); if (P && P.setPrivacy) P.setPrivacy({ personalised: !!personalised }).catch(() => {}); },
    // play the ad; resolves { rewarded: true } only when the player watched it through
    show() {
      const P = plugin();
      if (!P) return fake ? fakeShow() : Promise.resolve({ rewarded: false });
      if (A.state !== 'ready') return Promise.resolve({ rewarded: false });
      A.state = 'showing'; changed();
      Kit.audio.hold(true);
      return P.show({ placementId: CFG.placement })
        .then(r => ({ rewarded: !!(r && r.rewarded) }))
        .catch(e => { A.error = errOf(e, 'show'); return { rewarded: false }; })
        .then(r => { Kit.audio.hold(false); A.state = 'off'; changed(); A.load(); return r; });
    },
    // the state in words, for Settings and the offer card
    status() {
      const e = A.error, mode = A.testMode ? 'Unity test ads' : A.testMode === false ? 'live Unity ads' : 'Unity Ads';
      if (!plugin()) return { ok: fake, text: fake ? 'Browser build: a stand-in test ad plays instead of Unity.' : 'Ads play in the Android app only.' };
      const why = e ? (e.stage === 'init' ? 'Unity Ads could not start' : e.stage === 'load' ? 'No ad loaded' : 'The last ad failed to play') + ': ' + e.code + (e.message && e.message !== e.code ? ' (' + e.message + ')' : '') : '';
      if (A.state === 'ready') return { ok: true, text: 'Ready: an ad is loaded (' + mode + ').' };
      if (A.state === 'showing') return { ok: true, text: 'Playing an ad…' };
      if (A.state === 'init') return { ok: false, text: 'Starting Unity Ads…' };
      if (A.state === 'loading') return { ok: false, text: 'Loading an ad (' + mode + ')…' };
      if (A.state === 'wait') return { ok: false, error: true, text: why + '. Trying again in ' + Math.max(1, Math.round((retryAt - Date.now()) / 1000)) + ' s.' };
      return { ok: false, text: why || 'Not started yet.' };
    },
    // Settings, in test builds: play an ad now to check the whole chain works (no reward)
    test() {
      if (A.ready()) return A.show().then(r => { if (PP.ui && PP.ui.toast) PP.ui.toast(r.rewarded ? 'Test ad watched through' : 'Test ad closed early'); return r; });
      A.retry();
      if (PP.ui && PP.ui.toast) PP.ui.toast('No ad loaded yet: ' + A.status().text);
      return Promise.resolve({ rewarded: false });
    },
  };
  if (plugin()) {
    // after an ad has sat unused for a long while, the SDK expires it: fetch a fresh one
    const P = plugin();
    if (P.addListener) P.addListener('expired', () => { A.state = 'off'; A.load(); });
    setTimeout(() => A.init(), 1200); // after boot, so the profile's privacy choice is known
  }

  // the browser stand-in: a three-second "test ad" card that can be closed early (no reward then)
  function fakeShow() {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'fake-ad';
      el.innerHTML = '<div class="fake-ad-card"><b>Test ad</b><span>A real ad plays here on Android.</span><i></i><button type="button">Close</button></div>';
      document.body.appendChild(el);
      Kit.audio.hold(true);
      let left = PP.debug && window.__ppFastAds ? 0.2 : 3;
      const bar = el.querySelector('i'), btn = el.querySelector('button');
      const t0 = performance.now();
      const done = rewarded => { clearInterval(iv); el.remove(); Kit.audio.hold(false); resolve({ rewarded }); };
      const iv = setInterval(() => { const k = (performance.now() - t0) / 1000 / left; bar.style.width = Math.min(100, k * 100) + '%'; if (k >= 1) done(true); }, 50);
      btn.addEventListener('click', () => done(false));
    });
  }
})();
