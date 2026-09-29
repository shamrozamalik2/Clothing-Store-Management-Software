/**
 * PrinterManager — the single entry point the React app talks to for
 * thermal receipt printing. The POS page never checks "am I in Chrome or
 * Electron" itself; it just calls printerManager.printReceipt(data) and
 * this class picks the right transport:
 *
 *   Electron (native bridge available) -> window.electronAPI.printer.*
 *     (USB via Windows print spooler, Bluetooth Classic via COM port —
 *      implemented in the Electron main process, see electron/printer/)
 *   Browser (Chrome/Edge, BLE printer connected) -> Web Bluetooth
 *   Browser (default / no thermal connection) -> window.print() dialog
 *
 * Until the Electron native bridge is implemented, `window.electronAPI.printer`
 * is undefined, so `isElectronBridgeAvailable` is false and this manager
 * transparently falls back to the browser paths — even when running inside
 * the packaged desktop app. No mode is ever reported as available unless it
 * actually is.
 */

import { buildEscPosReceipt, buildTestEscPos } from './escposReceipt';
import { buildReceiptHtml, buildTestReceiptHtml } from './receiptHtml';

export const IS_ELECTRON_SHELL = typeof window !== 'undefined' && !!window.electronAPI;
export const HAS_ELECTRON_PRINTER_BRIDGE =
  typeof window !== 'undefined' && !!window.electronAPI?.printer;
export const BT_SUPPORTED = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

// Nordic UART Service — covers the majority of affordable BLE thermal printers.
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

function printHtml(html) {
  const win = window.open('', '_blank', 'width=340,height=620,scrollbars=yes,resizable=yes');
  if (!win) throw new Error('Pop-up blocked. Please allow pop-ups for this site to print receipts.');
  win.document.write(html);
  win.document.close();
}

export const CONNECTION = {
  BROWSER:  'browser',  // window.print() dialog — universal fallback
  BLUETOOTH: 'bluetooth', // Web Bluetooth (BLE only)
  ELECTRON: 'electron',  // native bridge (USB / Bluetooth Classic via COM port)
};

class PrinterManager {
  constructor() {
    this._mode          = CONNECTION.BROWSER;
    this._btDevice      = null;
    this._btChar        = null;
    this._name          = null;
    this._electronTarget = null; // { type: 'usb'|'serial', id, name }
  }

  // ── Status ───────────────────────────────────────────────────────────────

  get mode()                    { return this._mode; }
  get printerName()             { return this._name; }
  get bluetoothSupported()      { return BT_SUPPORTED; }
  get electronBridgeAvailable() { return HAS_ELECTRON_PRINTER_BRIDGE; }

  get isConnected() {
    if (this._mode === CONNECTION.BLUETOOTH) return !!this._btDevice?.gatt?.connected;
    if (this._mode === CONNECTION.ELECTRON)  return !!this._electronTarget;
    return true; // browser dialog mode has no persistent "connection"
  }

  // ── Mode selection ──────────────────────────────────────────────────────

  useBrowser() {
    this._mode = CONNECTION.BROWSER;
    this._name = 'System Printer';
  }

  // ── Electron native bridge (USB / Bluetooth Classic COM port) ──────────
  // No-ops safely if the bridge isn't implemented yet — callers should check
  // `electronBridgeAvailable` before offering this in the UI.

  async listElectronPrinters() {
    if (!HAS_ELECTRON_PRINTER_BRIDGE) return { usb: [], serial: [] };
    return window.electronAPI.printer.list();
  }

  async connectElectron(target) {
    if (!HAS_ELECTRON_PRINTER_BRIDGE) {
      throw new Error('Desktop printer bridge is not available in this build.');
    }
    const res = await window.electronAPI.printer.connect(target);
    if (!res?.success) throw new Error(res?.error || 'Could not connect to printer.');
    this._mode = CONNECTION.ELECTRON;
    this._electronTarget = target;
    this._name = target.name || target.id;
    return this._name;
  }

  // ── Web Bluetooth (BLE only) ────────────────────────────────────────────

  async connectBluetooth() {
    if (!BT_SUPPORTED) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Use Google Chrome or Microsoft Edge, ' +
        'and note that only Bluetooth Low Energy (BLE) printers are reachable this way — ' +
        'Bluetooth Classic printers need the desktop app’s native bridge or a system-printer/USB connection.'
      );
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE],
    });

    const server = await device.gatt.connect();
    let characteristic;
    try {
      const service  = await server.getPrimaryService(NUS_SERVICE);
      characteristic = await service.getCharacteristic(NUS_TX_CHAR);
    } catch {
      device.gatt.disconnect();
      throw new Error(
        `Connected to "${device.name || 'device'}" but no compatible printer service was found. ` +
        'This printer may not support Web Bluetooth (BLE) printing — try System Printer instead.'
      );
    }

    this._btDevice = device;
    this._btChar   = characteristic;
    this._name     = device.name || 'Bluetooth Printer';
    this._mode     = CONNECTION.BLUETOOTH;

    device.addEventListener('gattserverdisconnected', () => {
      this._btDevice = null;
      this._btChar   = null;
    });

    return this._name;
  }

  async disconnect() {
    if (this._btDevice?.gatt?.connected) this._btDevice.gatt.disconnect();
    this._btDevice = null;
    this._btChar   = null;
    if (HAS_ELECTRON_PRINTER_BRIDGE && this._mode === CONNECTION.ELECTRON) {
      try { await window.electronAPI.printer.disconnect(); } catch { /* best effort */ }
    }
    this._electronTarget = null;
    this.useBrowser();
  }

  // ── Byte transport ───────────────────────────────────────────────────────

  async _sendBytes(bytes) {
    if (this._mode === CONNECTION.BLUETOOTH) {
      if (!this._btChar) throw new Error('Bluetooth printer not connected.');
      const CHUNK = 20; // BLE write-without-response payload limit on most printers
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await this._btChar.writeValue(bytes.slice(i, i + CHUNK));
      }
      return;
    }
    if (this._mode === CONNECTION.ELECTRON) {
      const res = await window.electronAPI.printer.write(Array.from(bytes));
      if (!res?.success) throw new Error(res?.error || 'Printer write failed.');
      return;
    }
    throw new Error('No direct printer connection — use printReceipt()/testPrint() in browser mode instead.');
  }

  // ── High-level operations ───────────────────────────────────────────────

  async testPrint({ paperWidthMm } = {}) {
    if (this._mode === CONNECTION.BROWSER) {
      printHtml(buildTestReceiptHtml({ printerName: this._name || 'System Printer', connType: 'System', paperWidthMm }));
      return;
    }
    const bytes = buildTestEscPos({ printerName: this._name, connType: this._mode, paperWidthMm });
    await this._sendBytes(bytes);
  }

  async printReceipt(receiptData) {
    if (this._mode === CONNECTION.BROWSER) {
      printHtml(buildReceiptHtml(receiptData));
      return;
    }
    const bytes = buildEscPosReceipt(receiptData);
    await this._sendBytes(bytes);
  }
}

export const printerManager = new PrinterManager();
