import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import { cn } from '@utils/cn';

/**
 * Inline variant editor used in ProductFormPage.
 * `variants` = array in form state. `onChange` propagates changes back.
 * Works in create mode (local only) and edit mode (also fires API mutations).
 */
export default function VariantsSection({ variants = [], onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx]   = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { size: '', color: '', sku_suffix: '', price_adjustment: 0, stock_quantity: 0, low_stock_alert: 5 },
  });

  function openAdd() {
    reset({ size: '', color: '', sku_suffix: '', price_adjustment: 0, stock_quantity: 0, low_stock_alert: 5 });
    setEditIdx(null);
    setShowForm(true);
  }

  function openEdit(idx) {
    const v = variants[idx];
    reset({
      size:             v.size ?? '',
      color:            v.color ?? '',
      sku_suffix:       v.sku_suffix ?? '',
      price_adjustment: v.price_adjustment ?? 0,
      stock_quantity:   v.stock_quantity ?? 0,
      low_stock_alert:  v.low_stock_alert ?? 5,
    });
    setEditIdx(idx);
    setShowForm(true);
  }

  function save(data) {
    const parsed = {
      ...data,
      price_adjustment: parseFloat(data.price_adjustment) || 0,
      stock_quantity:   parseInt(data.stock_quantity) || 0,
      low_stock_alert:  parseInt(data.low_stock_alert) || 5,
    };
    if (editIdx !== null) {
      const next = variants.map((v, i) => i === editIdx ? { ...v, ...parsed } : v);
      onChange(next);
    } else {
      onChange([...variants, parsed]);
    }
    setShowForm(false);
    reset();
  }

  function remove(idx) {
    onChange(variants.filter((_, i) => i !== idx));
  }

  function cancel() {
    setShowForm(false);
    reset();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-surface-200">Product Variants</p>
          <p className="text-xs text-surface-500">Add size/color variants with individual stock and pricing.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={openAdd}>
          Add Variant
        </Button>
      </div>

      {/* Variant list */}
      {variants.length > 0 && (
        <div className="rounded-lg border border-surface-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-800/60 border-b border-surface-700">
                <th className="text-left px-3 py-2 text-surface-400 font-medium">Size / Color</th>
                <th className="text-left px-3 py-2 text-surface-400 font-medium hidden sm:table-cell">SKU Suffix</th>
                <th className="text-right px-3 py-2 text-surface-400 font-medium">Adj.</th>
                <th className="text-right px-3 py-2 text-surface-400 font-medium">Stock</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {variants.map((v, idx) => (
                <tr key={idx} className="hover:bg-surface-800/30">
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {v.size  && <Badge variant="info"   >{v.size}</Badge>}
                      {v.color && <Badge variant="purple" >{v.color}</Badge>}
                      {!v.size && !v.color && <span className="text-surface-500">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-surface-400 hidden sm:table-cell">{v.sku_suffix || '—'}</td>
                  <td className="px-3 py-2 text-right text-surface-300">
                    {v.price_adjustment !== 0
                      ? <span className={v.price_adjustment > 0 ? 'text-green-400' : 'text-red-400'}>
                          {v.price_adjustment > 0 ? '+' : ''}{v.price_adjustment}
                        </span>
                      : <span className="text-surface-600">0</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn(
                      'font-medium',
                      v.stock_quantity <= 0 ? 'text-red-400' :
                      v.stock_quantity <= (v.low_stock_alert ?? 5) ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {v.stock_quantity}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(idx)}
                        className="p-1 text-surface-500 hover:text-primary-400 transition-colors">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(idx)}
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

      {/* Inline form */}
      {showForm && (
        <div className="rounded-lg border border-primary-500/40 bg-primary-500/5 p-4">
          <p className="text-sm font-medium text-surface-200 mb-3">
            {editIdx !== null ? 'Edit Variant' : 'New Variant'}
          </p>
          <form onSubmit={handleSubmit(save)}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input label="Size" placeholder="e.g. M, L, XL"
                {...register('size')} />
              <Input label="Color" placeholder="e.g. Red, Navy"
                {...register('color')} />
              <Input label="SKU Suffix" placeholder="e.g. -RED-M"
                {...register('sku_suffix')} />
              <Input label="Price Adjustment (₨)" type="number" step="0.01"
                error={errors.price_adjustment?.message}
                {...register('price_adjustment')} />
              <Input label="Stock Qty" type="number" min="0"
                error={errors.stock_quantity?.message}
                {...register('stock_quantity')} />
              <Input label="Low Stock Alert" type="number" min="0"
                {...register('low_stock_alert')} />
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              <button type="button" onClick={cancel}
                className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-1">
                <XMarkIcon className="h-3.5 w-3.5" /> Cancel
              </button>
              <button type="submit"
                className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors px-2 py-1">
                <CheckIcon className="h-3.5 w-3.5" /> {editIdx !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
