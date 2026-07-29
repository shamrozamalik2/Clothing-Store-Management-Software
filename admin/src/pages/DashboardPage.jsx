import { useEffect, useState } from 'react';
import {
  BuildingOffice2Icon, UsersIcon, ShoppingCartIcon,
  ExclamationTriangleIcon, ServerIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import Layout, { RequireAuth } from '../components/Layout';
import { saGetStats } from '../api/client';

function StatCard({ label, value, sub, icon: Icon, color = 'purple' }) {
  const palette = {
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400' },
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400' },
  };
  const c = palette[color] || palette.purple;
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-5 flex items-start gap-4`}>
      <div className={`h-10 w-10 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
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
      {ok ? <CheckCircleIcon className="h-4 w-4 text-green-400" /> : <XCircleIcon className="h-4 w-4 text-red-400" />}
      <span className={`text-sm ${ok ? 'text-green-400' : 'text-red-400'}`}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
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
    <RequireAuth>
      <Layout page="dashboard">
        <div className="max-w-6xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Platform Overview</h2>
            <p className="text-sm text-slate-500 mt-0.5">Monitor all companies and system health.</p>
          </div>

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />)}
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
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Companies</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Companies"   value={stats.companies.total}     icon={BuildingOffice2Icon} color="purple" />
                  <StatCard label="Active"            value={stats.companies.active}    icon={CheckCircleIcon}     color="green" />
                  <StatCard label="On Trial"          value={stats.companies.trial}     icon={ClockIcon}           color="yellow" />
                  <StatCard label="Suspended"         value={stats.companies.suspended} icon={XCircleIcon}         color="red" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Active Users"      value={stats.active_users}        icon={UsersIcon}               color="blue" />
                  <StatCard label="Sales Today"       value={stats.sales_today}         icon={ShoppingCartIcon}        color="green" />
                  <StatCard label="Low Stock Items"   value={stats.low_stock_products}  icon={ExclamationTriangleIcon} color="yellow" />
                  <StatCard label="Server Uptime"     value={`${uptimeHours}h`}         sub={`${stats.memory_mb} MB RAM`} icon={ServerIcon} color="purple" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">System Health</h3>
                  <div className="space-y-3">
                    <StatusBadge ok={true}  label="API Server Online" />
                    <StatusBadge ok={true}  label="Database Connected" />
                    <StatusBadge ok={stats.uptime_seconds > 0} label={`Uptime ${uptimeHours}h`} />
                    <StatusBadge ok={stats.memory_mb < 500}    label={`Memory ${stats.memory_mb} MB`} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Manage Companies',   href: '#/companies' },
                      { label: 'Trial Accounts',     href: '#/companies?status=trial' },
                      { label: 'Suspended Accounts', href: '#/companies?status=suspended' },
                      { label: 'Manage Users',       href: '#/users' },
                    ].map(({ label, href }) => (
                      <a key={label} href={href}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-slate-300 hover:text-white">
                        <span>{label}</span>
                        <span className="text-slate-600">→</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
    </RequireAuth>
  );
}
