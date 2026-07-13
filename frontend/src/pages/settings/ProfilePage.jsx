import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser, updateUser } from '@store/slices/authSlice';
import { authApi } from '@api/auth.api';
import { usersApi } from '@api/users.api';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Avatar from '@components/common/Avatar';
import Badge from '@components/common/Badge';

const ROLE_BADGE = { admin: 'purple', manager: 'info', cashier: 'neutral' };

export default function ProfilePage() {
  const dispatch    = useDispatch();
  const qc          = useQueryClient();
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('My Profile')); }, []);

  // ── Profile form ────────────────────────────────────────────────────────────
  const profileForm = useForm({
    defaultValues: {
      name:  currentUser?.name ?? '',
      phone: currentUser?.phone ?? '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data) => usersApi.update(currentUser.id, data),
    onSuccess: (res) => {
      dispatch(updateUser({ name: res.data.name, phone: res.data.phone }));
      toast.success('Profile updated.');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Change password form ─────────────────────────────────────────────────────
  const pwdForm = useForm();

  const pwdMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: (res) => {
      toast.success(res.message);
      pwdForm.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Profile info */}
      <Card>
        <Card.Header>
          <Card.Title>Profile Information</Card.Title>
        </Card.Header>
        <Card.Content>
          {/* Avatar block */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-700">
            <Avatar name={currentUser?.name} src={currentUser?.avatar} size="2xl" />
            <div>
              <p className="font-semibold text-surface-100 text-lg">{currentUser?.name}</p>
              <p className="text-sm text-surface-500">{currentUser?.email}</p>
              <Badge variant={ROLE_BADGE[currentUser?.role]} className="mt-1.5" dot>
                {currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1)}
              </Badge>
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit(d => profileMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Full Name"
              required
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name', { required: 'Name is required.' })}
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+92 300 0000000"
              {...profileForm.register('phone')}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={profileMutation.isPending}>
                Save Profile
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Change password */}
      <Card>
        <Card.Header>
          <Card.Title>Change Password</Card.Title>
        </Card.Header>
        <Card.Content>
          <form
            onSubmit={pwdForm.handleSubmit(d => pwdMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Current Password"
              type="password"
              placeholder="Your current password"
              required
              error={pwdForm.formState.errors.currentPassword?.message}
              {...pwdForm.register('currentPassword', { required: 'Current password is required.' })}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              required
              error={pwdForm.formState.errors.newPassword?.message}
              {...pwdForm.register('newPassword', {
                required: 'New password is required.',
                minLength: { value: 6, message: 'Minimum 6 characters.' },
              })}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              required
              error={pwdForm.formState.errors.confirm?.message}
              {...pwdForm.register('confirm', {
                required: 'Please confirm your password.',
                validate: v => v === pwdForm.watch('newPassword') || 'Passwords do not match.',
              })}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={pwdMutation.isPending}>
                Change Password
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
