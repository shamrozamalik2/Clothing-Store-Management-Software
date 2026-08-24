/**
 * Opens a print window with a formal A4 invoice for a completed sale.
 * @param {object} sale   - sale record (from /sales/:id)
 * @param {object[]} items - sale_items array
 * @param {object} settings - settings blob from settingsApi.getAll
 */
export function printInvoice(sale, items = [], settings = {}) {
  const co  = settings.company  ?? {};
  const bil = settings.billing  ?? {};

  const companyName    = co.company_name?.value    || 'ProBusinessCloud';
  const companyTagline = co.company_tagline?.value || '';
  const companyPhone   = co.company_phone?.value   || '';
  const companyAddress = co.company_address?.value || '';
  const companyEmail   = co.company_email?.value   || '';
  const companyLogo    = co.company_logo?.value    || '';
  const currency       = bil.currency_symbol?.value || '₨';

  const fmt     = (v) => `${currency}${Number(Math.abs(v)).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
  const date    = new Date(sale.sale_date || sale.created_at).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const isPaid  = !sale.due_amount || Number(sale.due_amount) <= 0;

  const rows = items.map(item => `
    <tr>
      <td class="name">${item.product_name}${item.size ? ` <span class="dim">${item.size}${item.color ? ' / ' + item.color : ''}</span>` : ''}</td>
      <td class="center">${item.sku || ''}</td>
      <td class="right">${parseInt(item.quantity)}</td>
      <td class="right">${fmt(item.unit_price)}</td>
      <td class="right">${item.discount > 0 ? `−${fmt(item.discount)}` : '—'}</td>
      <td class="right bold">${fmt(item.total ?? (item.quantity * item.unit_price))}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${sale.reference}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #1e293b; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #6366f1; }
    .logo-wrap { display: flex; align-items: center; gap: 12px; }
    .logo-img  { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; }
    .company-name { font-size: 18pt; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px; }
    .company-sub  { font-size: 8pt; color: #64748b; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 20pt; font-weight: 900; color: #6366f1; letter-spacing: -1px; text-transform: uppercase; }
    .meta-row { font-size: 8.5pt; color: #475569; margin-top: 3px; }
    .meta-row strong { color: #1e293b; }

    /* Status badge */
    .status { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-top: 6px; }
    .status-paid   { background: #dcfce7; color: #15803d; }
    .status-due    { background: #fee2e2; color: #b91c1c; }
    .status-credit { background: #fef9c3; color: #a16207; }

    /* Bill to / ship to */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .party-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
    .party-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6366f1; margin-bottom: 6px; }
    .party-name   { font-size: 11pt; font-weight: 700; color: #0f172a; }
    .party-detail { font-size: 8.5pt; color: #64748b; margin-top: 3px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #1e1b4b; color: #fff; }
    thead th { padding: 8px 10px; text-align: right; font-size: 8pt; font-weight: 600; letter-spacing: .04em; }
    thead th:first-child { text-align: left; }
    thead th:nth-child(2) { text-align: center; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 7px 10px; font-size: 9pt; vertical-align: top; }
    td.name   { text-align: left; }
    td.center { text-align: center; color: #64748b; font-size: 8pt; font-family: monospace; }
    td.right  { text-align: right; }
    td.bold   { font-weight: 700; }
    .dim { color: #94a3b8; font-size: 8pt; }

    /* Totals */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { width: 240px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9.5pt; border-bottom: 1px solid #f1f5f9; }
    .total-row.grand { font-size: 13pt; font-weight: 800; padding: 8px 0 4px; border-bottom: 2px solid #6366f1; color: #1e1b4b; }
    .total-row.disc   { color: #16a34a; }
    .total-row.due    { color: #b91c1c; font-weight: 700; }
    .total-label { color: #64748b; }
    .total-row.grand .total-label { color: #1e1b4b; }

    /* Footer */
    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 8pt; color: #94a3b8; max-width: 320px; line-height: 1.5; }
    .sig-line { border-top: 1px solid #cbd5e1; width: 160px; text-align: center; padding-top: 4px; font-size: 7.5pt; color: #94a3b8; }
    .powered { font-size: 7pt; color: #c7d2fe; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-wrap">
      ${companyLogo ? `<img src="${companyLogo}" alt="logo" class="logo-img" />` : ''}
      <div>
        <div class="company-name">${companyName}</div>
        ${companyTagline ? `<div class="company-sub">${companyTagline}</div>` : ''}
        ${companyAddress ? `<div class="company-sub">${companyAddress}</div>` : ''}
        ${companyPhone   ? `<div class="company-sub">Tel: ${companyPhone}</div>` : ''}
        ${companyEmail   ? `<div class="company-sub">${companyEmail}</div>` : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="meta-row"><strong>${sale.reference}</strong></div>
      <div class="meta-row">Date: <strong>${date}</strong></div>
      <div class="meta-row">Cashier: <strong>${sale.cashier_name || 'Staff'}</strong></div>
      <div>
        <span class="status ${isPaid ? 'status-paid' : sale.payment_method === 'credit' ? 'status-credit' : 'status-due'}">
          ${isPaid ? '✓ PAID' : sale.payment_method === 'credit' ? '● CREDIT' : 'PAYMENT DUE'}
        </span>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${sale.customer_name || 'Walk-in Customer'}</div>
      ${sale.customer_phone ? `<div class="party-detail">Tel: ${sale.customer_phone}</div>` : ''}
    </div>
    <div class="party-box">
      <div class="party-label">Payment Info</div>
      <div class="party-name" style="text-transform:capitalize">${(sale.payment_method || 'cash').replace('_',' ')}</div>
      <div class="party-detail">Invoice date: ${date}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th>SKU</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Discount</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span>${fmt(sale.subtotal)}</span>
      </div>
      ${Number(sale.discount_amount) > 0 ? `
      <div class="total-row disc">
        <span class="total-label">Discount</span>
        <span>−${fmt(sale.discount_amount)}</span>
      </div>` : ''}
      ${Number(sale.tax_amount) > 0 ? `
      <div class="total-row">
        <span class="total-label">Tax</span>
        <span>${fmt(sale.tax_amount)}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span class="total-label">Grand Total</span>
        <span>${fmt(sale.total_amount)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">Amount Paid</span>
        <span>${fmt(sale.paid_amount)}</span>
      </div>
      ${Number(sale.change_amount) > 0 ? `
      <div class="total-row">
        <span class="total-label">Change</span>
        <span>${fmt(sale.change_amount)}</span>
      </div>` : ''}
      ${Number(sale.due_amount) > 0 ? `
      <div class="total-row due">
        <span class="total-label">Balance Due</span>
        <span>${fmt(sale.due_amount)}</span>
      </div>` : ''}
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">
      Thank you for your business!<br />
      This is a computer-generated invoice. No signature required for paid invoices.
    </div>
    <div class="sig-line">Authorised Signature</div>
  </div>

  <p class="powered">Powered by ProBusinessCloud · ${companyName}</p>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Please allow pop-ups to print the invoice.'); return; }
  w.document.write(html);
  w.document.close();
}
