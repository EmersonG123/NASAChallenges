// After packaging: copy the installer to the website (frontend/public/downloads) and
// bump backend/app_version.json so installed apps are told that a new version exists.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const pkg = require('../package.json');
const dist = path.resolve(__dirname, '..', 'dist');
const exe = fs.readdirSync(dist).find((f) => f.endsWith('.exe') && !f.includes('blockmap'));
if (!exe) { console.error('No installer in desktop/dist. Run "bun run dist" first.'); process.exit(1); }

const downloads = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'downloads');
fs.mkdirSync(downloads, { recursive: true });
fs.copyFileSync(path.join(dist, exe), path.join(downloads, 'ASTRA-Health-Setup.exe'));

const versionFile = path.resolve(__dirname, '..', '..', 'backend', 'app_version.json');
const prev = fs.existsSync(versionFile) ? JSON.parse(fs.readFileSync(versionFile, 'utf8')) : {};
fs.writeFileSync(versionFile, JSON.stringify({ ...prev, version: pkg.version, url: '/downloads/ASTRA-Health-Setup.exe' }, null, 2) + '\n');
const mb = (fs.statSync(path.join(downloads, 'ASTRA-Health-Setup.exe')).size / 1048576).toFixed(1);
console.log(`published ${exe} (${mb} MB) as v${pkg.version}`);
