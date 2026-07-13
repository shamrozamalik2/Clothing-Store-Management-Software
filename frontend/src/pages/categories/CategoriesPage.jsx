import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { categoriesApi } from '@api/categories.api';
import CategoryFormModal from './components/CategoryFormModal';

const LIMIT = 20;

export default function CategoriesPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { search, page }],
    queryFn:  () => categoriesApi.list({ search, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const categories = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(cat) { setEditing(cat); setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Categories</h1>
          <p className="text-sm text-surface-400 mt-0.5">Organise products into hierarchical categories.</p>
        </div>
        {can('categories', 'create') && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
            New Category
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search categories…"
          className="w-72"
        />
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} categor{(pagination?.total ?? 0) === 1 ? 'y' : 'ies'}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderIcon className="h-10 w-10" />}
            title="No categories found"
            description={search ? 'Try a different search term.' : 'Create your first category to get started.'}
            action={can('categories', 'create') ? { label: 'New Category', onClick: openCreate } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Parent</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Description</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Products</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cat.image ? (
                        <img src={`http://localhost:3001${cat.image}`} alt={cat.name}
                          className="h-8 w-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-surface-700 flex items-center justify-center flex-shrink-0">
                          <FolderIcon className="h-4 w-4 text-surface-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-surface-100">{cat.name}</p>
                        <p className="text-xs text-surface-500">{cat.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden md:table-cell">
                    {cat.parent_name ?? <span className="text-surface-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden lg:table-cell max-w-xs truncate">
                    {cat.description ?? <span className="text-surface-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300">{cat.product_count ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={cat.is_active ? 'success' : 'neutral'} dot>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {can('categories', 'edit') && (
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('categories', 'delete') && (
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
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

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editCategory={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove the category. Products in this category will be unassigned."
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
