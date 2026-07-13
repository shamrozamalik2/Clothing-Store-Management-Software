import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import Toggle from '@components/common/Toggle';
import { suppliersApi } from '@api/suppliers.api';
import { useState } from 'react';

export default function SupplierFormModal({ open, onClose, editSupplier = null }) {
  const qc        = useQueryClient();
  const isEditing = !!editSupplier;
  const [isActive, setIsActive] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (open) {
      reset(isEditing ? {
        name:            editSupplier.name,
        company:         editSupplier.company ?? '',
        email:           editSupplier.email ?? '',
        phone:           editSupplier.phone,
        address:         editSupplier.address ?? '',
        city:            editSupplier.city ?? '',
        country:         editSupplier.country ?? 'Pakistan',
        tax_number:      editSupplier.tax_number ?? '',
        opening_balance: editSupplier.opening_balance ?? 0,
        notes:           editSupplier.notes ?? '',
      } : { country: 'Pakistan', opening_balance: 0 });
      setIsActive(isEditing ? !!editSupplier.is_active : true);
    }
  }, [open, editSupplier]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, is_active: isActive ? 1 : 0 };
      return isEditing
        ? suppliersApi.update(editSupplier.id, payload)
        : suppliersApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEditing ? 'Edit Supplier' : 'New Supplier'}
      description="Manage suppliers you purchase inventory from."
    >
      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" required placeholder="e.g. Ahmed Khan"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required.' })} />
            <Input label="Company / Business Name" placeholder="Optional"
              {...register('company')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" required placeholder="+92 300 0000000"
              error={errors.phone?.message}
              {...register('phone', { required: 'Phone is required.' })} />
            <Input label="Email" type="email" placeholder="supplier@example.com"
              error={errors.email?.message}
              {...register('email', {
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email.' },
              })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="City" placeholder="e.g. Lahore"
              {...register('city')} />
            <Input label="Country"
              {...register('country')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Tax / NTN Number" placeholder="Optional"
              {...register('tax_number')} />
            <Input label="Opening Balance (₨)" type="number" step="0.01" min="0"
              hint={isEditing ? 'Changes to balance are made via payments.' : 'Initial amount owed to this supplier.'}
              disabled={isEditing}
              {...register('opening_balance')} />
          </div>

          <Textarea label="Address" rows={2} placeholder="Full address…"
            {...register('address')} />

          <Textarea label="Notes" rows={2} placeholder="Optional notes…"
            {...register('notes')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-300">Status</label>
            <Toggle checked={isActive} onChange={setIsActive} label={isActive ? 'Active' : 'Inactive'} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
