/**
 * Normalizes a sale + settings blob into one consistent receipt data shape,
 * used by both the HTML/browser-print renderer and the ESC/POS byte builder.
 *
 * This is the single "receipt rules" definition for the web/desktop app —
 * both rendering paths must derive from this, so a receipt looks the same
 * (same fields, same order, same totals logic) no matter which printer
 * transport ends up drawing it.
 */

/** @returns {58|80|null} null means "not a thermal width" (A4 / unset). */
export function resolvePaperWidthMm(settings) {
  const raw = settings?.receipt?.receipt_paper_size?.value ?? '80mm';
  if (raw === '58mm') return 58;
  if (raw === '80mm') return 80;
  return null; // 'A4' or anything else — not a thermal paper width
}

export function buildReceiptData(sale, items, settings) {
  const co  = settings?.company  ?? {};
  const rc  = settings?.receipt  ?? {};
  const bil = settings?.billing  ?? {};

  const paperWidthMm = resolvePaperWidthMm(settings);

  return {
    paperWidthMm, // 58 | 80 | null

    company: {
      name:    co.company_name?.value    || 'ProBusinessCloud',
      tagline: co.company_tagline?.value || '',
      address: co.company_address?.value || '',
      city:    co.company_city?.value    || '',
      phone:   co.company_phone?.value   || '',
      email:   co.company_email?.value   || '',
      logo:    co.company_logo?.value    || '',
    },

    header: rc.receipt_header?.value || '',
    footer: rc.receipt_footer?.value || 'Thank you for shopping!',
    currencySymbol: bil.currency_symbol?.value || 'Rs',

    reference:     sale.reference,
    date:          sale.sale_date || sale.created_at,
    cashierName:   sale.cashier_name ?? 'Staff',
    customerName:  sale.customer_name || null,
    customerPhone: sale.customer_phone || null,
    paymentMethod: (sale.payment_method ?? 'cash').replace('_', ' '),

    items: (items ?? []).map((item) => ({
      name:     item.product_name,
      variant:  [item.size, item.color].filter(Boolean).join(' · ') || null,
      sku:      item.sku || null,
      quantity: parseInt(item.quantity, 10) || 0,
      unitPrice: parseFloat(item.unit_price) || 0,
      discount:  parseFloat(item.discount) || 0,
      total:     parseFloat(item.total ?? item.subtotal ?? 0),
    })),

    subtotal:      parseFloat(sale.subtotal) || 0,
    discountAmount: parseFloat(sale.discount_amount) || 0,
    taxAmount:      parseFloat(sale.tax_amount) || 0,
    totalAmount:    parseFloat(sale.total_amount) || 0,
    paidAmount:     parseFloat(sale.paid_amount) || 0,
    changeAmount:   parseFloat(sale.change_amount) || 0,
    dueAmount:      parseFloat(sale.due_amount) || 0,
  };
}

export function buildTestReceiptData({ printerName, connType, paperWidthMm }) {
  const now = new Date();
  return {
    printerName: printerName || 'Unknown',
    connType:    connType || 'System',
    paperWidthMm: paperWidthMm ?? 80,
    date: now.toLocaleDateString('en-PK'),
    time: now.toLocaleTimeString('en-PK'),
  };
}
