/* The screen manager: one screen at a time over the canvas, a back stack (Android Back goes up one screen), small
 * DOM helpers, moon icons and the flight screen's buttons. Screens register in js/ui/screens.js and hangar.js. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit;
  const root = () => document.getElementById('ui');
  const U = PP.ui = { screens: {}, stack: [], cur: null, curName: '' };

  // h('div.card.lit', { onclick }, [children or text])
  U.h = function (sel, attrs, kids) {
    const m = sel.split('.'), el = document.createElement(m[0] || 'div');
    if (m.length > 1) el.className = m.slice(1).join(' ');
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    if (kids != null) for (const c of [].concat(kids)) if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    return el;
  };
  const h = U.h;
  U.icon = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/></svg>',
  };
  U.moon = function (slot, state, big) {
    const on = state === 'on', lost = state === 'lost';
    const stroke = lost ? 'rgba(255,74,107,0.7)' : on ? '#fff4cf' : 'rgba(223,232,255,0.55)', fill = on ? '#fff4cf' : lost ? 'rgba(255,74,107,0.14)' : 'rgba(223,232,255,0.16)';
    const shape = slot === 2 ? '<circle cx="12" cy="12" r="9"/>' : slot === 1 ? '<path d="M12 3a9 9 0 0 1 0 18z"/>' : '<path d="M12 3a9 9 0 0 1 0 18a6.5 8 0 0 0 0-18z"/>';
    const el = h('span.moon' + (big ? '.lg' : '') + (on ? '.on' : ''));
    el.style.boxShadow = 'none';
    el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block;overflow:visible"><circle cx="12" cy="12" r="9" fill="none" stroke="${stroke}" stroke-width="1.8"/><g fill="${fill}">${shape}</g>${on ? '<circle cx="12" cy="12" r="11" fill="none" stroke="rgba(255,231,160,0.25)" stroke-width="2"/>' : ''}</svg>`;
    return el;
  };
  U.moons = function (arr, big) { const w = h('span.moons'); for (let i = 0; i < 3; i++) w.appendChild(U.moon(i, arr && arr[i] ? 'on' : 'off', big)); return w; };
  U.larder = () => h('span.larder', { title: 'Moths in the larder' }, [h('i'), Kit.fmt(PP.profile.get().moths)]);
  U.top = function (title, opts) {
    opts = opts || {};
    const kids = [];
    if (opts.back !== false) kids.push(h('button.icon-btn', { 'aria-label': 'Back', html: U.icon.back, onclick: () => { PP.uiSfx(); U.back(); } }));
    kids.push(h('h2', { text: title }));
    if (opts.larder !== false) kids.push(U.larder());
    if (opts.extra) kids.push(opts.extra);
    return h('div.top', null, kids);
  };
  U.toast = function (text, ms) {
    const t = h('div.toast-ui', { text });
    root().appendChild(t);
    setTimeout(() => t.remove(), ms || 2200);
  };

  // show a screen: name, args; opts.replace swaps the top of the stack instead of pushing
  U.show = function (name, args, opts) {
    opts = opts || {};
    const def = U.screens[name];
    if (!def) throw new Error('no screen ' + name);
    if (U.cur && U.cur.hide) U.cur.hide();
    if (opts.reset) U.stack.length = 0;
    else if (opts.replace) U.stack.pop();
    U.stack.push({ name, args });
    U.mount(name, args);
  };
  U.mount = function (name, args) {
    const def = U.screens[name];
    const r = root();
    r.innerHTML = '';
    const scr = def.build(args || {});
    U.cur = scr; U.curName = name;
    r.appendChild(scr.el);
    if (scr.scene) PP.R.scene = scr.scene;
    if (scr.show) scr.show();
    document.body.dataset.screen = name;
    PP.emit('screen', name);
  };
  U.back = function () {
    if (U.cur && U.cur.back && U.cur.back() === true) return true;
    if (U.stack.length <= 1) return false;
    if (U.cur && U.cur.hide) U.cur.hide();
    U.stack.pop();
    const top = U.stack[U.stack.length - 1];
    U.mount(top.name, top.args);
    return true;
  };
  U.refresh = function () { const top = U.stack[U.stack.length - 1]; if (top) U.mount(top.name, top.args); };
  U.def = (name, build) => { U.screens[name] = { build }; };

  // immersive: hide Android's system bars in flight, show them in menus (a no-op on the web)
  U.bars = function (how) {
    const bars = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SystemBars;
    if (bars && typeof bars[how] === 'function') { try { Promise.resolve(bars[how]()).catch(() => {}); } catch (e) { /* not available */ } }
  };
})();
