'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── App ───────────────────────────────────────────────────────────────────
  getVersion: ()     => ipcRenderer.invoke('app:get-version'),
  getPath:    (name) => ipcRenderer.invoke('app:get-path', name),
  reload:     ()     => ipcRenderer.invoke('app:reload'),

  // ── Dialogs / Shell ───────────────────────────────────────────────────────
  openFileDialog:  (opts) => ipcRenderer.invoke('dialog:open-file',   opts),
  saveFileDialog:  (opts) => ipcRenderer.invoke('dialog:save-file',   opts),
  showMessageBox:  (opts) => ipcRenderer.invoke('dialog:message-box', opts),
  openPath:        (p)    => ipcRenderer.invoke('shell:open-path',    p),

  // ── License ───────────────────────────────────────────────────────────────
  license: {
    getStatus:  ()    => ipcRenderer.invoke('license:get-status'),
    activate:   (key) => ipcRenderer.invoke('license:activate',   key),
    deactivate: ()    => ipcRenderer.invoke('license:deactivate'),
  },

  // ── Auto-updater ──────────────────────────────────────────────────────────
  updater: {
    check:    () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install:  () => ipcRenderer.invoke('updater:install'),
    onStatus: (cb) => {
      const handler = (_, payload) => cb(payload);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },
});
