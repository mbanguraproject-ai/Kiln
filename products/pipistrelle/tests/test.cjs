// Pipistrelle's tests (docs/pipistrelle/BRIEF.md, Engineering): the economy simulator, save migration, every cave
// generates, the bot finishes every cave and earns every Moon with Pip, The Long Night runs, every screen opens,
// and the frame-time budget at phone, laptop and 4K sizes.
// Usage: node tests/test.cjs [--only=economy,caves,moons,screens,frames] [--port=8920]
// Needs Playwright (NODE_PATH=/opt/node22/lib/node_modules if it is installed globally).
const { chromium } = require('playwright');
const { serve } = require('../tools/serve.cjs');

const args = process.argv.slice(2);
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
  nosiphon: [{ careful: true }, {}, { fast: true }],
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

  if (want('frames')) {
    // CPU time per frame (simulation plus drawing) while flying. Headless Chromium draws canvases on the CPU with
    // no GPU, so these numbers are a stress test, not a phone's: High must fit the budget at every size, and on
    // Auto the governor must bring a 4K screen within it by itself (lowering resolution, then the tier).
    const fly = (tier, ms) => async () => {
      __ppTest.quality(tier === 'auto' ? 'auto' : tier);
      __ppTest.startCave('1-3');
      __ppTest.autopilot(true, {});
      await new Promise(r => setTimeout(r, ms));
      const c = document.getElementById('game');
      return Object.assign(__ppTest.frameStats(), { px: c.width + 'x' + c.height });
    };
    for (const [w, h, d] of [[390, 844, 3], [1280, 800, 1], [3840, 2160, 1]]) {
      const p = await open(w, h, d);
      const st = await p.evaluate(`(${fly.toString()})('high', 4000)()`);
      check(st.work < 12, `frame budget on High at ${w}x${h}@${d}x`, `${st.work} ms of work per frame at ${st.px}`);
      await p.close();
    }
    const p = await open(3840, 2160, 1);
    const st = await p.evaluate(`(${fly.toString()})('auto', 12000)()`);
    check(st.work < 16, 'on Auto, the governor brings 4K within the frame budget', `${st.work} ms at ${st.px}, tier ${st.tier}, scale ${st.g}`);
    await p.close();
  }

  check(errors.length === 0, 'no errors in the console', errors.slice(0, 5).join(' | '));
  await browser.close();
  srv.close();
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})();
