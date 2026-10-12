/* The Hangar: the five bats, each drawn by the parametric bat renderer, with their abilities, a sidegrade stat
 * profile, the exact price next to the balance, and Practice Hollow to fly any arrived bat for free. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, U = PP.ui, h = U.h;
  const HG = PP.hangar = {};
  const live = [];
  let raf = 0;

  // paint a bat into a small canvas (animated when t is given)
  HG.paintBat = function (cv, bat, scale, t, locked) {
    const g = cv.getContext('2d'), w = cv.width, hh = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, hh);
    const prev = PP.R.ppu; PP.R.ppu = 1;
    const s = w / 64 * (scale || 1);
    const tt = t || 0;
    const b = { x: w / 2, y: hh * 0.56, vx: 0, face: 1, flap: t ? tt * 9 * (bat.look.flap || 1) : 1.1, glide: 0, blink: Math.sin(tt * 1.3) > 0.96 ? -1 : 1, rim: 0.25 + 0.2 * Math.sin(tt * 2) };
    if (!locked) PP.R.glow(g, b.x, b.y, w * 0.4, PP.P.warm, 0.16);
    g.globalAlpha = locked ? 0.35 : 1;
    PP.R.drawBat(g, b, tt, s * 1.9, bat.look, { glow: false });
    g.globalAlpha = 1;
    PP.R.ppu = prev;
  };
  function tick(now) {
    raf = 0;
    if (!live.length) return;
    for (const L of live) HG.paintBat(L.cv, L.bat, 1, now / 1000 + L.ph, L.locked);
    raf = requestAnimationFrame(tick);
  }

  const STATS = [['Speed', s => s.maxV / 330], ['Turning', s => s.acc / 1400], ['Sonar reach', s => s.chirpR / 560], ['Echo life', s => s.echoLife / 3], ['Energy', s => s.energy / 120], ['Thrift', s => 0.9 / s.drain]];
  U.def('hangar', () => {
    const p = PP.profile.get(), list = [];
    live.length = 0;
    list.push(h('p.muted', { text: 'Bats are sidegrades, not upgrades: each hears the dark differently. Every Moon can be earned with Pip. Practice Hollow lets you fly any bat that has arrived, for free.' }));
    for (const bat of PP.data.bats) {
      const owned = PP.profile.owns(bat.id), arrived = PP.profile.arrived(bat), price = PP.economy.price(bat.id), sel = p.bats.selected === bat.id;
      const cv = h('canvas', { width: 192, height: 192, 'aria-hidden': 'true' });
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
