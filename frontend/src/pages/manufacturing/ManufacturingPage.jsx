import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, BeakerIcon, CubeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { manufacturingApi } from '@api/manufacturing.api';
import { formatQty } from '@utils/formatQty';
import { cn } from '@utils/cn';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

const TABS = ['BOM Setup', 'Production Batches'];

export default function ManufacturingPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Production</span></div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">Manufacturing & BOM</h1>
          <p className="text-sm text-surface-400 mt-1">Define bills of materials and record production batches</p>
        </div>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800 w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === i ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200')}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 ? <BOMTab /> : <BatchTab />}
    </div>
  );
}

// ── BOM Setup ──────────────────────────────────────────────────────────────────

function BOMTab() {
  const qc = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [form, setForm] = useState({ raw_material_id: '', quantity_required: '', unit: '' });

  const { data: finishedData } = useQuery({
    queryKey: ['mfg-finished'],
    queryFn:  () => manufacturingApi.listProducts({ type: 'finished' }),
  });
  const { data: rawData } = useQuery({
    queryKey: ['mfg-raw'],
    queryFn:  () => manufacturingApi.listProducts({ type: 'raw' }),
  });
  const { data: allData } = useQuery({
    queryKey: ['mfg-all-products'],
    queryFn:  () => manufacturingApi.listProducts(),
  });
  const { data: bomData } = useQuery({
    queryKey: ['bom', selectedProductId],
    queryFn:  () => manufacturingApi.listBOM({ product_id: selectedProductId }),
    enabled:  !!selectedProductId,
  });

  const finished  = finishedData?.data ?? [];
  const raws      = rawData?.data ?? [];
  const allProds  = allData?.data ?? [];
  const bom       = bomData?.data ?? [];

  const addMut = useMutation({
    mutationFn: (d) => manufacturingApi.createBOM(d),
    onSuccess: () => { toast.success('BOM entry saved.'); qc.invalidateQueries({ queryKey: ['bom'] }); setForm({ raw_material_id: '', quantity_required: '', unit: '' }); },
    onError:   (e) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id) => manufacturingApi.deleteBOM(id),
    onSuccess: () => { toast.success('Removed.'); qc.invalidateQueries({ queryKey: ['bom'] }); },
    onError:   (e) => toast.error(e.message),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!selectedProductId) return toast.error('Select a finished good first.');
    addMut.mutate({ product_id: selectedProductId, ...form });
  }

  const selectedProduct = allProds.find(p => String(p.id) === String(selectedProductId));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Finished good selector */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">Finished Products</h2>
        <p className="text-xs text-surface-500">Select a product to define its bill of materials.</p>
        <div className="flex flex-col gap-1">
          {allProds.filter(p => p.is_finished_good).length === 0 && (
            <p className="text-xs text-surface-600 italic">No finished goods. Mark products as "Finished Good" in Products → Edit.</p>
          )}
          {allProds.filter(p => p.is_finished_good).map(p => (
            <button key={p.id} onClick={() => setSelectedProductId(String(p.id))}
              className={cn('text-left px-3 py-2 rounded-lg text-sm transition-colors border',
                String(selectedProductId) === String(p.id)
                  ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                  : 'border-transparent text-surface-300 hover:bg-surface-700')}>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-surface-500">{p.sku} · Stock: {formatQty(p.stock_quantity)}</p>
            </button>
          ))}
        </div>
        {allProds.filter(p => !p.is_finished_good).length > 0 && (
          <details className="text-xs text-surface-500">
            <summary className="cursor-pointer hover:text-surface-300">Other products (not marked as finished)</summary>
            <div className="mt-2 flex flex-col gap-1">
              {allProds.filter(p => !p.is_finished_good).map(p => (
                <button key={p.id} onClick={() => setSelectedProductId(String(p.id))}
                  className={cn('text-left px-3 py-2 rounded-lg text-sm border transition-colors',
                    String(selectedProductId) === String(p.id)
                      ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                      : 'border-transparent text-surface-500 hover:bg-surface-700 hover:text-surface-300')}>
                  {p.name}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* BOM table */}
      <div className="lg:col-span-2 card p-5 space-y-4">
        {!selectedProductId ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-surface-600">
            <BeakerIcon className="h-10 w-10" />
            <p className="text-sm">Select a product to view or edit its BOM.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-surface-700 pb-2">
              <div>
                <h2 className="text-sm font-semibold text-surface-200">
                  BOM: {selectedProduct?.name ?? '—'}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">Raw materials required to produce 1 unit.</p>
              </div>
            </div>

            {/* Add row form */}
            <form onSubmit={handleAdd} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-xs font-medium text-surface-400 mb-1">Raw Material</label>
                <select value={form.raw_material_id}
                  onChange={e => setForm(f => ({ ...f, raw_material_id: e.target.value }))}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
                  <option value="">Select…</option>
                  {allProds.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {formatQty(p.stock_quantity)})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Input label="Qty Required" type="number" step="0.001" min="0.001"
                  value={form.quantity_required} onChange={e => setForm(f => ({ ...f, quantity_required: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Input label="Unit" placeholder="pcs" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Button type="submit" loading={addMut.isPending} className="w-full">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* BOM list */}
            {bom.length === 0 ? (
              <p className="text-xs text-surface-600 italic text-center py-4">No raw materials defined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700">
                      <th className="text-left text-surface-400 font-medium py-2">Raw Material</th>
                      <th className="text-right text-surface-400 font-medium py-2">Qty / Unit</th>
                      <th className="text-right text-surface-400 font-medium py-2">Cost / Unit</th>
                      <th className="text-right text-surface-400 font-medium py-2">Stock</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {bom.map(b => (
                      <tr key={b.id}>
                        <td className="py-2 text-surface-200">{b.raw_material_name}</td>
                        <td className="py-2 text-right text-surface-300">{formatQty(b.quantity_required)} {b.unit || ''}</td>
                        <td className="py-2 text-right text-surface-300">₨{formatQty(b.raw_material_cost)}</td>
                        <td className="py-2 text-right text-surface-400">{formatQty(b.raw_material_stock)}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => delMut.mutate(b.id)}
                            className="p-1.5 rounded text-surface-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Production Batches ─────────────────────────────────────────────────────────

function BatchTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ product_id: '', quantity_produced: '', batch_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [detail, setDetail]     = useState(null);

  const { data } = useQuery({ queryKey: ['prod-batches'], queryFn: () => manufacturingApi.listBatches({ limit: 50 }) });
  const { data: allProds } = useQuery({ queryKey: ['mfg-all-products'], queryFn: () => manufacturingApi.listProducts() });

  const batches  = data?.data ?? [];
  const products = allProds?.data ?? [];

  const createMut = useMutation({
    mutationFn: (d) => manufacturingApi.createBatch(d),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['prod-batches'] });
      setShowForm(false);
      setForm({ product_id: '', quantity_produced: '', batch_date: new Date().toISOString().slice(0, 10), notes: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">{batches.length} batches recorded</p>
        <Button onClick={() => setShowForm(s => !s)}>
          <PlusIcon className="h-4 w-4" /> New Batch
        </Button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">Record Production Batch</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Finished Product</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.bom_count} BOM entries)</option>)}
              </select>
            </div>
            <Input label="Quantity to Produce" type="number" step="0.01" min="1"
              value={form.quantity_produced} onChange={e => setForm(f => ({ ...f, quantity_produced: e.target.value }))} />
            <Input label="Batch Date" type="date"
              value={form.batch_date} onChange={e => setForm(f => ({ ...f, batch_date: e.target.value }))} />
            <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button loading={createMut.isPending} onClick={() => createMut.mutate(form)}>Record Production</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Reference</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Product</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Qty Produced</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Production Cost</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {batches.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-surface-600 text-sm">No batches recorded yet.</td></tr>
              )}
              {batches.map(b => (
                <tr key={b.id} onClick={() => setDetail(b)} className="hover:bg-surface-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-surface-300">{b.reference}</td>
                  <td className="px-4 py-3 text-surface-200">{b.product_name}</td>
                  <td className="px-4 py-3 text-right text-surface-200">{formatQty(b.quantity_produced)} {b.product_unit}</td>
                  <td className="px-4 py-3 text-right text-surface-200">₨{formatQty(b.production_cost)}</td>
                  <td className="px-4 py-3 text-surface-400">{b.batch_date}</td>
                  <td className="px-4 py-3 text-surface-500">{b.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && <BatchDetailModal batch={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function BatchDetailModal({ batch, onClose }) {
  const { data } = useQuery({ queryKey: ['batch-detail', batch.id], queryFn: () => manufacturingApi.getBatch(batch.id) });
  const b = data?.data ?? batch;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-800 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-surface-100">{b.reference}</h3>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-300 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-surface-500">Product</p><p className="text-surface-200">{b.product_name}</p></div>
          <div><p className="text-surface-500">Qty Produced</p><p className="text-surface-200">{formatQty(b.quantity_produced)}</p></div>
          <div><p className="text-surface-500">Production Cost</p><p className="text-surface-200">₨{formatQty(b.production_cost)}</p></div>
          <div><p className="text-surface-500">Date</p><p className="text-surface-200">{b.batch_date}</p></div>
        </div>
        {b.materials?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-surface-400 mb-2">Raw Materials Used</p>
            <div className="space-y-1">
              {b.materials.map(m => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-surface-300">{m.product_name}</span>
                  <span className="text-surface-400">{formatQty(m.quantity_used)} × ₨{formatQty(m.unit_cost)} = ₨{formatQty(m.total_cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
