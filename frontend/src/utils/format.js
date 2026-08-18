/**
 * Format a number as currency using app settings.
 * Defaults to PKR/₨ — will be driven by settings store in a future phase.
 */
export function formatCurrency(amount, symbol = '₨') {
  if (amount === null || amount === undefined) return `${symbol} —`;
  const n = Number(amount);
  const decimals = n % 1 === 0 ? 0 : 2;
  return `${symbol} ${n.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
}

export function formatNumber(n, decimals = 0) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const opts = includeTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-PK', opts);
}
