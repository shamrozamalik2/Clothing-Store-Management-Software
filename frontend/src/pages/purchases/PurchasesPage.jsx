import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import Select from '@components/common/Select';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { suppliersApi } from '@api/suppliers.api';
import { purchasesApi } from '@api/purchases.api';
import { formatCurrency } from '@utils/format';

const STATUS_VARIANTS = {
  received:  'success',
  ordered:   'info',
  returned:  'warning',
  cancelled: 'neutral',
};

export default function PurchasesPage() {
  const { can } = usePermission();
  const navigate = useNavigate();

  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [supplierFilter, setSupplier] = useState('');
  const [statusFilter, setStatus]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { search, page, supplier: supplierFilter, status: statusFilter }],
    queryFn:  () => purchasesApi.list({ search, page, limit: 20, supplier: supplierFilter, status: statusFilter }),
    placeholderData: keepPreviousData,
  });

  const { data: suppData } = useQuery({ queryKey: ['suppliers-flat'], queryFn: suppliersApi.flat });

  const purchases  = data?.data ?? [];
  const pagination = data?.pagination;
  const suppliers  = suppData?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Purchases</h1>
          <p className="text-sm text-surface-400 mt-0.5">Track inventory purchases and supplier payments.</p>
        </div>
        {can('purchases', 'create') && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/purchases/new')}>
            New Purchase
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search reference or supplier…"
          className="w-64"
        />
        <Select value={supplierFilter} onChange={e => { setSupplier(e.target.value); setPage(1); }}
          placeholder="All Suppliers" className="w-44 !py-1.5 !text-sm">
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          placeholder="All Statuses" className="w-36 !py-1.5 !text-sm">
          <option value="received">Received</option>
          <option value="ordered">Ordered</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} purchase{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <Skeleton />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={<ShoppingCartIcon className="h-10 w-10" />}
            title="No purchases found"
            description="Record your first purchase to start tracking inventory."
            action={can('purchases', 'create') ? { label: 'New Purchase', onClick: () => navigate('/purchases/new') } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Reference</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Date</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Total</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Due</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium text-surface-100">{p.reference}</p>
                    <p className="text-xs text-surface-500">{p.created_by_name}</p>
                  </td>
                  <td className="px-4 py-3 text-surface-300 hidden md:table-cell">
                    {p.supplier_name ?? <span className="text-surface-600">Walk-in</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">
                    {new Date(p.purchase_date).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-surface-100">
                    {formatCurrency(p.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className={p.due_amount > 0 ? 'text-red-400 font-medium' : 'text-surface-500'}>
                      {formatCurrency(p.due_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANTS[p.status] ?? 'neutral'}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/purchases/${p.id}`)}
                      className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      title="View">
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
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
