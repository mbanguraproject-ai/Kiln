// The store trailer: a landscape gameplay video for Google Play (and YouTube), captured frame by frame.
// The game is stepped exactly 1/60 s per frame with its loop stopped and the page's clock made virtual, so the video
// is perfectly smooth however slowly this machine draws. Every sound effect the game plays is logged with its time,
// and afterwards the whole soundtrack (the music and those effects) is rendered offline through the game's own
// synths (Kit.audio.renderOffline). ffmpeg joins the shots with crossfades and encodes H.264 + AAC.
// Usage: node tools/trailer.cjs [--out=store/trailer-1080p60.mp4] [--w=1920 --h=1080 --dpr=1] [--fps=60] [--only=title,chalk]
// Needs Playwright (NODE_PATH=/opt/node22/lib/node_modules if it is installed globally) and ffmpeg.
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { serve } = require('./serve.cjs');

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const W = +arg('w', 1920), H = +arg('h', 1080), DPR = +arg('dpr', 1), FPS = +arg('fps', 60);
const OUT = path.resolve(arg('out', path.join(__dirname, '..', 'store', `trailer-${H * DPR}p${FPS}.mp4`)));
const only = arg('only', '').split(',').filter(Boolean), PREVIEW = process.argv.includes('--preview');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pp-trailer-'));
const XF = 0.4; // crossfade between shots, seconds

// Each shot: a setup run in the page, its length, a caption (kicker over title), the music's layers during it, and
// what happens on given frames (taps, chirps). Setups use the debug hooks (js/debug.js).
const SHOTS = [
  { id: 'title', secs: 3.4, layers: [],
    setup: `__ppTest.reset(); __ppTest.show('title'); document.querySelector('.title .actions').style.visibility = 'hidden'; __ppTest.step(1.5);` },
  { id: 'chalk', secs: 5.6, kicker: 'Chalk Hollows', title: 'Chirp to see in the dark', layers: ['deep'],
    setup: `__trailer.campaign(); __ppTest.startCave('1-2', 'pip'); __ppTest.autopilot(true, { survey: true }); __ppTest.step(9);` },
  { id: 'pups', secs: 5, kicker: 'Kin', title: 'Bring the lost pups home', layers: ['pups'],
    setup: `__trailer.campaign(); __ppTest.startCave('1-4', 'pip'); __ppTest.autopilot(true, { survey: true }); __ppTest.step(11); for (let i = 0; i < 3; i++) __ppTest.give('pup'); __ppTest.step(0.8);` },
  { id: 'flood', secs: 5, kicker: 'The Drowned Halls', title: 'Skim the black water', layers: ['danger'],
    // over the river (the bot takes over from there), so the water shows
    setup: `__trailer.campaign(); __ppTest.startCave('2-2', 'skimmer'); __ppTest.step(1); const rv = PP.L.rivers[0]; __ppTest.teleport(rv.x0 + (rv.x1 - rv.x0) * 0.22, rv.y - 80); __trailer.botFrom({ survey: true, pups: false }); __ppTest.chirp(); __ppTest.step(0.4);` },
  { id: 'glass', secs: 5, kicker: 'The Glass Vaults', title: 'Crystal holds your echo', layers: ['deep'],
    setup: `__trailer.campaign(); __ppTest.startCave('3-1', 'comb'); __ppTest.autopilot(true, { survey: true }); __ppTest.step(9);` },
  { id: 'owls', secs: 5, kicker: 'The Owlstone Crypt', title: 'Slip past the owls', layers: ['danger', 'deep'],
    setup: `__trailer.campaign(); __ppTest.startCave('4-1', 'hark'); __ppTest.autopilot(true, { careful: true }); __trailer.until(() => PP.L.owls.some(o => Math.hypot(o.x - PP.G.bat.x, o.y - PP.G.bat.y) < 420), 60);`,
    frames: { 110: `__ppTest.shriek();` } },
  { id: 'lady', secs: 5, kicker: 'Set piece', title: 'Something hunts by ear', layers: ['danger'],
    setup: `__trailer.campaign(); __ppTest.startCave('4-6', 'pip'); __ppTest.autopilot(true, { fast: true }); __trailer.until(() => { const D = PP.L.lady; return D && (D.state === 'chase' || D.state === 'fly') && Math.hypot(D.x - PP.G.bat.x, D.y - PP.G.bat.y) < 520; }, 60);` },
  { id: 'hush', secs: 4.4, kicker: 'The Hush', title: 'Five biomes. Twenty-five caves.', layers: ['exit'],
    setup: `__trailer.campaign(); __ppTest.startCave('5-1', 'pip'); __ppTest.autopilot(true, { survey: true }); __ppTest.step(9);` },
  { id: 'roost', secs: 5.2, layers: ['pups', 'exit'],
    setup: `__trailer.campaign(); __ppTest.show('roost'); __ppTest.step(0.5);`,
    frames: { 40: `__trailer.tapOpen();`, 120: `__trailer.tapBat();` } },
  { id: 'end', secs: 4, layers: ['exit'], end: true,
    setup: `__ppTest.show('title'); document.querySelector('.title .actions').style.visibility = 'hidden'; document.querySelector('.tagline').textContent = 'Chirp to see. Eat moths. Bring the lost pups home.'; __ppTest.step(1);` },
];

// runs in the page before anything else: a virtual clock, the sound log and the shot helpers
function prelude() {
  const real = performance.now.bind(performance);
  window.__vt = 0; window.__vtOn = false;
  performance.now = () => (window.__vtOn ? window.__vt : real());
  window.__trailer = {
    log: [],
    campaign() {
      __ppTest.reset();
      __ppTest.clearAll();
      PP.settings.set('captions', false);
      PP.profile.update(p => { p.bats.owned = PP.data.bats.map(b => b.id); p.bats.selected = 'pip'; p.tutorial = Object.assign({}, p.tutorial, { taught: true }); p.stats.pups = 21; });
    },
    until(fn, max) { for (let i = 0; i < max * 2 && !fn(); i++) __ppTest.step(0.5); },
    // the autopilot, from wherever the bat is now: it skips the waypoints already behind
    botFrom(goals) {
      __ppTest.autopilot(true, goals || {});
      const G = PP.G, L = PP.L, b = G.bat;
      let bi = 0, bd = 1e18;
      for (let i = 0; i < L.path.length; i += 3) { const p = L.path[i], d = (p.x - b.x) ** 2 + (p.y - b.y) ** 2; if (d < bd) { bd = d; bi = i; } }
      while (G.bot.i < G.bot.wps.length - 1 && G.bot.wps[G.bot.i].pi <= bi) G.bot.i++;
    },
    tapOpen() { const d = PP.roost._dbg(); if (d) PP.roost.tap(d.open.x, d.open.y); },
    tapBat() { const d = PP.roost._dbg(); if (d && d.bat) PP.roost.tap(d.bat.x, d.bat.y); },
  };
}

(async () => {
  const srv = await serve(8941);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(prelude);
  await page.goto('http://127.0.0.1:8941/?debug');
  await page.waitForFunction(() => window.__ppTest && __ppTest.ready());
  await page.evaluate(() => {
    __ppTest.quality('ultra');
    PP.R.quality.frame = () => {};
    // no tutorial tips or toasts over the captions
    PP.run.hint = () => {}; PP.run.toast = () => {};
    // every sound the game plays is logged at the virtual time, nothing plays live
    Kit.sfx = (name, o) => { __trailer.log.push([__vt / 1000, name, o ? JSON.parse(JSON.stringify(o)) : null]); return true; };
    // the caption: a kicker over a title, in the game's own type, lower left
    const c = document.createElement('div');
    c.id = 'tcap';
    c.innerHTML = '<i></i><b></b>';
    c.style.cssText = 'position:fixed;left:6vw;bottom:9vh;z-index:50;pointer-events:none;opacity:0;display:flex;flex-direction:column;gap:0.9vh;';
    c.children[0].style.cssText = 'font:700 1.55vh/1 Figtree,sans-serif;letter-spacing:0.32em;text-transform:uppercase;color:#4ff0d8;font-style:normal;text-shadow:0 0 1.2vh rgba(79,240,216,0.6)';
    c.children[1].style.cssText = 'font:800 5.2vh/1.05 Unbounded,sans-serif;color:#fff;text-shadow:0 0 2.4vh rgba(79,240,216,0.45),0 0.4vh 1.2vh rgba(0,0,0,0.8)';
    document.body.appendChild(c);
    // the CSS animations follow the virtual clock too
    window.__anim = () => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = __vt; } };
  });

  const shots = SHOTS.filter(s => !only.length || only.includes(s.id));
  // --preview: one still from the middle of each shot, to choose shots quickly
  if (PREVIEW) {
    const dir = path.resolve(arg('dir', path.join(__dirname, '..', 'shots')));
    fs.mkdirSync(dir, { recursive: true });
    for (const S of shots) {
      await page.evaluate(src => { window.__vtOn = false; PP.loop.start(); (0, eval)(src); PP.loop.stop(); window.__vt = performance.now(); window.__vtOn = true; }, S.setup);
      await page.evaluate(([k, t]) => { const c = document.getElementById('tcap'); c.children[0].textContent = k || ''; c.children[1].textContent = t || ''; c.style.opacity = t ? 1 : 0; }, [S.kicker, S.title]);
      const N = Math.round(S.secs * FPS / 2);
      for (let f = 0; f < N; f++) await page.evaluate(([dt, act]) => { window.__vt += dt; if (act) (0, eval)(act); PP.loop.step(1); }, [1000 / FPS, (S.frames && S.frames[f]) || (S.every && f % S.every[0] === 0 ? S.every[1] : null)]);
      await page.screenshot({ path: path.join(dir, `trailer-${S.id}.png`) });
      console.log('preview', S.id);
    }
    await browser.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
    return;
  }
  const segs = [], soundtrack = [];
  let tFinal = 0;
  for (let si = 0; si < shots.length; si++) {
    const S = shots[si], N = Math.round(S.secs * FPS), file = path.join(TMP, `seg${si}.mkv`);
    await page.evaluate(src => { window.__vtOn = false; PP.loop.start(); (0, eval)(src); PP.loop.stop(); __trailer.log.length = 0; window.__vt0 = performance.now(); window.__vt = window.__vt0; window.__vtOn = true; }, S.setup);
    await page.evaluate(([k, t]) => { const c = document.getElementById('tcap'); c.children[0].textContent = k || ''; c.children[1].textContent = t || ''; c.style.opacity = 0; }, [S.kicker, S.title]);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '10', '-pix_fmt', 'yuv444p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise(r => ff.on('close', r));
    const t0 = Date.now();
    for (let f = 0; f < N; f++) {
      const t = f / FPS, capA = S.title ? Math.max(0, Math.min(1, (t - 0.35) / 0.35, (S.secs - XF - 0.2 - t) / 0.35)) : 0;
      await page.evaluate(([dt, a, act]) => {
        window.__vt += dt;
        if (act) (0, eval)(act);
        PP.loop.step(1);
        document.getElementById('tcap').style.opacity = a;
        __anim();
      }, [1000 / FPS, capA, (S.frames && S.frames[f]) || (S.every && f % S.every[0] === 0 ? S.every[1] : null)]);
      const png = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await done;
    const log = await page.evaluate(() => __trailer.log.map(e => [e[0] - window.__vt0 / 1000, e[1], e[2]]));
    for (const e of log) if (e[0] >= 0 && e[0] < S.secs) soundtrack.push([tFinal + e[0], e[1], e[2]]);
    segs.push({ file, secs: N / FPS, start: tFinal, layers: S.layers });
    tFinal += N / FPS - (si < shots.length - 1 ? XF : 0);
    console.log(`${S.id}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s, ${log.length} sounds`);
  }
  const total = tFinal;

  // the soundtrack: the Chalk Hollows song throughout, its layers following the shots, and every logged sound
  const wav = await page.evaluate(async ([events, segs, total]) => {
    const song = PP.audio.song('chalk'), layers = {};
    for (const s of segs) for (const l of s.layers) (layers[l] = layers[l] || []).push([s.start, s.start + s.secs]);
    const buf = await Kit.audio.renderOffline(total, events, [{ song, at: 0, until: total, fade: 0.8, layers, layerFade: 0.5 }], { music: 0.62, sfx: 0.9 });
    // 16-bit PCM WAV, base64
    const n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)], out = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
    let peak = 0;
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) peak = Math.max(peak, Math.abs(ch[c][i]));
    const g = peak > 0.98 ? 0.98 / peak : 1;
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < 2; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, ch[c][i] * g)) * 32767, true);
    const bytes = new Uint8Array(out.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }, [soundtrack, segs, total]);
  const wavFile = path.join(TMP, 'soundtrack.wav');
  fs.writeFileSync(wavFile, Buffer.from(wav, 'base64'));
  await browser.close();
  srv.close();

  // join the shots with crossfades, fade in from and out to black, and encode for the store
  const inputs = [], fc = [];
  segs.forEach((s, i) => inputs.push('-i', s.file));
  let last = '[0:v]', acc = segs[0].secs;
  for (let i = 1; i < segs.length; i++) {
    const lab = `[x${i}]`;
    fc.push(`${last}[${i}:v]xfade=transition=fade:duration=${XF}:offset=${(acc - XF).toFixed(3)}${lab}`);
    last = lab; acc += segs[i].secs - XF;
  }
  fc.push(`${last}fade=t=in:st=0:d=0.5,fade=t=out:st=${(total - 0.8).toFixed(3)}:d=0.8,format=yuv420p[v]`);
  fc.push(`[${segs.length}:a]afade=t=in:st=0:d=0.3,afade=t=out:st=${(total - 1).toFixed(3)}:d=1[a]`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-i', wavFile, '-filter_complex', fc.join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2', '-r', String(FPS), '-g', String(FPS / 2), '-bf', '2',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-t', total.toFixed(3), OUT], { stdio: 'inherit' });
  console.log(`${OUT}: ${total.toFixed(1)} s, ${W * DPR}x${H * DPR} at ${FPS} fps`, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no errors');
  fs.rmSync(TMP, { recursive: true, force: true });
})();
