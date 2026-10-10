/* Kiln game SDK (v1): the contract between the Kiln hub and each game.
 *
 * A game page loads this file before its own script:
 *   <script src="../../hub/sdk.js"></script>
 * It works embedded in the hub (an iframe) and standalone (the game page opened directly).
 * See docs/GAME_CONTRACT.md for what every game must do with it.
 */
(function () {
  'use strict';
  if (window.Arcade) return;

  var PROTOCOL = 1;
  var PREFIX = 'kiln:';
  // Key-art mode (tools/make-art.cjs): the game shows only its play surface, for card art. Nothing is logged.
  var keyart = /[?&]keyart\b/.test(location.search);
  if (keyart) document.documentElement.classList.add('kiln-keyart');
  // Capture and test hooks (tools/make-art.cjs, make-shots.cjs, game-check.cjs) only act with these in the URL.
  var debug = /[?&]debug\b/.test(location.search);
  var sceneWanted = (location.search.match(/[?&]scene=([\w-]+)/) || [])[1] || null;
  var embedded = false;
  try { embedded = window.parent !== window; } catch (e) { embedded = true; }

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  // localStorage with an in-memory fallback (private windows, sandboxed frames).
  var memory = {};
  var ls = {
    get: function (k, d) {
      var raw = safe(function () { return localStorage.getItem(PREFIX + k); }, undefined);
      if (raw === undefined) raw = Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
      if (raw == null) return d;
      try { return JSON.parse(raw); } catch (e) { return d; }
    },
    set: function (k, v) {
      var raw = JSON.stringify(v);
      memory[k] = raw;
      safe(function () { localStorage.setItem(PREFIX + k, raw); });
    },
    del: function (k) {
      delete memory[k];
      safe(function () { localStorage.removeItem(PREFIX + k); });
    },
  };

  // The Capacitor bridge lives in the hub's window; games in the hub's iframe reach it through the parent.
  function nativeHaptics() {
    var cap = window.Capacitor || safe(function () { return window.parent.Capacitor; }, null);
    return cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Haptics || null;
  }

  function buzz(pattern) {
    var native = nativeHaptics();
    if (native) {
      var ms = Array.isArray(pattern)
        ? pattern.reduce(function (sum, v, i) { return i % 2 === 0 ? sum + (v | 0) : sum; }, 0)
        : pattern | 0;
      safe(function () {
        if (ms <= 12) native.impact({ style: 'LIGHT' });
        else if (ms <= 30) native.impact({ style: 'MEDIUM' });
        else native.vibrate({ duration: Math.min(ms, 600) });
      });
      return;
    }
    if (navigator.vibrate) safe(function () { navigator.vibrate(pattern); });
  }

  function rid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  var DEFAULT_SETTINGS = { sound: true, vibration: true, theme: 'system', shareStats: false };

  // Event log kept on the device. The hub is the only writer when a game is embedded.
  var Log = {
    KEY: 'events',
    MAX: 5000,
    uid: function () {
      var u = ls.get('uid', null);
      if (!u) { u = rid(); ls.set('uid', u); }
      return u;
    },
    append: function (events) {
      var all = ls.get(this.KEY, []);
      if (!Array.isArray(all)) all = [];
      for (var i = 0; i < events.length; i++) all.push(events[i]);
      if (all.length > this.MAX) all.splice(0, all.length - this.MAX);
      ls.set(this.KEY, all);
    },
    all: function () {
      var all = ls.get(this.KEY, []);
      return Array.isArray(all) ? all : [];
    },
    clear: function () { ls.del(this.KEY); },
  };

  var state = {
    id: 'unknown',
    title: '',
    version: '0',
    sid: rid(),
    run: null,
    ready: false,
    settings: Object.assign({}, DEFAULT_SETTINGS, ls.get('settings', {})),
  };
  var listeners = {};
  var sceneFns = {};
  var sceneRan = false;
  var testApi = null;

  // Runs the scene named in ?scene= once the game is ready and has registered it, then flags the page
  // so the capture tools know the frame is worth taking.
  function runScene() {
    if (sceneRan || !sceneWanted || !state.ready || !Object.keys(sceneFns).length) return;
    sceneRan = true;
    var root = document.documentElement;
    var fn = sceneFns[sceneWanted];
    if (!fn) {
      root.dataset.sceneError = 'no scene named ' + sceneWanted;
      root.dataset.sceneDone = 'error';
      return;
    }
    setTimeout(function () {
      new Promise(function (resolve) { resolve(fn()); }).then(function () {
        root.dataset.sceneDone = '1';
      }, function (err) {
        root.dataset.sceneError = String(err && err.message || err);
        root.dataset.sceneDone = 'error';
      });
    }, 0);
  }

  function emit(type, payload) {
    var list = listeners[type] || [];
    for (var i = 0; i < list.length; i++) safe(function () { list[i](payload); });
  }
  function post(msg) {
    if (!embedded) return;
    msg.kiln = PROTOCOL;
    safe(function () { window.parent.postMessage(msg, '*'); });
  }
  function record(ev, props) {
    if (keyart) return;
    var e = Object.assign({ ts: Date.now(), ev: ev, game: state.id }, props || {});
    if (embedded) post({ type: 'event', event: e });
    else Log.append([Object.assign(e, { uid: Log.uid(), sid: state.sid, src: 'standalone' })]);
  }
  function applyTheme() {
    var t = state.settings.theme;
    var root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.kiln !== PROTOCOL || e.source !== window.parent) return;
    if (m.type === 'settings') {
      state.settings = Object.assign({}, state.settings, m.settings);
      applyTheme();
      emit('settings', state.settings);
    } else if (m.type === 'pause') {
      emit('pause');
    } else if (m.type === 'resume') {
      emit('resume');
    }
  });
  document.addEventListener('visibilitychange', function () {
    emit(document.hidden ? 'pause' : 'resume');
  });

  var Arcade = {
    protocol: PROTOCOL,
    embedded: embedded,
    keyart: keyart,

    // Call once at boot. meta: { id, title, version }
    init: function (meta) {
      meta = meta || {};
      state.id = String(meta.id || 'unknown');
      state.title = String(meta.title || state.id);
      state.version = String(meta.version || '0');
      applyTheme();
      post({ type: 'hello', id: state.id, title: state.title, version: state.version });
      record('game_open', { version: state.version });
      return { embedded: embedded, settings: Object.assign({}, state.settings) };
    },

    // Current settings: { sound, vibration, theme, shareStats }
    get settings() { return Object.assign({}, state.settings); },

    // Change a player setting. Embedded games normally leave this to the hub.
    setSetting: function (key, value) {
      state.settings[key] = value;
      if (embedded) post({ type: 'setting', key: key, value: value });
      else ls.set('settings', state.settings);
      applyTheme();
      emit('settings', Object.assign({}, state.settings));
    },

    // type: 'settings' | 'pause' | 'resume'
    on: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },

    // Call once the first frame is drawn and the game can be played.
    ready: function () {
      if (state.ready) return;
      state.ready = true;
      document.documentElement.dataset.kilnReady = '1';
      post({ type: 'ready', id: state.id });
      runScene();
    },

    // A run is one attempt: from the start of play to game over (or restart/quit).
    runStart: function (props) {
      if (state.run) Arcade.runEnd({ reason: 'abandoned' });
      state.run = { t0: Date.now() };
      record('run_start', props);
    },
    runEnd: function (props) {
      if (!state.run) return;
      var p = Object.assign({}, props);
      p.duration_s = Math.round((Date.now() - state.run.t0) / 100) / 10;
      state.run = null;
      record('run_end', p);
      if (typeof p.score === 'number' && isFinite(p.score)) {
        var best = ls.get(state.id + ':best', 0);
        if (p.score > best) ls.set(state.id + ':best', p.score);
        post({ type: 'score', id: state.id, score: p.score });
      }
    },
    inRun: function () { return !!state.run; },

    // Key moments worth counting: 'tutorial_complete', 'level_complete', 'share', ...
    track: function (name, props) { record(String(name), props); },

    // Tell Kiln whether there is a saved run to come back to, so Home can offer Resume truthfully.
    // p: { label: 'Pond 6', pct?: 20 } while a run is saved, or null once it is over. Games without saves never call it.
    // pct (0..100) only when it is a true completion measure, such as level 6 of 30; Home then shows a progress bar.
    progress: function (p) {
      if (keyart) return;
      var v = p && p.label ? { label: String(p.label).slice(0, 40) } : null;
      if (v && typeof p.pct === 'number' && isFinite(p.pct)) v.pct = Math.round(Math.max(0, Math.min(100, p.pct)));
      var prev = ls.get(state.id + ':progress', null);
      if (!v && !prev) return;
      if (v && prev && prev.label === v.label && prev.pct === v.pct) return;
      if (v) ls.set(state.id + ':progress', Object.assign({ ts: Date.now() }, v));
      else ls.del(state.id + ':progress');
      post({ type: 'progress', id: state.id, progress: v });
    },

    // Capture scenes for the card art and screenshots: { art, shot1, shot2 }, each a function (may return a
    // promise) that puts the game into a representative, seeded state. Run by the SDK only with ?scene=<name>.
    scenes: function (map) {
      for (var k in map) if (typeof map[k] === 'function') sceneFns[k] = map[k];
      runScene();
    },

    // Test hook for tools/game-check.cjs: { start(), lose(), state() -> { phase, score, paused } }.
    // Later calls add to or override earlier ones (the kit's shell registers defaults a game can extend).
    // Exposed as window.__kilnTest only with ?debug.
    test: function (api) {
      testApi = Object.assign(testApi || {}, api);
      if (debug) window.__kilnTest = testApi;
    },

    // Per-game saved data.
    store: {
      get: function (k, d) { return ls.get(state.id + ':' + k, d); },
      set: function (k, v) { ls.set(state.id + ':' + k, v); },
      del: function (k) { ls.del(state.id + ':' + k); },
    },

    // Vibration that respects the player's setting. Inside the Android app it goes through the
    // native Haptics plugin (Android's WebView ignores navigator.vibrate).
    haptic: function (pattern) {
      if (state.settings.vibration) buzz(pattern);
    },

    // Ask the hub to close this game (no-op when standalone).
    exit: function () {
      if (state.run) Arcade.runEnd({ reason: 'quit' });
      post({ type: 'exit', id: state.id });
    },

    // Used by the hub.
    _log: Log,
    _ls: ls,
    _rid: rid,
    _buzz: buzz,
    _defaults: DEFAULT_SETTINGS,
    // Used by the capture tools to tell scene-driven games from legacy ones.
    _scenes: function () { return Object.keys(sceneFns); },
  };

  window.Arcade = Arcade;
})();
