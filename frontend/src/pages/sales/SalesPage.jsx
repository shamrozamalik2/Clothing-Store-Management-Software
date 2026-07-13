import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBagIcon, EyeIcon,
  BanknotesIcon, CreditCardIcon, ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import Badge from '@components/common/Badge';
import EmptyState from '@components/common/EmptyState';
import Select from '@components/common/Select';
import { salesApi } from '@api/sales.api';
import { formatCurrency, formatDate } from '@utils/format';
import { usePermission } from '@hooks/usePermission';

const STATUS_VARIANTS = { completed: 'success', cancelled: 'danger', refunded: 'warning' };
const METHOD_ICONS    = {
  cash:   <BanknotesIcon className="h-3.5 w-3.5" />,
  card:   <CreditCardIcon className="h-3.5 w-3.5" />,
  split:  <ArrowsRightLeftIcon className="h-3.5 w-3.5" />,
  credit: <span className="text-2xs font-bold">CR</span>,
};

export default function SalesPage() {
  const { can } = usePermission();
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [method, setMethod]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { search, page, status, payment_method: method }],
    queryFn:  () => salesApi.list({ search, page, limit: 25, status: status || undefined, payment_method: method || undefined }),
    placeholderData: keepPreviousData,
  });

  const sales      = data?.data ?? [];
  const pagination = data?.pagination;
  const summary    = data?.summary;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-surface-100">Sales History</h1>
        <p className="text-sm text-surface-400 mt-0.5">Browse all completed and cancelled sales transactions.</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Today's Sales" value={summary.sale_count ?? 0} unit="txns" />
          <SummaryCard label="Revenue" value={formatCurrency(summary.total_revenue ?? 0)} />
          <SummaryCard label="Collected" value={formatCurrency(summary.total_paid ?? 0)} highlight="green" />
          <SummaryCard label="Outstanding" value={formatCurrency(summary.total_due ?? 0)} highlight={summary.total_due > 0 ? 'red' : undefined} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Reference, customer…" className="w-64" />
        <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-36">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }} className="w-36">
          <option value="">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="split">Split</option>
          <option value="credit">Credit</option>
        </Select>
        <span className="text-sm text-surface-500 ml-auto">
          {pagination?.total ?? 0} sale{(pagination?.total ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? <Skeleton /> : sales.length === 0 ? (
          <EmptyState icon={<ShoppingBagIcon className="h-10 w-10" />}
            title="No sales found"
            description={search ? 'Try a different search.' : 'Sales will appear here after a transaction at the POS.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Reference</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Customer</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Method</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Total</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Paid</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Due</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium hidden xl:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {sales.map(sale => (
                <tr key={sale.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-surface-200">{sale.reference}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-surface-300">
                    {sale.customer_name ?? <span className="text-surface-500">Walk-in</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-surface-400 capitalize">
                      {METHOD_ICONS[sale.payment_method]} {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-surface-100">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-surface-300 hidden lg:table-cell">
                    {formatCurrency(sale.paid_amount)}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {sale.due_amount > 0
                      ? <span className="text-red-400 font-medium">{formatCurrency(sale.due_amount)}</span>
                      : <span className="text-surface-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANTS[sale.status] ?? 'neutral'} dot>
                      {sale.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-surface-500 text-xs hidden xl:table-cell">
                    {formatDate(sale.sale_date || sale.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {can('sales', 'view') && (
                      <Link to={`/sales/${sale.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors">
                        <EyeIcon className="h-3.5 w-3.5" /> View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

function SummaryCard({ label, value, unit, highlight }) {
  const valueClass = highlight === 'green' ? 'text-green-400'
                   : highlight === 'red'   ? 'text-red-400'
                   : 'text-surface-100';
  return (
    <div className="card p-4">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>
        {value}{unit && <span className="text-sm font-normal text-surface-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />)}
    </div>
  );
}
