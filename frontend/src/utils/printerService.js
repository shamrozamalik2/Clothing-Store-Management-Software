/**
 * PrinterService — platform-aware printer abstraction.
 *
 * Supports:
 *   - System print  (window.print via iframe) — all platforms
 *   - Bluetooth     (Web Bluetooth API + ESC/POS) — Chrome/Edge desktop & Android
 *   - Electron      (window.electronAPI.print if available)
 *
 * Bluetooth thermal printers: uses Nordic UART Service (NUS), which covers
 * the majority of affordable BLE thermal printers (GOOJPRT, Peripage, etc.)
 */

// ── Platform detection ──────────────────────────────────────────────────────

export const IS_ELECTRON        = typeof window !== 'undefined' && !!window.electronAPI;
export const BT_SUPPORTED       = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
export const IS_MOBILE          = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const PLATFORM           = IS_ELECTRON ? 'electron' : IS_MOBILE ? 'mobile' : 'web';

// Nordic UART Service (NUS) — most common for BLE thermal printers
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write to printer

// ── ESC/POS helpers ─────────────────────────────────────────────────────────

const ESC = 0x1B;
const GS  = 0x1D;
const enc = new TextEncoder();

const cmd = {
  init:        () => new Uint8Array([ESC, 0x40]),
  lf:          () => new Uint8Array([0x0A]),
  cut:         () => new Uint8Array([GS, 0x56, 0x41, 0x00]),
  center:      () => new Uint8Array([ESC, 0x61, 0x01]),
  left:        () => new Uint8Array([ESC, 0x61, 0x00]),
  boldOn:      () => new Uint8Array([ESC, 0x45, 0x01]),
  boldOff:     () => new Uint8Array([ESC, 0x45, 0x00]),
  doubleSize:  () => new Uint8Array([ESC, 0x21, 0x30]),
  normalSize:  () => new Uint8Array([ESC, 0x21, 0x00]),
  text:        (s) => enc.encode(s + '\n'),
  divider:     () => enc.encode('-'.repeat(32) + '\n'),
  barcode128:  (data) => {
    const d = enc.encode(data);
    return new Uint8Array([
      GS, 0x68, 60,      // height: 60 dots
      GS, 0x77, 2,       // width multiplier: 2
      GS, 0x48, 2,       // HRI: below barcode
      GS, 0x6B, 73,      // format: CODE128
      d.length, ...d,
    ]);
  },
};

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf   = new Uint8Array(total);
  let offset  = 0;
  for (const p of parts) { buf.set(p, offset); offset += p.length; }
  return buf;
}

// ── System print (iframe) ───────────────────────────────────────────────────

function printHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve();
        }, 1000);
      } catch (e) {
        document.body.removeChild(iframe);
        reject(e);
      }
    }, 400);
  });
}

const PRINT_BASE_CSS = `
  @page { margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    margin: 0;
    padding: 0;
    color: #000;
    background: #fff;
  }
  .label {
    page-break-inside: avoid;
    text-align: center;
    padding: 4mm;
    border-bottom: 1px dashed #ccc;
  }
  .label:last-child { border-bottom: none; }
  h2 { font-size: 12pt; margin: 0 0 4px; }
  p  { font-size: 9pt;  margin: 2px 0; }
  .barcode-wrap { margin: 6px 0; }
  .barcode-wrap svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  hr { border: 1px dashed #000; margin: 4px 0; }
  .bulk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  @media print {
    .bulk-grid { grid-template-columns: 1fr 1fr; }
  }
`;

function testPrintHtml(printerName, connType) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-PK');
  const time = now.toLocaleTimeString('en-PK');
  return `<!DOCTYPE html><html><head><title>Test Print</title>
  <style>${PRINT_BASE_CSS}</style></head><body>
  <div class="label">
    <hr/>
    <h2>ProBusinessCloud</h2>
    <p>PBC POS</p>
    <hr/>
    <p>&nbsp;</p>
    <p><b>PRINTER TEST</b></p>
    <p>&nbsp;</p>
    <p>Printer: ${printerName}</p>
    <p>Connection: ${connType}</p>
    <p>Date: ${date}</p>
    <p>Time: ${time}</p>
    <p>&nbsp;</p>
    <p>&#10003; Test Print Successful</p>
    <hr/>
  </div>
  </body></html>`;
}

function testBarcodeHtml(svgString, companyName = 'ProBusinessCloud') {
  return `<!DOCTYPE html><html><head><title>Test Barcode</title>
  <style>${PRINT_BASE_CSS}</style></head><body>
  <div class="label">
    <h2>${companyName}</h2>
    <p>Sample Product</p>
    <p>Price: 1,000</p>
    <div class="barcode-wrap">${svgString}</div>
    <p>123456789012</p>
  </div>
  </body></html>`;
}

function productLabelHtml(product, qty, svgString) {
  const label = `
    <div class="label">
      <p><b>${product.name}</b></p>
      ${product.barcode || product.sku ? `<div class="barcode-wrap">${svgString}</div>` : ''}
      <p>${product.barcode || product.sku || ''}</p>
      <p>Price: ${Number(product.sale_price || 0).toLocaleString('en-PK')}</p>
      ${product.sku ? `<p>SKU: ${product.sku}</p>` : ''}
    </div>`;
  const labels = Array(Math.max(1, qty)).fill(label).join('');
  return `<!DOCTYPE html><html><head><title>Product Label</title>
  <style>${PRINT_BASE_CSS}</style></head><body>${labels}</body></html>`;
}

function bulkLabelsHtml(items) {
  // items: [{ product, qty, svgString }]
  const labels = items.flatMap(({ product, qty, svgString }) =>
    Array(Math.max(1, qty)).fill(`
      <div class="label">
        <p><b>${product.name}</b></p>
        ${svgString ? `<div class="barcode-wrap">${svgString}</div>` : ''}
        <p>${product.barcode || product.sku || ''}</p>
        <p>Price: ${Number(product.sale_price || 0).toLocaleString('en-PK')}</p>
      </div>`)
  ).join('');
  return `<!DOCTYPE html><html><head><title>Bulk Labels</title>
  <style>${PRINT_BASE_CSS} .bulk-grid > * { break-inside: avoid; }</style>
  </head><body><div class="bulk-grid">${labels}</div></body></html>`;
}

// ── PrinterService class ─────────────────────────────────────────────────────

export class PrinterService {
  constructor() {
    this._device     = null;
    this._char       = null;
    this._name       = null;
    this._connType   = 'system'; // default
    this._listeners  = new Set();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get bluetoothSupported() { return BT_SUPPORTED; }
  get platform()            { return PLATFORM; }
  get connectionType()      { return this._connType; }
  get printerName()         { return this._name; }

  get isConnected() {
    if (this._connType === 'system')    return true;
    if (this._connType === 'bluetooth') return !!(this._device?.gatt?.connected);
    return false;
  }

  setConnectionType(type) {
    if (type !== this._connType) {
      this._connType = type;
      this._device   = null;
      this._char     = null;
      this._name     = type === 'system' ? 'System Printer' : null;
    }
  }

  // ── Bluetooth ──────────────────────────────────────────────────────────────

  async connectBluetooth() {
    if (!BT_SUPPORTED) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. ' +
        'Use Google Chrome or Microsoft Edge on desktop/Android.'
      );
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE],
    });

    const server = await device.gatt.connect();

    let characteristic;
    try {
      const service    = await server.getPrimaryService(NUS_SERVICE);
      characteristic   = await service.getCharacteristic(NUS_TX_CHAR);
    } catch {
      device.gatt.disconnect();
      throw new Error(
        `Connected to "${device.name || 'device'}" but the printer service was not found. ` +
        'This printer may not support Web Bluetooth printing. Try "System Printer" instead.'
      );
    }

    this._device = device;
    this._char   = characteristic;
    this._name   = device.name || 'Bluetooth Printer';

    device.addEventListener('gattserverdisconnected', () => {
      this._device = null;
      this._char   = null;
    });

    return this._name;
  }

  async disconnect() {
    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect();
    }
    this._device = null;
    this._char   = null;
    if (this._connType !== 'system') this._name = null;
  }

  // ── Send bytes over BLE ────────────────────────────────────────────────────

  async _sendBytes(bytes) {
    if (!this._char) throw new Error('Bluetooth printer not connected.');
    const CHUNK = 20;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await this._char.writeValue(bytes.slice(i, i + CHUNK));
    }
  }

  // ── Test print ─────────────────────────────────────────────────────────────

  async testPrint() {
    const name = this._name || this._connType;

    if (this._connType === 'bluetooth' && this._char) {
      const bytes = concat(
        cmd.init(),
        cmd.center(),
        cmd.divider(),
        cmd.doubleSize(), cmd.text('ProBusinessCloud'), cmd.normalSize(),
        cmd.text('PBC POS'),
        cmd.divider(),
        cmd.lf(),
        cmd.boldOn(), cmd.text('PRINTER TEST'), cmd.boldOff(),
        cmd.lf(),
        cmd.left(),
        cmd.text(`Printer: ${name}`),
        cmd.text(`Connection: Bluetooth`),
        cmd.text(`Date: ${new Date().toLocaleDateString('en-PK')}`),
        cmd.text(`Time: ${new Date().toLocaleTimeString('en-PK')}`),
        cmd.lf(),
        cmd.center(),
        cmd.text('✓ Test Print Successful'),
        cmd.divider(),
        cmd.lf(), cmd.lf(),
        cmd.cut(),
      );
      await this._sendBytes(bytes);
    } else {
      await printHtml(testPrintHtml(name, this._connType));
    }
  }

  // ── Test barcode ───────────────────────────────────────────────────────────

  async testBarcodePrint(svgString, companyName = 'ProBusinessCloud') {
    if (this._connType === 'bluetooth' && this._char) {
      const bytes = concat(
        cmd.init(),
        cmd.center(),
        cmd.text(companyName),
        cmd.text('Sample Product'),
        cmd.text('Price: 1,000'),
        cmd.lf(),
        cmd.barcode128('123456789012'),
        cmd.lf(),
        cmd.text('123456789012'),
        cmd.lf(), cmd.lf(),
        cmd.cut(),
      );
      await this._sendBytes(bytes);
    } else {
      await printHtml(testBarcodeHtml(svgString, companyName));
    }
  }

  // ── Print product label ────────────────────────────────────────────────────

  async printLabel(product, qty, svgString) {
    const barcodeVal = product.barcode || product.sku || '';

    if (this._connType === 'bluetooth' && this._char) {
      for (let i = 0; i < Math.max(1, qty); i++) {
        const bytes = concat(
          cmd.init(),
          cmd.center(),
          cmd.boldOn(), cmd.text(product.name), cmd.boldOff(),
          cmd.text(`Price: ${Number(product.sale_price || 0).toLocaleString('en-PK')}`),
          cmd.text(`SKU: ${product.sku || ''}`),
          cmd.lf(),
          barcodeVal ? cmd.barcode128(barcodeVal) : new Uint8Array(),
          cmd.lf(),
          barcodeVal ? cmd.text(barcodeVal) : new Uint8Array(),
          cmd.lf(), cmd.lf(),
          cmd.cut(),
        );
        await this._sendBytes(bytes);
      }
    } else {
      await printHtml(productLabelHtml(product, qty, svgString));
    }
  }

  // ── Bulk print ─────────────────────────────────────────────────────────────

  async printBulk(items) {
    // items: [{ product, qty, svgString }]
    if (this._connType === 'bluetooth' && this._char) {
      for (const { product, qty, svgString } of items) {
        await this.printLabel(product, qty, svgString);
      }
    } else {
      await printHtml(bulkLabelsHtml(items));
    }
  }
}

export const printerService = new PrinterService();
