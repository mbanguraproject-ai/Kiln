// Copies the web app (hub, SDK, kit, games, icons) into www/ for Capacitor.
// Test files and tools are left out.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'hub', 'games', 'icons'];
const SKIP = /(^|\/)((test|qa)\.cjs|bot\.js)$/;

fs.rmSync(OUT, { recursive: true, force: true });
let files = 0;
function copy(rel) {
  const src = path.join(ROOT, rel);
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(src)) copy(path.join(rel, name));
    return;
  }
  if (SKIP.test(rel.split(path.sep).join('/'))) return;
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  files++;
}
INCLUDE.forEach(copy);
console.log(`www/: ${files} files`);
