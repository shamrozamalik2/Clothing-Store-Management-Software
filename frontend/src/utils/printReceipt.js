import { buildReceiptData } from './printer/receiptData';
import { printerManager } from './printer/printerManager';

/**
 * Prints a sale receipt through whichever printer transport is currently
 * selected (system print dialog, Web Bluetooth, or the Electron native
 * bridge once available) — see utils/printer/printerManager.js.
 *
 * Kept as a standalone function (rather than inlining printerManager calls
 * at each call site) so existing callers don't need to change.
 *
 * @param {object} sale    - sale record with customer/cashier info
 * @param {array}  items   - sale_items array
 * @param {object} settings - raw settings response data (data.company / data.receipt)
 */
export async function printReceipt(sale, items, settings) {
  const data = buildReceiptData(sale, items, settings);
  await printerManager.printReceipt(data);
}
