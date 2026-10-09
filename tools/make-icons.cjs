// Renders the app icons into ../icons with headless Chromium.
// Usage: npm i -D playwright && node tools/make-icons.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'icons');
const SPECS = [
  { file: 'icon-512.png', size: 512, grid: 0.6, rounded: true },
  { file: 'icon-192.png', size: 192, grid: 0.6, rounded: true },
  { file: 'maskable-512.png', size: 512, grid: 0.5, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, grid: 0.56, rounded: false },
];

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

  const S = spec.size;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S * 0.5, S * 0.5, S * 0.75);
  bg.addColorStop(0, '#22385A');
  bg.addColorStop(1, '#121E30');
  g.fillStyle = bg;
  if (spec.rounded) { rrect(g, 0, 0, S, S, S * 0.22); g.fill(); } else g.fillRect(0, 0, S, S);

  const side = S * spec.grid, cell = side / 2;
  const ox = (S - side) / 2, oy = (S - side) / 2;
  // empty slot, bottom right
  const m = cell * 0.055, w = cell - 2 * m;
  const sg = g.createLinearGradient(0, oy + cell + m, 0, oy + cell + m + w);
  sg.addColorStop(0, '#0B1422');
  sg.addColorStop(0.3, '#18263A');
  sg.addColorStop(1, '#18263A');
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
    fs.writeFileSync(path.join(OUT, spec.file), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', spec.file);
  }
  await browser.close();
})();
