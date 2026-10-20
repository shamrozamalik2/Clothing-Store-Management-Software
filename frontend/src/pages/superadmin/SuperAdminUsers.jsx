import { useEffect, useState, useCallback } from 'react';
import {
  PencilIcon, TrashIcon, LockClosedIcon,
  CheckCircleIcon, NoSymbolIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import {
  saListUsers, saUpdateUser, saToggleUser,
  saResetUserPassword, saDeleteUser,
} from '@api/superAdminClient';
import { INPUT, Field, Modal, Panel, PageHeader, PrimaryButton, SecondaryButton } from './components/adminUI';

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await saUpdateUser(user.id, form); onSaved(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to update.'); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Edit User — ${user.name}`} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={submit} className="p-6 space-y-4">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-sm">{error}</div>}
        <Field label="Full Name" required>
          <input required value={form.name} onChange={set('name')} className={INPUT} />
        </Field>
        <Field label="Email" required>
          <input required type="email" value={form.email} onChange={set('email')} className={INPUT} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [busy, setBusy]         = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await saResetUserPassword(user.id, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={`Reset Password — ${user.name}`} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        {success ? (
          <div className="text-center py-4">
            <CheckCircleIcon className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-400 font-medium">Password reset successfully.</p>
            <SecondaryButton onClick={onClose} className="mt-4 bg-surface-800/80">Close</SecondaryButton>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-sm">{error}</div>}
            <Field label="New Password" required>
              <input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className={INPUT} />
            </Field>
            <Field label="Confirm Password" required>
              <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className={INPUT} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Resetting…' : 'Reset Password'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default function SuperAdminUsers() {
  const [rows,          setRows]          = useState([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [resetting,     setResetting]     = useState(null);
  const [error,         setError]         = useState('');

  const PER_PAGE = 20;

  const load = useCallback(() => {
    setLoading(true); setError('');
    saListUsers({
      page,
      limit: PER_PAGE,
      search:     search     || undefined,
      company_id: companyFilter || undefined,
      is_active:  statusFilter !== '' ? statusFilter : undefined,
    })
      .then(r => { setRows(r.data.data); setTotal(r.data.pagination?.total ?? r.data.data.length); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [page, search, companyFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, companyFilter, statusFilter]);

  const toggle = async (user) => {
    if (!confirm(`${user.is_active ? 'Deactivate' : 'Activate'} "${user.name}"?`)) return;
    try { await saToggleUser(user.id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Permanently delete "${user.name}"? This cannot be undone.`)) return;
    try { await saDeleteUser(user.id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete.'); }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <SuperAdminGuard>
      <SuperAdminLayout page="users">
        <div className="space-y-5 max-w-7xl">
          <PageHeader title="Users" subtitle={`${total} users across all companies`} />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className={`${INPUT} pl-9 w-56`} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={`${INPUT} w-auto`}>
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <SecondaryButton onClick={load} className="bg-surface-800/80 border border-surface-700/60 text-xs px-3 py-2">
              Refresh
            </SecondaryButton>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Table */}
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/40 bg-surface-900/40 text-surface-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3">
                      <div className="h-8 rounded-lg bg-surface-800/50 animate-pulse" />
                    </td></tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-surface-500">No users found.</td></tr>
                ) : rows.map(u => (
                  <tr key={u.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600/50 to-indigo-600/40 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-200 shrink-0">
                          {(u.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          <p className="text-surface-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-surface-300 text-xs">{u.company_name || '—'}</p>
                      {u.branch_name && <p className="text-surface-500 text-xs">{u.branch_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-surface-800 text-surface-400 text-xs rounded-full capitalize">
                        {u.role_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active
                        ? <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-xs rounded-full">Active</span>
                        : <span className="px-2 py-0.5 bg-surface-700 text-surface-400 border border-surface-600 text-xs rounded-full">Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn Icon={PencilIcon} title="Edit" color="blue" onClick={() => setEditing(u)} />
                        <ActionBtn Icon={LockClosedIcon} title="Reset Password" color="yellow" onClick={() => setResetting(u)} />
                        {u.is_active
                          ? <ActionBtn Icon={NoSymbolIcon}    title="Deactivate" color="orange" onClick={() => toggle(u)} />
                          : <ActionBtn Icon={CheckCircleIcon} title="Activate"   color="green"  onClick={() => toggle(u)} />}
                        <ActionBtn Icon={TrashIcon} title="Delete" color="red" onClick={() => deleteUser(u)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-surface-400">
              <span>{total} users</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-surface-800/80 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">← Prev</button>
                <span className="px-3 py-1.5 text-xs">Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-surface-800/80 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">Next →</button>
              </div>
            </div>
          )}
        </div>

        {editing  && <EditModal          user={editing}  onClose={() => setEditing(null)}  onSaved={() => { setEditing(null); load(); }} />}
        {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function ActionBtn({ Icon, title, color, onClick }) {
  const colors = {
    blue:   'text-blue-400 hover:bg-blue-500/10',
    yellow: 'text-yellow-400 hover:bg-yellow-500/10',
    orange: 'text-orange-400 hover:bg-orange-500/10',
    green:  'text-green-400 hover:bg-green-500/10',
    red:    'text-red-400 hover:bg-red-500/10',
  };
  return (
    <button onClick={onClick} title={title}
      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${colors[color] || ''}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
