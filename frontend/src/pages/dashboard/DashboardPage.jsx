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

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, subVariant = 'neutral', icon: Icon, accent, loading }) {
  const accents = {
    blue:   { icon: 'bg-blue-500/10 text-blue-600',   border: 'border-l-4 border-l-blue-500' },
    green:  { icon: 'bg-emerald-500/10 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
    violet: { icon: 'bg-violet-500/10 text-violet-600', border: 'border-l-4 border-l-violet-500' },
    amber:  { icon: 'bg-amber-500/10 text-amber-600', border: 'border-l-4 border-l-amber-500' },
  };
  const a = accents[accent] || accents.blue;
  const subColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger:  'text-red-500',
    neutral: 'text-surface-400',
  };

  return (
    <Card className={cn('overflow-hidden', a.border)}>
      <Card.Content className="flex items-start gap-4 py-5">
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', a.icon)}>
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

/* ─── Trend bar (weekly sparkline) ───────────────────────────────────────── */
function WeeklyBar({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.amount), 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex items-end gap-1.5 h-12">
      {days.map((day, i) => {
        const found = data.find(d => d.day?.toLowerCase().startsWith(day.toLowerCase()));
        const h = found ? Math.max(4, Math.round((found.amount / max) * 48)) : 4;
        return (
          <div key={day} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t-sm bg-primary-500/60 hover:bg-primary-500 transition-colors cursor-default"
              style={{ height: h }}
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

  const today = new Date().toISOString().slice(0, 10);
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

  /* Use dashboard endpoint when available, fall back to today endpoint */
  const todaySales   = dash?.today_sales     ?? t?.total_revenue  ?? 0;
  const todayOrders  = dash?.today_orders    ?? t?.sale_count     ?? 0;
  const todayProfit  = dash?.today_profit    ?? 0;
  const pendingPay   = dash?.pending_payments ?? t?.total_due     ?? 0;
  const lowStockCnt  = dash?.low_stock_count ?? lowStock.length;
  const weeklySales  = dash?.weekly_sales    ?? [];
  const topProducts  = dash?.top_products    ?? [];
  const recentSales  = dash?.recent_sales    ?? recent;

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const loading   = loadingToday && loadingDash;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-surface-100 tracking-tight">
            Good {getGreeting()}, {firstName}
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5" />
            {todayLabel}
          </p>
        </div>
        <Link
          to="/pos"
          className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors shadow-glow-sm"
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

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Sales — spans 2 cols */}
        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Recent Sales</Card.Title>
            <Link to="/sales" className="flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors">
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
                      <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                        <ShoppingCartIcon className="h-3.5 w-3.5 text-primary-600" />
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
                    <p className="text-sm font-bold text-emerald-600 shrink-0 ml-4">
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
              <Link to="/products" className="flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors">
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
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2',
                        p.stock_quantity <= 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      )}>
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

      {/* ── Top products (if data available from dashboard endpoint) ── */}
      {topProducts.length > 0 && (
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Top Products This Month</Card.Title>
            <Link to="/reports" className="flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors">
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
                    <td className="text-right font-semibold text-emerald-600">{formatCurrency(p.revenue)}</td>
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