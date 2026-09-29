/**
 * Width-aware ESC/POS byte builder for thermal receipts.
 * 58mm printers: 32 columns. 80mm printers: 48 columns.
 * Not every thermal printer supports every ESC/POS command — this sticks to
 * the small, broadly-supported subset (init, align, bold, double-size,
 * cut, feed) rather than anything printer-specific.
 */

const ESC = 0x1B;
const GS  = 0x1D;
const enc = new TextEncoder();

export function charsForWidth(paperWidthMm) {
  return paperWidthMm === 58 ? 32 : 48;
}

const cmd = {
  init:        () => new Uint8Array([ESC, 0x40]),
  lf:          () => new Uint8Array([0x0A]),
  feed:        (n = 3) => new Uint8Array(Array(n).fill(0x0A)),
  cut:         () => new Uint8Array([GS, 0x56, 0x41, 0x00]),
  center:      () => new Uint8Array([ESC, 0x61, 0x01]),
  left:        () => new Uint8Array([ESC, 0x61, 0x00]),
  boldOn:      () => new Uint8Array([ESC, 0x45, 0x01]),
  boldOff:     () => new Uint8Array([ESC, 0x45, 0x00]),
  doubleSize:  () => new Uint8Array([ESC, 0x21, 0x30]),
  normalSize:  () => new Uint8Array([ESC, 0x21, 0x00]),
  text:        (s) => enc.encode(s + '\n'),
  raw:         (s) => enc.encode(s),
  divider:     (width) => enc.encode('-'.repeat(width) + '\n'),
};

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf   = new Uint8Array(total);
  let offset  = 0;
  for (const p of parts) { buf.set(p, offset); offset += p.length; }
  return buf;
}

function twoCol(label, value, width) {
  const gap = width - label.length - value.length;
  return enc.encode(gap > 0 ? `${label}${' '.repeat(gap)}${value}\n` : `${label} ${value}\n`);
}

function wrapName(name, width) {
  return name.length > width ? `${name.slice(0, width - 1)}…` : name;
}

const rs = (currencySymbol, v) => `${currencySymbol} ${Math.abs(v).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

export function buildEscPosReceipt(data) {
  const width = charsForWidth(data.paperWidthMm ?? 80);
  const parts = [cmd.init()];

  // Header
  parts.push(cmd.center(), cmd.doubleSize(), cmd.text(data.company.name), cmd.normalSize());
  if (data.company.tagline) parts.push(cmd.text(data.company.tagline));
  if (data.company.address) parts.push(cmd.text(data.company.address + (data.company.city ? `, ${data.company.city}` : '')));
  if (data.company.phone)   parts.push(cmd.text(`Tel: ${data.company.phone}`));
  parts.push(cmd.divider(width));

  // Meta
  parts.push(cmd.left());
  parts.push(cmd.text(`Receipt#: ${data.reference}`));
  parts.push(cmd.text(`Date: ${new Date(data.date).toLocaleString('en-PK')}`));
  parts.push(cmd.text(`Cashier: ${data.cashierName}`));
  if (data.customerName) parts.push(cmd.text(`Customer: ${data.customerName}`));
  parts.push(cmd.text(`Payment: ${data.paymentMethod}`));
  parts.push(cmd.divider(width));

  // Items
  for (const item of data.items) {
    parts.push(cmd.text(wrapName(item.name, width)));
    const qtyPrice = `  ${item.quantity} x ${rs(data.currencySymbol, item.unitPrice)}`;
    parts.push(twoCol(qtyPrice, rs(data.currencySymbol, item.total), width));
  }
  parts.push(cmd.divider(width));

  // Totals
  parts.push(twoCol('Subtotal', rs(data.currencySymbol, data.subtotal), width));
  if (data.discountAmount > 0) parts.push(twoCol('Discount', `-${rs(data.currencySymbol, data.discountAmount)}`, width));
  if (data.taxAmount > 0)      parts.push(twoCol('Tax', rs(data.currencySymbol, data.taxAmount), width));
  parts.push(cmd.divider(width));
  parts.push(cmd.boldOn(), twoCol('TOTAL', rs(data.currencySymbol, data.totalAmount), width), cmd.boldOff());
  parts.push(twoCol('Paid', rs(data.currencySymbol, data.paidAmount), width));
  if (data.changeAmount > 0) parts.push(twoCol('Change', rs(data.currencySymbol, data.changeAmount), width));
  if (data.dueAmount > 0)    parts.push(cmd.boldOn(), twoCol('Due', rs(data.currencySymbol, data.dueAmount), width), cmd.boldOff());

  // Footer
  parts.push(cmd.center());
  if (data.footer) parts.push(cmd.text(data.footer));
  parts.push(cmd.text('Powered by ProBusinessCloud'));
  parts.push(cmd.feed(4), cmd.cut());

  return concat(...parts);
}

export function buildTestEscPos({ printerName, connType, paperWidthMm }) {
  const width = charsForWidth(paperWidthMm ?? 80);
  const now = new Date();
  return concat(
    cmd.init(),
    cmd.center(),
    cmd.divider(width),
    cmd.doubleSize(), cmd.text('ProBusinessCloud'), cmd.normalSize(),
    cmd.text('PBC POS — TEST PRINT'),
    cmd.divider(width),
    cmd.left(),
    cmd.text(`Printer: ${printerName || 'Unknown'}`),
    cmd.text(`Connection: ${connType || 'Unknown'}`),
    cmd.text(`Paper: ${paperWidthMm ?? 80}mm`),
    cmd.text(`Date: ${now.toLocaleDateString('en-PK')}`),
    cmd.text(`Time: ${now.toLocaleTimeString('en-PK')}`),
    cmd.divider(width),
    cmd.center(),
    cmd.text('If you can read this,'),
    cmd.text('your printer is configured.'),
    cmd.feed(4),
    cmd.cut(),
  );
}
