/**
 * Opens a clean receipt in a new print window.
 * Works with any printer — 80mm thermal or A4.
 * The browser's print dialog lets the user pick paper size.
 * @param {object} sale    - sale record with customer/cashier info
 * @param {array}  items   - sale_items array
 * @param {object} settings - raw settings response data (data.company / data.receipt)
 */
export function printReceipt(sale, items, settings) {
  const co = settings?.company  ?? {};
  const rc = settings?.receipt  ?? {};

  const companyName    = co.company_name?.value    || 'Online Store';
  const companyTagline = co.company_tagline?.value || '';
  const companyAddress = co.company_address?.value || '';
  const companyCity    = co.company_city?.value    || '';
  const companyPhone   = co.company_phone?.value   || '';
  const companyEmail   = co.company_email?.value   || '';
  const receiptHeader  = rc.receipt_header?.value  || '';
  const receiptFooter  = rc.receipt_footer?.value  || 'Thank you for shopping!';
  const currencySymbol = settings?.billing?.currency_symbol?.value || 'Rs';
  const num = (v) =>
    parseFloat(v || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const rs = (v) => `${currencySymbol} ${num(v)}`;

  const fmtDate = (d) =>
    new Date(d).toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const itemRows = (items ?? []).map((item) => {
    const variantLabel = [item.size, item.color].filter(Boolean).join(' · ');
    const total = parseFloat(item.total ?? item.subtotal ?? 0);
    return `
      <tr>
        <td class="item-name">
          ${item.product_name}
          ${variantLabel ? `<div class="variant">${variantLabel}</div>` : ''}
          ${item.sku ? `<div class="sku">${item.sku}</div>` : ''}
        </td>
        <td class="center">${parseInt(item.quantity, 10)}</td>
        <td class="right">${num(item.unit_price)}</td>
        <td class="right">${num(total)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt — ${sale.reference}</title>
  <style>
    @page {
      /* 80mm thermal: change to 'A4' in browser print dialog for A4 paper */
      size: 80mm auto;
      margin: 4mm 3mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #000;
      background: #fff;
      width: 74mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2px;
    }

    /* ── layout helpers ── */
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }

    /* ── store header ── */
    .store-name {
      font-size: 17px;
      font-weight: bold;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .store-tag { font-size: 10px; margin-top: 2px; color: #444; }

    /* ── dividers ── */
    .dashed { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .solid  { border: none; border-top: 1px solid  #000; margin: 5px 0; }

    /* ── meta table ── */
    .meta-table { width: 100%; }
    .meta-table td { padding: 1.5px 0; font-size: 11px; }
    .meta-table td:last-child { text-align: right; }

    /* ── items table ── */
    .items-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .items-table thead tr th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 3px 0;
      border-bottom: 1px dashed #000;
    }
    .items-table thead th:first-child { text-align: left; }
    .items-table thead th:nth-child(2) { text-align: center; }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4) { text-align: right; }

    .items-table tbody td { padding: 4px 0; vertical-align: top; font-size: 11.5px; }
    .item-name { max-width: 34mm; }
    .variant   { font-size: 9.5px; color: #555; margin-top: 1px; }
    .sku       { font-size: 9px;   color: #888; font-style: italic; }

    /* ── totals ── */
    .totals { width: 100%; }
    .totals td { padding: 2px 0; font-size: 11.5px; }
    .totals td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .totals .grand td {
      font-size: 14px;
      font-weight: bold;
      padding: 5px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .totals .due td { color: #c00; font-weight: bold; }

    /* ── footer ── */
    .footer { text-align: center; margin-top: 8px; font-size: 10px; color: #444; line-height: 1.6; }
    .footer .powered { font-size: 8.5px; color: #aaa; margin-top: 4px; }
  </style>
</head>
<body>

  <!-- store header -->
  <div class="center">
    <div class="store-name">${companyName}</div>
    ${companyTagline ? `<div class="store-tag">${companyTagline}</div>` : ''}
    ${companyAddress ? `<div class="store-tag">${companyAddress}${companyCity ? ', ' + companyCity : ''}</div>` : ''}
    ${companyPhone   ? `<div class="store-tag">Tel: ${companyPhone}</div>` : ''}
    ${companyEmail   ? `<div class="store-tag">${companyEmail}</div>` : ''}
    ${receiptHeader  ? `<div class="store-tag" style="margin-top:4px;font-style:italic">${receiptHeader}</div>` : ''}
  </div>

  <hr class="dashed" style="margin-top:7px">

  <!-- sale meta -->
  <table class="meta-table">
    <tr><td>Receipt#</td><td class="bold">${sale.reference}</td></tr>
    <tr><td>Date</td><td>${fmtDate(sale.sale_date || sale.created_at)}</td></tr>
    <tr><td>Cashier</td><td>${sale.cashier_name ?? 'Staff'}</td></tr>
    ${sale.customer_name ? `<tr><td>Customer</td><td>${sale.customer_name}</td></tr>` : ''}
    ${sale.customer_phone ? `<tr><td>Phone</td><td>${sale.customer_phone}</td></tr>` : ''}
    <tr><td>Payment</td><td style="text-transform:capitalize">${(sale.payment_method ?? 'cash').replace('_', ' ')}</td></tr>
  </table>

  <hr class="dashed">

  <!-- items -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="dashed">

  <!-- totals -->
  <table class="totals">
    <tr><td>Subtotal</td><td>${rs(sale.subtotal)}</td></tr>
    ${parseFloat(sale.discount_amount) > 0
      ? `<tr><td>Discount</td><td>- ${rs(sale.discount_amount)}</td></tr>` : ''}
    ${parseFloat(sale.tax_amount) > 0
      ? `<tr><td>Tax</td><td>${rs(sale.tax_amount)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL</td><td>${rs(sale.total_amount)}</td></tr>
    <tr><td>Paid</td><td>${rs(sale.paid_amount)}</td></tr>
    ${parseFloat(sale.change_amount) > 0
      ? `<tr><td>Change</td><td>${rs(sale.change_amount)}</td></tr>` : ''}
    ${parseFloat(sale.due_amount) > 0
      ? `<tr class="due"><td>Due</td><td>${rs(sale.due_amount)}</td></tr>` : ''}
  </table>

  <hr class="solid" style="margin-top:8px">

  <!-- footer -->
  <div class="footer">
    <div>★ ${receiptFooter} ★</div>
    <div>Please visit again</div>
    <div class="powered">Powered by Garments POS</div>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
      // Close only if it was opened by script (not a tab the user navigated to)
      setTimeout(function () { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=340,height=620,scrollbars=yes,resizable=yes');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
