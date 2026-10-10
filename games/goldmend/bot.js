// Goldmend bot with a human's limits (finger speed, lift time, wobble), used by test.cjs and tools/make-art.cjs.
// Load it into a page that has ?debug; it defines window.makeBot(options) -> step(dt).
(function () {
  window.makeBot = (o = {}) => {
    const g = window.__goldmend;
    const speed = o.speed || 380, lift = o.lift || 0.18, wobble = o.wobble == null ? 2.5 : o.wobble;
    const react = o.react == null ? 0.3 : o.react;
    const st = { x: 0, y: 0, down: false, wait: 0, target: null, r: o.seed || 7, seenAt: new Map() };
    // a crack is only noticed some time after its tock
    const noticed = c => { if (!st.seenAt.has(c.id)) st.seenAt.set(c.id, g.gt); return g.gt - st.seenAt.get(c.id) >= react; };
    const rnd = () => { st.r = (st.r * 16807) % 2147483647; return st.r / 2147483647; };
    const avail = b => !b.parent || b.parent.front >= b.jLen - 0.01;
    function pick() {
      let best = null, bt = Infinity;
      for (const c of g.cracks) {
        if (c.state !== 'run' || !noticed(c)) continue;
        for (const b of c.branches) {
          if (b.state !== 'grow') continue;
          const ttr = b.rimEnd ? (b.len - b.tip) / Math.max(20, c.speed) : 3 + (b.len - b.tip) / c.speed;
          if (ttr < bt) { bt = ttr; best = b; }
        }
      }
      return best;
    }
    // lifting and re-touching elsewhere takes time that grows with the distance
    const lifted = (x, y) => { if (st.down) { g.up(); st.down = false; st.wait = lift + Math.hypot(x - st.x, y - st.y) / 900; return true; } return false; };
    return function step(dt) {
      if (g.phase !== 'play') { if (st.down) { g.up(); st.down = false; } return; }
      if (st.wait > 0) { st.wait -= dt; return; }
      const b = st.target && st.target.state === 'grow' ? st.target : pick();
      st.target = b;
      let tx, ty;
      if (b) {
        let t = b;
        while (!avail(t)) t = t.parent;
        const p = g.at(t, Math.min(t.tip, t.front + 9));
        tx = p.x; ty = p.y;
        if (!st.down || Math.hypot(tx - st.x, ty - st.y) > 45) {
          if (lifted(tx, ty)) return;
          const p0 = g.at(t, t.front);
          st.x = p0.x; st.y = p0.y;
          g.down(st.x, st.y);
          st.down = true;
          return;
        }
      } else {
        const c = g.cracks.find(x => x.state === 'tele' && noticed(x));
        if (!c) { if (st.down) { g.up(); st.down = false; } return; }
        if (!st.down || Math.hypot(c.origin.x - st.x, c.origin.y - st.y) > 30) {
          if (lifted(c.origin.x, c.origin.y)) return;
          st.x = c.origin.x; st.y = c.origin.y;
          g.down(st.x, st.y);
          st.down = true;
        }
        return;
      }
      const dx = tx - st.x, dy = ty - st.y, d = Math.hypot(dx, dy);
      if (d < 0.01) return;
      const sl = Math.min(d, speed * dt), w = (rnd() * 2 - 1) * wobble;
      st.x += (dx / d) * sl;
      st.y += (dy / d) * sl;
      g.move(st.x - (dy / d) * w, st.y + (dx / d) * w);
    };
  };
})();
