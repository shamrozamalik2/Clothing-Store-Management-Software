import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import Modal from '@components/common/Modal';
import Input from '@components/ui/Input';
import Select from '@components/common/Select';
import Textarea from '@components/common/Textarea';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { usePermission } from '@hooks/usePermission';
import { purchasesApi } from '@api/purchases.api';
import { formatCurrency } from '@utils/format';

const STATUS_VARIANTS = {
  received:  'success',
  ordered:   'info',
  returned:  'warning',
  cancelled: 'neutral',
};

export default function PurchaseDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { can }  = usePermission();

  const [payModal, setPayModal]   = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes]   = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn:  () => purchasesApi.getOne(id),
  });

  const purchase = data?.data;

  const statusMutation = useMutation({
    mutationFn: (status) => purchasesApi.updateStatus(id, status),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setCancelOpen(false);
      setReceiveOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const payMutation = useMutation({
    mutationFn: () => purchasesApi.recordPayment(id, { amount: parseFloat(payAmount), method: payMethod, notes: payNotes }),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setPayModal(false);
      setPayAmount(''); setPayNotes('');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  );
  if (!purchase) return <p className="text-surface-400">Purchase not found.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchases')}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-surface-100 font-mono">{purchase.reference}</h1>
            <Badge variant={STATUS_VARIANTS[purchase.status] ?? 'neutral'}>
              {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-surface-400 mt-0.5">
            {new Date(purchase.purchase_date).toLocaleDateString('en-PK', { dateStyle: 'long' })}
            {purchase.supplier_name && ` · ${purchase.supplier_name}`}
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {purchase.status === 'ordered' && can('purchases', 'edit') && (
            <Button
              variant="secondary" size="sm"
              icon={<CheckCircleIcon className="h-4 w-4" />}
              onClick={() => setReceiveOpen(true)}>
              Mark Received
            </Button>
          )}
          {purchase.due_amount > 0 && can('purchases', 'edit') && (
            <Button
              size="sm"
              icon={<BanknotesIcon className="h-4 w-4" />}
              onClick={() => setPayModal(true)}>
              Record Payment
            </Button>
          )}
          {['ordered', 'received'].includes(purchase.status) && can('purchases', 'edit') && (
            <Button variant="danger" size="sm"
              icon={<XCircleIcon className="h-4 w-4" />}
              onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items table */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-700">
            <p className="text-sm font-semibold text-surface-200">Items</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700/50 bg-surface-800/30">
                <th className="text-left px-4 py-2 text-surface-400 font-medium">Product</th>
                <th className="text-right px-4 py-2 text-surface-400 font-medium">Qty</th>
                <th className="text-right px-4 py-2 text-surface-400 font-medium">Unit Cost</th>
                <th className="text-right px-4 py-2 text-surface-400 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/30">
              {(purchase.items ?? []).map(item => (
                <tr key={item.id} className="hover:bg-surface-800/20">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-surface-100">{item.product_name}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-xs text-surface-500 font-mono">{item.product_sku}</span>
                      {item.size  && <span className="text-xs text-primary-400">{item.size}</span>}
                      {item.color && <span className="text-xs text-purple-400">{item.color}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-300">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-surface-300">{formatCurrency(item.unit_cost)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-surface-100">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right — summary */}
        <div className="flex flex-col gap-5">
          <div className="card space-y-2 text-sm">
            <p className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">Summary</p>
            <Row label="Supplier"   value={purchase.supplier_name ?? 'Walk-in'} />
            <Row label="Created by" value={purchase.created_by_name} />
            <Row label="Payment"    value={purchase.payment_method.replace('_',' ')} />
          </div>

          <div className="card space-y-2 text-sm">
            <p className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">Financials</p>
            <Row label="Subtotal"   value={formatCurrency(purchase.subtotal)} />
            {purchase.discount_amount > 0 && <Row label="Discount" value={`− ${formatCurrency(purchase.discount_amount)}`} className="text-green-400" />}
            {purchase.tax_amount    > 0 && <Row label="Tax"      value={formatCurrency(purchase.tax_amount)} />}
            {purchase.shipping_cost > 0 && <Row label="Shipping" value={formatCurrency(purchase.shipping_cost)} />}
            <div className="border-t border-surface-700 pt-2 flex justify-between font-semibold text-surface-100">
              <span>Total</span>
              <span>{formatCurrency(purchase.total_amount)}</span>
            </div>
            <Row label="Paid"  value={formatCurrency(purchase.paid_amount)} className="text-green-400" />
            <Row label="Due"   value={formatCurrency(purchase.due_amount)}
              className={purchase.due_amount > 0 ? 'text-red-400 font-medium' : 'text-surface-400'} />
          </div>

          {purchase.notes && (
            <div className="card">
              <p className="text-xs font-medium text-surface-400 mb-1">Notes</p>
              <p className="text-sm text-surface-300">{purchase.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pay modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} size="sm"
        title="Record Payment" description={`Due: ${formatCurrency(purchase.due_amount)}`}>
        <Modal.Body className="space-y-4">
          <Input label="Amount (₨)" type="number" step="0.01" min="0.01"
            max={purchase.due_amount} value={payAmount}
            onChange={e => setPayAmount(e.target.value)} required />
          <Select label="Method" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </Select>
          <Textarea label="Notes" rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setPayModal(false)}>Cancel</Button>
          <Button loading={payMutation.isPending}
            disabled={!payAmount || parseFloat(payAmount) <= 0}
            onClick={() => payMutation.mutate()}>
            Record Payment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Receive confirm */}
      <ConfirmDialog open={receiveOpen} onClose={() => setReceiveOpen(false)}
        onConfirm={() => statusMutation.mutate('received')}
        loading={statusMutation.isPending}
        title="Mark as Received?"
        description="Stock quantities will be updated for all items in this purchase."
        variant="warning" confirmLabel="Mark Received" />

      {/* Cancel confirm */}
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)}
        onConfirm={() => statusMutation.mutate('cancelled')}
        loading={statusMutation.isPending}
        title="Cancel Purchase?"
        description={purchase.status === 'received'
          ? 'This will reverse the stock update for all received items.'
          : 'This purchase will be marked as cancelled.'}
        variant="danger" confirmLabel="Cancel Purchase" />
    </div>
  );
}

function Row({ label, value, className = 'text-surface-300' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-surface-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
