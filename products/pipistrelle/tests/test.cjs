// Pipistrelle's tests (docs/pipistrelle/BRIEF.md, Engineering): the economy simulator, save migration, every cave
// generates, the bot finishes every cave and earns every Moon with Pip, The Long Night runs, every screen opens,
// native resolution up to 4K, the pixels a frame covers, the frame-time budget and the safety net.
// Usage: node tests/test.cjs [--only=economy,caves,moons,screens,rescue,play,frames] [--port=8920]
//        node tests/test.cjs --unit    (no browser: economy, saves and campaign data; what CI runs)
// Needs Playwright (NODE_PATH=/opt/node22/lib/node_modules if it is installed globally), except for --unit.
const args = process.argv.slice(2);
if (args.includes('--unit')) { require('./unit.cjs'); return; }
const { chromium } = require('playwright');
const { serve } = require('../tools/serve.cjs');

const only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const port = +((args.find(a => a.startsWith('--port=')) || '').slice(7)) || 8920;
const want = name => !only.length || only.includes(name);
let failed = 0;
const check = (ok, name, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' (' + detail + ')' : ''}`); if (!ok) failed++; };

// The bot's goals for each Moon type, tried in order until one earns the Moon.
const GOALS = {
  home: [{}], escape: [{ fast: true }, {}], pups: [{}, { careful: true }],
  time: [{ fast: true, pups: false }, { fast: true }], bumps: [{ careful: true }, { careful: true, pups: false }],
  calls: m => [{ calls: m.max, callEvery: 9 }, { calls: m.max, callEvery: 12, fast: true }, { calls: m.max, callEvery: 7, careful: true }],
  survey: [{ survey: true }, { survey: true, careful: true }], larder: [{ larder: true }, { larder: true, careful: true }],
  noweb: [{ careful: true }, { fast: true }], untouched: [{ fast: true }, { fast: true, pups: false }],
  energy: [{ larder: true }, { careful: true, larder: true }], nowake: [{ calls: 6, callEvery: 12, careful: true }, { careful: true }],
  dry: [{ careful: true }, {}, { careful: true, pups: false }], tidefree: [{ fast: true }, { fast: true, pups: false }],
  nosiphon: [{ careful: true }, {}, { fast: true }], tigers: [{ larder: true }, { larder: true, careful: true }], shrieks: [{}],
  wakes: m => [{ calls: 6, callEvery: 12, careful: true }, { careful: true }, {}], talons: [{}, { fast: true }], chorus: [{}, { careful: true }],
  bells: [{ survey: true }], decoy: [{ careful: true }],
};

(async () => {
  const srv = await serve(port);
  const browser = await chromium.launch();
  const errors = [];
  const open = async (w, h, d) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d || 1 });
    page.on('pageerror', e => errors.push(`${w}x${h}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${w}x${h}: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/?debug`);
    await page.waitForFunction(() => window.__ppTest && __ppTest.ready());
    await page.evaluate(() => __ppTest.reset());
    return page;
  };
  const page = await open(390, 844, 1);
  const caves = await page.evaluate(() => PP.game.allCaves().map(c => ({ id: c.id, biome: c.biome, moons: c.moons, pups: (c.pups || []).length })));

  if (want('economy')) {
    const { sim, prices } = await page.evaluate(() => __ppTest.economy());
    const T = await page.evaluate(() => PP.data.economy.targets);
    const reach = amt => { for (const s of sim) if (s.total >= amt) return s.cave; return Infinity; };
    const bought = Object.entries(prices).filter(([id]) => id !== 'pip').map(([, p]) => p).sort((a, b) => a - b);
    const first = reach(bought[0]), all = reach(bought.reduce((a, b) => a + b, 0));
    check(Math.abs(first - T.firstBat) <= T.firstBat * T.tolerance, 'economy: the first bat is affordable around the end of Chalk Hollows', `cave ${first}, target ${T.firstBat}`);
    check(Math.abs(all - T.allBats) <= T.allBats * T.tolerance, 'economy: all four bats by the end of the campaign', `cave ${all}, target ${T.allBats}`);
    const mono = sim.every((s, i) => i === 0 || s.total >= sim[i - 1].total);
    check(mono, 'economy: banked moths only ever grow');
    const m0 = await page.evaluate(() => __ppTest.migrate({ best: 9000, taught: true, runs: 12 }));
    check(m0.v === 2 && m0.moths === 500 && m0.legacy.gift === 500 && m0.tutorial.taught && m0.bats.owned.includes('pip'), 'save: the pilot\'s save migrates, its best returned as a gift of at most 500', `moths ${m0.moths}`);
    const m1 = await page.evaluate(() => __ppTest.migrate({ v: 1, moths: 742, caves: { '1-1': { moons: [true, false, true], best: 30 } }, settings: { music: 0.3 } }));
    check(m1.v === 2 && m1.moths === 742 && m1.caves['1-1'].cleared && m1.caves['1-1'].moons.join() === 'true,false,true' && m1.settings.music === 0.3 && m1.settings.sound === true, 'save: a version 1 save keeps moths, Moons and settings');
    const m2 = await page.evaluate(() => { const p = __ppTest.migrate({ v: 2, moths: 10, caves: {} }); return p; });
    check(m2.v === 2 && m2.moths === 10 && m2.stats && m2.settings && m2.longNight, 'save: a current save missing newer fields is filled in');
  }

  if (want('caves')) {
    const gen = await page.evaluate(() => __ppTest.genAll());
    for (const g of gen) {
      check(g.ms < 600 && g.pups === g.wantPups && g.moths >= 12 && g.W > 1000, `generate ${g.id}`, `${g.ms} ms, ${g.pups}/${g.wantPups} pups, ${g.moths} moths, ${g.W}x${g.H}`);
    }
    const biomes = await page.evaluate(() => PP.data.campaign.order.map(id => { const b = PP.biomes[id]; return { id, ready: !!(b && b.ready), caves: b ? b.caves.length : 0 }; }));
    for (const b of biomes) check(!b.ready || b.caves >= 1, `biome ${b.id} ${b.ready ? 'is ready with ' + b.caves + ' caves' : 'is still to come'}`);
    // The Long Night: three caves in a row with the bot, energy carried over
    const ln = await page.evaluate(() => {
      __ppTest.startEndless();
      __ppTest.autopilot(true, { fast: true });
      const seen = new Set();
      for (let i = 0; i < 260 && seen.size < 3; i++) { __ppTest.step(1); const inf = __ppTest.info(); if (inf && inf.sub === 'night') __ppTest.skipNight(); if (inf) seen.add(inf.cave); }
      __ppTest.autopilot(false);
      return [...seen];
    });
    check(ln.length >= 3, 'The Long Night: one cave after another', ln.join(','));
    // with every biome open, it travels through them, three caves each, never the finale
    const tour = await page.evaluate(() => {
      __ppTest.clearAll();
      const out = [];
      for (const n of [1, 4, 7, 10, 13]) { __ppTest.startEndless(n); out.push(PP.L.biome); }
      __ppTest.startEndless(8);
      __ppTest.autopilot(true, { fast: true });
      let won = false;
      for (let i = 0; i < 200 && !won; i++) { __ppTest.step(1); const inf = __ppTest.info(); if (inf && (inf.cave > 8 || inf.sub === 'night')) won = true; }
      __ppTest.autopilot(false);
      __ppTest.reset();
      return { out, won };
    });
    check(tour.out.join() === 'chalk,drowned,glass,owlstone,chalk', 'The Long Night travels through the opened biomes', tour.out.join(', '));
    check(tour.won, 'a Glass Vaults cave in The Long Night can be finished');
  }

  if (want('moons')) {
    for (const c of caves) {
      for (let slot = 0; slot < 3; slot++) {
        const m = c.moons[slot];
        const list = typeof GOALS[m.type] === 'function' ? GOALS[m.type](m) : (GOALS[m.type] || [{}]);
        let ok = false, last = null;
        for (const goals of list) {
          last = await page.evaluate(([id, goals]) => __ppTest.botRun(id, goals, 260, 'pip'), [c.id, goals]);
          if (last.moonsRun && last.moonsRun[slot]) { ok = true; break; }
        }
        check(ok, `${c.id} Moon ${slot + 1} (${m.type}) is earnable with Pip`, ok ? `${last.time} s` : `${last.moonStates[slot]}; won ${last.won}`);
      }
    }
  }

  if (want('screens')) {
    const names = ['title', 'roost', 'map', 'hangar', 'journal', 'requests', 'settings', 'longnight'];
    for (const n of names) {
      const cur = await page.evaluate(n => __ppTest.show(n), n);
      check(cur === n, `screen ${n} opens`);
    }
    for (const c of caves.filter((c, i) => i % 3 === 0)) {
      const cur = await page.evaluate(id => __ppTest.show('brief', { id }), c.id);
      check(cur === 'brief', `brief for ${c.id} opens`);
    }
  }

  if (want('rescue')) {
    // The Last Echo: the Second Wind heartbeat, then the rewarded "Fly on" (the browser's stand-in test ad)
    const r = await page.evaluate(async () => {
      const out = {};
      window.__ppFastAds = true;
      const until = (fn, max) => { for (let i = 0; i < (max || 600) && !fn(); i++) __ppTest.step(1 / 60); return fn(); };
      __ppTest.reset();
      __ppTest.startCave('1-2');
      __ppTest.step(1);
      __ppTest.energy(0.05);
      out.rescue = until(() => PP.G.sub === 'rescue') && PP.G.rescue.stage;
      // tap on every beat
      for (let i = 0; i < 400 && PP.G.sub === 'rescue'; i++) {
        const S = PP.G.rescue, due = 0.75 + S.beat * 0.95;
        if (S.stage === 'beats' && S.beat < 4 && Math.abs(S.t - due) < 0.03) PP.rescue.tap();
        __ppTest.step(1 / 60);
      }
      out.wind = { sub: PP.G.sub, energy: Math.round(PP.G.energy), shield: PP.G.shield > 0, used: !!PP.G.secondWindUsed };
      // lose again: straight to the offer
      __ppTest.step(2);
      __ppTest.energy(0.05);
      until(() => PP.G.sub === 'rescue');
      out.offerStage = PP.G.rescue && PP.G.rescue.stage;
      out.offerShown = !document.querySelector('.offer').hidden;
      PP.rescue.watch();
      await new Promise(res => setTimeout(res, 700));
      out.ad = { sub: PP.G.sub, energy: Math.round(PP.G.energy), adUsed: !!PP.G.adUsed, revives: PP.G.stats.revives };
      // a third loss: both chances spent, so the run ends
      __ppTest.step(3);
      __ppTest.energy(0.05);
      until(() => PP.G.sub === 'done' || PP.G.sub === 'rescue', 300);
      out.third = PP.G.sub;
      // missing the beats leads to the offer; letting the echoes fade ends the run
      __ppTest.startCave('1-2');
      __ppTest.step(1);
      __ppTest.energy(0.05);
      until(() => PP.G.sub === 'rescue');
      until(() => !PP.G.rescue || PP.G.rescue.stage === 'offer', 400);
      out.missed = PP.G.rescue && PP.G.rescue.stage;
      PP.rescue.giveUp();
      out.faded = PP.G.sub;
      // practice never stops for this
      __ppTest.startPractice('pip');
      __ppTest.step(1);
      PP.run.die();
      until(() => PP.G.sub !== 'dead', 200);
      out.practice = PP.G.sub;
      window.__ppFastAds = false;
      return out;
    });
    check(r.rescue === 'beats', 'losing opens the Last Echo with the Second Wind heartbeat', r.rescue);
    check(r.wind.sub === 'cave' && r.wind.energy === 35 && r.wind.shield && r.wind.used, 'catching the heartbeats gives a second wind', JSON.stringify(r.wind));
    check(r.offerStage === 'offer' && r.offerShown, 'once the second wind is spent, losing offers "Fly on?"');
    check(r.ad.sub === 'cave' && r.ad.energy >= 64 && r.ad.adUsed && r.ad.revives === 2, 'a watched rewarded ad flies on with most of the energy', JSON.stringify(r.ad));
    check(r.third === 'done', 'with both chances spent, losing ends the run', r.third);
    check(r.missed === 'offer' && r.faded === 'done', 'missed heartbeats lead to the offer; letting the echoes fade ends the run', `${r.missed} / ${r.faded}`);
    check(r.practice !== 'rescue', 'practice flights never stop for the Last Echo', r.practice);
  }

  if (want('play')) {
    // the living cave and the harder game (14 October)
    const pg = await open(640, 360, 1);
    const r = await pg.evaluate(() => {
      __ppTest.reset(); __ppTest.startCave('1-3'); __ppTest.show('flight');
      __ppTest.step(0.2); PP.R.flyby.next = 0; __ppTest.step(0.1); __ppTest.step(0.1);
      const flocks = PP.R.flyby.flocks.length;
      const G = PP.G, par = PP.L.pathLen / 420 / 1.12 * PP.data.tuning.hunger.perScreen;
      const before = PP.run.hunger(G); G.stats.time = par * 1.5; const after = PP.run.hunger(G);
      const layouts = PP.game.allCaves().map(c => PP.gen.layoutOf(PP.gen.caveSpec(c)));
      // every river and flood a cave asks for is there, whatever its architecture
      const dry = [];
      for (const c of PP.game.allCaves()) {
        const hz = c.hazards || {}, want = (hz.river ? (Array.isArray(hz.river.at && hz.river.at[0]) ? hz.river.at.length : 1) : 0) + (hz.flood ? 1 : 0);
        if (!want) continue;
        const L = PP.gen.cave(PP.gen.caveSpec(c));
        if (L.rivers.length < want) dry.push(c.id + ' ' + L.rivers.length + '/' + want);
      }
      return { flocks, before, after: +after.toFixed(2), hint: !!(G.hint && /hungry/.test(G.hint.text)), layouts: [...new Set(layouts)].sort().join(' '), known: layouts.every(l => PP.gen.LAYOUTS[l]), dry };
    });
    check(r.flocks >= 1, 'bats of the colony fly by through the cave', r.flocks + ' flock');
    check(r.before === 1 && r.after > 1.4 && r.hint, 'past its par time the dark grows hungry, and says so', `drain x${r.before} then x${r.after}`);
    check(r.known && r.layouts.split(' ').length >= 6, 'the campaign uses all six cave architectures', r.layouts);
    check(r.dry.length === 0, 'every river and flood a cave asks for is there, whatever its architecture', r.dry.join(', ') || 'all present');
    await pg.close();
    // an ad that cannot load says why (a stand-in for the Unity plugin that answers "no fill")
    const ap = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await ap.addInitScript(() => {
      const mk = { init: () => Promise.resolve({ testMode: true, version: '4.21.0' }), setPrivacy: () => Promise.resolve(), load: () => Promise.reject({ code: 'NO_FILL', message: 'No fill' }), show: () => Promise.resolve({ rewarded: false }), addListener: () => {} };
      window.Capacitor = { isNativePlatform: () => true, Plugins: { PipAds: mk } };
    });
    await ap.goto(`http://127.0.0.1:${port}/`);
    await ap.waitForTimeout(2200);
    const st = await ap.evaluate(() => { PP.ui.show('settings'); return { text: document.querySelector('.ad-status').textContent, state: PP.ads.state }; });
    check(/NO_FILL/.test(st.text) && st.state === 'wait', 'an ad that cannot load says why in Settings, and retries', st.text);
    await ap.close();
  }

  if (want('frames')) {
    // Native resolution by default, up to 4K, with no tiers to pick (js/render/quality.js). Headless Chromium has no
    // GPU: it draws through a software GPU roughly a hundred times slower than a phone's, so a 4K frame cannot reach
    // 60 fps here. What is checked is what carries over to a real device: the resolution, how many screens of
    // pixels a frame covers, the CPU budget where this machine keeps up, and that the safety net sheds effects
    // before it touches resolution and never goes below 75%.
    const canvasAt = async (w, h, d, setting) => {
      const p = await open(w, h, d);
      const r = await p.evaluate(async s => { __ppTest.quality(s); PP.R.quality.frame = () => {}; __ppTest.startCave('1-3'); await new Promise(r => setTimeout(r, 500)); const c = document.getElementById('game'); return [c.width, c.height, PP.R.quality.tier.id]; }, setting);
      await p.close();
      return r;
    };
    const ph = await canvasAt(390, 844, 3, 'native');
    check(ph[0] === 1170 && ph[1] === 2532 && ph[2] === 'ultra', 'a phone draws at its full native resolution with every effect on', ph.join(' '));
    const k4 = await canvasAt(3840, 2160, 1, 'native');
    check(k4[0] === 3840 && k4[1] === 2160 && k4[2] === 'ultra', 'a 4K screen draws at 3840 x 2160 with every effect on', k4.join(' '));
    const k5 = await canvasAt(5120, 2880, 1, 'native');
    check(k5[0] * k5[1] <= 3840 * 2160 * 1.07 && k5[0] * k5[1] >= 3840 * 2160 * 0.95, 'a screen bigger than 4K draws at 4K\'s pixel count', k5.join(' '));
    const sv = await canvasAt(3840, 2160, 1, 'saver');
    check(sv[0] * sv[1] <= 2.15e6 && sv[2] === 'medium', 'Battery saver draws at about 1080p with lighter effects', sv.join(' '));

    // screens of pixels a frame covers (image and rectangle fills on the main canvas), at native 4K
    const fill = async (w, h, d) => {
      const p = await open(w, h, d);
      const r = await p.evaluate(async () => {
        __ppTest.quality('native'); PP.R.quality.frame = () => {};
        __ppTest.startCave('1-3'); __ppTest.autopilot(true, {});
        await new Promise(r => setTimeout(r, 1500));
        const ctx = PP.R.ctx, CW = ctx.canvas.width, CH = ctx.canvas.height;
        let area = 0, frames = 0;
        const add = (x, y, w, h) => {
          const m = ctx.getTransform();
          if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6) { area += Math.abs(w * h * (m.a * m.d - m.b * m.c)); return; }
          let x0 = m.a * x + m.e, y0 = m.d * y + m.f, x1 = m.a * (x + w) + m.e, y1 = m.d * (y + h) + m.f;
          if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0];
          area += Math.max(0, Math.min(CW, x1) - Math.max(0, x0)) * Math.max(0, Math.min(CH, y1) - Math.max(0, y0));
        };
        const di = ctx.drawImage, fr = ctx.fillRect, f0 = PP.R.frame;
        ctx.drawImage = function (img, ...a) { if (a.length === 2) add(a[0], a[1], img.width, img.height); else if (a.length === 4) add(...a); else add(a[4], a[5], a[6], a[7]); return di.call(this, img, ...a); };
        ctx.fillRect = function (x, y, w, h) { add(x, y, w, h); return fr.call(this, x, y, w, h); };
        PP.R.frame = function () { frames++; return f0.apply(this, arguments); };
        await new Promise(r => setTimeout(r, 2500));
        ctx.drawImage = di; ctx.fillRect = fr; PP.R.frame = f0;
        return { screens: +(area / Math.max(1, frames) / (CW * CH)).toFixed(2), frames };
      });
      await p.close();
      return r;
    };
    for (const [w, h, d] of [[390, 844, 3], [3840, 2160, 1]]) {
      const r = await fill(w, h, d);
      check(r.screens <= 4.2, `a frame at ${w}x${h}@${d}x covers at most 4.2 screens of pixels`, `${r.screens} screens over ${r.frames} frames`);
    }

    // CPU time per frame with every effect on, in a small window where this machine's drawing keeps up, so what
    // is measured is the game's own work (the pixel side is the screens-covered check above)
    for (const cave of ['1-3', '2-6', '3-5']) {
      const p = await open(640, 360, 1);
      const st = await p.evaluate(async id => {
        __ppTest.quality('ultra'); __ppTest.startCave(id); __ppTest.autopilot(true, {});
        await new Promise(r => setTimeout(r, 4000));
        return __ppTest.frameStats();
      }, cave);
      check(st.work < 10, `frame budget with every effect on (cave ${cave})`, `${st.work} ms of work per frame, ${st.avg} ms between frames`);
      await p.close();
    }

    // smooth motion on 90 and 120 Hz screens: the simulation steps at 60 Hz, so without blending some frames show
    // the camera where it was the frame before (a visible hitch) and the next jumps two steps
    {
      const p = await open(640, 360, 1);
      const sm = await p.evaluate(() => {
        __ppTest.quality('ultra'); PP.R.quality.frame = () => {};
        __ppTest.startCave('1-3'); __ppTest.autopilot(true, { fast: true }); __ppTest.step(3);
        PP.loop.stop();
        const STEP = 1 / 60, out = {}, apply = Kit.cam.apply;
        let seen = null;
        Kit.cam.apply = function () { if (seen === null) seen = Kit.cam.x; return apply.apply(this, arguments); };
        for (const hz of [90, 120]) for (const blend of [true, false]) {
          let acc = 0, still = 0, n = 0, prev = null;
          for (let f = 0; f < 90; f++) {
            acc += 1 / hz;
            while (acc >= STEP) { PP.R.beforeStep(); PP.run.update(STEP); Kit.cam.update(STEP); acc -= STEP; }
            seen = null; PP.R.frame(blend ? acc / STEP : 1);
            if (prev !== null && seen !== null) { n++; if (Math.abs(seen - prev) < 1e-6) still++; }
            prev = seen;
          }
          out[hz + (blend ? '' : 'raw')] = still + '/' + n;
        }
        Kit.cam.apply = apply;
        return out;
      });
      check(sm['90'].startsWith('0/') && sm['120'].startsWith('0/') && !sm['90raw'].startsWith('0/'), 'the camera moves every frame on 90 and 120 Hz screens (blended between steps)', JSON.stringify(sm));
      await p.close();
    }

    // the safety net, on a 4K screen this machine cannot keep up with: effects go first, then resolution, and
    // never below 75%
    const q = await open(3840, 2160, 1);
    const sn = await q.evaluate(async () => {
      __ppTest.quality('native'); __ppTest.startCave('1-3'); __ppTest.autopilot(true, {});
      await new Promise(r => setTimeout(r, 14000));
      const Q = PP.R.quality, c = document.getElementById('game');
      return { steps: Q.steps.slice(), g: Q.g, tier: Q.tier.id, px: c.width + 'x' + c.height };
    });
    const firstScale = sn.steps.findIndex(x => x.startsWith('scale')), lastLevel = sn.steps.lastIndexOf('level:low');
    check(sn.steps.length > 0 && (firstScale < 0 || (lastLevel >= 0 && lastLevel < firstScale)), 'the safety net sheds every effect level before it lowers the resolution', sn.steps.join(' '));
    check(sn.g >= 0.75 - 1e-6, 'the safety net never draws below 75% of native', `scale ${sn.g.toFixed(2)} at ${sn.px}, level ${sn.tier}`);
    await q.close();
  }

  check(errors.length === 0, 'no errors in the console', errors.slice(0, 5).join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
