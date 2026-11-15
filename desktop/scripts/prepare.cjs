// Copies the static web build (frontend/out) into desktop/app before packaging.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '..', '..', 'frontend', 'out');
const dst = path.resolve(__dirname, '..', 'app');
if (!fs.existsSync(path.join(src, 'system', 'index.html'))) {
  console.error('No static build found. Run "bun run build:desktop" inside frontend/ first.');
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
// the installer itself is published on the website, never bundled inside the app
fs.cpSync(src, dst, { recursive: true, filter: (p) => !p.includes(`${path.sep}downloads`) });
console.log(`web build copied to ${dst}`);
