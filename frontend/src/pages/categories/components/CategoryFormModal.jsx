import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import Select from '@components/common/Select';
import ImageUpload from '@components/common/ImageUpload';
import Toggle from '@components/common/Toggle';
import { categoriesApi } from '@api/categories.api';

export default function CategoryFormModal({ open, onClose, editCategory = null }) {
  const qc        = useQueryClient();
  const isEditing = !!editCategory;
  const [imageFile, setImageFile] = useState(null);
  const [isActive, setIsActive]   = useState(true);

  const { data: flatData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn:  categoriesApi.flat,
    enabled:  open,
  });
  const flatCats = (flatData?.data ?? []).filter(c => c.id !== editCategory?.id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (open) {
      reset(isEditing ? {
        name:        editCategory.name,
        description: editCategory.description ?? '',
        parent_id:   editCategory.parent_id ? String(editCategory.parent_id) : '',
        sort_order:  editCategory.sort_order ?? 0,
      } : { sort_order: 0 });
      setIsActive(isEditing ? !!editCategory.is_active : true);
      setImageFile(null);
    }
  }, [open, editCategory]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && v !== '' && fd.append(k, v));
      fd.set('is_active', isActive ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);
      return isEditing
        ? categoriesApi.update(editCategory.id, fd)
        : categoriesApi.create(fd);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['categories-flat'] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open} onClose={onClose} size="md"
      title={isEditing ? 'Edit Category' : 'New Category'}
      description="Organise your products into categories."
    >
      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Category Name" required placeholder="e.g. Men's Shirts"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required.' })} />
            <Select label="Parent Category" placeholder="None (top-level)"
              {...register('parent_id')}>
              {flatCats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.parent_name ? `${c.parent_name} › ` : ''}{c.name}
                </option>
              ))}
            </Select>
          </div>

          <Textarea label="Description" rows={2} placeholder="Optional description…"
            {...register('description')} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Sort Order" type="number" min="0"
              {...register('sort_order')} />
            <div className="flex flex-col gap-1 justify-end pb-1">
              <label className="text-sm font-medium text-surface-300">Status</label>
              <Toggle checked={isActive} onChange={setIsActive} label={isActive ? 'Active' : 'Inactive'} />
            </div>
          </div>

          <ImageUpload
            label="Category Image"
            value={editCategory?.image}
            onChange={setImageFile}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Category'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
