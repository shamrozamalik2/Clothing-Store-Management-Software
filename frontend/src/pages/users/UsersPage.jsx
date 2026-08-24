import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, KeyIcon, EllipsisVerticalIcon, UserCircleIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { format } from 'date-fns';

import { usersApi } from '@api/users.api';
import { usePermission } from '@hooks/usePermission';
import Badge from '@components/common/Badge';
import Avatar from '@components/common/Avatar';
import SearchInput from '@components/common/SearchInput';
import Pagination from '@components/common/Pagination';
import ConfirmDialog from '@components/common/ConfirmDialog';
import EmptyState from '@components/common/EmptyState';
import UserFormModal from './components/UserFormModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import { cn } from '@utils/cn';

const ROLE_BADGE = { admin: 'purple', manager: 'info', cashier: 'neutral' };

function KpiCard({ label, value, Icon, color, active, onClick }) {
  const palettes = { blue: ['from-blue-600/20 to-blue-800/10','border-blue-500/60','text-blue-400','text-blue-600/[0.07]'], green: ['from-green-600/20 to-green-800/10','border-green-500/60','text-green-400','text-green-600/[0.07]'], amber: ['from-amber-600/20 to-amber-800/10','border-amber-500/60','text-amber-400','text-amber-600/[0.07]'], purple: ['from-purple-600/20 to-purple-800/10','border-purple-500/60','text-purple-400','text-purple-600/[0.07]'] };
  const [bg, border, text, iconCls] = palettes[color] || palettes.blue;
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 text-left w-full ${active ? `bg-gradient-to-br ${bg} ${border} shadow-lg` : 'border-surface-700/50 bg-surface-800/60 hover:border-surface-600'} ${onClick ? 'cursor-pointer' : ''}`}>
      <Icon className={`absolute -right-3 -bottom-3 h-24 w-24 pointer-events-none ${active ? iconCls : 'text-surface-600/[0.07]'}`} />
      <p className="text-xs font-bold uppercase tracking-widest text-surface-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${active ? text : 'text-surface-100'}`}>{value ?? '—'}</p>
      {active && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${text} bg-current/10`}><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Filter ON</span>}
    </button>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { can, isAdmin } = usePermission();

  const [search,       setSearch]  = useState('');
  const [roleFilter,   setRole]    = useState('');
  const [statusFilter, setSt]      = useState('');
  const [page,         setPage]    = useState(1);
  const [formOpen,     setFormOpen]  = useState(false);
  const [editUser,     setEditUser]  = useState(null);
  const [resetUser,    setResetUser] = useState(null);
  const [deleteUser,   setDeleteUser] = useState(null);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role: roleFilter, status: statusFilter, page }],
    queryFn: () => usersApi.list({ search, role: roleFilter, status: statusFilter, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });

  const users      = data?.data ?? [];
  const pagination = data?.pagination;
  const total      = pagination?.total ?? 0;
  const active     = users.filter(u => u.is_active).length;
  const inactive   = users.filter(u => !u.is_active).length;
  const admins     = users.filter(u => u.role === 'admin').length;

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['users'] }); setDeleteUser(null); },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => usersApi.toggleStatus(id),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (err) => toast.error(err.message),
  });

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} user(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => usersApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} could not be deleted.`) : toast.success(`${ids.length} user(s) deleted.`);
    setSelectedIds(new Set()); qc.invalidateQueries({ queryKey: ['users'] }); setBulkDeleting(false);
  }

  function openEdit(user) { setEditUser(user); setFormOpen(true); }
  function openCreate()   { setEditUser(null); setFormOpen(true); }
  function closeForm()    { setFormOpen(false); setEditUser(null); }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Access Control</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Users</h1>
            <p className="text-sm text-surface-400 mt-1">{total} {total === 1 ? 'user' : 'users'} · manage system users and their roles</p>
          </div>
          {can('users', 'create') && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all self-start">
              <PlusIcon className="h-4 w-4" /> Add User
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={total} Icon={UserCircleIcon} color="blue" active={statusFilter === ''} onClick={() => { setSt(''); setPage(1); }} />
        <KpiCard label="Active" value={active} Icon={CheckCircleIcon} color="green" active={statusFilter === 'active'} onClick={() => { setSt(statusFilter === 'active' ? '' : 'active'); setPage(1); }} />
        <KpiCard label="Inactive" value={inactive} Icon={XCircleIcon} color="amber" active={statusFilter === 'inactive'} onClick={() => { setSt(statusFilter === 'inactive' ? '' : 'inactive'); setPage(1); }} />
        <KpiCard label="Admins" value={admins} Icon={ShieldCheckIcon} color="purple" active={roleFilter === 'admin'} onClick={() => { setRole(roleFilter === 'admin' ? '' : 'admin'); setPage(1); }} />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone…" className="w-64" />
        <select value={roleFilter} onChange={e => setRole(e.target.value)}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${roleFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
        </select>
        <select value={statusFilter} onChange={e => setSt(e.target.value)}
          className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${statusFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="ml-auto text-xs text-surface-500 font-medium">{users.length} result{users.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"><TrashIcon className="h-3.5 w-3.5" /> Delete selected</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-800/80">
              <th className="w-10 px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={users.length > 0 && selectedIds.size === users.length} onChange={e => setSelectedIds(e.target.checked ? new Set(users.map(u => u.id)) : new Set())} /></th>
              {['User','Role','Phone','Last Login','Status','Actions'].map((h, i) => (
                <th key={h} className={`px-4 py-3 ${i === 5 ? 'text-right' : 'text-left'}`}><span className="text-xs font-bold uppercase tracking-widest text-surface-400">{h}</span></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/40">
            {isLoading
              ? [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-surface-700/50">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-surface-700/50 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-surface-700/50 animate-pulse" /><div className="space-y-1.5"><div className="h-3 w-32 rounded-lg bg-surface-700/50 animate-pulse" /><div className="h-2.5 w-44 rounded-lg bg-surface-700/50 animate-pulse" /></div></div></td>
                    {[...Array(4)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 w-20 rounded-lg bg-surface-700/50 animate-pulse" /></td>)}
                    <td className="px-4 py-3 text-right"><div className="h-7 w-7 rounded-lg bg-surface-700/50 animate-pulse ml-auto" /></td>
                  </tr>
                ))
              : users.length === 0
              ? <tr><td colSpan={7}><EmptyState icon={UserCircleIcon} title="No users found" description={search ? `No results for "${search}"` : 'Create the first user to get started.'} action={can('users', 'create') ? { label: 'Add User', onClick: openCreate } : null} /></td></tr>
              : users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 cursor-pointer" checked={selectedIds.has(user.id)} onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(user.id) : n.delete(user.id); setSelectedIds(n); }} /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={user.name} src={user.avatar} size="md" /><div><p className="font-semibold text-surface-100">{user.name}</p><p className="text-xs text-surface-500">{user.email}</p></div></div></td>
                    <td className="px-4 py-3"><Badge variant={ROLE_BADGE[user.role] ?? 'neutral'} dot>{user.role_label}</Badge></td>
                    <td className="px-4 py-3 text-surface-400 text-sm">{user.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-surface-400 text-xs">{user.last_login ? format(new Date(user.last_login), 'dd MMM yyyy, h:mm a') : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={user.is_active ? 'success' : 'danger'} dot>{user.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="h-7 w-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"><EllipsisVerticalIcon className="h-4 w-4" /></Menu.Button>
                        <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                          <Menu.Items className="fixed right-10 z-20 mt-1 w-44 rounded-xl bg-surface-800 border border-surface-700 shadow-xl focus:outline-none py-1">
                            {can('users', 'update') && <Menu.Item>{({ active }) => <button onClick={() => openEdit(user)} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}><PencilSquareIcon className="h-4 w-4" /> Edit</button>}</Menu.Item>}
                            {isAdmin && <Menu.Item>{({ active }) => <button onClick={() => setResetUser(user)} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}><KeyIcon className="h-4 w-4" /> Reset Password</button>}</Menu.Item>}
                            {isAdmin && <Menu.Item>{({ active }) => <button onClick={() => toggleMutation.mutate(user.id)} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm', active ? 'bg-surface-700 text-surface-100' : 'text-surface-300')}>{user.is_active ? 'Deactivate' : 'Activate'}</button>}</Menu.Item>}
                            {can('users', 'delete') && <><div className="my-1 border-t border-surface-700" /><Menu.Item>{({ active }) => <button onClick={() => setDeleteUser(user)} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400', active ? 'bg-surface-700' : '')}><TrashIcon className="h-4 w-4" /> Delete</button>}</Menu.Item></>}
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        {pagination && <div className="px-4 py-3 border-t border-surface-700/50"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
      </div>

      <UserFormModal open={formOpen} onClose={closeForm} editUser={editUser} />
      <ResetPasswordModal open={!!resetUser} onClose={() => setResetUser(null)} user={resetUser} />
      <ConfirmDialog open={!!deleteUser} onClose={() => setDeleteUser(null)} onConfirm={() => deleteMutation.mutate(deleteUser.id)} loading={deleteMutation.isPending} title="Deactivate User?" message={`"${deleteUser?.name}" will be deactivated and cannot log in until re-activated.`} confirmLabel="Deactivate" variant="danger" />
    </div>
  );
}
