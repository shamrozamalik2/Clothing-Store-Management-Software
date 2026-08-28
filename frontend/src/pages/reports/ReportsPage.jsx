import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ChartBarIcon, ShoppingBagIcon, CubeIcon,
  TruckIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  UserGroupIcon, ExclamationTriangleIcon, DocumentArrowDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { subDays, subMonths, differenceInDays, format, parseISO, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import toast from 'react-hot-toast';

import { reportsApi } from '@api/reports.api';
import { expensesApi } from '@api/expenses.api';
import { salesApi } from '@api/sales.api';
import { formatCurrency, formatNumber } from '@utils/format';
import { cn } from '@utils/cn';
import Badge from '@components/common/Badge';

// ─── CSV download helper ──────────────────────────────────────────────────────

function downloadCsv(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv  = rows.map(r => (Array.isArray(r) ? r : [r]).map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Preset date ranges ───────────────────────────────────────────────────────

const today = () => format(new Date(), 'yyyy-MM-dd');

const PRESETS = [
  { label: 'Today',       from: () => today(), to: () => today() },
  { label: 'Last 7 days', from: () => format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: () => today() },
  { label: 'This Month',  from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: () => today() },
  { label: 'Last Month',  from: () => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
                           to:  () => format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
  { label: 'This Year',   from: () => format(startOfYear(new Date()), 'yyyy-MM-dd'), to: () => today() },
];

const TABS = ['Overview', 'Sales', 'Inventory', 'Purchases', 'P&L', 'Staff', 'FBR/GST'];

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa'];

function getChartTheme() {
  const dark = document.documentElement.classList.contains('dark');
  return {
    grid: dark ? '#334155' : '#e2e8f0',
    tick: dark ? '#64748b' : '#94a3b8',
    tooltipContent: {
      background: dark ? '#1e293b' : '#ffffff',
      border:     `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 8,
      fontSize: 12,
      boxShadow: dark ? 'none' : '0 4px 14px rgba(15,23,42,0.10)',
    },
    tooltipLabel: { color: dark ? '#94a3b8' : '#64748b' },
    legend: { fontSize: 12, color: dark ? '#94a3b8' : '#64748b' },
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab]   = useState('Overview');
  const [preset, setPreset]         = useState('This Month');
  const [from, setFrom]             = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo]                 = useState(() => today());
  const [exporting, setExporting]   = useState(false);
  const [compareOn, setCompareOn]   = useState(false);

  const params = { from, to };

  const compareParams = useMemo(() => {
    if (!compareOn) return null;
    const diff = differenceInDays(parseISO(to), parseISO(from));
    return {
      from: format(subDays(parseISO(from), diff + 1), 'yyyy-MM-dd'),
      to:   format(subDays(parseISO(from), 1),         'yyyy-MM-dd'),
    };
  }, [compareOn, from, to]);

  function applyPreset(p) {
    setPreset(p.label);
    setFrom(p.from());
    setTo(p.to());
  }

  function handleCustomDate(field, value) {
    setPreset('Custom');
    if (field === 'from') setFrom(value);
    else setTo(value);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const [ovRes, dsRes, tpRes, tcRes, pmRes] = await Promise.all([
        reportsApi.overview({ from, to }),
        reportsApi.dailySales({ from, to }),
        reportsApi.topProducts({ from, to, limit: 30 }),
        reportsApi.topCustomers({ from, to, limit: 20 }),
        reportsApi.paymentMethods({ from, to }),
      ]);

      const ov = ovRes?.data?.sales ?? {};
      const ds = dsRes?.data ?? [];
      const tp = tpRes?.data ?? [];
      const tc = tcRes?.data ?? [];
      const pm = pmRes?.data ?? [];

      const rows = [
        ['ProBusinessCloud — Report Export'],
        ['Generated', new Date().toLocaleString('en-PK')],
        ['Period', `${from}  →  ${to}`],
        [],
        ['=== SALES SUMMARY ==='],
        ['Metric', 'Value'],
        ['Revenue',         ov.revenue         ?? 0],
        ['Total Orders',    ov.sale_count       ?? 0],
        ['Avg Order Value', ov.avg_order_value  ?? 0],
        ['Outstanding',     ov.outstanding      ?? 0],
        [],
        ['=== DAILY SALES ==='],
        ['Date', 'Revenue', 'Collected', 'Orders'],
        ...ds.map(d => [d.day, d.revenue ?? 0, d.collected ?? 0, d.sale_count ?? 0]),
        [],
        ['=== TOP PRODUCTS ==='],
        ['Product', 'SKU', 'Revenue', 'Units Sold'],
        ...tp.map(p => [p.name, p.sku ?? '', p.revenue ?? 0, p.total_qty ?? 0]),
        [],
        ['=== TOP CUSTOMERS ==='],
        ['Customer', 'Total Revenue', 'Orders'],
        ...tc.map(c => [c.customer_name ?? 'Walk-in', c.total_revenue ?? 0, c.order_count ?? 0]),
        [],
        ['=== PAYMENT METHODS ==='],
        ['Method', 'Revenue', 'Orders'],
        ...pm.map(p => [p.payment_method, p.revenue ?? 0, p.sale_count ?? 0]),
      ];

      downloadCsv(`report-${from}-to-${to}.csv`, rows);
      toast.success('Report exported successfully.');
    } catch (err) {
      toast.error('Export failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400">Analytics</span>
            </div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-surface-400 mt-1">Business performance insights across all operations.</p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            title="Export report as CSV"
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5 shrink-0" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Date range filter bar */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button key={p.label}
            onClick={() => applyPreset(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              preset === p.label
                ? 'bg-primary-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            )}>
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <input type="date" value={from} onChange={e => handleCustomDate('from', e.target.value)}
            max={to}
            className="h-8 px-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <span className="text-surface-500 text-xs">to</span>
          <input type="date" value={to} onChange={e => handleCustomDate('to', e.target.value)}
            min={from}
            className="h-8 px-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <button
          onClick={() => setCompareOn(o => !o)}
          className={cn(
            'ml-auto px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            compareOn
              ? 'border-primary-500/60 bg-primary-500/10 text-primary-300'
              : 'border-surface-600 bg-transparent text-surface-400 hover:border-surface-500 hover:text-surface-300',
          )}>
          {compareOn ? '⇄ Comparing prior period' : '⇄ Compare prior period'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-700">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            )}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview'   && <OverviewTab   params={params} compareParams={compareParams} />}
      {activeTab === 'Sales'      && <SalesTab       params={params} />}
      {activeTab === 'Inventory'  && <InventoryTab   />}
      {activeTab === 'Purchases'  && <PurchasesTab   params={params} />}
      {activeTab === 'P&L'        && <PLTab          params={params} />}
      {activeTab === 'Staff'      && <StaffTab       params={params} />}
      {activeTab === 'FBR/GST'    && <FBRTab         params={params} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function pct(cur, prev) {
  const c = parseFloat(cur) || 0;
  const p = parseFloat(prev) || 0;
  if (p === 0) return c > 0 ? Infinity : null;
  return ((c - p) / p) * 100;
}

function OverviewTab({ params, compareParams }) {
  const ct = getChartTheme();
  const { data: ov, isLoading: loadingOv } = useQuery({
    queryKey: ['reports-overview', params],
    queryFn:  () => reportsApi.overview(params),
  });

  const { data: cmpOv } = useQuery({
    queryKey: ['reports-overview-cmp', compareParams],
    queryFn:  () => reportsApi.overview(compareParams),
    enabled:  !!compareParams,
  });

  const { data: ds } = useQuery({
    queryKey: ['reports-daily', params],
    queryFn:  () => reportsApi.dailySales(params),
  });

  const { data: pm } = useQuery({
    queryKey: ['reports-payment-methods', params],
    queryFn:  () => reportsApi.paymentMethods(params),
  });

  const { data: tp } = useQuery({
    queryKey: ['reports-top-products', params],
    queryFn:  () => reportsApi.topProducts({ ...params, limit: 5 }),
  });

  const { data: tc } = useQuery({
    queryKey: ['reports-top-customers', params],
    queryFn:  () => reportsApi.topCustomers({ ...params, limit: 5 }),
  });

  const o          = ov?.data;
  const cmp        = cmpOv?.data;
  const dailyData  = ds?.data ?? [];
  const pmData     = pm?.data ?? [];
  const topProds   = tp?.data ?? [];
  const topCusts   = tc?.data ?? [];

  const chartData = useMemo(() =>
    (dailyData ?? []).filter(d => d?.day).map(d => ({
      day:       format(d.day instanceof Date ? d.day : parseISO(String(d.day).slice(0, 10)), 'dd MMM'),
      Revenue:   parseFloat(d.revenue)   || 0,
      Collected: parseFloat(d.collected) || 0,
    })), [dailyData]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      {compareParams && (
        <p className="text-xs text-surface-500 -mb-2">
          <span className="text-surface-300 font-medium">{params.from} → {params.to}</span>
          <span className="mx-2 text-surface-600">vs prior</span>
          <span className="text-surface-400">{compareParams.from} → {compareParams.to}</span>
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={formatCurrency(o?.sales?.revenue)} icon={<ArrowTrendingUpIcon className="h-5 w-5" />} color="primary" loading={loadingOv} delta={cmp ? pct(o?.sales?.revenue, cmp?.sales?.revenue) : undefined} />
        <KpiCard label="Gross Profit" value={formatCurrency(o?.gross_profit)} sub={`${(o?.profit_margin ?? 0).toFixed(1)}% margin`} icon={<ChartBarIcon className="h-5 w-5" />} color="green" loading={loadingOv} delta={cmp ? pct(o?.gross_profit, cmp?.gross_profit) : undefined} />
        <KpiCard label="Orders" value={formatNumber(o?.sales?.sale_count)} sub={`Avg ${formatCurrency(o?.sales?.avg_order_value)}`} icon={<ShoppingBagIcon className="h-5 w-5" />} color="cyan" loading={loadingOv} delta={cmp ? pct(o?.sales?.sale_count, cmp?.sales?.sale_count) : undefined} />
        <KpiCard label="Outstanding" value={formatCurrency(o?.sales?.outstanding)} icon={<ExclamationTriangleIcon className="h-5 w-5" />} color={o?.sales?.outstanding > 0 ? 'red' : 'neutral'} loading={loadingOv} />
      </div>

      {/* Daily Sales Chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Daily Sales</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: ct.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ct.tick }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={ct.tooltipContent}
                labelStyle={ct.tooltipLabel}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={ct.legend} />
              <Area type="monotone" dataKey="Revenue"   stroke="#6366f1" strokeWidth={2} fill="url(#gRevenue)" />
              <Area type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={2} fill="url(#gCollected)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie */}
        {pmData.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-surface-200 mb-4">Revenue by Payment Method</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pmData} dataKey="revenue" nameKey="payment_method"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                    paddingAngle={3}>
                    {pmData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={ct.tooltipContent}
                    formatter={(v) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {pmData.map((m, i) => (
                  <div key={m.payment_method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="capitalize text-surface-300">{m.payment_method}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatCurrency(m.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stock health */}
        {o?.stock && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-surface-200 mb-4">Inventory Health</h2>
            <div className="grid grid-cols-3 gap-4">
              <StockStatCard label="Total Products" value={o.stock.total_products} />
              <StockStatCard label="Low Stock" value={o.stock.low_stock} warn />
              <StockStatCard label="Out of Stock" value={o.stock.out_of_stock} danger />
            </div>
          </div>
        )}
      </div>

      {/* Top Products & Customers side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopList
          title="Top Products"
          icon={<ShoppingBagIcon className="h-4 w-4" />}
          rows={topProds}
          labelKey="name"
          valueKey="total_revenue"
          subKey="total_qty"
          subSuffix=" sold"
        />
        <TopList
          title="Top Customers"
          icon={<UserGroupIcon className="h-4 w-4" />}
          rows={topCusts}
          labelKey="name"
          valueKey="total_spent"
          subKey="sale_count"
          subSuffix=" orders"
        />
      </div>
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({ params }) {
  const ct = getChartTheme();
  const { data: ov }  = useQuery({ queryKey: ['reports-overview', params],       queryFn: () => reportsApi.overview(params) });
  const { data: ds }  = useQuery({ queryKey: ['reports-daily', params],           queryFn: () => reportsApi.dailySales(params) });
  const { data: tp }  = useQuery({ queryKey: ['reports-top-products', params],    queryFn: () => reportsApi.topProducts({ ...params, limit: 10 }) });
  const { data: tc }  = useQuery({ queryKey: ['reports-top-customers', params],   queryFn: () => reportsApi.topCustomers({ ...params, limit: 10 }) });
  const { data: pm }  = useQuery({ queryKey: ['reports-payment-methods', params], queryFn: () => reportsApi.paymentMethods(params) });

  const o         = ov?.data;
  const topProds  = tp?.data ?? [];
  const topCusts  = tc?.data ?? [];
  const pmData    = pm?.data ?? [];

  const barData = useMemo(() =>
    (tp?.data ?? []).slice(0, 8).map(p => ({
      name:    p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
      Revenue: parseFloat(p.total_revenue) || 0,
      Cost:    parseFloat(p.total_cost)    || 0,
    })), [tp]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue"      value={formatCurrency(o?.sales?.revenue)} color="primary" />
        <KpiCard label="COGS"         value={formatCurrency(o?.cogs)} color="neutral" />
        <KpiCard label="Gross Profit" value={formatCurrency(o?.gross_profit)} sub={`${(o?.profit_margin ?? 0).toFixed(1)}% margin`} color="green" />
        <KpiCard label="Discount Given" value={formatCurrency(o?.sales?.total_discount)} color="neutral" />
      </div>

      {/* Product Revenue Bar Chart */}
      {barData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Revenue vs Cost — Top Products</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ct.tick }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={ct.tooltipContent}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={ct.legend} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="Cost"    fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 products table */}
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-surface-200">Top Products by Revenue</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">#</th>
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">Product</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Qty</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Revenue</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {topProds.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500 text-xs">No sales in this period.</td></tr>
              ) : topProds.map((p, i) => (
                <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-surface-500 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-surface-100 text-xs font-medium truncate max-w-[130px]">{p.name}</p>
                    {p.category_name && <p className="text-2xs text-surface-500">{p.category_name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-300 text-xs">{formatNumber(p.total_qty)}</td>
                  <td className="px-4 py-2.5 text-right text-surface-100 text-xs font-medium">{formatCurrency(p.total_revenue)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={cn('text-xs font-medium', p.profit_margin >= 20 ? 'text-green-400' : p.profit_margin >= 0 ? 'text-yellow-400' : 'text-red-400')}>
                      {p.profit_margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top 10 customers table */}
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-surface-200">Top Customers by Spend</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">#</th>
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">Customer</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Orders</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Spent</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {topCusts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500 text-xs">No customers in this period.</td></tr>
              ) : topCusts.map((c, i) => (
                <tr key={c.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-surface-500 text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-surface-100 text-xs font-medium">{c.name}</p>
                    {c.phone && <p className="text-2xs text-surface-500">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-300 text-xs">{c.sale_count}</td>
                  <td className="px-4 py-2.5 text-right text-surface-100 text-xs font-medium">{formatCurrency(c.total_spent)}</td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {c.total_due > 0
                      ? <span className="text-red-400 font-medium">{formatCurrency(c.total_due)}</span>
                      : <span className="text-surface-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const ct = getChartTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['reports-stock'],
    queryFn:  () => reportsApi.stockValuation(),
  });

  const d          = data?.data;
  const summary    = d?.summary;
  const byCategory = d?.byCategory ?? [];
  const lowStock   = d?.lowStockItems ?? [];

  const pieData = byCategory
    .filter(c => c.stock_value > 0)
    .slice(0, 6)
    .map(c => ({ name: c.category, value: parseFloat(c.stock_value) || 0 }));

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Stock Value (Cost)"   value={formatCurrency(summary?.stock_value)}  color="primary" loading={isLoading} />
        <KpiCard label="Retail Value"         value={formatCurrency(summary?.retail_value)} color="cyan"    loading={isLoading} />
        <KpiCard label="Low Stock Items"      value={formatNumber(summary?.low_stock)}       color="warn"    loading={isLoading} />
        <KpiCard label="Out of Stock"         value={formatNumber(summary?.out_of_stock)}    color="red"     loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown pie + table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Stock Value by Category</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={ct.tooltipContent}
                    formatter={(v) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {pieData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-surface-300 truncate">{c.name}</span>
                    </div>
                    <span className="text-surface-200 font-medium shrink-0">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-surface-500">No stock data available.</p>
          )}
        </div>

        {/* Category table */}
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-surface-200">Category Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">Category</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Products</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Stock</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {byCategory.map((c, i) => (
                <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-surface-100 text-xs font-medium">{c.category}</td>
                  <td className="px-4 py-2.5 text-right text-surface-300 text-xs">{c.product_count}</td>
                  <td className="px-4 py-2.5 text-right text-surface-300 text-xs">{formatNumber(c.total_stock)}</td>
                  <td className="px-4 py-2.5 text-right text-surface-100 text-xs font-medium">{formatCurrency(c.stock_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low / out of stock items */}
      {lowStock.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3 border-b border-surface-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-surface-200">Low & Out-of-Stock Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">Product</th>
                <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">In Stock</th>
                <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Alert At</th>
                <th className="text-center px-4 py-2.5 text-surface-400 font-medium text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {lowStock.map(p => (
                <tr key={p.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="text-surface-100 text-xs font-medium">{p.name}</p>
                    <p className="text-2xs text-surface-500 font-mono">{p.sku}</p>
                  </td>
                  <td className="px-4 py-2.5 text-surface-400 text-xs hidden sm:table-cell">{p.category_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={cn('text-xs font-semibold', p.stock_quantity <= 0 ? 'text-red-400' : 'text-yellow-400')}>
                      {formatNumber(p.stock_quantity)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-500 text-xs">{formatNumber(p.low_stock_alert)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={p.stock_quantity <= 0 ? 'danger' : 'warning'} dot>
                      {p.stock_quantity <= 0 ? 'Out of stock' : 'Low stock'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Purchases Tab ────────────────────────────────────────────────────────────

function PurchasesTab({ params }) {
  const ct = getChartTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['reports-purchases', params],
    queryFn:  () => reportsApi.purchasesSummary(params),
  });

  const d           = data?.data;
  const totals      = d?.totals;
  const bySupplier  = d?.bySupplier ?? [];

  const chartData = useMemo(() =>
    (d?.daily ?? []).filter(row => row?.day).map(row => ({
      day:    format(row.day instanceof Date ? row.day : parseISO(String(row.day).slice(0, 10)), 'dd MMM'),
      Amount: parseFloat(row.total_amount) || 0,
    })), [d]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Purchases"       value={formatNumber(totals?.purchase_count)} unit="orders" color="cyan"    loading={isLoading} />
        <KpiCard label="Total Amount"    value={formatCurrency(totals?.total_amount)}                color="primary" loading={isLoading} />
        <KpiCard label="Amount Paid"     value={formatCurrency(totals?.paid_amount)}                 color="green"   loading={isLoading} />
        <KpiCard label="Amount Due"      value={formatCurrency(totals?.due_amount)}  color={totals?.due_amount > 0 ? 'red' : 'neutral'} loading={isLoading} />
      </div>

      {/* Daily purchases chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Daily Purchases</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: ct.tick }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: ct.tick }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={ct.tooltipContent}
                formatter={(v) => [formatCurrency(v), 'Amount']}
              />
              <Bar dataKey="Amount" fill="#22d3ee" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By supplier table */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-surface-700">
          <h2 className="text-sm font-semibold text-surface-200">Purchases by Supplier</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 bg-surface-800/50">
              <th className="text-left px-4 py-2.5 text-surface-400 font-medium text-xs">Supplier</th>
              <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Orders</th>
              <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Total</th>
              <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Paid</th>
              <th className="text-right px-4 py-2.5 text-surface-400 font-medium text-xs">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {bySupplier.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-surface-500 text-xs">No purchases in this period.</td></tr>
            ) : bySupplier.map((s, i) => (
              <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                <td className="px-4 py-2.5 text-surface-100 text-xs font-medium">{s.supplier_name}</td>
                <td className="px-4 py-2.5 text-right text-surface-300 text-xs">{s.purchase_count}</td>
                <td className="px-4 py-2.5 text-right text-surface-100 text-xs font-medium">{formatCurrency(s.total_amount)}</td>
                <td className="px-4 py-2.5 text-right text-green-400 text-xs">{formatCurrency(s.paid_amount)}</td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {s.due_amount > 0
                    ? <span className="text-red-400 font-medium">{formatCurrency(s.due_amount)}</span>
                    : <span className="text-surface-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

const COLOR_MAP = {
  primary: { bg: 'bg-primary-500/10', text: 'text-primary-400', icon: 'text-primary-500' },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-400',   icon: 'text-green-500' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    icon: 'text-cyan-500' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     icon: 'text-red-500' },
  warn:    { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  icon: 'text-yellow-500' },
  neutral: { bg: 'bg-surface-700',    text: 'text-surface-200', icon: 'text-surface-400' },
};

function KpiCard({ label, value, sub, icon, color = 'neutral', loading, unit, delta }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.neutral;
  const deltaNum = delta !== null && delta !== undefined ? parseFloat(delta) : null;
  const deltaUp  = deltaNum !== null && deltaNum >= 0;
  return (
    <div className="card p-4 flex items-start gap-3">
      {icon && (
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-surface-500 mb-0.5">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-surface-700 rounded animate-pulse" />
        ) : (
          <p className={cn('text-lg font-bold leading-tight', c.text)}>
            {value}
            {unit && <span className="text-sm font-normal text-surface-400 ml-1">{unit}</span>}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {sub && !loading && <p className="text-2xs text-surface-500">{sub}</p>}
          {!loading && deltaNum !== null && !isNaN(deltaNum) && isFinite(deltaNum) && (
            <span className={cn(
              'inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              deltaUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400',
            )}>
              {deltaUp ? '▲' : '▼'} {Math.abs(deltaNum).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StockStatCard({ label, value, warn, danger }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-surface-800/50">
      <p className={cn('text-2xl font-bold', danger ? 'text-red-400' : warn ? 'text-yellow-400' : 'text-surface-100')}>
        {value ?? 0}
      </p>
      <p className="text-2xs text-surface-500 text-center">{label}</p>
    </div>
  );
}

function TopList({ title, icon, rows, labelKey, valueKey, subKey, subSuffix }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(r => parseFloat(r[valueKey]) || 0), 1);

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-surface-200 mb-4 flex items-center gap-2">
        <span className="text-surface-400">{icon}</span> {title}
      </h2>
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const pct = ((parseFloat(r[valueKey]) || 0) / max) * 100;
          return (
            <div key={r.id ?? i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-surface-200 truncate max-w-[160px]">{r[labelKey]}</span>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-xs font-semibold text-surface-100">{formatCurrency(r[valueKey])}</span>
                  {subKey && <span className="text-2xs text-surface-500 ml-1.5">{formatNumber(r[subKey])}{subSuffix}</span>}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-surface-700">
                <div className="h-1.5 rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab({ params }) {
  const { data: ovRes, isLoading: loadOv } = useQuery({
    queryKey: ['reports-overview', params],
    queryFn:  () => reportsApi.overview(params),
  });
  const { data: exRes, isLoading: loadEx } = useQuery({
    queryKey: ['reports-expenses-pl', params],
    queryFn:  () => expensesApi.list({ from: params.from, to: params.to, limit: 1000 }),
  });
  const { data: pvRes } = useQuery({
    queryKey: ['reports-stock-val'],
    queryFn:  () => reportsApi.stockValuation(),
  });

  const sales    = ovRes?.data?.sales ?? {};
  const expenses = exRes?.data?.expenses ?? exRes?.data ?? [];
  const stockVal = pvRes?.data;

  const revenue    = parseFloat(sales.revenue)         || 0;
  const collected  = parseFloat(sales.collected)        || 0;
  const cogs       = parseFloat(ovRes?.data?.cogs)     || 0;
  const totalExp   = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const grossProfit = revenue - cogs;
  const netProfit  = grossProfit - totalExp;
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0;
  const netMargin   = revenue > 0 ? ((netProfit  / revenue) * 100) : 0;

  const expByCat = expenses.reduce((acc, e) => {
    const cat = e.category_name || 'Uncategorised';
    acc[cat] = (acc[cat] || 0) + parseFloat(e.amount || 0);
    return acc;
  }, {});
  const expRows = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);

  const loading = loadOv || loadEx;

  const PnlRow = ({ label, value, bold, accent, indent }) => (
    <div className={cn(
      'flex items-center justify-between py-2.5 border-b border-surface-700/30 last:border-0',
      bold && 'font-bold',
      indent && 'pl-4',
    )}>
      <span className={cn('text-sm', bold ? 'text-surface-100' : 'text-surface-400', indent && 'text-xs')}>{label}</span>
      <span className={cn('text-sm tabular-nums font-semibold', accent || (bold ? 'text-surface-100' : 'text-surface-300'))}>
        {loading ? '…' : formatCurrency(value)}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue',      value: formatCurrency(revenue),    color: 'text-green-400' },
          { label: 'Total Expenses', value: formatCurrency(totalExp), color: 'text-red-400'  },
          { label: 'Net Profit',   value: formatCurrency(netProfit),  color: netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Net Margin',   value: `${netMargin.toFixed(1)}%`,  color: netMargin >= 0 ? 'text-primary-400' : 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="card p-5 flex flex-col gap-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">{k.label}</p>
            <p className={cn('text-2xl font-black', k.color)}>{loading ? '—' : k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Profit & Loss Statement</h2>
          <div className="divide-y divide-surface-700/30">
            <PnlRow label="Revenue (Sales)"       value={revenue}    bold accent="text-green-400" />
            <PnlRow label="Cost of Goods Sold" value={cogs} indent />
            <PnlRow label="Gross Profit"           value={grossProfit} bold accent={grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <PnlRow label="Total Expenses"         value={totalExp}   indent />
            <PnlRow label="Net Profit / (Loss)"    value={netProfit}  bold accent={netProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
          </div>
          <div className="mt-4 flex gap-4 text-xs text-surface-500 border-t border-surface-700/30 pt-3">
            <span>Gross margin: <strong className="text-surface-300">{grossMargin.toFixed(1)}%</strong></span>
            <span>Net margin: <strong className="text-surface-300">{netMargin.toFixed(1)}%</strong></span>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Expense Breakdown by Category</h2>
          {expRows.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">No expenses in this period.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {expRows.map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-surface-300 truncate">{cat}</span>
                    <span className="text-xs font-semibold text-surface-100 ml-2">{formatCurrency(amt)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-700">
                    <div className="h-1.5 rounded-full bg-red-500/70"
                      style={{ width: `${((amt / (totalExp || 1)) * 100).toFixed(1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Staff Sales Tab ──────────────────────────────────────────────────────────

function StaffTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-staff', params],
    queryFn:  () => reportsApi.staff({ from: params.from, to: params.to }),
  });

  const rows = data?.data ?? [];
  const maxRev = rows[0]?.revenue || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs text-surface-500 mb-1">Staff Members</p><p className="text-2xl font-black text-surface-100">{rows.length}</p></div>
        <div className="card p-5"><p className="text-xs text-surface-500 mb-1">Total Sales</p><p className="text-2xl font-black text-surface-100">{rows.reduce((s, r) => s + r.sale_count, 0)}</p></div>
        <div className="card p-5"><p className="text-xs text-surface-500 mb-1">Total Revenue</p><p className="text-2xl font-black text-green-400">{formatCurrency(rows.reduce((s, r) => s + r.revenue, 0))}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-700/50">
          <h2 className="text-sm font-semibold text-surface-200">Sales by Cashier / Staff</h2>
        </div>
        {isLoading ? (
          <div className="p-6"><div className="h-32 bg-surface-700/30 rounded animate-pulse" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">No sales data in this period.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700/40">
                {['Staff Member', 'Sales Count', 'Revenue', 'Collected', '% of Total'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-surface-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className="border-b border-surface-700/20 last:border-0 hover:bg-surface-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: `hsl(${i * 47 + 200} 65% 55%)` }}>
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-surface-100">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-300">{r.sale_count}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-surface-100">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-surface-300">{formatCurrency(r.collected)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-700 max-w-[80px]">
                        <div className="h-1.5 rounded-full bg-primary-500"
                          style={{ width: `${((r.revenue / maxRev) * 100).toFixed(1)}%` }} />
                      </div>
                      <span className="text-xs text-surface-400">{((r.revenue / rows.reduce((s, x) => s + x.revenue, 0)) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── FBR / GST Tax Tab ────────────────────────────────────────────────────────

function FBRTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-fbr-sales', params],
    queryFn:  () => salesApi.list({ from: params.from, to: params.to, limit: 5000 }),
  });

  const sales = data?.data ?? [];

  const totalRevenue   = sales.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const totalTax       = sales.reduce((s, x) => s + parseFloat(x.tax_amount   || 0), 0);
  const taxableSales   = sales.filter(x => parseFloat(x.tax_amount || 0) > 0);
  const exemptSales    = sales.filter(x => !parseFloat(x.tax_amount || 0));
  const taxableRevenue = taxableSales.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const exemptRevenue  = exemptSales.reduce((s, x)  => s + parseFloat(x.total_amount || 0), 0);

  const byMethod = taxableSales.reduce((acc, s) => {
    const m = (s.payment_method || 'cash').replace('_', ' ');
    if (!acc[m]) acc[m] = { count: 0, revenue: 0, tax: 0 };
    acc[m].count++;
    acc[m].revenue += parseFloat(s.total_amount || 0);
    acc[m].tax     += parseFloat(s.tax_amount   || 0);
    return acc;
  }, {});

  function exportFBR() {
    const rows = [
      ['FBR / GST TAX REPORT'],
      ['Period', `${params.from}  →  ${params.to}`],
      ['Generated', new Date().toLocaleString('en-PK')],
      [],
      ['SUMMARY'],
      ['Total Revenue (incl. tax)', totalRevenue],
      ['Total Tax Collected (GST)', totalTax],
      ['Taxable Sales Count', taxableSales.length],
      ['Exempt Sales Count', exemptSales.length],
      ['Taxable Revenue', taxableRevenue],
      ['Exempt Revenue', exemptRevenue],
      [],
      ['TAXABLE TRANSACTIONS'],
      ['Date', 'Reference', 'Customer', 'Total Amount', 'Tax Amount', 'Payment Method'],
      ...taxableSales.map(s => [
        s.sale_date, s.reference, s.customer_name || 'Walk-in',
        s.total_amount, s.tax_amount, s.payment_method,
      ]),
    ];
    const escape = (v) => { const str = String(v ?? ''); return str.includes(',') ? `"${str}"` : str; };
    const csv = rows.map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `fbr-gst-report-${params.from}-to-${params.to}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-400">FBR/GST compliant sales tax summary for filing.</p>
        <button onClick={exportFBR}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
          Export FBR CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',    value: formatCurrency(totalRevenue),   color: 'text-surface-100' },
          { label: 'Tax Collected',    value: formatCurrency(totalTax),        color: 'text-amber-400'   },
          { label: 'Taxable Sales',    value: taxableSales.length + ' sales',  color: 'text-surface-100' },
          { label: 'Exempt Sales',     value: exemptSales.length  + ' sales',  color: 'text-surface-400' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <p className="text-xs text-surface-500 mb-1">{k.label}</p>
            <p className={cn('text-xl font-black', k.color)}>{isLoading ? '—' : k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Tax Summary</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Taxable Revenue',   taxableRevenue, 'text-surface-100'],
              ['Tax Collected',     totalTax,        'text-amber-400'  ],
              ['Exempt Revenue',    exemptRevenue,   'text-surface-400'],
              ['Net of Tax',        taxableRevenue - totalTax, 'text-surface-100'],
            ].map(([l, v, c]) => (
              <div key={l} className="flex justify-between py-2 border-b border-surface-700/30 last:border-0">
                <span className="text-surface-400">{l}</span>
                <span className={cn('font-semibold tabular-nums', c)}>{isLoading ? '…' : formatCurrency(v)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-surface-200 mb-4">Tax by Payment Method</h2>
          {isLoading ? <div className="h-24 bg-surface-700/30 rounded animate-pulse" /> : (
            <div className="space-y-2">
              {Object.entries(byMethod).map(([method, d]) => (
                <div key={method} className="flex items-center justify-between py-2 border-b border-surface-700/20 last:border-0">
                  <span className="text-xs text-surface-300 capitalize">{method}</span>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-surface-100">{formatCurrency(d.revenue)}</p>
                    <p className="text-[10px] text-amber-400">{formatCurrency(d.tax)} tax</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
