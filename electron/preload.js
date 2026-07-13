'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── App info ──────────────────────────────────────────────────────────────
  getVersion: ()       => ipcRenderer.invoke('app:get-version'),
  getPath:    (name)   => ipcRenderer.invoke('app:get-path', name),
  reload:     ()       => ipcRenderer.invoke('app:reload'),

  // ── Native dialogs / shell ────────────────────────────────────────────────
  openFileDialog:  (options) => ipcRenderer.invoke('dialog:open-file',   options),
  saveFileDialog:  (options) => ipcRenderer.invoke('dialog:save-file',   options),
  showMessageBox:  (options) => ipcRenderer.invoke('dialog:message-box', options),
  openPath:        (p)       => ipcRenderer.invoke('shell:open-path',    p),

  // ── Backend base URL ──────────────────────────────────────────────────────
  backendUrl: 'http://localhost:3001',

  // ── License ───────────────────────────────────────────────────────────────
  license: {
    getStatus:   ()    => ipcRenderer.invoke('license:get-status'),
    activate:    (key) => ipcRenderer.invoke('license:activate',   key),
    deactivate:  ()    => ipcRenderer.invoke('license:deactivate'),
  },

  // ── Backup & Restore ──────────────────────────────────────────────────────
  backup: {
    export:      () => ipcRenderer.invoke('backup:export'),
    restore:     () => ipcRenderer.invoke('backup:restore'),
    getAutoInfo: () => ipcRenderer.invoke('backup:get-auto-info'),
  },

  // ── Auto-updater ──────────────────────────────────────────────────────────
  updater: {
    check:    () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install:  () => ipcRenderer.invoke('updater:install'),

    // Subscribe to update status events from main process.
    // Returns an unsubscribe function.
    onStatus: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },
});
