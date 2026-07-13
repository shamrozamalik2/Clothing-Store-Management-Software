/**
 * Generate a SKU suggestion from a product name.
 * "Cotton T-Shirt Men" → "CTN-TSH-MEN-0001"
 */
export function generateSku(name = '') {
  const words = name.toUpperCase().trim().split(/\s+/);
  const abbr  = words.slice(0, 3).map(w => w.replace(/[^A-Z0-9]/g, '').slice(0, 3)).join('-');
  const num   = String(Date.now()).slice(-4);
  return abbr ? `${abbr}-${num}` : '';
}
