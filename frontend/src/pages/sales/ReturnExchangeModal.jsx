import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  XMarkIcon, ArrowPathIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { returnsApi } from '@api/returns.api';
import { productsApi } from '@api/products.api';
import { formatCurrency } from '@utils/format';
import { cn } from '@utils/cn';

const REFUND_METHODS = ['cash', 'card', 'bank_transfer', 'store_credit'];

// ─── inline product search dropdown ──────────────────────────────────────────

function ProductSearch({ onSelect }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  const { data } = useQuery({
    queryKey: ['product-search-exchange', q],
    queryFn:  () => productsApi.list({ search: q, limit: 10, is_active: true }),
    enabled:  q.length >= 1,
  });

  const products = data?.data?.products ?? data?.data ?? [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (p) => {
    onSelect(p);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex-1">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q && setOpen(true)}
          placeholder="Search product…"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-700 border border-surface-600 text-surface-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      {open && products.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-surface-600 bg-surface-800 shadow-card-lg max-h-48 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-700 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-surface-100 truncate">{p.name}</p>
                <p className="text-[10px] text-surface-400 font-mono">{p.sku}</p>
              </div>
              <span className="shrink-0 text-xs text-surface-400 ml-auto pt-0.5">
                {formatCurrency(p.sale_price)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main modal ───────────────────────────────────────────────────────────────

export default function ReturnExchangeModal({ sale, onClose, onSuccess }) {
  const [type,         setType]         = useState('return');
  const [reason,       setReason]       = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');

  // Each row: { sale_item_id, product_name, max_qty, qty, unit_price }
  const [returnRows, setReturnRows] = useState(() =>
    (sale?.items ?? []).map((item) => ({
      sale_item_id:  item.id,
      product_name:  item.product_name,
      variant_label: [item.size, item.color].filter(Boolean).join(' · '),
      max_qty:       parseFloat(item.quantity),
      qty:           0,
      unit_price:    parseFloat(item.unit_price),
    }))
  );

  // Each row: { product_id, product_name, sku, quantity, unit_price }
  const [exchangeRows, setExchangeRows] = useState([]);

  const mutation = useMutation({
    mutationFn: returnsApi.create,
    onSuccess: (res) => {
      toast.success(res.message ?? 'Return processed.');
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to process return.'),
  });

  // ── computed totals
  const returnTotal   = returnRows.reduce((s, r) => s + r.qty * r.unit_price, 0);
  const exchangeTotal = exchangeRows.reduce((s, r) => s + parseFloat(r.quantity || 0) * parseFloat(r.unit_price || 0), 0);
  const net           = returnTotal - exchangeTotal;

  const setReturnQty = (idx, raw) => {
    const val = Math.min(Math.max(0, parseFloat(raw) || 0), returnRows[idx].max_qty);
    setReturnRows((rows) => rows.map((r, i) => i === idx ? { ...r, qty: val } : r));
  };

  const addExchangeRow = (product) => {
    setExchangeRows((rows) => [
      ...rows,
      {
        product_id:   product.id,
        product_name: product.name,
        sku:          product.sku,
        quantity:     1,
        unit_price:   parseFloat(product.sale_price) || 0,
      },
    ]);
  };

  const updateExchangeRow = (idx, field, value) => {
    setExchangeRows((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeExchangeRow = (idx) => {
    setExchangeRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedReturnItems = returnRows.filter((r) => r.qty > 0);
    if (!selectedReturnItems.length) {
      toast.error('Select at least one item to return.');
      return;
    }
    if (type === 'exchange' && !exchangeRows.length) {
      toast.error('Add at least one exchange item.');
      return;
    }

    mutation.mutate({
      sale_id:        sale.id,
      type,
      reason,
      refund_method:  refundMethod,
      return_items:   selectedReturnItems.map((r) => ({
        sale_item_id: r.sale_item_id,
        quantity:     r.qty,
      })),
      exchange_items: type === 'exchange'
        ? exchangeRows.map((r) => ({
            product_id: r.product_id,
            variant_id: r.variant_id ?? null,
            quantity:   parseFloat(r.quantity),
            unit_price: parseFloat(r.unit_price),
          }))
        : [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 shrink-0">
          <div>
            <h3 className="text-surface-100 font-semibold">Return / Exchange</h3>
            <p className="text-xs text-surface-400 mt-0.5">Sale {sale?.reference}</p>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 p-1">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Type toggle */}
            <div className="flex gap-2">
              {['return', 'exchange'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                    type === t
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-800 text-surface-400 hover:text-surface-100'
                  )}
                >
                  {t === 'exchange' ? '⇄ Exchange' : '↩ Return'}
                </button>
              ))}
            </div>

            {/* Return items */}
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                Items Being Returned
              </h4>
              <div className="space-y-1.5">
                {returnRows.map((row, idx) => (
                  <div key={row.sale_item_id} className="flex items-center gap-3 bg-surface-800 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{row.product_name}</p>
                      {row.variant_label && (
                        <p className="text-xs text-surface-500">{row.variant_label}</p>
                      )}
                    </div>
                    <div className="text-xs text-surface-400 shrink-0">
                      {formatCurrency(row.unit_price)} × max {row.max_qty}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={row.max_qty}
                      step="1"
                      value={row.qty || ''}
                      onChange={(e) => setReturnQty(idx, e.target.value)}
                      placeholder="0"
                      className="w-16 text-center text-sm bg-surface-700 border border-surface-600 text-surface-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Exchange items */}
            {type === 'exchange' && (
              <div>
                <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Items Given in Exchange
                </h4>
                <div className="space-y-1.5">
                  {exchangeRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-800 rounded-lg px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-100 truncate">{row.product_name}</p>
                        <p className="text-[10px] text-surface-500 font-mono">{row.sku}</p>
                      </div>
                      <input
                        type="number" min="1" step="1"
                        value={row.quantity}
                        onChange={(e) => updateExchangeRow(idx, 'quantity', e.target.value)}
                        className="w-14 text-center text-sm bg-surface-700 border border-surface-600 text-surface-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <input
                        type="number" min="0" step="0.01"
                        value={row.unit_price}
                        onChange={(e) => updateExchangeRow(idx, 'unit_price', e.target.value)}
                        className="w-24 text-sm bg-surface-700 border border-surface-600 text-surface-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button type="button" onClick={() => removeExchangeRow(idx)}
                        className="p-1 text-surface-400 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ProductSearch onSelect={addExchangeRow} />
                  <button
                    type="button"
                    onClick={() => setExchangeRows((r) => [
                      ...r,
                      { product_id: '', product_name: 'Custom item', sku: '', quantity: 1, unit_price: 0 }
                    ])}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs text-surface-400 hover:text-surface-100 bg-surface-800 border border-surface-700 rounded-lg"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Manual
                  </button>
                </div>
              </div>
            )}

            {/* Reason + refund method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-surface-400 mb-1">Reason</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Wrong size, defect…"
                  className="w-full text-sm bg-surface-800 border border-surface-700 text-surface-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-1">Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full text-sm bg-surface-800 border border-surface-700 text-surface-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {REFUND_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary */}
            {returnTotal > 0 && (
              <div className="bg-surface-800 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-surface-300">
                  <span>Return value</span>
                  <span className="text-green-400 font-medium">{formatCurrency(returnTotal)}</span>
                </div>
                {type === 'exchange' && (
                  <div className="flex justify-between text-surface-300">
                    <span>Exchange value</span>
                    <span className="text-amber-400 font-medium">− {formatCurrency(exchangeTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-surface-700">
                  <span className="text-surface-200">
                    {net >= 0 ? 'Refund to customer' : 'Customer pays'}
                  </span>
                  <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatCurrency(Math.abs(net))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-800 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-surface-400 hover:text-surface-100 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || returnRows.every((r) => r.qty === 0)}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {mutation.isPending ? 'Processing…' : type === 'exchange' ? 'Process Exchange' : 'Process Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
