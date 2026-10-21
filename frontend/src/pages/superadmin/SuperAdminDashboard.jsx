import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BuildingOffice2Icon, UsersIcon, ShoppingCartIcon,
  ExclamationTriangleIcon, ServerIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import SuperAdminLayout, { SuperAdminGuard } from './SuperAdminLayout';
import { saGetStats } from '@api/superAdminClient';
import Card from '@components/ui/Card';
import { KpiTile, PageHeader, STAGGER_PARENT, SectionIcon } from './components/adminUI';

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

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Companies</p>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={STAGGER_PARENT} initial="hidden" animate="show"
            >
              <KpiTile label="Total Companies" value={stats?.companies.total}     icon={BuildingOffice2Icon} theme="violet" loading={loading} />
              <KpiTile label="Active"          value={stats?.companies.active}    icon={CheckCircleIcon}     theme="green"  loading={loading} />
              <KpiTile label="On Trial"        value={stats?.companies.trial}     icon={ClockIcon}           theme="amber"  loading={loading} />
              <KpiTile label="Suspended"       value={stats?.companies.suspended} icon={XCircleIcon}         theme="red"    loading={loading} />
            </motion.div>
          </div>

          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-3">Activity</p>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
              variants={STAGGER_PARENT} initial="hidden" animate="show"
            >
              <KpiTile label="Active Users"    value={stats?.active_users}       icon={UsersIcon}               theme="blue"   loading={loading} />
              <KpiTile label="Sales Today"     value={stats?.sales_today}        icon={ShoppingCartIcon}        theme="green"  loading={loading} />
              <KpiTile label="Low Stock Items" value={stats?.low_stock_products} icon={ExclamationTriangleIcon} theme="amber"  loading={loading} />
              <a href="#/admin/leads" className="block">
                <KpiTile label="New Leads" value={stats?.new_leads} icon={EnvelopeIcon} theme="violet" loading={loading} />
              </a>
              <KpiTile
                label="Server Uptime"
                value={stats ? `${uptimeHours}h` : undefined}
                sub={stats ? `${stats.memory_mb} MB RAM` : undefined}
                icon={ServerIcon} theme="violet" loading={loading}
              />
            </motion.div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <Card.Header className="flex items-center gap-2.5">
                  <SectionIcon icon={ServerIcon} theme="green" />
                  <Card.Title>System Health</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-3">
                  <StatusBadge ok={true}  label="API Server Online" />
                  <StatusBadge ok={true}  label="Database Connected" />
                  <StatusBadge ok={stats.uptime_seconds > 0} label={`Uptime ${uptimeHours}h`} />
                  <StatusBadge ok={stats.memory_mb < 500}    label={`Memory ${stats.memory_mb} MB`} />
                </Card.Content>
              </Card>

              <Card>
                <Card.Header className="flex items-center gap-2.5">
                  <SectionIcon icon={BuildingOffice2Icon} theme="violet" />
                  <Card.Title>Quick Links</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-2">
                  {[
                    { label: 'Manage Companies',       href: '#/admin/companies' },
                    { label: 'Trial Accounts',         href: '#/admin/companies?status=trial' },
                    { label: 'Suspended Accounts',     href: '#/admin/companies?status=suspended' },
                    { label: 'Demo Leads',             href: '#/admin/leads' },
                    { label: 'Manage Users',           href: '#/admin/users' },
                  ].map(({ label, href }) => (
                    <a key={label} href={href}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/60 hover:bg-surface-700/60 transition-colors text-sm text-surface-300 hover:text-surface-100">
                      <span>{label}</span>
                      <span className="text-surface-600">→</span>
                    </a>
                  ))}
                </Card.Content>
              </Card>
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
