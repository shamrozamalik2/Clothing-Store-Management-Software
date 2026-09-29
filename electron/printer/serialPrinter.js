'use strict';

/**
 * Bluetooth Classic thermal printers on Windows: pair the printer via
 * Windows Bluetooth Settings first (as today), which creates an "Outgoing"
 * COM port. This module opens that COM port and writes raw ESC/POS bytes
 * to it — the standard, reliable way to reach SPP printers from Node/Electron
 * on Windows (there is no good cross-platform Bluetooth Classic library for
 * Windows; the OS already did the pairing/RFCOMM work, we just need serial).
 */

const { SerialPort } = require('serialport');

let activePort = null;
let activeInfo = null;

async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      id:   p.path,
      name: p.friendlyName || p.pnpId || p.path,
      path: p.path,
    }));
  } catch (_) {
    return [];
  }
}

function connectSerial({ path: portPath, name }, { baudRate = 9600 } = {}) {
  return new Promise((resolve, reject) => {
    if (activePort?.isOpen) {
      activePort.close(() => {});
      activePort = null;
    }
    const port = new SerialPort({ path: portPath, baudRate, autoOpen: false });
    port.open((err) => {
      if (err) return reject(new Error(`Could not open ${portPath}: ${err.message}`));
      activePort = port;
      activeInfo = { id: portPath, name: name || portPath, path: portPath };
      resolve(activeInfo);
    });
  });
}

function writeSerial(bytes) {
  return new Promise((resolve, reject) => {
    if (!activePort?.isOpen) return reject(new Error('No Bluetooth (COM port) printer connected.'));
    activePort.write(Buffer.from(bytes), (err) => {
      if (err) return reject(new Error(`Write failed: ${err.message}`));
      activePort.drain((drainErr) => {
        if (drainErr) return reject(new Error(`Write failed: ${drainErr.message}`));
        resolve();
      });
    });
  });
}

function disconnectSerial() {
  return new Promise((resolve) => {
    if (activePort?.isOpen) {
      activePort.close(() => { activePort = null; activeInfo = null; resolve(); });
    } else {
      activePort = null;
      activeInfo = null;
      resolve();
    }
  });
}

function serialStatus() {
  return { connected: !!activePort?.isOpen, info: activeInfo };
}

module.exports = { listSerialPorts, connectSerial, writeSerial, disconnectSerial, serialStatus };
