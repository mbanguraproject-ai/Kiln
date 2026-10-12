/* Pipistrelle's own stand-in for the Kiln SDK (window.Arcade), so the vendored kit runs standalone.
 * Storage is localStorage under "pipistrelle:"; haptics use the Capacitor Haptics plugin when present,
 * else navigator.vibrate. Events: settings, pause, resume. Nothing here talks to a host page. */
(function () {
  'use strict';
  if (window.Arcade) return;
  const listeners = {};
  const mem = {};
  let ls = null;
  try { ls = window.localStorage; ls.setItem('pipistrelle:probe', '1'); ls.removeItem('pipistrelle:probe'); } catch (e) { ls = null; }
  const PREFIX = 'pipistrelle:';
  const cap = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null;

  const store = {
    get(k, d) {
      if (ls) { try { const v = ls.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
      return k in mem ? mem[k] : d;
    },
    set(k, v) {
      if (v === null || v === undefined) return store.del(k);
      if (ls) { try { ls.setItem(PREFIX + k, JSON.stringify(v)); return; } catch (e) { /* full: fall through */ } }
      mem[k] = v;
    },
    del(k) { if (ls) { try { ls.removeItem(PREFIX + k); } catch (e) { /* ignore */ } } delete mem[k]; },
    raw: () => ls,
  };

  const A = {
    embedded: false,
    keyart: /[?&]keyart\b/.test(location.search),
    settings: { sound: true, vibration: true },
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit(evt, data) { for (const fn of listeners[evt] || []) { try { fn(data); } catch (e) { console.error(e); } } },
    ready() { A.isReady = true; },
    runStart() {}, runEnd() {}, inRun() { return false; }, exit() {}, track() {}, progress() {}, scenes() {},
    setSetting(k, v) { A.settings[k] = v; A.emit('settings', A.settings); },
    haptic(pattern) {
      if (A.settings.vibration === false) return;
      const c = cap(), H = c && c.Plugins && c.Plugins.Haptics;
      if (H) {
        const ms = Array.isArray(pattern) ? pattern.reduce((s, v, i) => (i % 2 === 0 ? s + (v | 0) : s), 0) : pattern | 0;
        try {
          if (ms <= 12) H.impact({ style: 'LIGHT' });
          else if (ms <= 30) H.impact({ style: 'MEDIUM' });
          else H.vibrate({ duration: Math.min(ms, 600) });
        } catch (e) { /* ignore */ }
        return;
      }
      if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
    },
    test(hooks) { if (/[?&]debug\b/.test(location.search)) window.__ppTest = Object.assign(window.__ppTest || {}, hooks); },
    store,
  };
  window.Arcade = A;
})();
