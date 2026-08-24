import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, CubeIcon, FunnelIcon,
  ArrowUpTrayIcon, LockClosedIcon, Squares2X2Icon, ListBulletIcon,
  ArrowDownTrayIcon, ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  CurrencyDollarIcon, ExclamationTriangleIcon, ArchiveBoxXMarkIcon, TagIcon,
  MagnifyingGlassIcon, XMarkIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
import BulkPriceModal from './BulkPriceModal';
import QuickEditModal from './QuickEditModal';
import { toastWithUndo } from '@utils/undoToast.jsx';

const LIMIT = 25;

/* ─── Sort TH ──────────────────────────────────────────────────────────────── */
function SortTh({ children, col, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === col;
  const Icon = active ? (sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
  return (
    <th onClick={() => onSort(col)}
      className={cn('px-4 py-4 text-[11px] font-bold text-surface-400 uppercase tracking-widest cursor-pointer select-none group whitespace-nowrap', className)}>
      <span className="inline-flex items-center gap-1.5">
        {children}
        <Icon className={cn('h-3 w-3 transition-opacity', active ? 'opacity-100 text-primary-400' : 'opacity-0 group-hover:opacity-50')} />
      </span>
    </th>
  );
}

/* ─── Export CSV ────────────────────────────────────────────────────────────── */
function buildCsv(products) {
  const esc = (v) => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const headers = ['Name', 'SKU', 'Category', 'Brand', 'Cost Price', 'Sale Price', 'Margin %', 'Stock', 'Status', 'Stock Status'];
  const rows = products.map(p => {
    const m = (p.cost_price > 0 && p.sale_price > 0) ? Math.round(((p.sale_price - p.cost_price) / p.sale_price) * 100) : '';
    return [p.name, p.sku, p.category_name ?? '', p.brand_name ?? '', p.cost_price, p.sale_price, m, p.stock_quantity, p.is_active ? 'Active' : 'Inactive', p.stock_status];
  });
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })), download: 'products.csv' });
  a.click();
}

/* ─── Margin helper ─────────────────────────────────────────────────────────── */
function calcMargin(p) {
  const c = parseFloat(p.cost_price), s = parseFloat(p.sale_price);
  if (!c || !s || s === 0) return null;
  return Math.round(((s - c) / s) * 100);
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
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
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [quickEditProduct, setQuickEditProduct] = useState(null);
  const [colsOpen, setColsOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('products-hidden-cols') ?? '[]')); } catch { return new Set(); }
  });
  const [view,    setView]    = useState('list');
  const [sortBy,  setSortBy]  = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  }

  function toggleCol(col) {
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      try { localStorage.setItem('products-hidden-cols', JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  const colVis = (col) => !hiddenCols.has(col);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, catFilter, brandFilter, stockFilter, statusFilter, sortBy, sortDir }],
    queryFn:  () => productsApi.list({ search, page, limit: LIMIT, category: catFilter, brand: brandFilter, stock_status: stockFilter, status: statusFilter, sort: sortBy, order: sortDir }),
    placeholderData: keepPreviousData,
  });

  const { data: statsRes } = useQuery({ queryKey: ['products-stats'], queryFn: productsApi.stats, staleTime: 60_000 });

  const { data: catData }   = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const { data: brandData } = useQuery({ queryKey: ['brands-flat'],     queryFn: () => brandsApi.list({ limit: 1000 }) });

  const products   = data?.data ?? [];
  const pagination = data?.pagination;
  const categories = catData?.data ?? [];
  const brands     = brandData?.data ?? [];
  const stats      = statsRes?.data ?? null;

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: (_res, id) => {
      const name = deleteTarget?.name ?? 'Product';
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-stats'] });
      setDeleteTarget(null);
      toastWithUndo(`"${name}" deactivated`, async () => {
        await productsApi.update(id, { is_active: true });
        qc.invalidateQueries({ queryKey: ['products'] });
        toast.success(`"${name}" restored.`);
      });
    },
    onError: (err) => { toast.error(err.message); setDeleteTarget(null); },
  });

  async function handleImportCsv(file) {
    setImporting(true);
    try { const res = await productsApi.importCsv(file); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); return res.data; }
    catch (err) { toast.error(err.message || 'Import failed'); return null; }
    finally { setImporting(false); }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} product(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => productsApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} item(s) could not be deleted.`) : toast.success(`${ids.length} product(s) deleted.`);
    setSelectedIds(new Set()); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['products-stats'] }); setBulkDeleting(false);
  }

  async function handleExport() {
    try { const res = await productsApi.list({ search, category: catFilter, brand: brandFilter, stock_status: stockFilter, status: statusFilter, sort: sortBy, order: sortDir, limit: 10000, page: 1 }); buildCsv(res.data ?? []); toast.success(`Exported ${(res.data ?? []).length} products`); }
    catch { toast.error('Export failed'); }
  }

  function resetFilters() { setCat(''); setBrand(''); setStock(''); setSearch(''); setStatus(''); setPage(1); }
  const hasFilter = !!(catFilter || brandFilter || stockFilter || search || statusFilter);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden px-6 py-5"
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.10) 50%, rgba(16,185,129,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
        {/* Decorative orbs */}
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute -bottom-6 right-24 h-24 w-24 rounded-full opacity-15 blur-xl"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Inventory</span>
            </div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Products</h1>
            <p className="text-sm text-surface-400 mt-1">
              {stats
                ? <><span className="text-surface-300 font-semibold">{formatNumber(stats.total)}</span> products &nbsp;·&nbsp; <span className="text-emerald-400 font-semibold">{formatCurrency(stats.inventory_value)}</span> inventory value</>
                : 'Manage your product catalogue'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgb(var(--s-300))' }}>
              <ArrowDownTrayIcon className="h-4 w-4" /> Export
            </button>
            {can('products', 'update') && (
              <button onClick={() => setBulkPriceOpen(true)}
                className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(99,102,241,0.30)', color: 'rgb(var(--s-300))' }}>
                <TagIcon className="h-4 w-4" /> Bulk Price
              </button>
            )}
            {can('products', 'create') && (
              <button onClick={() => setImportOpen(true)}
                className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgb(var(--s-300))' }}>
                <ArrowUpTrayIcon className="h-4 w-4" /> Import
              </button>
            )}
            {can('products', 'create') && (
              <button onClick={() => navigate('/products/new')}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.45)' }}>
                <PlusIcon className="h-4 w-4" /> New Product
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total Products',  accent: '#6366f1', icon: CubeIcon,              value: stats ? formatNumber(stats.total) : '—',                    sub: stats ? `${stats.active} active · ${stats.inactive} inactive` : null, filter: null },
          { label: 'Inventory Value', accent: '#10b981', icon: CurrencyDollarIcon,    value: stats ? formatCurrency(stats.inventory_value) : '—',         sub: stats ? `Cost: ${formatCurrency(stats.inventory_cost)}` : null,       filter: null },
          { label: 'Low Stock',       accent: '#f59e0b', icon: ExclamationTriangleIcon,value: stats ? formatNumber(stats.low_stock) : '—',                 sub: 'items running low',                                                   filter: 'low_stock' },
          { label: 'Out of Stock',    accent: '#ef4444', icon: ArchiveBoxXMarkIcon,    value: stats ? formatNumber(stats.out_of_stock) : '—',              sub: 'items fully depleted',                                                filter: 'out_of_stock' },
        ].map(({ label, accent, icon: Icon, value, sub, filter }) => {
          const active = filter && stockFilter === filter;
          return (
            <button key={label} onClick={filter ? () => { setStock(s => s === filter ? '' : filter); setPage(1); } : undefined}
              className={cn('relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200', filter ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default')}
              style={{
                background: active
                  ? `linear-gradient(135deg, ${accent}22, ${accent}10)`
                  : 'rgb(var(--card))',
                border: active ? `1.5px solid ${accent}50` : '1px solid rgb(var(--s-700))',
                boxShadow: active ? `0 0 20px ${accent}20` : '0 1px 3px rgba(0,0,0,0.08)',
              }}>
              {/* Large watermark icon */}
              <div className="absolute -right-3 -bottom-3 pointer-events-none">
                <Icon className="h-20 w-20" style={{ color: accent, opacity: 0.06 }} />
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}25` }}>
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                {active && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider"
                    style={{ background: `${accent}20`, color: accent }}>
                    ON
                  </span>
                )}
              </div>

              <p className="text-3xl font-black text-surface-100 leading-none tracking-tight">{value}</p>
              <p className="text-xs font-bold text-surface-400 mt-2 uppercase tracking-widest">{label}</p>
              {sub && <p className="text-[11px] text-surface-500 mt-0.5">{sub}</p>}

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl transition-all"
                style={{ background: active ? `linear-gradient(90deg, ${accent}, transparent)` : 'transparent' }} />
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5"
        style={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--s-700))' }}>
        {/* Row 1: search + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input type="text" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, SKU, or barcode…"
              className="w-full h-9 pl-9 pr-8 rounded-xl text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              style={{ background: 'rgb(var(--s-800))', border: '1px solid rgb(var(--s-700))' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center rounded-xl overflow-hidden shrink-0"
            style={{ border: '1px solid rgb(var(--s-700))' }}>
            {[{ id: 'list', Icon: ListBulletIcon }, { id: 'grid', Icon: Squares2X2Icon }].map(({ id, Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className="h-9 w-9 flex items-center justify-center transition-all"
                style={view === id
                  ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }
                  : { color: 'rgb(var(--s-500))', background: 'transparent' }}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Column visibility picker */}
          {view === 'list' && (
            <div className="relative shrink-0">
              <button onClick={() => setColsOpen(o => !o)}
                className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                style={{ border: '1px solid rgb(var(--s-700))', background: colsOpen ? 'rgba(99,102,241,0.12)' : 'transparent', color: colsOpen ? '#a5b4fc' : 'rgb(var(--s-400))' }}>
                <FunnelIcon className="h-3.5 w-3.5" /> Columns
                {hiddenCols.size > 0 && (
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary-600 text-[9px] text-white font-black">{hiddenCols.size}</span>
                )}
              </button>
              {colsOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 rounded-xl shadow-xl border border-surface-700 overflow-hidden"
                  style={{ background: 'rgb(var(--card))', minWidth: '160px' }}>
                  {[
                    { id: 'cat',    label: 'Category / Brand' },
                    { id: 'price',  label: 'Price' },
                    { id: 'margin', label: 'Margin' },
                    { id: 'status', label: 'Status' },
                  ].map(col => (
                    <button key={col.id} onClick={() => toggleCol(col.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-700/50 transition-colors text-left">
                      <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0',
                        colVis(col.id) ? 'bg-primary-600 border-primary-500' : 'border-surface-500 bg-transparent')}>
                        {colVis(col.id) && <span className="text-white text-[10px] font-black">✓</span>}
                      </span>
                      <span className={colVis(col.id) ? 'text-surface-200' : 'text-surface-500'}>{col.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: catFilter,    set: v => { setCat(v);    setPage(1); }, label: 'Category', options: categories.map(c => ({ v: c.id, l: (c.parent_name ? `${c.parent_name} › ` : '') + c.name })) },
            { value: brandFilter,  set: v => { setBrand(v);  setPage(1); }, label: 'Brand',    options: brands.map(b => ({ v: b.id, l: b.name })) },
            { value: stockFilter,  set: v => { setStock(v);  setPage(1); }, label: 'Stock',    options: [{ v: 'in_stock', l: 'In Stock' }, { v: 'low_stock', l: 'Low Stock' }, { v: 'out_of_stock', l: 'Out of Stock' }] },
            { value: statusFilter, set: v => { setStatus(v); setPage(1); }, label: 'Status',   options: [{ v: 'active', l: 'Active' }, { v: 'inactive', l: 'Inactive' }] },
          ].map(({ value, set, label, options }) => (
            <div key={label} className="relative">
              <select value={value} onChange={e => set(e.target.value)}
                className="h-8 pl-3 pr-7 rounded-lg text-xs font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                style={{
                  background: value ? 'rgba(99,102,241,0.15)' : 'rgb(var(--s-800))',
                  border: value ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgb(var(--s-700))',
                  color: value ? '#a5b4fc' : 'rgb(var(--s-300))',
                }}>
                <option value="">All {label}s</option>
                {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
                style={{ color: value ? '#a5b4fc' : 'rgb(var(--s-500))' }} />
            </div>
          ))}

          {hasFilter && (
            <button onClick={resetFilters}
              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:bg-red-500/10"
              style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <XMarkIcon className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}

          <span className="ml-auto text-xs font-semibold text-surface-500">
            {pagination?.total ?? 0} product{(pagination?.total ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Bulk bar ───────────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <span className="flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full text-[10px] font-black text-white"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
            {selectedIds.size}
          </span>
          <span className="text-sm text-primary-300 font-semibold">{selectedIds.size} selected</span>
          <div className="h-4 w-px mx-1" style={{ background: 'rgb(var(--s-700))' }} />
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => buildCsv(products.filter(p => selectedIds.has(p.id)))}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-surface-400 hover:bg-surface-700 rounded-lg transition-colors">
            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto flex items-center gap-1 text-xs text-surface-500 hover:text-surface-300 transition-colors">
            <XMarkIcon className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {/* ── Product grid / list ─────────────────────────────────────────────── */}
      {isLoading ? (
        view === 'grid' ? <GridSkeleton /> : <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgb(var(--s-700))' }}><TableSkeleton /></div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgb(var(--s-700))' }}>
          <EmptyState icon={<CubeIcon className="h-10 w-10" />}
            title="No products found"
            description={hasFilter ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
            action={(!hasFilter && can('products', 'create'))
              ? { label: 'New Product', onClick: () => navigate('/products/new') }
              : hasFilter ? { label: 'Clear Filters', onClick: resetFilters } : null} />
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => {
            const m = calcMargin(p);
            return (
              <div key={p.id}
                className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{ border: '1px solid rgb(var(--s-700))', background: 'rgb(var(--card))' }}
                onClick={() => can('products', 'edit') && navigate(`/products/${p.id}/edit`)}>
                <div className="relative aspect-square overflow-hidden" style={{ background: 'rgb(var(--s-800))' }}>
                  {p.image
                    ? <img src={`http://localhost:3001${p.image}`} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-800 to-surface-900"><CubeIcon className="h-10 w-10 text-surface-600" /></div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2.5 left-2.5"><StockBadge status={p.stock_status} qty={p.stock_quantity} /></div>
                  {m !== null && (
                    <div className="absolute bottom-2.5 right-2.5 text-[10px] font-black px-2 py-0.5 rounded-lg backdrop-blur-sm text-white shadow-lg"
                      style={{ background: m >= 40 ? 'rgba(16,185,129,0.9)' : m >= 20 ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)' }}>
                      {m}%
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {can('products', 'edit') && (
                      <button onClick={e => { e.stopPropagation(); navigate(`/products/${p.id}/edit`); }}
                        className="h-7 w-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-primary-400 transition-colors shadow">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {can('products', 'delete') && (
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                        className="h-7 w-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-red-400 transition-colors shadow">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-black/40 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(p.id)}
                      onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                    />
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-bold text-surface-100 truncate leading-tight">{p.name}</p>
                  <p className="text-[11px] text-surface-500 font-mono mt-0.5 truncate">{p.sku}</p>
                  {p.category_name && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <TagIcon className="h-2.5 w-2.5 text-surface-600 shrink-0" />
                      <span className="text-[10px] text-surface-500 truncate">{p.category_name}</span>
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgb(var(--s-700))' }}>
                    <div>
                      <p className="text-base font-black text-surface-100">{formatCurrency(p.sale_price)}</p>
                      {p.cost_price > 0 && <p className="text-[10px] text-surface-500 mt-0.5">Cost {formatCurrency(p.cost_price)}</p>}
                    </div>
                    <Badge variant={p.is_active ? 'success' : 'neutral'} dot>{p.is_active ? 'Active' : 'Off'}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgb(var(--s-700))' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(var(--s-700))', background: 'rgb(var(--s-800))' }}>
                <th className="w-10 px-4 py-4">
                  <input type="checkbox"
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(products.map(p => p.id)) : new Set())}
                  />
                </th>
                <SortTh col="name"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-left">Product</SortTh>
                {colVis('cat')    && <th className="text-left px-4 py-4 text-[11px] font-bold text-surface-400 uppercase tracking-widest">Category / Brand</th>}
                {colVis('price')  && <SortTh col="price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right">Price</SortTh>}
                {colVis('margin') && <th className="text-center px-4 py-4 text-[11px] font-bold text-surface-400 uppercase tracking-widest">Margin</th>}
                <SortTh col="stock" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center">Stock</SortTh>
                {colVis('status') && <th className="text-center px-4 py-4 text-[11px] font-bold text-surface-400 uppercase tracking-widest">Status</th>}
                <th className="px-4 py-4 w-20" />
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const m = calcMargin(p);
                return (
                  <tr key={p.id}
                    className="transition-colors group"
                    style={{
                      borderBottom: idx < products.length - 1 ? '1px solid rgb(var(--s-700) / 0.5)' : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--s-800) / 0.5)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox"
                        className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={selectedIds.has(p.id)}
                        onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                          style={{ background: 'rgb(var(--s-700))' }}>
                          {p.image
                            ? <img src={`http://localhost:3001${p.image}`} alt={p.name} className="h-10 w-10 object-cover" />
                            : <CubeIcon className="h-5 w-5 text-surface-500" />
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
                    {colVis('cat') && (
                      <td className="px-4 py-3.5">
                        {p.category_name && <p className="text-xs text-surface-300">{p.category_name}</p>}
                        {p.brand_name    && <p className="text-xs text-surface-500 mt-0.5">{p.brand_name}</p>}
                        {!p.category_name && !p.brand_name && <span className="text-surface-600 text-xs">—</span>}
                      </td>
                    )}
                    {colVis('price') && (
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-surface-100">{formatCurrency(p.sale_price)}</p>
                        {p.cost_price > 0 && <p className="text-xs text-surface-500 mt-0.5">Cost {formatCurrency(p.cost_price)}</p>}
                      </td>
                    )}
                    {colVis('margin') && (
                      <td className="px-4 py-3.5 text-center">
                        {m !== null ? (
                          <span className={cn('text-xs font-black px-2.5 py-1 rounded-full',
                            m >= 40 ? 'bg-emerald-500/15 text-emerald-400'
                            : m >= 20 ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400')}>
                            {m}%
                          </span>
                        ) : <span className="text-surface-600 text-xs">—</span>}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-center"><StockBadge status={p.stock_status} qty={p.stock_quantity} /></td>
                    {colVis('status') && (
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant={p.is_active ? 'success' : 'neutral'} dot>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {can('products', 'edit') && (
                          <button onClick={() => setQuickEditProduct(p)} title="Quick edit"
                            className="p-2 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {can('products', 'delete') && (
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Deactivate "${deleteTarget?.name}"?`}
        description={deleteTarget?.has_transactions
          ? 'This product has sales/purchase history. It will be deactivated and hidden from POS, but all historical records will be preserved.'
          : 'This will deactivate the product and hide it from POS. No data will be deleted.'}
        variant="danger" confirmLabel="Deactivate"
      />

      <ImportCsvModal
        open={importOpen} onClose={() => setImportOpen(false)}
        onImport={handleImportCsv} entityName="Products"
        columns={['name', 'sku', 'barcode', 'description', 'unit', 'cost_price', 'sale_price', 'wholesale_price', 'tax_rate', 'stock_quantity', 'low_stock_alert', 'track_inventory', 'is_active']}
        templateFilename="products_template.csv" loading={importing}
      />

      {bulkPriceOpen && (
        <BulkPriceModal
          onClose={() => setBulkPriceOpen(false)}
          categories={categories}
          brands={brands}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['products'] });
            qc.invalidateQueries({ queryKey: ['products-stats'] });
          }}
        />
      )}

      {quickEditProduct && (
        <QuickEditModal
          product={quickEditProduct}
          onClose={() => setQuickEditProduct(null)}
        />
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3" style={{ background: 'rgb(var(--card))' }}>
      {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />)}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgb(var(--s-700))' }}>
          <div className="aspect-square skeleton" />
          <div className="p-3.5 space-y-2">
            <div className="h-4 skeleton rounded-lg w-3/4" />
            <div className="h-3 skeleton rounded-lg w-1/2" />
            <div className="h-4 skeleton rounded-lg w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
