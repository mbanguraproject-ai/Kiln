// Packs the hub and every playable game into one self-contained HTML file.
// Games are embedded as iframe srcdoc, the SDK, kit and registry are inlined, card art becomes data URIs.
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
// The kit is optional for older games; it is read only when a game loads it. Any spelling of its tag
// (quotes, defer, spacing) is inlined; a reference left over would be a dead relative URL inside srcdoc.
const kitTag = /<script\b[^>]*\bsrc=["']\.\.\/\.\.\/hub\/kit\.js["'][^>]*>\s*<\/script>/g;
let kit = null;
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
  // Checked before inlining: the kit's own source mentions its path.
  if (html.replace(kitTag, '').includes('hub/kit.js')) throw new Error(`${g.id}: hub/kit.js is referenced but not as <script src="../../hub/kit.js"></script>`);
  html = html.replace(kitTag, () => inlineScript(kit === null ? (kit = read('hub/kit.js')) : kit));
  g.srcdoc = html;
  const dataUri = rel => {
    const c = path.join(ROOT, rel);
    return fs.existsSync(c) ? `data:${MIME[path.extname(c)] || 'image/jpeg'};base64,` + fs.readFileSync(c).toString('base64') : null;
  };
  for (const key of ['artWide', 'artTall']) {
    if (!g[key]) continue;
    const uri = dataUri(g[key]);
    if (uri) g[key] = uri;
    else delete g[key];
  }
  if (Array.isArray(g.shots)) g.shots = g.shots.map(dataUri).filter(Boolean);
}

// JSON with every "<" escaped, so nothing inside can close the surrounding <script>.
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
// Every other KILN_* global of the registry (collections, categories) goes in as it is.
const registry = Object.keys(sandbox.window).filter(k => k.startsWith('KILN_'))
  .map(k => `window.${k} = ${json(k === 'KILN_GAMES' ? games : sandbox.window[k])};`).join('\n');

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
