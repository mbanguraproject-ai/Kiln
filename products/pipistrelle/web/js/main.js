/* Boot: the profile and settings, the renderer, the fixed-step loop with the frame-time governor, input, the
 * Android Back button and immersive mode, then the title. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, U = PP.ui;

  function boot() {
    PP.profile.get();
    const canvas = document.getElementById('game');
    PP.R.init(canvas);
    PP.settings.apply();
    if (PP.keyart) document.documentElement.classList.add('kiln-keyart');

    let last = 0, work = 0;
    const loop = PP.loop = PP.run.loop = Kit.loop({
      update(dt) { const t0 = performance.now(); PP.run.update(dt); work += performance.now() - t0; },
      draw() {
        const t0 = performance.now();
        PP.R.frame();
        const now = performance.now();
        if (last && loop.running && !loop.paused) PP.R.quality.frame(now - last, work + (now - t0));
        last = now; work = 0;
      },
      ready: false,
    });
    document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden && U.curName === 'flight') PP.game.pause(); });

    // input: a relative drag stick, taps and holds, keys
    const input = PP.input.kit = Kit.input(canvas);
    const canControl = () => { const G = PP.G; return !!(G && G.mode === 'play' && U.curName === 'flight' && !loop.paused); };
    input.on('down', p => { if (canControl()) PP.input.down(p); else if (PP.G && PP.G.sub === 'rescue' && !loop.paused) PP.rescue.tap(); });
    input.on('move', p => { if (canControl()) PP.input.move(p); });
    input.on('up', p => PP.input.up(p, canControl()));
    addEventListener('keydown', e => {
      if (PP.G && PP.G.sub === 'rescue' && (e.key === ' ' || e.key === 'Enter') && !loop.paused) { PP.rescue.tap(); e.preventDefault(); return; }
      if (e.key === 'Escape' || e.key === 'Backspace') { if (U.curName === 'flight') PP.game.pause(); else U.back(); e.preventDefault(); }
      else if ((e.key === 'p' || e.key === 'P') && U.curName === 'flight') PP.game.pause();
      else if (e.key === 'Enter' && U.curName === 'flight' && PP.G && PP.G.sub === 'night') PP.night.skip();
    });

    // Android: Back goes up one screen; the app stays immersive (system bars hidden)
    const cap = window.Capacitor, App = cap && cap.Plugins && cap.Plugins.App;
    if (App && App.addListener) {
      App.addListener('backButton', () => { if (U.curName === 'flight') { PP.game.pause(); return; } if (!U.back() && U.curName === 'title' && App.exitApp) App.exitApp(); });
      App.addListener('pause', () => { if (U.curName === 'flight') PP.game.pause(); window.Arcade.emit('pause'); });
      App.addListener('resume', () => { window.Arcade.emit('resume'); U.bars('hide'); });
    }
    U.bars('hide');

    PP.game.attract();
    loop.step(40);
    loop.start();
    U.show('title', {}, { reset: true });
    PP.booted = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
