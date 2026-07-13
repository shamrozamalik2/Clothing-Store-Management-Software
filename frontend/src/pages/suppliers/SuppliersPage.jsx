import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { suppliersApi } from '@api/suppliers.api';
import { formatCurrency } from '@utils/format';
import SupplierFormModal from './components/SupplierFormModal';

export default function SuppliersPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, page }],
    queryFn:  () => suppliersApi.list({ search, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const suppliers  = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => suppliersApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(s)  { setEditing(s);    setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Suppliers</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage your inventory suppliers and their balances.</p>
        </div>
        {can('suppliers', 'create') && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
            New Supplier
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search suppliers…"
          className="w-72"
        />
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} supplier{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <Skeleton />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={<TruckIcon className="h-10 w-10" />}
            title="No suppliers found"
            description={search ? 'Try a different search term.' : 'Add your first supplier to get started.'}
            action={can('suppliers', 'create') ? { label: 'New Supplier', onClick: openCreate } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">City</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Purchases</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Balance</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-surface-100">{s.name}</p>
                      {s.company && <p className="text-xs text-surface-500">{s.company}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-surface-300">{s.phone}</span>
                      {s.email && <span className="text-xs text-surface-500">{s.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden lg:table-cell">
                    {s.city ?? <span className="text-surface-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300 hidden sm:table-cell">
                    {s.purchase_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.current_balance > 0 ? 'text-red-400 font-medium' : 'text-surface-400'}>
                      {formatCurrency(s.current_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={s.is_active ? 'success' : 'neutral'} dot>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {can('suppliers', 'edit') && (
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('suppliers', 'delete') && (
                        <button onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      <SupplierFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editSupplier={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Deactivate "${deleteTarget?.name}"?`}
        description="The supplier will be deactivated. Existing purchases will be preserved."
        variant="danger"
        confirmLabel="Deactivate"
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
