import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTip,
} from 'recharts';
import { format, startOfMonth, subDays } from 'date-fns';
import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import Card from '@components/ui/Card';
import SalesOverviewChart from '@components/charts/SalesOverviewChart';
import {
  CurrencyDollarIcon, ShoppingCartIcon, ArchiveBoxIcon,
  ExclamationTriangleIcon, ArrowTrendingUpIcon, ClockIcon,
  ChevronRightIcon, ArrowsRightLeftIcon, ChartPieIcon, PlusIcon,
  CalendarDaysIcon, TrophyIcon, PencilSquareIcon, CheckIcon,
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

// ── Gradient KPI card (works in both light + dark) ────────────────────────────

const KPI_THEMES = {
  green:  {
    grad: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    glow: 'rgba(16,185,129,0.35)',
    icon: 'rgba(255,255,255,0.20)',
  },
  blue:   {
    grad: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    glow: 'rgba(59,130,246,0.35)',
    icon: 'rgba(255,255,255,0.20)',
  },
  violet: {
    grad: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
    glow: 'rgba(139,92,246,0.35)',
    icon: 'rgba(255,255,255,0.20)',
  },
  amber:  {
    grad: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    glow: 'rgba(245,158,11,0.35)',
    icon: 'rgba(255,255,255,0.20)',
  },
  red:    {
    grad: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    glow: 'rgba(239,68,68,0.35)',
    icon: 'rgba(255,255,255,0.20)',
  },
};

function KpiCard({ label, value, sub, badge, trend, icon: Icon, theme = 'blue', loading }) {
  const t = KPI_THEMES[theme] || KPI_THEMES.blue;
  const showTrend = !loading && trend !== null && trend !== undefined && !isNaN(trend);
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-1"
      style={{ background: t.grad, boxShadow: `0 8px 28px ${t.glow}` }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.65)' }}>
            {label}
          </p>
          {loading ? (
            <div className="h-9 w-32 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.20)' }} />
          ) : (
            <p className="text-3xl font-black text-white leading-none tracking-tight truncate">
              {value}
            </p>
          )}
          {!loading && (sub || badge || showTrend) && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {sub && (
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {sub}
                </span>
              )}
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.95)' }}>
                  {badge}
                </span>
              )}
              {showTrend && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: trend >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)',
                    color:      trend >= 0 ? '#6ee7b7'                : '#fca5a5',
                  }}>
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs yesterday
                </span>
              )}
            </div>
          )}
        </div>
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: t.icon }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Quick action ──────────────────────────────────────────────────────────────

function QuickBtn({ to, icon: Icon, label, primary }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-bold transition-all duration-150 hover:-translate-y-0.5',
        primary ? 'text-white' : ''
      )}
      style={primary ? {
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        boxShadow: '0 4px 14px rgba(99,102,241,0.40)',
      } : {
        background: 'transparent',
        border: '1.5px solid rgba(99,102,241,0.30)',
        color: '#6366f1',
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

// ── Payment methods donut ─────────────────────────────────────────────────────

const PM_LABEL = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', credit: 'Credit', online: 'Online', cheque: 'Cheque' };
const PM_COLOR = { cash: '#10b981', card: '#3b82f6', bank_transfer: '#8b5cf6', credit: '#f59e0b', online: '#06b6d4', cheque: '#f97316' };

function PaymentDonut() {
  const { data, isLoading } = useQuery({
    queryKey: ['dash-payment-donut-today'],
    queryFn:  () => reportsApi.paymentMethods({}),   // no params → server uses CURRENT_DATE (UTC)
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const rows      = (data?.data ?? []).filter(r => Number(r.revenue) > 0);
  const total     = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const chartData = rows.map(r => ({
    name:   PM_LABEL[r.payment_method] ?? r.payment_method,
    value:  Number(r.revenue),
    color:  PM_COLOR[r.payment_method] ?? '#6366f1',
    orders: r.sale_count,
  }));

  return (
    <Card className="h-full flex flex-col">
      <Card.Header className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-violet shrink-0">
          <ChartPieIcon className="h-3.5 w-3.5" />
        </div>
        <div>
          <Card.Title>Payment Methods</Card.Title>
          <p className="text-[10px] text-surface-400 mt-0.5">Today's breakdown</p>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col items-center gap-4 flex-1">
        {isLoading ? (
          <div className="h-40 w-40 rounded-full skeleton" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-surface-400">
            <ChartPieIcon className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-xs font-semibold">No sales today</p>
          </div>
        ) : (
          <>
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={68}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9px] text-surface-400 font-bold uppercase tracking-wide">Total</p>
                <p className="text-sm font-black text-surface-100 leading-tight">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="w-full space-y-2">
              {chartData.map((d, i) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-surface-300 flex-1 truncate font-medium">{d.name}</span>
                    <span className="text-xs font-black text-surface-100">{pct}%</span>
                    <span className="text-[10px] text-surface-500">{formatCurrency(d.value)}</span>
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

// ── Top products ──────────────────────────────────────────────────────────────

function TopProductsCard({ products, loading }) {
  if (!loading && (!products || products.length === 0)) return null;
  const max = Math.max(...(products ?? []).map(p => Number(p.revenue ?? 0)), 1);
  const RANK = ['#f59e0b', '#94a3b8', '#cd7c2c', '#6366f1', '#64748b'];

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-green shrink-0">
            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <Card.Title>Top Products</Card.Title>
            <p className="text-[10px] text-surface-400 mt-0.5">This month by revenue</p>
          </div>
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
      <Card.Content className="space-y-4">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-10 skeleton rounded-lg" />)
        ) : (
          products.slice(0, 5).map((p, i) => {
            const rev = Number(p.revenue ?? 0);
            const pct = Math.max(6, Math.round((rev / max) * 100));
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-black w-4 text-center shrink-0" style={{ color: RANK[i] || '#475569' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-surface-200 truncate pr-2">{p.name}</p>
                    <p className="text-xs font-black shrink-0" style={{ color: '#34d399' }}>
                      {formatCurrency(rev)}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.10)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${pct}%`,
                      background: i === 0
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      transition: 'width 0.8s ease-out',
                    }} />
                  </div>
                  <p className="text-[10px] text-surface-500 mt-1">
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

// ── Recent sales ──────────────────────────────────────────────────────────────

function RecentSales({ sales, loading }) {
  return (
    <Card className="h-full">
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-blue shrink-0">
            <ShoppingCartIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <Card.Title>Recent Sales</Card.Title>
            <p className="text-[10px] text-surface-400 mt-0.5">Latest transactions</p>
          </div>
        </div>
        <Link to="/sales"
          className="flex items-center gap-0.5 text-xs font-semibold"
          style={{ color: '#818cf8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
        >
          View all <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Card.Header>
      <Card.Content className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-surface-400">
            <ShoppingCartIcon className="h-9 w-9 mb-2 opacity-20" />
            <p className="text-sm font-semibold">No sales yet today</p>
            <p className="text-xs mt-1 opacity-60">Complete a sale in POS</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/30">
            {sales.slice(0, 8).map(s => (
              <Link key={s.id} to={`/sales/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition-colors">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.12))' }}>
                  <ShoppingCartIcon className="h-4 w-4" style={{ color: '#93c5fd' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-surface-100 truncate">
                    {s.invoice_no || s.reference}
                  </p>
                  <p className="text-[10px] text-surface-500 mt-0.5 truncate">
                    {s.customer_name || 'Walk-in'} · {formatDate(s.created_at || s.sale_date)}
                  </p>
                </div>
                <p className="text-sm font-black shrink-0 ml-2" style={{ color: '#34d399' }}>
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

// ── Stock alerts ──────────────────────────────────────────────────────────────

function StockAlerts({ lowStock, loading }) {
  const outOfStock = (lowStock ?? []).filter(p => Number(p.stock_quantity) <= 0);
  const lowItems   = (lowStock ?? []).filter(p => Number(p.stock_quantity) >  0);
  const allGood    = outOfStock.length === 0 && lowItems.length === 0;

  return (
    <Card className="h-full">
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-amber shrink-0">
            <ArchiveBoxIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <Card.Title>Stock Alerts</Card.Title>
            <p className="text-[10px] text-surface-400 mt-0.5">Items needing attention</p>
          </div>
        </div>
        <Link to="/products"
          className="flex items-center gap-0.5 text-xs font-semibold"
          style={{ color: '#818cf8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
        >
          View <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 skeleton rounded-xl" />)}
          </div>
        ) : allGood ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-bold text-emerald-500">All stock levels OK</p>
            <p className="text-xs text-surface-400 mt-1">No items need restocking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary badges */}
            {outOfStock.length > 0 && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#ef4444' }}>Out of Stock</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">Needs immediate restock</p>
                </div>
                <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{outOfStock.length}</p>
              </div>
            )}
            {lowItems.length > 0 && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>Low Stock</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">Running low</p>
                </div>
                <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>{lowItems.length}</p>
              </div>
            )}
            {/* Product list */}
            <div className="divide-y divide-surface-700/30 mt-1">
              {(lowStock ?? []).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <p className="text-xs font-medium text-surface-200 truncate flex-1 pr-2">{p.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={Number(p.stock_quantity) <= 0
                      ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
                      : { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
                    }>
                    {Number(p.stock_quantity) <= 0 ? 'Out' : `${p.stock_quantity} left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Daily Goal Tracker ────────────────────────────────────────────────────────

function GoalTracker({ todaySales, loading }) {
  const [goal, setGoal] = useState(() => {
    try { return Number(localStorage.getItem('pbc:daily-goal') || '50000'); }
    catch { return 50000; }
  });
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState('');

  const pct = goal > 0 ? Math.min(100, Math.round((todaySales / goal) * 100)) : 0;
  const R = 46;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  const achieved = pct >= 100;

  const ringColor = achieved ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444';

  function save() {
    const val = Number(String(draft).replace(/,/g, ''));
    if (val > 0) {
      setGoal(val);
      try { localStorage.setItem('pbc:daily-goal', String(val)); } catch {}
    }
    setEditing(false);
  }

  return (
    <Card className="h-full flex flex-col">
      <Card.Header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center icon-grad-amber shrink-0">
            <TrophyIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <Card.Title>Daily Goal</Card.Title>
            <p className="text-[10px] text-surface-400 mt-0.5">Today's revenue target</p>
          </div>
        </div>
        <button
          onClick={() => { setDraft(String(goal)); setEditing(e => !e); }}
          className="h-6 w-6 rounded-md flex items-center justify-center text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </button>
      </Card.Header>

      <Card.Content className="flex flex-col items-center gap-4 flex-1">
        {loading ? (
          <div className="h-[120px] w-[120px] rounded-full skeleton" />
        ) : (
          <>
            {/* Progress ring */}
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Track */}
                <circle cx="60" cy="60" r={R} fill="none"
                  stroke="rgba(99,102,241,0.10)" strokeWidth="12" />
                {/* Progress */}
                <circle cx="60" cy="60" r={R} fill="none"
                  stroke={ringColor} strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.4s ease' }}
                />
              </svg>
              {/* Centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black leading-none" style={{ color: ringColor }}>{pct}%</p>
                <p className="text-[9px] text-surface-500 font-bold uppercase tracking-wide mt-0.5">done</p>
              </div>
            </div>

            {/* Stats */}
            <div className="w-full text-center">
              <p className="text-sm font-black text-surface-100">{formatCurrency(todaySales)}</p>
              <p className="text-xs text-surface-500 mt-0.5">of {formatCurrency(goal)} target</p>
              {achieved && (
                <p className="text-xs font-bold mt-2" style={{ color: '#34d399' }}>🎯 Goal achieved!</p>
              )}
              {!achieved && todaySales > 0 && (
                <p className="text-xs text-surface-500 mt-2">
                  {formatCurrency(goal - todaySales)} remaining
                </p>
              )}
            </div>
          </>
        )}

        {/* Inline edit */}
        {editing && (
          <div className="w-full flex gap-2">
            <input
              type="number"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              className="flex-1 h-8 px-3 text-xs rounded-lg bg-surface-800 border border-surface-600 text-surface-100 outline-none focus:border-primary-500"
              placeholder="Set daily target…"
            />
            <button onClick={save}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
              <CheckIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, []);

  const today      = todayStr();
  const yesterday  = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const monthFrom  = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  /* ── Queries (all preserved) ── */
  const { data: todayRes,    isLoading: loadingToday  } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn:  salesApi.today,
    refetchInterval: 60_000,
  });
  const { data: dashRes,     isLoading: loadingDash   } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  reportsApi.dashboard,
    refetchInterval: 60_000,
  });
  const { data: lowStockRes, isLoading: loadingLow    } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn:  productsApi.lowStock,
  });
  const { data: recentRes,   isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboard-recent-sales'],
    queryFn:  () => salesApi.list({ page: 1, limit: 8 }),
    refetchInterval: 60_000,
  });
  const { data: monthRes, isLoading: loadingMonth } = useQuery({
    queryKey: ['dashboard-month-kpi', monthFrom, today],
    queryFn:  () => reportsApi.overview({ from: monthFrom, to: today }),
    staleTime: 60_000,
  });
  const { data: yestRes } = useQuery({
    queryKey: ['dashboard-yesterday-kpi', yesterday],
    queryFn:  () => reportsApi.overview({ from: yesterday, to: yesterday }),
    staleTime: 5 * 60_000,
  });

  const t        = todayRes?.data;
  const dash     = dashRes?.data;
  const lowStock = lowStockRes?.data ?? [];
  const recent   = recentRes?.data   ?? [];

  const todaySales  = dash?.today_sales      ?? t?.total_revenue ?? 0;
  const todayOrders = dash?.today_orders     ?? t?.sale_count    ?? 0;
  const todayProfit = dash?.today_profit     ?? 0;
  const pendingPay  = dash?.pending_payments ?? t?.total_due     ?? 0;
  const lowStockCnt = dash?.low_stock_count  ?? lowStock.length;
  const topProducts = dash?.top_products     ?? [];
  const recentSales = dash?.recent_sales     ?? recent;

  const loading      = loadingToday && loadingDash;
  const profitMargin = todaySales > 0 ? Math.round((todayProfit / todaySales) * 100) : 0;
  const avgOrder     = todayOrders > 0 ? (todaySales / todayOrders) : 0;

  const yKpi         = yestRes?.data?.sales ?? {};
  const yRevenue     = Number(yKpi.revenue    ?? 0);
  const yOrders      = Number(yKpi.sale_count ?? 0);

  function trendPct(curr, prev) {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const revenueTrend = trendPct(todaySales,  yRevenue);
  const ordersTrend  = trendPct(todayOrders, yOrders);
  const profitTrend  = trendPct(todayProfit, Number(yKpi.profit ?? 0));

  const monthKpi     = monthRes?.data?.sales ?? {};
  const monthRevenue = Number(monthKpi.revenue    ?? 0);
  const monthOrders  = Number(monthKpi.sale_count ?? 0);
  const monthAvg     = monthOrders > 0 ? monthRevenue / monthOrders : 0;
  const monthName    = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-surface-100 tracking-tight leading-none">
            {getGreeting()}, <span className="gradient-text">{firstName}</span> 👋
          </h2>
          <p className="text-xs text-surface-500 mt-1.5 flex items-center gap-1.5 font-medium">
            <ClockIcon className="h-3.5 w-3.5" /> {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickBtn to="/pos"           icon={CurrencyDollarIcon}  label="New Sale"     primary />
          <QuickBtn to="/products/new"  icon={PlusIcon}            label="Add Product"  />
          <QuickBtn to="/purchases/new" icon={ArrowsRightLeftIcon} label="New Purchase" />
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(todaySales)}
          sub={todayOrders > 0 ? `${todayOrders} orders today` : 'No orders yet'}
          badge={avgOrder > 0 ? `Avg ${formatCurrency(avgOrder)}` : undefined}
          trend={revenueTrend}
          icon={CurrencyDollarIcon}
          theme="green"
          loading={loading}
        />
        <KpiCard
          label="Today's Profit"
          value={formatCurrency(todayProfit)}
          sub={pendingPay > 0 ? `${formatCurrency(pendingPay)} pending` : 'Fully collected'}
          badge={todaySales > 0 ? `${profitMargin}% margin` : undefined}
          trend={profitTrend}
          icon={ArrowTrendingUpIcon}
          theme="blue"
          loading={loading}
        />
        <KpiCard
          label="Today's Orders"
          value={todayOrders}
          sub={t?.total_paid > 0 ? `${formatCurrency(t.total_paid)} collected` : 'No payments yet'}
          trend={ordersTrend}
          icon={ShoppingCartIcon}
          theme="violet"
          loading={loadingToday}
        />
        <KpiCard
          label="Low Stock Items"
          value={loadingLow ? '—' : lowStockCnt}
          sub={lowStockCnt > 0
            ? `${lowStock.filter(p => p.stock_quantity <= 0).length} out of stock`
            : 'All levels OK'}
          badge={lowStockCnt > 0 ? 'Needs restock' : undefined}
          icon={ExclamationTriangleIcon}
          theme={lowStockCnt > 0 ? 'amber' : 'green'}
          loading={loadingLow && loadingDash}
        />
      </div>

      {/* ── Month-to-date strip ── */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 rounded-2xl"
        style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.14)',
        }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <CalendarDaysIcon className="h-4 w-4 text-primary-400" />
          <span className="text-xs font-bold text-surface-300">{monthName} — Month to Date</span>
        </div>
        <div className="hidden sm:block w-px h-5 bg-surface-700" />
        {[
          { label: 'Revenue',   value: formatCurrency(monthRevenue),         color: '#34d399' },
          { label: 'Orders',    value: monthOrders.toLocaleString(),          color: '#60a5fa' },
          { label: 'Avg Order', value: formatCurrency(monthAvg),             color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-4">
            <div>
              <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">{label}</p>
              {loadingMonth ? (
                <div className="h-5 w-20 skeleton rounded mt-1" />
              ) : (
                <p className="text-sm font-black mt-0.5" style={{ color }}>{value}</p>
              )}
            </div>
          </div>
        ))}
        <div className="ml-auto hidden lg:block text-[10px] text-surface-500 font-medium">
          {monthFrom} → {today}
        </div>
      </div>

      {/* ── Sales Overview (full width) ── */}
      <SalesOverviewChart />

      {/* ── Row: Top Products + Payment Donut + Goal Tracker ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <TopProductsCard products={topProducts} loading={loadingDash && topProducts.length === 0} />
        </div>
        <PaymentDonut />
        <GoalTracker todaySales={todaySales} loading={loading} />
      </div>

      {/* ── Row: Recent Sales + Stock Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentSales sales={recentSales} loading={loadingRecent} />
        </div>
        <StockAlerts lowStock={lowStock} loading={loadingLow} />
      </div>

    </div>
  );
}
