import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { XMarkIcon, PencilSquareIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { productsApi } from '@api/products.api';
import { cn } from '@utils/cn';

const OVERLAY  = { hidden: { opacity: 0 }, show: { opacity: 1 }, exit: { opacity: 0 } };
const PANEL    = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  show:   { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 380 } },
  exit:   { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease: 'easeIn' } },
};

export default function QuickEditModal({ product, onClose }) {
  const [visible, setVisible] = useState(true);
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { isDirty, errors } } = useForm({
    defaultValues: {
      name:           product.name,
      sale_price:     product.sale_price ?? '',
      cost_price:     product.cost_price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      is_active:      product.is_active,
    },
  });

  const saveMut = useMutation({
    mutationFn: (data) => productsApi.update(product.id, {
      name:           data.name,
      stock_quantity: parseInt(data.stock_quantity, 10) || 0,
      is_active:      data.is_active,
    }),
    onSuccess: () => {
      toast.success(`"${product.name}" updated.`);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-stats'] });
      setVisible(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const close = () => setVisible(false);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={OVERLAY} initial="hidden" animate="show" exit="exit"
            transition={{ duration: 0.18 }}
            onClick={close}
          />

          {/* Panel wrapper — keeps it centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="modal-surface pointer-events-auto w-full max-w-md overflow-hidden"
              variants={PANEL} initial="hidden" animate="show" exit="exit"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary-500/10">
                    <PencilSquareIcon className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-surface-100">Quick Edit</h2>
                    <p className="text-xs text-surface-500 truncate max-w-[260px]">{product.name}</p>
                  </div>
                </div>
                <button onClick={close} className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(v => saveMut.mutate(v))} className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">Name</label>
                  <input {...register('name', { required: true })}
                    className={cn('w-full px-3 py-2 rounded-lg bg-surface-800 border text-surface-100 text-sm focus:outline-none focus:border-primary-500',
                      errors.name ? 'border-red-500' : 'border-surface-600')} />
                </div>

                {/* Prices — locked after creation */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Sale Price', value: product.sale_price },
                    { label: 'Cost Price', value: product.cost_price },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">{label}</label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/60 border border-surface-700/50 text-surface-500 text-sm cursor-not-allowed select-none">
                        <LockClosedIcon className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{value != null ? Number(value).toFixed(2) : '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stock */}
                {product.track_inventory && (
                  <div>
                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1.5">
                      Stock Quantity <span className="text-surface-600 normal-case font-normal">(current: {product.stock_quantity})</span>
                    </label>
                    <input type="number" step="1" {...register('stock_quantity')}
                      className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 text-sm focus:outline-none focus:border-primary-500" />
                  </div>
                )}

                {/* Active toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" {...register('is_active')}
                    className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-surface-300">Product is active (visible in POS)</span>
                </label>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-700/60">
                  <Link to={`/products/${product.id}/edit`} onClick={close}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                    Full edit page →
                  </Link>
                  <div className="flex gap-2">
                    <button type="button" onClick={close}
                      className="px-4 py-2 rounded-lg border border-surface-600 text-surface-300 text-sm hover:bg-surface-700 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={saveMut.isPending || !isDirty}
                      className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                        isDirty && !saveMut.isPending
                          ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-btn hover:shadow-btn-hover'
                          : 'bg-surface-700 text-surface-500 cursor-not-allowed')}>
                      {saveMut.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
