import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { KeyIcon } from '@heroicons/react/24/outline';

import Modal from '@components/common/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Avatar from '@components/common/Avatar';
import { usersApi } from '@api/users.api';

export default function ResetPasswordModal({ open, onClose, user }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => { if (open) reset(); }, [open]);

  const mutation = useMutation({
    mutationFn: ({ newPassword }) => usersApi.resetPassword(user?.id, newPassword),
    onSuccess: (res) => {
      toast.success(res.message);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset Password"
      description={`Set a new password for ${user.name}.`}
      size="sm"
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-700/50 border border-surface-600">
            <Avatar name={user.name} size="md" />
            <div>
              <p className="text-sm font-medium text-surface-100">{user.name}</p>
              <p className="text-xs text-surface-500">{user.email}</p>
            </div>
          </div>
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            required
            error={errors.newPassword?.message}
            {...register('newPassword', {
              required: 'Password is required.',
              minLength: { value: 6, message: 'Min 6 characters.' },
            })}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            required
            error={errors.confirm?.message}
            {...register('confirm', {
              required: 'Please confirm the password.',
              validate: v => v === watch('newPassword') || 'Passwords do not match.',
            })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} leftIcon={<KeyIcon className="h-4 w-4" />}>
            Reset Password
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
