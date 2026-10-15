/* The Hangar: the five bats, each drawn by the parametric bat renderer, with their abilities, a sidegrade stat
 * profile (each stat explained, compared across the colony and with Pip), the exact price next to the balance, and
 * Practice Hollow, the first action on every bat that has arrived, to fly it for free. */
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

  // the six numbers on each card, read straight from the stats js/bat.js, js/echo.js and js/run.js fly by: the bar
  // places the bat among the colony (shortest to longest), the figure says how far it is from Pip, the measure
  const STATS = [
    { name: 'Speed', v: s => s.maxV, what: 'Top cruising speed. Faster crosses a cave sooner and outruns floods, but the walls come at you quicker.' },
    { name: 'Turning', v: s => s.acc, what: 'How fast the bat picks up speed and changes direction. Higher threads tight passages and dodges late.' },
    { name: 'Sonar reach', v: s => s.chirpR, what: 'How far one chirp lights the cave. Shorter reach takes more chirps to see the same tunnel.' },
    { name: 'Echo life', v: s => s.echoLife, what: 'How long lit rock stays visible after a chirp. Longer gives you more time to read the way ahead.' },
    { name: 'Energy', v: s => s.energy, what: 'The size of the energy bar. Less energy makes every moth count.' },
    { name: 'Efficiency', v: s => 1 / s.drain, what: 'How slowly energy drains in flight. Higher stretches each moth further.' },
  ];
  const range = st => { const vs = PP.data.bats.map(b => st.v(b.stats)); return [Math.min.apply(null, vs), Math.max.apply(null, vs)]; };
  const pct = (v, base) => { const d = Math.round((v / base - 1) * 100); return d === 0 ? '' : (d > 0 ? '+' : '−') + Math.abs(d) + '%'; };
  const statRows = bat => {
    const pip = PP.data.bats[0].stats, bars = h('div.bars' + (bat.id === 'pip' ? '.base' : ''));
    for (const st of STATS) {
      const [lo, hi] = range(st), v = st.v(bat.stats), k = hi > lo ? 0.18 + 0.82 * (v - lo) / (hi - lo) : 0.6, d = bat.id === 'pip' ? '' : pct(v, st.v(pip));
      bars.appendChild(h('span', { text: st.name }));
      bars.appendChild(h('div.bar', null, h('i', { style: 'width:' + Math.round(k * 100) + '%' })));
      if (bat.id !== 'pip') bars.appendChild(h('b.delta' + (d[0] === '+' ? '.up' : d ? '.down' : ''), { text: d }));
    }
    return bars;
  };
  const arrivalText = bat => {
    const ac = PP.profile.arrivalCave(bat), cv = PP.game.caveById(ac);
    return 'Arrives after ' + (bat.arrives.after === ac ? ac + ' ' + (cv ? cv.name : '') : PP.biome(['', 'chalk', 'drowned', 'glass', 'owlstone'][+bat.arrives.after[0]] || 'chalk').name + ' ' + bat.arrives.after.slice(2) + ' (for now: ' + ac + ')');
  };
  U.def('hangar', () => {
    const p = PP.profile.get(), list = [];
    live.length = 0;
    list.push(h('p.hangar-intro', { text: 'Every bat hears the dark differently. Each has unique strengths, and every Moon can be earned with Pip.' }));
    // the small print, out of the way: Practice Hollow, and what the stats do in a flight
    const key = h('details.hinfo.statkey', null, [h('summary', null, [h('i.ii', { text: '?' }), h('span', { text: 'What the stats mean' })]),
      h('dl', null, STATS.map(st => [h('dt', { text: st.name }), h('dd', { text: st.what })]).flat()),
      h('p', { text: 'Bars compare the five bats. Figures show the difference from Pip.' })]);
    list.push(h('div.hinfos', null, [
      h('div.hinfo', null, [h('i.ii', { text: 'i' }), h('p', null, [h('b', { text: 'Practice Hollow' }), ' Fly any bat that has arrived, free: no energy drain, nothing to lose.'])]),
      key,
    ]));
    for (const bat of PP.data.bats) {
      const owned = PP.profile.owns(bat.id), arrived = PP.profile.arrived(bat), price = PP.economy.price(bat.id), sel = p.bats.selected === bat.id;
      const fresh = arrived && !owned && !p.seen.bats[bat.id];
      const cv = h('canvas', { width: 64, height: 64, 'aria-hidden': 'true' });
      live.push({ cv, bat, ph: live.length * 1.3, locked: !arrived });
      // where the bat stands, small, beside its name
      const chip = sel ? h('span.hchip.fly', { text: 'Flying' }) : owned ? h('span.hchip', { text: 'In your colony' })
        : arrived ? h('span.hchip.gold', { text: fresh ? 'New' : 'Arrived' }) : h('span.hchip.lock', { text: 'On its way' });
      const acts = h('div.hacts' + (arrived ? '' : '.later'));
      if (arrived) acts.appendChild(h('button.btn.practice', { onclick: () => { PP.uiSfx(); PP.game.startPractice(bat.id); } }, [h('i.play'), h('span', { text: 'Practice' })]));
      if (owned && !sel) acts.appendChild(h('button.btn.ghost', { text: 'Choose', onclick: () => { PP.uiSfx(); PP.profile.select(bat.id); U.refresh(); } }));
      else if (arrived && !owned) {
        const can = p.moths >= price;
        acts.appendChild(h('button.btn.ghost.welcome', { disabled: !can, onclick: () => { if (PP.profile.buy(bat.id)) { PP.uiSfx('buy'); U.toast(bat.name + ' joins the colony'); U.refresh(); } } }, [h('span', { text: 'Welcome' }), h('b', { text: Kit.fmt(price) })]));
        if (!can) acts.appendChild(h('span.muted.short', { text: Kit.fmt(price - p.moths) + ' more moths' }));
      } else if (!arrived) {
        acts.appendChild(h('span.hlock', null, [h('i.lk'), h('span', { text: arrivalText(bat) })]));
        acts.appendChild(h('span.price.dim', { text: Kit.fmt(price) + ' moths' }));
      }
      if (fresh) p.seen.bats[bat.id] = true;
      list.push(h('div.card.hcard' + (sel ? '.lit' : '') + (!arrived ? '.locked' : ''), null, [
        h('div.hangar-bat', null, [
          h('div.pv', null, cv),
          h('div.htext', null, [
            h('div.hhead', null, [h('div', null, [h('div.eyebrow', { text: bat.species }), h('h3', { text: bat.name })]), chip]),
            h('p.blurb', { text: bat.blurb }),
            h('p.ability', null, [h('b', { text: bat.ability.name + ': ' }), bat.ability.text]),
            statRows(bat),
            acts,
          ]),
        ]),
      ]));
    }
    PP.profile.save();
    const el = h('div.scr.scrim', null, [U.top('Hangar'), h('div.body', null, h('div.wrap.hangar', null, list))]);
    return { el, scene: 'roost', show() { if (!raf) raf = requestAnimationFrame(tick); }, hide() { live.length = 0; } };
  });
})();
