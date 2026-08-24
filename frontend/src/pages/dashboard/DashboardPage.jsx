import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTip,
} from 'recharts';
import { format } from 'date-fns';
import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import Card from '@components/ui/Card';
import SalesOverviewChart from '@components/charts/SalesOverviewChart';
import {
  CurrencyDollarIcon, ShoppingCartIcon, ArchiveBoxIcon,
  ExclamationTriangleIcon, ArrowTrendingUpIcon, ClockIcon,
  ChevronRightIcon, ArrowsRightLeftIcon,
  PlusIcon, ArrowUpIcon, ArrowDownIcon,
  ChartPieIcon, BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { salesApi }    from '@api/sales.api';
import { productsApi } from '@api/products.api';
import { reportsApi }  from '@api/reports.api';
import { formatCurrency, formatDate } from '@utils/format';
import { cn } from '@utils/cn';

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Animated number counter ───────────────────────────────────────────────────

function useCountUp(target, duration = 900) {
  const ref   = useRef(0);
  const frame = useRef(null);
  // We abuse a ref to drive a forceUpdate via useEffect
  // Simple approach: return integer for display, animate in the ref effect
  return target; // skip animation for now — handle via CSS transform instead
}

// ── Premium KPI card ──────────────────────────────────────────────────────────

const ACCENT = {
  green:  { border: '#10b981', icon: 'icon-grad-green',  badge: 'rgba(16,185,129,0.12)',  badgeText: '#34d399' },
  blue:   { border: '#3b82f6', icon: 'icon-grad-blue',   badge: 'rgba(59,130,246,0.12)',  badgeText: '#60a5fa' },
  violet: { border: '#8b5cf6', icon: 'icon-grad-violet', badge: 'rgba(139,92,246,0.12)', badgeText: '#a78bfa' },
  amber:  { border: '#f59e0b', icon: 'icon-grad-amber',  badge: 'rgba(245,158,11,0.12)', badgeText: '#fbbf24' },
  red:    { border: '#ef4444', icon: 'icon-grad-amber',  badge: 'rgba(239,68,68,0.12)',  badgeText: '#f87171' },
};

function KpiCard({ label, value, sub, badge, icon: Icon, accent = 'blue', loading, trend }) {
  const a = ACCENT[accent] || ACCENT.blue;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-l-[3px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        borderLeftColor:   a.border,
        background:        'rgb(var(--card))',
        border:            `1px solid rgba(255,255,255,0.06)`,
        borderLeft:        `3px solid ${a.border}`,
        boxShadow:         '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {/* Subtle glow in top-right */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
        style={{ background: a.border, filter: 'blur(30px)', transform: 'translate(30%, -30%)' }}
      />

      <div className="flex items-start gap-4 p-5">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', a.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mb-1">{label}</p>
          {loading ? (
            <div className="h-8 w-36 skeleton rounded-lg" />
          ) : (
            <p className="text-2xl font-black text-surface-100 leading-none tracking-tight truncate">
              {value}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!loading && sub && (
              <span className="text-xs text-surface-400 font-medium">{sub}</span>
            )}
            {!loading && badge && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: a.badge, color: a.badgeText }}
              >
                {badge}
              </span>
            )}
            {!loading && trend !== undefined && trend !== null && (
              <span
                className={cn('flex items-center gap-0.5 text-[10px] font-bold')}
                style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}
              >
                {trend >= 0
                  ? <ArrowUpIcon className="h-3 w-3" />
                  : <ArrowDownIcon className="h-3 w-3" />}
                {Math.abs(trend)}% vs yesterday
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment methods donut ─────────────────────────────────────────────────────

const PM_LABEL  = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', credit: 'Credit', online: 'Online', cheque: 'Cheque' };
const PM_COLOR  = { cash: '#10b981', card: '#3b82f6', bank_transfer: '#8b5cf6', credit: '#f59e0b', online: '#06b6d4', cheque: '#f97316' };
const PM_DEFAULT = '#6366f1';

function PaymentDonut({ from, to }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-payment-methods', from, to],
    queryFn:  () => reportsApi.paymentMethods({ from, to }),
    staleTime: 60_000,
  });

  const rows = (data?.data ?? []).filter(r => Number(r.revenue) > 0);
  const total = rows.reduce((s, r) => s + Number(r.revenue), 0);

  const chartData = rows.map(r => ({
    name:    PM_LABEL[r.payment_method] ?? r.payment_method,
    value:   Number(r.revenue),
    color:   PM_COLOR[r.payment_method] ?? PM_DEFAULT,
    orders:  r.sale_count,
    raw:     r.payment_method,
  }));

  return (
    <Card className="h-full">
      <Card.Header className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-violet shrink-0">
          <ChartPieIcon className="h-3.5 w-3.5" />
        </div>
        <Card.Title>Payment Methods</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col items-center gap-4">
        {isLoading ? (
          <div className="h-44 w-44 skeleton rounded-full" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-surface-400">
            <ChartPieIcon className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-xs font-medium">No sales today</p>
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-surface-600 px-3 py-2 text-xs shadow-xl"
                          style={{ background: 'rgba(10,15,30,0.96)' }}>
                          <p className="font-bold text-surface-100">{d.name}</p>
                          <p style={{ color: d.color }}>{formatCurrency(d.value)}</p>
                          <p className="text-surface-400">{d.orders} orders</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-surface-500 font-semibold uppercase tracking-wide">Total</p>
                <p className="text-sm font-black text-surface-100 leading-tight">{formatCurrency(total)}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-2">
              {chartData.map((d, i) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-surface-300 flex-1 truncate font-medium">{d.name}</span>
                    <span className="text-xs font-bold text-surface-100">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Recent sales feed ─────────────────────────────────────────────────────────

function RecentSalesFeed({ sales, loading }) {
  return (
    <Card className="h-full">
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-blue shrink-0">
            <ShoppingCartIcon className="h-3.5 w-3.5" />
          </div>
          <Card.Title>Recent Sales</Card.Title>
        </div>
        <Link to="/sales"
          className="flex items-center gap-0.5 text-xs font-semibold transition-colors"
          style={{ color: '#818cf8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
        >
          All sales <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Card.Header>
      <Card.Content className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-surface-400">
            <ShoppingCartIcon className="h-9 w-9 mb-2 opacity-20" />
            <p className="text-sm font-medium">No sales yet</p>
            <p className="text-xs mt-1 opacity-60">Complete a sale in POS</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/40">
            {sales.slice(0, 8).map(s => (
              <Link key={s.id} to={`/sales/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/40 transition-colors group">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.12))' }}>
                  <ShoppingCartIcon className="h-4 w-4" style={{ color: '#93c5fd' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-surface-100 truncate">
                    {s.invoice_no || s.reference}
                  </p>
                  <p className="text-[10px] text-surface-500 truncate mt-0.5">
                    {s.customer_name || 'Walk-in'} · {formatDate(s.created_at || s.sale_date)}
                  </p>
                </div>
                <p className="text-sm font-black shrink-0" style={{ color: '#34d399' }}>
                  {formatCurrency(s.total_amount)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Stock health card ─────────────────────────────────────────────────────────

function StockHealthCard({ lowStock, loading }) {
  const outOfStock = (lowStock ?? []).filter(p => Number(p.stock_quantity) <= 0);
  const lowItems   = (lowStock ?? []).filter(p => Number(p.stock_quantity) > 0);

  const bars = [
    { label: 'Out of Stock', count: outOfStock.length, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    { label: 'Low Stock',    count: lowItems.length,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-amber shrink-0">
            <ArchiveBoxIcon className="h-3.5 w-3.5" />
          </div>
          <Card.Title>Stock Alerts</Card.Title>
        </div>
        <Link to="/products"
          className="flex items-center gap-0.5 text-xs font-semibold transition-colors"
          style={{ color: '#818cf8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
        >
          View <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : outOfStock.length === 0 && lowItems.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-surface-400">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-xs font-semibold text-emerald-400">All stock levels OK</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bars.filter(b => b.count > 0).map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: b.bg }}>
                <p className="text-xs font-semibold" style={{ color: b.color }}>{b.label}</p>
                <p className="text-sm font-black" style={{ color: b.color }}>{b.count}</p>
              </div>
            ))}
            {lowStock.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between px-1 py-1">
                <p className="text-xs text-surface-300 truncate flex-1">{p.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0"
                  style={Number(p.stock_quantity) <= 0
                    ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                    : { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
                  }
                >
                  {Number(p.stock_quantity) <= 0 ? 'Out' : `${p.stock_quantity} left`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Top products ──────────────────────────────────────────────────────────────

function TopProductsCard({ products, loading }) {
  if (!loading && (!products || products.length === 0)) return null;
  const max = Math.max(...(products ?? []).map(p => Number(p.revenue ?? p.total_revenue ?? 0)), 1);

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-green shrink-0">
            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
          </div>
          <Card.Title>Top Products This Month</Card.Title>
        </div>
        <Link to="/reports"
          className="flex items-center gap-0.5 text-xs font-semibold transition-colors"
          style={{ color: '#818cf8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
        >
          Full report <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Card.Header>
      <Card.Content className="space-y-2.5">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-10 skeleton rounded-lg" />)
        ) : (
          products.slice(0, 5).map((p, i) => {
            const rev = Number(p.revenue ?? p.total_revenue ?? 0);
            const pct = Math.max(4, Math.round((rev / max) * 100));
            const RANK_COLORS = ['#f59e0b','#94a3b8','#92400e','#6366f1','#64748b'];
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-black w-5 text-center shrink-0"
                  style={{ color: RANK_COLORS[i] || '#475569' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-surface-200 truncate">{p.name}</p>
                    <p className="text-xs font-black ml-2 shrink-0" style={{ color: '#34d399' }}>
                      {formatCurrency(rev)}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: i === 0
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    {Number(p.total_qty ?? 0).toLocaleString()} units sold
                  </p>
                </div>
              </div>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label, primary }) {
  return (
    <Link to={to}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-bold transition-all duration-150',
        primary
          ? 'text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
          : 'border text-surface-300 hover:text-surface-100 hover:-translate-y-0.5'
      )}
      style={primary ? {
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        boxShadow: '0 4px 14px rgba(99,102,241,0.40)',
      } : {
        borderColor: 'rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, []);

  const today      = todayStr();
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  /* ── Queries (all existing, nothing removed) ── */
  const { data: todayRes,    isLoading: loadingToday   } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn:  salesApi.today,
    refetchInterval: 60_000,
  });
  const { data: dashRes,     isLoading: loadingDash    } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  reportsApi.dashboard,
    refetchInterval: 60_000,
  });
  const { data: lowStockRes, isLoading: loadingLow     } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn:  productsApi.lowStock,
  });
  const { data: recentRes,   isLoading: loadingRecent  } = useQuery({
    queryKey: ['dashboard-recent-sales'],
    queryFn:  () => salesApi.list({ page: 1, limit: 8 }),
    refetchInterval: 60_000,
  });

  const t        = todayRes?.data;
  const dash     = dashRes?.data;
  const lowStock = lowStockRes?.data ?? [];
  const recent   = recentRes?.data   ?? [];

  const todaySales  = dash?.today_sales     ?? t?.total_revenue  ?? 0;
  const todayOrders = dash?.today_orders    ?? t?.sale_count     ?? 0;
  const todayProfit = dash?.today_profit    ?? 0;
  const pendingPay  = dash?.pending_payments ?? t?.total_due     ?? 0;
  const lowStockCnt = dash?.low_stock_count ?? lowStock.length;
  const topProducts = dash?.top_products    ?? [];
  const recentSales = dash?.recent_sales    ?? recent;

  const loading   = loadingToday && loadingDash;

  // Margin % for today
  const profitMargin = todaySales > 0
    ? Math.round((todayProfit / todaySales) * 100)
    : 0;

  // Avg order value
  const avgOrder = todayOrders > 0
    ? (todaySales / todayOrders)
    : 0;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-surface-100 tracking-tight leading-none">
            {getGreeting()},{' '}
            <span className="gradient-text">{firstName} 👋</span>
          </h2>
          <p className="text-xs text-surface-500 mt-1.5 flex items-center gap-1.5 font-medium">
            <ClockIcon className="h-3.5 w-3.5" />
            {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickAction to="/pos"           icon={CurrencyDollarIcon}  label="New Sale"      primary />
          <QuickAction to="/products/new"  icon={PlusIcon}            label="Add Product"   />
          <QuickAction to="/purchases/new" icon={ArrowsRightLeftIcon} label="New Purchase"  />
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(todaySales)}
          sub={todayOrders > 0 ? `${todayOrders} orders` : 'No orders yet'}
          badge={todayOrders > 0 ? `Avg ${formatCurrency(avgOrder)}` : undefined}
          icon={CurrencyDollarIcon}
          accent="green"
          loading={loading}
        />
        <KpiCard
          label="Today's Profit"
          value={formatCurrency(todayProfit)}
          sub={pendingPay > 0 ? `${formatCurrency(pendingPay)} pending` : 'Fully collected'}
          badge={todaySales > 0 ? `${profitMargin}% margin` : undefined}
          icon={ArrowTrendingUpIcon}
          accent="blue"
          loading={loading}
        />
        <KpiCard
          label="Today's Orders"
          value={todayOrders}
          sub={t?.total_paid > 0 ? `${formatCurrency(t.total_paid)} collected` : undefined}
          icon={ShoppingCartIcon}
          accent="violet"
          loading={loadingToday}
        />
        <KpiCard
          label="Low Stock Items"
          value={loadingLow ? '—' : lowStockCnt}
          sub={lowStockCnt > 0 ? `${lowStock.filter(p => p.stock_quantity <= 0).length} out of stock` : 'All levels OK'}
          badge={lowStockCnt > 0 ? 'Needs attention' : undefined}
          icon={ExclamationTriangleIcon}
          accent={lowStockCnt > 5 ? 'red' : 'amber'}
          loading={loadingLow && loadingDash}
        />
      </div>

      {/* ── Sales Overview (full width) ── */}
      <SalesOverviewChart />

      {/* ── Middle row: Recent Sales + Payment Donut + Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent sales — 2 cols */}
        <div className="lg:col-span-2">
          <RecentSalesFeed sales={recentSales} loading={loadingRecent} />
        </div>

        {/* Right col: donut + stock */}
        <div className="space-y-4">
          <PaymentDonut from={today} to={today} />
          <StockHealthCard lowStock={lowStock} loading={loadingLow} />
        </div>
      </div>

      {/* ── Top products (conditional) ── */}
      <TopProductsCard
        products={topProducts}
        loading={loadingDash && topProducts.length === 0}
      />

    </div>
  );
}
