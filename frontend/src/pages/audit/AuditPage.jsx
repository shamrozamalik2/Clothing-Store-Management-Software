import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon, ShieldCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { auditApi } from '@api/audit.api';
import { cn } from '@utils/cn';

const ACTION_STYLE = { CREATE: 'bg-green-500/15 text-green-400', UPDATE: 'bg-blue-500/15 text-blue-400', DELETE: 'bg-red-500/15 text-red-400' };
const ENTITY_COLORS = { sales: 'bg-blue-500/15 text-blue-400', products: 'bg-violet-500/15 text-violet-400', customers: 'bg-cyan-500/15 text-cyan-400', purchases: 'bg-amber-500/15 text-amber-400', expenses: 'bg-red-500/15 text-red-400', employees: 'bg-green-500/15 text-green-400' };
const ENTITIES = ['sales','products','customers','purchases','expenses','employees','production_batches'];

function diffValues(oldVals, newVals) {
  if (!oldVals && !newVals) return [];
  if (!oldVals) return Object.entries(newVals ?? {}).map(([k, v]) => ({ key: k, from: null, to: v }));
  if (!newVals) return Object.entries(oldVals ?? {}).map(([k, v]) => ({ key: k, from: v, to: null }));
  const keys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
  return [...keys].filter(k => {
    const a = oldVals[k]; const b = newVals[k];
    return JSON.stringify(a) !== JSON.stringify(b);
  }).map(k => ({ key: k, from: oldVals[k], to: newVals[k] }));
}

function DiffCell({ log }) {
  const diffs = diffValues(log.old_values, log.new_values);
  if (diffs.length === 0) return <span className="text-surface-600">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {diffs.slice(0, 3).map(d => (
        <div key={d.key} className="flex items-center gap-1 text-[11px] leading-tight">
          <span className="text-surface-500 font-mono shrink-0">{d.key}:</span>
          {d.from !== null && d.from !== undefined && (
            <span className="text-red-400 line-through truncate max-w-[60px]" title={String(d.from)}>{String(d.from).slice(0, 20)}</span>
          )}
          {d.from !== null && d.to !== null && <span className="text-surface-600">→</span>}
          {d.to !== null && d.to !== undefined && (
            <span className="text-green-400 truncate max-w-[60px]" title={String(d.to)}>{String(d.to).slice(0, 20)}</span>
          )}
        </div>
      ))}
      {diffs.length > 3 && <span className="text-surface-600 text-[11px]">+{diffs.length - 3} more</span>}
    </div>
  );
}

function ExpandedDiff({ log }) {
  const diffs = diffValues(log.old_values, log.new_values);
  if (diffs.length === 0) {
    const vals = log.new_values ?? log.old_values;
    if (!vals) return null;
    return (
      <div className="px-4 py-3 bg-surface-900/60 border-t border-surface-700/40">
        <pre className="text-xs text-surface-400 whitespace-pre-wrap break-all">{JSON.stringify(vals, null, 2)}</pre>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 bg-surface-900/60 border-t border-surface-700/40">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-surface-500 border-b border-surface-700/40">
            <th className="text-left py-1 pr-4 font-semibold">Field</th>
            <th className="text-left py-1 pr-4 font-semibold text-red-400">Before</th>
            <th className="text-left py-1 font-semibold text-green-400">After</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map(d => (
            <tr key={d.key} className="border-b border-surface-800/60">
              <td className="py-1 pr-4 font-mono text-surface-400">{d.key}</td>
              <td className="py-1 pr-4 text-red-400 break-all">{d.from !== null && d.from !== undefined ? String(d.from) : <span className="text-surface-600 italic">—</span>}</td>
              <td className="py-1 text-green-400 break-all">{d.to !== null && d.to !== undefined ? String(d.to) : <span className="text-surface-600 italic">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [entity,   setEntity]   = useState('');
  const [page,     setPage]     = useState(1);
  const [hoveredId,  setHoveredId]  = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, dateFrom, dateTo, entity],
    queryFn:  () => auditApi.list({ page, limit: 50, date_from: dateFrom, date_to: dateTo, entity }),
  });

  const logs       = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  function exportCsv() {
    const cols = ['Date','User','Action','Module','Entity ID','Details'];
    const rows = logs.map(l => [new Date(l.created_at).toLocaleString(), l.user_name || 'System', l.action, l.entity, l.entity_id || '', l.new_values ? JSON.stringify(l.new_values).slice(0, 100) : '']);
    const csv = '﻿' + [cols, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-trail.csv'; a.click();
  }

  function getActionStyle(action) {
    if (!action) return 'bg-surface-700 text-surface-400';
    const key = Object.keys(ACTION_STYLE).find(k => action.includes(k));
    return ACTION_STYLE[key] || 'bg-surface-700 text-surface-400';
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Compliance</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Audit Trail</h1>
            <p className="text-sm text-surface-400 mt-1">All critical actions — who did what and when</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-surface-600 bg-surface-700/50 text-surface-200 text-sm px-3 outline-none focus:border-primary-500 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-surface-600 bg-surface-700/50 text-surface-200 text-sm px-3 outline-none focus:border-primary-500 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Module</label>
          <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}
            className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${entity ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300 hover:border-surface-500'}`}>
            <option value="">All Modules</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {(dateFrom || dateTo || entity) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setEntity(''); setPage(1); }} className="h-9 px-3 rounded-lg text-xs text-surface-400 hover:text-surface-200 border border-surface-600 hover:border-surface-500 transition-colors self-end">Clear</button>
        )}
        <span className="ml-auto text-xs text-surface-500 font-medium self-end">{pagination.total ?? 0} records</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-800/80">
              {['Date & Time','User','Action','Module','Entity ID','Details'].map(h => (
                <th key={h} className="text-left px-4 py-3"><span className="text-xs font-bold uppercase tracking-widest text-surface-400">{h}</span></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/40">
            {isLoading
              ? [...Array(8)].map((_, i) => <tr key={i}>{[...Array(6)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-700/50 animate-pulse rounded-lg" /></td>)}</tr>)
              : logs.length === 0
              ? <tr><td colSpan={6} className="px-4 py-12 text-center text-surface-500 text-sm">No audit records found.</td></tr>
              : logs.map(log => {
                  const hovered  = hoveredId === log.id;
                  const expanded = expandedId === log.id;
                  const hasDiff  = log.old_values || log.new_values;
                  return (
                    <>
                      <tr key={log.id} style={{ background: hovered ? 'rgba(30,30,40,0.8)' : 'transparent' }} onMouseEnter={() => setHoveredId(log.id)} onMouseLeave={() => setHoveredId(null)} className="transition-colors">
                        <td className="px-4 py-2.5 text-surface-400 whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2.5"><p className="text-surface-200 font-medium">{log.user_name || 'System'}</p>{log.user_email && <p className="text-xs text-surface-600">{log.user_email}</p>}</td>
                        <td className="px-4 py-2.5"><span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold uppercase', getActionStyle(log.action))}>{log.action}</span></td>
                        <td className="px-4 py-2.5">{log.entity && <span className={cn('px-2 py-0.5 rounded-lg text-xs font-medium', ENTITY_COLORS[log.entity] || 'bg-surface-700 text-surface-400')}>{log.entity}</span>}</td>
                        <td className="px-4 py-2.5 text-surface-500 font-mono text-xs">{log.entity_id || '—'}</td>
                        <td className={cn('px-4 py-2.5 text-xs max-w-[240px]', hasDiff && 'cursor-pointer')}
                          onClick={() => hasDiff && setExpandedId(expanded ? null : log.id)}>
                          <DiffCell log={log} />
                          {hasDiff && (
                            <span className="block mt-0.5 text-primary-500 text-[10px]">{expanded ? '▲ collapse' : '▼ details'}</span>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${log.id}-diff`}>
                          <td colSpan={6} className="p-0">
                            <ExpandedDiff log={log} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
            }
          </tbody>
        </table>

        {pagination.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/50">
            <p className="text-xs text-surface-500">Showing {logs.length} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border border-surface-600 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 transition-colors">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50} className="px-3 py-1.5 rounded-lg text-xs border border-surface-600 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
