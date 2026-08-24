import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import Card from '@components/ui/Card';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { salesApi }    from '@api/sales.api';
import { productsApi } from '@api/products.api';
import { reportsApi }  from '@api/reports.api';
import { formatCurrency, formatDate } from '@utils/format';
import { cn } from '@utils/cn';
import SalesOverviewChart from '@components/charts/SalesOverviewChart';

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, subVariant = 'neutral', icon: Icon, accent, loading }) {
  const accents = {
    blue:   { iconClass: 'icon-grad-blue',   borderStyle: { borderLeftColor: '#3b82f6' } },
    green:  { iconClass: 'icon-grad-green',  borderStyle: { borderLeftColor: '#10b981' } },
    violet: { iconClass: 'icon-grad-violet', borderStyle: { borderLeftColor: '#8b5cf6' } },
    amber:  { iconClass: 'icon-grad-amber',  borderStyle: { borderLeftColor: '#f59e0b' } },
  };
  const a = accents[accent] || accents.blue;

  const subColors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger:  'text-red-500',
    neutral: 'text-surface-400',
  };

  return (
    <Card
      className="overflow-hidden border-l-4"
      style={{ ...a.borderStyle }}
    >
      <Card.Content className="flex items-start gap-4 py-5">
        <div className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
          a.iconClass
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-7 w-28 skeleton mt-1.5 rounded" />
          ) : (
            <p className="text-2xl font-black text-surface-100 mt-1 leading-none tracking-tight">{value}</p>
          )}
          {sub && !loading && (
            <p className={cn('text-xs mt-1.5 font-medium', subColors[subVariant])}>
              {sub}
            </p>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

/* ─── Trend bar (weekly sparkline) with gradient ─────────────────────────── */
function WeeklyBar({ data }) {
  if (!data?.length) return null;
  const max  = Math.max(...data.map(d => d.amount), 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex items-end gap-1.5 h-12">
      {days.map((day, i) => {
        const found = data.find(d => d.day?.toLowerCase().startsWith(day.toLowerCase()));
        const h     = found ? Math.max(4, Math.round((found.amount / max) * 48)) : 4;
        const isEmpty = !found || found.amount === 0;
        return (
          <div key={day} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full cursor-default rounded-sm transition-all duration-200"
              style={{
                height:     h,
                background: isEmpty
                  ? 'rgba(99,102,241,0.12)'
                  : 'linear-gradient(to top, rgba(59,130,246,0.65), rgba(139,92,246,0.75))',
                borderRadius: '3px 3px 0 0',
              }}
              title={found ? formatCurrency(found.amount) : `${day}: no data`}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, []);

  const today      = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  /* ── Data fetching ── */
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
    queryFn:  () => salesApi.list({ page: 1, limit: 6 }),
    refetchInterval: 60_000,
  });

  const t        = todayRes?.data;
  const dash     = dashRes?.data;
  const lowStock = lowStockRes?.data ?? [];
  const recent   = recentRes?.data ?? [];

  const todaySales  = dash?.today_sales     ?? t?.total_revenue  ?? 0;
  const todayOrders = dash?.today_orders    ?? t?.sale_count     ?? 0;
  const todayProfit = dash?.today_profit    ?? 0;
  const pendingPay  = dash?.pending_payments ?? t?.total_due     ?? 0;
  const lowStockCnt = dash?.low_stock_count ?? lowStock.length;
  const weeklySales = dash?.weekly_sales    ?? [];
  const topProducts = dash?.top_products    ?? [];
  const recentSales = dash?.recent_sales    ?? recent;

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const loading   = loadingToday && loadingDash;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-surface-100 tracking-tight">
            Good {getGreeting()},{' '}
            <span className="gradient-text">{firstName}</span>
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5" />
            {todayLabel}
          </p>
        </div>
        <Link
          to="/pos"
          className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-lg btn-gradient text-white text-sm font-semibold"
        >
          <CurrencyDollarIcon className="h-4 w-4" />
          Open POS
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(todaySales)}
          sub={todayOrders > 0 ? `${todayOrders} order${todayOrders !== 1 ? 's' : ''} today` : 'No orders yet'}
          subVariant={todayOrders > 0 ? 'success' : 'neutral'}
          icon={CurrencyDollarIcon}
          accent="green"
          loading={loading}
        />
        <KpiCard
          label="Today's Profit"
          value={formatCurrency(todayProfit)}
          sub={pendingPay > 0 ? `${formatCurrency(pendingPay)} pending` : 'All collected'}
          subVariant={pendingPay > 0 ? 'warning' : 'success'}
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
          sub={lowStockCnt > 0 ? 'Needs restocking' : 'Stock levels OK'}
          subVariant={lowStockCnt > 0 ? 'warning' : 'success'}
          icon={ExclamationTriangleIcon}
          accent="amber"
          loading={loadingLow && loadingDash}
        />
      </div>

      {/* ── Sales Overview chart ── */}
      <SalesOverviewChart />

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Sales — spans 2 cols */}
        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Recent Sales</Card.Title>
            <Link
              to="/sales"
              className="flex items-center gap-0.5 text-xs font-medium transition-colors"
              style={{ color: '#818cf8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
              onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
            >
              View all <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </Card.Header>
          <Card.Content className="p-0">
            {loadingRecent ? (
              <div className="p-5 space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-11 skeleton rounded-lg" />)}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                <ShoppingCartIcon className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No sales recorded yet</p>
                <p className="text-xs mt-1 opacity-70">Complete a sale in POS to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-700/50">
                {recentSales.slice(0, 6).map(s => (
                  <Link
                    key={s.id}
                    to={`/sales/${s.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.12))' }}
                      >
                        <ShoppingCartIcon className="h-3.5 w-3.5" style={{ color: '#93c5fd' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-surface-100 truncate">
                          {s.invoice_no || s.reference}
                        </p>
                        <p className="text-xs text-surface-400 truncate">
                          {s.customer_name || 'Walk-in'} · {formatDate(s.created_at || s.sale_date)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold shrink-0 ml-4" style={{ color: '#34d399' }}>
                      {formatCurrency(s.total_amount)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Right column */}
        <div className="space-y-4">

          {/* Weekly trend */}
          <Card>
            <Card.Header>
              <Card.Title>Weekly Sales</Card.Title>
            </Card.Header>
            <Card.Content className="pt-2">
              {loadingDash ? (
                <div className="h-12 skeleton rounded" />
              ) : (
                <WeeklyBar data={weeklySales} />
              )}
              {!loadingDash && weeklySales.length === 0 && (
                <p className="text-xs text-surface-400 text-center py-3">No data for this week</p>
              )}
              <div className="flex justify-between mt-2">
                {['M','T','W','T','F','S','S'].map((d,i) => (
                  <span key={i} className="text-[9px] text-surface-500 w-full text-center">{d}</span>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Low stock alert */}
          <Card>
            <Card.Header className="flex items-center justify-between">
              <Card.Title>Low Stock</Card.Title>
              <Link
                to="/products"
                className="flex items-center gap-0.5 text-xs font-medium transition-colors"
                style={{ color: '#818cf8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
              >
                View all <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            </Card.Header>
            <Card.Content className="p-0">
              {loadingLow ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-9 skeleton rounded" />)}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-surface-400">
                  <ArchiveBoxIcon className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">All stock OK</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-700/50">
                  {lowStock.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-surface-100 truncate">{p.name}</p>
                        <p className="text-[10px] text-surface-400 truncate">{p.sku}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                        style={p.stock_quantity <= 0
                          ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                          : { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
                        }
                      >
                        {p.stock_quantity <= 0 ? 'Out' : `${p.stock_quantity} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* ── Top products ── */}
      {topProducts.length > 0 && (
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Top Products This Month</Card.Title>
            <Link
              to="/reports"
              className="flex items-center gap-0.5 text-xs font-medium transition-colors"
              style={{ color: '#818cf8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
              onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
            >
              Full report <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </Card.Header>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Product</th>
                  <th className="text-right">Units Sold</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="text-surface-400 font-mono text-xs">{i + 1}</td>
                    <td className="font-medium text-surface-100">{p.name}</td>
                    <td className="text-right text-surface-300">{p.total_qty?.toLocaleString()}</td>
                    <td className="text-right font-semibold" style={{ color: '#34d399' }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}