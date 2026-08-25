import { useEffect, useState, useCallback } from 'react';
import {
  PencilIcon, TrashIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowRightOnRectangleIcon, PlusIcon, MagnifyingGlassIcon,
  ClipboardDocumentIcon, ClipboardDocumentCheckIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@store/slices/authSlice';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import {
  saListCompanies, saCreateCompany, saSuspendCompany,
  saReinstateCompany, saUpdateCompany, saDeleteCompany, saImpersonate,
  saUpdatePlan, saUpdateFeatures,
} from '@api/superAdminClient';

const STATUS = {
  active:    'bg-green-500/10 text-green-400 border-green-500/20',
  trial:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  expired:   'bg-slate-700 text-slate-400 border-slate-600',
};

function Badge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium capitalize ${STATUS[status] || STATUS.expired}`}>
      {status}
    </span>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500';

const EMPTY = {
  name: '', slug: '', email: '', phone: '', address: '',
  plan: 'standard', subscription_status: 'trial', max_users: 5,
  admin_name: '', admin_email: '', admin_password: '',
};

function CopyRow({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const [show,   setShow]   = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const display = secret && !show ? '••••••••' : value;
  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2.5 gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-mono text-white break-all">{display}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {secret && (
          <button onClick={() => setShow(s => !s)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
        <button onClick={copy} title="Copy"
          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          {copied
            ? <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-400" />
            : <ClipboardDocumentIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function CredentialsCard({ creds, onClose }) {
  const [allCopied, setAllCopied] = useState(false);

  const copyAll = () => {
    const text = [
      `Company: ${creds.company_name}`,
      `Login URL: ${creds.login_url}`,
      `Company Code: ${creds.slug}`,
      `Email: ${creds.email}`,
      `Password: ${creds.password}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
          <CheckCircleIcon className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <p className="text-white font-semibold">Company created!</p>
          <p className="text-sm text-slate-400">Share these login details with your client.</p>
        </div>
      </div>

      <div className="space-y-2">
        <CopyRow label="Login URL"     value={creds.login_url} />
        <CopyRow label="Company Code"  value={creds.slug} />
        <CopyRow label="Email"         value={creds.email} />
        <CopyRow label="Password"      value={creds.password} secret />
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-xs text-yellow-400">
        Save this password now — it cannot be recovered after you close this window.
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={copyAll}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
          {allCopied
            ? <><ClipboardDocumentCheckIcon className="h-4 w-4 text-green-400" /> Copied!</>
            : <><ClipboardDocumentIcon className="h-4 w-4" /> Copy All</>}
        </button>
        <button onClick={onClose}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Done
        </button>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form,  setForm]  = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [creds, setCreds] = useState(null); // set after success
  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }));

  const autoSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(v => ({ ...v, name, slug: autoSlug(name) }));
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await saCreateCompany(form);
      const loginUrl = window.location.origin + window.location.pathname + '#/login';
      setCreds({
        company_name: form.name,
        slug:         form.slug || autoSlug(form.name),
        email:        form.admin_email,
        password:     form.admin_password,
        login_url:    loginUrl,
      });
      onCreated(); // refreshes the list in background; does NOT close modal
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company.');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h3 className="text-white font-semibold">{creds ? 'Client Login Info' : 'New Company'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {creds ? (
          <CredentialsCard creds={creds} onClose={onClose} />
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}

            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Company Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company Name" required>
                <input required value={form.name} onChange={handleNameChange} placeholder="Acme Store" className={INPUT} />
              </Field>
              <Field label="Company Slug">
                <input value={form.slug} onChange={set('slug')} placeholder="acme-store" className={INPUT} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input type="email" value={form.email} onChange={set('email')} placeholder="info@acme.com" className={INPUT} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} placeholder="+92 300 0000000" className={INPUT} />
              </Field>
            </div>
            <Field label="Address">
              <input value={form.address} onChange={set('address')} placeholder="City, Country" className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan">
                <select value={form.plan} onChange={set('plan')} className={INPUT}>
                  <option value="standard">Standard</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.subscription_status} onChange={set('subscription_status')} className={INPUT}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                </select>
              </Field>
            </div>
            <Field label="Max Users">
              <input type="number" min={1} max={500} value={form.max_users} onChange={set('max_users')} className={INPUT} />
            </Field>

            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold pt-2">User's Crediential of Account</p>
            <Field label="Admin Name" required>
              <input required value={form.admin_name} onChange={set('admin_name')} placeholder="Admin User" className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Admin Email" required>
                <input required type="email" value={form.admin_email} onChange={set('admin_email')} placeholder="admin@acme.com" className={INPUT} />
              </Field>
              <Field label="Password" required>
                <input required type="password" minLength={8} value={form.admin_password} onChange={set('admin_password')} placeholder="Min 8 chars" className={INPUT} />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-2 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
              <button type="submit" disabled={busy}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
                {busy ? 'Creating…' : 'Create Company'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditModal({ company, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:                company.name,
    email:               company.email || '',
    phone:               company.phone || '',
    plan:                company.plan || 'standard',
    subscription_status: company.subscription_status,
    max_users:           company.max_users || 5,
  });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);
  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await saUpdateCompany(company.id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update.');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Edit — {company.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}
          <Field label="Company Name" required>
            <input required value={form.name} onChange={set('name')} className={INPUT} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" value={form.email} onChange={set('email')} className={INPUT} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} className={INPUT} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select value={form.plan} onChange={set('plan')} className={INPUT}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.subscription_status} onChange={set('subscription_status')} className={INPUT}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
          </div>
          <Field label="Max Users">
            <input type="number" min={1} max={500} value={form.max_users} onChange={set('max_users')} className={INPUT} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const FEATURE_DEFS = [
  { key: 'manufacturing',    label: 'Manufacturing / BOM' },
  { key: 'hr',               label: 'HR & Payroll' },
  { key: 'ledger',           label: 'Ledger / AR-AP' },
  { key: 'audit',            label: 'Audit Trail' },
  { key: 'mobile_app',       label: 'Mobile App Access' },
  { key: 'multi_branch',     label: 'Multi-Branch' },
  { key: 'reports_advanced', label: 'Advanced Reports' },
];

function PlanModal({ company, onClose, onSaved }) {
  const [plan, setPlan]     = useState(company.plan || 'standard');
  const [maxUsers, setMaxUsers] = useState(company.max_users || 5);
  const [trialEnds, setTrialEnds] = useState(
    company.trial_ends_at ? company.trial_ends_at.slice(0, 10) : ''
  );
  const [features, setFeatures] = useState({ ...(company.features || {}) });
  const [busy,  setBusy]    = useState(false);
  const [error, setError]   = useState('');

  const toggleFeature = (key) =>
    setFeatures(f => ({ ...f, [key]: !f[key] }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await saUpdatePlan(company.id, { plan, max_users: maxUsers, trial_ends_at: trialEnds || null });
      await saUpdateFeatures(company.id, features);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan.');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-white font-semibold">Plan & Features</h3>
            <p className="text-xs text-slate-500 mt-0.5">{company.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select value={plan} onChange={e => setPlan(e.target.value)} className={INPUT}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Max Users">
              <input type="number" min={1} max={500} value={maxUsers}
                onChange={e => setMaxUsers(e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field label="Trial Ends At">
            <input type="date" value={trialEnds}
              onChange={e => setTrialEnds(e.target.value)} className={INPUT} />
          </Field>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Feature Flags</p>
            <div className="space-y-2">
              {FEATURE_DEFS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-800 cursor-pointer">
                  <span className="text-sm text-slate-300">{label}</span>
                  <div onClick={() => toggleFeature(key)}
                    className={`relative h-5 w-9 rounded-full cursor-pointer transition-colors duration-200 ${features[key] ? 'bg-purple-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${features[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {busy ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuspendModal({ company, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await saSuspendCompany(company.id, reason); onDone(); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-red-800/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Suspend Company</h3>
        <p className="text-sm text-slate-400 mb-4">Suspending <span className="text-red-400 font-medium">{company.name}</span> will block all logins.</p>
        <form onSubmit={submit} className="space-y-4">
          <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for suspension…"
            className={`${INPUT} resize-none`} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {busy ? 'Suspending…' : 'Suspend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminCompanies() {
  const dispatch = useDispatch();
  const [rows,       setRows]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [suspending, setSuspending] = useState(null);
  const [managing,   setManaging]   = useState(null);
  const [error,      setError]      = useState('');
  const [deleting,   setDeleting]   = useState(null);  // company to delete
  const [deleteInput,setDeleteInput]= useState('');

  const PER_PAGE = 15;

  const load = useCallback(() => {
    setLoading(true); setError('');
    saListCompanies({ page, limit: PER_PAGE, search: search || undefined, status: status || undefined })
      .then(r => { setRows(r.data.data); setTotal(r.data.pagination.total); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const reinstate = async (id) => {
    if (!confirm('Reinstate this company?')) return;
    try { await saReinstateCompany(id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed.'); }
  };

  const deleteCompany = async () => {
    if (!deleting || deleteInput.trim() !== deleting.name) return;
    try {
      await saDeleteCompany(deleting.id);
      setDeleting(null); setDeleteInput('');
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to delete.'); }
  };

  const impersonate = async (c) => {
    if (!confirm(`Login as admin of "${c.name}"? You will be redirected to the main app.`)) return;
    try {
      const res = await saImpersonate(c.id);
      dispatch(setCredentials(res.data.data));
      window.location.hash = '/';
    } catch (e) { alert(e.response?.data?.message || 'Failed to impersonate.'); }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <SuperAdminGuard>
      <SuperAdminLayout page="companies">
        <div className="space-y-5 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Companies</h2>
              <p className="text-sm text-slate-500 mt-0.5">{total} total companies</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
              <PlusIcon className="h-4 w-4" /> New Company
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search companies…"
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3">
                      <div className="h-8 rounded bg-slate-800/50 animate-pulse" />
                    </td></tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No companies found.</td></tr>
                ) : rows.map(c => (
                  <tr key={c.id} className="bg-slate-950 hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-slate-500 text-xs">{c.slug} {c.email ? `· ${c.email}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize text-xs">{c.plan || '—'}</td>
                    <td className="px-4 py-3 text-center"><Badge status={c.subscription_status} /></td>
                    <td className="px-4 py-3 text-right text-slate-400">{c.active_users ?? '—'} / {c.max_users ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{c.total_sales ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn Icon={PencilIcon} title="Edit" color="blue" onClick={() => setEditing(c)} />
                        <ActionBtn Icon={AdjustmentsHorizontalIcon} title="Plan & Features" color="purple" onClick={() => setManaging(c)} />
                        <ActionBtn Icon={ArrowRightOnRectangleIcon} title="Login As" color="purple" onClick={() => impersonate(c)} />
                        {c.subscription_status === 'suspended'
                          ? <ActionBtn Icon={CheckCircleIcon} title="Reinstate" color="green" onClick={() => reinstate(c.id)} />
                          : <ActionBtn Icon={NoSymbolIcon}    title="Suspend"   color="yellow" onClick={() => setSuspending(c)} />}
                        <ActionBtn Icon={TrashIcon} title="Delete" color="red" onClick={() => { setDeleting(c); setDeleteInput(''); }} />
                      </div>
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
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs">← Prev</button>
                <span className="px-3 py-1.5 text-xs">Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs">Next →</button>
              </div>
            </div>
          )}
        </div>

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => load()} />}
        {editing    && <EditModal    company={editing}    onClose={() => setEditing(null)}    onSaved={() => { setEditing(null); load(); }} />}
        {suspending && <SuspendModal company={suspending} onClose={() => setSuspending(null)} onDone={() => { setSuspending(null); load(); }} />}
        {managing   && <PlanModal    company={managing}   onClose={() => setManaging(null)}   onSaved={() => { setManaging(null); load(); }} />}

        {/* Delete Company — typed confirmation to prevent accidental wipe */}
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1">Delete Company</h3>
              <p className="text-sm text-slate-400 mb-4">
                This permanently deletes <span className="text-white font-semibold">{deleting.name}</span> and{' '}
                <span className="text-red-400 font-semibold">all its data</span> — products, sales, customers, everything.
                This cannot be undone.
              </p>
              <div className="rounded-lg border border-red-900/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 mb-3">
                Type <span className="font-mono font-bold text-white">{deleting.name}</span> to confirm
              </div>
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={`Type "${deleting.name}" to confirm`}
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setDeleting(null); setDeleteInput(''); }}
                  className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={deleteCompany}
                  disabled={deleteInput.trim() !== deleting.name}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}

function ActionBtn({ Icon, title, color, onClick }) {
  const colors = {
    blue:   'text-blue-400 hover:bg-blue-500/10',
    purple: 'text-purple-400 hover:bg-purple-500/10',
    green:  'text-green-400 hover:bg-green-500/10',
    yellow: 'text-yellow-400 hover:bg-yellow-500/10',
    red:    'text-red-400 hover:bg-red-500/10',
  };
  return (
    <button onClick={onClick} title={title}
      className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${colors[color] || ''}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
