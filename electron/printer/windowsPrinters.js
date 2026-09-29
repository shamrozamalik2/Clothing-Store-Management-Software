'use strict';

/**
 * Windows printer-queue access — covers USB thermal printers (and any
 * Bluetooth printer Windows has also installed as a print queue), by
 * writing raw ESC/POS bytes through the spooler via win-raw-print.ps1
 * rather than claiming the USB interface directly (which would fight the
 * OS driver that already owns it — see PHASE 1 report).
 */

const path = require('path');
const os   = require('os');
const fs   = require('fs');
const { execFile } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'win-raw-print.ps1');

function runPowerShell(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args],
      { windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message || 'PowerShell command failed').trim()));
        resolve(stdout.trim());
      },
    );
  });
}

/** Lists Windows-installed printers (any connection type — USB, network, or
 *  Bluetooth-as-printer-queue). Excludes obvious non-physical/virtual entries. */
async function listWindowsPrinters() {
  if (process.platform !== 'win32') return [];
  try {
    const json = await runPowerShell([
      '-Command',
      'Get-Printer | Select-Object Name, PortName, DriverName | ConvertTo-Json -Compress',
    ]);
    if (!json) return [];
    const parsed = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((p) => p?.Name && !/^(Microsoft Print to PDF|Microsoft XPS Document Writer|Fax|OneNote)/i.test(p.Name))
      .map((p) => ({ id: p.Name, name: p.Name, portName: p.PortName, driverName: p.DriverName }));
  } catch (_) {
    return [];
  }
}

/** Sends raw ESC/POS bytes to a Windows-installed printer via the spooler. */
async function sendRawBytes(printerName, bytes) {
  if (process.platform !== 'win32') {
    throw new Error('USB/Windows printer bridge is only available on Windows.');
  }
  const tmpFile = path.join(os.tmpdir(), `pbc-print-${Date.now()}.bin`);
  await fs.promises.writeFile(tmpFile, Buffer.from(bytes));
  try {
    const result = await runPowerShell([
      '-File', SCRIPT_PATH,
      '-PrinterName', printerName,
      '-DataFile', tmpFile,
    ]);
    if (result !== 'OK') throw new Error(result || 'Raw print failed.');
  } finally {
    fs.promises.unlink(tmpFile).catch(() => {});
  }
}

module.exports = { listWindowsPrinters, sendRawBytes };
