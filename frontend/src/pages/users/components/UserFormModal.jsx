import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Select from '@components/common/Select';
import { usersApi } from '@api/users.api';
import { rolesApi } from '@api/roles.api';

export default function UserFormModal({ open, onClose, editUser = null }) {
  const qc = useQueryClient();
  const isEditing = !!editUser;

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
    enabled: open,
  });
  const roles = rolesData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  // Populate form when editing
  useEffect(() => {
    if (open) {
      reset(isEditing ? {
        name:     editUser.name,
        email:    editUser.email,
        phone:    editUser.phone ?? '',
        role_id:  String(editUser.role_id),
        is_active: editUser.is_active ? '1' : '0',
      } : { is_active: '1' });
    }
  }, [open, editUser]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        role_id:   parseInt(data.role_id, 10),
        is_active: data.is_active === '1',
        phone:     data.phone || null,
      };
      if (!isEditing) delete payload.is_active; // always active on create
      return isEditing
        ? usersApi.update(editUser.id, payload)
        : usersApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit User' : 'Create New User'}
      description={isEditing ? 'Update user information and role.' : 'Add a new user to the system.'}
      size="md"
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            required
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required.',
              maxLength: { value: 100, message: 'Max 100 characters.' },
            })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            required
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required.',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email.' },
            })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              placeholder="+92 300 0000000"
              error={errors.phone?.message}
              {...register('phone', {
                maxLength: { value: 20, message: 'Max 20 characters.' },
              })}
            />
            <Select
              label="Role"
              required
              placeholder="Select role…"
              error={errors.role_id?.message}
              {...register('role_id', { required: 'Role is required.' })}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
          </div>

          {!isEditing && (
            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              required
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required.',
                minLength: { value: 6, message: 'Min 6 characters.' },
              })}
            />
          )}

          {isEditing && (
            <Select label="Status" {...register('is_active')}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
