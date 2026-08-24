import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon, XMarkIcon, ArrowRightIcon,
  HomeIcon, CurrencyDollarIcon, ShoppingBagIcon,
  ShoppingCartIcon, ArrowsRightLeftIcon, UserGroupIcon,
  TruckIcon, ChartBarIcon, Cog6ToothIcon, TagIcon,
  BuildingStorefrontIcon, ArchiveBoxIcon, QrCodeIcon,
  BriefcaseIcon, BookOpenIcon, DocumentTextIcon,
  ShieldCheckIcon, UsersIcon, ReceiptRefundIcon,
  DocumentMagnifyingGlassIcon, CubeIcon,
} from '@heroicons/react/24/outline';
import { productsApi } from '@api/products.api';
import { salesApi }    from '@api/sales.api';
import { formatCurrency } from '@utils/format';
import { cn } from '@utils/cn';

// ── All navigable pages ───────────────────────────────────────────────────────

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',       hint: 'Analytics & overview',       icon: HomeIcon,                   path: '/dashboard' },
  { id: 'pos',         label: 'POS / Billing',   hint: 'Open point of sale',          icon: CurrencyDollarIcon,         path: '/pos' },
  { id: 'products',    label: 'Products',         hint: 'Manage inventory',            icon: ShoppingBagIcon,            path: '/products' },
  { id: 'categories',  label: 'Categories',       hint: 'Product categories',          icon: TagIcon,                    path: '/categories' },
  { id: 'brands',      label: 'Brands',           hint: 'Product brands',              icon: BuildingStorefrontIcon,     path: '/brands' },
  { id: 'barcodes',    label: 'Product Barcode',  hint: 'Generate & print barcodes',   icon: QrCodeIcon,                 path: '/barcodes' },
  { id: 'stock',       label: 'Stock Adjust',     hint: 'Adjust stock levels',         icon: ArchiveBoxIcon,             path: '/inventory/adjust' },
  { id: 'sales',       label: 'Sales',            hint: 'View transactions',           icon: ShoppingCartIcon,           path: '/sales' },
  { id: 'purchases',   label: 'Purchases',        hint: 'Purchase orders',             icon: ArrowsRightLeftIcon,        path: '/purchases' },
  { id: 'expenses',    label: 'Expenses',         hint: 'Manage expenses',             icon: DocumentTextIcon,           path: '/expenses' },
  { id: 'returns',     label: 'Returns',          hint: 'Process returns',             icon: ReceiptRefundIcon,          path: '/returns' },
  { id: 'customers',   label: 'Customers',        hint: 'Customer management',         icon: UserGroupIcon,              path: '/customers' },
  { id: 'suppliers',   label: 'Suppliers',        hint: 'Supplier management',         icon: TruckIcon,                  path: '/suppliers' },
  { id: 'reports',     label: 'Reports',          hint: 'Business analytics',          icon: ChartBarIcon,               path: '/reports' },
  { id: 'mfg',         label: 'Manufacturing',    hint: 'Production management',       icon: CubeIcon,                   path: '/manufacturing' },
  { id: 'hr',          label: 'HR & Payroll',     hint: 'Employee management',         icon: BriefcaseIcon,              path: '/hr' },
  { id: 'ledger',      label: 'Ledger',           hint: 'Accounting ledger',           icon: BookOpenIcon,               path: '/ledger' },
  { id: 'audit',       label: 'Audit Trail',      hint: 'System activity log',         icon: DocumentMagnifyingGlassIcon, path: '/audit' },
  { id: 'users',       label: 'Users',            hint: 'User management',             icon: UsersIcon,                  path: '/users' },
  { id: 'roles',       label: 'Roles',            hint: 'Permissions management',      icon: ShieldCheckIcon,            path: '/roles' },
  { id: 'settings',    label: 'Settings',         hint: 'App configuration',           icon: Cog6ToothIcon,              path: '/settings' },
];

// Show these 7 when no query is typed
const PINNED_IDS = ['dashboard', 'pos', 'products', 'sales', 'customers', 'reports', 'settings'];

// ── Export: open from any component ──────────────────────────────────────────

export function openCommandPalette() {
  document.dispatchEvent(new CustomEvent('pbc:cmd'));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); setActiveIdx(0); }, []);

  // Global Ctrl+K and custom event
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v); }
      if (e.key === 'Escape') close();
    };
    const onEvt = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pbc:cmd', onEvt);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pbc:cmd', onEvt);
    };
  }, [close]);

  // Focus input when opened
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40); }, [open]);

  // Product search
  const { data: prodRes, isFetching: prodFetching } = useQuery({
    queryKey: ['cmd-products', query],
    queryFn:  () => productsApi.list({ search: query, limit: 5, page: 1 }),
    enabled:  open && query.length >= 2,
    staleTime: 30_000,
  });

  // Sales search
  const { data: saleRes } = useQuery({
    queryKey: ['cmd-sales', query],
    queryFn:  () => salesApi.list({ search: query, limit: 3, page: 1 }),
    enabled:  open && query.length >= 2,
    staleTime: 30_000,
  });

  // Build flat items list
  const { items, groups } = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filteredPages = q
      ? PAGES.filter(p => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q))
      : PAGES.filter(p => PINNED_IDS.includes(p.id));

    const products = q.length >= 2 ? (prodRes?.data ?? []).slice(0, 5) : [];
    const sales    = q.length >= 2 ? (saleRes?.data ?? []).slice(0, 3) : [];

    let fi = 0;
    const navItems  = filteredPages.map(p => ({ ...p, type: 'nav',     fi: fi++ }));
    const prodItems = products.map(p => ({
      id: `p-${p.id}`, type: 'product', fi: fi++,
      label: p.name,
      hint:  `${p.sku || '—'} · ${formatCurrency(p.sale_price)}`,
      icon:  ShoppingBagIcon,
      path:  `/products/${p.id}/edit`,
    }));
    const saleItems = sales.map(s => ({
      id: `s-${s.id}`, type: 'sale', fi: fi++,
      label: s.reference || s.invoice_no || `Sale #${s.id}`,
      hint:  `${s.customer_name || 'Walk-in'} · ${formatCurrency(s.total_amount)}`,
      icon:  DocumentTextIcon,
      path:  `/sales/${s.id}`,
    }));

    const flat = [...navItems, ...prodItems, ...saleItems];

    const grps = [
      navItems.length  ? { label: q ? 'Pages'    : 'Quick Navigation', items: navItems  } : null,
      prodItems.length ? { label: 'Products',                           items: prodItems } : null,
      saleItems.length ? { label: 'Sales',                              items: saleItems } : null,
    ].filter(Boolean);

    return { items: flat, groups: grps };
  }, [query, prodRes, saleRes]);

  // Reset active idx on query change
  useEffect(() => setActiveIdx(0), [query]);

  // Scroll active item into view
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const go = (path) => { navigate(path); close(); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(v => Math.min(v + 1, items.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); const it = items[activeIdx]; if (it) go(it.path); }
  };

  if (!open) return null;

  const isEmpty = items.length === 0 && query.length >= 2 && !prodFetching;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center px-4"
      style={{ paddingTop: '14vh', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-[600px] rounded-2xl overflow-hidden animate-slide-down"
        style={{
          background:  'rgb(var(--card))',
          border:      '1px solid rgba(99,102,241,0.25)',
          boxShadow:   '0 40px 100px rgba(0,0,0,0.60), 0 0 0 1px rgba(99,102,241,0.08)',
        }}
      >
        {/* ── Search bar ── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid rgb(var(--s-700))' }}
        >
          <MagnifyingGlassIcon className="h-5 w-5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, products, sales…"
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder-surface-500 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button onClick={() => setQuery('')}
              className="text-surface-500 hover:text-surface-300 transition-colors p-0.5">
              <XMarkIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="text-[10px] text-surface-500 border border-surface-600 rounded px-1.5 py-0.5 font-mono leading-none">Ctrl</kbd>
              <kbd className="text-[10px] text-surface-500 border border-surface-600 rounded px-1.5 py-0.5 font-mono leading-none">K</kbd>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-500">
              <MagnifyingGlassIcon className="h-9 w-9 mb-3 opacity-25" />
              <p className="text-sm font-semibold">No results for <span className="text-surface-300">"{query}"</span></p>
              <p className="text-xs mt-1 opacity-60">Try a product name, sale reference, or page</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                  {group.label}
                </p>
                {group.items.map(item => {
                  const isActive = item.fi === activeIdx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => go(item.path)}
                      onMouseEnter={() => setActiveIdx(item.fi)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                        isActive ? '' : 'hover:bg-surface-800/40'
                      )}
                      style={isActive ? { background: 'rgba(99,102,241,0.10)' } : {}}
                    >
                      {/* Icon */}
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                            : 'rgba(99,102,241,0.10)',
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: isActive ? '#fff' : '#818cf8' }} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary-300' : 'text-surface-100')}>
                          {item.label}
                        </p>
                        {item.hint && (
                          <p className="text-[11px] text-surface-500 truncate mt-0.5">{item.hint}</p>
                        )}
                      </div>

                      {/* Arrow */}
                      {isActive && <ArrowRightIcon className="h-3.5 w-3.5 text-primary-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{
            borderTop: '1px solid rgb(var(--s-700))',
            background: 'rgba(0,0,0,0.08)',
          }}
        >
          {[
            { keys: ['↑', '↓'], label: 'Navigate' },
            { keys: ['↵'],      label: 'Open' },
            { keys: ['Esc'],    label: 'Close' },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] text-surface-500">
              {keys.map(k => (
                <kbd key={k}
                  className="border border-surface-600 rounded px-1.5 py-0.5 font-mono leading-none text-surface-400">
                  {k}
                </kbd>
              ))}
              <span>{label}</span>
            </div>
          ))}
          <span className="ml-auto text-[10px] font-semibold text-surface-600">ProBusinessCloud</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
