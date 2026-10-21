import { useEffect, useState, useCallback } from 'react';
import {
  PencilIcon, TrashIcon, EnvelopeIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import { saListLeads, saUpdateLead, saDeleteLead } from '@api/superAdminClient';
import { INPUT, Field, Modal, Panel, PageHeader, PrimaryButton, SecondaryButton } from './components/adminUI';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

const STATUS_STYLE = {
  new:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  qualified: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  converted: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected:  'bg-surface-700/50 text-surface-400 border-surface-600',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[status] || STATUS_STYLE.new}`}>
      {status}
    </span>
  );
}

function LeadModal({ lead, onClose, onSaved }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes]   = useState(lead.notes || '');
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await saUpdateLead(lead.id, { status, notes });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={lead.business} subtitle={lead.name} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-surface-300">
            <EnvelopeIcon className="h-4 w-4 text-surface-500 shrink-0" />
            <a href={`mailto:${lead.email}`} className="truncate hover:text-surface-100">{lead.email}</a>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-surface-300">
              <PhoneIcon className="h-4 w-4 text-surface-500 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          <p className="text-surface-500">Business type: <span className="text-surface-300">{lead.business_type || '—'}</span></p>
          <p className="text-surface-500">Locations: <span className="text-surface-300">{lead.locations || '—'}</span></p>
        </div>

        {lead.message && (
          <div>
            <p className="text-xs font-medium text-surface-400 mb-1.5">What they want to see</p>
            <p className="text-sm text-surface-200 bg-surface-800/60 rounded-xl px-3.5 py-2.5 whitespace-pre-wrap">{lead.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT}>
              {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </Field>
          <Field label="Received">
            <p className="text-sm text-surface-300 pt-2.5">{new Date(lead.created_at).toLocaleString()}</p>
          </Field>
        </div>

        <Field label="Internal notes" hint="Only visible to super admins.">
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={INPUT} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function SuperAdminLeads() {
  const [rows,         setRows]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [error,        setError]        = useState('');

  const PER_PAGE = 20;

  const load = useCallback(() => {
    setLoading(true); setError('');
    saListLeads({
      limit:  PER_PAGE,
      offset: (page - 1) * PER_PAGE,
      status: statusFilter || undefined,
    })
      .then(r => { setRows(r.data.data.leads); setTotal(r.data.data.total); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load leads.'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const deleteLead = async (lead) => {
    if (!confirm(`Delete the demo request from "${lead.business}"? This cannot be undone.`)) return;
    try { await saDeleteLead(lead.id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete.'); }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <SuperAdminGuard>
      <SuperAdminLayout page="leads">
        <div className="space-y-5 max-w-6xl">
          <PageHeader title="Demo Leads" subtitle={`${total} requests from the "Book a demo" form`} />

          <div className="flex flex-wrap items-center gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${INPUT} w-auto`}>
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <SecondaryButton onClick={load} className="bg-surface-800/80 border border-surface-700/60 text-xs px-3 py-2">
              Refresh
            </SecondaryButton>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Panel className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/40 bg-surface-900/40 text-surface-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Type / Locations</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Received</th>
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
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-surface-500">No demo requests found.</td></tr>
                ) : rows.map(lead => (
                  <tr key={lead.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{lead.business}</p>
                      <p className="text-surface-500 text-xs">{lead.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-surface-300 text-xs">{lead.email}</p>
                      {lead.phone && <p className="text-surface-500 text-xs">{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      <p>{lead.business_type || '—'}</p>
                      <p>{lead.locations ? `${lead.locations} location(s)` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(lead)} title="View / edit"
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteLead(lead)} title="Delete"
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-surface-400">
              <span>{total} requests</span>
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

        {editing && (
          <LeadModal lead={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        )}
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
