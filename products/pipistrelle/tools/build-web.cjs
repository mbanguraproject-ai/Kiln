// Copies the game (web/) into www/ for Capacitor. Nothing outside products/pipistrelle/ is read.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'www');

fs.rmSync(OUT, { recursive: true, force: true });
let files = 0;
(function copy(rel) {
  const src = path.join(SRC, rel);
  if (fs.statSync(src).isDirectory()) { for (const n of fs.readdirSync(src)) copy(path.join(rel, n)); return; }
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  files++;
})('');
console.log(`www/: ${files} files`);
