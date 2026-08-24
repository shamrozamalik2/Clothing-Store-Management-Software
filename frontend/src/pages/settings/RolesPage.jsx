import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheckIcon, InformationCircleIcon, PlusIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import { rolesApi } from '@api/roles.api';
import { cn } from '@utils/cn';

const MODULES = [
  { key: 'dashboard',  label: 'Dashboard',          type: 'boolean' },
  { key: 'pos',        label: 'POS / Billing',       type: 'boolean' },
  { key: 'products',   label: 'Products',            type: 'crud' },
  { key: 'categories', label: 'Categories',          type: 'crud' },
  { key: 'brands',     label: 'Brands',              type: 'crud' },
  { key: 'suppliers',  label: 'Suppliers',           type: 'crud' },
  { key: 'customers',  label: 'Customers',           type: 'crud' },
  { key: 'purchases',  label: 'Purchases',           type: 'crud' },
  { key: 'sales',      label: 'Sales & Returns',     type: 'crud' },
  { key: 'expenses',   label: 'Expenses',            type: 'crud' },
  { key: 'inventory',  label: 'Stock Adjustments',   type: 'crud', actions: ['view', 'create'] },
  { key: 'reports',    label: 'Reports',             type: 'boolean' },
  { key: 'users',      label: 'Users',               type: 'crud' },
  { key: 'settings',   label: 'Settings',            type: 'boolean' },
];

const DEFAULT_ACTIONS = ['view', 'create', 'update', 'delete'];
const ACTION_LABELS   = { view: 'View', create: 'Create', update: 'Edit', delete: 'Delete' };

export default function RolesPage() {
  const qc = useQueryClient();
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn:  rolesApi.list,
  });
  const roles = rolesData?.data ?? [];

  const [selectedId, setSelectedId] = useState(null);
  const [perms, setPerms]           = useState({});
  const [dirty, setDirty]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel]     = useState('');
  const newLabelRef                 = useRef(null);

  const createMutation = useMutation({
    mutationFn: (label) => rolesApi.create(label),
    onSuccess: (res) => {
      toast.success('Role created.');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setSelectedId(res.data?.id ?? null);
      setShowCreate(false);
      setNewLabel('');
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to create role.'),
  });

  const selectedRole = roles.find(r => r.id === selectedId) ?? null;
  const isAdmin      = selectedRole?.name === 'admin';

  // Auto-select first role
  useEffect(() => {
    if (roles.length > 0 && !selectedId) setSelectedId(roles[0].id);
  }, [roles]);

  useEffect(() => {
    if (showCreate) setTimeout(() => newLabelRef.current?.focus(), 50);
  }, [showCreate]);

  // Load permissions when selection changes
  useEffect(() => {
    if (selectedRole) {
      setPerms(selectedRole.permissions ?? {});
      setDirty(false);
    }
  }, [selectedId]);

  function setBool(key, value) {
    setPerms(p => ({ ...p, [key]: value }));
    setDirty(true);
  }

  function setAction(module, action, value) {
    setPerms(p => {
      const cur = typeof p[module] === 'object' ? { ...p[module] } : {};
      return { ...p, [module]: { ...cur, [action]: value } };
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!selectedId || isAdmin) return;
    setSaving(true);
    try {
      await rolesApi.updatePermissions(selectedId, perms);
      toast.success('Permissions saved. Users will see updated access on next login (or within 4 hours).');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setDirty(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function getBool(key) {
    const p = perms[key];
    return p === true;
  }

  function getAction(module, action) {
    const p = perms[module];
    if (!p || p === false) return false;
    if (p === true) return true;
    return !!p[action];
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Access Control</span></div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">Role Permissions</h1>
          <p className="text-sm text-surface-400 mt-1">Control what each role can access and do in the system</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-primary-500/20 bg-primary-500/5 text-xs text-primary-300">
        <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5 text-primary-400" />
        <p>
          Permission changes apply on the <strong>next login</strong> or automatically when the user&apos;s
          session token refreshes (within 4 hours). Backend API access is always enforced regardless of
          UI visibility.
        </p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Role list */}
        <div className="w-44 shrink-0 card p-2 flex flex-col gap-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-surface-500 px-2 py-1">Roles</p>
          {isLoading
            ? [1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-surface-700/40 animate-pulse" />)
            : roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => { if (dirty && !window.confirm('Discard unsaved changes?')) return; setSelectedId(role.id); }}
                  className={cn(
                    'flex flex-col items-start w-full px-3 py-2 rounded-lg text-left transition-colors text-sm',
                    selectedId === role.id
                      ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                      : 'text-surface-400 hover:bg-surface-700/50 border border-transparent'
                  )}
                >
                  <span className="font-medium capitalize">{role.label || role.name}</span>
                  <span className="text-2xs text-surface-500">{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                </button>
              ))
          }
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 w-full px-3 py-2 mt-1 rounded-lg text-xs text-surface-500 hover:text-primary-400 hover:bg-primary-500/5 border border-dashed border-surface-700 hover:border-primary-500/40 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New Role
          </button>
        </div>

        {/* Permission matrix */}
        <div className="flex-1 card overflow-hidden p-0">
          {!selectedRole ? (
            <div className="p-8 text-center text-surface-500 text-sm">Select a role to view permissions.</div>
          ) : isAdmin ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-200">Admin — Full Access</p>
                <p className="text-xs text-surface-500 mt-1">Admin has unrestricted access to everything. Permissions cannot be modified.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/50">
                      <th className="text-left px-4 py-3 text-surface-400 font-medium w-48">Module</th>
                      <th className="text-center px-3 py-3 text-surface-400 font-medium">View / Enable</th>
                      <th className="text-center px-3 py-3 text-surface-400 font-medium">Create</th>
                      <th className="text-center px-3 py-3 text-surface-400 font-medium">Edit</th>
                      <th className="text-center px-3 py-3 text-surface-400 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {MODULES.map(mod => {
                      const actions = mod.type === 'boolean' ? [] : (mod.actions ?? DEFAULT_ACTIONS);
                      return (
                        <tr key={mod.key} className="hover:bg-surface-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-surface-200">{mod.label}</span>
                          </td>
                          {mod.type === 'boolean' ? (
                            <>
                              <td className="px-3 py-3 text-center">
                                <Checkbox
                                  checked={getBool(mod.key)}
                                  onChange={v => setBool(mod.key, v)}
                                />
                              </td>
                              <td /><td /><td />
                            </>
                          ) : (
                            ['view', 'create', 'update', 'delete'].map(act => {
                              const supported = actions.includes(act);
                              return (
                                <td key={act} className="px-3 py-3 text-center">
                                  {supported ? (
                                    <Checkbox
                                      checked={getAction(mod.key, act)}
                                      onChange={v => setAction(mod.key, act, v)}
                                    />
                                  ) : (
                                    <span className="text-surface-700">—</span>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700 bg-surface-800/30">
                <p className="text-xs text-surface-500 capitalize">
                  Editing: <span className="text-surface-300 font-medium">{selectedRole.label || selectedRole.name}</span>
                  {' '}— {selectedRole.user_count} active user{selectedRole.user_count !== 1 ? 's' : ''}
                </p>
                <Button
                  loading={saving}
                  disabled={!dirty}
                  onClick={handleSave}
                >
                  Save Permissions
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
              <h3 className="text-surface-100 font-semibold text-sm">Create New Role</h3>
              <button onClick={() => { setShowCreate(false); setNewLabel(''); }} className="text-surface-400 hover:text-surface-100 p-1">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLabel.trim()) return;
                createMutation.mutate(newLabel.trim());
              }}
              className="p-5 flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Role Name</label>
                <input
                  ref={newLabelRef}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Manager, Cashier, Inventory Clerk"
                  className="w-full text-sm bg-surface-800 border border-surface-700 text-surface-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {newLabel.trim() && (
                  <p className="text-2xs text-surface-500 mt-1">
                    Slug: <span className="font-mono text-surface-400">{newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}</span>
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewLabel(''); }}
                  className="px-4 py-2 text-surface-400 hover:text-surface-100 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  disabled={!newLabel.trim()}
                >
                  Create Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'h-5 w-5 rounded border-2 flex items-center justify-center transition-all mx-auto',
        checked
          ? 'bg-primary-600 border-primary-500'
          : 'bg-surface-700 border-surface-600 hover:border-surface-400'
      )}
    >
      {checked && (
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
