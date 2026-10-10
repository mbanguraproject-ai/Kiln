// Packs the hub and every playable game into one self-contained HTML file.
// Games are embedded as iframe srcdoc, the SDK and registry are inlined, card art becomes data URIs.
// Usage: node tools/bundle.cjs [--out dist/kiln.html] [--artifact]
//   --artifact  also strips the document skeleton and PWA links (for hosts that add their own <head>).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(ROOT, opt('out', 'dist/kiln.html'));
const ARTIFACT = args.includes('--artifact');

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sdk = read('hub/sdk.js');
const config = read('hub/config.js');

const sandbox = { window: {} };
vm.runInNewContext(read('games/registry.js'), sandbox);
const games = sandbox.window.KILN_GAMES.map(g => Object.assign({}, g));

const inlineScript = code => '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

for (const g of games) {
  if (g.status === 'soon') continue;
  const file = path.join(ROOT, g.path);
  if (!fs.existsSync(file)) { console.warn(`skip ${g.id}: ${g.path} missing`); g.status = 'soon'; continue; }
  let html = fs.readFileSync(file, 'utf8');
  const tag = '<script src="../../hub/sdk.js"></script>';
  if (!html.includes(tag)) throw new Error(`${g.id}: SDK script tag not found (${tag})`);
  html = html.replace(tag, () => inlineScript(sdk));
  g.srcdoc = html;
  for (const key of ['artWide', 'artTall']) {
    if (!g[key]) continue;
    const c = path.join(ROOT, g[key]);
    if (fs.existsSync(c)) g[key] = `data:${MIME[path.extname(c)] || 'image/jpeg'};base64,` + fs.readFileSync(c).toString('base64');
    else delete g[key];
  }
}

// JSON with every "<" escaped, so nothing inside can close the surrounding <script>.
const registry = 'window.KILN_GAMES = ' + JSON.stringify(games).replace(/</g, '\\u003c') + ';';

let hub = read('index.html');
const swap = (from, to) => {
  if (!hub.includes(from)) throw new Error('hub: missing ' + from);
  hub = hub.replace(from, () => to);
};
swap('<script src="hub/config.js"></script>', inlineScript(config));
swap('<script src="hub/sdk.js"></script>', inlineScript(sdk));
swap('<script src="games/registry.js"></script>', '<script>\n' + registry + '\n</script>');

if (ARTIFACT) {
  const drop = [
    /<!doctype html>\n/i, /<html[^>]*>\n/i, /<head>\n/i, /<\/head>\n/i, /<body>\n/i, /<\/body>\n/i, /<\/html>\n?/i,
    /<meta charset="utf-8">\n/i, /<meta name="viewport"[^>]*>\n/i, /<meta name="theme-color"[^>]*>\n/gi,
    /<link rel="manifest"[^>]*>\n/i, /<link rel="icon"[^>]*>\n/i, /<link rel="apple-touch-icon"[^>]*>\n/i,
  ];
  for (const re of drop) hub = hub.replace(re, '');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, hub);
const kb = n => Math.round(n / 1024) + ' KB';
console.log(`wrote ${path.relative(ROOT, OUT)} (${kb(Buffer.byteLength(hub))}), games: ${games.filter(g => g.srcdoc).map(g => g.id).join(', ')}`);
