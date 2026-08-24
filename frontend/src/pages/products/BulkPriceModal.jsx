import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  XMarkIcon, CurrencyDollarIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { productsApi } from '@api/products.api';
import { formatCurrency } from '@utils/format';
import { cn } from '@utils/cn';

const OVERLAY = { hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } };
const PANEL   = {
  hidden: { opacity: 0, scale: 0.97, y: 16 },
  show:   { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 30, stiffness: 360 } },
  exit:   { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.15, ease: 'easeIn' } },
};

const ADJUSTMENT_TYPES = [
  { value: 'pct_markup',   label: '% Markup',   hint: 'Increase price by percentage of cost' },
  { value: 'pct_change',   label: '% Change',   hint: 'Increase or decrease current price by %' },
  { value: 'flat_change',  label: 'Flat ±',     hint: 'Add or subtract a fixed amount' },
  { value: 'set_price',    label: 'Set Price',  hint: 'Set all matched products to this price' },
];

function computeNewPrice(product, adjType, adjValue) {
  const cur  = parseFloat(product.sale_price) || 0;
  const cost = parseFloat(product.cost_price) || 0;
  const val  = parseFloat(adjValue) || 0;
  switch (adjType) {
    case 'pct_markup':  return cost > 0 ? cost * (1 + val / 100) : cur;
    case 'pct_change':  return cur * (1 + val / 100);
    case 'flat_change': return cur + val;
    case 'set_price':   return val;
    default: return cur;
  }
}

export default function BulkPriceModal({ onClose, categories = [], brands = [], onDone }) {
  const [visible,    setVisible]    = useState(true);
  const [adjType,    setAdjType]    = useState('pct_change');
  const [adjValue,   setAdjValue]   = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [brdFilter,  setBrdFilter]  = useState('');
  const [stockFilter,setStockFilter]= useState('');
  const [applying,   setApplying]   = useState(false);
  const [done,       setDone]       = useState(false);

  const close = () => setVisible(false);

  const { data: prodRes, isLoading } = useQuery({
    queryKey: ['products-bulk-all'],
    queryFn: () => productsApi.list({ limit: 5000, is_active: true }),
    staleTime: 30 * 1000,
  });

  const allProducts = prodRes?.data?.products ?? prodRes?.data ?? [];

  const filtered = useMemo(() => {
    return allProducts.filter(p => {
      if (catFilter && String(p.category_id) !== catFilter) return false;
      if (brdFilter && String(p.brand_id)    !== brdFilter) return false;
      if (stockFilter === 'low')  return p.stock_quantity <= (p.low_stock_alert || 5);
      if (stockFilter === 'out')  return p.stock_quantity <= 0;
      if (stockFilter === 'ok')   return p.stock_quantity > (p.low_stock_alert || 5);
      return true;
    });
  }, [allProducts, catFilter, brdFilter, stockFilter]);

  const previewed = useMemo(() => {
    if (!adjValue) return [];
    return filtered.map(p => ({
      ...p,
      newPrice: Math.max(0, computeNewPrice(p, adjType, adjValue)),
    })).filter(p => Math.abs(p.newPrice - (parseFloat(p.sale_price) || 0)) > 0.001);
  }, [filtered, adjType, adjValue]);

  async function applyPrices() {
    if (!previewed.length) { toast.error('No products to update.'); return; }
    setApplying(true);
    let success = 0;
    let failed = 0;
    for (const p of previewed) {
      try {
        await productsApi.update(p.id, { sale_price: Math.round(p.newPrice * 100) / 100 });
        success++;
      } catch {
        failed++;
      }
    }
    setApplying(false);
    if (failed > 0) toast.error(`${failed} product(s) failed to update.`);
    if (success > 0) {
      toast.success(`${success} product price(s) updated.`);
      setDone(true);
      onDone?.();
    }
  }

  const adjLabel = ADJUSTMENT_TYPES.find(t => t.value === adjType);
  const pctTypes = ['pct_markup', 'pct_change'];
  const valuePlaceholder = pctTypes.includes(adjType) ? 'e.g. 10 (for 10%)' : 'e.g. 500';

  return (
    <AnimatePresence onExitComplete={onClose}>
    {visible && (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        variants={OVERLAY} initial="hidden" animate="show" exit="exit"
        transition={{ duration: 0.18 }}
        onClick={close}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        className="modal-surface pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        variants={PANEL} initial="hidden" animate="show" exit="exit"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <CurrencyDollarIcon className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-surface-100">Bulk Price Update</h2>
              <p className="text-xs text-surface-400">Adjust prices across multiple products at once</p>
            </div>
          </div>
          <button onClick={close} className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-400" />
            <h3 className="text-lg font-semibold text-surface-100">Prices Updated</h3>
            <p className="text-sm text-surface-400">{previewed.length} product(s) were successfully updated.</p>
            <button onClick={close}
              className="mt-2 px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="px-6 py-4 border-b border-surface-700 shrink-0 space-y-4">
              {/* Adjustment type */}
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ADJUSTMENT_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => setAdjType(t.value)}
                      className={cn(
                        'flex flex-col items-start px-3 py-2 rounded-lg border text-xs transition-colors',
                        adjType === t.value
                          ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                          : 'border-surface-600 bg-surface-800/50 text-surface-300 hover:border-surface-500',
                      )}>
                      <span className="font-semibold">{t.label}</span>
                      <span className="text-surface-500 mt-0.5 leading-tight">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Value input */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                    {adjLabel?.label} Value {pctTypes.includes(adjType) ? '(%)' : '(₨)'}
                  </label>
                  <input
                    type="number"
                    value={adjValue}
                    onChange={e => setAdjValue(e.target.value)}
                    placeholder={valuePlaceholder}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Category filter */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:border-primary-500">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Brand filter */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                    Brand
                  </label>
                  <select value={brdFilter} onChange={e => setBrdFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:border-primary-500">
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* Stock filter */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                    Stock Status
                  </label>
                  <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:border-primary-500">
                    <option value="">All Stock</option>
                    <option value="ok">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-surface-400">
                <span className="font-medium text-surface-200">{filtered.length}</span> products match filters
                {adjValue && (
                  <span className="ml-2">
                    → <span className="font-medium text-primary-400">{previewed.length}</span> prices will change
                  </span>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-surface-400 text-sm">Loading products…</div>
              ) : !adjValue ? (
                <div className="flex flex-col items-center justify-center h-32 text-surface-500 text-sm gap-1">
                  <CurrencyDollarIcon className="h-8 w-8 opacity-30" />
                  <p>Enter a value to preview price changes</p>
                </div>
              ) : previewed.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-surface-500 text-sm">
                  No price changes for the current filters &amp; value.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--card)] border-b border-surface-700">
                    <tr>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-surface-400 uppercase tracking-wider">Product</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-surface-400 uppercase tracking-wider">Current Price</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-surface-400 uppercase tracking-wider">New Price</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold text-surface-400 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {previewed.map(p => {
                      const diff = p.newPrice - (parseFloat(p.sale_price) || 0);
                      return (
                        <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-surface-100 truncate max-w-xs">{p.name}</p>
                            {p.sku && <p className="text-xs text-surface-500 font-mono">{p.sku}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-surface-400 tabular-nums">
                            {formatCurrency(p.sale_price)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-surface-100 tabular-nums">
                            {formatCurrency(p.newPrice)}
                          </td>
                          <td className={cn(
                            'px-4 py-2.5 text-right text-xs font-medium tabular-nums',
                            diff > 0 ? 'text-green-400' : 'text-red-400',
                          )}>
                            {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-surface-700 flex items-center justify-between shrink-0">
              <p className="text-xs text-surface-500">
                {previewed.length > 0 ? `${previewed.length} product(s) will be updated` : 'Preview changes above before applying'}
              </p>
              <div className="flex gap-3">
                <button onClick={close}
                  className="px-4 py-2 rounded-lg border border-surface-600 text-surface-300 text-sm hover:bg-surface-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={applyPrices}
                  disabled={applying || previewed.length === 0}
                  className={cn(
                    'px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                    previewed.length > 0 && !applying
                      ? 'bg-primary-600 hover:bg-primary-500 text-white'
                      : 'bg-surface-700 text-surface-500 cursor-not-allowed',
                  )}>
                  {applying ? `Updating… (${previewed.length})` : `Apply to ${previewed.length} Product${previewed.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
      </div>
    </>
    )}
    </AnimatePresence>
  );
}
