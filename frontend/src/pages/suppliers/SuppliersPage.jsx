import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, TruckIcon, ArrowUpTrayIcon,
  SparklesIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ImportCsvModal from '@components/common/ImportCsvModal';
import { usePermission } from '@hooks/usePermission';
import { suppliersApi } from '@api/suppliers.api';
import { formatCurrency } from '@utils/format';
import SupplierFormModal from './components/SupplierFormModal';

function SortTh({ label, field, sort, onSort, align = 'left', className = '' }) {
  const active = sort.field === field;
  const Icon = active ? (sort.dir === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
  return (
    <th onClick={() => onSort(field)} className={`px-4 py-3 cursor-pointer select-none text-${align} ${className}`}>
      <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors ${active ? 'text-primary-400' : 'text-surface-400 hover:text-surface-200'}`}>
        {label}<Icon className="h-3.5 w-3.5 shrink-0" />
      </span>
    </th>
  );
}

function KpiCard({ label, value, Icon, color, active, onClick }) {
  const palettes = {
    blue:   ['from-blue-600/20 to-blue-800/10',   'border-blue-500/60',   'text-blue-400',   'text-blue-600/[0.07]'],
    green:  ['from-green-600/20 to-green-800/10', 'border-green-500/60', 'text-green-400',  'text-green-600/[0.07]'],
    amber:  ['from-amber-600/20 to-amber-800/10', 'border-amber-500/60', 'text-amber-400',  'text-amber-600/[0.07]'],
    red:    ['from-red-600/20 to-red-800/10',     'border-red-500/60',   'text-red-400',    'text-red-600/[0.07]'],
  };
  const [bg, border, text, iconCls] = palettes[color] || palettes.blue;
  return (
    <button type="button" onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 text-left w-full ${active ? `bg-gradient-to-br ${bg} ${border} shadow-lg` : 'border-surface-700/50 bg-surface-800/60 hover:border-surface-600'} ${onClick ? 'cursor-pointer' : ''}`}>
      <Icon className={`absolute -right-3 -bottom-3 h-24 w-24 pointer-events-none ${active ? iconCls : 'text-surface-600/[0.07]'}`} />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${active ? text : 'text-surface-100'}`}>{value ?? '—'}</p>
      {active && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${text} bg-current/10`}><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Filter ON</span>}
    </button>
  );
}

export default function SuppliersPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [statusFilter, setSt] = useState('all');
  const [sort, setSort]       = useState({ field: 'name', dir: 'asc' });
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [importing, setImporting]     = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [hoveredId, setHoveredId]     = useState(null);

  function handleSort(f) { setSort(s => s.field === f ? { field: f, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field: f, dir: 'asc' }); }

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, page }],
    queryFn:  () => suppliersApi.list({ search, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const allSuppliers = data?.data ?? [];
  const pagination   = data?.pagination;

  const suppliers = useMemo(() => {
    let list = [...allSuppliers];
    if (statusFilter === 'active')   list = list.filter(s => s.is_active);
    if (statusFilter === 'inactive') list = list.filter(s => !s.is_active);
    if (statusFilter === 'owing')    list = list.filter(s => parseFloat(s.current_balance) > 0);
    list.sort((a, b) => {
      const av = sort.field === 'name' ? (a.name ?? '') : sort.field === 'balance' ? (parseFloat(a.current_balance) || 0) : sort.field === 'purchases' ? (a.purchase_count ?? 0) : (a.name ?? '');
      const bv = sort.field === 'name' ? (b.name ?? '') : sort.field === 'balance' ? (parseFloat(b.current_balance) || 0) : sort.field === 'purchases' ? (b.purchase_count ?? 0) : (b.name ?? '');
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [allSuppliers, statusFilter, sort]);

  const total    = pagination?.total ?? 0;
  const active   = allSuppliers.filter(s => s.is_active).length;
  const inactive = allSuppliers.filter(s => !s.is_active).length;
  const owing    = allSuppliers.filter(s => parseFloat(s.current_balance) > 0).length;

  function exportCsv() {
    const cols = ['Name','Company','Phone','Email','City','Balance','Status'];
    const rows = suppliers.map(s => [s.name, s.company ?? '', s.phone ?? '', s.email ?? '', s.city ?? '', s.current_balance ?? 0, s.is_active ? 'Active' : 'Inactive']);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'suppliers.csv'; a.click();
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => suppliersApi.remove(id),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['suppliers'] }); setDeleteTarget(null); },
    onError: (err) => { toast.error(err.message); setDeleteTarget(null); },
  });

  async function handleImportCsv(file) {
    setImporting(true);
    try { const res = await suppliersApi.importCsv(file); qc.invalidateQueries({ queryKey: ['suppliers'] }); return res.data; }
    catch (err) { toast.error(err.message || 'Import failed'); return null; }
    finally { setImporting(false); }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} supplier(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => suppliersApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} could not be deleted.`) : toast.success(`${ids.length} supplier(s) deleted.`);
    setSelectedIds(new Set()); qc.invalidateQueries({ queryKey: ['suppliers'] }); setBulkDeleting(false);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(s)  { setEditing(s);    setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Procurement</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Suppliers</h1>
            <p className="text-sm text-surface-400 mt-1">{total} {total === 1 ? 'supplier' : 'suppliers'} · manage vendors and payables</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {can('suppliers', 'create') && <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-primary-500/50 hover:text-primary-300 transition-all"><ArrowUpTrayIcon className="h-4 w-4" /> Import CSV</button>}
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
            {can('suppliers', 'create') && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"><PlusIcon className="h-4 w-4" /> New Supplier</button>}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" value={total} Icon={TruckIcon} color="blue" active={statusFilter === 'all'} onClick={() => { setSt('all'); setPage(1); }} />
        <KpiCard label="Active" value={active} Icon={CheckCircleIcon} color="green" active={statusFilter === 'active'} onClick={() => { setSt(statusFilter === 'active' ? 'all' : 'active'); setPage(1); }} />
        <KpiCard label="Inactive" value={inactive} Icon={XCircleIcon} color="amber" active={statusFilter === 'inactive'} onClick={() => { setSt(statusFilter === 'inactive' ? 'all' : 'inactive'); setPage(1); }} />
        <KpiCard label="With Balance" value={owing} Icon={ExclamationCircleIcon} color="red" active={statusFilter === 'owing'} onClick={() => { setSt(statusFilter === 'owing' ? 'all' : 'owing'); setPage(1); }} />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search suppliers…" className="w-64" />
        <select value={statusFilter} onChange={e => { setSt(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm transition-all outline-none ${statusFilter !== 'all' ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="owing">With Balance</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{suppliers.length} result{suppliers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"><TrashIcon className="h-3.5 w-3.5" /> Delete selected</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? <TableSkeleton /> : suppliers.length === 0 ? (
          <EmptyState icon={<TruckIcon className="h-10 w-10" />} title="No suppliers found" description={search ? 'Try a different search term.' : 'Add your first supplier to get started.'} action={can('suppliers', 'create') ? { label: 'New Supplier', onClick: openCreate } : null} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="w-10 px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={suppliers.length > 0 && selectedIds.size === suppliers.length} onChange={e => setSelectedIds(e.target.checked ? new Set(suppliers.map(s => s.id)) : new Set())} /></th>
                <SortTh label="Supplier" field="name" sort={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Contact</span></th>
                <th className="text-left px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">City</span></th>
                <SortTh label="Purchases" field="purchases" sort={sort} onSort={handleSort} align="center" className="hidden sm:table-cell" />
                <SortTh label="Balance" field="balance" sort={sort} onSort={handleSort} align="right" />
                <th className="text-center px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span></th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {suppliers.map(s => {
                const hovered = hoveredId === s.id;
                return (
                  <tr key={s.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(s.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={selectedIds.has(s.id)} onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(s.id) : n.delete(s.id); setSelectedIds(n); }} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center flex-shrink-0 ring-1 ring-surface-600"><BuildingOffice2Icon className="h-4 w-4 text-surface-400" /></div>
                        <div><p className="font-semibold text-surface-100">{s.name}</p>{s.company && <p className="text-xs text-surface-500">{s.company}</p>}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><p className="text-surface-300">{s.phone ?? '—'}</p>{s.email && <p className="text-xs text-surface-500">{s.email}</p>}</td>
                    <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">{s.city ?? <span className="text-surface-600">—</span>}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell"><span className={`inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full text-xs font-bold ${(s.purchase_count ?? 0) > 0 ? 'bg-primary-500/15 text-primary-300' : 'bg-surface-700/50 text-surface-500'}`}>{s.purchase_count ?? 0}</span></td>
                    <td className="px-4 py-3 text-right"><span className={parseFloat(s.current_balance) > 0 ? 'text-red-400 font-semibold' : 'text-surface-500'}>{formatCurrency(s.current_balance)}</span></td>
                    <td className="px-4 py-3 text-center"><Badge variant={s.is_active ? 'success' : 'neutral'} dot>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('suppliers', 'edit') && <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"><PencilSquareIcon className="h-4 w-4" /></button>}
                        {can('suppliers', 'delete') && <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><TrashIcon className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />
      <SupplierFormModal open={modalOpen} onClose={() => setModalOpen(false)} editSupplier={editing} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} title={`Deactivate "${deleteTarget?.name}"?`} description="The supplier will be deactivated. Existing purchases will be preserved." variant="danger" confirmLabel="Deactivate" />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportCsv} entityName="Suppliers" columns={['name','email','phone','address','city','opening_balance','is_active','notes']} templateFilename="suppliers_template.csv" loading={importing} />
    </div>
  );
}

function TableSkeleton() {
  return <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />)}</div>;
}
