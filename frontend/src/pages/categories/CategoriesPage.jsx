import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, FolderIcon, ArrowUpTrayIcon,
  SparklesIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, FolderOpenIcon, CheckCircleIcon, XCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ImportCsvModal from '@components/common/ImportCsvModal';
import { usePermission } from '@hooks/usePermission';
import { categoriesApi } from '@api/categories.api';
import CategoryFormModal from './components/CategoryFormModal';

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
    blue:   { bg: 'from-blue-600/20 to-blue-800/10',   border: 'border-blue-500/60',  text: 'text-blue-400',   icon: 'text-blue-600/[0.07]' },
    green:  { bg: 'from-green-600/20 to-green-800/10', border: 'border-green-500/60', text: 'text-green-400',  icon: 'text-green-600/[0.07]' },
    amber:  { bg: 'from-amber-600/20 to-amber-800/10', border: 'border-amber-500/60', text: 'text-amber-400',  icon: 'text-amber-600/[0.07]' },
    purple: { bg: 'from-purple-600/20 to-purple-800/10',border:'border-purple-500/60',text: 'text-purple-400', icon: 'text-purple-600/[0.07]' },
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

export default function CategoriesPage() {
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
    queryKey: ['categories', { search, page }],
    queryFn:  () => categoriesApi.list({ search, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const allCategories = data?.data ?? [];
  const pagination    = data?.pagination;

  // client-side status filter + sort
  const categories = useMemo(() => {
    let list = [...allCategories];
    if (statusFilter === 'active')   list = list.filter(c => c.is_active);
    if (statusFilter === 'inactive') list = list.filter(c => !c.is_active);
    list.sort((a, b) => {
      let av, bv;
      if (sort.field === 'name')          { av = a.name ?? ''; bv = b.name ?? ''; }
      else if (sort.field === 'products') { av = a.product_count ?? 0; bv = b.product_count ?? 0; }
      else if (sort.field === 'parent')   { av = a.parent_name ?? ''; bv = b.parent_name ?? ''; }
      else                                { av = a.name ?? ''; bv = b.name ?? ''; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [allCategories, statusFilter, sort]);

  // KPI derived from full page data
  const total    = pagination?.total ?? 0;
  const active   = allCategories.filter(c => c.is_active).length;
  const inactive = allCategories.filter(c => !c.is_active).length;
  const totalProducts = allCategories.reduce((s, c) => s + (c.product_count ?? 0), 0);

  // CSV export
  function exportCsv() {
    const cols = ['Name', 'Slug', 'Parent', 'Description', 'Products', 'Status'];
    const rows = categories.map(c => [
      c.name, c.slug ?? '', c.parent_name ?? '', c.description ?? '',
      c.product_count ?? 0, c.is_active ? 'Active' : 'Inactive',
    ]);
    const bom = '﻿';
    const csv = bom + [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'categories.csv';
    a.click();
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
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
      const res = await categoriesApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Import failed');
      return null;
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} categor${selectedIds.size === 1 ? 'y' : 'ies'}?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => categoriesApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed
      ? toast.error(`${failed} could not be deleted.`)
      : toast.success(`${ids.length} categor${ids.length === 1 ? 'y' : 'ies'} deleted.`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['categories-flat'] });
    setBulkDeleting(false);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(cat) { setEditing(cat); setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        {/* blur orbs */}
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400">Product Catalogue</span>
            </div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Categories</h1>
            <p className="text-sm text-surface-400 mt-1">
              {total} {total === 1 ? 'category' : 'categories'} · {totalProducts} products organised
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {can('categories', 'create') && (
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
            {can('categories', 'create') && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"
              >
                <PlusIcon className="h-4 w-4" /> New Category
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Categories" value={total}
          Icon={FolderIcon} color="blue"
          active={statusFilter === 'all'}
          onClick={() => { setStatusFilter('all'); setPage(1); }}
        />
        <KpiCard
          label="Active" value={active}
          Icon={CheckCircleIcon} color="green"
          active={statusFilter === 'active'}
          onClick={() => { setStatusFilter(statusFilter === 'active' ? 'all' : 'active'); setPage(1); }}
        />
        <KpiCard
          label="Inactive" value={inactive}
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
          placeholder="Search categories…"
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
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
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
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderIcon className="h-10 w-10" />}
            title="No categories found"
            description={search ? 'Try a different search term.' : 'Create your first category to get started.'}
            action={can('categories', 'create') ? { label: 'New Category', onClick: openCreate } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={categories.length > 0 && selectedIds.size === categories.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(categories.map(c => c.id)) : new Set())}
                  />
                </th>
                <SortTh label="Name"    field="name"     sort={sort} onSort={handleSort} />
                <SortTh label="Parent"  field="parent"   sort={sort} onSort={handleSort} className="hidden md:table-cell" />
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">Description</span>
                </th>
                <SortTh label="Products" field="products" sort={sort} onSort={handleSort} align="center" />
                <th className="text-center px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">Status</span>
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {categories.map(cat => {
                const hovered = hoveredId === cat.id;
                const rowBg = hovered ? 'rgba(var(--s-800-rgb,30,30,40),0.8)' : 'transparent';
                return (
                  <tr
                    key={cat.id}
                    style={{ background: rowBg }}
                    onMouseEnter={() => setHoveredId(cat.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={selectedIds.has(cat.id)}
                        onChange={e => {
                          const n = new Set(selectedIds);
                          e.target.checked ? n.add(cat.id) : n.delete(cat.id);
                          setSelectedIds(n);
                        }}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cat.image ? (
                          <img
                            src={`http://localhost:3001${cat.image}`}
                            alt={cat.name}
                            className="h-9 w-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-surface-600"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center flex-shrink-0 ring-1 ring-surface-600">
                            <FolderOpenIcon className="h-4 w-4 text-surface-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-surface-100 leading-tight">{cat.name}</p>
                          <p className="text-xs text-surface-500 font-mono">{cat.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                      {cat.parent_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <FolderIcon className="h-3.5 w-3.5 text-surface-500" />
                          {cat.parent_name}
                        </span>
                      ) : (
                        <span className="text-surface-600">Root</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-surface-400 hidden lg:table-cell max-w-[220px] truncate">
                      {cat.description ?? <span className="text-surface-600">—</span>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-full text-xs font-bold ${
                        (cat.product_count ?? 0) > 0
                          ? 'bg-primary-500/15 text-primary-300'
                          : 'bg-surface-700/50 text-surface-500'
                      }`}>
                        {cat.product_count ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Badge variant={cat.is_active ? 'success' : 'neutral'} dot>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('categories', 'edit') && (
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {can('categories', 'delete') && (
                          <button
                            onClick={() => setDeleteTarget(cat)}
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

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editCategory={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove the category. Products in this category will be unassigned."
        variant="danger"
        confirmLabel="Delete"
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportCsv}
        entityName="Categories"
        columns={['name', 'slug', 'description', 'is_active']}
        templateFilename="categories_template.csv"
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
