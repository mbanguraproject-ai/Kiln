/* Rewarded ads (owner decision D15, 13 October 2026). Unity Ads, rewarded only: never an interstitial or a banner,
 * offered only at the Last Echo (js/rescue.js), at most once per attempt, and never shown without the player
 * tapping "Fly on". Ads are non-personalised unless the player allows personalised ads in Settings. Debug builds use
 * Unity's test mode ('auto' below), so our own installs never count as real traffic.
 *
 * On Android the native side is the PipAds plugin (android/.../PipAdsPlugin.java, Unity Ads SDK 4.21). In a
 * browser there is no ad network: with ?debug or ?fakeads a stand-in test ad plays instead, so the whole flow can
 * be tried and tested without a phone. Without either, no ad is offered and the game plays exactly as before. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const CFG = PP.data.ads = {
    gameId: '800397328',             // Unity Game ID (Android)
    placement: 'BP_Rewarded_Android', // the rewarded placement
    testMode: 'auto',                 // 'auto': test ads in debug builds, live ads in release builds
    retry: [10, 30, 60, 120],         // seconds between load attempts after a failure (no network, no fill)
  };
  const plugin = () => { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.PipAds || null; };
  const fake = PP.debug || /[?&]fakeads\b/.test(location.search);
  let tries = 0, timer = 0, inited = false;

  const A = PP.ads = {
    state: 'off',      // off | init | loading | ready | showing | wait
    native: () => !!plugin(),
    // an ad can be offered right now
    ready: () => (plugin() ? A.state === 'ready' : fake),
    // there is an ad network at all (an Android build, or the stand-in)
    exists: () => !!plugin() || fake,
    init() {
      const P = plugin();
      if (!P || A.state !== 'off') return;
      A.state = 'init';
      P.init({ gameId: CFG.gameId, testMode: CFG.testMode, personalised: !!PP.settings.get('adsPersonal') })
        .then(() => { inited = true; A.state = 'off'; A.load(); })
        .catch(() => A.later());
    },
    load() {
      const P = plugin();
      if (!P || A.state === 'loading' || A.state === 'ready' || A.state === 'showing') return;
      A.state = 'loading';
      P.load({ placementId: CFG.placement })
        .then(() => { A.state = 'ready'; tries = 0; })
        .catch(() => A.later());
    },
    later() {
      A.state = 'wait';
      clearTimeout(timer);
      const s = CFG.retry[Math.min(tries++, CFG.retry.length - 1)];
      timer = setTimeout(() => { if (A.state !== 'wait') return; A.state = 'off'; if (inited) A.load(); else A.init(); }, s * 1000);
    },
    privacy(personalised) { const P = plugin(); if (P && P.setPrivacy) P.setPrivacy({ personalised: !!personalised }).catch(() => {}); },
    // play the ad; resolves { rewarded: true } only when the player watched it through
    show() {
      const P = plugin();
      if (!P) return fake ? fakeShow() : Promise.resolve({ rewarded: false });
      if (A.state !== 'ready') return Promise.resolve({ rewarded: false });
      A.state = 'showing';
      Kit.audio.hold(true);
      return P.show({ placementId: CFG.placement })
        .then(r => ({ rewarded: !!(r && r.rewarded) }))
        .catch(() => ({ rewarded: false }))
        .then(r => { Kit.audio.hold(false); A.state = 'off'; A.load(); return r; });
    },
  };
  if (plugin()) {
    // after an ad has sat unused for a long while, the SDK expires it: fetch a fresh one
    const P = plugin();
    if (P.addListener) P.addListener('expired', () => { A.state = 'off'; A.load(); });
    setTimeout(() => A.init(), 1500); // after boot, so the profile's privacy choice is known
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
