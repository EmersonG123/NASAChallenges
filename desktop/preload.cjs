// Bridge between the web UI and the desktop app: only these calls are exposed (context isolation on).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const info = ipcRenderer.sendSync('astra:info');
const call = (op) => (...args) => ipcRenderer.invoke('astra:db', op, ...args);

contextBridge.exposeInMainWorld('astraDesktop', {
  version: info.version,
  dbPath: info.dbPath,
  db: {
    list: call('list'),
    put: call('put'),
    pending: call('pending'),
    applyRemote: call('applyRemote'),
    markClean: call('markClean'),
    getMeta: call('getMeta'),
    setMeta: call('setMeta'),
  },
  openExternal: (url) => ipcRenderer.invoke('astra:open', url),
  quit: () => ipcRenderer.invoke('astra:quit'),
});
