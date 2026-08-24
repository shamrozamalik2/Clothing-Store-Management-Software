import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, ArrowUpTrayIcon,
  SparklesIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ImportCsvModal from '@components/common/ImportCsvModal';
import { usePermission } from '@hooks/usePermission';
import { customersApi } from '@api/customers.api';
import { formatCurrency } from '@utils/format';
import CustomerFormModal from './components/CustomerFormModal';

const GROUP_VARIANTS = { general: 'neutral', wholesale: 'info', vip: 'purple', staff: 'warning' };

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
  const c = { blue:'from-blue-600/20 to-blue-800/10 border-blue-500/60 text-blue-400 text-blue-600/[0.07]', green:'from-green-600/20 to-green-800/10 border-green-500/60 text-green-400 text-green-600/[0.07]', amber:'from-amber-600/20 to-amber-800/10 border-amber-500/60 text-amber-400 text-amber-600/[0.07]', red:'from-red-600/20 to-red-800/10 border-red-500/60 text-red-400 text-red-600/[0.07]' }[color] || '';
  const [bg, border, text, iconCls] = c.split(' ');
  return (
    <button type="button" onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 text-left w-full ${active ? `bg-gradient-to-br ${bg} ${bg.replace('from-','').replace('to-','')} border ${border} shadow-lg` : 'border-surface-700/50 bg-surface-800/60 hover:border-surface-600'} ${onClick ? 'cursor-pointer' : ''}`}>
      <Icon className={`absolute -right-3 -bottom-3 h-24 w-24 pointer-events-none ${active ? iconCls : 'text-surface-600/[0.07]'}`} />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${active ? text : 'text-surface-100'}`}>{value ?? '—'}</p>
      {active && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${text} bg-current/10`}><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Filter ON</span>}
    </button>
  );
}

export default function CustomersPage() {
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
    queryKey: ['customers', { search, page }],
    queryFn:  () => customersApi.list({ search, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });

  const allCustomers = data?.data ?? [];
  const pagination   = data?.pagination;

  const customers = useMemo(() => {
    let list = [...allCustomers];
    if (statusFilter === 'active')   list = list.filter(c => c.is_active);
    if (statusFilter === 'inactive') list = list.filter(c => !c.is_active);
    if (statusFilter === 'owing')    list = list.filter(c => parseFloat(c.current_balance) > 0);
    list.sort((a, b) => {
      const av = sort.field === 'name' ? (a.name ?? '') : sort.field === 'balance' ? (parseFloat(a.current_balance) || 0) : sort.field === 'sales' ? (a.sale_count ?? 0) : (a.name ?? '');
      const bv = sort.field === 'name' ? (b.name ?? '') : sort.field === 'balance' ? (parseFloat(b.current_balance) || 0) : sort.field === 'sales' ? (b.sale_count ?? 0) : (b.name ?? '');
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [allCustomers, statusFilter, sort]);

  const total    = pagination?.total ?? 0;
  const active   = allCustomers.filter(c => c.is_active).length;
  const inactive = allCustomers.filter(c => !c.is_active).length;
  const owing    = allCustomers.filter(c => parseFloat(c.current_balance) > 0).length;

  function exportCsv() {
    const cols = ['Name','Phone','Email','City','Group','Balance','Status'];
    const rows = customers.map(c => [c.name, c.phone ?? '', c.email ?? '', c.city ?? '', c.customer_group ?? '', c.current_balance ?? 0, c.is_active ? 'Active' : 'Inactive']);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'customers.csv'; a.click();
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => customersApi.remove(id),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['customers'] }); setDeleteTarget(null); },
    onError: (err) => { toast.error(err.message); setDeleteTarget(null); },
  });

  async function handleImportCsv(file) {
    setImporting(true);
    try { const res = await customersApi.importCsv(file); qc.invalidateQueries({ queryKey: ['customers'] }); return res.data; }
    catch (err) { toast.error(err.message || 'Import failed'); return null; }
    finally { setImporting(false); }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} customer(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => customersApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} could not be deleted.`) : toast.success(`${ids.length} customer(s) deleted.`);
    setSelectedIds(new Set()); qc.invalidateQueries({ queryKey: ['customers'] }); setBulkDeleting(false);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c)  { setEditing(c);    setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">CRM</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Customers</h1>
            <p className="text-sm text-surface-400 mt-1">{total} {total === 1 ? 'customer' : 'customers'} · manage accounts and balances</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {can('customers', 'create') && <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-primary-500/50 hover:text-primary-300 transition-all"><ArrowUpTrayIcon className="h-4 w-4" /> Import CSV</button>}
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
            {can('customers', 'create') && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"><PlusIcon className="h-4 w-4" /> New Customer</button>}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" value={total} Icon={UserGroupIcon} color="blue" active={statusFilter === 'all'} onClick={() => { setSt('all'); setPage(1); }} />
        <KpiCard label="Active" value={active} Icon={CheckCircleIcon} color="green" active={statusFilter === 'active'} onClick={() => { setSt(statusFilter === 'active' ? 'all' : 'active'); setPage(1); }} />
        <KpiCard label="Inactive" value={inactive} Icon={XCircleIcon} color="amber" active={statusFilter === 'inactive'} onClick={() => { setSt(statusFilter === 'inactive' ? 'all' : 'inactive'); setPage(1); }} />
        <KpiCard label="With Balance" value={owing} Icon={ExclamationCircleIcon} color="red" active={statusFilter === 'owing'} onClick={() => { setSt(statusFilter === 'owing' ? 'all' : 'owing'); setPage(1); }} />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, phone…" className="w-64" />
        <select value={statusFilter} onChange={e => { setSt(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm transition-all outline-none ${statusFilter !== 'all' ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="owing">With Balance</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{customers.length} result{customers.length !== 1 ? 's' : ''}</span>
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
        {isLoading ? <TableSkeleton /> : customers.length === 0 ? (
          <EmptyState icon={<UserGroupIcon className="h-10 w-10" />} title="No customers found" description={search ? 'Try a different search.' : 'Add your first customer.'} action={can('customers', 'create') ? { label: 'New Customer', onClick: openCreate } : null} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="w-10 px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={customers.length > 0 && selectedIds.size === customers.length} onChange={e => setSelectedIds(e.target.checked ? new Set(customers.map(c => c.id)) : new Set())} /></th>
                <SortTh label="Customer" field="name" sort={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Contact</span></th>
                <th className="text-center px-4 py-3 hidden sm:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Group</span></th>
                <SortTh label="Sales" field="sales" sort={sort} onSort={handleSort} align="center" className="hidden lg:table-cell" />
                <SortTh label="Balance" field="balance" sort={sort} onSort={handleSort} align="right" />
                <th className="text-center px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span></th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {customers.map(c => {
                const hovered = hoveredId === c.id;
                return (
                  <tr key={c.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(c.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={selectedIds.has(c.id)} onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(c.id) : n.delete(c.id); setSelectedIds(n); }} /></td>
                    <td className="px-4 py-3"><p className="font-semibold text-surface-100">{c.name}</p>{c.city && <p className="text-xs text-surface-500">{c.city}</p>}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><p className="text-surface-300">{c.phone ?? '—'}</p>{c.email && <p className="text-xs text-surface-500">{c.email}</p>}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell"><Badge variant={GROUP_VARIANTS[c.customer_group] ?? 'neutral'}>{c.customer_group}</Badge></td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell"><span className={`inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full text-xs font-bold ${(c.sale_count ?? 0) > 0 ? 'bg-primary-500/15 text-primary-300' : 'bg-surface-700/50 text-surface-500'}`}>{c.sale_count ?? 0}</span></td>
                    <td className="px-4 py-3 text-right"><span className={parseFloat(c.current_balance) > 0 ? 'text-red-400 font-semibold' : 'text-surface-500'}>{formatCurrency(c.current_balance)}</span></td>
                    <td className="px-4 py-3 text-center"><Badge variant={c.is_active ? 'success' : 'neutral'} dot>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('customers', 'edit') && <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"><PencilSquareIcon className="h-4 w-4" /></button>}
                        {can('customers', 'delete') && <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><TrashIcon className="h-4 w-4" /></button>}
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
      <CustomerFormModal open={modalOpen} onClose={() => setModalOpen(false)} editCustomer={editing} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} title={`Deactivate "${deleteTarget?.name}"?`} description="The customer will be deactivated. Their sales history is preserved." variant="danger" confirmLabel="Deactivate" />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportCsv} entityName="Customers" columns={['name','email','phone','address','city','customer_group','credit_limit','is_active','notes']} templateFilename="customers_template.csv" loading={importing} />
    </div>
  );
}

function TableSkeleton() {
  return <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />)}</div>;
}
