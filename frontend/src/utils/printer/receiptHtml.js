/**
 * Width-aware HTML receipt for the browser print dialog (System Printer /
 * "browser" PrinterManager mode). Same receipt-data shape as the ESC/POS
 * builder — content and layout adapt to 58mm / 80mm / A4.
 */

// mm page width -> printable content width (leaves ~3mm margin each side)
function contentWidthMm(paperWidthMm) {
  if (paperWidthMm === 58) return 52;
  if (paperWidthMm === 80) return 74;
  return 180; // A4 fallback
}

function baseCss(paperWidthMm) {
  const pageSize = paperWidthMm ? `${paperWidthMm}mm auto` : 'A4';
  const bodyWidth = contentWidthMm(paperWidthMm);
  const small = paperWidthMm === 58;

  return `
    @page { size: ${pageSize}; margin: ${paperWidthMm ? '4mm 3mm' : '14mm'}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${small ? '10px' : '11.5px'};
      color: #000;
      background: #fff;
      width: ${bodyWidth}mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2px;
    }
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }
    .store-logo { width: ${small ? 42 : 56}px; height: ${small ? 42 : 56}px; border-radius: 50%; object-fit: cover; margin-bottom: 6px; border: 2px solid #e5e7eb; }
    .store-name { font-size: ${small ? '13px' : '17px'}; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
    .store-tag { font-size: ${small ? '8.5px' : '10px'}; margin-top: 2px; color: #444; }
    .dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .solid  { border: none; border-top: 1px solid  #000; margin: 5px 0; }
    .meta-table { width: 100%; }
    .meta-table td { padding: 1.5px 0; font-size: ${small ? '9px' : '11px'}; }
    .meta-table td:last-child { text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .items-table thead tr th { font-size: ${small ? '8px' : '10px'}; text-transform: uppercase; letter-spacing: .5px; padding: 3px 0; border-bottom: 1px dashed #000; }
    .items-table thead th:first-child { text-align: left; }
    .items-table thead th:nth-child(2) { text-align: center; }
    .items-table thead th:nth-child(3), .items-table thead th:nth-child(4) { text-align: right; }
    .items-table tbody td { padding: 4px 0; vertical-align: top; font-size: ${small ? '9.5px' : '11.5px'}; }
    .item-name { max-width: ${small ? 22 : 34}mm; }
    .variant   { font-size: ${small ? '8px' : '9.5px'}; color: #555; margin-top: 1px; }
    .sku       { font-size: ${small ? '7.5px' : '9px'};   color: #888; font-style: italic; }
    .totals { width: 100%; }
    .totals td { padding: 2px 0; font-size: ${small ? '9.5px' : '11.5px'}; }
    .totals td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .totals .grand td { font-size: ${small ? '12px' : '14px'}; font-weight: bold; padding: 5px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .totals .due td { color: #c00; font-weight: bold; }
    .footer { text-align: center; margin-top: 8px; font-size: ${small ? '9px' : '10px'}; color: #444; line-height: 1.6; }
    .footer .powered { font-size: 8px; color: #aaa; margin-top: 4px; }
  `;
}

export function buildReceiptHtml(data) {
  const num = (v) => Math.abs(v).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  const rs  = (v) => `${data.currencySymbol}${num(v)}`;

  const itemRows = data.items.map((item) => `
    <tr>
      <td class="item-name">
        ${item.name}
        ${item.variant ? `<div class="variant">${item.variant}</div>` : ''}
        ${item.sku ? `<div class="sku">${item.sku}</div>` : ''}
      </td>
      <td class="center">${item.quantity}</td>
      <td class="right">${num(item.unitPrice)}</td>
      <td class="right">${num(item.total)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt — ${data.reference}</title>
  <style>${baseCss(data.paperWidthMm)}</style>
</head>
<body>
  <div class="center">
    ${data.company.logo ? `<div><img class="store-logo" src="${data.company.logo}" alt="${data.company.name}" /></div>` : ''}
    <div class="store-name">${data.company.name}</div>
    ${data.company.tagline ? `<div class="store-tag">${data.company.tagline}</div>` : ''}
    ${data.company.address ? `<div class="store-tag">${data.company.address}${data.company.city ? ', ' + data.company.city : ''}</div>` : ''}
    ${data.company.phone   ? `<div class="store-tag">Tel: ${data.company.phone}</div>` : ''}
    ${data.company.email   ? `<div class="store-tag">${data.company.email}</div>` : ''}
    ${data.header ? `<div class="store-tag" style="margin-top:4px;font-style:italic">${data.header}</div>` : ''}
  </div>

  <hr class="dashed" style="margin-top:7px">

  <table class="meta-table">
    <tr><td>Receipt#</td><td class="bold">${data.reference}</td></tr>
    <tr><td>Date</td><td>${new Date(data.date).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
    <tr><td>Cashier</td><td>${data.cashierName}</td></tr>
    ${data.customerName ? `<tr><td>Customer</td><td>${data.customerName}</td></tr>` : ''}
    ${data.customerPhone ? `<tr><td>Phone</td><td>${data.customerPhone}</td></tr>` : ''}
    <tr><td>Payment</td><td style="text-transform:capitalize">${data.paymentMethod}</td></tr>
  </table>

  <hr class="dashed">

  <table class="items-table">
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr class="dashed">

  <table class="totals">
    <tr><td>Subtotal</td><td>${rs(data.subtotal)}</td></tr>
    ${data.discountAmount > 0 ? `<tr><td>Discount</td><td>- ${rs(data.discountAmount)}</td></tr>` : ''}
    ${data.taxAmount > 0 ? `<tr><td>Tax</td><td>${rs(data.taxAmount)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL</td><td>${rs(data.totalAmount)}</td></tr>
    <tr><td>Paid</td><td>${rs(data.paidAmount)}</td></tr>
    ${data.changeAmount > 0 ? `<tr><td>Change</td><td>${rs(data.changeAmount)}</td></tr>` : ''}
    ${data.dueAmount > 0 ? `<tr class="due"><td>Due</td><td>${rs(data.dueAmount)}</td></tr>` : ''}
  </table>

  <hr class="solid" style="margin-top:8px">

  <div class="footer">
    <div>★ ${data.footer} ★</div>
    <div>Please visit again</div>
    <div class="powered">Powered by ProBusinessCloud</div>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 500);
    };
  </script>
</body>
</html>`;
}

export function buildTestReceiptHtml({ printerName, connType, paperWidthMm }) {
  const now = new Date();
  return `<!DOCTYPE html><html><head><title>Test Print</title>
  <style>${baseCss(paperWidthMm)}</style></head><body>
  <div class="center">
    <hr class="dashed"/>
    <div class="store-name">ProBusinessCloud</div>
    <div class="store-tag">PBC POS — TEST PRINT</div>
    <hr class="dashed"/>
    <table class="meta-table">
      <tr><td>Printer</td><td>${printerName || 'Unknown'}</td></tr>
      <tr><td>Connection</td><td>${connType || 'Unknown'}</td></tr>
      <tr><td>Paper</td><td>${paperWidthMm ?? 'A4'}${paperWidthMm ? 'mm' : ''}</td></tr>
      <tr><td>Date</td><td>${now.toLocaleDateString('en-PK')}</td></tr>
      <tr><td>Time</td><td>${now.toLocaleTimeString('en-PK')}</td></tr>
    </table>
    <hr class="dashed"/>
    <div class="footer">
      <div>If you can read this,</div>
      <div>your printer is configured.</div>
    </div>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 500);
    };
  </script>
  </body></html>`;
}
