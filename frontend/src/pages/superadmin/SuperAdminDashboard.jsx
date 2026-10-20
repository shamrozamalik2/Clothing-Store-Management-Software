import { useEffect, useState } from 'react';
import {
  BuildingOffice2Icon, UsersIcon, ShoppingCartIcon,
  ExclamationTriangleIcon, ServerIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import { saGetStats } from '@api/superAdminClient';
import { Panel, PageHeader, SECTION_LABEL } from './components/adminUI';

function StatCard({ label, value, sub, icon: Icon, color = 'purple' }) {
  const palette = {
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/25', text: 'text-purple-300', icon: 'text-purple-300' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/25',  text: 'text-green-300',  icon: 'text-green-300' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-300', icon: 'text-yellow-300' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-300',    icon: 'text-red-300' },
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   text: 'text-blue-300',   icon: 'text-blue-300' },
  };
  const c = palette[color] || palette.purple;

  // Not routed through <Panel> — its per-color border/background is the
  // whole point of a stat card, and Panel's inline glass-card style would
  // win over a Tailwind border-color class applied alongside it.
  return (
    <div className={`rounded-2xl backdrop-blur-md border ${c.bg} ${c.border} p-5 flex items-start gap-4 shadow-lg shadow-slate-950/20`}>
      <div className={`h-11 w-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <CheckCircleIcon className="h-4 w-4 text-green-400" />
        : <XCircleIcon className="h-4 w-4 text-red-400" />}
      <span className={`text-sm ${ok ? 'text-green-400' : 'text-red-400'}`}>{label}</span>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    saGetStats()
      .then(r => setStats(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  const uptimeHours = stats ? (stats.uptime_seconds / 3600).toFixed(1) : null;

  return (
    <SuperAdminGuard>
      <SuperAdminLayout page="dashboard">
        <div className="max-w-6xl space-y-6">
          <PageHeader title="Platform Overview" subtitle="Monitor all companies and system health." />

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {stats && (
            <>
              {/* Companies */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Companies</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Companies"   value={stats.companies.total}     icon={BuildingOffice2Icon} color="purple" />
                  <StatCard label="Active"            value={stats.companies.active}    icon={CheckCircleIcon}     color="green" />
                  <StatCard label="On Trial"          value={stats.companies.trial}     icon={ClockIcon}           color="yellow" />
                  <StatCard label="Suspended"         value={stats.companies.suspended} icon={XCircleIcon}         color="red" />
                </div>
              </div>

              {/* Users & Sales */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Active Users"      value={stats.active_users}        icon={UsersIcon}           color="blue" />
                  <StatCard label="Sales Today"       value={stats.sales_today}         icon={ShoppingCartIcon}    color="green" />
                  <StatCard label="Low Stock Items"   value={stats.low_stock_products}  icon={ExclamationTriangleIcon} color="yellow" />
                  <StatCard label="Server Uptime"     value={`${uptimeHours}h`}         sub={`${stats.memory_mb} MB RAM`} icon={ServerIcon} color="purple" />
                </div>
              </div>

              {/* System Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Panel className="p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">System Health</h3>
                  <div className="space-y-3">
                    <StatusBadge ok={true}  label="API Server Online" />
                    <StatusBadge ok={true}  label="Database Connected" />
                    <StatusBadge ok={stats.uptime_seconds > 0} label={`Uptime ${uptimeHours}h`} />
                    <StatusBadge ok={stats.memory_mb < 500}    label={`Memory ${stats.memory_mb} MB`} />
                  </div>
                </Panel>

                <Panel className="p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Manage Companies',       href: '#/admin/companies' },
                      { label: 'Trial Accounts',         href: '#/admin/companies?status=trial' },
                      { label: 'Suspended Accounts',     href: '#/admin/companies?status=suspended' },
                      { label: 'Manage Users',           href: '#/admin/users' },
                    ].map(({ label, href }) => (
                      <a key={label} href={href}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-slate-300 hover:text-white">
                        <span>{label}</span>
                        <span className="text-slate-600">→</span>
                      </a>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
