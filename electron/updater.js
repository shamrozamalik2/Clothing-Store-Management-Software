'use strict';

const { autoUpdater } = require('electron-updater');
const { ipcMain }     = require('electron');

let _mainWindow = null;

function send(event, payload) {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send(event, payload);
  }
}

/**
 * Initialize auto-updater. Call once after mainWindow is created.
 * Renderer receives 'updater:status' events: { state, info? }
 * state values: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
 */
function initUpdater(mainWindow) {
  _mainWindow = mainWindow;

  // Disable auto-download; let the user decide
  autoUpdater.autoDownload        = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    send('updater:status', { state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    send('updater:status', { state: 'available', info });
  });

  autoUpdater.on('update-not-available', () => {
    send('updater:status', { state: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    send('updater:status', { state: 'downloading', progress });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send('updater:status', { state: 'downloaded', info });
  });

  autoUpdater.on('error', (err) => {
    send('updater:status', { state: 'error', message: err.message });
  });

  // IPC: renderer can trigger manual check
  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Silently check for updates a few seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 10_000);
}

module.exports = { initUpdater };
