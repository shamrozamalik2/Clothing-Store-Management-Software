'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { spawn } = require('child_process');
const http   = require('http');
const net    = require('net');

const { getStatus, saveLicense, clearLicense } = require('./license');
const { initUpdater } = require('./updater');

const BACKEND_PORT      = 3001;
const FRONTEND_DEV_PORT = 5173;
const isDev             = !app.isPackaged;

let mainWindow     = null;
let backendProcess = null;
let backendReady   = false;
let logStream      = null;

// ─── Logging (writes to userData/backend.log) ─────────────────────────────────

function initLog() {
  try {
    const logDir  = app.getPath('userData');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'backend.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    log('─'.repeat(70));
    log(`App started          ${new Date().toISOString()}`);
    log(`app.isPackaged       = ${app.isPackaged}`);
    log(`process.execPath     = ${process.execPath}`);
    log(`process.resourcesPath= ${app.isPackaged ? process.resourcesPath : '(dev — not set)'}`);
    log(`__dirname            = ${__dirname}`);
    log(`userData             = ${logDir}`);
    log(`log file             = ${logPath}`);
  } catch (e) {
    console.error('[Log init error]', e.message);
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { if (logStream) logStream.write(line + '\n'); } catch (_) {}
}

function logErr(msg) {
  const line = `[${new Date().toISOString()}] ERR  ${msg}`;
  console.error(line);
  try { if (logStream) logStream.write(line + '\n'); } catch (_) {}
}

// ─── Backend Management ────────────────────────────────────────────────────────

function getBackendPath() {
  // Use app.isPackaged (reliable) rather than NODE_ENV
  if (!app.isPackaged) {
    return path.join(__dirname, '../backend/src/server.js');
  }
  return path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'src', 'server.js');
}

function checkPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));        // already in use
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

function verifyFiles(serverPath) {
  const dir = path.dirname(serverPath);
  const toCheck = [
    ['server.js',     serverPath],
    ['app.js',        path.join(dir, 'app.js')],
    ['config/',       path.join(dir, 'config')],
    ['routes/',       path.join(dir, 'routes')],
    ['controllers/',  path.join(dir, 'controllers')],
    ['middleware/',   path.join(dir, 'middleware')],
  ];
  let allOk = true;
  for (const [label, p] of toCheck) {
    const ok = fs.existsSync(p);
    log(`  ${ok ? '✓' : '✗ MISSING'}  ${label.padEnd(18)} ${p}`);
    if (!ok) allOk = false;
  }
  return allOk;
}

async function startBackend() {
  return new Promise(async (resolve, reject) => {
    const userData   = app.getPath('userData');
    const serverPath = getBackendPath();

    log('=== startBackend ===');
    log(`serverPath = ${serverPath}`);
    log(`exists     = ${fs.existsSync(serverPath)}`);

    // 1. Verify required files
    log('--- file check ---');
    const filesOk = verifyFiles(serverPath);
    if (!filesOk) {
      return reject(new Error(
        `One or more backend files are missing.\nSee log: ${path.join(userData, 'backend.log')}`
      ));
    }

    // 2. Check port availability
    log('--- port check ---');
    const portFree = await checkPort(BACKEND_PORT);
    log(`  port ${BACKEND_PORT} free = ${portFree}`);
    if (!portFree) {
      logErr(`Port ${BACKEND_PORT} already in use — another process may be running.`);
    }

    // 3. Spawn — ELECTRON_RUN_AS_NODE=1 is critical in packaged builds.
    //    Without it, process.execPath (SAS Garments.exe) ignores the script
    //    argument and re-launches the packaged app instead of running server.js.
    // In production, node_modules live inside app.asar but server.js is in
    // app.asar.unpacked — a real path. Node's require walker can't cross that
    // boundary automatically, so we set NODE_PATH explicitly to the ASAR's
    // node_modules directory. Electron's ASAR fs-patches intercept every
    // fs.stat/readdir call on that path transparently.
    const nodePath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'node_modules')
      : undefined;

    const spawnEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV:              app.isPackaged ? 'production' : 'development',
      PORT:                  String(BACKEND_PORT),
      APP_DATA_PATH:         userData,
      ...(nodePath && { NODE_PATH: nodePath }),
    };

    log('--- spawn ---');
    log(`  execPath  = ${process.execPath}`);
    log(`  args      = [${serverPath}]`);
    log(`  NODE_ENV  = ${spawnEnv.NODE_ENV}`);
    log(`  PORT      = ${spawnEnv.PORT}`);
    log(`  APP_DATA_PATH  = ${spawnEnv.APP_DATA_PATH}`);
    log(`  NODE_PATH      = ${nodePath || '(dev — not set)'}`);
    log(`  ELECTRON_RUN_AS_NODE = 1`);

    backendProcess = spawn(process.execPath, [serverPath], {
      env:   spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (backendProcess.pid) {
      log(`  PID = ${backendProcess.pid} ✓`);
    } else {
      logErr('  spawn() returned no PID — process failed to start');
    }

    backendProcess.stdout.on('data', (data) => {
      data.toString().split('\n').filter(Boolean).forEach(line => {
        log(`[Backend] ${line}`);
      });
    });

    backendProcess.stderr.on('data', (data) => {
      data.toString().split('\n').filter(Boolean).forEach(line => {
        logErr(`[Backend stderr] ${line}`);
      });
    });

    backendProcess.on('error', (err) => {
      logErr(`[spawn error] code=${err.code}  errno=${err.errno}  msg=${err.message}`);
      reject(err);
    });

    backendProcess.on('close', (code, signal) => {
      log(`[Backend] exited  code=${code}  signal=${signal}`);
    });

    // 4. Health-check polling — 30 × 500 ms = 15 s total
    setTimeout(() => waitForBackend(resolve, reject, userData), 1000);
  });
}

function waitForBackend(resolve, reject, userData, attempts = 0) {
  const MAX = 30;
  if (attempts >= MAX) {
    logErr(`Health check failed after ${MAX} attempts`);
    reject(new Error(
      `Backend failed to start after ${MAX} attempts.\n\nFull log:\n${path.join(userData, 'backend.log')}`
    ));
    return;
  }

  const url = `http://localhost:${BACKEND_PORT}/api/health`;
  if (attempts === 0 || attempts % 5 === 0) {
    log(`[Health] attempt ${attempts + 1}/${MAX}  GET ${url}`);
  }

  http.get(url, (res) => {
    log(`[Health] attempt ${attempts + 1}  status=${res.statusCode}`);
    if (res.statusCode === 200) {
      backendReady = true;
      log('[Health] PASSED ✓  backend is ready');
      resolve();
    } else {
      setTimeout(() => waitForBackend(resolve, reject, userData, attempts + 1), 500);
    }
  }).on('error', (err) => {
    if (attempts === 0 || attempts % 5 === 0) {
      log(`[Health] attempt ${attempts + 1}  error=${err.message}`);
    }
    setTimeout(() => waitForBackend(resolve, reject, userData, attempts + 1), 500);
  });
}

// ─── Window Management ─────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:       1440,
    height:      900,
    minWidth:    1024,
    minHeight:   768,
    title:       'SAS Garments',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload:           path.join(__dirname, 'preload.js'),
      contextIsolation:  true,
      nodeIntegration:   false,
      sandbox:           false,
      webSecurity:       !isDev,
    },
  });

  const url = isDev
    ? `http://localhost:${FRONTEND_DEV_PORT}`
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });
  mainWindow.on('closed', () => { mainWindow = null; });

  setApplicationMenu();

  // Init auto-updater after window is ready
  initUpdater(mainWindow);
}

function setApplicationMenu() {
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
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
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

// ─── IPC: App info ─────────────────────────────────────────────────────────────

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-path',    (_, name) => app.getPath(name));
ipcMain.handle('app:reload',      () => mainWindow?.reload());

// ─── IPC: Dialogs / Shell ──────────────────────────────────────────────────────

ipcMain.handle('dialog:open-file',   async (_, opts) => dialog.showOpenDialog(mainWindow, opts));
ipcMain.handle('dialog:save-file',   async (_, opts) => dialog.showSaveDialog(mainWindow, opts));
ipcMain.handle('dialog:message-box', async (_, opts) => dialog.showMessageBox(mainWindow, opts));
ipcMain.handle('shell:open-path',    async (_, p)    => (await shell.openPath(p)) || null);

// ─── IPC: License ──────────────────────────────────────────────────────────────

ipcMain.handle('license:get-status', () => {
  return getStatus(app.getPath('userData'));
});

ipcMain.handle('license:activate', (_, key) => {
  try {
    const result = saveLicense(app.getPath('userData'), key);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('license:deactivate', () => {
  clearLicense(app.getPath('userData'));
  return { success: true };
});

// ─── IPC: Backup & Restore ────────────────────────────────────────────────────

function getDbPath() {
  const dataDir = app.getPath('userData');
  return path.join(dataDir, 'database', 'sas_garments.db');
}

function getAutoBackupDir() {
  return path.join(app.getPath('userData'), 'auto-backups');
}

// Runs once per day on startup. Keeps the last 7 daily backups automatically.
function runAutoBackup() {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return;

    const backupDir = getAutoBackupDir();
    fs.mkdirSync(backupDir, { recursive: true });

    // Skip if already backed up today
    const now   = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_') && f.endsWith('.db')).sort();
    if (files.some(f => f.includes(stamp))) {
      log('[AutoBackup] Already backed up today — skipped');
      return;
    }

    const timeStamp = `${stamp}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    const dest = path.join(backupDir, `auto_${timeStamp}.db`);
    fs.copyFileSync(dbPath, dest);
    log(`[AutoBackup] Created: ${dest}`);

    // Prune — keep only the 7 most recent
    const all = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_') && f.endsWith('.db')).sort();
    if (all.length > 7) {
      all.slice(0, all.length - 7).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
        log(`[AutoBackup] Pruned old backup: ${f}`);
      });
    }
  } catch (err) {
    logErr(`[AutoBackup] Failed: ${err.message}`);
  }
}

ipcMain.handle('backup:export', async () => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file not found.' };
  }

  const now    = new Date();
  const stamp  = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  const defaultName = `SAS_Backup_${stamp}.db`;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title:       'Export Database Backup',
    defaultPath: defaultName,
    filters:     [{ name: 'SQLite Database', extensions: ['db'] }],
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.copyFileSync(dbPath, filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:get-auto-info', () => {
  try {
    const backupDir = getAutoBackupDir();
    if (!fs.existsSync(backupDir)) return { backups: [], dir: backupDir };
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('auto_') && f.endsWith('.db'))
      .sort().reverse()
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() };
      });
    return { backups, dir: backupDir };
  } catch (err) {
    return { backups: [], dir: '', error: err.message };
  }
});

ipcMain.handle('backup:restore', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title:       'Restore Database Backup',
    filters:     [{ name: 'SQLite Database', extensions: ['db'] }],
    properties:  ['openFile'],
  });

  if (canceled || !filePaths?.length) return { success: false, canceled: true };
  const sourcePath = filePaths[0];

  // Quick sanity check: SQLite files start with "SQLite format 3"
  try {
    const header = Buffer.alloc(16);
    const fd = fs.openSync(sourcePath, 'r');
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    if (!header.toString('utf8').startsWith('SQLite format 3')) {
      return { success: false, error: 'The selected file does not appear to be a valid SQLite database.' };
    }
  } catch (err) {
    return { success: false, error: `Cannot read file: ${err.message}` };
  }

  // Warn user — this is destructive
  const { response } = await dialog.showMessageBox(mainWindow, {
    type:       'warning',
    title:      'Confirm Restore',
    message:    'Restore database?',
    detail:     'This will replace ALL current data with the backup. The application will restart. This cannot be undone.',
    buttons:    ['Cancel', 'Restore & Restart'],
    defaultId:  0,
    cancelId:   0,
  });

  if (response === 0) return { success: false, canceled: true };

  try {
    const dbPath = getDbPath();
    const dbDir  = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    // Write to a temp file first, then rename (atomic-ish)
    const tmpPath = dbPath + '.restore_tmp';
    fs.copyFileSync(sourcePath, tmpPath);
    fs.renameSync(tmpPath, dbPath);

    // Kill backend, then relaunch app
    if (backendProcess) { backendProcess.kill(); backendProcess = null; }
    app.relaunch();
    app.exit(0);

    return { success: true }; // won't reach here
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  initLog();
  try {
    log('[Electron] Starting backend…');
    await startBackend();
    log('[Electron] Backend ready — creating window');
    runAutoBackup();
    createWindow();
  } catch (err) {
    logErr(`[Electron] Startup failed: ${err.message}`);
    dialog.showErrorBox(
      'Startup Error',
      `SAS Garments failed to start the backend server.\n\n${err.message}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null; }
});

// Security: prevent new window creation / external navigation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => {
    const allowed = [
      `http://localhost:${FRONTEND_DEV_PORT}`,
      `http://localhost:${BACKEND_PORT}`,
    ];
    const parsed = new URL(url);
    if (!allowed.some((o) => url.startsWith(o)) && parsed.protocol === 'file:') return;
    if (!allowed.some((o) => url.startsWith(o))) event.preventDefault();
  });
});
