import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, ShoppingCartIcon, SparklesIcon, ArrowDownTrayIcon, TruckIcon, CheckCircleIcon, ClockIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';

import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { suppliersApi } from '@api/suppliers.api';
import { purchasesApi } from '@api/purchases.api';
import { formatCurrency } from '@utils/format';

const STATUS_VARIANTS = { received: 'success', ordered: 'info', returned: 'warning', cancelled: 'neutral' };

function KpiCard({ label, value, Icon, color, active, onClick }) {
  const palettes = { blue: ['from-blue-600/20 to-blue-800/10','border-blue-500/60','text-blue-400','text-blue-600/[0.07]'], green: ['from-green-600/20 to-green-800/10','border-green-500/60','text-green-400','text-green-600/[0.07]'], amber: ['from-amber-600/20 to-amber-800/10','border-amber-500/60','text-amber-400','text-amber-600/[0.07]'], red: ['from-red-600/20 to-red-800/10','border-red-500/60','text-red-400','text-red-600/[0.07]'] };
  const [bg, border, text, iconCls] = palettes[color] || palettes.blue;
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 text-left w-full ${active ? `bg-gradient-to-br ${bg} ${border} shadow-lg` : 'border-surface-700/50 bg-surface-800/60 hover:border-surface-600'} ${onClick ? 'cursor-pointer' : ''}`}>
      <Icon className={`absolute -right-3 -bottom-3 h-24 w-24 pointer-events-none ${active ? iconCls : 'text-surface-600/[0.07]'}`} />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${active ? text : 'text-surface-100'}`}>{value ?? '—'}</p>
      {active && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${text} bg-current/10`}><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Filter ON</span>}
    </button>
  );
}

export default function PurchasesPage() {
  const { can } = usePermission();
  const navigate = useNavigate();

  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [supplierFilter, setSupplier] = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [hoveredId, setHoveredId]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { search, page, supplier: supplierFilter, status: statusFilter }],
    queryFn:  () => purchasesApi.list({ search, page, limit: 20, supplier: supplierFilter, status: statusFilter }),
    placeholderData: keepPreviousData,
  });
  const { data: suppData } = useQuery({ queryKey: ['suppliers-flat'], queryFn: suppliersApi.flat });

  const purchases  = data?.data ?? [];
  const pagination = data?.pagination;
  const suppliers  = suppData?.data ?? [];
  const total      = pagination?.total ?? 0;

  function exportCsv() {
    const cols = ['Reference','Supplier','Date','Total','Due','Status'];
    const rows = purchases.map(p => [p.reference, p.supplier_name ?? '', new Date(p.purchase_date).toLocaleDateString('en-PK'), p.total_amount, p.due_amount, p.status]);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'purchases.csv'; a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Procurement</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Purchases</h1>
            <p className="text-sm text-surface-400 mt-1">{total} {total === 1 ? 'purchase' : 'purchases'} · track inventory and supplier payments</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
            {can('purchases', 'create') && <button onClick={() => navigate('/purchases/new')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"><PlusIcon className="h-4 w-4" /> New Purchase</button>}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" value={total} Icon={ShoppingCartIcon} color="blue" active={statusFilter === ''} onClick={() => { setStatus(''); setPage(1); }} />
        <KpiCard label="Received" value={null} Icon={CheckCircleIcon} color="green" active={statusFilter === 'received'} onClick={() => { setStatus(statusFilter === 'received' ? '' : 'received'); setPage(1); }} />
        <KpiCard label="Ordered" value={null} Icon={ClockIcon} color="amber" active={statusFilter === 'ordered'} onClick={() => { setStatus(statusFilter === 'ordered' ? '' : 'ordered'); setPage(1); }} />
        <KpiCard label="Returned" value={null} Icon={ReceiptRefundIcon} color="red" active={statusFilter === 'returned'} onClick={() => { setStatus(statusFilter === 'returned' ? '' : 'returned'); setPage(1); }} />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Reference or supplier…" className="w-64" />
        <select value={supplierFilter} onChange={e => { setSupplier(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${supplierFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${statusFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Statuses</option>
          <option value="received">Received</option>
          <option value="ordered">Ordered</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? <TableSkeleton /> : purchases.length === 0 ? (
          <EmptyState icon={<ShoppingCartIcon className="h-10 w-10" />} title="No purchases found" description="Record your first purchase to start tracking inventory." action={can('purchases', 'create') ? { label: 'New Purchase', onClick: () => navigate('/purchases/new') } : null} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="text-left px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Reference</span></th>
                <th className="text-left px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Supplier</span></th>
                <th className="text-left px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Date</span></th>
                <th className="text-right px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Total</span></th>
                <th className="text-right px-4 py-3 hidden sm:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Due</span></th>
                <th className="text-center px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span></th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {purchases.map(p => {
                const hovered = hoveredId === p.id;
                return (
                  <tr key={p.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(p.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                    <td className="px-4 py-3"><p className="font-mono text-sm font-semibold text-surface-100">{p.reference}</p>{p.created_by_name && <p className="text-xs text-surface-500">{p.created_by_name}</p>}</td>
                    <td className="px-4 py-3 text-surface-300 hidden md:table-cell">
                      <div className="flex items-center gap-2"><TruckIcon className="h-3.5 w-3.5 text-surface-500 shrink-0" />{p.supplier_name ?? <span className="text-surface-500 italic">Unknown</span>}</div>
                    </td>
                    <td className="px-4 py-3 text-surface-400 hidden lg:table-cell text-xs">{new Date(p.purchase_date).toLocaleDateString('en-PK')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-surface-100">{formatCurrency(p.total_amount)}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell"><span className={p.due_amount > 0 ? 'text-red-400 font-semibold' : 'text-surface-500'}>{formatCurrency(p.due_amount)}</span></td>
                    <td className="px-4 py-3 text-center"><Badge variant={STATUS_VARIANTS[p.status] ?? 'neutral'}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => navigate(`/purchases/${p.id}`)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors" title="View"><EyeIcon className="h-4 w-4" /></button></td>
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
  return <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-700/40 animate-pulse" />)}</div>;
}
