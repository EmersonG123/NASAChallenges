// ASTRA Health desktop app.
// Serves the static web build (app/) from a private app:// origin so it works with no internet,
// keeps data in a local SQLite file (userData/astra.db), and lets the UI sync with the online system.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain, net, protocol, session, shell, Menu } = require('electron');
const { open } = require('./db.cjs');

const ORIGIN = 'app://astra';
const WEB_ROOT = path.join(__dirname, 'app');
const DB_OPS = new Set(['list', 'put', 'pending', 'applyRemote', 'markClean', 'getMeta', 'setMeta']);

// app:// behaves like https: secure context (camera, storage, fetch, service of wasm)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

let db = null;
let win = null;

/** map app://astra/<path> to a file inside the web build; never outside it */
function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.normalize(path.join(WEB_ROOT, p));
  if (!file.startsWith(WEB_ROOT)) return null;
  if (!fs.existsSync(file) && !path.extname(file)) file = path.join(file, 'index.html');
  return fs.existsSync(file) ? file : null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 380, minHeight: 600,
    title: 'ASTRA Health', backgroundColor: '#050B1A', show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: false, nodeIntegration: false },
  });
  win.once('ready-to-show', () => win.show());
  // external links open in the system browser; the app itself never navigates away
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadURL(`${ORIGIN}/system/`);

  // smoke test for CI / packaging: ASTRA_SMOKE=<folder> captures the window and a status report, then quits
  const smoke = process.env.ASTRA_SMOKE;
  if (smoke) {
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      if (process.env.ASTRA_SMOKE_SEED) {
        // write a crew member and a session straight into SQLite, then ask the UI to sync
        const now = Date.now();
        db.put('crew', { id: 'NSMOKE1', name: 'Smoke test', sex: 'F', source: 'example', values_json: '{}', updated_at: now, deleted: 0 });
        db.put('sessions', { id: 'SSMOKE1', crew_id: 'NSMOKE1', mode: 'demo', started_at: now - 60000, ended_at: now, fatigue: 42, stress: 18, attention: null, peak_fatigue: 55, peak_stress: 30, updated_at: now, deleted: 0 });
        await win.webContents.executeJavaScript(`window.dispatchEvent(new Event('online'))`);
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (process.env.ASTRA_SMOKE_JS) {
        // scripted UI steps before the capture (file with JS that may return a promise)
        try { await win.webContents.executeJavaScript(fs.readFileSync(process.env.ASTRA_SMOKE_JS, 'utf8')); }
        catch (err) { await win.webContents.executeJavaScript(`document.body.dataset.dbg = ${JSON.stringify(String(err))}`); }
      }
      const report = await win.webContents.executeJavaScript(`({
        url: location.href, title: document.title, desktop: !!window.astraDesktop,
        sync: document.querySelector('.sync-pill')?.textContent || null,
        crewButtons: document.querySelectorAll('.crew-chip').length, dbg: document.body.dataset.dbg || null
      })`);
      report.pendingInDb = db.pending();
      win.webContents.invalidate(); // force a fresh frame: an occluded window may keep a stale one
      await new Promise((r) => setTimeout(r, 400));
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(smoke, 'astra-smoke.png'), img.toPNG());
      fs.writeFileSync(path.join(smoke, 'astra-smoke.json'), JSON.stringify(report, null, 2));
      app.quit();
    }, 6000));
  }
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'astra.db');
  db = open(dbPath);

  protocol.handle('app', (req) => {
    const file = resolveFile(new URL(req.url).pathname);
    if (!file) return net.fetch(pathToFileURL(path.join(WEB_ROOT, '404.html')).toString());
    return net.fetch(pathToFileURL(file).toString());
  });

  // the camera is only granted to our own pages
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    cb(permission === 'media' && wc.getURL().startsWith(ORIGIN));
  });

  ipcMain.on('astra:info', (e) => { e.returnValue = { version: app.getVersion(), dbPath }; });
  ipcMain.handle('astra:db', (e, op, ...args) => {
    if (!e.senderFrame.url.startsWith(ORIGIN)) throw new Error('forbidden');
    if (!DB_OPS.has(op)) throw new Error(`unknown operation ${op}`);
    return db[op](...args);
  });
  ipcMain.handle('astra:quit', () => { app.quit(); });
  ipcMain.handle('astra:open', (e, url) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return shell.openExternal(url);
    return undefined;
  });

  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { try { db && db.close(); } catch { /* already closed */ } });
