import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon, EyeIcon, BanknotesIcon, CreditCardIcon,
  ArrowsRightLeftIcon, ShoppingCartIcon, CurrencyDollarIcon,
  CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import Badge from '@components/common/Badge';
import EmptyState from '@components/common/EmptyState';
import { salesApi } from '@api/sales.api';
import { formatCurrency, formatDate } from '@utils/format';
import { usePermission } from '@hooks/usePermission';

const STATUS_VARIANTS = { completed: 'success', cancelled: 'danger', refunded: 'warning', exchanged: 'info' };
const METHOD_ICONS = {
  cash:   <BanknotesIcon className="h-3.5 w-3.5" />,
  card:   <CreditCardIcon className="h-3.5 w-3.5" />,
  split:  <ArrowsRightLeftIcon className="h-3.5 w-3.5" />,
  credit: <span className="text-[10px] font-bold">CR</span>,
};

function KpiCard({ label, value, Icon, accent, highlight }) {
  const valColor = highlight === 'green' ? 'text-emerald-400' : highlight === 'amber' ? 'text-amber-400' : highlight === 'red' ? 'text-red-400' : 'text-surface-100';
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-800/60 p-5">
      <Icon className="absolute -right-3 -bottom-3 h-24 w-24 text-surface-600/[0.07] pointer-events-none" />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${valColor}`}>{value}</p>
    </div>
  );
}

export default function SalesPage() {
  const { can } = usePermission();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { search, page, status, payment_method: method }],
    queryFn:  () => salesApi.list({ search, page, limit: 25, status: status || undefined, payment_method: method || undefined }),
    placeholderData: keepPreviousData,
  });

  const sales      = data?.data ?? [];
  const pagination = data?.pagination;
  const summary    = data?.summary;

  function exportCsv() {
    const cols = ['Reference','Customer','Method','Total','Discount','Paid','Due','Status','Date'];
    const rows = sales.map(s => [s.reference, s.customer_name ?? 'Walk-in', s.payment_method, s.total_amount, s.discount_amount, s.paid_amount, s.due_amount, s.status, formatDate(s.sale_date || s.created_at)]);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'sales.csv'; a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Transactions</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Sales History</h1>
            <p className="text-sm text-surface-400 mt-1">{pagination?.total ?? 0} transaction{(pagination?.total ?? 0) !== 1 ? 's' : ''} · all completed and cancelled sales</p>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all self-start">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Transactions" value={summary.sale_count ?? 0} Icon={ShoppingCartIcon} />
          <KpiCard label="Revenue" value={formatCurrency(summary.total_revenue ?? 0)} Icon={CurrencyDollarIcon} highlight="green" />
          <KpiCard label="Collected" value={formatCurrency(summary.total_paid ?? 0)} Icon={CheckCircleIcon} highlight="green" />
          <KpiCard label="Outstanding" value={formatCurrency(summary.total_due ?? 0)} Icon={ExclamationTriangleIcon} highlight={(summary.total_due ?? 0) > 0 ? 'amber' : 'green'} />
        </div>
      )}

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Reference, customer…" className="w-64" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${status ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${method ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="split">Split</option>
          <option value="credit">Credit</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{pagination?.total ?? 0} sale{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? <TableSkeleton /> : sales.length === 0 ? (
          <EmptyState icon={<ShoppingBagIcon className="h-10 w-10" />} title="No sales found" description={search ? 'Try a different search.' : 'Sales will appear here after a transaction at the POS.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="text-left px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Reference</span></th>
                <th className="text-left px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Customer</span></th>
                <th className="text-center px-4 py-3 hidden sm:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Method</span></th>
                <th className="text-right px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Total</span></th>
                <th className="text-right px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Discount</span></th>
                <th className="text-right px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Paid</span></th>
                <th className="text-right px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Due</span></th>
                <th className="text-center px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span></th>
                <th className="text-right px-4 py-3 hidden xl:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Date</span></th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {sales.map(sale => {
                const hovered = hoveredId === sale.id;
                return (
                  <tr key={sale.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(sale.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-surface-200">{sale.reference}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-surface-300">{sale.customer_name ?? <span className="text-surface-500 italic">Walk-in</span>}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs text-surface-400 capitalize">{METHOD_ICONS[sale.payment_method]}{sale.payment_method}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-100">{formatCurrency(sale.total_amount)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">{sale.discount_amount > 0 ? <span className="text-amber-400">{formatCurrency(sale.discount_amount)}</span> : <span className="text-surface-600">—</span>}</td>
                    <td className="px-4 py-3 text-right text-surface-300 hidden lg:table-cell">{formatCurrency(sale.paid_amount)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">{sale.due_amount > 0 ? <span className="text-red-400 font-semibold">{formatCurrency(sale.due_amount)}</span> : <span className="text-surface-600">—</span>}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={STATUS_VARIANTS[sale.status] ?? 'neutral'} dot>{sale.status}</Badge></td>
                    <td className="px-4 py-3 text-right text-surface-500 text-xs hidden xl:table-cell">{formatDate(sale.sale_date || sale.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {can('sales', 'view') && (
                        <Link to={`/sales/${sale.id}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors">
                          <EyeIcon className="h-3.5 w-3.5" /> View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

function TableSkeleton() {
  return <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-700/40 animate-pulse" />)}</div>;
}
