import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import Select from '@components/common/Select';
import Toggle from '@components/common/Toggle';
import { customersApi } from '@api/customers.api';

export default function CustomerFormModal({ open, onClose, editCustomer = null, onCreated }) {
  const qc        = useQueryClient();
  const isEditing = !!editCustomer;
  const [isActive, setIsActive] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (open) {
      reset(isEditing ? {
        name:            editCustomer.name,
        email:           editCustomer.email   ?? '',
        phone:           editCustomer.phone   ?? '',
        address:         editCustomer.address ?? '',
        city:            editCustomer.city    ?? '',
        customer_group:  editCustomer.customer_group ?? 'general',
        opening_balance: editCustomer.opening_balance ?? 0,
        notes:           editCustomer.notes   ?? '',
      } : { customer_group: 'general', opening_balance: 0 });
      setIsActive(isEditing ? !!editCustomer.is_active : true);
    }
  }, [open, editCustomer]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, is_active: isActive ? 1 : 0 };
      return isEditing
        ? customersApi.update(editCustomer.id, payload)
        : customersApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['customers'] });
      onCreated?.(res.data);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={isEditing ? 'Edit Customer' : 'New Customer'}
      description="Manage customer accounts for sales and loyalty tracking.">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <Input label="Customer Name" required placeholder="e.g. Ali Ahmed"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required.' })} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" placeholder="+92 300 0000000"
              {...register('phone')} />
            <Input label="Email" type="email" placeholder="Optional"
              error={errors.email?.message}
              {...register('email', {
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email.' },
              })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="City" placeholder="e.g. Lahore"
              {...register('city')} />
            <Select label="Group" {...register('customer_group')}>
              <option value="general">General</option>
              <option value="wholesale">Wholesale</option>
              <option value="vip">VIP</option>
              <option value="staff">Staff</option>
            </Select>
          </div>

          <Textarea label="Address" rows={2} placeholder="Optional…" {...register('address')} />

          <Input label="Opening Balance (₨)" type="number" step="0.01" min="0"
            hint={isEditing ? 'Balance is adjusted via sales and payments.' : 'Initial credit balance owed by this customer.'}
            disabled={isEditing}
            {...register('opening_balance')} />

          <Textarea label="Notes" rows={2} placeholder="Optional…" {...register('notes')} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-surface-300">Status</label>
            <Toggle checked={isActive} onChange={setIsActive} label={isActive ? 'Active' : 'Inactive'} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
