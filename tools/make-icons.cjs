// Renders the app icons into ../icons, and the Android launcher icons and splash screens into
// android/app/src/main/res when that folder exists, with headless Chromium.
// Usage: npm i -D playwright && node tools/make-icons.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'icons');
const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const SPECS = [
  { file: 'icon-512.png', size: 512, grid: 0.6, rounded: true },
  { file: 'icon-192.png', size: 192, grid: 0.6, rounded: true },
  { file: 'maskable-512.png', size: 512, grid: 0.5, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, grid: 0.56, rounded: false },
].map(s => Object.assign({ out: path.join(OUT, s.file) }, s));

// Android: legacy square and round icons, adaptive foreground (tiles only, inside the 66/108 safe zone),
// and splash images on the plaster ground.
if (fs.existsSync(RES)) {
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    SPECS.push({ out: path.join(RES, `mipmap-${d}`, 'ic_launcher.png'), size: 48 * k, grid: 0.6, rounded: true });
    SPECS.push({ out: path.join(RES, `mipmap-${d}`, 'ic_launcher_round.png'), size: 48 * k, grid: 0.52, circle: true });
    SPECS.push({ out: path.join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), size: 108 * k, grid: 0.4, transparent: true });
  }
  const splash = { 'port-mdpi': [320, 480], 'port-hdpi': [480, 800], 'port-xhdpi': [720, 1280], 'port-xxhdpi': [960, 1600], 'port-xxxhdpi': [1280, 1920],
    'land-mdpi': [480, 320], 'land-hdpi': [800, 480], 'land-xhdpi': [1280, 720], 'land-xxhdpi': [1600, 960], 'land-xxxhdpi': [1920, 1280] };
  for (const [d, [w, h]] of Object.entries(splash)) SPECS.push({ out: path.join(RES, `drawable-${d}`, 'splash.png'), w, h, grid: 0.2, plaster: true });
  SPECS.push({ out: path.join(RES, 'drawable', 'splash.png'), w: 480, h: 320, grid: 0.2, plaster: true });
}

// Same glazed-tile drawing as the game (index.html, makeTile).
function draw(spec) {
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const parseHex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function tile(g, hex, v, x, y, px) {
    const m = px * 0.055, w = px - 2 * m, rad = w * 0.2;
    const jit = [0, 0.06, -0.06, 0.03][v];
    let base = parseHex(hex);
    base = jit > 0 ? mix(base, WHITE, jit) : mix(base, BLACK, -jit);
    let gr = g.createLinearGradient(0, y + m, 0, y + m + w);
    gr.addColorStop(0, rgb(mix(base, WHITE, 0.34)));
    gr.addColorStop(0.45, rgb(base));
    gr.addColorStop(1, rgb(mix(base, BLACK, 0.34)));
    g.fillStyle = gr; rrect(g, x + m, y + m, w, w, rad); g.fill();
    const fi = w * 0.1, fx = x + m + fi, fy = y + m + fi * 0.7, fw = w - 2 * fi;
    const hx = fx + fw * (0.3 + [0, 0.07, -0.04, 0.12][v]), hy = fy + fw * (0.28 + [0, -0.04, 0.05, 0.02][v]);
    gr = g.createRadialGradient(hx, hy, fw * 0.02, fx + fw * 0.5, fy + fw * 0.55, fw * 0.8);
    gr.addColorStop(0, rgb(mix(base, WHITE, 0.32)));
    gr.addColorStop(0.55, rgb(base));
    gr.addColorStop(1, rgb(mix(base, BLACK, 0.12)));
    g.fillStyle = gr; rrect(g, fx, fy, fw, fw, rad * 0.72); g.fill();
    g.save(); g.translate(hx, hy - fw * 0.05); g.rotate(-0.6);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(0, 0, fw * 0.17, fw * 0.065, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(hx + fw * 0.21, hy - fw * 0.13, fw * 0.03, 0, Math.PI * 2); g.fill();
  }

  const CW = Math.round(spec.w || spec.size), CH = Math.round(spec.h || spec.size), S = Math.min(CW, CH);
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = CH;
  const g = c.getContext('2d');
  if (spec.plaster) {
    g.fillStyle = '#E6EBEF';
    g.fillRect(0, 0, CW, CH);
  } else if (!spec.transparent) {
    const bg = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S * 0.5, S * 0.5, S * 0.75);
    bg.addColorStop(0, '#22385A');
    bg.addColorStop(1, '#121E30');
    g.fillStyle = bg;
    if (spec.rounded) { rrect(g, 0, 0, S, S, S * 0.22); g.fill(); }
    else if (spec.circle) { g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(0, 0, S, S);
  }

  const side = S * spec.grid, cell = side / 2;
  const ox = (CW - side) / 2, oy = (CH - side) / 2;
  // empty slot, bottom right
  const m = cell * 0.055, w = cell - 2 * m;
  const sg = g.createLinearGradient(0, oy + cell + m, 0, oy + cell + m + w);
  sg.addColorStop(0, spec.plaster ? '#A9B6C2' : '#0B1422');
  sg.addColorStop(0.3, spec.plaster ? '#BCC8D3' : '#18263A');
  sg.addColorStop(1, spec.plaster ? '#BCC8D3' : '#18263A');
  g.fillStyle = sg; rrect(g, ox + cell + m, oy + cell + m, w, w, w * 0.2); g.fill();
  tile(g, '#2E5BD0', 0, ox, oy, cell);
  tile(g, '#E39C1A', 1, ox + cell, oy, cell);
  tile(g, '#DD5038', 3, ox, oy + cell, cell);
  return c.toDataURL('image/png');
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const spec of SPECS) {
    const url = await page.evaluate(draw, spec);
    fs.mkdirSync(path.dirname(spec.out), { recursive: true });
    fs.writeFileSync(spec.out, Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', path.relative(path.join(__dirname, '..'), spec.out));
  }
  await browser.close();
})();
