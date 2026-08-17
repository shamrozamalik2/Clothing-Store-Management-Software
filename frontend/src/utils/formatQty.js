export function formatQty(val) {
  if (val === null || val === undefined || val === '') return '0';
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (n % 1 === 0) return n.toFixed(0);
  return parseFloat(n.toFixed(4)).toString();
}
