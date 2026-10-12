/* The Roost: the inside of the old belfry, home. Every pup you ever brought home hangs from the beams, grouped and
 * named for the cave it came from; your bats hang among them. Drawn on the canvas behind the menus. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const RO = PP.roost = {};
  let cache = null;

  function layout(w, h, u) {
    const p = PP.profile.get();
    const groups = [];
    for (const B of PP.data.campaign.order.map(id => PP.biomes[id]).filter(Boolean)) for (const c of B.caves) if (p.roost[c.id]) groups.push({ id: c.id, name: c.name, n: p.roost[c.id] });
    const land = w > h * 1.15;
    const beams = land ? [0.2, 0.38, 0.56] : [0.17, 0.31, 0.45];
    const x0 = w * (land ? 0.05 : 0.06), x1 = w * (land ? 0.56 : 0.94);
    const sp = 15 * u, gap = 26 * u;
    const slots = [];
    let bi = 0, x = x0 + 40 * u;
    const bats = p.bats.owned.slice();
    // your bats hang first, on the top beam
    for (const id of bats) { slots.push({ kind: 'bat', id, x, y: h * beams[0], beam: 0 }); x += 34 * u; }
    x += gap;
    let total = 0;
    for (const g of groups) {
      const n = Math.min(g.n, Math.max(1, 200 - total));
      total += n;
      const need = n * sp;
      if (x + need > x1 && x > x0 + 60 * u) { bi = Math.min(beams.length - 1, bi + 1); x = x0 + 20 * u; }
      g.x0 = x; g.beam = bi;
      for (let k = 0; k < n; k++) { slots.push({ kind: 'pup', x: x + k * sp, y: h * beams[bi], beam: bi, ph: (k * 1.7 + g.id.length) % 6 }); }
      g.x1 = x + (n - 1) * sp;
      x += need + gap;
      if (total >= 200) break;
    }
    return { groups, beams, slots, x0, x1, land, total: groups.reduce((s, g) => s + g.n, 0) };
  }
  RO.invalidate = () => { cache = null; };

  RO.draw = function (ctx, w, h, t, k) {
    const u = R.u, p = PP.profile.get();
    if (!cache || cache.w !== w || cache.h !== h || cache.v !== p.stats.pups + p.bats.owned.length + p.bats.selected) cache = Object.assign(layout(w, h, u), { w, h, v: p.stats.pups + p.bats.owned.length + p.bats.selected });
    const Lo = cache;
    R.ppu = k;
    // walls of the belfry
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1124'); g.addColorStop(0.5, '#070a16'); g.addColorStop(1, '#030409');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // stone courses, faint
    ctx.strokeStyle = 'rgba(160,180,220,0.035)'; ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    for (let y = 0, row = 0; y < h; y += 26 * u, row++) { ctx.moveTo(0, y); ctx.lineTo(w, y); for (let x = (row % 2) * 30 * u; x < w; x += 60 * u) { ctx.moveTo(x, y); ctx.lineTo(x, y + 26 * u); } }
    ctx.stroke();
    // the tall window, moonlit
    const wx = Lo.land ? w * 0.3 : w * 0.5, wy = h * 0.03, ww = Math.min(w * 0.22, 120 * u), wh = h * 0.22;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#0d1d46'); sky.addColorStop(1, '#2c4a86');
    ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    Kit.gfx.blit(ctx, R.moonSprite(), wx + ww * 0.12, wy + wh * 0.4, ww / 260);
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 8; s++) { ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 1.5 + s * 2); ctx.fillRect(wx - ww / 2 + ((s * 37) % ww), wy + ((s * 53) % (wh * 0.8)), Math.max(1.2, u), Math.max(1.2, u)); }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = '#141b2e'; ctx.lineWidth = 8 * u;
    ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + wh); ctx.moveTo(wx - ww / 2, wy + wh * 0.55); ctx.lineTo(wx + ww / 2, wy + wh * 0.55); ctx.stroke();
    R.glow(ctx, wx, wy + wh * 0.5, wh * 1.4, PP.P.moon, 0.16);
    Kit.gfx.lightRays(ctx, wx, wy + wh * 0.6, { count: 5, length: h * 0.95, spread: 0.5, angle: Math.PI / 2 + 0.25, width: 0.07, color: PP.P.moon, alpha: 0.05, t });
    // beams
    for (let i = 0; i < Lo.beams.length; i++) {
      const y = h * Lo.beams[i], bh = 12 * u;
      const bg = ctx.createLinearGradient(0, y - bh, 0, y + bh * 0.4);
      bg.addColorStop(0, '#3a2a20'); bg.addColorStop(0.6, '#24180f'); bg.addColorStop(1, '#120c08');
      ctx.fillStyle = bg; ctx.fillRect(0, y - bh, w, bh * 1.4);
      ctx.fillStyle = 'rgba(223,232,255,0.07)'; ctx.fillRect(0, y - bh, w, Math.max(1, u * 1.5));
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, u);
      ctx.beginPath(); for (let x = (i * 70) % 140; x < w; x += 140 * u) { ctx.moveTo(x, y - bh * 0.6); ctx.quadraticCurveTo(x + 30 * u, y - bh * 0.3, x + 60 * u, y - bh * 0.7); } ctx.stroke();
    }
    // pups and bats hanging upside down
    for (const s of Lo.slots) {
      if (s.kind === 'pup') {
        R.glow(ctx, s.x, s.y + 16 * u, 16 * u, PP.P.pink, 0.08 + 0.05 * Math.sin(t * 2 + s.ph));
        R.drawPup(ctx, s.x, s.y + 12 * u, t * 0.6 + s.ph, 0, 1.15 * u);
      } else {
        const bat = PP.batById(s.id), sel = p.bats.selected === s.id;
        if (sel) R.glow(ctx, s.x, s.y + 24 * u, 40 * u, PP.P.warm, 0.22);
        ctx.save(); ctx.translate(s.x, s.y + 20 * u); ctx.rotate(Math.PI);
        R.drawBat(ctx, { x: 0, y: 0, face: 1, flap: 0, glide: 0, blink: Math.sin(t * 0.7 + s.x) > 0.97 ? -1 : 1, rim: sel ? 0.5 : 0 }, t, 1.15 * u, bat.look, { glow: false, folded: true, still: true });
        ctx.restore();
      }
    }
    // names of the caves the pups came from
    for (const gq of Lo.groups) {
      if (gq.x0 === undefined) continue;
      const y = h * Lo.beams[gq.beam] + 40 * u;
      Kit.gfx.text(ctx, gq.name + (gq.n > 1 ? ' ×' + gq.n : ''), (gq.x0 + gq.x1) / 2, y, { size: 9 * u, weight: 700, font: 'body', color: 'rgba(255,190,220,0.7)' });
    }
    if (!Lo.total) Kit.gfx.text(ctx, 'Bring the lost pups home, and they will hang here.', w / 2, h * Lo.beams[1] + 4 * u, { size: 12 * u, weight: 600, font: 'body', color: 'rgba(214,240,246,0.55)' });
    // a soft sonar ring now and then, from somewhere in the colony
    const ph = (t * 0.22) % 1, src = Lo.slots[Math.floor(t * 0.22) % Math.max(1, Lo.slots.length)];
    if (src) { ctx.strokeStyle = PP.P.teal; ctx.globalAlpha = (1 - ph) * 0.18; ctx.lineWidth = Math.max(1, 1.5 * u); ctx.beginPath(); ctx.arc(src.x, src.y + 14 * u, ph * Math.max(w, h) * 0.5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    Kit.gfx.vignette(ctx, 0.55, '#000000');
  };
})();
