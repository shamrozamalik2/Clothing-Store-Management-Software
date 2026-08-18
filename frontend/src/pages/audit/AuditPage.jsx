import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@api/audit.api';
import { cn } from '@utils/cn';
import Input from '@components/ui/Input';

const ENTITY_COLORS = {
  sales:      'bg-blue-500/15 text-blue-400',
  products:   'bg-violet-500/15 text-violet-400',
  customers:  'bg-cyan-500/15 text-cyan-400',
  purchases:  'bg-amber-500/15 text-amber-400',
  expenses:   'bg-red-500/15 text-red-400',
  employees:  'bg-green-500/15 text-green-400',
};

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [entity,   setEntity]   = useState('');
  const [page,     setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, dateFrom, dateTo, entity],
    queryFn:  () => auditApi.list({ page, limit: 50, date_from: dateFrom, date_to: dateTo, entity }),
  });

  const logs       = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-surface-100">Audit Trail</h1>
        <p className="text-sm text-surface-400 mt-0.5">All critical actions — who did what and when.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Module</label>
          <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            <option value="">All</option>
            {['sales','products','customers','purchases','expenses','employees','production_batches'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                {['Date & Time','User','Action','Module','Entity ID','Details'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-surface-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {isLoading && <tr><td colSpan={6} className="py-8 text-center text-surface-600">Loading…</td></tr>}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-surface-600 text-sm">No audit records found.</td></tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-2 text-surface-400 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-surface-200">{log.user_name || 'System'}</p>
                    <p className="text-xs text-surface-600">{log.user_email}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase',
                      log.action?.includes('CREATE') ? 'bg-green-500/15 text-green-400' :
                      log.action?.includes('UPDATE') ? 'bg-blue-500/15 text-blue-400' :
                      log.action?.includes('DELETE') ? 'bg-red-500/15 text-red-400' :
                      'bg-surface-700 text-surface-400')}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {log.entity && (
                      <span className={cn('px-2 py-0.5 rounded text-xs', ENTITY_COLORS[log.entity] || 'bg-surface-700 text-surface-400')}>
                        {log.entity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-surface-500 font-mono text-xs">{log.entity_id || '—'}</td>
                  <td className="px-4 py-2 text-surface-500 text-xs max-w-48 truncate">
                    {log.new_values ? JSON.stringify(log.new_values).slice(0, 60) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-xs text-surface-500">Showing {logs.length} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded text-xs bg-surface-700 text-surface-300 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 50}
                className="px-3 py-1 rounded text-xs bg-surface-700 text-surface-300 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
