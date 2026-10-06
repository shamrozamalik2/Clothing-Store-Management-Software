import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Badge from '@components/common/Badge';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import { productsApi } from '@api/products.api';
import { settingsApi } from '@api/settings.api';
import { usePermission } from '@hooks/usePermission';
import { useFeatures } from '@hooks/useFeatures';

const STATUS = {
  expired:       { label: 'Expired',         variant: 'danger' },
  expires_today: { label: 'Expires today',   variant: 'warning' },
  expires_soon:  { label: 'Expires soon',    variant: 'info' },
};

// Dates come from the server as UTC calendar days, so they're shown in UTC too.
function formatDay(value) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function ExpiryAlertsCard() {
  const { isOn }  = useFeatures();
  const { can }   = usePermission();
  const qc        = useQueryClient();
  const [days, setDays] = useState('');

  const { data } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn:  productsApi.expiryAlerts,
    enabled:  isOn('EXPIRY'),
    staleTime: 60_000,
  });
  const alerts = data?.data;

  useEffect(() => {
    if (alerts) setDays(String(alerts.warning_days));
  }, [alerts?.warning_days]);

  const saveDays = useMutation({
    mutationFn: (value) => settingsApi.updateOne('expiry_warning_days', value),
    onSuccess: () => {
      toast.success('Expiry warning window saved.');
      qc.invalidateQueries({ queryKey: ['expiry-alerts'] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isOn('EXPIRY') || !alerts) return null;

  const rows = [
    ...alerts.expired.map(r => ({ ...r, status: 'expired' })),
    ...alerts.expires_today.map(r => ({ ...r, status: 'expires_today' })),
    ...alerts.expires_soon.map(r => ({ ...r, status: 'expires_soon' })),
  ];
  const shown = rows.slice(0, 15);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-surface-200">Expiry alerts</h2>
          <p className="text-xs text-surface-500">Lots that have expired or expire within {alerts.warning_days} days.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="danger">{alerts.expired.length} expired</Badge>
          <Badge variant="warning">{alerts.expires_today.length} today</Badge>
          <Badge variant="info">{alerts.expires_soon.length} soon</Badge>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-surface-400">No lots expire in the next {alerts.warning_days} days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-surface-500 uppercase tracking-wide">
                <th className="py-2 pr-3 font-semibold">Product</th>
                <th className="py-2 pr-3 font-semibold">Batch</th>
                <th className="py-2 pr-3 font-semibold">Expiry</th>
                <th className="py-2 pr-3 font-semibold text-right">Qty</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {shown.map(r => (
                <tr key={`${r.batch_id}`}>
                  <td className="py-2 pr-3">
                    <p className="font-medium text-surface-100">{r.product_name}</p>
                    <p className="text-xs text-surface-500 font-mono">{r.sku}</p>
                  </td>
                  <td className="py-2 pr-3 text-surface-300">{r.batch_no || '—'}</td>
                  <td className="py-2 pr-3 text-surface-300">{formatDay(r.expiry_date)}</td>
                  <td className="py-2 pr-3 text-right text-surface-100">{r.quantity}</td>
                  <td className="py-2"><Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > shown.length && (
            <p className="text-xs text-surface-500 mt-2">Showing {shown.length} of {rows.length} lots.</p>
          )}
        </div>
      )}

      {can('settings', 'edit') && (
        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-surface-700/60">
          <div className="w-40">
            <Input label="Warn this many days ahead" type="number" min="0" value={days}
              onChange={e => setDays(e.target.value)} />
          </div>
          <Button size="sm" variant="secondary"
            loading={saveDays.isPending}
            disabled={days === '' || String(alerts.warning_days) === String(days)}
            onClick={() => saveDays.mutate(days)}>
            Save Window
          </Button>
        </div>
      )}
    </div>
  );
}
