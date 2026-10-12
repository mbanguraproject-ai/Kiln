/* The hazard registry. A hazard is a module with any of:
 *   phase    'terrain' (shapes cells: water, crystals) or 'entities' (default)
 *   place(lv, r, cfg, Q)          put its things into the cave (cfg is spec.hazards[id]; Q has the generator's queries)
 *   steer(dt, bat, inp)           push or hold the bat before it moves (currents, gusts, webs)
 *   update(dt, G, L)              simulate
 *   ping(E)                       a sonar ring reached its things: E = { ox, oy, R, t0, kind, ping(), addDot() }
 *   holes(hole, t)                cut light into the darkness: hole(x, y, radius, alpha)
 *   draw(ctx, t, V)               draw in world space (V: view rect, bat, inView())
 *   debug(L)                      a small summary for tests
 * Biomes add new hazards by registering them in their own files; caves switch them on with spec.hazards[id]. */
(function () {
  'use strict';
  const PP = window.PP;
  const list = [];
  const HZ = PP.hazards = {
    list,
    byId: {},
    def(id, h) { h.id = id; if (HZ.byId[id]) list.splice(list.indexOf(HZ.byId[id]), 1); HZ.byId[id] = h; list.push(h); return h; },
    place(lv, r, phase) {
      const hz = lv.sp.hazards || {};
      for (const h of list) {
        if ((h.phase || 'entities') !== phase || !h.place) continue;
        if (h.always || hz[h.id]) h.place(lv, r, hz[h.id] || {}, lv.q);
      }
    },
    each(fn, a, b, c, d) { for (let i = 0; i < list.length; i++) { const f = list[i][fn]; if (f) f(a, b, c, d); } },
    debug(L) { const out = {}; for (const h of list) if (h.debug) out[h.id] = h.debug(L); return out; },
  };
  // range of path indices for a hazard config's { from, to } (rising action: concentrate a gauntlet)
  HZ.range = (lv, cfg, from, to) => [Math.floor((cfg.from === undefined ? from : cfg.from) * lv.path.length), Math.floor((cfg.to === undefined ? to : cfg.to) * lv.path.length)];
  // world-space sound pan relative to the bat
  HZ.pan = x => PP.clamp((x - PP.G.bat.x) / 300, -1, 1);
})();
