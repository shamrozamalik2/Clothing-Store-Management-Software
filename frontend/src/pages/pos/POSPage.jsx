import { useReducer, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon, PlusIcon, MinusIcon, XMarkIcon,
  UserIcon, TrashIcon, BanknotesIcon, PrinterIcon,
  ShoppingCartIcon, CheckCircleIcon,
  CreditCardIcon, ArchiveBoxIcon, SparklesIcon,
  ArrowsRightLeftIcon, ClockIcon, ReceiptPercentIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { categoriesApi } from '@api/categories.api';
import { productsApi }   from '@api/products.api';
import { customersApi }  from '@api/customers.api';
import { salesApi }      from '@api/sales.api';
import { holdsApi }      from '@api/holds.api';
import { settingsApi }   from '@api/settings.api';
import { formatCurrency } from '@utils/format';
import { printReceipt } from '@utils/printReceipt';
import { cn } from '@utils/cn';
import { formatQty } from '@utils/formatQty';
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
        discount:   0,
        notes:      '',
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
    case 'ADD_VARIANT': {
      const key = `${action.item.productId}-${action.item.variantId}`;
      const existing = state.find(i => i.key === key);
      if (existing) return state.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      return [...state, { qty: 1, notes: '', discount: 0, ...action.item, key }];
    }
    case 'SET_DISCOUNT':
      return state.map(i => i.key === action.key ? { ...i, discount: Math.max(0, action.discount) } : i);
    case 'SET_NOTES':
      return state.map(i => i.key === action.key ? { ...i, notes: action.notes } : i);
    default:
      return state;
  }
}

// ─── Main POS Page ────────────────────────────────────────────────────────────

export default function POSPage() {
  const qc = useQueryClient();

  const [cart, dispatch]           = useReducer(cartReducer, []);
  const [customer, setCustomer]    = useState(null);
  const [discType, setDiscType]    = useState('flat');
  const [discValue, setDiscValue]  = useState('');
  const [productSearch, setProductSearch]   = useState('');
  const [categoryId, setCategoryId]         = useState('');
  const [payOpen, setPayOpen]               = useState(false);
  const [newCustOpen, setNewCustOpen]       = useState(false);
  const [receipt, setReceipt]               = useState(null);
  const [holdsOpen, setHoldsOpen]           = useState(false);
  const [recentProds, setRecentProds]       = useState([]);
  const [searchDropOpen, setSearchDropOpen] = useState(false);
  const [variantPickerProduct, setVariantPickerProduct] = useState(null);
  const variantsCache = useRef(new Map());
  const [clock, setClock] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  const searchRef     = useRef(null);
  const searchWrapRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    function handler(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target))
        setSearchDropOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9' && cart.length > 0) { e.preventDefault(); setPayOpen(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart.length]);

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setClock(d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const { data: catData } = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const categories = catData?.data ?? [];

  const { data: prodData, isFetching: loadingProducts } = useQuery({
    queryKey: ['pos-products', { search: productSearch, category: categoryId }],
    queryFn:  () => productsApi.list({ search: productSearch, category: categoryId, limit: 24, status: 'active' }),
    placeholderData: keepPreviousData,
  });
  const products = prodData?.data ?? [];

  const subtotal = cart.reduce((s, i) => s + Math.max(0, i.qty * i.unitPrice - (i.discount || 0)), 0);
  const discFlat = discType === 'percent'
    ? subtotal * (parseFloat(discValue) || 0) / 100
    : parseFloat(discValue) || 0;
  const taxTotal = cart.reduce((s, i) => s + i.qty * i.unitPrice * (i.taxRate / 100), 0);
  const total    = Math.max(0, subtotal - discFlat + taxTotal);
  const cartUnitCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(product) {
    if (product.stock_quantity <= 0 && !product.allow_negative && product.track_inventory) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }
    dispatch({ type: 'ADD', product });
    setRecentProds(prev => [product, ...prev.filter(p => p.id !== product.id)].slice(0, 6));
  }

  async function handleProductClick(product) {
    if (product.stock_quantity <= 0 && !product.allow_negative && product.track_inventory) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }
    if (variantsCache.current.has(product.id)) {
      const cached = variantsCache.current.get(product.id);
      if (cached.length > 0) { setVariantPickerProduct({ product, variants: cached }); return; }
      addToCart(product);
      return;
    }
    try {
      const res = await productsApi.listVariants(product.id);
      const variants = res?.data ?? [];
      variantsCache.current.set(product.id, variants);
      if (variants.length > 0) { setVariantPickerProduct({ product, variants }); return; }
    } catch { /* ignore, fall through */ }
    addToCart(product);
    setRecentProds(prev => [product, ...prev.filter(p => p.id !== product.id)].slice(0, 6));
  }

  const barcodeMut = useMutation({
    mutationFn: (code) => productsApi.getByBarcode(code),
    onSuccess: (res) => {
      const p = res?.data;
      if (!p) { toast.error('No product found for this barcode.'); return; }
      handleProductClick(p);
      setProductSearch('');
      setSearchDropOpen(false);
    },
    onError: () => toast.error('No product found for this barcode.'),
  });

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
        discount:   i.discount || 0,
        notes:      i.notes   || null,
      })),
    });
  }

  return (
    <div className="flex -m-6 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── LEFT: Product Browser ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-surface-950" style={{ background: 'var(--app-bg, #09090f)' }}>

        {/* Session bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-surface-700/40"
          style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.09) 0%, rgba(12,12,24,0.98) 100%)' }}>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-3.5 w-3.5 text-primary-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-primary-400">POS Terminal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-surface-600">
              <ClockIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-mono">{clock}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-surface-600 border border-surface-700/80 bg-surface-800/60">F2</kbd>
              <span className="text-[10px] text-surface-700">Search</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-primary-500 border border-primary-500/30 bg-primary-500/5">F9</kbd>
              <span className="text-[10px] text-surface-700">Pay</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-surface-700/40 bg-surface-900/60">
          <div ref={searchWrapRef} className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setSearchDropOpen(true); }}
              onFocus={() => productSearch.length >= 2 && setSearchDropOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && productSearch.trim()) {
                  e.preventDefault();
                  if (searchDropOpen && products.length > 0) {
                    handleProductClick(products[0]);
                    setProductSearch(''); setSearchDropOpen(false);
                  } else {
                    barcodeMut.mutate(productSearch.trim());
                  }
                }
              }}
              placeholder="Search or scan barcode + Enter…"
              className="w-full h-10 pl-10 pr-10 rounded-xl bg-surface-800/90 border border-surface-600/60 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/40 transition-all"
            />
            {productSearch ? (
              <button onClick={() => { setProductSearch(''); setSearchDropOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-200 transition-colors">
                <XMarkIcon className="h-4 w-4" />
              </button>
            ) : (
              <QrCodeIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-700 pointer-events-none" />
            )}

            {/* Instant search dropdown */}
            {searchDropOpen && productSearch.length >= 2 && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-surface-600/70 bg-surface-800 shadow-2xl z-30 overflow-hidden">
                <div className="px-3 py-2 border-b border-surface-700/40">
                  <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">Quick Add</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {products.slice(0, 7).map(p => {
                    const oos = p.track_inventory && !p.allow_negative && p.stock_quantity <= 0;
                    return (
                      <button key={p.id} type="button"
                        disabled={oos}
                        onClick={() => { handleProductClick(p); setProductSearch(''); setSearchDropOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-surface-700/20 last:border-0',
                          oos ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-700/50 active:bg-surface-700'
                        )}>
                        {p.image ? (
                          <img src={`http://localhost:3001${p.image}`} alt={p.name}
                            className="h-10 w-10 rounded-xl object-cover shrink-0 bg-surface-700" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-surface-700/70 flex items-center justify-center shrink-0">
                            <ShoppingCartIcon className="h-4 w-4 text-surface-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-100 truncate">{p.name}</p>
                          {p.sku && <p className="text-xs text-surface-500 font-mono">SKU: {p.sku}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary-400">{formatCurrency(p.sale_price)}</p>
                          {p.track_inventory && (
                            <p className={cn('text-xs', oos ? 'text-red-400' : 'text-surface-500')}>
                              {oos ? 'Out of stock' : `${formatQty(p.stock_quantity)} left`}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {products.length > 7 && (
                  <div className="px-3 py-2 border-t border-surface-700/40 text-center bg-surface-800/80">
                    <p className="text-[10px] text-surface-500">{products.length - 7} more results below ↓</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-surface-700/30">
            <button
              onClick={() => setCategoryId('')}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                !categoryId
                  ? 'text-white shadow-lg shadow-primary-500/20'
                  : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 hover:bg-surface-700/80 border border-surface-700/50'
              )}
              style={!categoryId ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
            >
              All
            </button>
            {categories.filter(c => !c.parent_id).map(c => (
              <button key={c.id}
                onClick={() => setCategoryId(categoryId === String(c.id) ? '' : String(c.id))}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  categoryId === String(c.id)
                    ? 'text-white shadow-lg shadow-primary-500/20'
                    : 'bg-surface-800/80 text-surface-400 hover:text-surface-200 hover:bg-surface-700/80 border border-surface-700/50'
                )}
                style={categoryId === String(c.id) ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Recent strip */}
        {recentProds.length > 0 && !productSearch && (
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-surface-700/20">
            <span className="text-[10px] text-surface-700 font-bold uppercase tracking-widest shrink-0">Recent</span>
            {recentProds.map(p => (
              <button key={p.id} onClick={() => handleProductClick(p)}
                className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl bg-surface-800/70 hover:bg-surface-700/80 border border-surface-700/40 hover:border-primary-500/30 transition-all shrink-0 group">
                {p.image ? (
                  <img src={`http://localhost:3001${p.image}`} alt={p.name}
                    className="h-5 w-5 rounded-lg object-cover" />
                ) : (
                  <div className="h-5 w-5 rounded-lg bg-surface-700 flex items-center justify-center">
                    <ShoppingCartIcon className="h-3 w-3 text-surface-600" />
                  </div>
                )}
                <span className="text-xs text-surface-400 group-hover:text-surface-100 transition-colors max-w-[80px] truncate">{p.name}</span>
                <PlusIcon className="h-3 w-3 text-surface-600 group-hover:text-primary-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts && products.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-surface-800/50 animate-pulse" style={{ aspectRatio: '3/4' }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="h-16 w-16 rounded-2xl bg-surface-800/60 flex items-center justify-center">
                <ShoppingCartIcon className="h-8 w-8 text-surface-700" />
              </div>
              <p className="text-sm text-surface-600">{productSearch ? 'No products match your search.' : 'No products found.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAdd={handleProductClick} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart Panel ─────────────────────────────────────────────── */}
      <div className="pos-cart-panel w-80 xl:w-96 flex flex-col border-l border-surface-700/60">

        {/* Cart header */}
        <div className="relative px-4 py-3 border-b border-surface-700/50 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingCartIcon className="h-5 w-5 text-primary-400" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-primary-500 text-white text-[9px] font-black flex items-center justify-center px-0.5">
                    {cart.length}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-surface-100 leading-tight">Cart</p>
                {cart.length > 0 && (
                  <p className="text-[10px] text-surface-500 leading-tight">{cartUnitCount} unit{cartUnitCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setHoldsOpen(true)}
                className="flex items-center gap-1 text-xs text-surface-400 hover:text-primary-400 px-2 py-1.5 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 border border-surface-700/40 transition-all">
                <ArchiveBoxIcon className="h-3.5 w-3.5" />
                Holds
              </button>
              {cart.length > 0 && (
                <button onClick={() => { dispatch({ type: 'CLEAR' }); setCustomer(null); setDiscValue(''); }}
                  className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-800/50 flex items-center justify-center">
                <ShoppingCartIcon className="h-7 w-7 text-surface-700" />
              </div>
              <p className="text-xs text-surface-600 leading-relaxed">Add products from the browser<br />or scan a barcode to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-700/25">
              {cart.map(item => (
                <CartItem key={item.key} item={item} dispatch={dispatch} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom fixed section */}
        <div className="border-t border-surface-700/50 flex flex-col">

          {/* Customer */}
          <CustomerSelector
            customer={customer}
            onSelect={setCustomer}
            onClear={() => setCustomer(null)}
            onNewCustomer={() => setNewCustOpen(true)}
          />

          {/* Discount */}
          <div className="px-4 py-2.5 border-t border-surface-700/25 flex items-center gap-2">
            <ReceiptPercentIcon className="h-4 w-4 text-surface-600 shrink-0" />
            <button
              onClick={() => setDiscType(t => t === 'flat' ? 'percent' : 'flat')}
              className="flex items-center justify-center px-2 py-1 rounded-lg bg-surface-800/80 border border-surface-700/40 text-xs text-surface-300 hover:bg-surface-700/80 transition-colors shrink-0 font-mono min-w-[32px]">
              {discType === 'flat' ? '₨' : '%'}
            </button>
            <input
              type="number" min="0" step="0.01"
              value={discValue}
              onChange={e => setDiscValue(e.target.value)}
              placeholder={discType === 'flat' ? 'Flat discount' : 'Percent off'}
              className="flex-1 h-8 px-2.5 rounded-lg bg-surface-800/80 border border-surface-700/40 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/40"
            />
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-surface-700/25 space-y-1.5">
            <TotalRow label="Subtotal" value={subtotal} />
            {discFlat > 0 && (
              <TotalRow label={`Discount${discType === 'percent' ? ` (${discValue}%)` : ''}`} value={-discFlat} signed />
            )}
            {taxTotal > 0 && <TotalRow label="Tax" value={taxTotal} />}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-surface-700/40">
              <span className="text-sm font-bold text-surface-400">Total</span>
              <span className="text-xl font-black text-primary-400 tracking-tight">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Charge CTA */}
          <div className="px-4 pb-5">
            <button
              disabled={cart.length === 0}
              onClick={() => setPayOpen(true)}
              className={cn(
                'relative w-full h-14 rounded-2xl font-bold text-sm transition-all duration-200 overflow-hidden',
                cart.length === 0
                  ? 'bg-surface-800/40 text-surface-600 cursor-not-allowed border border-surface-700/30'
                  : 'text-white hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
              )}
              style={cart.length > 0 ? {
                background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #7c3aed 100%)',
                boxShadow: '0 8px 32px rgba(109,40,217,0.4), 0 2px 8px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
              } : {}}
            >
              {cart.length === 0 ? (
                'Add items to charge'
              ) : (
                <span className="flex items-center justify-center gap-2.5">
                  <BanknotesIcon className="h-5 w-5 text-violet-200/80" />
                  <span className="text-base font-black">{formatCurrency(total)}</span>
                  <span className="text-violet-200/40 font-light">·</span>
                  <span className="font-bold">Charge Now</span>
                  <kbd className="text-[9px] font-mono text-violet-200/40 border border-violet-300/20 rounded px-1.5 py-0.5 ml-0.5">F9</kbd>
                </span>
              )}
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

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      <CustomerFormModal
        open={newCustOpen}
        onClose={() => setNewCustOpen(false)}
        onCreated={(c) => setCustomer(c)}
      />

      {variantPickerProduct && (
        <VariantPickerModal
          product={variantPickerProduct.product}
          variants={variantPickerProduct.variants}
          onClose={() => setVariantPickerProduct(null)}
          onSelect={(variant) => {
            const oos = variant.track_inventory !== false && !variant.allow_negative && variant.stock_quantity <= 0;
            if (oos) { toast.error(`This variant is out of stock.`); return; }
            dispatch({ type: 'ADD_VARIANT', item: {
              productId:  variantPickerProduct.product.id,
              variantId:  variant.id,
              name:       `${variantPickerProduct.product.name}${variant.size ? ` · ${variant.size}` : ''}${variant.color ? ` · ${variant.color}` : ''}`,
              sku:        variant.sku || variantPickerProduct.product.sku,
              unitPrice:  parseFloat(variant.sale_price)  || parseFloat(variantPickerProduct.product.sale_price) || 0,
              costPrice:  parseFloat(variant.cost_price)  || parseFloat(variantPickerProduct.product.cost_price) || 0,
              taxRate:    parseFloat(variantPickerProduct.product.tax_rate) || 0,
              stock:      variant.stock_quantity,
              allowNeg:   !!variant.allow_negative,
              notes:      '',
              discount:   0,
            }});
            setRecentProds(prev => [variantPickerProduct.product, ...prev.filter(p => p.id !== variantPickerProduct.product.id)].slice(0, 6));
            setVariantPickerProduct(null);
          }}
        />
      )}

      {holdsOpen && (
        <HoldsModal
          cart={cart}
          customer={customer}
          discType={discType}
          discValue={discValue}
          onClose={() => setHoldsOpen(false)}
          onLoad={(hold) => {
            const d = hold.cart_data;
            dispatch({ type: 'CLEAR' });
            (d.items || []).forEach(item => dispatch({ type: 'ADD', product: item }));
            if (d.customer)               setCustomer(d.customer);
            if (d.discType)               setDiscType(d.discType);
            if (d.discValue !== undefined) setDiscValue(d.discValue);
            setHoldsOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }) {
  const outOfStock = product.track_inventory && !product.allow_negative && product.stock_quantity <= 0;
  const lowStock   = !outOfStock && product.track_inventory && product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <button
      onClick={() => !outOfStock && onAdd(product)}
      className={cn(
        'relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 text-left group',
        outOfStock
          ? 'border-surface-700/30 bg-surface-800/20 opacity-40 cursor-not-allowed'
          : 'border-surface-700/50 bg-surface-800/70 hover:border-primary-500/50 hover:bg-surface-800 hover:shadow-xl hover:shadow-primary-500/10 active:scale-[0.96] cursor-pointer'
      )}
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-surface-800/60" style={{ aspectRatio: '1 / 1' }}>
        {product.image ? (
          <img
            src={`http://localhost:3001${product.image}`}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="h-8 w-8 text-surface-700" />
          </div>
        )}

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider border border-red-500/30 px-2 py-1 rounded-full bg-red-500/10">
              Out of Stock
            </span>
          </div>
        )}

        {/* Low stock pill */}
        {lowStock && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-bold text-amber-400 bg-black/60 border border-amber-500/30 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              {formatQty(product.stock_quantity)} left
            </span>
          </div>
        )}

        {/* Hover add button */}
        {!outOfStock && (
          <div
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <PlusIcon className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-surface-100 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-sm font-black text-primary-400 mt-0.5">{formatCurrency(product.sale_price)}</p>
        {product.sku && (
          <p className="text-[10px] text-surface-600 font-mono truncate">{product.sku}</p>
        )}
      </div>
    </button>
  );
}

// ─── Cart Item ────────────────────────────────────────────────────────────────

function CartItem({ item, dispatch }) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput]     = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [showNotes, setShowNotes]       = useState(false);
  const priceRef = useRef(null);

  function startEditPrice() {
    setPriceInput(item.unitPrice.toFixed(2));
    setEditingPrice(true);
    setTimeout(() => priceRef.current?.select(), 20);
  }
  function commitPrice() {
    const p = parseFloat(priceInput);
    if (!isNaN(p) && p >= 0) dispatch({ type: 'SET_PRICE', key: item.key, price: p });
    setEditingPrice(false);
  }

  const lineTotal = Math.max(0, item.qty * item.unitPrice - (item.discount || 0));

  return (
    <div className="px-3 py-2.5 hover:bg-surface-800/30 transition-colors group border-b border-surface-700/20 last:border-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-surface-100 truncate leading-tight">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {editingPrice ? (
              <input
                ref={priceRef}
                type="number" min="0" step="0.01"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={e => { if (e.key === 'Enter') commitPrice(); if (e.key === 'Escape') setEditingPrice(false); }}
                className="w-20 h-5 text-xs text-primary-400 bg-surface-700 border border-primary-500/50 rounded-md px-1.5 focus:outline-none"
              />
            ) : (
              <button onClick={startEditPrice}
                className="text-[10px] text-surface-400 hover:text-primary-400 transition-colors">
                {formatCurrency(item.unitPrice)} each
              </button>
            )}
            <button onClick={() => setShowDiscount(v => !v)}
              className={cn('text-[9px] px-1.5 py-0.5 rounded border transition-colors',
                (item.discount || 0) > 0 || showDiscount
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                  : 'border-surface-600/50 text-surface-400 hover:text-amber-400 hover:border-amber-500/30'
              )}>
              {(item.discount || 0) > 0 ? `-${formatCurrency(item.discount)}` : 'disc'}
            </button>
            <button onClick={() => setShowNotes(v => !v)}
              className={cn('text-[9px] px-1.5 py-0.5 rounded border transition-colors',
                item.notes ? 'border-blue-500/40 text-blue-400 bg-blue-500/10' : 'border-surface-600/50 text-surface-400 hover:text-blue-400 hover:border-blue-500/30'
              )}>
              note
            </button>
          </div>
        </div>

        {/* Qty */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              if (item.qty <= 1) dispatch({ type: 'REMOVE', key: item.key });
              else dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty - 1 });
            }}
            className="h-6 w-6 rounded-lg bg-surface-700/60 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600 transition-colors">
            <MinusIcon className="h-3 w-3" />
          </button>
          <input
            type="number" min="0.01" step="1"
            value={item.qty}
            onChange={e => dispatch({ type: 'SET_QTY', key: item.key, qty: parseFloat(e.target.value) || 1 })}
            className="w-9 h-6 text-center text-xs text-surface-100 bg-surface-700/60 rounded-lg border border-surface-600/40 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
          />
          <button
            onClick={() => dispatch({ type: 'SET_QTY', key: item.key, qty: item.qty + 1 })}
            className="h-6 w-6 rounded-lg bg-surface-700/60 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600 transition-colors">
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Line total */}
        <span className="text-xs font-bold text-surface-100 w-16 text-right shrink-0 tabular-nums">
          {formatCurrency(lineTotal)}
        </span>

        {/* Remove */}
        <button onClick={() => dispatch({ type: 'REMOVE', key: item.key })}
          className="text-surface-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Discount row */}
      {showDiscount && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-surface-400 shrink-0">Discount ₨</span>
          <input
            type="number" min="0" step="1"
            value={item.discount || ''}
            onChange={e => dispatch({ type: 'SET_DISCOUNT', key: item.key, discount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="flex-1 h-6 px-2 rounded-lg bg-surface-800 border border-amber-500/30 text-xs text-amber-300 placeholder:text-surface-700 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
          {(item.discount || 0) > 0 && (
            <button onClick={() => dispatch({ type: 'SET_DISCOUNT', key: item.key, discount: 0 })}
              className="text-surface-600 hover:text-red-400">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Notes row */}
      {showNotes && (
        <div className="mt-1.5">
          <input
            type="text"
            value={item.notes || ''}
            onChange={e => dispatch({ type: 'SET_NOTES', key: item.key, notes: e.target.value })}
            placeholder="Item note (e.g. alteration, gift wrap)…"
            className="w-full h-6 px-2 rounded-lg bg-surface-800 border border-blue-500/30 text-xs text-blue-300 placeholder:text-surface-700 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
      )}
    </div>
  );
}

// ─── Customer Selector ────────────────────────────────────────────────────────

function CustomerSelector({ customer, onSelect, onClear, onNewCustomer }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef(null);

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
    const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div className="px-3 py-2.5 border-t border-surface-700/25 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-primary-300"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(124,58,237,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-surface-100 truncate">{customer.name}</p>
          {customer.phone && <p className="text-[10px] text-surface-500">{customer.phone}</p>}
        </div>
        {customer.current_balance > 0 && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full shrink-0">
            Due {formatCurrency(customer.current_balance)}
          </span>
        )}
        <button onClick={onClear} className="text-surface-600 hover:text-red-400 transition-colors shrink-0">
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="px-3 py-2.5 border-t border-surface-700/25 relative">
      <div className="flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-surface-600 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Walk-in / Search customer…"
          className="flex-1 h-7 px-2 rounded-lg bg-surface-800/80 border border-surface-700/40 text-xs text-surface-100 placeholder:text-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
        />
        <button onClick={onNewCustomer}
          className="p-1.5 rounded-lg text-surface-600 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
          title="New customer">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-surface-600/70 bg-surface-800 shadow-2xl z-20 overflow-hidden">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-surface-500 text-center">{query ? 'No customers found.' : 'Type to search customers…'}</p>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              {results.map(c => {
                const init = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button key={c.id} type="button"
                    onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-700/50 transition-colors text-left border-b border-surface-700/20 last:border-0">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-primary-300 bg-primary-500/15 border border-primary-500/20">
                      {init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-100">{c.name}</p>
                      {c.phone && <p className="text-[10px] text-surface-500">{c.phone}</p>}
                    </div>
                    {c.current_balance > 0 && (
                      <span className="text-[10px] text-red-400 shrink-0">Due: {formatCurrency(c.current_balance)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

const METHOD_CONFIG = [
  { value: 'cash',   label: 'Cash',   Icon: BanknotesIcon,       color: '#10b981', glowColor: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  { value: 'card',   label: 'Card',   Icon: CreditCardIcon,      color: '#60a5fa', glowColor: 'rgba(96,165,250,0.3)',  bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)' },
  { value: 'split',  label: 'Split',  Icon: ArrowsRightLeftIcon, color: '#a78bfa', glowColor: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
  { value: 'credit', label: 'Credit', Icon: UserIcon,            color: '#fbbf24', glowColor: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)' },
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
             : 0;

  const change = Math.max(0, paid - total);
  const due    = method === 'credit' ? total : Math.max(0, total - paid);
  const canPay = method === 'credit'
    ? !!customer
    : method === 'cash'   ? cashAmount >= total
    : method === 'card'   ? true
    : cashAmount + cardAmount >= total;

  function handlePay() {
    onComplete({ method, paidAmount: paid, cardAmount, notes });
  }

  const activeCfg = METHOD_CONFIG.find(m => m.value === method);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface-900 border border-surface-700/70 w-full sm:rounded-3xl sm:max-w-md shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' }}>

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-surface-700/60 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${activeCfg?.color}22 0%, transparent 65%)` }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-600 mb-0.5">Charge</p>
              <p className="text-4xl font-black text-surface-100 tracking-tight">{formatCurrency(total)}</p>
              {customer?.loyalty_points > 0 && (
                <p className="text-[10px] text-amber-400 mt-0.5">
                  ★ {customer.loyalty_points} loyalty pts
                </p>
              )}
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl text-surface-500 hover:text-surface-100 hover:bg-surface-800 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-4 gap-2 p-4 pb-2">
          {METHOD_CONFIG.map(m => {
            const Icon     = m.Icon;
            const disabled = m.value === 'credit' && !customer;
            const active   = method === m.value;
            return (
              <button key={m.value}
                onClick={() => { if (!disabled) { setMethod(m.value); setCashPaid(''); setCardAmt(''); } }}
                disabled={disabled}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all',
                  disabled && 'opacity-35 cursor-not-allowed',
                  !disabled && !active && 'border-surface-700/50 bg-surface-800/40 hover:bg-surface-800 hover:border-surface-600'
                )}
                style={active ? { background: m.bg, borderColor: m.border, boxShadow: `0 0 20px ${m.color}18` } : {}}
              >
                <Icon className="h-5 w-5" style={{ color: active ? m.color : '#64748b' }} />
                <span className="text-[10px] font-bold" style={{ color: active ? '#f1f5f9' : '#64748b' }}>{m.label}</span>
                {m.value === 'credit' && !customer && (
                  <span className="text-[8px] text-surface-700 leading-tight text-center">no customer</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Method inputs */}
        <div className="px-4 pb-2 space-y-3">

          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500 mb-1.5 block">Amount Received (₨)</label>
                <input
                  type="number" min={total} step="1" autoFocus
                  value={cashPaid}
                  onChange={e => setCashPaid(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canPay && handlePay()}
                  placeholder={total.toFixed(2)}
                  className="w-full h-16 px-4 text-3xl font-black text-center rounded-2xl bg-surface-800 border border-surface-700/60 text-surface-100 placeholder:text-surface-700 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40 transition-all tabular-nums"
                />
              </div>

              {cashAmount > 0 && (
                <div className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-2xl border font-bold',
                  change > 0
                    ? 'bg-green-500/10 border-green-500/30'
                    : cashAmount < total
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-surface-800 border-surface-700/50'
                )}>
                  <span className="text-sm font-medium text-surface-400">
                    {change > 0 ? 'Change Due' : cashAmount < total ? 'Still Owed' : 'Exact Amount'}
                  </span>
                  <span className={cn(
                    'text-xl font-black',
                    change > 0 ? 'text-green-400' : cashAmount < total ? 'text-red-400' : 'text-surface-400'
                  )}>
                    {change > 0 ? formatCurrency(change) : cashAmount < total ? formatCurrency(total - cashAmount) : '✓'}
                  </span>
                </div>
              )}

              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-1.5">
                {[500, 1000, 2000, 5000, 10000].map(amt => (
                  <button key={amt} type="button"
                    onClick={() => setCashPaid(String(amt))}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all border',
                      cashPaid === String(amt)
                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                        : 'bg-surface-800 border-surface-700/50 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                    )}>
                    ₨{amt >= 1000 ? `${amt / 1000}K` : amt}
                  </button>
                ))}
                <button type="button"
                  onClick={() => setCashPaid(String(Math.ceil(total)))}
                  className={cn(
                    'py-2 rounded-xl text-xs font-bold transition-all border',
                    cashPaid === String(Math.ceil(total))
                      ? 'bg-green-500/20 border-green-500/40 text-green-300'
                      : 'bg-primary-500/10 border-primary-500/30 text-primary-400 hover:bg-primary-500/20'
                  )}>
                  Exact
                </button>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center border"
                style={{ background: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.35)' }}>
                <CreditCardIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-surface-100 tabular-nums">{formatCurrency(total)}</p>
                <p className="text-sm text-surface-500 mt-1">Tap or insert card to charge</p>
              </div>
            </div>
          )}

          {method === 'split' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-surface-500 mb-1.5 block">Cash (₨)</label>
                  <input type="number" min="0" step="1" value={cashPaid}
                    onChange={e => setCashPaid(e.target.value)}
                    className="w-full h-10 px-3 text-right rounded-xl bg-surface-800 border border-surface-700/60 text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-sm font-bold tabular-nums" />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1.5 block">Card (₨)</label>
                  <input type="number" min="0" step="1" value={cardAmt}
                    onChange={e => setCardAmt(e.target.value)}
                    className="w-full h-10 px-3 text-right rounded-xl bg-surface-800 border border-surface-700/60 text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500/50 text-sm font-bold tabular-nums" />
                </div>
              </div>
              {cashAmount + cardAmount > 0 && (
                <div className={cn(
                  'flex justify-between px-3 py-2 rounded-xl border',
                  due > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
                )}>
                  <span className="text-xs text-surface-400 font-medium self-center">Remaining</span>
                  <span className={cn('text-base font-black', due > 0 ? 'text-red-400' : 'text-green-400')}>
                    {due > 0 ? formatCurrency(due) : '✓ Covered'}
                  </span>
                </div>
              )}
            </div>
          )}

          {method === 'credit' && customer && (
            <div className="flex flex-col items-center gap-2.5 py-3">
              <div className="h-12 w-12 rounded-full flex items-center justify-center border"
                style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.35)' }}>
                <UserIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-surface-100 tabular-nums">{formatCurrency(total)}</p>
                <p className="text-sm text-surface-400 mt-1">
                  will be added to <span className="text-amber-400 font-bold">{customer.name}</span>
                </p>
                {customer.credit_limit > 0 && (
                  <p className="text-xs text-surface-500 mt-1">
                    Credit limit: {formatCurrency(customer.credit_limit)} · Used: {formatCurrency(customer.current_balance || 0)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Sale notes (optional)…"
            className="w-full h-9 px-3 rounded-xl bg-surface-800 border border-surface-700/50 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 p-4 pt-2">
          <button onClick={onClose}
            className="h-12 rounded-2xl bg-surface-800 border border-surface-700/60 text-surface-300 hover:bg-surface-700 text-sm font-semibold transition-all">
            Cancel
          </button>
          <button onClick={handlePay} disabled={!canPay || loading}
            className={cn(
              'h-12 rounded-2xl font-bold text-sm transition-all',
              canPay && !loading
                ? 'text-white hover:-translate-y-0.5 active:translate-y-0'
                : 'bg-surface-700/50 text-surface-600 cursor-not-allowed'
            )}
            style={canPay && !loading ? {
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
            } : {}}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processing…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Complete Sale
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose }) {
  const { data: settingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const co  = settingsRes?.data?.company  ?? {};
  const rc  = settingsRes?.data?.receipt  ?? {};
  const bil = settingsRes?.data?.billing  ?? {};

  const companyName    = co.company_name?.value    || 'ProBusinessCloud';
  const companyTagline = co.company_tagline?.value || '';
  const companyPhone   = co.company_phone?.value   || '';
  const companyAddress = co.company_address?.value || '';
  const companyLogo    = co.company_logo?.value    || '';
  const receiptFooter  = rc.receipt_footer?.value  || 'Thank you for shopping!';
  const currency       = bil.currency_symbol?.value || '₨';

  const items   = receipt.items ?? [];
  const date    = new Date(receipt.sale_date || receipt.created_at);
  const fmt     = (v) => `${currency}${Math.abs(Number(v)).toFixed(0)}`;
  const isPaid  = !receipt.due_amount || Number(receipt.due_amount) <= 0;
  const isCredit = receipt.payment_method === 'credit';

  function handlePrint() {
    printReceipt(receipt, items, settingsRes?.data ?? {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm mx-auto flex flex-col max-h-[92vh]">
        <div className="bg-surface-800 rounded-2xl border border-surface-700 shadow-2xl overflow-hidden flex flex-col">

          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400" />
              <span className="text-sm font-semibold text-surface-100">Sale Complete</span>
            </div>
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              isPaid
                ? 'bg-green-500/15 text-green-400'
                : isCredit
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
            )}>
              {isPaid ? '✓ PAID' : isCredit ? '● CREDIT' : `DUE ${fmt(receipt.due_amount)}`}
            </span>
          </div>

          {/* Receipt paper */}
          <div className="overflow-y-auto flex-1 bg-[#fafaf8]" style={{ fontFamily: "'Courier New', monospace" }}>

            <div className="text-center px-6 pt-5 pb-4" style={{ borderBottom: '1px dashed #d1d5db' }}>
              {companyLogo && (
                <div className="flex justify-center mb-2.5">
                  <img src={`${companyLogo}`} alt={companyName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shadow" />
                </div>
              )}
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">{companyName}</h2>
              {companyTagline && <p className="text-xs text-gray-500 mt-0.5">{companyTagline}</p>}
              {companyAddress && <p className="text-xs text-gray-500">{companyAddress}</p>}
              {companyPhone   && <p className="text-xs text-gray-500">Tel: {companyPhone}</p>}
              <p className="text-xs text-gray-400 mt-1.5">{date.toLocaleString('en-PK')}</p>
            </div>

            <div className="px-5 py-2.5 text-xs" style={{ borderBottom: '1px dashed #d1d5db' }}>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Ref:</span>
                <span className="font-bold text-gray-900 font-mono">{receipt.reference}</span>
              </div>
              {receipt.customer_name && (
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500">Customer:</span>
                  <span className="text-gray-800">{receipt.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Cashier:</span>
                <span className="text-gray-800">{receipt.cashier_name ?? 'Staff'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Payment:</span>
                <span className="text-gray-800 capitalize">{(receipt.payment_method ?? 'cash').replace('_', ' ')}</span>
              </div>
            </div>

            <div className="px-5 py-2.5" style={{ borderBottom: '1px dashed #d1d5db' }}>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-xs mb-1.5">
                <span className="text-gray-500 font-medium">ITEM</span>
                <span className="text-gray-500 font-medium text-right">QTY</span>
                <span className="text-gray-500 font-medium text-right">RATE</span>
                <span className="text-gray-500 font-medium text-right">AMT</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] gap-x-2 py-1.5 text-xs',
                  i < items.length - 1 && 'border-b border-dotted border-gray-200'
                )}>
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    {(item.size || item.color) && (
                      <p className="text-gray-400 text-[10px]">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <span className="text-gray-600 text-right self-start pt-px">{parseInt(item.quantity, 10)}</span>
                  <span className="text-gray-600 text-right self-start pt-px">{fmt(item.unit_price)}</span>
                  <div className="text-right self-start">
                    <span className="font-semibold text-gray-900">{fmt(item.total ?? item.subtotal)}</span>
                    {parseFloat(item.discount) > 0 && (
                      <p className="text-green-600 text-[10px] leading-tight">-{fmt(item.discount)} off</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-2.5 text-xs space-y-1" style={{ borderBottom: '1px dashed #d1d5db' }}>
              <ReceiptRow label="Subtotal" value={receipt.subtotal} currency={currency} />
              {receipt.discount_amount > 0 && <ReceiptRow label="Discount" value={-receipt.discount_amount} currency={currency} className="text-green-700" />}
              {receipt.tax_amount > 0 && <ReceiptRow label="Tax" value={receipt.tax_amount} currency={currency} />}
              <div className="flex justify-between font-bold text-sm pt-1.5" style={{ borderTop: '1px solid #e5e7eb', marginTop: '4px' }}>
                <span className="text-gray-900">TOTAL</span>
                <span className="text-gray-900">{fmt(receipt.total_amount)}</span>
              </div>
              <ReceiptRow label="Paid" value={receipt.paid_amount} currency={currency} />
              {receipt.change_amount > 0 && <ReceiptRow label="Change" value={receipt.change_amount} currency={currency} className="text-blue-700" />}
              {receipt.due_amount > 0 && <ReceiptRow label="Due" value={receipt.due_amount} currency={currency} className="text-red-600 font-bold" />}
            </div>

            <div className="px-5 py-2 text-center text-xs text-gray-400">
              {items.length} item{items.length !== 1 ? 's' : ''} · {items.reduce((s, i) => s + parseInt(i.quantity, 10), 0)} units
            </div>

            <div className="text-center px-5 pb-5 pt-1 text-xs text-gray-500 space-y-0.5">
              <p className="font-medium">{receiptFooter}</p>
              <p className="text-gray-400 text-[10px]">Powered by ProBusinessCloud</p>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-surface-700 shrink-0 bg-surface-800">
            <button onClick={onClose}
              className="flex-1 h-9 rounded-xl bg-surface-700 text-surface-300 hover:bg-surface-600 text-sm font-medium transition-colors">
              Close
            </button>
            {receipt.customer_phone && (
              <a
                href={`https://wa.me/92${String(receipt.customer_phone).replace(/^0/, '').replace(/\D/g, '')}?text=${encodeURIComponent(`Receipt #${receipt.reference} – Total: Rs.${Math.round(receipt.total_amount)}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="h-9 px-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shrink-0"
                style={{ background: '#25d366' }}>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WA
              </a>
            )}
            <button onClick={handlePrint}
              className="flex-[2] h-9 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155' }}>
              <PrinterIcon className="h-4 w-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, currency = '₨', className = '' }) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span className="text-gray-500">{label}</span>
      <span>{currency}{Math.abs(Number(value)).toFixed(0)}</span>
    </div>
  );
}

function TotalRow({ label, value, signed = false }) {
  const display = signed && value < 0
    ? `−${formatCurrency(Math.abs(value))}`
    : formatCurrency(value);
  return (
    <div className="flex justify-between text-sm">
      <span className="text-surface-500">{label}</span>
      <span className={cn('text-surface-300 tabular-nums', signed && value < 0 && 'text-green-400')}>{display}</span>
    </div>
  );
}

// ─── Holds Modal ──────────────────────────────────────────────────────────────

function HoldsModal({ cart, customer, discType, discValue, onClose, onLoad }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');

  const { data } = useQuery({ queryKey: ['holds'], queryFn: holdsApi.list });
  const holds = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d) => holdsApi.create(d),
    onSuccess: () => { toast.success('Cart saved to holds.'); qc.invalidateQueries({ queryKey: ['holds'] }); setLabel(''); },
    onError:   (e) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id) => holdsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holds'] }),
  });

  function saveCart() {
    if (!cart.length) return toast.error('Cart is empty.');
    saveMut.mutate({
      label: label || `Hold ${new Date().toLocaleTimeString()}`,
      cart_data: { items: cart.map(i => ({ ...i })), customer, discType, discValue },
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-900 rounded-2xl border border-surface-700/70 w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700/60">
          <div className="flex items-center gap-2">
            <ArchiveBoxIcon className="h-4 w-4 text-primary-400" />
            <h3 className="font-bold text-surface-100 text-sm">Cart Holds</h3>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50" />
            <button onClick={saveCart} disabled={saveMut.isPending || !cart.length}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Save
            </button>
          </div>

          {holds.length === 0 ? (
            <div className="text-center py-6">
              <ArchiveBoxIcon className="h-8 w-8 text-surface-700 mx-auto mb-2" />
              <p className="text-sm text-surface-600">No saved holds.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {holds.map(h => (
                <div key={h.id} className="flex items-center justify-between bg-surface-800/60 rounded-xl px-3 py-2.5 border border-surface-700/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-200 truncate">{h.label || 'Unnamed hold'}</p>
                    <p className="text-[10px] text-surface-500">{new Date(h.created_at).toLocaleString()} · {h.user_name}</p>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => onLoad(h)}
                      className="px-3 py-1 rounded-lg text-xs text-white font-bold transition-all"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      Load
                    </button>
                    <button onClick={() => delMut.mutate(h.id)}
                      className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-xs text-red-400 border border-red-500/20 transition-colors">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Variant Picker Modal ─────────────────────────────────────────────────────

function VariantPickerModal({ product, variants, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-surface-900 rounded-2xl border border-surface-700/70 w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700/60">
          <div>
            <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-0.5">Select Variant</p>
            <p className="text-sm font-bold text-surface-100">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
          {variants.map(v => {
            const oos = v.stock_quantity !== null && v.stock_quantity <= 0;
            const label = [v.size, v.color].filter(Boolean).join(' · ') || `Variant #${v.id}`;
            const price = parseFloat(v.sale_price) || parseFloat(product.sale_price) || 0;
            return (
              <button key={v.id}
                onClick={() => !oos && onSelect(v)}
                disabled={oos}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                  oos
                    ? 'opacity-40 cursor-not-allowed border-surface-700/30 bg-surface-800/20'
                    : 'border-surface-700/50 bg-surface-800/60 hover:border-primary-500/50 hover:bg-surface-800 active:scale-[0.98]',
                ].join(' ')}>
                <div>
                  <p className="text-sm font-semibold text-surface-100">{label}</p>
                  {v.sku && <p className="text-[10px] text-surface-500 font-mono mt-0.5">{v.sku}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-primary-400">{price.toLocaleString('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 })}</p>
                  {v.stock_quantity !== null && (
                    <p className={['text-[10px] mt-0.5', oos ? 'text-red-400' : 'text-surface-500'].join(' ')}>
                      {oos ? 'Out of stock' : `${v.stock_quantity} in stock`}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
