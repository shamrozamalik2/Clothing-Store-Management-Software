import { useState } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import { cn } from '@utils/cn';

const EMPTY = { size: '', color: '', sku: '', barcode: '', sale_price: '', cost_price: '', stock_quantity: '' };

// Suggested SKU, matching the server's rule, shown until the user types one.
function suggestSku(productSku, color, size) {
  return [productSku, color, size].filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
}

export default function VariantsSection({ variants = [], onChange, productSku = '' }) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [error, setError]       = useState('');

  const isEditing = editIdx !== null;
  const existingVariant = isEditing ? variants[editIdx] : null;

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function openAdd() {
    setForm(EMPTY);
    setEditIdx(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(idx) {
    const v = variants[idx];
    setForm({
      size:           v.size ?? '',
      color:          v.color ?? '',
      sku:            v.sku ?? '',
      barcode:        v.barcode ?? '',
      sale_price:     v.sale_price ?? '',
      cost_price:     v.cost_price ?? '',
      stock_quantity: v.stock_quantity ?? '',
    });
    setEditIdx(idx);
    setError('');
    setShowForm(true);
  }

  function save() {
    const size  = form.size.trim();
    const color = form.color.trim();
    if (!size && !color) return setError('Enter a size or a colour.');

    const clash = variants.findIndex((v, i) =>
      i !== editIdx &&
      (v.size ?? '').trim().toLowerCase() === size.toLowerCase() &&
      (v.color ?? '').trim().toLowerCase() === color.toLowerCase()
    );
    if (clash !== -1) return setError('This size and colour is already in the list.');

    const base = {
      size:       size || null,
      color:      color || null,
      sku:        form.sku.trim() || suggestSku(productSku, color, size),
      barcode:    form.barcode.trim() || null,
      sale_price: parseFloat(form.sale_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      is_active:  existingVariant?.is_active ?? true,
    };
    // Stock on an existing variant changes through stock adjustments, so it's kept as it is.
    const entry = isEditing
      ? { ...existingVariant, ...base, stock_quantity: existingVariant.stock_quantity }
      : { ...base, stock_quantity: parseInt(form.stock_quantity, 10) || 0 };

    onChange(isEditing
      ? variants.map((v, i) => (i === editIdx ? entry : v))
      : [...variants, entry]);
    setShowForm(false);
    setForm(EMPTY);
    setEditIdx(null);
    setError('');
  }

  function cancel() {
    setShowForm(false);
    setForm(EMPTY);
    setEditIdx(null);
    setError('');
  }

  function remove(idx) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-200">Product Variants</p>
          <p className="text-xs text-surface-500">
            Sizes and colours, each with its own SKU, barcode, prices and stock. Leave the barcode blank to generate one.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={openAdd}>
          Add Variant
        </Button>
      </div>

      {variants.length > 0 && (
        <div className="rounded-lg border border-surface-700 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-800/60 border-b border-surface-700">
                <th className="text-left px-3 py-2 text-surface-400 font-medium">Size / Colour</th>
                <th className="text-left px-3 py-2 text-surface-400 font-medium">SKU</th>
                <th className="text-left px-3 py-2 text-surface-400 font-medium hidden sm:table-cell">Barcode</th>
                <th className="text-right px-3 py-2 text-surface-400 font-medium">Sale</th>
                <th className="text-right px-3 py-2 text-surface-400 font-medium">Stock</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {variants.map((v, idx) => (
                <tr key={v._id || v.id || idx} className="hover:bg-surface-800/30">
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {v.size  && <Badge variant="info">{v.size}</Badge>}
                      {v.color && <Badge variant="purple">{v.color}</Badge>}
                      {!v.size && !v.color && <span className="text-surface-500">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-surface-400 font-mono">{v.sku || '—'}</td>
                  <td className="px-3 py-2 text-surface-400 font-mono hidden sm:table-cell">
                    {v.barcode || <span className="text-surface-600 font-sans">Generated on save</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-surface-300">{v.sale_price ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn(
                      'font-medium',
                      v.stock_quantity <= 0 ? 'text-red-400' : 'text-green-400'
                    )}>
                      {v.stock_quantity ?? 0}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button type="button" onClick={() => openEdit(idx)}
                        className="p-1 text-surface-500 hover:text-primary-400 transition-colors">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => remove(idx)}
                        className="p-1 text-surface-500 hover:text-red-400 transition-colors">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-primary-500/40 bg-primary-500/5 p-4">
          <p className="text-sm font-medium text-surface-200 mb-3">
            {isEditing ? 'Edit Variant' : 'New Variant'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Size" placeholder="e.g. M, L, XL" value={form.size} onChange={set('size')} />
            <Input label="Colour" placeholder="e.g. Black, Navy" value={form.color} onChange={set('color')} />
            <Input label="SKU" placeholder={suggestSku(productSku, form.color, form.size) || 'Auto'}
              value={form.sku} onChange={set('sku')} />
            <Input label="Barcode" placeholder="Blank = generate" value={form.barcode} onChange={set('barcode')} />
            <Input label="Sale price" type="number" min="0" step="0.01" value={form.sale_price} onChange={set('sale_price')} />
            <Input label="Cost price" type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} />
            {!isEditing && (
              <Input label="Opening stock" type="number" min="0" value={form.stock_quantity} onChange={set('stock_quantity')} />
            )}
          </div>
          {isEditing && (
            <p className="text-xs text-surface-500 mt-3">Stock changes are made with Stock Adjust.</p>
          )}
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" onClick={cancel}
              className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-1">
              <XMarkIcon className="h-3.5 w-3.5" /> Cancel
            </button>
            <button type="button" onClick={save}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors px-2 py-1">
              <CheckIcon className="h-3.5 w-3.5" /> {isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
