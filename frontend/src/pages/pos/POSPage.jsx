import { useReducer, useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon, PlusIcon, MinusIcon, XMarkIcon,
  UserIcon, TrashIcon, BanknotesIcon, PrinterIcon,
  ShoppingCartIcon, CheckCircleIcon, TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { categoriesApi } from '@api/categories.api';
import { productsApi }   from '@api/products.api';
import { customersApi }  from '@api/customers.api';
import { salesApi }      from '@api/sales.api';
import { formatCurrency } from '@utils/format';
import { cn } from '@utils/cn';
import CustomerFormModal from '@pages/customers/components/CustomerFormModal';

// ─── Cart reducer ─────────────────────────────────────────────────────────────

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(i => i.productId === action.product.id && !i.variantId);
      if (existing) {
        return state.map(i =>
          i.productId === action.product.id && !i.variantId
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...state, {
        key:        `${action.product.id}-base`,
        productId:  action.product.id,
        variantId:  null,
        name:       action.product.name,
        sku:        action.product.sku,
        unitPrice:  parseFloat(action.product.sale_price) || 0,
        costPrice:  parseFloat(action.product.cost_price) || 0,
        taxRate:    parseFloat(action.product.tax_rate)   || 0,
        stock:      action.product.stock_quantity,
        allowNeg:   !!action.product.allow_negative,
        qty:        1,
      }];
    }
    case 'SET_QTY':
      return state.map(i =>
        i.key === action.key ? { ...i, qty: Math.max(0.01, action.qty) } : i
      );
    case 'SET_PRICE':
      return state.map(i =>
        i.key === action.key ? { ...i, unitPrice: Math.max(0, action.price) } : i
      );
    case 'REMOVE':
      return state.filter(i => i.key !== action.key);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

// ─── Main POS Page ────────────────────────────────────────────────────────────

export default function POSPage() {
  const qc = useQueryClient();

  const [cart, dispatch]         = useReducer(cartReducer, []);
  const [customer, setCustomer]  = useState(null);
  const [discType, setDiscType]  = useState('flat');   // 'flat' | 'percent'
  const [discValue, setDiscValue] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [categoryId, setCategoryId]       = useState('');
  const [payOpen, setPayOpen]             = useState(false);
  const [newCustOpen, setNewCustOpen]     = useState(false);
  const [receipt, setReceipt]             = useState(null);

  const searchRef = useRef(null);

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Keyboard shortcut: F2 = focus search, F9 = open payment
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9' && cart.length > 0) { e.preventDefault(); setPayOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart.length]);

  // Data queries
  const { data: catData } = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const categories = catData?.data ?? [];

  const { data: prodData, isFetching: loadingProducts } = useQuery({
    queryKey: ['pos-products', { search: productSearch, category: categoryId }],
    queryFn:  () => productsApi.list({ search: productSearch, category: categoryId, limit: 24, status: 'active' }),
    placeholderData: keepPreviousData,
  });
  const products = prodData?.data ?? [];

  // Totals
  const subtotal   = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discFlat   = discType === 'percent'
    ? subtotal * (parseFloat(discValue) || 0) / 100
    : parseFloat(discValue) || 0;
  const taxTotal   = cart.reduce((s, i) => s + i.qty * i.unitPrice * (i.taxRate / 100), 0);
  const total      = Math.max(0, subtotal - discFlat + taxTotal);

  function addToCart(product) {
    if (product.stock_quantity <= 0 && !product.allow_negative && product.track_inventory) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }
    dispatch({ type: 'ADD', product });
  }

  const saleMutation = useMutation({
    mutationFn: (payload) => salesApi.create(payload),
    onSuccess: (res) => {
      toast.success('Sale completed!');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      setReceipt(res.data);
      dispatch({ type: 'CLEAR' });
      setCustomer(null);
      setDiscValue('');
      setPayOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  function completeSale(paymentInfo) {
    saleMutation.mutate({
      customer_id:     customer?.id ?? null,
      discount_type:   discType,
      discount_amount: parseFloat(discValue) || 0,
      paid_amount:     paymentInfo.paidAmount,
      card_amount:     paymentInfo.cardAmount ?? 0,
      payment_method:  paymentInfo.method,
      notes:           paymentInfo.notes || null,
      items: cart.map(i => ({
        product_id: i.productId,
        variant_id: i.variantId,
        quantity:   i.qty,
        unit_price: i.unitPrice,
      })),
    });
  }

  return (
    /* -m-6 escapes the p-6 from AppLayout's <div>, overflow-hidden to prevent scroll */
    <div className="flex -m-6 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── LEFT: Product Browser ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-surface-900">

        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700 bg-surface-850">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Search products by name or SKU… (F2)"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-800 border border-surface-600 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-200">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-surface-700/50">
            <button
              onClick={() => setCategoryId('')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                !categoryId
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
              )}>
              All
            </button>
            {categories.filter(c => !c.parent_id).map(c => (
              <button key={c.id}
                onClick={() => setCategoryId(categoryId === String(c.id) ? '' : String(c.id))}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  categoryId === String(c.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                )}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts && products.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-surface-500 gap-2">
              <ShoppingCartIcon className="h-10 w-10" />
              <p className="text-sm">{productSearch ? 'No products match your search.' : 'No products found.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart Panel ─────────────────────────────────────────────── */}
      <div className="w-80 xl:w-96 flex flex-col bg-surface-850 border-l border-surface-700">

        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-4 w-4 text-surface-400" />
            <span className="text-sm font-semibold text-surface-200">
              Cart {cart.length > 0 && <span className="text-primary-400">({cart.length})</span>}
            </span>
          </div>
          {cart.length > 0 && (
            <button onClick={() => { dispatch({ type: 'CLEAR' }); setCustomer(null); setDiscValue(''); }}
              className="text-xs text-surface-500 hover:text-red-400 transition-colors flex items-center gap-1">
              <TrashIcon className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-surface-600 gap-2 px-4">
              <ShoppingCartIcon className="h-8 w-8" />
              <p className="text-xs text-center">Add products from the left panel or scan a barcode.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-700/50">
              {cart.map(item => (
                <CartItem key={item.key} item={item} dispatch={dispatch} />
              ))}
            </div>
          )}
        </div>

        {/* Customer, Discount, Totals, Charge — fixed bottom section */}
        <div className="border-t border-surface-700 flex flex-col gap-0">

          {/* Customer selector */}
          <CustomerSelector
            customer={customer}
            onSelect={setCustomer}
            onClear={() => setCustomer(null)}
            onNewCustomer={() => setNewCustOpen(true)}
          />

          {/* Discount */}
          <div className="px-4 py-2.5 border-t border-surface-700/50 flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-surface-400 shrink-0" />
            <div className="flex items-center gap-1.5 flex-1">
              <button
                onClick={() => setDiscType(t => t === 'flat' ? 'percent' : 'flat')}
                className="px-2 py-1 rounded bg-surface-700 text-xs text-surface-300 hover:bg-surface-600 transition-colors shrink-0 font-mono">
                {discType === 'flat' ? '₨' : '%'}
              </button>
              <input
                type="number" min="0" step="0.01"
                value={discValue}
                onChange={e => setDiscValue(e.target.value)}
                placeholder={discType === 'flat' ? 'Flat discount' : 'Percent off'}
                className="flex-1 h-7 px-2 rounded bg-surface-700 border border-surface-600 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-surface-700/50 space-y-1.5 text-sm">
            <TotalRow label="Subtotal" value={subtotal} />
            {discFlat > 0 && <TotalRow label={`Discount (${discType === 'percent' ? discValue + '%' : ''})`} value={-discFlat} signed />}
            {taxTotal > 0 && <TotalRow label="Tax" value={taxTotal} />}
            <div className="flex justify-between pt-1.5 border-t border-surface-700 font-bold text-surface-100">
              <span>Total</span>
              <span className="text-primary-400 text-base">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Charge button */}
          <div className="px-4 pb-4">
            <button
              disabled={cart.length === 0}
              onClick={() => setPayOpen(true)}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-white transition-all',
                cart.length === 0
                  ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-500 active:scale-[0.98]'
              )}>
              {cart.length === 0 ? 'Add items to charge' : `Charge ${formatCurrency(total)} (F9)`}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {payOpen && (
        <PaymentModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          total={total}
          customer={customer}
          loading={saleMutation.isPending}
          onComplete={completeSale}
        />
      )}

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

      <CustomerFormModal
        open={newCustOpen}
        onClose={() => setNewCustOpen(false)}
        onCreated={(c) => setCustomer(c)}
      />
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }) {
  const outOfStock = product.track_inventory && !product.allow_negative && product.stock_quantity <= 0;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      className={cn(
        'relative flex flex-col rounded-xl border transition-all text-left p-3 gap-2',
        outOfStock
          ? 'border-surface-700 bg-surface-800/30 opacity-50 cursor-not-allowed'
          : 'border-surface-700 bg-surface-800 hover:border-primary-500/60 hover:bg-surface-750 active:scale-[0.97] cursor-pointer'
      )}>
      {product.image ? (
        <img src={`http://localhost:3001${product.image}`} alt={product.name}
          className="h-16 w-full object-cover rounded-lg bg-surface-700" />
      ) : (
        <div className="h-16 w-full rounded-lg bg-surface-700/60 flex items-center justify-center">
          <ShoppingCartIcon className="h-6 w-6 text-surface-500" />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-xs font-medium text-surface-100 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-xs font-bold text-primary-400">{formatCurrency(product.sale_price)}</p>
        {product.track_inventory && (
          <p className={cn('text-2xs', outOfStock ? 'text-red-400' : 'text-surface-500')}>
            {outOfStock ? 'Out of stock' : `Stock: ${product.stock_quantity}`}
          </p>
        )}
      </div>
      {!outOfStock && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlusIcon className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── Cart Item ────────────────────────────────────────────────────────────────

function CartItem({ item, dispatch }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-800/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-100 truncate">{item.name}</p>
        {/* Editable price */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-2xs text-surface-500">₨</span>
          <input
            type="number" min="0" step="0.01"
            value={item.unitPrice}
            onChange={e => dispatch({ type: 'SET_PRICE', key: item.key, price: parseFloat(e.target.value) || 0 })}
            className="w-20 h-5 px-1 text-xs text-surface-200 bg-surface-700 rounded border border-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
          />
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            if (item.qty <= 1) dispatch({ type: 'REMOVE', key: item.key });
            else dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty - 1 });
          }}
          className="h-6 w-6 rounded-md bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white hover:bg-surface-600 transition-colors">
          <MinusIcon className="h-3 w-3" />
        </button>
        <input
          type="number" min="0.01" step="1"
          value={item.qty}
          onChange={e => dispatch({ type: 'SET_QTY', key: item.key, qty: parseFloat(e.target.value) || 1 })}
          className="w-10 h-6 text-center text-xs text-surface-100 bg-surface-700 rounded border border-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          onClick={() => dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty + 1 })}
          className="h-6 w-6 rounded-md bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white hover:bg-surface-600 transition-colors">
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Line total */}
      <span className="text-xs font-semibold text-surface-100 w-16 text-right shrink-0">
        {formatCurrency(item.qty * item.unitPrice)}
      </span>

      {/* Remove */}
      <button onClick={() => dispatch({ type: 'REMOVE', key: item.key })}
        className="text-surface-600 hover:text-red-400 transition-colors shrink-0">
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Customer Selector ────────────────────────────────────────────────────────

function CustomerSelector({ customer, onSelect, onClear, onNewCustomer }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef(null);

  const { data } = useQuery({
    queryKey: ['cust-search', query],
    queryFn:  () => customersApi.search(query),
    enabled:  open,
  });
  const results = data?.data ?? [];

  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (customer) {
    return (
      <div className="px-4 py-2.5 border-t border-surface-700/50 flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-primary-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-surface-100 truncate">{customer.name}</p>
          {customer.phone && <p className="text-2xs text-surface-500">{customer.phone}</p>}
        </div>
        {customer.current_balance > 0 && (
          <span className="text-xs text-red-400 shrink-0">
            Due: {formatCurrency(customer.current_balance)}
          </span>
        )}
        <button onClick={onClear} className="text-surface-600 hover:text-red-400 transition-colors shrink-0">
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-4 py-2.5 border-t border-surface-700/50 relative">
      <div className="flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-surface-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Walk-in / Search customer…"
          className="flex-1 h-7 px-2 rounded bg-surface-700 border border-surface-600 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button onClick={onNewCustomer}
          className="text-primary-400 hover:text-primary-300 transition-colors shrink-0" title="New customer">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute bottom-full left-4 right-4 mb-1 rounded-lg border border-surface-600 bg-surface-800 shadow-xl z-20 overflow-hidden">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-surface-400">{query ? 'No customers found.' : 'Type to search customers…'}</p>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {results.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-700 transition-colors text-left">
                  <div>
                    <p className="text-xs font-medium text-surface-100">{c.name}</p>
                    {c.phone && <p className="text-2xs text-surface-500">{c.phone}</p>}
                  </div>
                  {c.current_balance > 0 && (
                    <span className="text-2xs text-red-400 ml-2 shrink-0">Due: {formatCurrency(c.current_balance)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const METHODS = [
  { value: 'cash',   label: 'Cash' },
  { value: 'card',   label: 'Card' },
  { value: 'split',  label: 'Split' },
  { value: 'credit', label: 'Credit' },
];

function PaymentModal({ open, onClose, total, customer, loading, onComplete }) {
  const [method, setMethod]     = useState('cash');
  const [cashPaid, setCashPaid] = useState('');
  const [cardAmt, setCardAmt]   = useState('');
  const [notes, setNotes]       = useState('');

  const cashAmount = parseFloat(cashPaid) || 0;
  const cardAmount = parseFloat(cardAmt)  || 0;

  const paid = method === 'cash'   ? cashAmount
             : method === 'card'   ? total
             : method === 'split'  ? cashAmount + cardAmount
             : 0; // credit

  const change = Math.max(0, paid - total);
  const due    = method === 'credit' ? total : Math.max(0, total - paid);
  const canPay = method === 'credit'
    ? !!customer
    : method === 'cash'  ? cashAmount >= total
    : method === 'card'  ? true
    : cashAmount + cardAmount >= total;

  function handlePay() {
    onComplete({ method, paidAmount: paid, cardAmount, notes });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl border border-surface-600 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-surface-100">Payment</h2>
          <div className="text-2xl font-bold text-primary-400">{formatCurrency(total)}</div>
        </div>

        {/* Method tabs */}
        <div className="flex p-4 gap-2">
          {METHODS.map(m => (
            <button key={m.value}
              onClick={() => { setMethod(m.value); setCashPaid(''); setCardAmt(''); }}
              disabled={m.value === 'credit' && !customer}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                method === m.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-700 text-surface-300 hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed'
              )}>
              {m.label}
              {m.value === 'credit' && !customer && <span className="block text-2xs opacity-60">(needs customer)</span>}
            </button>
          ))}
        </div>

        {/* Method-specific inputs */}
        <div className="px-4 pb-2 space-y-3">
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Amount Received (₨)</label>
                <input
                  type="number" min={total} step="1" autoFocus
                  value={cashPaid}
                  onChange={e => setCashPaid(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canPay && handlePay()}
                  placeholder={total.toFixed(2)}
                  className="w-full h-14 px-4 text-2xl font-bold text-center rounded-xl bg-surface-700 border border-surface-600 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {cashAmount > 0 && (
                <div className={cn(
                  'flex justify-between px-4 py-3 rounded-xl text-lg font-bold',
                  change > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-surface-700'
                )}>
                  <span className="text-surface-300 text-sm font-medium self-center">Change</span>
                  <span className={change > 0 ? 'text-green-400' : 'text-surface-400'}>
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2000, 5000].map(amt => (
                  <button key={amt} type="button"
                    onClick={() => setCashPaid(String(amt))}
                    className="py-1.5 rounded-lg bg-surface-700 text-xs text-surface-300 hover:bg-surface-600 transition-colors">
                    ₨{amt}
                  </button>
                ))}
                <button type="button"
                  onClick={() => setCashPaid(String(Math.ceil(total)))}
                  className="col-span-4 py-1.5 rounded-lg bg-surface-700 text-xs text-primary-400 hover:bg-surface-600 transition-colors">
                  Exact: {formatCurrency(Math.ceil(total))}
                </button>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-16 w-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                <CheckCircleIcon className="h-8 w-8 text-primary-400" />
              </div>
              <p className="text-surface-300 text-sm">Charge <strong className="text-surface-100">{formatCurrency(total)}</strong> to card</p>
            </div>
          )}

          {method === 'split' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Cash (₨)</label>
                <input type="number" min="0" step="1" value={cashPaid} onChange={e => setCashPaid(e.target.value)}
                  className="w-full h-10 px-3 text-right rounded-lg bg-surface-700 border border-surface-600 text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Card (₨)</label>
                <input type="number" min="0" step="1" value={cardAmt} onChange={e => setCardAmt(e.target.value)}
                  className="w-full h-10 px-3 text-right rounded-lg bg-surface-700 border border-surface-600 text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm" />
              </div>
              {cashAmount + cardAmount > 0 && (
                <div className="col-span-2 flex justify-between text-sm px-1">
                  <span className="text-surface-400">Remaining:</span>
                  <span className={due > 0 ? 'text-red-400' : 'text-green-400'}>{formatCurrency(due)}</span>
                </div>
              )}
            </div>
          )}

          {method === 'credit' && customer && (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <p className="text-sm text-surface-300 text-center">
                <strong className="text-surface-100">{formatCurrency(total)}</strong> will be added to
                <strong className="text-yellow-400"> {customer.name}</strong>'s account.
              </p>
            </div>
          )}

          {/* Notes */}
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Sale notes (optional)…"
            className="w-full h-8 px-3 rounded-lg bg-surface-700 border border-surface-600 text-xs text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 pt-2">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-surface-700 text-surface-300 hover:bg-surface-600 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handlePay} disabled={!canPay || loading}
            className={cn(
              'flex-2 flex-1 h-11 rounded-xl text-white font-semibold text-sm transition-all',
              canPay && !loading
                ? 'bg-primary-600 hover:bg-primary-500'
                : 'bg-surface-700 text-surface-500 cursor-not-allowed'
            )}>
            {loading ? 'Processing…' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose }) {
  function print() { window.print(); }

  const items = receipt.items ?? [];
  const date  = new Date(receipt.sale_date || receipt.created_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white text-gray-900 rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full" id="receipt">

        {/* Header */}
        <div className="text-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">SAS Garments</h2>
          <p className="text-xs text-gray-500 mt-1">Point of Sale Receipt</p>
          <p className="text-xs text-gray-500">{date.toLocaleString('en-PK')}</p>
        </div>

        {/* Info */}
        <div className="px-5 py-3 text-xs border-b border-gray-200 grid grid-cols-2 gap-1">
          <span className="text-gray-500">Reference:</span>
          <span className="font-mono font-bold text-right">{receipt.reference}</span>
          {receipt.customer_name && <>
            <span className="text-gray-500">Customer:</span>
            <span className="text-right">{receipt.customer_name}</span>
          </>}
          <span className="text-gray-500">Cashier:</span>
          <span className="text-right">{receipt.cashier_name}</span>
          <span className="text-gray-500">Payment:</span>
          <span className="text-right capitalize">{receipt.payment_method}</span>
        </div>

        {/* Items */}
        <div className="px-5 py-3 border-b border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 text-gray-500 font-medium">Item</th>
                <th className="text-right py-1 text-gray-500 font-medium">Qty</th>
                <th className="text-right py-1 text-gray-500 font-medium">Price</th>
                <th className="text-right py-1 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1.5">
                    <p className="font-medium">{item.product_name}</p>
                    {(item.size || item.color) && (
                      <p className="text-gray-400">{[item.size, item.color].filter(Boolean).join(' ')}</p>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-gray-600">{parseInt(item.quantity, 10)}</td>
                  <td className="py-1.5 text-right text-gray-600">₨{Number(item.unit_price).toFixed(0)}</td>
                  <td className="py-1.5 text-right font-medium">₨{Number(item.total ?? item.subtotal).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 py-3 border-b border-gray-200 text-xs space-y-1">
          <ReceiptRow label="Subtotal" value={receipt.subtotal} />
          {receipt.discount_amount > 0 && <ReceiptRow label="Discount" value={-receipt.discount_amount} />}
          {receipt.tax_amount > 0 && <ReceiptRow label="Tax" value={receipt.tax_amount} />}
          <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-gray-200">
            <span>Total</span>
            <span>₨{Number(receipt.total_amount).toFixed(0)}</span>
          </div>
          <ReceiptRow label="Paid" value={receipt.paid_amount} />
          {receipt.change_amount > 0 && <ReceiptRow label="Change" value={receipt.change_amount} />}
          {receipt.due_amount   > 0 && <ReceiptRow label="Due" value={receipt.due_amount} className="text-red-600 font-semibold" />}
        </div>

        {/* Footer */}
        <div className="text-center px-5 py-4 text-2xs text-gray-400">
          Thank you for shopping with us!
        </div>

        {/* Actions (hidden when printing) */}
        <div className="flex gap-3 px-5 pb-5 print:hidden">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors">
            Close
          </button>
          <button onClick={print}
            className="flex-1 h-10 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
            <PrinterIcon className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, className = '' }) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span className="text-gray-500">{label}</span>
      <span>₨{Math.abs(Number(value)).toFixed(0)}</span>
    </div>
  );
}

function TotalRow({ label, value, signed = false }) {
  const display = signed && value < 0
    ? `−${formatCurrency(Math.abs(value))}`
    : formatCurrency(value);
  return (
    <div className="flex justify-between text-sm">
      <span className="text-surface-400">{label}</span>
      <span className={cn('text-surface-300', signed && value < 0 && 'text-green-400')}>{display}</span>
    </div>
  );
}
