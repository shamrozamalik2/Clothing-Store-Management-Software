import { useEffect, useState, useCallback } from 'react';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import {
  saListCompanies,
  saCreateCompany,
  saSuspendCompany,
  saReinstateCompany,
} from '@api/superAdminClient';

const STATUS_COLORS = {
  active:    'bg-green-900/30 text-green-400 border-green-800',
  trial:     'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  suspended: 'bg-red-900/30 text-red-400 border-red-800',
  expired:   'bg-slate-700 text-slate-400 border-slate-600',
};

const EMPTY_FORM = {
  name: '', slug: '', email: '', phone: '', address: '',
  subscription_status: 'trial', max_users: 5,
  admin_name: '', admin_email: '', admin_password: '',
};

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.expired}`}>
      {status}
    </span>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await saCreateCompany(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">New Company</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2 text-sm">{error}</div>
          )}

          <p className="text-xs text-slate-500 uppercase tracking-wider">Company Details</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name" required>
              <input required value={form.name} onChange={set('name')} placeholder="Acme Ltd" {...inputCls()} />
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={set('slug')} placeholder="acme-ltd" {...inputCls()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} placeholder="info@acme.com" {...inputCls()} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" {...inputCls()} />
            </Field>
          </div>

          <Field label="Address">
            <input value={form.address} onChange={set('address')} placeholder="City, Country" {...inputCls()} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Subscription">
              <select value={form.subscription_status} onChange={set('subscription_status')} {...inputCls()}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
              </select>
            </Field>
            <Field label="Max Users">
              <input type="number" min={1} max={500} value={form.max_users} onChange={set('max_users')} {...inputCls()} />
            </Field>
          </div>

          <p className="text-xs text-slate-500 uppercase tracking-wider pt-2">Initial Admin Account</p>

          <Field label="Admin Name" required>
            <input required value={form.admin_name} onChange={set('admin_name')} placeholder="John Doe" {...inputCls()} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Admin Email" required>
              <input required type="email" value={form.admin_email} onChange={set('admin_email')} placeholder="admin@acme.com" {...inputCls()} />
            </Field>
            <Field label="Password" required>
              <input required type="password" minLength={8} value={form.admin_password} onChange={set('admin_password')} placeholder="Min 8 chars" {...inputCls()} />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {busy ? 'Creating…' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls() {
  return {
    className: 'w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500',
  };
}

function SuspendModal({ company, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saSuspendCompany(company.id, reason);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-red-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Suspend <span className="text-red-400">{company.name}</span>?</h3>
        <form onSubmit={submit} className="space-y-4">
          <textarea
            required
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for suspension…"
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {busy ? 'Suspending…' : 'Suspend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminCompanies() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [suspending, setSuspending] = useState(null);

  const PER_PAGE = 15;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    saListCompanies({ page, limit: PER_PAGE, search: search || undefined, status: status || undefined })
      .then(r => {
        setRows(r.data.data.companies);
        setTotal(r.data.data.total);
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, status]);

  const reinstate = async (id) => {
    try {
      await saReinstateCompany(id);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reinstate.');
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <SuperAdminGuard>
      <SuperAdminLayout page="companies">
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 w-60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
            >
              + New Company
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Max Users</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No companies found.</td></tr>
                ) : rows.map(c => (
                  <tr key={c.id} className="bg-slate-950 hover:bg-slate-900 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{c.name}</div>
                      <div className="text-slate-500 text-xs">{c.slug} · {c.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3"><Badge status={c.subscription_status} /></td>
                    <td className="px-4 py-3 text-right text-slate-300">{c.active_users ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{c.max_users ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.subscription_status === 'suspended' ? (
                        <button
                          onClick={() => reinstate(c.id)}
                          className="text-xs text-green-400 hover:text-green-300 font-medium"
                        >
                          Reinstate
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspending(c)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{total} companies</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-xs">Page {page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); load(); }}
          />
        )}

        {suspending && (
          <SuspendModal
            company={suspending}
            onClose={() => setSuspending(null)}
            onDone={() => { setSuspending(null); load(); }}
          />
        )}
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
