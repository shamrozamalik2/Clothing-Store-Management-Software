import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import { usePermission } from '@hooks/usePermission';
import { brandsApi } from '@api/brands.api';
import BrandFormModal from './components/BrandFormModal';

const LIMIT = 20;

export default function BrandsPage() {
  const { can } = usePermission();
  const qc = useQueryClient();

  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['brands', { search, page }],
    queryFn:  () => brandsApi.list({ search, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const brands     = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => brandsApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['brands'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(brand) { setEditing(brand); setModalOpen(true); }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Brands</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage clothing brands associated with your products.</p>
        </div>
        {can('brands', 'create') && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
            New Brand
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search brands…"
          className="w-72"
        />
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} brand{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid / Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton />
        ) : brands.length === 0 ? (
          <EmptyState
            icon={<TagIcon className="h-10 w-10" />}
            title="No brands found"
            description={search ? 'Try a different search term.' : 'Create your first brand to get started.'}
            action={can('brands', 'create') ? { label: 'New Brand', onClick: openCreate } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Brand</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden lg:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Website</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Products</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {brands.map(brand => (
                <tr key={brand.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logo ? (
                        <img src={`http://localhost:3001${brand.logo}`} alt={brand.name}
                          className="h-8 w-8 rounded object-contain flex-shrink-0 bg-surface-700 p-0.5" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-surface-700 flex items-center justify-center flex-shrink-0">
                          <TagIcon className="h-4 w-4 text-surface-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-surface-100">{brand.name}</p>
                        <p className="text-xs text-surface-500">{brand.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden lg:table-cell max-w-xs truncate">
                    {brand.description ?? <span className="text-surface-600">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {brand.website ? (
                      <span className="text-primary-400 text-xs truncate max-w-[140px] block">
                        {brand.website.replace(/^https?:\/\//, '')}
                      </span>
                    ) : (
                      <span className="text-surface-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300">{brand.product_count ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={brand.is_active ? 'success' : 'neutral'} dot>
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {can('brands', 'edit') && (
                        <button
                          onClick={() => openEdit(brand)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('brands', 'delete') && (
                        <button
                          onClick={() => setDeleteTarget(brand)}
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

      <BrandFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editBrand={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently remove the brand. Products using this brand will be unassigned."
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
