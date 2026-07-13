import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import Select from '@components/common/Select';
import ImageUpload from '@components/common/ImageUpload';
import Toggle from '@components/common/Toggle';
import { categoriesApi } from '@api/categories.api';
import { brandsApi } from '@api/brands.api';
import { productsApi } from '@api/products.api';
import { generateSku } from '@utils/sku';
import VariantsSection from './components/VariantsSection';

export default function ProductFormPage() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { id }    = useParams();
  const isEditing = !!id;

  const [imageFile, setImageFile]   = useState(null);
  const [isActive, setIsActive]     = useState(true);
  const [variants, setVariants]     = useState([]);
  const [skuManual, setSkuManual]   = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '', sku: '', barcode: '', description: '',
      category_id: '', brand_id: '', unit: 'piece',
      cost_price: '', sale_price: '', wholesale_price: '',
      stock_quantity: 0, low_stock_alert: 10,
      track_inventory: '1',
    },
  });

  const watchedName = watch('name');

  // Auto-generate SKU from name
  useEffect(() => {
    if (!isEditing && !skuManual && watchedName) {
      setValue('sku', generateSku(watchedName), { shouldDirty: false });
    }
  }, [watchedName, skuManual, isEditing]);

  // Load flat lists for dropdowns
  const { data: catData }   = useQuery({ queryKey: ['categories-flat'], queryFn: categoriesApi.flat });
  const { data: brandData } = useQuery({ queryKey: ['brands-flat'], queryFn: () => brandsApi.list({ limit: 1000 }) });

  const categories = catData?.data ?? [];
  const brandsList = brandData?.data ?? [];

  // Load existing product when editing
  const { isLoading: loadingProduct, data: productData } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => productsApi.getOne(id),
    enabled:  isEditing,
  });

  useEffect(() => {
    if (!productData) return;
    const p = productData.data;
    reset({
      name:            p.name,
      sku:             p.sku,
      barcode:         p.barcode ?? '',
      description:     p.description ?? '',
      category_id:     p.category_id ? String(p.category_id) : '',
      brand_id:        p.brand_id ? String(p.brand_id) : '',
      unit:            p.unit ?? 'piece',
      cost_price:      p.cost_price ?? '',
      sale_price:      p.sale_price ?? '',
      wholesale_price: p.wholesale_price ?? '',
      stock_quantity:  p.stock_quantity ?? 0,
      low_stock_alert: p.low_stock_alert ?? 10,
      track_inventory: p.track_inventory ? '1' : '0',
    });
    setIsActive(!!p.is_active);
    setSkuManual(true);
  }, [productData]);

  // Load variants for edit
  const { data: variantData } = useQuery({
    queryKey: ['product-variants', id],
    queryFn:  () => productsApi.listVariants(id),
    enabled:  isEditing,
  });

  useEffect(() => {
    if (variantData?.data) setVariants(variantData.data);
  }, [variantData]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== '') fd.append(k, v);
      });
      fd.set('is_active', isActive ? '1' : '0');
      if (variants.length > 0) fd.set('variants', JSON.stringify(variants));
      if (imageFile) fd.append('image', imageFile);
      return isEditing ? productsApi.update(id, fd) : productsApi.create(fd);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['products'] });
      if (isEditing) qc.invalidateQueries({ queryKey: ['product', id] });
      navigate('/products');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isEditing && loadingProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/products')}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-surface-100">
            {isEditing ? 'Edit Product' : 'New Product'}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isEditing ? 'Update product details and stock.' : 'Add a new product to your catalogue.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — main info */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Basic info */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Basic Information
              </h2>
              <Input label="Product Name" required placeholder="e.g. Men's Slim Fit Chinos"
                error={errors.name?.message}
                {...register('name', { required: 'Product name is required.' })} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input label="SKU" required placeholder="Auto-generated"
                    error={errors.sku?.message}
                    {...register('sku', { required: 'SKU is required.' })}
                    onChange={(e) => { setSkuManual(true); register('sku').onChange(e); }}
                  />
                  {!skuManual && (
                    <p className="text-2xs text-surface-600 mt-1">Auto-generated from name</p>
                  )}
                </div>
                <Input label="Barcode / ISBN" placeholder="Optional"
                  {...register('barcode')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Category" {...register('category_id')}>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parent_name ? `${c.parent_name} › ` : ''}{c.name}
                    </option>
                  ))}
                </Select>
                <Select label="Brand" {...register('brand_id')}>
                  {brandsList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>

              <Select label="Unit of Measure" {...register('unit')}>
                <option value="piece">Piece</option>
                <option value="pair">Pair</option>
                <option value="set">Set</option>
                <option value="dozen">Dozen</option>
                <option value="kg">Kilogram</option>
                <option value="meter">Meter</option>
              </Select>

              <Textarea label="Description" rows={3} placeholder="Optional product description…"
                {...register('description')} />
            </div>

            {/* Pricing */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Pricing
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Cost Price (₨)" type="number" step="0.01" min="0"
                  placeholder="0.00"
                  error={errors.cost_price?.message}
                  {...register('cost_price', {
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })} />
                <Input label="Sale Price (₨)" required type="number" step="0.01" min="0"
                  placeholder="0.00"
                  error={errors.sale_price?.message}
                  {...register('sale_price', {
                    required: 'Sale price is required.',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })} />
                <Input label="Wholesale Price (₨)" type="number" step="0.01" min="0"
                  placeholder="Optional"
                  {...register('wholesale_price')} />
              </div>
            </div>

            {/* Inventory */}
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Inventory
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-200">Track Inventory</p>
                  <p className="text-xs text-surface-500">Monitor stock levels and trigger low-stock alerts.</p>
                </div>
                <Toggle
                  checked={watch('track_inventory') === '1'}
                  onChange={(v) => setValue('track_inventory', v ? '1' : '0')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Stock Quantity" type="number" min="0"
                  {...register('stock_quantity')} />
                <Input label="Low Stock Alert at" type="number" min="0"
                  hint="Alert when stock falls at or below this number."
                  {...register('low_stock_alert')} />
              </div>
            </div>

            {/* Variants */}
            <div className="card">
              <VariantsSection variants={variants} onChange={setVariants} />
            </div>
          </div>

          {/* Right column — image + status */}
          <div className="flex flex-col gap-5">
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Product Image
              </h2>
              <ImageUpload
                value={isEditing ? productData?.data?.image ?? undefined : undefined}
                onChange={setImageFile}
              />
            </div>

            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                Status
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-200">{isActive ? 'Active' : 'Inactive'}</p>
                  <p className="text-xs text-surface-500">
                    {isActive ? 'Visible in POS & reports.' : 'Hidden from POS & reports.'}
                  </p>
                </div>
                <Toggle checked={isActive} onChange={setIsActive} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" loading={mutation.isPending} className="w-full">
                {isEditing ? 'Save Changes' : 'Create Product'}
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="w-full"
                onClick={() => navigate('/products')}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
