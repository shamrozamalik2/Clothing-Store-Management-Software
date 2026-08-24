import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, CubeIcon, FunnelIcon,
  ArrowUpTrayIcon, LockClosedIcon, Squares2X2Icon, ListBulletIcon,
  ArrowDownTrayIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  CurrencyDollarIcon, ExclamationTriangleIcon, ArchiveBoxXMarkIcon, TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import Select from '@components/common/Select';
import StockBadge from '@components/common/StockBadge';
import { usePermission } from '@hooks/usePermission';
import { categoriesApi } from '@api/categories.api';
import { brandsApi } from '@api/brands.api';
import { productsApi } from '@api/products.api';
import { formatCurrency, formatNumber } from '@utils/format';
import { cn } from '@utils/cn';
import ImportCsvModal from '@components/common/ImportCsvModal';

const LIMIT = 25;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent = '#6366f1', onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'card p-4 flex items-center gap-3 overflow-hidden transition-all duration-150 text-left w-full',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : 'cursor-default',
        active && 'ring-2 ring-offset-0'
      )}
      style={{
        borderLeft: `3px solid ${accent}`,
        ...(active ? { '--tw-ring-color': accent } : {}),
      }}
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}1a` }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl font-black mt-0.5 leading-none text-surface-100 truncate">{value}</p>
        {sub && <p className="text-[10px] text-surface-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </button>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortTh({ children, col, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === col;
  const Icon = active ? (sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
  return (
    <th
      onClick={() => onSort(col)}
      className={cn('px-4 py-3 text-surface-400 font-medium cursor-pointer select-none group', className)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <Icon className={cn('h-3.5 w-3.5 transition-opacity', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50')} />
      </span>
    </th>
  );
}

// ─── Export helper ────────────────────────────────────────────────────────────
function exportCsv(products) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ['Name', 'SKU', 'Category', 'Brand', 'Cost Price', 'Sale Price', 'Stock', 'Status', 'Stock Status'];
  const rows = products.map(p => [
    p.name, p.sku, p.category_name ?? '', p.brand_name ?? '',
    p.cost_price, p.sale_price, p.stock_quantity,
    p.is_active ? 'Active' : 'Inactive', p.stock_status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { can } = usePermission();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [catFilter, setCat]       = useState('');
  const [brandFilter, setBrand]   = useState('');
  const [stockFilter, setStock]   = useState('');
  const [statusFilter, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [view,    setView]    = useState('list');
  const [sortBy,  setSortBy]  = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, category_id: catFilter, brand_id: brandFilter, stock_status: stockFilter, status: statusFilter, sort: sortBy, order: sortDir }],
    queryFn:  () => productsApi.list({ search, page, limit: LIMIT, category: catFilter, brand: brandFilter, stock_status: stockFilter, status: statusFilter, sort: sortBy, order: sortDir }),
    placeholderData: keepPreviousData,
  });

  const { data: statsRes } = useQuery({
    queryKey: ['products-stats'],
    queryFn:  productsApi.stats,
    staleTime: 60 * 1000,
  });

  const { data: catData }   = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const { data: brandData } = useQuery({ queryKey: ['brands-flat'],     queryFn: () => brandsApi.list({ limit: 1000 }) });

  const products   = data?.data ?? [];
  const pagination = data?.pagination;
  const categories = catData?.data ?? [];
  const brands     = brandData?.data ?? [];
  const stats      = statsRes?.data ?? null;

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-stats'] });
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
      const res = await productsApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-stats'] });
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Import failed');
      return null;
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} product(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => productsApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} item(s) could not be deleted.`) : toast.success(`${ids.length} product(s) deleted.`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['products-stats'] });
    setBulkDeleting(false);
  }

  async function handleExport() {
    try {
      const res = await productsApi.list({ search, category: catFilter, brand: brandFilter, stock_status: stockFilter, status: statusFilter, sort: sortBy, order: sortDir, limit: 10000, page: 1 });
      exportCsv(res.data ?? []);
      toast.success(`Exported ${(res.data ?? []).length} products`);
    } catch {
      toast.error('Export failed');
    }
  }

  function resetFilters() {
    setCat(''); setBrand(''); setStock(''); setSearch(''); setStatus(''); setPage(1);
  }

  const hasFilter = !!(catFilter || brandFilter || stockFilter || search || statusFilter);

  // Margin % for grid cards
  const margin = (p) => {
    const cost = parseFloat(p.cost_price);
    const sale = parseFloat(p.sale_price);
    if (!cost || !sale || sale === 0) return null;
    return Math.round(((sale - cost) / sale) * 100);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Products</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage your product catalogue, pricing, and stock levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<ArrowDownTrayIcon className="h-4 w-4" />} onClick={handleExport}>
            Export CSV
          </Button>
          {can('products', 'create') && (
            <Button variant="ghost" icon={<ArrowUpTrayIcon className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
          )}
          {can('products', 'create') && (
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/products/new')}>
              New Product
            </Button>
          )}
        </div>
      </div>

      {/* KPI bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Products"
            value={formatNumber(stats.total)}
            sub={`${stats.active} active · ${stats.inactive} inactive`}
            icon={CubeIcon}
            accent="#6366f1"
          />
          <KpiCard
            label="Inventory Value"
            value={formatCurrency(stats.inventory_value)}
            sub={`Cost: ${formatCurrency(stats.inventory_cost)}`}
            icon={CurrencyDollarIcon}
            accent="#34d399"
          />
          <KpiCard
            label="Low Stock"
            value={formatNumber(stats.low_stock)}
            sub="items running low"
            icon={ExclamationTriangleIcon}
            accent="#fbbf24"
            onClick={stats.low_stock > 0 ? () => { setStock('low_stock'); setPage(1); } : undefined}
            active={stockFilter === 'low_stock'}
          />
          <KpiCard
            label="Out of Stock"
            value={formatNumber(stats.out_of_stock)}
            sub="items depleted"
            icon={ArchiveBoxXMarkIcon}
            accent="#f87171"
            onClick={stats.out_of_stock > 0 ? () => { setStock('out_of_stock'); setPage(1); } : undefined}
            active={stockFilter === 'out_of_stock'}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, SKU, barcode…"
          className="w-64"
        />
        <Select value={catFilter} onChange={e => { setCat(e.target.value); setPage(1); }}
          placeholder="All Categories" className="w-44 !py-1.5 !text-sm">
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.parent_name ? `${c.parent_name} › ` : ''}{c.name}
            </option>
          ))}
        </Select>
        <Select value={brandFilter} onChange={e => { setBrand(e.target.value); setPage(1); }}
          placeholder="All Brands" className="w-36 !py-1.5 !text-sm">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={stockFilter} onChange={e => { setStock(e.target.value); setPage(1); }}
          placeholder="All Stock" className="w-36 !py-1.5 !text-sm">
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </Select>
        <Select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          placeholder="All Status" className="w-32 !py-1.5 !text-sm">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        {hasFilter && (
          <button onClick={resetFilters}
            className="text-xs text-surface-500 hover:text-surface-200 transition-colors flex items-center gap-1">
            <FunnelIcon className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} product{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>

        {/* Grid / List toggle */}
        <div className="flex items-center rounded-lg overflow-hidden border border-surface-700">
          {[
            { id: 'list', Icon: ListBulletIcon, title: 'List view' },
            { id: 'grid', Icon: Squares2X2Icon, title: 'Grid view' },
          ].map(({ id, Icon, title }) => (
            <button key={id} onClick={() => setView(id)} title={title}
              className="h-8 w-8 flex items-center justify-center transition-colors"
              style={view === id
                ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }
                : { color: '#64748b' }}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={() => exportCsv(products.filter(p => selectedIds.has(p.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-md transition-colors">
            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Export selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">
            Clear
          </button>
        </div>
      )}

      {/* Product list / grid */}
      {isLoading ? (
        view === 'grid' ? <GridSkeleton /> : <div className="card overflow-hidden p-0"><TableSkeleton /></div>
      ) : products.length === 0 ? (
        <div className="card overflow-hidden p-0">
          <EmptyState
            icon={<CubeIcon className="h-10 w-10" />}
            title="No products found"
            description={hasFilter ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
            action={(!hasFilter && can('products', 'create'))
              ? { label: 'New Product', onClick: () => navigate('/products/new') }
              : hasFilter ? { label: 'Clear Filters', onClick: resetFilters } : null}
          />
        </div>
      ) : view === 'grid' ? (
        /* ── Grid view ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => {
            const m = margin(p);
            return (
              <div key={p.id}
                className="card p-0 overflow-hidden group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => can('products', 'edit') && navigate(`/products/${p.id}/edit`)}>
                {/* Image */}
                <div className="relative aspect-square bg-surface-800 overflow-hidden">
                  {p.image ? (
                    <img src={`http://localhost:3001${p.image}`} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CubeIcon className="h-10 w-10 text-surface-600" />
                    </div>
                  )}
                  {/* Stock badge */}
                  <div className="absolute top-2 left-2">
                    <StockBadge status={p.stock_status} qty={p.stock_quantity} />
                  </div>
                  {/* Margin badge */}
                  {m !== null && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{
                        background: m >= 40 ? 'rgba(52,211,153,0.85)' : m >= 20 ? 'rgba(251,191,36,0.85)' : 'rgba(248,113,113,0.85)',
                        color: '#fff',
                      }}>
                      {m}% margin
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {can('products', 'edit') && (
                      <button onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}/edit`); }}
                        className="h-7 w-7 rounded-lg bg-surface-900/80 backdrop-blur flex items-center justify-center text-surface-300 hover:text-primary-400 transition-colors" title="Edit">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('products', 'delete') && (
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="h-7 w-7 rounded-lg bg-surface-900/80 backdrop-blur flex items-center justify-center text-surface-300 hover:text-red-400 transition-colors" title="Delete">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Select checkbox */}
                  <div className="absolute bottom-2 left-2" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      className="h-4 w-4 rounded border-surface-600 bg-surface-700/80 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(p.id)}
                      onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                    />
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-surface-100 truncate leading-tight">{p.name}</p>
                  <p className="text-[11px] text-surface-500 font-mono mt-0.5 truncate">{p.sku}</p>
                  {p.category_name && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-surface-500 bg-surface-700/60 rounded px-1.5 py-0.5">
                      <TagIcon className="h-2.5 w-2.5" />{p.category_name}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-sm font-bold text-surface-100">{formatCurrency(p.sale_price)}</span>
                      {p.cost_price > 0 && (
                        <span className="text-[10px] text-surface-500 ml-1">/ {formatCurrency(p.cost_price)} cost</span>
                      )}
                    </div>
                    <Badge variant={p.is_active ? 'success' : 'neutral'} dot>
                      {p.is_active ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List / Table view ── */
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox"
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(products.map(p => p.id)) : new Set())}
                  />
                </th>
                <SortTh col="name"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left">Product</SortTh>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Category / Brand</th>
                <SortTh col="price"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right hidden sm:table-cell">Price</SortTh>
                <th className="text-right px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Margin</th>
                <SortTh col="stock"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center">Stock</SortTh>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {products.map(p => {
                const m = margin(p);
                return (
                  <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={selectedIds.has(p.id)}
                        onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={`http://localhost:3001${p.image}`} alt={p.name}
                            className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0">
                            <CubeIcon className="h-5 w-5 text-surface-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-surface-100 truncate max-w-[220px]">
                            {p.name}
                            {p.has_transactions && (
                              <LockClosedIcon className="inline h-3 w-3 ml-1.5 text-surface-500 shrink-0" title="Has transaction history" />
                            )}
                          </p>
                          <p className="text-xs text-surface-500 font-mono">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {p.category_name && <span className="text-xs text-surface-400">{p.category_name}</span>}
                        {p.brand_name    && <span className="text-xs text-surface-500">{p.brand_name}</span>}
                        {!p.category_name && !p.brand_name && <span className="text-surface-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-surface-100">{formatCurrency(p.sale_price)}</span>
                        {p.cost_price > 0 && (
                          <span className="text-xs text-surface-500">Cost: {formatCurrency(p.cost_price)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      {m !== null ? (
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          m >= 40 ? 'bg-green-500/15 text-green-400'
                          : m >= 20 ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                        )}>
                          {m}%
                        </span>
                      ) : <span className="text-surface-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge status={p.stock_status} qty={p.stock_quantity} />
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <Badge variant={p.is_active ? 'success' : 'neutral'} dot>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('products', 'edit') && (
                          <button onClick={() => navigate(`/products/${p.id}/edit`)}
                            className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors" title="Edit">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {can('products', 'delete') && (
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-md text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
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
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Deactivate "${deleteTarget?.name}"?`}
        description={
          deleteTarget?.has_transactions
            ? 'This product has sales/purchase history. It will be deactivated and hidden from POS, but all historical records will be fully preserved.'
            : 'This will deactivate the product and hide it from POS. No data will be deleted.'
        }
        variant="danger"
        confirmLabel="Deactivate"
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportCsv}
        entityName="Products"
        columns={['name', 'sku', 'barcode', 'description', 'unit', 'cost_price', 'sale_price', 'wholesale_price', 'tax_rate', 'stock_quantity', 'low_stock_alert', 'track_inventory', 'is_active']}
        templateFilename="products_template.csv"
        loading={importing}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="card p-0 overflow-hidden">
          <div className="aspect-square skeleton" />
          <div className="p-3 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/2" />
            <div className="h-4 skeleton rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
