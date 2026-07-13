import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Select from '@components/common/Select';
import Textarea from '@components/common/Textarea';
import SearchInput from '@components/common/SearchInput';
import { suppliersApi } from '@api/suppliers.api';
import { productsApi } from '@api/products.api';
import { purchasesApi } from '@api/purchases.api';
import { formatCurrency } from '@utils/format';

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

  // Header fields
  const [supplierId, setSupplierId]   = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus]           = useState('received');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount]   = useState('');
  const [discount, setDiscount]       = useState(0);
  const [tax, setTax]                 = useState(0);
  const [shipping, setShipping]       = useState(0);
  const [notes, setNotes]             = useState('');

  // Line items
  const [items, setItems] = useState([]);

  // Product search
  const [productSearch, setProductSearch] = useState('');

  const { data: suppData } = useQuery({ queryKey: ['suppliers-flat'], queryFn: suppliersApi.flat });
  const suppliers = suppData?.data ?? [];

  const { data: prodData, isFetching: searchingProducts } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn:  () => productsApi.list({ search: productSearch, limit: 10 }),
    enabled:  productSearch.length >= 2,
  });
  const searchResults = prodData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data) => purchasesApi.create(data),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/purchases');
    },
    onError: (err) => toast.error(err.message),
  });

  function addProduct(product) {
    const already = items.find(i => i.product_id === product.id && !i.variant_id);
    if (already) {
      setItems(items.map(i =>
        i.product_id === product.id && !i.variant_id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_cost }
          : i
      ));
    } else {
      setItems([...items, {
        product_id:   product.id,
        variant_id:   null,
        product_name: product.name,
        product_sku:  product.sku,
        quantity:     1,
        unit_cost:    parseFloat(product.cost_price) || 0,
        subtotal:     parseFloat(product.cost_price) || 0,
      }]);
    }
    setProductSearch('');
  }

  function updateItem(idx, field, value) {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.subtotal = updated.quantity * updated.unit_cost;
      return updated;
    }));
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal    = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const discAmt     = parseFloat(discount) || 0;
  const taxAmt      = parseFloat(tax) || 0;
  const shipAmt     = parseFloat(shipping) || 0;
  const totalAmount = subtotal - discAmt + taxAmt + shipAmt;
  const paidAmt     = parseFloat(paidAmount) || 0;
  const dueAmount   = Math.max(0, totalAmount - paidAmt);

  function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) { toast.error('Add at least one product.'); return; }

    mutation.mutate({
      supplier_id:     supplierId || null,
      purchase_date:   purchaseDate,
      status,
      payment_method:  paymentMethod,
      paid_amount:     paidAmt,
      discount_amount: discAmt,
      tax_amount:      taxAmt,
      shipping_cost:   shipAmt,
      notes: notes.trim() || null,
      items: items.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        quantity:   parseFloat(i.quantity),
        unit_cost:  parseFloat(i.unit_cost),
        subtotal:   parseFloat(i.subtotal),
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-surface-100">New Purchase</h1>
          <p className="text-sm text-surface-400 mt-0.5">Record inventory received from a supplier.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — items */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Product search */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Add Products
              </h2>
              <div className="relative">
                <SearchInput
                  value={productSearch}
                  onChange={setProductSearch}
                  placeholder="Search by name or SKU…"
                />
                {productSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-surface-600 bg-surface-800 shadow-xl overflow-hidden">
                    {searchingProducts ? (
                      <div className="p-3 text-sm text-surface-400">Searching…</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-surface-400">No products found.</div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto">
                        {searchResults.map(p => (
                          <button key={p.id} type="button"
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-700 transition-colors text-left">
                            <div>
                              <p className="text-sm font-medium text-surface-100">{p.name}</p>
                              <p className="text-xs text-surface-500 font-mono">{p.sku}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs text-surface-400">Cost: {formatCurrency(p.cost_price)}</p>
                              <p className="text-xs text-surface-500">Stock: {p.stock_quantity}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items table */}
              {items.length > 0 ? (
                <div className="rounded-lg border border-surface-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-800/60 border-b border-surface-700">
                        <th className="text-left px-3 py-2 text-surface-400 font-medium">Product</th>
                        <th className="text-right px-3 py-2 text-surface-400 font-medium w-20">Qty</th>
                        <th className="text-right px-3 py-2 text-surface-400 font-medium w-28">Unit Cost</th>
                        <th className="text-right px-3 py-2 text-surface-400 font-medium w-28">Subtotal</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-700/50">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-800/20">
                          <td className="px-3 py-2">
                            <p className="font-medium text-surface-100">{item.product_name}</p>
                            <p className="text-xs text-surface-500 font-mono">{item.product_sku}</p>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0.01" step="0.01"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full text-right px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" step="0.01"
                              value={item.unit_cost}
                              onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-full text-right px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-surface-100">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="px-1 py-2">
                            <button type="button" onClick={() => removeItem(idx)}
                              className="p-1 text-surface-500 hover:text-red-400 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-surface-600 text-surface-500 text-sm">
                  Search and add products above
                </div>
              )}
            </div>

            <Textarea label="Notes" rows={2} placeholder="Optional purchase notes…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Right — details + totals */}
          <div className="flex flex-col gap-5">
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Purchase Details
              </h2>
              <Select label="Supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)}
                placeholder="Walk-in / Unknown">
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Input label="Purchase Date" type="date" value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)} />
              <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="received">Received (stock updated)</option>
                <option value="ordered">Ordered (stock pending)</option>
              </Select>
            </div>

            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Payment
              </h2>
              <Select label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="credit">Credit (Pay Later)</option>
              </Select>
              <Input label="Amount Paid (₨)" type="number" step="0.01" min="0"
                value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                placeholder="0.00 = full credit" />
            </div>

            <div className="card space-y-3">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Totals
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Discount (₨)" type="number" step="0.01" min="0"
                  value={discount} onChange={e => setDiscount(e.target.value)} />
                <Input label="Tax (₨)" type="number" step="0.01" min="0"
                  value={tax} onChange={e => setTax(e.target.value)} />
                <Input label="Shipping (₨)" type="number" step="0.01" min="0"
                  value={shipping} onChange={e => setShipping(e.target.value)} />
              </div>
              <div className="border-t border-surface-700 pt-3 space-y-1.5 text-sm">
                <TotalRow label="Subtotal"   value={subtotal} />
                {discAmt > 0 && <TotalRow label="Discount (-)" value={discAmt} className="text-green-400" />}
                {taxAmt  > 0 && <TotalRow label="Tax (+)"      value={taxAmt} />}
                {shipAmt > 0 && <TotalRow label="Shipping (+)" value={shipAmt} />}
                <div className="border-t border-surface-700 pt-1.5 flex justify-between font-semibold text-surface-100">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <TotalRow label="Paid"    value={paidAmt}   className={paidAmt > 0 ? 'text-green-400' : ''} />
                <TotalRow label="Due"     value={dueAmount} className={dueAmount > 0 ? 'text-red-400 font-medium' : 'text-surface-400'} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" loading={mutation.isPending} disabled={items.length === 0} className="w-full">
                Create Purchase
              </Button>
              <Button variant="ghost" type="button" className="w-full" onClick={() => navigate('/purchases')} disabled={mutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function TotalRow({ label, value, className = 'text-surface-400' }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
