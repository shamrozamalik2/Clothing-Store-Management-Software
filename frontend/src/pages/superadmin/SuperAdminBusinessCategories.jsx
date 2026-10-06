import { useEffect, useState, useCallback } from 'react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import SuperAdminLayout from './SuperAdminLayout';
import {
  saListBusinessCategories, saCreateBusinessCategory,
  saUpdateBusinessCategory, saSetBusinessCategoryStatus,
} from '@api/superAdminClient';

const INPUT = 'w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500';

const GROUP_LABELS = {
  core: 'Core modules',
  barcode: 'Barcode',
  clothing: 'Clothing',
  expiry: 'Expiry & batches',
  pharmacy: 'Pharmacy',
  manufacturing: 'Manufacturing',
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function CategoryModal({ category, registry, onClose, onSaved }) {
  const isNew = !category;
  const [form, setForm] = useState({
    key:         category?.key || '',
    name:        category?.name || '',
    description: category?.description || '',
    sort_order:  category?.sort_order ?? 0,
    features:    { ...(category?.features || {}) },
  });
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  const setField = f => e => setForm(v => ({ ...v, [f]: e.target.value }));
  const toggle = key => setForm(v => ({ ...v, features: { ...v.features, [key]: !v.features[key] } }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const payload = { name: form.name, description: form.description, sort_order: Number(form.sort_order) || 0, features: form.features };
      if (isNew) await saCreateBusinessCategory({ ...payload, key: form.key });
      else       await saUpdateBusinessCategory(category.key, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally { setBusy(false); }
  }

  const groups = registry.reduce((acc, f) => { (acc[f.group] ||= []).push(f); return acc; }, {});

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">{isNew ? 'New business category' : `Edit — ${category.name}`}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Key">
              <input required disabled={!isNew} value={form.key} onChange={setField('key')} placeholder="e.g. ELECTRONICS" className={INPUT} />
            </Field>
            <Field label="Name">
              <input required value={form.name} onChange={setField('name')} className={INPUT} />
            </Field>
          </div>
          <Field label="Description">
            <input value={form.description} onChange={setField('description')} className={INPUT} />
          </Field>
          <div className="space-y-4">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">{GROUP_LABELS[group] || group}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm text-slate-200 bg-slate-800/60 rounded-lg px-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={!!form.features[f.key]} onChange={() => toggle(f.key)} className="accent-purple-500" />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminBusinessCategories() {
  const [categories, setCategories] = useState([]);
  const [registry, setRegistry]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editing, setEditing]       = useState(null);
  const [creating, setCreating]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await saListBusinessCategories();
      setCategories(res.data.data.categories);
      setRegistry(res.data.data.registry);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load business categories.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(c) {
    try { await saSetBusinessCategoryStatus(c.key, !c.is_active); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed to change status.'); }
  }

  const enabledCount = c => Object.values(c.features || {}).filter(Boolean).length;

  return (
    <SuperAdminLayout page="business-categories">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Business Categories</h2>
            <p className="text-sm text-slate-400">Each company belongs to one category. Categories control which modules and features it can use.</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg">
            <PlusIcon className="h-4 w-4" /> New category
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2 text-sm">{error}</div>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Features on</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
              {!loading && categories.map(c => (
                <tr key={c.key} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.key}</td>
                  <td className="px-4 py-3 text-slate-300">{enabledCount(c)} / {registry.length}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${c.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-700/40 text-slate-400 border-slate-600'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(c)} className="p-2 text-slate-400 hover:text-white" title="Edit">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <CategoryModal registry={registry} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing  && <CategoryModal category={editing} registry={registry} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </SuperAdminLayout>
  );
}
