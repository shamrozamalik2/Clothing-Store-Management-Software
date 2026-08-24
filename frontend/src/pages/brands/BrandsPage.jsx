import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, TagIcon, ArrowUpTrayIcon,
  SparklesIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, GlobeAltIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ImportCsvModal from '@components/common/ImportCsvModal';
import { usePermission } from '@hooks/usePermission';
import { brandsApi } from '@api/brands.api';
import BrandFormModal from './components/BrandFormModal';

const LIMIT = 20;

// ─── sort helper ──────────────────────────────────────────────────────────────

function SortTh({ label, field, sort, onSort, align = 'left', className = '' }) {
  const active = sort.field === field;
  const Icon = active ? (sort.dir === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 cursor-pointer select-none whitespace-nowrap text-${align} ${className}`}
    >
      <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? 'text-primary-400' : 'text-surface-400 hover:text-surface-200'
      }`}>
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </span>
    </th>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, Icon, color, active, onClick }) {
  const colors = {
    blue:   { bg: 'from-blue-600/20 to-blue-800/10',    border: 'border-blue-500/60',   text: 'text-blue-400',   icon: 'text-blue-600/[0.07]' },
    green:  { bg: 'from-green-600/20 to-green-800/10',  border: 'border-green-500/60',  text: 'text-green-400',  icon: 'text-green-600/[0.07]' },
    amber:  { bg: 'from-amber-600/20 to-amber-800/10',  border: 'border-amber-500/60',  text: 'text-amber-400',  icon: 'text-amber-600/[0.07]' },
    purple: { bg: 'from-purple-600/20 to-purple-800/10',border: 'border-purple-500/60', text: 'text-purple-400', icon: 'text-purple-600/[0.07]' },
  };
  const c = colors[color] || colors.blue;
  const base = `relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 text-left w-full ${
    active
      ? `bg-gradient-to-br ${c.bg} ${c.border} shadow-lg ring-1 ring-inset ${c.border}`
      : 'border-surface-700/50 bg-surface-800/60 hover:border-surface-600'
  } ${onClick ? 'cursor-pointer' : ''}`;

  return (
    <button className={base} onClick={onClick} type="button">
      <Icon className={`absolute -right-3 -bottom-3 h-24 w-24 ${c.icon} pointer-events-none`} />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${active ? c.text : 'text-surface-100'}`}>{value ?? '—'}</p>
      {active && (
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.text} bg-current/10`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Filter ON
        </span>
      )}
    </button>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function BrandsPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort]         = useState({ field: 'name', dir: 'asc' });
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting]   = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [hoveredId, setHoveredId]   = useState(null);

  function handleSort(field) {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  }

  const { data, isLoading } = useQuery({
    queryKey: ['brands', { search, page }],
    queryFn:  () => brandsApi.list({ search, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const allBrands  = data?.data ?? [];
  const pagination = data?.pagination;

  const brands = useMemo(() => {
    let list = [...allBrands];
    if (statusFilter === 'active')   list = list.filter(b => b.is_active);
    if (statusFilter === 'inactive') list = list.filter(b => !b.is_active);
    list.sort((a, b) => {
      let av, bv;
      if (sort.field === 'name')     { av = a.name ?? ''; bv = b.name ?? ''; }
      else if (sort.field === 'products') { av = a.product_count ?? 0; bv = b.product_count ?? 0; }
      else                           { av = a.name ?? ''; bv = b.name ?? ''; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [allBrands, statusFilter, sort]);

  const total         = pagination?.total ?? 0;
  const activeCount   = allBrands.filter(b => b.is_active).length;
  const inactiveCount = allBrands.filter(b => !b.is_active).length;
  const totalProducts = allBrands.reduce((s, b) => s + (b.product_count ?? 0), 0);

  function exportCsv() {
    const cols = ['Name', 'Slug', 'Description', 'Website', 'Products', 'Status'];
    const rows = brands.map(b => [
      b.name, b.slug ?? '', b.description ?? '', b.website ?? '',
      b.product_count ?? 0, b.is_active ? 'Active' : 'Inactive',
    ]);
    const bom = '﻿';
    const csv = bom + [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'brands.csv';
    a.click();
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => brandsApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['brands'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  async function handleImportCsv(file) {
    setImporting(true);
    try {
      const res = await brandsApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['brands'] });
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Import failed');
      return null;
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} brand${selectedIds.size === 1 ? '' : 's'}?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => brandsApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed
      ? toast.error(`${failed} could not be deleted.`)
      : toast.success(`${ids.length} brand${ids.length === 1 ? '' : 's'} deleted.`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ['brands'] });
    setBulkDeleting(false);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(brand) { setEditing(brand); setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400">Product Catalogue</span>
            </div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Brands</h1>
            <p className="text-sm text-surface-400 mt-1">
              {total} {total === 1 ? 'brand' : 'brands'} · {totalProducts} products linked
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {can('brands', 'create') && (
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-primary-500/50 hover:text-primary-300 transition-all"
              >
                <ArrowUpTrayIcon className="h-4 w-4" /> Import CSV
              </button>
            )}
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
            >
              <ArrowDownTrayIcon className="h-4 w-4" /> Export
            </button>
            {can('brands', 'create') && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"
              >
                <PlusIcon className="h-4 w-4" /> New Brand
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Brands" value={total}
          Icon={BuildingStorefrontIcon} color="blue"
          active={statusFilter === 'all'}
          onClick={() => { setStatusFilter('all'); setPage(1); }}
        />
        <KpiCard
          label="Active" value={activeCount}
          Icon={CheckCircleIcon} color="green"
          active={statusFilter === 'active'}
          onClick={() => { setStatusFilter(statusFilter === 'active' ? 'all' : 'active'); setPage(1); }}
        />
        <KpiCard
          label="Inactive" value={inactiveCount}
          Icon={XCircleIcon} color="amber"
          active={statusFilter === 'inactive'}
          onClick={() => { setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive'); setPage(1); }}
        />
        <KpiCard
          label="Total Products" value={totalProducts}
          Icon={TagIcon} color="purple"
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search brands…"
          className="w-64"
        />

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm transition-all outline-none ${
            statusFilter !== 'all'
              ? 'border-primary-500/60 bg-primary-900/30 text-primary-300'
              : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'
          }`}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="ml-auto text-xs text-surface-500 font-medium">
          {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
        </span>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
          >
            <TrashIcon className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : brands.length === 0 ? (
          <EmptyState
            icon={<TagIcon className="h-10 w-10" />}
            title="No brands found"
            description={search ? 'Try a different search term.' : 'Create your first brand to get started.'}
            action={can('brands', 'create') ? { label: 'New Brand', onClick: openCreate } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={brands.length > 0 && selectedIds.size === brands.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(brands.map(b => b.id)) : new Set())}
                  />
                </th>
                <SortTh label="Brand"    field="name"     sort={sort} onSort={handleSort} />
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">Description</span>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">Website</span>
                </th>
                <SortTh label="Products" field="products" sort={sort} onSort={handleSort} align="center" />
                <th className="text-center px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span>
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {brands.map(brand => {
                const hovered = hoveredId === brand.id;
                const rowBg = hovered ? 'rgba(var(--s-800-rgb,30,30,40),0.8)' : 'transparent';
                return (
                  <tr
                    key={brand.id}
                    style={{ background: rowBg }}
                    onMouseEnter={() => setHoveredId(brand.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={selectedIds.has(brand.id)}
                        onChange={e => {
                          const n = new Set(selectedIds);
                          e.target.checked ? n.add(brand.id) : n.delete(brand.id);
                          setSelectedIds(n);
                        }}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {brand.logo ? (
                          <img
                            src={`http://localhost:3001${brand.logo}`}
                            alt={brand.name}
                            className="h-9 w-9 rounded-xl object-contain flex-shrink-0 bg-surface-700 p-1 ring-1 ring-surface-600"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center flex-shrink-0 ring-1 ring-surface-600">
                            <BuildingStorefrontIcon className="h-4 w-4 text-surface-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-surface-100 leading-tight">{brand.name}</p>
                          <p className="text-xs text-surface-500 font-mono">{brand.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-surface-400 hidden lg:table-cell max-w-[200px] truncate">
                      {brand.description ?? <span className="text-surface-600">—</span>}
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell">
                      {brand.website ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary-400 max-w-[140px] truncate">
                          <GlobeAltIcon className="h-3.5 w-3.5 shrink-0 text-surface-500" />
                          {brand.website.replace(/^https?:\/\//, '')}
                        </span>
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full text-xs font-bold ${
                        (brand.product_count ?? 0) > 0
                          ? 'bg-primary-500/15 text-primary-300'
                          : 'bg-surface-700/50 text-surface-500'
                      }`}>
                        {brand.product_count ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge variant={brand.is_active ? 'success' : 'neutral'} dot>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('brands', 'edit') && (
                          <button
                            onClick={() => openEdit(brand)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {can('brands', 'delete') && (
                          <button
                            onClick={() => setDeleteTarget(brand)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
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

      <BrandFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editBrand={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove the brand. Products using this brand will be unassigned."
        variant="danger"
        confirmLabel="Delete"
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportCsv}
        entityName="Brands"
        columns={['name', 'slug', 'description', 'is_active']}
        templateFilename="brands_template.csv"
        loading={importing}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
