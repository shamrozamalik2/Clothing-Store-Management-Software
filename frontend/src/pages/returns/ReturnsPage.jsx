import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SparklesIcon, ArrowPathRoundedSquareIcon, ArrowsRightLeftIcon, ArrowDownTrayIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';
import { returnsApi } from '@api/returns.api';
import { formatCurrency } from '@utils/format';

const TYPE_STYLES = {
  return:   'bg-blue-500/15 text-blue-400',
  exchange: 'bg-amber-500/15 text-amber-400',
};

export default function ReturnsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page, typeFilter],
    queryFn:  () => returnsApi.list({ page, limit: 25 }),
  });

  const returns    = data?.data?.returns    ?? [];
  const pagination = data?.data?.pagination ?? {};

  const filtered = typeFilter ? returns.filter(r => r.type === typeFilter) : returns;
  const totalReturn   = returns.filter(r => r.type === 'return').length;
  const totalExchange = returns.filter(r => r.type === 'exchange').length;
  const totalRefund   = returns.reduce((s, r) => s + Math.abs(parseFloat(r.refund_amount) || 0), 0);

  function exportCsv() {
    const cols = ['Reference','Type','Original Sale','Customer','Date','Return Value','Net Refund'];
    const rows = filtered.map(r => [r.reference, r.type, r.sale_reference, r.customer_name || 'Walk-in', r.return_date ? new Date(r.return_date).toLocaleDateString('en-PK') : '', r.total_amount, r.refund_amount]);
    const csv = '﻿' + [cols, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'returns.csv'; a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Post-Sale</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Returns & Exchanges</h1>
            <p className="text-sm text-surface-400 mt-1">{pagination.total ?? 0} records · history of all processed returns and exchanges</p>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all self-start">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-800/60 p-5">
          <ArrowPathRoundedSquareIcon className="absolute -right-3 -bottom-3 h-24 w-24 text-blue-600/[0.07] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">Returns</p>
          <p className="text-3xl font-black text-surface-100">{totalReturn}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-800/60 p-5">
          <ArrowsRightLeftIcon className="absolute -right-3 -bottom-3 h-24 w-24 text-amber-600/[0.07] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">Exchanges</p>
          <p className="text-3xl font-black text-surface-100">{totalExchange}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-800/60 p-5">
          <ReceiptRefundIcon className="absolute -right-3 -bottom-3 h-24 w-24 text-green-600/[0.07] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">Total Refunded</p>
          <p className="text-3xl font-black text-emerald-400">{formatCurrency(totalRefund)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${typeFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Types</option>
          <option value="return">Return</option>
          <option value="exchange">Exchange</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-800/80">
              {['Reference','Type','Original Sale','Customer','Date','Return Value','Net Refund'].map(h => (
                <th key={h} className={`px-4 py-3 text-${h === 'Return Value' || h === 'Net Refund' ? 'right' : 'left'}`}>
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/40">
            {isLoading
              ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-700/50 animate-pulse rounded-lg" /></td>)}</tr>)
              : filtered.length === 0
              ? <tr><td colSpan={7} className="px-4 py-12 text-center text-surface-500 text-sm">No returns recorded yet.</td></tr>
              : filtered.map(r => {
                  const hovered = hoveredId === r.id;
                  return (
                    <tr key={r.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(r.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-surface-200">{r.reference}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_STYLES[r.type] ?? ''}`}>{r.type}</span></td>
                      <td className="px-4 py-3"><Link to={`/sales/${r.sale_id}`} className="font-mono text-xs text-primary-400 hover:text-primary-300 transition-colors">{r.sale_reference}</Link></td>
                      <td className="px-4 py-3 text-surface-300">{r.customer_name || <span className="text-surface-500 italic">Walk-in</span>}</td>
                      <td className="px-4 py-3 text-surface-400 text-xs">{r.return_date ? new Date(r.return_date).toLocaleDateString('en-PK') : '—'}</td>
                      <td className="px-4 py-3 text-right text-surface-300 font-medium">{formatCurrency(r.total_amount)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${parseFloat(r.refund_amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Math.abs(parseFloat(r.refund_amount)))}</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/50 text-sm text-surface-400">
            <span className="text-xs">{pagination.total} records</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-xs border border-surface-600 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 transition-colors">← Prev</button>
              <span className="px-3 py-1.5 text-xs text-surface-500">Page {page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-xs border border-surface-600 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
