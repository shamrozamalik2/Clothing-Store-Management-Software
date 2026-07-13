import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ChartBarIcon, ShoppingBagIcon, CubeIcon,
  TruckIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  UserGroupIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { subDays, subMonths, format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

import { reportsApi } from '@api/reports.api';
import { formatCurrency, formatNumber } from '@utils/format';
import { cn } from '@utils/cn';
import Badge from '@components/common/Badge';

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

const TABS = ['Overview', 'Sales', 'Inventory', 'Purchases'];

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab]   = useState('Overview');
  const [preset, setPreset]         = useState('This Month');
  const [from, setFrom]             = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo]                 = useState(() => today());

  const params = { from, to };

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-100">Reports & Analytics</h1>
          <p className="text-sm text-surface-400 mt-0.5">Business performance insights across all operations.</p>
        </div>

        {/* Date range controls */}
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-1.5">
            <input type="date" value={from} onChange={e => handleCustomDate('from', e.target.value)}
              max={to}
              className="h-8 px-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            <span className="text-surface-500 text-xs">to</span>
            <input type="date" value={to} onChange={e => handleCustomDate('to', e.target.value)}
              min={from}
              className="h-8 px-2 rounded-lg bg-surface-700 border border-surface-600 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
        </div>
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
      {activeTab === 'Overview'   && <OverviewTab   params={params} />}
      {activeTab === 'Sales'      && <SalesTab       params={params} />}
      {activeTab === 'Inventory'  && <InventoryTab   />}
      {activeTab === 'Purchases'  && <PurchasesTab   params={params} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ params }) {
  const { data: ov, isLoading: loadingOv } = useQuery({
    queryKey: ['reports-overview', params],
    queryFn:  () => reportsApi.overview(params),
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
  const dailyData  = ds?.data ?? [];
  const pmData     = pm?.data ?? [];
  const topProds   = tp?.data ?? [];
  const topCusts   = tc?.data ?? [];

  const chartData = useMemo(() =>
    dailyData.map(d => ({
      day:       format(new Date(d.day + 'T00:00:00'), 'dd MMM'),
      Revenue:   parseFloat(d.revenue)   || 0,
      Collected: parseFloat(d.collected) || 0,
    })), [dailyData]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={formatCurrency(o?.sales?.revenue)} icon={<ArrowTrendingUpIcon className="h-5 w-5" />} color="primary" loading={loadingOv} />
        <KpiCard label="Gross Profit" value={formatCurrency(o?.gross_profit)} sub={`${(o?.profit_margin ?? 0).toFixed(1)}% margin`} icon={<ChartBarIcon className="h-5 w-5" />} color="green" loading={loadingOv} />
        <KpiCard label="Orders" value={formatNumber(o?.sales?.sale_count)} sub={`Avg ${formatCurrency(o?.sales?.avg_order_value)}`} icon={<ShoppingBagIcon className="h-5 w-5" />} color="cyan" loading={loadingOv} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
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
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
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
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
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
  const { data, isLoading } = useQuery({
    queryKey: ['reports-purchases', params],
    queryFn:  () => reportsApi.purchasesSummary(params),
  });

  const d           = data?.data;
  const totals      = d?.totals;
  const bySupplier  = d?.bySupplier ?? [];

  const chartData = useMemo(() =>
    (d?.daily ?? []).map(row => ({
      day:    format(new Date(row.day + 'T00:00:00'), 'dd MMM'),
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
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
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

function KpiCard({ label, value, sub, icon, color = 'neutral', loading, unit }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.neutral;
  return (
    <div className="card p-4 flex items-start gap-3">
      {icon && (
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-surface-500 mb-0.5">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-surface-700 rounded animate-pulse" />
        ) : (
          <p className={cn('text-lg font-bold leading-tight', c.text)}>
            {value}
            {unit && <span className="text-sm font-normal text-surface-400 ml-1">{unit}</span>}
          </p>
        )}
        {sub && !loading && <p className="text-2xs text-surface-500 mt-0.5">{sub}</p>}
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
