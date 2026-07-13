import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import ImageUpload from '@components/common/ImageUpload';
import Toggle from '@components/common/Toggle';
import { brandsApi } from '@api/brands.api';

export default function BrandFormModal({ open, onClose, editBrand = null }) {
  const qc        = useQueryClient();
  const isEditing = !!editBrand;
  const [imageFile, setImageFile] = useState(null);
  const [isActive, setIsActive]   = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (open) {
      reset(isEditing ? {
        name:        editBrand.name,
        description: editBrand.description ?? '',
        website:     editBrand.website ?? '',
      } : {});
      setIsActive(isEditing ? !!editBrand.is_active : true);
      setImageFile(null);
    }
  }, [open, editBrand]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && v !== '' && fd.append(k, v));
      fd.set('is_active', isActive ? '1' : '0');
      if (imageFile) fd.append('logo', imageFile);
      return isEditing
        ? brandsApi.update(editBrand.id, fd)
        : brandsApi.create(fd);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['brands'] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open} onClose={onClose} size="md"
      title={isEditing ? 'Edit Brand' : 'New Brand'}
      description="Add clothing brands to associate with your products."
    >
      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <Input label="Brand Name" required placeholder="e.g. Gul Ahmed"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required.' })} />

          <Input label="Website" type="url" placeholder="https://…"
            error={errors.website?.message}
            {...register('website', {
              pattern: { value: /^https?:\/\/.+/, message: 'Must start with http:// or https://' },
            })} />

          <Textarea label="Description" rows={2} placeholder="Optional description…"
            {...register('description')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-300">Status</label>
            <Toggle checked={isActive} onChange={setIsActive} label={isActive ? 'Active' : 'Inactive'} />
          </div>

          <ImageUpload
            label="Brand Logo"
            value={editBrand?.logo}
            onChange={setImageFile}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Brand'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
