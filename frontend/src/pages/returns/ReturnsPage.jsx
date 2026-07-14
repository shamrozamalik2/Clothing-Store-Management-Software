import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { setPageTitle } from '@store/slices/uiSlice';
import Card from '@components/ui/Card';
import { returnsApi } from '@api/returns.api';
import { formatCurrency } from '@utils/format';

const TYPE_STYLES = {
  return:   'bg-blue-900/40 text-blue-400',
  exchange: 'bg-amber-900/40 text-amber-400',
};

export default function ReturnsPage() {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);

  useEffect(() => { dispatch(setPageTitle('Returns & Exchanges')); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn:  () => returnsApi.list({ page, limit: 25 }),
  });

  const returns    = data?.data?.returns    ?? [];
  const pagination = data?.data?.pagination ?? {};

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-surface-100">Returns & Exchanges</h2>
        <p className="text-sm text-surface-500 mt-0.5">History of all processed returns and exchanges</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Original Sale</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Return Value</th>
                <th className="px-4 py-3 text-right">Net Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-700 animate-pulse rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : returns.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-surface-500">
                      No returns recorded yet.
                    </td>
                  </tr>
                )
                : returns.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-surface-300">{r.reference}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[r.type] ?? ''}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/sales/${r.sale_id}`}
                        className="font-mono text-xs text-primary-400 hover:text-primary-300"
                      >
                        {r.sale_reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-surface-300">{r.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      {r.return_date ? new Date(r.return_date).toLocaleDateString('en-PK') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-300">
                      {formatCurrency(r.total_amount)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${parseFloat(r.refund_amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {parseFloat(r.refund_amount) >= 0 ? '' : '−'}
                      {formatCurrency(Math.abs(parseFloat(r.refund_amount)))}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800 text-sm text-surface-400">
            <span>{pagination.total} records</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs">Page {page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
