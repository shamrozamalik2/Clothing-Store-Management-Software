import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon, PrinterIcon, XCircleIcon,
  UserIcon, CalendarIcon, BanknotesIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Badge from '@components/common/Badge';
import Button from '@components/ui/Button';
import ConfirmDialog from '@components/common/ConfirmDialog';
import ReturnExchangeModal from './ReturnExchangeModal';
import { printReceipt } from '@utils/printReceipt';
import { salesApi } from '@api/sales.api';
import { settingsApi } from '@api/settings.api';
import { formatCurrency, formatDate } from '@utils/format';
import { usePermission } from '@hooks/usePermission';

const STATUS_VARIANTS = { completed: 'success', cancelled: 'danger', refunded: 'warning', exchanged: 'info' };

export default function SaleDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { can }   = usePermission();
  const [voidOpen,   setVoidOpen]   = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sale', id],
    queryFn:  () => salesApi.getOne(id),
  });

  const { data: settingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const sale  = data?.data;
  const items = sale?.items ?? [];

  const voidMutation = useMutation({
    mutationFn: () => salesApi.voidSale(id),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Sale voided.');
      qc.invalidateQueries({ queryKey: ['sale', id] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setVoidOpen(false);
    },
    onError: (err) => { toast.error(err.message); setVoidOpen(false); },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !sale) {
    return (
      <div className="card p-12 text-center">
        <p className="text-surface-400 mb-4">Sale not found or failed to load.</p>
        <Button variant="ghost" onClick={() => navigate('/sales')}>Back to Sales</Button>
      </div>
    );
  }

  const canVoid      = sale.status === 'completed' && can('sales', 'delete');
  const canReturn    = ['completed', 'refunded', 'exchanged'].includes(sale.status) && can('sales', 'delete');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-surface-100 font-mono">{sale.reference}</h1>
              <Badge variant={STATUS_VARIANTS[sale.status] ?? 'neutral'} dot>
                {sale.status}
              </Badge>
            </div>
            <p className="text-sm text-surface-400 mt-0.5">
              {formatDate(sale.sale_date || sale.created_at, true)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" icon={<PrinterIcon className="h-4 w-4" />}
            onClick={() => printReceipt(sale, items, settingsRes?.data)}>
            Print Receipt
          </Button>
          {canReturn && (
            <Button variant="secondary" size="sm" icon={<ArrowPathIcon className="h-4 w-4" />}
              onClick={() => setReturnOpen(true)}>
              Return / Exchange
            </Button>
          )}
          {canVoid && (
            <Button variant="danger" size="sm" icon={<XCircleIcon className="h-4 w-4" />}
              onClick={() => setVoidOpen(true)}>
              Void Sale
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: items table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-3 border-b border-surface-700">
              <h2 className="text-sm font-semibold text-surface-200">Items ({items.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-800/50">
                  <th className="text-left px-4 py-3 text-surface-400 font-medium">Product</th>
                  <th className="text-center px-4 py-3 text-surface-400 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Unit Price</th>
                  <th className="text-right px-4 py-3 text-surface-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-100">{item.product_name}</p>
                      {(item.size || item.color) && (
                        <p className="text-xs text-surface-500">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                      )}
                      {item.sku && <p className="text-xs text-surface-600 font-mono">{item.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-surface-300">{parseInt(item.quantity, 10)}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-surface-100">
                      {formatCurrency(item.total ?? item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-surface-700 px-4 py-4">
              <div className="max-w-xs ml-auto space-y-2 text-sm">
                <TotalRow label="Subtotal"  value={sale.subtotal} />
                {parseFloat(sale.discount_amount) > 0 && (
                  <TotalRow label="Discount" value={sale.discount_amount} neg />
                )}
                {parseFloat(sale.tax_amount) > 0 && (
                  <TotalRow label="Tax" value={sale.tax_amount} />
                )}
                <div className="flex justify-between pt-2 border-t border-surface-700 font-bold text-base">
                  <span className="text-surface-200">Total</span>
                  <span className="text-primary-400">{formatCurrency(sale.total_amount)}</span>
                </div>
                <TotalRow label="Paid" value={sale.paid_amount} className="text-green-400" />
                {parseFloat(sale.change_amount) > 0 && (
                  <TotalRow label="Change" value={sale.change_amount} className="text-surface-400" />
                )}
                {parseFloat(sale.due_amount) > 0 && (
                  <TotalRow label="Due" value={sale.due_amount} className="text-red-400 font-semibold" />
                )}
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="card p-4">
              <h3 className="text-xs font-medium text-surface-400 mb-1">Notes</h3>
              <p className="text-sm text-surface-300">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Right column: metadata */}
        <div className="flex flex-col gap-4">
          {/* Payment info */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
              <BanknotesIcon className="h-4 w-4 text-surface-400" /> Payment
            </h2>
            <MetaRow label="Method" value={<span className="capitalize">{sale.payment_method}</span>} />
            <MetaRow label="Status" value={
              <Badge variant={STATUS_VARIANTS[sale.status] ?? 'neutral'} dot>{sale.status}</Badge>
            } />
            <MetaRow label="Total"  value={<span className="text-primary-400 font-bold">{formatCurrency(sale.total_amount)}</span>} />
            <MetaRow label="Paid"   value={<span className="text-green-400">{formatCurrency(sale.paid_amount)}</span>} />
            {parseFloat(sale.due_amount) > 0 && (
              <MetaRow label="Due" value={<span className="text-red-400 font-semibold">{formatCurrency(sale.due_amount)}</span>} />
            )}
            {parseFloat(sale.change_amount) > 0 && (
              <MetaRow label="Change" value={formatCurrency(sale.change_amount)} />
            )}
          </div>

          {/* Customer info */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-surface-400" /> Customer
            </h2>
            {sale.customer_name ? (
              <>
                <MetaRow label="Name"  value={<span className="text-surface-100">{sale.customer_name}</span>} />
                {sale.customer_phone && <MetaRow label="Phone" value={sale.customer_phone} />}
              </>
            ) : (
              <p className="text-sm text-surface-500">Walk-in customer</p>
            )}
          </div>

          {/* Transaction info */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-surface-400" /> Details
            </h2>
            <MetaRow label="Cashier"   value={sale.cashier_name} />
            <MetaRow label="Reference" value={<span className="font-mono text-xs">{sale.reference}</span>} />
            <MetaRow label="Date"      value={formatDate(sale.sale_date || sale.created_at, true)} />
            {sale.voided_at && <MetaRow label="Voided"  value={formatDate(sale.voided_at, true)} className="text-red-400" />}
          </div>
        </div>
      </div>

      {returnOpen && (
        <ReturnExchangeModal
          sale={sale}
          onClose={() => setReturnOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['sale', id] });
            qc.invalidateQueries({ queryKey: ['sales'] });
            qc.invalidateQueries({ queryKey: ['products'] });
            qc.invalidateQueries({ queryKey: ['notifications-low-stock'] });
            qc.invalidateQueries({ queryKey: ['dashboard-today'] });
            qc.invalidateQueries({ queryKey: ['dashboard-overview'] });
          }}
        />
      )}

      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={() => voidMutation.mutate()}
        loading={voidMutation.isPending}
        title={`Void Sale "${sale.reference}"?`}
        description="This will reverse the sale, restore stock, and cancel any customer credit. This action cannot be undone."
        variant="danger"
        confirmLabel="Void Sale"
      />
    </div>
  );
}

function TotalRow({ label, value, neg = false, className = '' }) {
  return (
    <div className={`flex justify-between text-surface-300 ${className}`}>
      <span className="text-surface-400">{label}</span>
      <span>{neg ? '−' : ''}{formatCurrency(value)}</span>
    </div>
  );
}

function MetaRow({ label, value, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-2 text-sm ${className}`}>
      <span className="text-surface-500">{label}</span>
      <span className="text-surface-300 text-right">{value ?? '—'}</span>
    </div>
  );
}
