/* Moons: three per cave (Homecoming, Kin, Mastery), earned independently across attempts. Each Moon type knows
 * when it is won (at the arch) and when it becomes impossible (it dims at once, and the HUD says why).
 * Run stats come from the event bus (js/run.js keeps G.stats). */
(function () {
  'use strict';
  const PP = window.PP;
  const D = () => PP.data.missions;

  const need = (m, L) => (m.all ? L.pups.length : Math.min(m.n || 1, L.pups.length));
  const TYPES = {
    home: { won: () => true },
    escape: { won: () => true },
    pups: { won: (m, G, L) => G.pupsHome >= need(m, L) },
    time: { won: (m, G) => G.stats.time <= m.max, lost: (m, G) => G.stats.time > m.max },
    bumps: { won: (m, G) => G.stats.bumps <= m.max, lost: (m, G) => G.stats.bumps > m.max },
    calls: { won: (m, G) => G.stats.calls <= m.max, lost: (m, G) => G.stats.calls > m.max },
    survey: { won: (m, G, L) => PP.missions.coverage(L) >= m.pct },
    larder: { won: (m, G) => G.stats.moths >= m.n, lost: (m, G, L) => G.stats.moths + L.moths.filter(x => !x.dead).length < m.n },
    noweb: { won: (m, G) => !G.stats.webs, lost: (m, G) => G.stats.webs > 0 },
    untouched: { won: (m, G) => !G.stats.collapse, lost: (m, G) => G.stats.collapse > 0 },
    energy: { won: (m, G) => G.stats.minEnergy >= m.min, lost: (m, G) => G.stats.minEnergy < m.min },
    nowake: { won: (m, G) => !G.stats.owlsWoken, lost: (m, G) => G.stats.owlsWoken > 0 },
    dry: { won: (m, G) => !G.stats.splashes, lost: (m, G) => G.stats.splashes > 0 },
    tidefree: { won: (m, G) => !G.stats.tide, lost: (m, G) => G.stats.tide > 0 },
    nosiphon: { won: (m, G) => !G.stats.siphons, lost: (m, G) => G.stats.siphons > 0 },
    tigers: { won: (m, G) => G.stats.tigers >= m.n, lost: (m, G, L) => G.stats.tigers + (L.tigers || []).filter(x => !x.dead).length < m.n },
    shrieks: { won: (m, G) => G.stats.shrieks <= m.max, lost: (m, G) => G.stats.shrieks > m.max },
    wakes: { won: (m, G) => G.stats.owlsWoken <= m.max, lost: (m, G) => G.stats.owlsWoken > m.max },
    talons: { won: (m, G) => !G.stats.talons, lost: (m, G) => G.stats.talons > 0 },
    chorus: { won: (m, G) => G.stats.chorus > 0 },
  };
  PP.moonTypes = TYPES;

  PP.missions = {
    text(m) { const t = D().moons[m.type]; return t ? t.text(m) : m.type; },
    lostText(m) { const t = D().moons[m.type]; return t && t.lost ? t.lost(m) : 'out of reach'; },
    coverage(L) { const s = L && L.survey; return s && s.total ? Math.round(s.count / s.total * 100) : 0; },
    // set up the three Moons for this attempt (prior: which were already earned)
    init(G, cave, prior) {
      G.moons = (cave && cave.moons ? cave.moons : []).map((m, i) => ({ def: m, slot: i, state: 'open', why: '', had: !!(prior && prior[i]), pop: 0 }));
    },
    update(G, L) {
      for (const mo of G.moons) {
        if (mo.state !== 'open') continue;
        const ty = TYPES[mo.def.type];
        if (ty && ty.lost && ty.lost(mo.def, G, L)) {
          mo.state = 'lost';
          mo.why = PP.missions.lostText(mo.def);
          mo.pop = 1;
          if (G.mode === 'play' && !mo.had) PP.run.toast(D().slots[mo.slot] + ' out of reach', mo.why, 2.6, 'lost');
          PP.emit('moonLost', mo);
        }
      }
    },
    // at the arch: which Moons were won this attempt
    finish(G, L) {
      const won = [];
      for (const mo of G.moons) {
        const ty = TYPES[mo.def.type];
        const ok = mo.state !== 'lost' && ty && ty.won(mo.def, G, L);
        mo.state = ok ? 'won' : (mo.state === 'lost' ? 'lost' : 'missed');
        won.push(!!ok);
      }
      return won;
    },
    // live progress line for the HUD (e.g. "calls 7/12")
    progress(mo, G, L) {
      const m = mo.def;
      switch (m.type) {
        case 'pups': return G.trail.length + '/' + need(m, L);
        case 'time': return Math.max(0, Math.ceil(m.max - G.stats.time)) + 's';
        case 'bumps': return G.stats.bumps + '/' + m.max;
        case 'calls': return G.stats.calls + '/' + m.max;
        case 'survey': return PP.missions.coverage(L) + '/' + m.pct + '%';
        case 'larder': return G.stats.moths + '/' + m.n;
        case 'tigers': return G.stats.tigers + '/' + m.n;
        case 'shrieks': return G.stats.shrieks + '/' + m.max;
        case 'wakes': return G.stats.owlsWoken + '/' + m.max;
        default: return '';
      }
    },
  };
})();
