import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import ImportCsvModal from '@components/common/ImportCsvModal';
import { usePermission } from '@hooks/usePermission';
import { customersApi } from '@api/customers.api';
import { formatCurrency } from '@utils/format';
import CustomerFormModal from './components/CustomerFormModal';

const GROUP_VARIANTS = { general: 'neutral', wholesale: 'info', vip: 'purple', staff: 'warning' };

export default function CustomersPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importOpen, setImportOpen]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn:  () => customersApi.list({ search, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });

  const customers  = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => customersApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['customers'] });
      setDeleteTarget(null);
    },
    onError: (err) => { toast.error(err.message); setDeleteTarget(null); },
  });

  async function handleImportCsv(file) {
    setImporting(true);
    try {
      const res = await customersApi.importCsv(file);
      qc.invalidateQueries({ queryKey: ['customers'] });
      return res.data;
    } catch (err) {
      toast.error(err.message || 'Import failed');
      return null;
    } finally {
      setImporting(false);
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} customer(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => customersApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} could not be deleted.`) : toast.success(`${ids.length} customer(s) deleted.`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ['customers'] });
    setBulkDeleting(false);
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c)  { setEditing(c);    setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Customers</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage customer accounts, balances, and loyalty points.</p>
        </div>
        <div className="flex items-center gap-2">
          {can('customers', 'create') && (
            <Button variant="ghost" icon={<ArrowUpTrayIcon className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
          )}
          {can('customers', 'create') && (
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>New Customer</Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name, phone…" className="w-72" />
        <span className="text-sm text-surface-500 ml-auto">
          {pagination?.total ?? 0} customer{(pagination?.total ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">Clear</button>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {isLoading ? <Skeleton /> : customers.length === 0 ? (
          <EmptyState icon={<UserGroupIcon className="h-10 w-10" />}
            title="No customers found"
            description={search ? 'Try a different search.' : 'Add your first customer.'}
            action={can('customers', 'create') ? { label: 'New Customer', onClick: openCreate } : null} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(customers.map(c => c.id)) : new Set())} />
                </th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Contact</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Group</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Sales</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Balance</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(c.id)}
                      onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(c.id) : n.delete(c.id); setSelectedIds(n); }} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-100">{c.name}</p>
                    {c.city && <p className="text-xs text-surface-500">{c.city}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-surface-300">{c.phone ?? '—'}</p>
                    {c.email && <p className="text-xs text-surface-500">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <Badge variant={GROUP_VARIANTS[c.customer_group] ?? 'neutral'}>
                      {c.customer_group}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300 hidden lg:table-cell">
                    {c.sale_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={c.current_balance > 0 ? 'text-red-400 font-medium' : 'text-surface-400'}>
                      {formatCurrency(c.current_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={c.is_active ? 'success' : 'neutral'} dot>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {can('customers', 'edit') && (
                        <button onClick={() => openEdit(c)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('customers', 'delete') && (
                        <button onClick={() => setDeleteTarget(c)}
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

      <CustomerFormModal open={modalOpen} onClose={() => setModalOpen(false)} editCustomer={editing} />

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Deactivate "${deleteTarget?.name}"?`}
        description="The customer will be deactivated. Their sales history is preserved."
        variant="danger" confirmLabel="Deactivate" />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportCsv}
        entityName="Customers"
        columns={['name', 'email', 'phone', 'address', 'city', 'customer_group', 'credit_limit', 'is_active', 'notes']}
        templateFilename="customers_template.csv"
        loading={importing}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />)}
    </div>
  );
}
