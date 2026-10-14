/* The flight HUD, in CSS px scaled by the UI scale and anchored to the safe-area corners: sonar readiness, moths,
 * energy as moth-wing pips, pups, the three Moons (they dim the moment they are lost, and say why), sound captions
 * at the screen edge, banners, toasts, the moon compass and the first-flight ghost hand. */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, R = PP.R, TAU = PP.TAU;
  const { clamp, lerp } = Kit;
  const gfx = Kit.gfx;
  const DISPLAY = 'Unbounded, "Arial Black", system-ui, sans-serif';

  // sound captions: what you can hear, written at the screen edge in the direction it came from
  const caps = PP.captions = [];
  PP.caption = function (text, x, y, ch) {
    const G = PP.G;
    if (!G || G.mode !== 'play' || !PP.settings.get('captions')) return;
    for (const c of caps) if (c.text === text && G.t - c.t0 < 0.9 && Math.abs(c.x - x) < 200) { c.t0 = G.t; c.x = x; c.y = y; return; }
    caps.push({ text, x, y, ch, t0: G.t });
    if (caps.length > 8) caps.shift();
  };

  const PIP = { gold: [PP.P.gold, PP.P.gold, 1], red: [PP.P.red, PP.P.red, 1], rose: ['#ff8c9e', PP.P.red, 1], off: [null, PP.P.gold, 0], offRed: [null, PP.P.red, 0] };
  function pipSprite(kind, k) {
    return gfx.sprite('pp-pip-' + kind + '-' + k, 18 * k, 16 * k, g => {
      const [fillC, lineC, on] = PIP[kind];
      g.scale(k, k);
      g.translate(9, 8);
      g.beginPath();
      for (let sd = -1; sd <= 1; sd += 2) {
        g.moveTo(0, -1); g.bezierCurveTo(sd * 2, -6.5, sd * 7.5, -5.5, sd * 6.6, -0.6); g.bezierCurveTo(sd * 4.5, 0.6, sd * 2, 0.4, 0, -1);
        g.moveTo(0, 0.6); g.bezierCurveTo(sd * 4.6, 0.4, sd * 5, 4.6, sd * 2.2, 5); g.bezierCurveTo(sd * 1, 4.8, 0, 3, 0, 0.6);
      }
      if (fillC) { g.fillStyle = fillC; g.fill(); }
      g.strokeStyle = gfx.alpha(lineC, on ? 0.9 : 0.35); g.lineWidth = 1; g.stroke();
      g.fillStyle = on ? 'rgba(58,36,16,0.9)' : gfx.alpha(lineC, 0.35);
      g.fillRect(-0.7, -2.4, 1.4, 6.4);
    });
  }
  // a moon in one of three phases: 0 crescent, 1 half, 2 full
  function moonIcon(ctx, x, y, r, slot, state, t) {
    const lit = state === 'won' || state === 'had', lost = state === 'lost';
    const col = lost ? 'rgba(255,74,107,0.55)' : lit ? '#fff4cf' : 'rgba(223,232,255,0.75)';
    if (lit) R.glow(ctx, x, y, r * 2.6, '#ffe7a0', 0.28 + 0.06 * Math.sin(t * 3));
    ctx.lineWidth = Math.max(1.4, r * 0.16);
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = lit ? '#fff4cf' : lost ? 'rgba(255,74,107,0.18)' : 'rgba(223,232,255,0.22)';
    ctx.beginPath();
    if (slot === 2) ctx.arc(x, y, r, 0, TAU);
    else if (slot === 1) { ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); }
    else { ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.arc(x - r * 0.55, y, r * 0.86, Math.PI / 2 - 0.18, -Math.PI / 2 + 0.18, true); ctx.closePath(); }
    ctx.fill();
    if (lost) { ctx.strokeStyle = 'rgba(255,74,107,0.85)'; ctx.beginPath(); ctx.moveTo(x - r * 1.1, y + r * 1.1); ctx.lineTo(x + r * 1.1, y - r * 1.1); ctx.stroke(); }
  }
  R.moonIcon = moonIcon;

  R.drawHud = function (ctx, w, h, safe, u) {
    const G = PP.G, L = PP.L;
    if (PP.keyart || !G || G.mode !== 'play') return;
    const t = G.t;
    // ---- top left cluster ----
    ctx.save();
    ctx.translate(safe.l + 12 * u, safe.t + 10 * u);
    ctx.scale(u, u);
    const prevPpu = R.ppu; R.ppu = (R.k || 1) * u;
    const cx = 26, cy = 28, ox = cx - 12;
    ctx.lineCap = 'round';
    const st = PP.bat.stats();
    const wave = (r, k, col, wdt, span) => {
      ctx.strokeStyle = gfx.alpha(col, 0.2); ctx.lineWidth = wdt;
      ctx.beginPath(); ctx.arc(ox, cy, r, -span, span); ctx.stroke();
      if (k <= 0) return;
      ctx.strokeStyle = col; ctx.globalAlpha = k >= 1 ? 1 : 0.75;
      ctx.beginPath(); ctx.arc(ox, cy, r, -span * k, span * k); ctx.stroke();
      ctx.globalAlpha = 1;
    };
    const ck = 1 - G.cd / st.chirpCd, sk = 1 - G.scd / st.shriekCd;
    R.glow(ctx, ox + 8, cy, 34, PP.P.teal, 0.12 + (ck >= 1 ? 0.06 : 0));
    wave(9, clamp(ck * 2, 0, 1), ck >= 1 ? '#bffff4' : PP.P.teal, 3, 0.8);
    wave(16, clamp(ck * 2 - 1, 0, 1), ck >= 1 ? '#bffff4' : PP.P.teal, 3, 0.75);
    wave(24, sk, sk >= 1 ? '#e6fbff' : '#58a8a0', 2.4, 0.72);
    if (sk >= 1) { ctx.strokeStyle = gfx.alpha('#bff8ff', 0.25 + 0.15 * Math.sin(t * 3)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, cy, 30, -0.62, 0.62); ctx.stroke(); }
    ctx.fillStyle = ck >= 1 ? '#dffff9' : PP.P.teal;
    ctx.beginPath(); ctx.arc(ox, cy, 3.4, 0, TAU); ctx.fill();
    if (PP.bat.ability('bolt')) { const bk = 1 - G.dcd / 3.5; ctx.strokeStyle = bk >= 1 ? '#ffd2a8' : 'rgba(255,210,168,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, cy, 36, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 0.5 * bk); ctx.stroke(); }
    // moths: what you carry (and the pup multiplier) during a cave; the haul total on the way out
    const sx = cx + 38;
    const showN = G.kind === 'endless' || G.sub !== 'cave' ? G.score : G.carried;
    gfx.text(ctx, Kit.fmt(showN), sx, cy - 6, { size: 24, weight: 800, font: DISPLAY, align: 'left', color: '#eafffb', stroke: 'rgba(2,6,14,0.45)', strokeWidth: 4 });
    ctx.font = '800 24px ' + DISPLAY;
    let lx = sx + ctx.measureText(Kit.fmt(showN)).width + 8;
    gfx.text(ctx, G.kind === 'endless' ? 'BANKED' : 'MOTHS', lx, cy - 3, { size: 9, weight: 700, font: 'body', align: 'left', color: gfx.alpha(PP.P.gold, 0.85) });
    const mult = Math.min(PP.data.economy.bank.multCap, 1 + G.trail.length);
    if (G.sub === 'cave' && mult > 1) gfx.text(ctx, '×' + mult, lx, cy - 15, { size: 12, weight: 800, font: DISPLAY, align: 'left', color: PP.P.pink, alpha: 0.95 });
    const sub = G.kind === 'endless' ? 'CAVE ' + G.cave + (G.carried ? '  +' + G.carried : '') : G.kind === 'practice' ? 'PRACTICE' : (G.caveDef ? G.caveDef.id + '  ' + G.caveDef.name.toUpperCase() : '');
    gfx.text(ctx, sub, sx, cy + 15, { size: 10, weight: 700, font: 'body', align: 'left', color: gfx.alpha(PP.P.teal, 0.85) });
    // energy: a row of moth-wing pips (ten, whatever the bat's energy pool)
    const py = cy + 36, Emax = st.energy, low = G.energy < Emax * 0.25, pk = Math.min(4, Math.ceil((R.k || 1) * u));
    for (let k = 0; k < 10; k++) {
      const fill = clamp(G.energy / (Emax / 10) - k, 0, 1), x = 8 + k * 16;
      const pop = G.pipPop && k === Math.min(9, Math.floor(G.energy / (Emax / 10))) ? 1 + G.pipPop * 0.4 : 1;
      const col = !low ? 'gold' : Math.sin(t * 10) > 0 ? 'red' : 'rose';
      ctx.globalAlpha = fill > 0 ? 0.25 + 0.75 * fill : 1;
      ctx.drawImage(pipSprite(fill > 0 ? col : low ? 'offRed' : 'off', pk), x - 9 * pop, py - 8 * pop, 18 * pop, 16 * pop);
      ctx.globalAlpha = 1;
    }
    if (G.pipPop) G.pipPop = Math.max(0, G.pipPop - 0.05);
    // pups: tiny hanging bats; filled ones fly with you
    if (L && G.sub === 'cave') {
      const total = L.pups.length, have = G.trail.length, mp = G.multPop || 1;
      for (let k = 0; k < total; k++) {
        const x = 182 + k * 20, y = py - 6;
        ctx.save(); ctx.translate(x, y);
        ctx.scale(1.35 * (k === have - 1 ? mp : 1), 1.35 * (k === have - 1 ? mp : 1));
        const on = k < have;
        if (on) R.glow(ctx, 0, 1, 12, PP.P.pink, 0.35);
        ctx.strokeStyle = gfx.alpha(PP.P.pink, on ? 1 : 0.6); ctx.fillStyle = on ? PP.P.pink : 'rgba(255,156,207,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-4, -6.5); ctx.lineTo(4, -6.5); ctx.moveTo(-1, -6.5); ctx.lineTo(-1, -4); ctx.moveTo(1, -6.5); ctx.lineTo(1, -4); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0.5, 3.2, 4.4, 0, 0, TAU);
        ctx.moveTo(-2.2, 4); ctx.lineTo(-2.8, 7); ctx.lineTo(-0.6, 4.8); ctx.moveTo(2.2, 4); ctx.lineTo(2.8, 7); ctx.lineTo(0.6, 4.8);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, -2.5); ctx.quadraticCurveTo(-6.5, 0.5, -3.4, 3.4); ctx.moveTo(3, -2.5); ctx.quadraticCurveTo(6.5, 0.5, 3.4, 3.4); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    // ---- the three Moons, top right (left of the pause button) ----
    if (G.moons && G.moons.length && G.sub !== 'night') {
      ctx.save();
      ctx.translate(w - safe.r - 66 * u, safe.t + 10 * u);
      ctx.scale(u, u);
      for (let i = G.moons.length - 1; i >= 0; i--) {
        const mo = G.moons[i], x = -(G.moons.length - 1 - i) * 34 - 4, y = 22;
        const state = mo.state === 'won' ? 'won' : mo.had ? 'had' : mo.state;
        const pop = mo.pop > 0 ? 1 + mo.pop * 0.35 : 1;
        if (mo.pop > 0) mo.pop = Math.max(0, mo.pop - 0.03);
        moonIcon(ctx, x, y, 10 * pop, mo.slot, state, t);
        const pr = PP.missions.progress(mo, G, L);
        if (pr && mo.state === 'open') gfx.text(ctx, pr, x, y + 22, { size: 9, weight: 700, font: 'body', color: mo.had ? 'rgba(255,244,207,0.7)' : '#dfe8ff' });
        else if (mo.state === 'lost' && !mo.had) gfx.text(ctx, 'lost', x, y + 22, { size: 9, weight: 700, font: 'body', color: 'rgba(255,120,140,0.9)' });
      }
      ctx.restore();
    }
    R.ppu = (R.k || 1);
    // ---- the night flight timer: a moon that wanes as it runs out ----
    if (G.sub === 'night' && G.night) {
      const k = clamp(G.nightT / (G.nightMax || 15), 0, 1), mx = w / 2, my = safe.t + 30 * u;
      ctx.strokeStyle = gfx.alpha(PP.P.moon, 0.25); ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(mx, my, 16 * u, 0, TAU); ctx.stroke();
      ctx.strokeStyle = PP.P.moon; ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.arc(mx, my, 16 * u, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      gfx.text(ctx, Math.ceil(G.nightT) + '', mx, my + u, { size: 13 * u, weight: 800, font: DISPLAY, color: '#eaf3ff' });
      gfx.text(ctx, '+' + G.night.caught + ' moths', mx, my + 32 * u, { size: 11 * u, weight: 700, font: 'body', color: PP.P.gold });
    }
    // ---- a faint moon compass toward the exit when it is off screen ----
    if (L && G.sub === 'cave' && G.ct > 6) {
      const TMP = R._tmp;
      Kit.cam.toScreen(L.W + 20, L.exitY, TMP);
      if (TMP.x < 0 || TMP.x > w || TMP.y < 0 || TMP.y > h) {
        const ccx = w / 2, ccy = h / 2, ang = Math.atan2(TMP.y - ccy, TMP.x - ccx);
        const rx = w / 2 - 26 * u - Math.max(safe.l, safe.r), ry = h / 2 - 90 * u - Math.max(safe.t, safe.b);
        const kk = Math.min(rx / Math.abs(Math.cos(ang) || 1e-3), ry / Math.abs(Math.sin(ang) || 1e-3));
        const px = ccx + Math.cos(ang) * kk, ppy = ccy + Math.sin(ang) * kk;
        const a = 0.35 + 0.15 * Math.sin(t * 2);
        R.glow(ctx, px, ppy, 22 * u, PP.P.moon, a * 0.6);
        ctx.fillStyle = gfx.alpha(PP.P.moon, a + 0.2);
        ctx.beginPath(); ctx.arc(px, ppy, 6 * u, 0, TAU); ctx.fill();
        ctx.fillStyle = '#05060d';
        ctx.beginPath(); ctx.arc(px - 2.6 * u, ppy - 1.6 * u, 5 * u, 0, TAU); ctx.fill();
        ctx.strokeStyle = gfx.alpha(PP.P.moon, a); ctx.lineWidth = 1.5 * u;
        const e = 10 * u, s6 = 6 * u;
        ctx.beginPath(); ctx.moveTo(px + Math.cos(ang) * e, ppy + Math.sin(ang) * e); ctx.lineTo(px + Math.cos(ang + 0.5) * s6, ppy + Math.sin(ang + 0.5) * s6); ctx.moveTo(px + Math.cos(ang) * e, ppy + Math.sin(ang) * e); ctx.lineTo(px + Math.cos(ang - 0.5) * s6, ppy + Math.sin(ang - 0.5) * s6); ctx.stroke();
      }
    }
    drawCaptions(ctx, w, h, safe, u, t);
    // ---- banner: what is new down here ----
    if (G.banner) {
      const bt = G.banner.t, dur = G.banner.dur || 3.4, a = clamp(Math.min((bt - 0.3) * 2.5, (dur - bt) * 2), 0, 1);
      if (a > 0) {
        const by = h * (G.sub === 'night' ? 0.62 : 0.26);
        ctx.strokeStyle = gfx.alpha(PP.P.teal, 0.5 * a); ctx.lineWidth = Math.max(1, u);
        const lw = Math.min(w * 0.38, 170 * u) * Kit.ease.cubicOut(Math.min(1, bt * 1.4));
        ctx.beginPath(); ctx.moveTo(w / 2 - lw, by - 26 * u); ctx.lineTo(w / 2 + lw, by - 26 * u); ctx.moveTo(w / 2 - lw, by + 30 * u); ctx.lineTo(w / 2 + lw, by + 30 * u); ctx.stroke();
        const title = G.banner.a.toUpperCase();
        const ts = Math.min(22 * u, (w - 40 * u) / Math.max(6, title.length * 0.78));
        gfx.text(ctx, title, w / 2, by - 4 * u, { size: ts, weight: 800, font: DISPLAY, color: '#eafffb', alpha: a });
        fitText(ctx, G.banner.b, w / 2, by + 17 * u, 14 * u, w - 40 * u, { weight: 600, font: 'body', color: gfx.alpha('#c9eef0', 0.95), alpha: a });
      }
    }
    // ---- toasts (Moons lost, Old Scratches) ----
    let ty = h - safe.b - 120 * u;
    for (const ts of G.toasts) {
      const a = clamp(Math.min(ts.t * 4, (ts.dur - ts.t) * 2), 0, 1);
      const lost = ts.kind === 'lost';
      gfx.text(ctx, ts.title, w / 2, ty, { size: 12 * u, weight: 800, font: DISPLAY, color: lost ? '#ff8ca0' : '#f2ead6', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
      fitText(ctx, ts.text, w / 2, ty + 18 * u, 13 * u, w - 48 * u, { weight: 600, font: 'body', color: '#eafffb', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
      ty -= 46 * u;
    }
    if (G.hint) {
      const a = clamp(Math.min(G.hint.t * 3, (3 - G.hint.t) * 2), 0, 1);
      fitText(ctx, G.hint.text, w / 2, h - safe.b - 70 * u, 15 * u, w - 40 * u, { weight: 700, font: 'body', color: '#eafffb', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
    }
    if (G.tut && G.tut < 3 && G.sub === 'cave' && G.t > 0.9) drawGhost(ctx, w, h, t, u, safe);
    if (G.sub === 'cave' && G.t < 9 && G.tut === 0 && G.caveDef && G.caveDef.tutorial && PP.profile.get().stats.caves < 2) {
      const a = clamp(Math.min((G.t - 1) * 2, (9 - G.t) * 1.5), 0, 1);
      const hint = PP.input.lastInput === 'keys' ? 'Arrows fly  ·  Space chirps  ·  Shift shrieks' : 'Drag to fly  ·  Tap to chirp  ·  Hold to shriek';
      fitText(ctx, hint, w / 2, h - safe.b - 46 * u, 14 * u, w - 32 * u, { weight: 700, font: 'body', color: '#eafffb', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
    }
    R.ppu = prevPpu;
  };

  function fitText(ctx, str, x, y, size, maxW, o) {
    ctx.font = (o.weight || 700) + ' ' + size + 'px ' + (o.font === 'body' ? gfx.fonts.body : DISPLAY);
    const wdt = ctx.measureText(str).width;
    if (wdt > maxW) size *= maxW / wdt;
    gfx.text(ctx, str, x, y, Object.assign({ size }, o));
  }

  function drawCaptions(ctx, w, h, safe, u, t) {
    const G = PP.G, TMP = R._tmp;
    PP.compact(caps, c => G.t - c.t0 < 1.6);
    for (const c of caps) {
      const a = clamp(Math.min((G.t - c.t0) * 6, (1.6 - (G.t - c.t0)) * 2.5), 0, 1);
      Kit.cam.toScreen(c.x, c.y, TMP);
      const m = 30 * u;
      let x = TMP.x, y = TMP.y;
      const off = x < m || x > w - m || y < m + safe.t || y > h - m - safe.b;
      if (off) {
        const ccx = w / 2, ccy = h / 2, ang = Math.atan2(y - ccy, x - ccx);
        const rx = w / 2 - 54 * u - Math.max(safe.l, safe.r), ry = h / 2 - 110 * u - Math.max(safe.t, safe.b);
        const kk = Math.min(rx / Math.abs(Math.cos(ang) || 1e-3), ry / Math.abs(Math.sin(ang) || 1e-3));
        x = ccx + Math.cos(ang) * kk; y = ccy + Math.sin(ang) * kk;
      } else y -= 26 * u;
      const col = PP.COL[c.ch] || '#eafffb';
      gfx.text(ctx, (off ? '‹ ' : '') + c.text + (off ? ' ›' : ''), x, y, { size: 11 * u, weight: 800, font: 'body', color: col, alpha: a * 0.95, stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3.5 * u });
    }
  }

  function drawGhost(ctx, w, h, t, u, safe) {
    const G = PP.G, a = clamp((G.t - 0.9) * 2, 0, 1);
    const keys = PP.input.lastInput === 'keys';
    if (G.tut === 1) {
      const k = (t * 0.7) % 1, e = Kit.ease.cubicInOut(Math.min(1, k * 1.4));
      const x0 = w * 0.42, y0 = h * 0.72, x1 = x0 + 70 * u, y1 = y0 - 34 * u;
      const hx = lerp(x0, x1, e), hy = lerp(y0, y1, e);
      ctx.strokeStyle = gfx.alpha(PP.P.teal, 0.35 * a); ctx.lineWidth = 2 * u; ctx.setLineDash([3 * u, 5 * u]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = gfx.alpha(PP.P.teal, 0.4 * a);
      ctx.beginPath(); ctx.arc(x0, y0, 14 * u, 0, TAU); ctx.stroke();
      drawHand(ctx, hx, hy, a * (k < 0.85 ? 1 : (1 - k) / 0.15), u);
      fitText(ctx, keys ? 'Arrow keys to fly' : 'Drag anywhere to fly', w / 2, h - safe.b - 52 * u, 16 * u, w - 40 * u, { weight: 700, font: 'body', color: '#eafffb', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
    } else if (G.tut === 2) {
      const k = (t * 0.9) % 1, x = w * 0.62, y = h * 0.7, press = k < 0.2 ? 1 : 0;
      ctx.strokeStyle = gfx.alpha(PP.P.teal, (1 - k) * 0.7 * a); ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(x, y, (8 + k * 46) * u, 0, TAU); ctx.stroke();
      drawHand(ctx, x + 4 * u, y + (8 - press * 4) * u, a, u);
      fitText(ctx, keys ? 'Space to chirp' : 'Tap to chirp', w / 2, h - safe.b - 52 * u, 16 * u, w - 40 * u, { weight: 700, font: 'body', color: '#eafffb', alpha: a, stroke: 'rgba(0,0,0,0.6)', strokeWidth: 4 * u });
    }
  }
  function drawHand(ctx, x, y, a, u) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(u, u);
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = '#e9fbff';
    ctx.strokeStyle = PP.P.teal; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3.5, 0); ctx.lineTo(-3.5, 18); ctx.quadraticCurveTo(-12, 14, -10, 21); ctx.quadraticCurveTo(-4, 31, 6, 34);
    ctx.lineTo(14, 34); ctx.quadraticCurveTo(19, 26, 18, 18); ctx.lineTo(18, 14); ctx.quadraticCurveTo(18, 11, 15, 11); ctx.quadraticCurveTo(12, 11, 12, 13);
    ctx.quadraticCurveTo(12, 9, 9, 9); ctx.quadraticCurveTo(6, 9, 6, 12); ctx.quadraticCurveTo(6, 8, 3, 8); ctx.quadraticCurveTo(0, 8, 0, 10); ctx.lineTo(3.5, 0);
    ctx.quadraticCurveTo(3.5, -4, 0, -4); ctx.quadraticCurveTo(-3.5, -4, -3.5, 0);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
})();
