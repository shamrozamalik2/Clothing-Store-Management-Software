import { useEffect, useState } from 'react';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import { saGetStats } from '@api/superAdminClient';

function StatCard({ label, value, sub, color = 'purple' }) {
  const colors = {
    purple: 'text-purple-400 bg-purple-900/20 border-purple-800',
    green:  'text-green-400 bg-green-900/20 border-green-800',
    yellow: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
    red:    'text-red-400 bg-red-900/20 border-red-800',
    blue:   'text-blue-400 bg-blue-900/20 border-blue-800',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value ?? '—'}</div>
      <div className="text-sm font-medium mt-1 opacity-90">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        <div className="max-w-5xl">
          <h2 className="text-xl font-bold text-white mb-6">Platform Overview</h2>

          {loading && <p className="text-slate-400">Loading…</p>}
          {error && <p className="text-red-400">{error}</p>}

          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Companies"  value={stats.companies.total}    color="purple" />
                <StatCard label="Active Companies" value={stats.companies.active}   color="green" />
                <StatCard label="On Trial"         value={stats.companies.trial}    color="yellow" />
                <StatCard label="Suspended"        value={stats.companies.suspended} color="red" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Active Users"     value={stats.active_users}       color="blue" />
                <StatCard label="Sales Today"      value={stats.sales_today}        color="green" />
                <StatCard label="Low Stock Products" value={stats.low_stock_products} color="yellow" />
                <StatCard
                  label="Server Uptime"
                  value={`${uptimeHours}h`}
                  sub={`${stats.memory_mb} MB RAM`}
                  color="purple"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-slate-300 font-semibold mb-3">Quick Links</h3>
                <div className="flex flex-wrap gap-3">
                  <a href="#/admin/companies"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
                    Manage Companies
                  </a>
                  <a href="#/admin/companies?status=trial"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                    Trial Accounts
                  </a>
                  <a href="#/admin/companies?status=suspended"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                    Suspended Accounts
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
