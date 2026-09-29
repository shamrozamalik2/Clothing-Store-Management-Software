'use strict';

/**
 * Unified native printer bridge for the Electron main process.
 *   type: 'usb'    -> Windows print-queue (spooler) raw bytes — windowsPrinters.js
 *   type: 'serial' -> COM port (Bluetooth Classic paired printer) — serialPrinter.js
 */

const { listWindowsPrinters, sendRawBytes } = require('./windowsPrinters');
const {
  listSerialPorts, connectSerial, writeSerial, disconnectSerial,
} = require('./serialPrinter');

let current = null; // { type: 'usb'|'serial', id, name } | null

async function list() {
  const [usb, serial] = await Promise.all([listWindowsPrinters(), listSerialPorts()]);
  return { usb, serial };
}

async function connect(target) {
  if (!target?.type) return { success: false, error: 'No printer type specified.' };
  try {
    if (target.type === 'usb') {
      current = { type: 'usb', id: target.id, name: target.name || target.id };
      return { success: true, name: current.name };
    }
    if (target.type === 'serial') {
      const info = await connectSerial(target);
      current = { type: 'serial', id: info.id, name: info.name };
      return { success: true, name: current.name };
    }
    return { success: false, error: `Unknown printer type "${target.type}".` };
  } catch (err) {
    current = null;
    return { success: false, error: err.message };
  }
}

async function write(bytesArray) {
  try {
    if (!current) throw new Error('No printer connected.');
    if (current.type === 'usb') {
      await sendRawBytes(current.id, bytesArray);
    } else if (current.type === 'serial') {
      await writeSerial(bytesArray);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function disconnect() {
  if (current?.type === 'serial') await disconnectSerial();
  current = null;
  return { success: true };
}

function status() {
  return { connected: !!current, target: current };
}

module.exports = { list, connect, write, disconnect, status };
