/* Screens: Title, the Roost (home), World map, Cave brief, Flight, Pause, How to play, Results, Journal, Requests,
 * Settings, The Long Night, the Nightly Cave and the biome's end. (The Hangar is in hangar.js.) */
(function () {
  'use strict';
  const PP = window.PP, Kit = window.Kit, U = PP.ui, h = U.h;
  const fmt = Kit.fmt;

  /* ---------- game flow ---------- */
  const GM = PP.game = {};
  GM.allCaves = () => { const out = []; for (const id of PP.data.campaign.order) { const B = PP.biomes[id]; if (B && B.ready) for (const c of B.caves) out.push(c); } return out; };
  GM.caveById = id => GM.allCaves().find(c => c.id === id);
  GM.nextCave = id => { const all = GM.allCaves(), i = all.findIndex(c => c.id === id); return i >= 0 ? all[i + 1] : null; };
  GM.begin = function (opts) {
    opts.bat = opts.bat || PP.profile.get().bats.selected;
    if (!PP.profile.owns(opts.bat) && opts.kind !== 'practice') opts.bat = 'pip';
    GM.last = opts;
    PP.run.start(opts);
    PP.R.firstFrame = true;
    U.show('flight', {}, { replace: U.curName === 'results' || U.curName === 'flight' || U.curName === 'pause' });
    PP.loop.resume(); Kit.audio.hold(false);
  };
  GM.startCave = def => GM.begin({ kind: 'campaign', cave: def });
  GM.startEndless = () => GM.begin({ kind: 'endless' });
  GM.startPractice = bat => GM.begin({ kind: 'practice', bat, cave: GM.practiceCave(), seed: PP.data.campaign.practice.seed });
  GM.startNightly = () => GM.begin({ kind: 'nightly', cave: GM.nightlyCave(), seed: GM.nightlyCave().seed });
  GM.restart = () => { if (GM.last) GM.begin(Object.assign({}, GM.last)); };
  GM.practiceCave = () => ({ id: 'practice', name: 'Practice Hollow', biome: 'chalk', mission: 'practice', screens: 6, H: 1080, rad: 118, moths: 26, drain: 0, branches: 2, loops: 0.4, pups: [{ at: 0.4 }, { at: 'chamber' }], hazards: { webs: { n: 2, from: 0.3, to: 0.9 }, stals: { n: 3, from: 0.3, to: 0.9 }, river: { at: [0.45, 0.6], level: 0.38 } }, moons: [], intro: 'Fly freely. Nothing to lose here.' });
  // the Nightly Cave: seeded by the date; the real moon's phase sets how bright the arch is and what it holds
  GM.nightlyCave = function () {
    const day = PP.today(), lun = PP.lunar(), seed = PP.hashStr('nightly:' + day);
    const r = Kit.rng(seed), hz = {};
    if (r.chance(0.7)) hz.webs = { n: 3, from: 0.2, to: 0.9 };
    if (r.chance(0.7)) hz.stals = { n: 5, from: 0.15, to: 0.92 };
    if (lun.light > 0.5) hz.river = { at: [0.3, 0.45], level: 0.38 };
    if (r.chance(0.5)) hz.drips = { n: 4, from: 0.2, to: 0.8 };
    // a different biome each night, opened or not: the Nightly Cave is where the whole world shows itself early
    const ids = PP.data.campaign.order.filter(id => PP.biomes[id] && PP.biomes[id].ready && !PP.biomes[id].finale);
    const biome = ids[Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000) % ids.length] || 'chalk';
    if (biome === 'drowned') hz.river = { at: [[0.22, 0.32], [0.56, 0.66]], level: 0.38 };
    if (biome === 'glass') { hz.crystal = { chamber: true, patches: 3 }; hz.tiger = { n: 2 }; }
    if (biome === 'owlstone') hz.owls = { n: 2, light: true };
    return { id: 'nightly', name: 'The Nightly Cave', biome, seed, mission: 'homing', screens: 9, H: 1140, rad: 108, moths: 22 + Math.round(lun.light * 6), drain: 1.6, pups: 2 + Math.round(lun.light), hazards: hz, moons: [], intro: lun.name + ' tonight, in ' + PP.biome(biome).name, moonLight: lun.light };
  };
  GM.toMap = () => { U.show('roost', {}, { reset: true }); U.show('map'); };
  GM.home = () => U.show('roost', {}, { reset: true });
  // background flight behind the title and menus
  GM.attract = function () { PP.run.start({ kind: 'attract', seed: 7 }); PP.R.firstFrame = true; PP.loop.resume(); };

  PP.on('runEnd', res => {
    const G = PP.G;
    if (!G || G.mode !== 'play') return;
    if (G.kind === 'practice') { setTimeout(() => { U.show('hangar', {}, { replace: true }); U.toast(res.won ? 'Practice flight complete' : 'Practice over'); GM.attract(); }, 150); return; }
    // every third run, the break before the results is where an interstitial plays (js/ads.js)
    setTimeout(() => PP.ads.runBreak(res).then(() => U.show('results', { res }, { replace: true })), res.won ? 60 : 300);
  });

  const card = (title, text, onclick, cls, kids) => h('button.card' + (cls || ''), { onclick: () => { PP.uiSfx(); onclick(); } }, [h('h3', { text: title }), text ? h('p', { text }) : null].concat(kids || []));
  // the Roost's menu cards: a glowing badge with an icon, the title and line beside it, an accent colour each
  const ICON = {
    rain: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 2.5a7.5 7.5 0 1 0 7 10.2A6.2 6.2 0 0 1 14.5 2.5z" fill="currentColor"/><path d="M4.5 16.5l-1.2 3.2M8.5 17.5l-1.2 3.2M12.5 18.5l-1.2 3.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17a5.5 8.5 0 0 0 0-17z" fill="currentColor"/></svg>',
    night: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V12a9 9 0 0 1 18 0v9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12 7.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor"/><circle cx="7.5" cy="15" r="1" fill="currentColor"/><circle cx="16.5" cy="16" r="1" fill="currentColor"/></svg>',
    bat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2l-1.2-2.6-.6 3c-2.3-.4-4.6.3-6.7 2-.6.5-1.4.4-2.5 0 1.6 2.8 3.4 4.2 5.3 4 1 .9 2.3 1.2 3.3.6L12 18l2.4-2.8c1 .6 2.3.3 3.3-.6 1.9.2 3.7-1.2 5.3-4-1.1.4-1.9.5-2.5 0-2.1-1.7-4.4-2.4-6.7-2l-.6-3z" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7.3 4.5 3.5 5v13c3.8-.5 6.5 0 8.5 1.5 2-1.5 4.7-2 8.5-1.5V5c-3.8-.5-6.5 0-8.5 1.5zM12 6.5v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    scroll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h11a2.5 2.5 0 0 1 0 5h-1v10.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 19.5V18h9.5v1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 4a2.5 2.5 0 0 0-2.5 2.5V8H6M8.5 9h5M8.5 12.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
  };
  // the moon tonight, drawn at its real phase (the Nightly Cave's arch is as bright as this moon)
  const moonIcon = k => {
    // (a thin crescent is drawn a little fuller, so it reads at the size of a badge)
    const c = Math.cos(k * PP.TAU), rx = (Math.min(Math.abs(c), c > 0 ? 0.62 : 1) * 8.5).toFixed(2), wax = k < 0.5;
    const outer = wax ? 1 : 0, term = wax ? (c > 0 ? 0 : 1) : (c < 0 ? 0 : 1);
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/><path d="M12 3.5A8.5 8.5 0 0 ' + outer + ' 12 20.5A' + rx + ' 8.5 0 0 ' + term + ' 12 3.5z" fill="currentColor"/></svg>';
  };
  // a compact tile for one of the four ways to play: badge, a chip with the number that matters, the name, and a
  // line saying what you will find there
  const mtile = (icon, acc, title, chip, line, onclick, cls, dot) => h('button.card.mtile' + (cls || ''), { style: '--acc:' + acc, onclick: () => { PP.uiSfx(); onclick(); } }, [
    h('span.mhead', null, [h('span.medal', { html: ICON[icon] || icon }), chip ? h('span.mchip', { text: chip }) : null]),
    h('h3', { text: title }), h('p', { text: line }), dot ? h('span.dot-new') : null,
  ]);
  const shortName = n => n.replace(/^The /, '');

  // what the Long Rain asks of you next: the first open cave not yet flown out of, else the first with a Moon still
  // to find, else the last cave of all
  GM.nextUp = function () {
    const PR = PP.profile, open = [];
    for (const id of PP.data.campaign.order) { const B = PP.biomes[id]; if (B && B.ready) B.caves.forEach((cv, i) => { if (PR.caveOpen(id, i)) open.push(cv); }); }
    let cv = open.find(c => !PR.cleared(c.id));
    if (cv) return { cv, why: PR.get().caves[cv.id] ? 'Try again' : 'Next cave' };
    cv = open.find(c => PR.caveMoons(c.id).some(m => !m));
    if (cv) return { cv, why: 'Moons to find' };
    const all = GM.allCaves();
    return { cv: all[all.length - 1], why: 'Fly it again' };
  };

  /* ---------- The Roost (home) ---------- */
  // The Roost: the belfry is the home screen. Four compact tiles sit in its top corners, so the colony hanging in the
  // middle stays in view (tap it: js/ui/roost.js); at the bottom, the Long Rain shows the next cave you will fly, as a
  // little picture of its biome, with its mission, its Moons and how far through each biome you are, and Requests.
  function hero() {
    const p = PP.profile.get(), M = PP.data.missions, nx = GM.nextUp(), cv = nx.cv, B = PP.biome(cv.biome);
    const total = GM.allCaves().length * 3, got = PP.profile.totalMoons(), mt = M.types[cv.mission];
    const pups = Array.isArray(cv.pups) ? cv.pups.length : cv.pups || 0;
    const pc = h('canvas.postcard', { 'aria-hidden': 'true' });
    const track = h('span.btrack');
    for (const id of PP.data.campaign.order) {
      const Bi = PP.biomes[id];
      if (!Bi || !Bi.ready) continue;
      const open = PP.profile.caveOpen(id, 0), k = PP.profile.moonsIn(Bi.index + '-') / (Bi.caves.length * 3);
      track.appendChild(h('span.bseg' + (open ? '' : '.shut') + (id === cv.biome ? '.here' : ''), { style: '--bc:' + Bi.palette.accent, title: Bi.name }, h('i', { style: 'width:' + Math.round(k * 100) + '%' })));
    }
    // where the cave takes you: from where you enter to the way out, and what waits on the way
    // (the owner, 15 October: fewer labels competing; the mission in a line, the lost pups in the route's pink)
    const line = mt.line.replace(/\.$/, '');
    const pupNote = pups ? h('span.hpup', null, [h('i'), PP.plural(pups, cv.mission === 'kin' ? 'pup' : 'lost pup').replace(/ /g, '\u00a0')]) : null;
    const fly = h('button.btn.gold.hero-fly', { 'aria-label': 'Fly ' + cv.name, onclick: e => { e.stopPropagation(); PP.uiSfx(); Kit.audio.unlock(); GM.startCave(cv); } }, [h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>' }), 'Fly']);
    const el = h('div.card.mcard.hero', { role: 'button', tabindex: '0', style: '--acc:' + B.palette.accent, onclick: () => { PP.uiSfx(); U.show('map'); } }, [
      h('span.pcwrap', null, [pc, h('span.pcring'), h('span.pcl.from', { text: 'You' }), h('span.pcl.to', null, [h('span.pcl-long', { text: 'Moonlit ' }), 'arch'])]),
      h('span.hbody', null, [
        // the plain next cave needs no tag; a retry, Moons still to find or a last cave flown again say so
        h('span.hmeta', null, [nx.why !== 'Next cave' ? h('span.htag', { text: nx.why }) : null, h('span.eyebrow', { text: shortName(B.name) + ' · cave ' + (B.caves.indexOf(cv) + 1) + ' of ' + B.caves.length })]),
        h('span.hrow', null, [h('span.htext', null, [h('h3', { text: cv.name }), h('p', { title: mt.name }, [line, pupNote ? ' ' : null, pupNote])]), fly]),
        h('span.hprog', null, [
          h('span.hpg', { title: 'Moons in this cave' }, [U.moons(PP.profile.caveMoons(cv.id))]),
          h('span.hpg.grow', { title: PP.data.campaign.name + ': Moons in each biome' }, [track, h('span.hcount', { 'aria-label': got + ' of ' + total + ' Moons' }, [String(got), h('small', { text: '/' + total })])]),
        ]),
      ]),
    ]);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    // paint the picture once the card has its size
    const paint = () => { if (pc.isConnected && PP.roost.postcard) PP.roost.postcard(pc, cv, p.bats.selected); };
    requestAnimationFrame(() => requestAnimationFrame(paint));
    return { el, paint };
  }

  /* ---------- Title ---------- */
  U.def('title', () => {
    const el = h('div.scr.title.scrim', null, [
      h('div.title-head', null, [h('div.kicker', { text: 'A little bat in the dark' }), h('h1.wordmark', { text: 'Pipistrelle' }), h('p.tagline', { text: 'Chirp to see. Eat moths. Bring the lost pups home.' })]),
      h('div.actions', null, [
        h('button.btn.big', { onclick: () => { PP.uiSfx(); Kit.audio.unlock(); U.show('roost'); }, text: 'Fly' }),
      ]),
    ]);
    return { el, scene: 'cave', show() { if (!PP.G || PP.G.mode !== 'attract') GM.attract(); PP.audio.menu(); }, back() { const app = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (app && app.exitApp) app.exitApp(); return true; } };
  });

  U.def('roost', () => {
    const p = PP.profile.get(), lun = PP.lunar(), E = PP.data.economy;
    const newBats = PP.data.bats.some(b => b.id !== 'pip' && PP.profile.arrived(b) && !PP.profile.owns(b) && !p.seen.bats[b.id]);
    const newReq = Object.keys(p.requests.done).some(id => !p.seen.requests[id]);
    const night = GM.nightlyCave(), nB = PP.biome(night.biome), done = PP.profile.nightlyDone();
    const LN = p.longNight, sel = PP.batById(p.bats.selected), caves = GM.allCaves();
    const read = caves.filter(c => p.journal.scratches[c.id]).length, reqs = PP.data.requests, reqDone = reqs.filter(rq => p.requests.done[rq.id]).length;
    const H = hero();
    const el = h('div.scr.roost-ui', null, [
      h('div.top', null, [h('h2', { text: 'The Roost' }), U.larder(), h('button.icon-btn', { 'aria-label': 'Settings', html: U.icon.gear, onclick: () => { PP.uiSfx(); U.show('settings'); } })]),
      h('div.roost-modes', null, [
        h('div.mcol', null, [
          mtile(moonIcon(lun.phase), 'var(--moon)', 'Nightly Cave', done ? 'Done' : '+' + E.nightly, shortName(nB.name) + ' · ' + lun.name.toLowerCase(), () => U.show('nightly'), done ? '.done' : ''),
          mtile('night', '#b58cff', 'Long Night', LN.best ? 'Cave ' + LN.bestCave : 'New', LN.best ? 'Endless caves · best ' + fmt(LN.best) : 'Endless caves, one life', () => U.show('longnight')),
        ]),
        h('div.mcol', null, [
          mtile('bat', 'var(--teal)', 'Hangar', p.bats.owned.length + '/' + PP.data.bats.length, newBats ? 'A new bat has come to roost' : 'Flying ' + sel.name + ' · try the others', () => U.show('hangar'), '', newBats),
          mtile('book', '#ffb46b', 'Journal', read + '/' + caves.length, 'Scratches, moths and pups found', () => U.show('journal')),
        ]),
      ]),
      h('div.home-menu', null, [
        H.el,
        h('button.card.mcard.wide.reqbar', { style: '--acc:var(--pink)', 'aria-label': 'Requests, ' + reqDone + ' of ' + reqs.length + ' done', onclick: () => { PP.uiSfx(); U.show('requests'); } }, [
          h('span.medal', { html: ICON.scroll }),
          h('span.rq', null, [
            h('h3', { text: 'Requests' }), h('span.rqcount', null, [reqDone + '/' + reqs.length, h('small', { text: 'done' })]),
            // one segment per request: full when done, part-filled as you get closer
            h('span.rqbar', null, reqs.map(rq => { const d = !!p.requests.done[rq.id], g = rq.goal(p), k = d ? 1 : Math.max(0, Math.min(1, g[0] / Math.max(1, g[1]))); return h('i' + (d ? '.on' : ''), { style: '--k:' + Math.round(k * 100) + '%' }, h('b')); })),
          ]),
          newReq ? h('span.dot-new') : null,
        ]),
      ]),
    ]);
    let onResize = null;
    return {
      el, scene: 'roost',
      show() { PP.roost.invalidate(); PP.audio.menu(); PP.audio.prepare(GM.nextUp().cv.biome); PP.loop.resume(); onResize = () => { H.paint(); PP.roost.invalidate(); }; addEventListener('resize', onResize); },
      hide() { if (onResize) removeEventListener('resize', onResize); onResize = null; },
    };
  });

  /* ---------- World map ---------- */
  U.def('map', () => {
    const p = PP.profile.get(), kids = [];
    for (const id of PP.data.campaign.order) {
      const B = PP.biomes[id];
      if (!B) continue;
      const gate = PP.data.campaign.gates[id] || 0, moons = PP.profile.moonsIn(B.index + '-');
      const head = h('div.row', null, [h('div.grow', null, [h('div.eyebrow', { text: id === 'hush' ? 'Finale' : 'Biome ' + B.index }), h('h3', { text: B.name })]), B.ready ? h('span.tag.gold', { text: moons + ' / ' + B.caves.length * 3 }) : null]);
      const c = h('div.card.biome' + (B.ready ? '' : '.locked'), null, [head, h('p', { text: B.line })]);
      if (!B.ready) c.appendChild(h('p.muted', { text: 'Still to come · opens at ' + gate + ' Moons' }));
      else {
        const grid = h('div.caves');
        B.caves.forEach((cv, i) => {
          const open = PP.profile.caveOpen(id, i), cm = PP.profile.caveMoons(cv.id);
          grid.appendChild(h('button.cave-node' + (open ? '.open' : '.locked') + (cv.setPiece ? '.star' : ''), { onclick: () => { PP.uiSfx(); U.show('brief', { id: cv.id }); } }, [
            h('span.n', { text: cv.id }), h('span.nm', { text: cv.name }), U.moons(cm),
          ]));
        });
        c.appendChild(grid);
        if (PP.profile.cleared(B.caves[B.caves.length - 1].id) && B.flight) c.appendChild(h('div.row', null, [h('button.btn.ghost', { text: 'Fly ' + B.flight.title.toLowerCase() + ' again', onclick: () => { PP.uiSfx(); GM.startFlight(B.id); } })]));
      }
      kids.push(c);
    }
    const el = h('div.scr.scrim', null, [U.top(PP.data.campaign.name), h('div.body', null, h('div.wrap', null, kids))]);
    return { el, scene: 'roost' };
  });

  /* ---------- Cave brief ---------- */
  function batPicker(onPick) {
    const p = PP.profile.get(), row = h('div.batpick');
    for (const id of p.bats.owned) {
      const bat = PP.batById(id), cv = h('canvas', { width: 64, height: 64, 'data-w': 72, 'data-h': 48, 'aria-hidden': 'true' });
      cv.style.width = '4.5rem'; cv.style.height = '3rem';
      PP.hangar.paintBat(cv, bat);
      requestAnimationFrame(() => PP.hangar.paintBat(cv, bat));
      row.appendChild(h('button' + (p.bats.selected === id ? '.on' : ''), { onclick: () => { PP.uiSfx(); PP.profile.select(id); if (onPick) onPick(); } }, [cv, bat.name]));
    }
    return row;
  }
  PP.ui.batPicker = batPicker;
  U.def('brief', args => {
    const cv = GM.caveById(args.id), B = PP.biome(cv.biome), M = PP.data.missions, cm = PP.profile.caveMoons(cv.id);
    PP.audio.prepare(cv.biome);
    const moonRows = cv.moons.map((m, i) => h('div.brief-moon', null, [U.moon(i, cm[i] ? 'on' : 'off', true), h('b', { text: M.slots[i] }), h('span.grow', { text: PP.missions.text(m) })]));
    const heard = (cv.heardWell || []).map(id => PP.batById(id).name).join(', ');
    const best = PP.profile.get().caves[cv.id];
    const el = h('div.scr.scrim', null, [
      U.top(cv.id + '  ' + cv.name),
      h('div.body', null, h('div.wrap', null, [
        h('div.card.lit', null, [h('div.eyebrow', { text: B.name + ' · ' + M.types[cv.mission].name + (cv.setPiece ? ' · set piece' : '') }), h('h3', { text: cv.name }), h('p', { text: /[.!?]$/.test(cv.intro) ? cv.intro : cv.intro + '.' }), h('p.muted', { text: M.types[cv.mission].line })]),
        h('div.card', null, [h('div.eyebrow', { text: 'Moons' }), h('div.brief-moons', null, moonRows), best && best.best ? h('p.muted', { text: 'Best: ' + Math.round(best.best.time) + ' s · ' + fmt(best.best.bank) + ' moths banked' }) : null]),
        heard ? h('p.muted', { text: 'Heard well by: ' + heard }) : null,
        h('div.card', null, [h('div.eyebrow', { text: 'Fly as' }), batPicker(() => U.refresh())]),
      ])),
      h('div.foot', null, [h('button.btn.big', { text: 'Fly', onclick: () => { PP.uiSfx(); GM.startCave(cv); } })]),
    ]);
    return { el, scene: 'roost' };
  });

  /* ---------- Flight ---------- */
  U.def('flight', () => {
    const skip = h('button.btn.ghost.skip', { text: 'Skip', hidden: true, onclick: () => { PP.uiSfx(); PP.night.skip(); } });
    // the Last Echo's offer: fly on with a rewarded ad, or let the echoes fade (js/rescue.js)
    const ring = h('div.offer-ring'), why = h('p.muted'), note = h('p.offer-note');
    const watch = h('button.btn.big.offer-watch', { onclick: () => { PP.uiSfx(); PP.rescue.watch(); } }, [h('span.ad-tag', { text: 'Ad' }), h('span', { text: 'Watch and fly on' })]);
    const fade = h('button.btn.ghost', { text: 'Let the echoes fade', onclick: () => { PP.uiSfx(); PP.rescue.giveUp(); } });
    const offer = h('div.offer', { hidden: true, role: 'dialog', 'aria-label': 'Fly on?' }, h('div.card', null, [ring, h('h2', { text: 'Fly on?' }), why, h('p', { text: 'Most of your energy back, and a moment of safety.' }), watch, note, fade]));
    const syncOffer = () => {
      const G = PP.G, S = G && G.rescue;
      if (!S || S.stage !== 'offer') { offer.hidden = true; return; }
      offer.hidden = false;
      why.textContent = S.why + (G.kind === 'endless' ? ' · cave ' + G.cave : G.caveDef ? ' · ' + G.caveDef.name : '');
      const ready = PP.ads.ready();
      watch.disabled = !ready || S.busy;
      note.textContent = S.busy ? 'The ad is playing…' : ready ? 'A short ad, once per flight.' : 'No ad right now' + (PP.ads.error ? ' (' + PP.ads.error.code + ')' : '') + '. Let the echoes fade to end the flight.';
      ring.style.setProperty('--k', String(Math.max(0, S.offerT) / 9));
      ring.textContent = String(Math.ceil(Math.max(0, S.offerT)));
    };
    PP.on('offer', () => { syncOffer(); if (!offer.hidden) setTimeout(() => (PP.ads.ready() ? watch : fade).focus(), 50); });
    PP.on('offerBusy', syncOffer);
    PP.on('offerClose', () => { offer.hidden = true; });
    const el = h('div.scr.flight', null, [
      h('button.icon-btn.pause', { 'aria-label': 'Pause', html: U.icon.pause, onclick: () => { PP.uiSfx(); GM.pause(); } }),
      skip, offer,
    ]);
    let timer = 0;
    return {
      el, scene: 'cave',
      show() { U.bars('hide'); Kit.audio.hold(false); PP.loop.resume(); timer = setInterval(() => { const G = PP.G; skip.hidden = !(G && G.sub === 'night' && G.mode === 'play' && (G.kind === 'endless' || PP.profile.get().flights[G.flightBiome])); syncOffer(); }, 200); },
      hide() { clearInterval(timer); },
      back() { GM.pause(); return true; },
    };
  });
  GM.pause = function () {
    const G = PP.G;
    if (!G || G.mode !== 'play' || G.sub === 'done') return;
    PP.input.reset();
    PP.loop.pause();
    Kit.audio.hold(true);
    U.show('pause');
  };
  GM.resume = function () { U.back(); };
  U.def('pause', () => {
    const G = PP.G;
    const el = h('div.scr.pause-menu.scrim-strong', null, h('div.card', null, [
      h('h2', { text: 'Paused' }),
      h('p.muted', { text: G.kind === 'campaign' ? G.caveDef.id + '  ' + G.caveDef.name : G.kind === 'endless' ? 'The Long Night · cave ' + G.cave : G.kind === 'practice' ? 'Practice Hollow' : 'The Nightly Cave', style: 'text-align:center;margin:-0.2rem 0 0.4rem' }),
      h('button.btn', { text: 'Resume', onclick: () => { PP.uiSfx(); GM.resume(); } }),
      h('button.btn.ghost', { text: 'Restart', onclick: () => { PP.uiSfx(); PP.run.abandon(); U.stack.pop(); GM.restart(); } }),
      h('button.btn.ghost', { text: 'How to play', onclick: () => { PP.uiSfx(); U.show('how'); } }),
      h('button.btn.ghost', { text: 'Settings', onclick: () => { PP.uiSfx(); U.show('settings'); } }),
      h('button.btn.ghost', { text: G.kind === 'campaign' ? 'Quit to map' : 'Quit', onclick: () => { PP.uiSfx(); PP.run.abandon(); Kit.audio.hold(false); PP.loop.resume(); if (G.kind === 'campaign') GM.toMap(); else GM.home(); } }),
    ]));
    return { el, scene: 'cave', show() { PP.loop.pause(); Kit.audio.hold(true); PP.loop.render(); }, back() { GM.resume(); return true; } };
  });
  U.def('how', () => {
    const el = h('div.scr.scrim-strong', null, [U.top('How to play', { larder: false }), h('div.body', null, h('div.wrap.how', null, [
      h('p', { text: 'Drag anywhere (or arrow keys) to fly; let go to glide. Walls stun you, never kill.' }),
      h('p', { text: 'Tap (Space) to chirp and see. Hold still, or press Shift, to shriek twice as far.' }),
      h('p', { text: 'Fly into hanging pups: each one multiplies the moths you bank at the moonlit arch. Lost pups answer your calls in pink.' }),
      h('p', { text: 'Moths are energy. Webs, stalactites, water and owls all warn you first: listen. Teal is rock, gold is food, pink is pups, red is danger.' }),
      h('p', { text: 'Each cave has three Moons: Homecoming, Kin and Mastery. A Moon dims the moment it is out of reach. Earn them on any attempt.' }),
    ]))]);
    return { el, scene: U.stack.length > 1 && U.stack[U.stack.length - 2].name === 'pause' ? 'cave' : 'roost' };
  });

  /* ---------- Results ---------- */
  U.def('results', args => {
    const res = args.res, G = PP.G, M = PP.data.missions;
    const kids = [];
    if (res.kind === 'campaign') {
      const cv = res.cave;
      kids.push(h('div.eyebrow', { text: cv.id + '  ' + cv.name }));
      kids.push(h('h1', { text: res.won ? 'Home under the moon' : (G.overtaken ? 'Overtaken' : 'The echoes fade') }));
      const row = h('div.row', { style: 'justify-content:center;gap:0.2rem' });
      for (let i = 0; i < 3; i++) {
        const now = res.moonsThisRun && res.moonsThisRun[i], had = res.moons[i];
        row.appendChild(h('div.result-moon' + (res.newMoons[i] ? '.new' : ''), null, [U.moon(i, had ? 'on' : (G.moons[i] && G.moons[i].state === 'lost') ? 'lost' : 'off', true), h('span', { text: M.slots[i] }), h('span.muted', { text: res.newMoons[i] ? 'New!' : now ? 'Earned again' : had ? 'Earned' : PP.missions.text(cv.moons[i]) })]));
      }
      kids.push(row);
    } else if (res.kind === 'endless') {
      kids.push(h('div.eyebrow', { text: 'The Long Night' }));
      kids.push(h('h1', { text: 'Cave ' + res.depth }));
      kids.push(h('p.muted', { text: 'Every moth you banked is in the larder.' }));
    } else if (res.kind === 'flight') {
      const end = PP.biome(G.flightBiome).finale;
      kids.push(h('div.eyebrow', { text: end ? 'The Long Rain' : PP.biome(G.flightBiome).name + ' complete' }));
      kids.push(h('h1', { text: end ? 'The colony is home' : 'Home' }));
      kids.push(h('p', { text: end ? 'Every pup you found sleeps in the belfry tonight, out of the rain. ' + PP.plural(PP.profile.get().stats.pups, 'pup') + ' brought home.' : 'The colony is a little bigger tonight. The rain goes on, deeper in the hill.' }));
    } else {
      kids.push(h('div.eyebrow', { text: 'The Nightly Cave' }));
      kids.push(h('h1', { text: res.won ? 'Cleared' : 'The echoes fade' }));
    }
    if (res.banked || res.won) kids.push(h('div.bank', null, ['+' + fmt(res.banked)]));
    const lines = h('div.lines');
    if (res.kind !== 'endless' && res.kind !== 'flight') {
      if (res.won) lines.appendChild(h('div', null, [h('span', { text: 'Moths carried × (1 + pups home)' }), h('b', { text: (G.bankedNow ? fmt(G.bankedNow / Math.max(1, G.lastMult)) + ' × ' + G.lastMult : '0') })]));
      lines.appendChild(h('div', null, [h('span', { text: 'Pups brought home' }), h('b', { text: String(res.pupsHome || 0) })]));
      lines.appendChild(h('div', null, [h('span', { text: 'Time' }), h('b', { text: Math.round(res.time) + ' s' })]));
      lines.appendChild(h('div', null, [h('span', { text: 'Calls · bumps' }), h('b', { text: res.stats.calls + ' · ' + res.stats.bumps })]));
    } else if (res.kind === 'endless') {
      lines.appendChild(h('div', null, [h('span', { text: 'Score' }), h('b', { text: fmt(res.score) })]));
      lines.appendChild(h('div', null, [h('span', { text: 'Best' }), h('b', { text: fmt(PP.profile.get().longNight.best) })]));
    }
    for (const b of res.bonus) lines.appendChild(h('div.plus', null, [h('span', { text: b.label }), h('b', { text: '+' + b.amount })]));
    for (const rq of res.requests) lines.appendChild(h('div.plus', null, [h('span', { text: 'Request: ' + rq.name }), h('b', { text: '+' + rq.amount })]));
    lines.appendChild(h('div', null, [h('span', { text: 'In the larder' }), h('b', { style: 'color:var(--gold)', text: fmt(res.larder) })]));
    kids.push(lines);
    if (res.arrivals && res.arrivals.length) kids.push(h('p', { style: 'color:var(--pink)', text: res.arrivals.map(id => PP.batById(id).name).join(' and ') + (res.arrivals.length > 1 ? ' have' : ' has') + ' come to the Hangar.' }));
    const foot = h('div.foot');
    if (res.kind === 'campaign') {
      const nx = GM.nextCave(res.cave.id), B = PP.biome(res.cave.biome), lastOfBiome = B.caves[B.caves.length - 1].id === res.cave.id;
      if (res.won && lastOfBiome && B.flight && !PP.profile.get().flights[B.id]) foot.appendChild(h('button.btn', { text: B.flight.title, onclick: () => { PP.uiSfx(); GM.startFlight(B.id); } }));
      else if (res.won && nx && PP.profile.caveOpen(nx.biome, PP.biome(nx.biome).caves.indexOf(nx))) foot.appendChild(h('button.btn', { text: 'Next: ' + nx.name, onclick: () => { PP.uiSfx(); U.show('roost', {}, { reset: true }); U.show('map'); U.show('brief', { id: nx.id }); } }));
      foot.appendChild(h('button.btn' + (res.won ? '.ghost' : ''), { text: res.won ? 'Fly again' : 'Try again', onclick: () => { PP.uiSfx(); GM.restart(); } }));
      foot.appendChild(h('button.btn.ghost', { text: 'Map', onclick: () => { PP.uiSfx(); GM.attract(); GM.toMap(); } }));
    } else {
      if (res.kind !== 'flight') foot.appendChild(h('button.btn', { text: 'Fly again', onclick: () => { PP.uiSfx(); GM.restart(); } }));
      foot.appendChild(h('button.btn' + (res.kind === 'flight' ? '' : '.ghost'), { text: 'Roost', onclick: () => { PP.uiSfx(); GM.attract(); GM.home(); } }));
    }
    kids.push(foot);
    const el = h('div.scr.results.scrim', null, h('div.card', null, kids));
    return { el, scene: 'cave', show() { if (res.newMoons.some(Boolean)) setTimeout(() => PP.uiSfx('moon'), 300); }, back() { GM.attract(); res.kind === 'campaign' ? GM.toMap() : GM.home(); return true; } };
  });

  /* ---------- the end-of-biome flight home ---------- */
  GM.startFlight = function (biomeId) {
    const B = PP.biome(biomeId), f = B.flight;
    GM.last = null;
    PP.run.start({ kind: 'flight', cave: B.caves[B.caves.length - 1], bat: PP.profile.get().bats.selected });
    const G = PP.G;
    G.flightBiome = biomeId; G.kind = 'flight';
    PP.L.moths.length = 0;
    PP.night.start(false, { flight: true, time: f.time, owl: f.owl, colony: f.colony, title: f.title, line: f.line });
    U.show('flight', {}, { replace: U.curName === 'results' });
    PP.loop.resume();
  };

  /* ---------- The Long Night and the Nightly Cave ---------- */
  U.def('longnight', () => {
    const p = PP.profile.get();
    const el = h('div.scr.scrim', null, [U.top('The Long Night'), h('div.body', null, h('div.wrap', null, [
      h('div.card.lit', null, [h('div.eyebrow', { text: 'Endless' }), h('h3', { text: 'One cave after another' }), h('p', { text: 'Caves grow narrower and hungrier. Your energy carries over, and a short night flight between caves feeds you (skip it to bank the usual catch). Moths are banked at every arch and never lost.' })]),
      h('div.card', null, [h('div.lines', null, [
        h('div', null, [h('span', { text: 'Best score' }), h('b', { text: fmt(p.longNight.best) })]),
        h('div', null, [h('span', { text: 'Deepest cave' }), h('b', { text: String(p.longNight.bestCave) })]),
        h('div', null, [h('span', { text: 'Nights flown' }), h('b', { text: String(p.longNight.runs) })]),
      ])]),
      h('div.card', null, [h('div.eyebrow', { text: 'Fly as' }), batPicker(() => U.refresh())]),
    ])), h('div.foot', null, [h('button.btn.big', { text: 'Begin', onclick: () => { PP.uiSfx(); GM.startEndless(); } })])]);
    return { el, scene: 'roost' };
  });
  U.def('nightly', () => {
    const lun = PP.lunar(), done = PP.profile.nightlyDone(), cv = GM.nightlyCave();
    const el = h('div.scr.scrim', null, [U.top('The Nightly Cave'), h('div.body', null, h('div.wrap', null, [
      h('div.card.lit', null, [h('div.eyebrow', { text: PP.today() + ' · ' + lun.name }), h('h3', { text: 'A new cave every night' }), h('p', { text: 'Tonight’s cave is shaped by the real moon: ' + Math.round(lun.light * 100) + '% lit. The brighter the moon, the more moths and pups.' }), h('p.muted', { text: done ? 'Cleared today. Fly it again for the banked moths.' : 'First clear today: +' + PP.data.economy.nightly + ' moths. No streaks, ever.' })]),
      h('div.card', null, [h('div.lines', null, [h('div', null, [h('span', { text: 'Moths' }), h('b', { text: String(cv.moths) })]), h('div', null, [h('span', { text: 'Lost pups' }), h('b', { text: String(cv.pups) })]), h('div', null, [h('span', { text: 'Hazards' }), h('b', { text: Object.keys(cv.hazards).join(', ') || 'none' })])])]),
      h('div.card', null, [h('div.eyebrow', { text: 'Fly as' }), batPicker(() => U.refresh())]),
    ])), h('div.foot', null, [h('button.btn.big', { text: 'Fly', onclick: () => { PP.uiSfx(); GM.startNightly(); } })])]);
    return { el, scene: 'roost' };
  });

  /* ---------- Journal ---------- */
  U.def('journal', args => {
    const p = PP.profile.get(), tab = args.tab || 'scratches';
    const tabs = h('div.seg');
    for (const [id, name] of [['scratches', 'Old Scratches'], ['pups', 'Pups'], ['moths', 'Moths and more']]) tabs.appendChild(h('button' + (tab === id ? '.on' : ''), { text: name, onclick: () => { PP.uiSfx(); U.show('journal', { tab: id }, { replace: true }); } }));
    const list = [];
    if (tab === 'scratches') {
      list.push(h('p.muted', { text: 'The old colony scratched these into the stone. They can only be read inside your echoes: fly close while one is lit.' }));
      for (const cv of GM.allCaves()) {
        const s = p.journal.scratches[cv.id];
        list.push(h('div.card', null, [h('div.eyebrow', { text: cv.id + '  ' + cv.name }), h('p' + (s ? '.scratch' : '.muted'), { text: s ? '“' + s.text + '”' : 'Not yet read.' })]));
      }
    } else if (tab === 'pups') {
      list.push(h('div.card.lit', null, [h('h3', { text: PP.plural(p.stats.pups, 'pup') + ' brought home' }), h('p', { text: 'Each one hangs in the Roost, named for the cave it came from.' })]));
      for (const cv of GM.allCaves()) if (p.roost[cv.id]) list.push(h('div.card', null, [h('div.row', null, [h('span.grow', { text: cv.id + '  ' + cv.name }), h('b', { style: 'color:var(--pink)', text: '×' + p.roost[cv.id] })])]));
    } else {
      const st = p.stats;
      list.push(h('div.card', null, [h('div.lines', null, [
        ['Moths eaten', st.moths], ['Moths earned', st.earned], ['Chirps', st.chirps], ['Shrieks', st.shrieks], ['Caves flown out of', st.caves], ['Moons', PP.profile.totalMoons()], ['Caves without a bump', st.cleanCaves], ['Best survey', st.bestSurvey + '%'], ['Time in the dark', Math.round(st.time / 60) + ' min'],
      ].map(([a, b]) => h('div', null, [h('span', { text: a }), h('b', { text: typeof b === 'number' ? fmt(b) : b })])))]));
    }
    const el = h('div.scr.scrim', null, [U.top('Journal'), h('div.body', null, h('div.wrap', null, [tabs].concat(list)))]);
    return { el, scene: 'roost' };
  });

  /* ---------- Requests ---------- */
  U.def('requests', () => {
    const p = PP.profile.get(), E = PP.data.economy, list = [];
    list.push(h('p.muted', { text: 'Asks from the colony. They never expire and never change; each pays once, when it is done.' }));
    for (const rq of PP.data.requests) {
      const [have, need] = rq.goal(p), done = !!p.requests.done[rq.id];
      const pct = Math.min(100, Math.round(have / need * 100));
      const bar = h('div.bar', null, h('i', { style: 'width:' + (done ? 100 : pct) + '%' + (done ? ';background:var(--gold)' : '') }));
      list.push(h('div.card.req' + (done ? '.done' : ''), null, [h('div', null, [h('h3', { text: rq.name }), h('p', { text: rq.text })]), h('span.price', { text: done ? 'Done' : '+' + E.requests[rq.id] }), bar]));
      p.seen.requests[rq.id] = true;
    }
    PP.profile.save();
    const el = h('div.scr.scrim', null, [U.top('Requests'), h('div.body', null, h('div.wrap', null, list))]);
    return { el, scene: 'roost' };
  });

  /* ---------- Settings ---------- */
  U.def('settings', () => {
    const S = PP.settings;
    const toggle = (k, label, sub) => {
      const sw = h('button.switch' + (S.get(k) ? '.on' : ''), { role: 'switch', 'aria-checked': String(!!S.get(k)), 'aria-label': label });
      sw.addEventListener('click', () => { S.set(k, !S.get(k)); sw.classList.toggle('on', !!S.get(k)); sw.setAttribute('aria-checked', String(!!S.get(k))); PP.uiSfx(); });
      return h('div.toggle', null, [h('span', null, [label, sub ? h('small', { text: sub }) : null]), sw]);
    };
    const slider = (k, label) => {
      const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S.get(k) * 100), 'aria-label': label });
      r.addEventListener('input', () => S.set(k, r.value / 100));
      r.addEventListener('change', () => PP.uiSfx());
      return h('div.toggle', null, [h('span', { text: label }), r]);
    };
    // Display: native resolution up to 4K, always; Battery saver is the one choice
    const res = () => {
      const c = document.getElementById('game'), saver = S.get('quality') === 'saver', Q = PP.R.quality;
      const W = c ? c.width : 0, H = c ? c.height : 0, dpr = devicePixelRatio || 1, full = Math.round(innerWidth * dpr) * Math.round(innerHeight * dpr);
      const k4 = W * H >= 3840 * 2160 * 0.97, at = 'Drawing at ' + W + ' × ' + H;
      if (saver) return { title: 'Battery saver', line: at + ' to save power.' };
      if (Q.g < 1) return { title: 'Native resolution, up to 4K', line: at + ' for now: this device asked for a lighter frame.' };
      if (W * H >= full * 0.97) return { title: k4 ? '4K · native resolution' : 'Native resolution', line: at + ', every pixel of your screen.' };
      return { title: '4K', line: at + ', scaled to your screen.' };
    };
    // how smoothly the caves run on this device, measured in play (so a slow phone can be reported, and seen)
    const smooth = () => { const Q = PP.R.quality, fps = Math.round(1000 / Math.max(1, Q.caveEma)); return Q.frames > 30 || Q.caveEma !== 16.7 ? 'In the caves: about ' + Math.min(fps, 120) + ' frames a second · ' + Q.tier.name + ' effects' + (Q.g < 1 ? ' · ' + Math.round(Q.g * 100) + '% resolution' : '') : 'Fly a cave to measure how smoothly it runs here.'; };
    const r0 = res(), resT = h('b.res-title', { text: r0.title }), resL = h('p.muted', { text: r0.line + ' ' + smooth() });
    const saverSw = h('button.switch' + (S.get('quality') === 'saver' ? '.on' : ''), { role: 'switch', 'aria-checked': String(S.get('quality') === 'saver'), 'aria-label': 'Battery saver' });
    saverSw.addEventListener('click', () => {
      const on = S.get('quality') !== 'saver';
      S.set('quality', on ? 'saver' : 'native');
      saverSw.classList.toggle('on', on); saverSw.setAttribute('aria-checked', String(on)); PP.uiSfx();
      setTimeout(() => { PP.R.frame(); const r = res(); resT.textContent = r.title; resL.textContent = r.line + ' ' + smooth(); }, 60);
    });
    // the ad network's state in words, live: so an ad that cannot load says why instead of failing silently
    const adStatus = h('p.ad-status'), retryB = h('button.btn.ghost', { text: 'Try again', onclick: () => { PP.uiSfx(); PP.ads.retry(); } });
    const testB = h('button.btn.ghost', { text: 'Test rewarded', onclick: () => { PP.uiSfx(); PP.ads.test('rewarded'); } });
    const testI = h('button.btn.ghost', { text: 'Test interstitial', onclick: () => { PP.uiSfx(); PP.ads.test('interstitial'); } });
    const privB = h('button.btn.ghost', { text: 'Privacy options', onclick: () => { PP.uiSfx(); PP.ads.privacyOptions(); } });
    const adRow = h('div.row.ad-row', null, [privB, testB, testI, retryB]);
    const syncAds = () => {
      const st = PP.ads.status(), A = PP.ads;
      adStatus.textContent = st.text; adStatus.classList.toggle('bad', !!st.error); adStatus.classList.toggle('good', !!st.ok);
      retryB.hidden = !(A.sdk.state === 'wait' || A.slots.rewarded.state === 'wait' || A.slots.interstitial.state === 'wait');
      testB.hidden = !(A.testMode || PP.debug);
      testI.hidden = !(A.testMode || (PP.debug && A.fakeInterstitial));
      privB.hidden = !A.privacyRequired;
      adRow.hidden = retryB.hidden && testB.hidden && testI.hidden && privB.hidden;
    };
    syncAds();
    PP.on('adsStatus', () => { if (adStatus.isConnected) syncAds(); });
    const adTick = setInterval(() => { if (!adStatus.isConnected) clearInterval(adTick); else syncAds(); }, 1000);
    const code = h('textarea', { readonly: true, 'aria-label': 'Save code' });
    code.hidden = true;
    const imp = h('textarea', { placeholder: 'Paste a save code here', 'aria-label': 'Import save code' });
    imp.hidden = true;
    const el = h('div.scr.scrim-strong', null, [U.top('Settings', { larder: false }), h('div.body', null, h('div.wrap', null, [
      h('div.card', null, [toggle('sound', 'Sound'), slider('music', 'Music'), slider('sfx', 'Effects'), slider('echo', 'Echo volume'), toggle('vibration', 'Vibration')]),
      h('div.card', null, [h('div.eyebrow', { text: 'Display' }), resT, resL, h('div.toggle', null, [h('span', null, ['Battery saver', h('small', { text: 'Draws at about 1080p with lighter effects. What you hear and see in the echoes never changes.' })]), saverSw])]),
      h('div.card', null, [h('div.eyebrow', { text: 'Ads' }), h('p.muted', { text: 'A short ad plays at the break after every third run, never during a flight. At the Last Echo you can also choose to watch one to fly on. No banners.' }), adStatus, adRow, toggle('adsPersonal', 'Personalised ads', 'Off: the ads you see are not based on your activity in other apps.')]),
      h('div.card', null, [toggle('gentle', 'Gentle Wings', 'Bumps cost nothing; other knocks and the dark’s hunger are softer.'), toggle('shapes', 'Echo shapes', 'Each echo colour also gets its own mark: rock dots, food diamonds, pup hearts, danger triangles.'), toggle('captions', 'Sound captions', 'Show what you hear at the edge of the screen.')]),
      h('div.card', null, [h('div.eyebrow', { text: 'Save' }), h('div.row', null, [
        h('button.btn.ghost', { text: 'Export', onclick: () => { code.hidden = false; code.value = PP.profile.exportCode(); code.select(); try { navigator.clipboard.writeText(code.value); U.toast('Save code copied'); } catch (e) { /* select is enough */ } } }),
        h('button.btn.ghost', { text: 'Import', onclick: () => { if (imp.hidden) { imp.hidden = false; imp.focus(); return; } if (PP.profile.importCode(imp.value)) { PP.settings.apply(); U.toast('Save imported'); imp.value = ''; imp.hidden = true; } else U.toast('That code did not work'); } }),
      ]), code, imp]),
      h('p.muted', { style: 'text-align:center', text: 'Pipistrelle ' + PP.version + ' · no purchases, no timers, no banners' }),
    ]))]);
    return { el, scene: U.stack.some(s => s.name === 'pause') ? 'cave' : 'roost' };
  });
})();
