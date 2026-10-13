/* The Hangar: the five bats, each drawn by the parametric bat renderer, with their abilities, a sidegrade stat
 * profile, the exact price next to the balance, and Practice Hollow to fly any arrived bat for free. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, U = PP.ui, h = U.h;
  const HG = PP.hangar = {};
  const live = [];
  let raf = 0;

  // paint a bat into a canvas, sharp at the screen's pixel density and framed so the whole bat shows, hovering on
  // slow wingbeats (still when t is not given); a bat that has not arrived yet is a shadow with glowing eyes
  HG.paintBat = function (cv, bat, t, locked) {
    const dpr = Math.min(4, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || +cv.dataset.w || 64, ch = cv.clientHeight || +cv.dataset.h || 64;
    const W = Math.max(2, Math.round(cw * dpr)), H = Math.max(2, Math.round(ch * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'), look = bat.look;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const box = PP.R.batBox(look), k = (look.size || 1) * 1.05;
    const s = Math.min(W * 0.92 / (2 * box.half * k), H * 0.88 / ((box.bottom - box.top) * k));
    const tt = t || 0, ph = tt * 2.6 * (look.flap || 1);
    const b = { x: W / 2, y: H / 2 - (box.top + box.bottom) / 2 * s * k + (t ? Math.sin(tt * 1.7) * H * 0.012 : 0), vx: 0, face: 1, flap: 0, glide: 0,
      wa: t ? 0.22 + 0.3 * Math.sin(ph) : 0.3, ws: t ? 0.97 + 0.03 * Math.cos(ph) : 1, blink: Math.sin(tt * 1.3) > 0.97 ? -1 : 1, rim: 0 };
    const prev = PP.R.ppu; PP.R.ppu = 1;
    if (!locked) PP.R.glow(g, b.x, b.y, Math.min(W, H) * 0.55, look.eyeGlow || PP.P.warm, 0.14);
    PP.R.drawBat(g, b, tt, s, locked ? PP.R.shadowLook(look) : look, { glow: false, still: true });
    PP.R.ppu = prev;
  };
  function tick(now) {
    raf = 0;
    if (!live.length) return;
    for (const L of live) HG.paintBat(L.cv, L.bat, now / 1000 + L.ph, L.locked);
    raf = requestAnimationFrame(tick);
  }

  const STATS = [['Speed', s => s.maxV / 330], ['Turning', s => s.acc / 1400], ['Sonar reach', s => s.chirpR / 560], ['Echo life', s => s.echoLife / 3], ['Energy', s => s.energy / 120], ['Thrift', s => 0.9 / s.drain]];
  U.def('hangar', () => {
    const p = PP.profile.get(), list = [];
    live.length = 0;
    list.push(h('p.muted', { text: 'Bats are sidegrades, not upgrades: each hears the dark differently. Every Moon can be earned with Pip. Practice Hollow lets you fly any bat that has arrived, for free.' }));
    for (const bat of PP.data.bats) {
      const owned = PP.profile.owns(bat.id), arrived = PP.profile.arrived(bat), price = PP.economy.price(bat.id), sel = p.bats.selected === bat.id;
      const cv = h('canvas', { width: 64, height: 64, 'aria-hidden': 'true' });
      live.push({ cv, bat, ph: live.length * 1.3, locked: !arrived });
      const bars = h('div.bars');
      for (const [name, f] of STATS) { bars.appendChild(h('span', { text: name })); bars.appendChild(h('div.bar', null, h('i', { style: 'width:' + Math.round(Math.min(1, f(bat.stats)) * 100) + '%' }))); }
      const acts = h('div.row');
      if (owned) acts.appendChild(sel ? h('span.tag', { text: 'Flying' }) : h('button.btn.ghost', { text: 'Choose', onclick: () => { PP.uiSfx(); PP.profile.select(bat.id); U.refresh(); } }));
      else if (arrived) {
        const can = p.moths >= price;
        acts.appendChild(h('button.btn.gold', { disabled: !can, text: 'Welcome ' + bat.name, onclick: () => { if (PP.profile.buy(bat.id)) { PP.uiSfx('buy'); U.toast(bat.name + ' joins the colony'); U.refresh(); } } }));
        acts.appendChild(h('span.price', { text: Kit.fmt(price) + ' moths' }));
        if (!can) acts.appendChild(h('span.muted', { text: Kit.fmt(price - p.moths) + ' more' }));
      } else {
        const ac = PP.profile.arrivalCave(bat), cv2 = PP.game.caveById(ac);
        acts.appendChild(h('span.tag.gold', { text: Kit.fmt(price) + ' moths' }));
        acts.appendChild(h('span.muted', { text: 'Arrives after ' + (bat.arrives.after === ac ? ac + ' ' + (cv2 ? cv2.name : '') : PP.biome(['', 'chalk', 'drowned', 'glass', 'owlstone'][+bat.arrives.after[0]] || 'chalk').name + ' ' + bat.arrives.after.slice(2) + ' (for now: ' + ac + ')') }));
      }
      if (arrived) acts.appendChild(h('button.btn.ghost', { text: 'Practice', onclick: () => { PP.uiSfx(); PP.game.startPractice(bat.id); } }));
      if (arrived && !owned) p.seen.bats[bat.id] = true;
      list.push(h('div.card' + (sel ? '.lit' : ''), null, [
        h('div.hangar-bat', null, [h('div.pv', null, cv), h('div', null, [h('div.eyebrow', { text: bat.species }), h('h3', { text: bat.name }), h('p', { text: bat.blurb })]), h('div', null, [h('p', null, [h('b', { style: 'color:var(--teal)', text: bat.ability.name + ': ' }), bat.ability.text]), bars])]),
        acts,
      ]));
    }
    PP.profile.save();
    const el = h('div.scr.scrim', null, [U.top('Hangar'), h('div.body', null, h('div.wrap', null, list))]);
    return { el, scene: 'roost', show() { if (!raf) raf = requestAnimationFrame(tick); }, hide() { live.length = 0; } };
  });
})();
