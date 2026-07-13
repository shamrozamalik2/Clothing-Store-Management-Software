'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');

const { getStatus, saveLicense, clearLicense } = require('./license');
const { initUpdater } = require('./updater');

const FRONTEND_DEV_PORT = 5173;
const isDev             = !app.isPackaged;

let mainWindow = null;
let logStream  = null;

// ─── Logging ──────────────────────────────────────────────────────────────────

function initLog() {
  try {
    const logDir  = app.getPath('userData');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'app.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    log('─'.repeat(60));
    log(`Started      ${new Date().toISOString()}`);
    log(`version      ${app.getVersion()}`);
    log(`packaged     ${app.isPackaged}`);
    log(`userData     ${logDir}`);
  } catch (e) {
    console.error('[Log init error]', e.message);
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { if (logStream) logStream.write(line + '\n'); } catch (_) {}
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 1024,
    minHeight: 768,
    title:    'SAS Garments',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
      webSecurity:      !isDev,
    },
  });

  const url = isDev
    ? `http://localhost:${FRONTEND_DEV_PORT}`
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(url);
  log(`[Window] Loading ${url}`);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });
  mainWindow.on('closed', () => { mainWindow = null; });

  buildMenu();
  initUpdater(mainWindow);
}

function buildMenu() {
  const template = [
    {
      label: 'SAS Garments',
      submenu: [
        { label: 'About SAS Garments', role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-path',    (_, name) => app.getPath(name));
ipcMain.handle('app:reload',      () => mainWindow?.reload());

ipcMain.handle('dialog:open-file',   async (_, opts) => dialog.showOpenDialog(mainWindow, opts));
ipcMain.handle('dialog:save-file',   async (_, opts) => dialog.showSaveDialog(mainWindow, opts));
ipcMain.handle('dialog:message-box', async (_, opts) => dialog.showMessageBox(mainWindow, opts));
ipcMain.handle('shell:open-path',    async (_, p)    => (await shell.openPath(p)) || null);

ipcMain.handle('license:get-status', () => getStatus(app.getPath('userData')));

ipcMain.handle('license:activate', (_, key) => {
  try {
    return { success: true, ...saveLicense(app.getPath('userData'), key) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('license:deactivate', () => {
  clearLicense(app.getPath('userData'));
  return { success: true };
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initLog();
  log('[Electron] Ready — creating window');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Prevent new windows and block external navigation in production
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, navUrl) => {
    const parsed = new URL(navUrl);
    if (parsed.protocol === 'file:') return; // local frontend ok
    if (isDev && navUrl.startsWith(`http://localhost:${FRONTEND_DEV_PORT}`)) return;
    event.preventDefault();
    log(`[Security] Blocked navigation to ${navUrl}`);
  });
});
