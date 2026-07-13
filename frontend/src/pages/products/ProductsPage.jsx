import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PencilSquareIcon, TrashIcon, CubeIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import Select from '@components/common/Select';
import StockBadge from '@components/common/StockBadge';
import { usePermission } from '@hooks/usePermission';
import { categoriesApi } from '@api/categories.api';
import { brandsApi } from '@api/brands.api';
import { productsApi } from '@api/products.api';
import { formatCurrency } from '@utils/format';

const LIMIT = 25;

export default function ProductsPage() {
  const { can } = usePermission();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [catFilter, setCat]     = useState('');
  const [brandFilter, setBrand] = useState('');
  const [stockFilter, setStock] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, category_id: catFilter, brand_id: brandFilter, stock_status: stockFilter }],
    queryFn:  () => productsApi.list({ search, page, limit: LIMIT, category: catFilter, brand: brandFilter, stock_status: stockFilter }),
    placeholderData: keepPreviousData,
  });

  const { data: catData }   = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const { data: brandData } = useQuery({ queryKey: ['brands-flat'],     queryFn: () => brandsApi.list({ limit: 1000 }) });

  const products   = data?.data ?? [];
  const pagination = data?.pagination;
  const categories = catData?.data ?? [];
  const brands     = brandData?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeleteTarget(null);
    },
  });

  function resetFilters() {
    setCat(''); setBrand(''); setStock(''); setSearch(''); setPage(1);
  }

  const hasFilter = !!(catFilter || brandFilter || stockFilter || search);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Products</h1>
          <p className="text-sm text-surface-400 mt-0.5">Manage your product catalogue, pricing, and stock levels.</p>
        </div>
        {can('products', 'create') && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/products/new')}>
            New Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, SKU, barcode…"
          className="w-64"
        />
        <Select value={catFilter} onChange={e => { setCat(e.target.value); setPage(1); }}
          placeholder="All Categories" className="w-44 !py-1.5 !text-sm">
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.parent_name ? `${c.parent_name} › ` : ''}{c.name}
            </option>
          ))}
        </Select>
        <Select value={brandFilter} onChange={e => { setBrand(e.target.value); setPage(1); }}
          placeholder="All Brands" className="w-36 !py-1.5 !text-sm">
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={stockFilter} onChange={e => { setStock(e.target.value); setPage(1); }}
          placeholder="All Stock" className="w-36 !py-1.5 !text-sm">
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </Select>
        {hasFilter && (
          <button onClick={resetFilters}
            className="text-xs text-surface-500 hover:text-surface-200 transition-colors flex items-center gap-1">
            <FunnelIcon className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
        <span className="text-sm text-surface-500 ml-auto">{pagination?.total ?? 0} product{(pagination?.total ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<CubeIcon className="h-10 w-10" />}
            title="No products found"
            description={hasFilter ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
            action={(!hasFilter && can('products', 'create'))
              ? { label: 'New Product', onClick: () => navigate('/products/new') }
              : hasFilter ? { label: 'Clear Filters', onClick: resetFilters } : null}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-surface-400 font-medium">Product</th>
                <th className="text-left px-4 py-3 text-surface-400 font-medium hidden md:table-cell">Category / Brand</th>
                <th className="text-right px-4 py-3 text-surface-400 font-medium">Price</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium">Stock</th>
                <th className="text-center px-4 py-3 text-surface-400 font-medium hidden sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={`http://localhost:3001${p.image}`} alt={p.name}
                          className="h-9 w-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0">
                          <CubeIcon className="h-5 w-5 text-surface-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-surface-100 truncate max-w-[220px]">{p.name}</p>
                        <p className="text-xs text-surface-500 font-mono">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {p.category_name && (
                        <span className="text-xs text-surface-400">{p.category_name}</span>
                      )}
                      {p.brand_name && (
                        <span className="text-xs text-surface-500">{p.brand_name}</span>
                      )}
                      {!p.category_name && !p.brand_name && (
                        <span className="text-surface-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-surface-100">
                        {formatCurrency(p.sale_price)}
                      </span>
                      {p.wholesale_price > 0 && (
                        <span className="text-xs text-surface-500">W: {formatCurrency(p.wholesale_price)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StockBadge status={p.stock_status} qty={p.stock_quantity} />
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <Badge variant={p.is_active ? 'success' : 'neutral'} dot>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {can('products', 'edit') && (
                        <button
                          onClick={() => navigate(`/products/${p.id}/edit`)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('products', 'delete') && (
                        <button
                          onClick={() => setDeleteTarget(p)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will deactivate the product. Sales history will be preserved."
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-surface-700/40 animate-pulse" />
      ))}
    </div>
  );
}
