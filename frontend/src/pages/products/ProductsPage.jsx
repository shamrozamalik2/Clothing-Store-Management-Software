import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, CubeIcon, FunnelIcon,
  ArrowUpTrayIcon, LockClosedIcon, Squares2X2Icon, ListBulletIcon,
  ArrowDownTrayIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  CurrencyDollarIcon, ExclamationTriangleIcon, ArchiveBoxXMarkIcon, TagIcon,
  MagnifyingGlassIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import StockBadge from '@components/common/StockBadge';
import { usePermission } from '@hooks/usePermission';
import { categoriesApi } from '@api/categories.api';
import { brandsApi } from '@api/brands.api';
import { productsApi } from '@api/products.api';
import { formatCurrency, formatNumber } from '@utils/format';
import { cn } from '@utils/cn';
import ImportCsvModal from '@components/common/ImportCsvModal';

const LIMIT = 25;

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortTh({ children, col, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === col;
  const Icon = active ? (sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
  return (
    <th onClick={() => onSort(col)}
      className={cn('px-4 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap', className)}>
      <span className="inline-flex items-center gap-1.5">
        {children}
        <Icon className={cn('h-3.5 w-3.5 transition-opacity', active ? 'opacity-100 text-primary-400' : 'opacity-0 group-hover:opacity-50')} />
      </span>
    </th>
  );
}

// ─── Export CSV helper ────────────────────────────────────────────────────────
function buildCsv(products) {
  const esc = (v) => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const headers = ['Name', 'SKU', 'Category', 'Brand', 'Cost Price', 'Sale Price', 'Margin %', 'Stock', 'Status', 'Stock Status'];
  const rows = products.map(p => {
    const margin = (p.cost_price > 0 && p.sale_price > 0) ? Math.round(((p.sale_price - p.cost_price) / p.sale_price) * 100) : '';
    return [p.name, p.sku, p.category_name ?? '', p.brand_name ?? '', p.cost_price, p.sale_price, margin, p.stock_quantity, p.is_active ? 'Active' : 'Inactive', p.stock_status];
  });
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click();
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
    onError: (err) => { toast.error(err.message); setDeleteTarget(null); },
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
    } finally { setImporting(false); }
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
      buildCsv(res.data ?? []);
      toast.success(`Exported ${(res.data ?? []).length} products`);
    } catch { toast.error('Export failed'); }
  }

  function resetFilters() { setCat(''); setBrand(''); setStock(''); setSearch(''); setStatus(''); setPage(1); }
  const hasFilter = !!(catFilter || brandFilter || stockFilter || search || statusFilter);
  const margin = (p) => {
    const c = parseFloat(p.cost_price), s = parseFloat(p.sale_price);
    if (!c || !s || s === 0) return null;
    return Math.round(((s - c) / s) * 100);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 tracking-tight">Products</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {stats ? `${formatNumber(stats.total)} products · ${formatCurrency(stats.inventory_value)} inventory value` : 'Manage your product catalogue'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExport}
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-surface-300 hover:text-surface-100 border border-surface-700 hover:border-surface-600 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <ArrowDownTrayIcon className="h-4 w-4" /> Export
          </button>
          {can('products', 'create') && (
            <button onClick={() => setImportOpen(true)}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-surface-300 hover:text-surface-100 border border-surface-700 hover:border-surface-600 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <ArrowUpTrayIcon className="h-4 w-4" /> Import
            </button>
          )}
          {can('products', 'create') && (
            <button onClick={() => navigate('/products/new')}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
              <PlusIcon className="h-4 w-4" /> New Product
            </button>
          )}
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Products', accent: '#6366f1',
            value: stats ? formatNumber(stats.total) : '—',
            sub: stats ? `${stats.active} active · ${stats.inactive} inactive` : null,
            icon: CubeIcon, filter: null,
          },
          {
            label: 'Inventory Value', accent: '#10b981',
            value: stats ? formatCurrency(stats.inventory_value) : '—',
            sub: stats ? `Cost basis: ${formatCurrency(stats.inventory_cost)}` : null,
            icon: CurrencyDollarIcon, filter: null,
          },
          {
            label: 'Low Stock', accent: '#f59e0b',
            value: stats ? formatNumber(stats.low_stock) : '—',
            sub: 'items running low',
            icon: ExclamationTriangleIcon,
            filter: 'low_stock', active: stockFilter === 'low_stock',
          },
          {
            label: 'Out of Stock', accent: '#ef4444',
            value: stats ? formatNumber(stats.out_of_stock) : '—',
            sub: 'items depleted',
            icon: ArchiveBoxXMarkIcon,
            filter: 'out_of_stock', active: stockFilter === 'out_of_stock',
          },
        ].map(({ label, accent, value, sub, icon: Icon, filter, active }) => (
          <button key={label}
            onClick={filter ? () => { setStock(s => s === filter ? '' : filter); setPage(1); } : undefined}
            className={cn(
              'card p-4 text-left transition-all duration-150 overflow-hidden',
              filter ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-default',
              active && 'ring-2'
            )}
            style={{
              borderTop: `3px solid ${accent}`,
              ...(active ? { '--tw-ring-color': accent, '--tw-ring-offset-width': '0px' } : {}),
              boxShadow: active ? `0 0 0 2px ${accent}40` : undefined,
            }}>
            <div className="flex items-start justify-between mb-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: `${accent}15` }}>
                <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
              </div>
              {active && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${accent}20`, color: accent }}>
                  FILTERED
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-surface-100 leading-none">{value}</p>
            <p className="text-[11px] text-surface-500 mt-1.5 font-medium">{label}</p>
            {sub && <p className="text-[10px] text-surface-600 mt-0.5">{sub}</p>}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="card p-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: search + view toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, SKU, or barcode…"
                className="w-full h-9 pl-9 pr-8 rounded-lg text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ background: 'rgb(var(--s-800))', border: '1px solid rgb(var(--s-700))' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid rgb(var(--s-700))' }}>
              {[
                { id: 'list', Icon: ListBulletIcon, title: 'List view' },
                { id: 'grid', Icon: Squares2X2Icon, title: 'Grid view' },
              ].map(({ id, Icon, title }) => (
                <button key={id} onClick={() => setView(id)} title={title}
                  className="h-9 w-9 flex items-center justify-center transition-all"
                  style={view === id
                    ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }
                    : { color: 'rgb(var(--s-400))', background: 'transparent' }}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: dropdowns + count + clear */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                value: catFilter, onChange: v => { setCat(v); setPage(1); },
                placeholder: 'All Categories',
                options: categories.map(c => ({ value: c.id, label: (c.parent_name ? `${c.parent_name} › ` : '') + c.name })),
              },
              {
                value: brandFilter, onChange: v => { setBrand(v); setPage(1); },
                placeholder: 'All Brands',
                options: brands.map(b => ({ value: b.id, label: b.name })),
              },
              {
                value: stockFilter, onChange: v => { setStock(v); setPage(1); },
                placeholder: 'All Stock',
                options: [
                  { value: 'in_stock', label: 'In Stock' },
                  { value: 'low_stock', label: 'Low Stock' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                ],
              },
              {
                value: statusFilter, onChange: v => { setStatus(v); setPage(1); },
                placeholder: 'All Status',
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
            ].map(({ value, onChange, placeholder, options }) => (
              <div key={placeholder} className="relative">
                <select value={value} onChange={e => onChange(e.target.value)}
                  className="h-8 pl-3 pr-7 rounded-lg text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  style={{
                    background: value ? 'rgba(99,102,241,0.12)' : 'rgb(var(--s-800))',
                    border: value ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgb(var(--s-700))',
                    color: value ? '#a5b4fc' : 'rgb(var(--s-300))',
                  }}>
                  <option value="">{placeholder}</option>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
                  style={{ color: value ? '#a5b4fc' : 'rgb(var(--s-500))' }} />
              </div>
            ))}

            {hasFilter && (
              <button onClick={resetFilters}
                className="h-8 px-3 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-700 border border-surface-700 transition-all flex items-center gap-1">
                <XMarkIcon className="h-3.5 w-3.5" /> Clear
              </button>
            )}

            <span className="ml-auto text-xs text-surface-500 font-medium">
              {pagination?.total ?? 0} product{(pagination?.total ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {selectedIds.size}
          </div>
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-surface-700 mx-1" />
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => buildCsv(products.filter(p => selectedIds.has(p.id)))}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-md transition-colors">
            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-surface-500 hover:text-surface-300 transition-colors flex items-center gap-1">
            <XMarkIcon className="h-3.5 w-3.5" /> Clear selection
          </button>
        </div>
      )}

      {/* ── Products ── */}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => {
            const m = margin(p);
            return (
              <div key={p.id}
                className="card p-0 overflow-hidden group hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => can('products', 'edit') && navigate(`/products/${p.id}/edit`)}>
                <div className="relative aspect-square bg-surface-800 overflow-hidden">
                  {p.image ? (
                    <img src={`http://localhost:3001${p.image}`} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-800 to-surface-900">
                      <CubeIcon className="h-10 w-10 text-surface-600" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <StockBadge status={p.stock_status} qty={p.stock_quantity} />
                  </div>
                  {m !== null && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm"
                      style={{
                        background: m >= 40 ? 'rgba(16,185,129,0.85)' : m >= 20 ? 'rgba(245,158,11,0.85)' : 'rgba(239,68,68,0.85)',
                        color: '#fff',
                      }}>
                      {m}% margin
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {can('products', 'edit') && (
                      <button onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}/edit`); }}
                        className="h-7 w-7 rounded-lg bg-surface-900/90 backdrop-blur-sm flex items-center justify-center text-surface-300 hover:text-primary-400 transition-colors shadow-lg">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('products', 'delete') && (
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="h-7 w-7 rounded-lg bg-surface-900/90 backdrop-blur-sm flex items-center justify-center text-surface-300 hover:text-red-400 transition-colors shadow-lg">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      className="h-4 w-4 rounded border-surface-600 bg-surface-700/80 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(p.id)}
                      onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                    />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-surface-100 truncate leading-tight">{p.name}</p>
                  <p className="text-[11px] text-surface-500 font-mono mt-0.5 truncate">{p.sku}</p>
                  {p.category_name && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <TagIcon className="h-3 w-3 text-surface-600 shrink-0" />
                      <span className="text-[10px] text-surface-500 truncate">{p.category_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-700/50">
                    <div>
                      <p className="text-sm font-bold text-surface-100">{formatCurrency(p.sale_price)}</p>
                      {p.cost_price > 0 && <p className="text-[10px] text-surface-500">Cost {formatCurrency(p.cost_price)}</p>}
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
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700" style={{ background: 'rgb(var(--s-800))' }}>
                <th className="w-10 px-4 py-3.5">
                  <input type="checkbox"
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(products.map(p => p.id)) : new Set())}
                  />
                </th>
                <SortTh col="name"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left">Product</SortTh>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">Category / Brand</th>
                <SortTh col="price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right hidden sm:table-cell">Price</SortTh>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wider hidden lg:table-cell">Margin</th>
                <SortTh col="stock" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center">Stock</SortTh>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {products.map(p => {
                const m = margin(p);
                return (
                  <tr key={p.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={selectedIds.has(p.id)}
                        onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-surface-700">
                          {p.image
                            ? <img src={`http://localhost:3001${p.image}`} alt={p.name} className="h-10 w-10 object-cover" />
                            : <div className="h-10 w-10 flex items-center justify-center"><CubeIcon className="h-5 w-5 text-surface-500" /></div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-surface-100 truncate max-w-[200px]">
                            {p.name}
                            {p.has_transactions && <LockClosedIcon className="inline h-3 w-3 ml-1.5 text-surface-500 shrink-0" title="Has transaction history" />}
                          </p>
                          <p className="text-xs text-surface-500 font-mono mt-0.5">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {p.category_name && <span className="text-xs text-surface-300">{p.category_name}</span>}
                        {p.brand_name    && <span className="text-xs text-surface-500">{p.brand_name}</span>}
                        {!p.category_name && !p.brand_name && <span className="text-surface-600 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <p className="font-semibold text-surface-100">{formatCurrency(p.sale_price)}</p>
                      {p.cost_price > 0 && <p className="text-xs text-surface-500 mt-0.5">Cost {formatCurrency(p.cost_price)}</p>}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {m !== null ? (
                        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                          m >= 40 ? 'bg-emerald-500/15 text-emerald-400'
                          : m >= 20 ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400')}>
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
                            className="p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {can('products', 'delete') && (
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
            ? 'This product has sales/purchase history. It will be deactivated and hidden from POS, but all historical records will be preserved.'
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
      {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />)}
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
