import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, ArchiveBoxIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import Select from '@components/common/Select';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import Modal from '@components/common/Modal';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { stockAdjApi } from '@api/stock-adjustments.api';
import { productsApi } from '@api/products.api';
import { formatQty } from '@utils/formatQty';

const TYPE_VARIANTS = {
  adjustment: 'info',
  damage:     'danger',
  loss:       'warning',
  return:     'success',
};

export default function StockAdjustPage() {
  const { can } = usePermission();
  const qc      = useQueryClient();

  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [typeFilter, setType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-adjustments', { search, page, type: typeFilter }],
    queryFn:  () => stockAdjApi.list({ search, page, limit: 20, type: typeFilter }),
    placeholderData: keepPreviousData,
  });

  const adjustments = data?.data ?? [];
  const pagination  = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><ArchiveBoxIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Inventory</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Stock Adjustments</h1>
            <p className="text-sm text-surface-400 mt-1">{pagination?.total ?? 0} adjustment{(pagination?.total ?? 0) !== 1 ? 's' : ''} · manually adjust for damage, loss, or corrections</p>
          </div>
          {can('inventory', 'create') && (
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all self-start">
              <PlusIcon className="h-4 w-4" /> New Adjustment
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search reference…" className="w-64" />
        <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${typeFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Types</option>
          <option value="adjustment">Adjustment</option>
          <option value="damage">Damage</option>
          <option value="loss">Loss</option>
          <option value="return">Return</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{pagination?.total ?? 0} adjustment{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        {isLoading ? (
          <Skeleton />
        ) : adjustments.length === 0 ? (
          <EmptyState
            icon={<ArchiveBoxIcon className="h-10 w-10" />}
            title="No adjustments found"
            description="Create a stock adjustment to correct inventory levels."
            action={can('inventory', 'create') ? { label: 'New Adjustment', onClick: () => setCreateOpen(true) } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80">
                <th className="text-left px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Reference</span></th>
                <th className="text-left px-4 py-3 hidden md:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Date</span></th>
                <th className="text-center px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Type</span></th>
                <th className="text-left px-4 py-3 hidden lg:table-cell"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">Created By</span></th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {adjustments.map(adj => (
                <tr key={adj.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-surface-100">{adj.reference}</td>
                  <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                    {new Date(adj.created_at).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={TYPE_VARIANTS[adj.type] ?? 'neutral'}>
                      {adj.type.charAt(0).toUpperCase() + adj.type.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">{adj.created_by_name}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetailId(adj.id)}
                      className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      {createOpen && (
        <CreateAdjustmentModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ['stock-adjustments'] });
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {detailId && (
        <AdjustmentDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

// ─── Create Adjustment Modal ─────────────────────────────────────────────────

function CreateAdjustmentModal({ open, onClose, onCreated }) {
  const [type, setType]     = useState('adjustment');
  const [notes, setNotes]   = useState('');
  const [items, setItems]   = useState([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: prodData, isFetching } = useQuery({
    queryKey: ['adj-product-search', productSearch],
    queryFn:  () => productsApi.list({ search: productSearch, limit: 8 }),
    enabled:  productSearch.length >= 2,
  });
  const searchResults = prodData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => stockAdjApi.create({
      type, notes: notes.trim() || null,
      items: items.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id || null,
        quantity:   parseFloat(i.quantity) || 0,
        reason:     i.reason || null,
      })),
    }),
    onSuccess: (res) => { toast.success(res.message); onCreated(); },
    onError: (err) => toast.error(err.message),
  });

  function addProduct(p) {
    if (items.find(i => i.product_id === p.id && !i.variant_id)) return;
    setItems([...items, {
      product_id: p.id, variant_id: null,
      product_name: p.name, product_sku: p.sku,
      current_stock: p.stock_quantity,
      quantity: 0, reason: '',
    }]);
    setProductSearch('');
  }

  function updateItem(idx, field, value) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title="New Stock Adjustment"
      description="Adjust stock levels for damage, loss, or corrections.">
      <Modal.Body className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Adjustment Type" value={type} onChange={e => setType(e.target.value)}>
            <option value="adjustment">Adjustment (Correction)</option>
            <option value="damage">Damage</option>
            <option value="loss">Loss / Theft</option>
            <option value="return">Return to Stock</option>
          </Select>
        </div>

        {/* Product search */}
        <div className="relative">
          <SearchInput value={productSearch} onChange={setProductSearch}
            placeholder="Search and add products…" />
          {productSearch.length >= 2 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-surface-600 bg-surface-800 shadow-xl overflow-hidden">
              {isFetching ? (
                <div className="p-3 text-sm text-surface-400">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-sm text-surface-400">No products found.</div>
              ) : (
                <div className="max-h-44 overflow-y-auto">
                  {searchResults.map(p => (
                    <button key={p.id} type="button" onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-700 transition-colors text-left">
                      <div>
                        <p className="text-sm font-medium text-surface-100">{p.name}</p>
                        <p className="text-xs text-surface-500 font-mono">{p.sku}</p>
                      </div>
                      <p className="text-xs text-surface-400 ml-4">Stock: {formatQty(p.stock_quantity)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="rounded-lg border border-surface-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-800/60 border-b border-surface-700">
                  <th className="text-left px-3 py-2 text-surface-400 font-medium">Product</th>
                  <th className="text-right px-3 py-2 text-surface-400 font-medium w-16">Current</th>
                  <th className="text-right px-3 py-2 text-surface-400 font-medium w-20">Change</th>
                  <th className="text-left px-3 py-2 text-surface-400 font-medium">Reason</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-surface-100">{item.product_name}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-surface-400">{formatQty(item.current_stock)}</td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="+5 or −3"
                        className="w-full text-right px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-100 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.reason}
                        onChange={e => updateItem(idx, 'reason', e.target.value)}
                        placeholder="Optional…"
                        className="w-full px-2 py-1 rounded bg-surface-700 border border-surface-600 text-surface-100 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-surface-500 hover:text-red-400 transition-colors">
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Textarea label="Notes" rows={2} placeholder="Optional notes…"
          value={notes} onChange={e => setNotes(e.target.value)} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button loading={mutation.isPending}
          disabled={items.length === 0}
          onClick={() => mutation.mutate()}>
          Create Adjustment
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AdjustmentDetailModal({ id, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-adjustment', id],
    queryFn:  () => stockAdjApi.getOne(id),
  });
  const adj = data?.data;

  return (
    <Modal open={!!id} onClose={onClose} size="md"
      title={adj ? adj.reference : 'Adjustment Details'}>
      <Modal.Body>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : adj ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-surface-500 text-xs">Type</p>
                <Badge variant={TYPE_VARIANTS[adj.type] ?? 'neutral'}>{adj.type}</Badge>
              </div>
              <div>
                <p className="text-surface-500 text-xs">Created by</p>
                <p className="text-surface-200">{adj.created_by_name}</p>
              </div>
            </div>
            {adj.notes && <p className="text-sm text-surface-400 italic">{adj.notes}</p>}
            <div className="rounded-lg border border-surface-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-800/60 border-b border-surface-700">
                    <th className="text-left px-3 py-2 text-surface-400">Product</th>
                    <th className="text-right px-3 py-2 text-surface-400">Before</th>
                    <th className="text-right px-3 py-2 text-surface-400">Change</th>
                    <th className="text-right px-3 py-2 text-surface-400">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {(adj.items ?? []).map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-surface-100">{item.product_name}</p>
                        {item.reason && <p className="text-surface-500 text-2xs">{item.reason}</p>}
                      </td>
                      <td className="px-3 py-2 text-right text-surface-400">{formatQty(item.quantity_before)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={parseFloat(item.quantity_adjusted) >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {parseFloat(item.quantity_adjusted) >= 0 ? '+' : ''}{formatQty(item.quantity_adjusted)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-surface-100">{formatQty(item.quantity_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-surface-400">Not found.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
