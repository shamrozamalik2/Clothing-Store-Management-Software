import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, TrashIcon,
  KeyIcon, EllipsisVerticalIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { format } from 'date-fns';

import { setPageTitle } from '@store/slices/uiSlice';
import { usersApi } from '@api/users.api';
import { usePermission } from '@hooks/usePermission';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/common/Badge';
import Avatar from '@components/common/Avatar';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import Select from '@components/common/Select';
import UserFormModal from './components/UserFormModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import { cn } from '@utils/cn';

const ROLE_BADGE = {
  admin:   'purple',
  manager: 'info',
  cashier: 'neutral',
};

export default function UsersPage() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const { can, isAdmin } = usePermission();

  const [search,  setSearch]  = useState('');
  const [roleFilter, setRole] = useState('');
  const [statusFilter, setSt] = useState('');
  const [page, setPage]       = useState(1);

  const [formOpen,  setFormOpen]  = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUser,setDeleteUser]= useState(null);

  useEffect(() => { dispatch(setPageTitle('User Management')); }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role: roleFilter, status: statusFilter, page }],
    queryFn: () => usersApi.list({ search, role: roleFilter, status: statusFilter, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });
  const users      = data?.data ?? [];
  const pagination = data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteUser(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => usersApi.toggleStatus(id),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message),
  });

  function openEdit(user) { setEditUser(user); setFormOpen(true); }
  function openCreate()   { setEditUser(null);  setFormOpen(true); }
  function closeForm()    { setFormOpen(false);  setEditUser(null); }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-surface-100">Users</h2>
          <p className="text-sm text-surface-500 mt-0.5">Manage system users and their roles.</p>
        </div>
        {can('users', 'create') && (
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Add User
          </Button>
        )}
      </div>

      <Card>
        {/* Filters */}
        <div className="px-4 py-3 border-b border-surface-700 flex flex-wrap gap-3 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, phone…"
            className="w-64"
          />
          <Select
            value={roleFilter}
            onChange={e => setRole(e.target.value)}
            fullWidth={false}
            className="w-36"
            placeholder="All Roles"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </Select>
          <Select
            value={statusFilter}
            onChange={e => setSt(e.target.value)}
            fullWidth={false}
            className="w-36"
            placeholder="All Status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="skeleton h-8 w-8 rounded-full" />
                        <div className="space-y-1.5">
                          <div className="skeleton h-3 w-32 rounded" />
                          <div className="skeleton h-2.5 w-44 rounded" />
                        </div>
                      </div>
                    </td>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-3 w-20 rounded" /></td>
                    ))}
                    <td className="px-4 py-3 text-right"><div className="skeleton h-7 w-7 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={UserCircleIcon}
                      title="No users found"
                      description={search ? `No results for "${search}"` : 'Create the first user to get started.'}
                      action={can('users', 'create') && (
                        <Button size="sm" onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
                          Add User
                        </Button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    can={can}
                    isAdmin={isAdmin}
                    onEdit={() => openEdit(user)}
                    onResetPwd={() => setResetUser(user)}
                    onToggle={() => toggleMutation.mutate(user.id)}
                    onDelete={() => setDeleteUser(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="px-4 py-3 border-t border-surface-700">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Modals */}
      <UserFormModal open={formOpen} onClose={closeForm} editUser={editUser} />
      <ResetPasswordModal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        user={resetUser}
      />
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteMutation.mutate(deleteUser.id)}
        loading={deleteMutation.isPending}
        title="Deactivate User?"
        message={`"${deleteUser?.name}" will be deactivated and cannot log in until re-activated.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function UserRow({ user, can, isAdmin, onEdit, onResetPwd, onToggle, onDelete }) {
  return (
    <tr className="border-b border-surface-700/50 hover:bg-surface-800/40 transition-colors">
      {/* User info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatar} size="md" />
          <div>
            <p className="font-medium text-surface-100">{user.name}</p>
            <p className="text-xs text-surface-500">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <Badge variant={ROLE_BADGE[user.role] ?? 'neutral'} dot>
          {user.role_label}
        </Badge>
      </td>

      {/* Phone */}
      <td className="px-4 py-3 hidden md:table-cell text-surface-400">
        {user.phone ?? '—'}
      </td>

      {/* Last login */}
      <td className="px-4 py-3 hidden lg:table-cell text-surface-400">
        {user.last_login
          ? format(new Date(user.last_login), 'dd MMM yyyy, h:mm a')
          : '—'}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge variant={user.is_active ? 'success' : 'danger'} dot>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="h-7 w-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors">
            <EllipsisVerticalIcon className="h-4 w-4" />
          </Menu.Button>

          <Transition as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-20 mt-1 w-44 rounded-xl bg-surface-800 border border-surface-700 shadow-xl focus:outline-none py-1">
              {can('users', 'update') && (
                <Menu.Item>
                  {({ active }) => (
                    <button onClick={onEdit}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}>
                      <PencilSquareIcon className="h-4 w-4" /> Edit
                    </button>
                  )}
                </Menu.Item>
              )}
              {isAdmin && (
                <Menu.Item>
                  {({ active }) => (
                    <button onClick={onResetPwd}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}>
                      <KeyIcon className="h-4 w-4" /> Reset Password
                    </button>
                  )}
                </Menu.Item>
              )}
              {isAdmin && (
                <Menu.Item>
                  {({ active }) => (
                    <button onClick={onToggle}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}>
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </Menu.Item>
              )}
              {can('users', 'delete') && (
                <>
                  <div className="my-1 border-t border-surface-700" />
                  <Menu.Item>
                    {({ active }) => (
                      <button onClick={onDelete}
                        className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400', active ? 'bg-surface-700' : '')}>
                        <TrashIcon className="h-4 w-4" /> Delete
                      </button>
                    )}
                  </Menu.Item>
                </>
              )}
            </Menu.Items>
          </Transition>
        </Menu>
      </td>
    </tr>
  );
}
