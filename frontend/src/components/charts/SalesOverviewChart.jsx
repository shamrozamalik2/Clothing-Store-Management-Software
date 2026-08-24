import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  format, subDays, startOfMonth, startOfYear,
  parseISO, differenceInDays,
} from 'date-fns';
import { reportsApi }    from '@api/reports.api';
import { usePermission } from '@hooks/usePermission';
import { formatCurrency } from '@utils/format';
import Card from '@components/ui/Card';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function buildRange(period, customFrom, customTo) {
  const t = new Date();
  switch (period) {
    case 'today':  return { from: todayStr(), to: todayStr() };
    case '7d':     return { from: format(subDays(t, 6),  'yyyy-MM-dd'), to: todayStr() };
    case '30d':    return { from: format(subDays(t, 29), 'yyyy-MM-dd'), to: todayStr() };
    case 'month':  return { from: format(startOfMonth(t), 'yyyy-MM-dd'), to: todayStr() };
    case 'year':   return { from: format(startOfYear(t),  'yyyy-MM-dd'), to: todayStr() };
    case 'custom': return { from: customFrom || todayStr(), to: customTo || todayStr() };
    default:       return { from: format(subDays(t, 6),  'yyyy-MM-dd'), to: todayStr() };
  }
}

function yFmt(v) {
  if (v >= 1_000_000) return `₨${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `₨${Math.round(v / 1_000)}K`;
  return `₨${v}`;
}

function xFmt(dateStr, numDays) {
  try {
    const d = parseISO(dateStr);
    if (numDays <= 1)  return 'Today';
    if (numDays <= 7)  return format(d, 'EEE');       // Mon
    if (numDays <= 31) return format(d, 'MMM d');     // Aug 18
    return format(d, 'MMM');                           // Aug
  } catch {
    return dateStr;
  }
}

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: '7d',    label: '7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'year',  label: 'This Year' },
  { id: 'custom',label: 'Custom' },
];

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, numDays }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  let dateLabel = d?.day ?? '';
  try {
    dateLabel = format(
      parseISO(d.day),
      numDays <= 7 ? 'EEEE, MMM d' : 'MMM d, yyyy'
    );
  } catch { /* keep raw */ }

  return (
    <div
      className="rounded-xl border border-surface-600 shadow-xl px-4 py-3 text-sm"
      style={{ background: 'rgba(10, 15, 30, 0.96)', backdropFilter: 'blur(10px)' }}
    >
      <p className="text-surface-400 text-xs mb-2 font-semibold">{dateLabel}</p>
      <p className="font-black" style={{ color: '#34d399', fontSize: '1rem' }}>
        {formatCurrency(d?.revenue ?? 0)}
      </p>
      <p className="text-surface-400 text-xs mt-1">
        {(d?.sale_count ?? 0).toLocaleString()} order{d?.sale_count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ── Mini stat card ────────────────────────────────────────────────────────────

function KpiStat({ label, value, icon: Icon, color, loading }) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest truncate">
          {label}
        </p>
      </div>
      {loading ? (
        <div className="h-5 w-24 skeleton rounded" />
      ) : (
        <p className="text-sm font-black text-surface-100 leading-tight truncate">{value}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SalesOverviewChart() {
  const { can }     = usePermission();
  const canView     = can('reports', 'view');

  const [period,     setPeriod]     = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const { from, to } = buildRange(period, customFrom, customTo);

  const numDays = useMemo(() => {
    try { return differenceInDays(parseISO(to), parseISO(from)) + 1; }
    catch { return 7; }
  }, [from, to]);

  const rangeValid   = period !== 'custom' || (!!customFrom && !!customTo);
  const queryEnabled = canView && rangeValid;

  const {
    data: overviewRes,
    isLoading: loadingKpi,
    isError: errorKpi,
  } = useQuery({
    queryKey: ['sales-overview-kpi', from, to],
    queryFn:  () => reportsApi.overview({ from, to }),
    staleTime: 60_000,
    enabled:   queryEnabled,
  });

  const {
    data: seriesRes,
    isLoading: loadingSeries,
    isError: errorSeries,
  } = useQuery({
    queryKey: ['sales-overview-series', from, to],
    queryFn:  () => reportsApi.dailySales({ from, to }),
    staleTime: 60_000,
    enabled:   queryEnabled,
  });

  // Don't render the section at all if no permission
  if (!canView) return null;

  const loading  = loadingKpi || loadingSeries;
  const hasError = errorKpi   || errorSeries;

  const kpi = overviewRes?.data?.sales ?? {};
  const totalSales  = Number(kpi.revenue         ?? 0);
  const totalOrders = Number(kpi.sale_count       ?? 0);
  const avgSale     = Number(kpi.avg_order_value  ?? 0);

  const chartData = (seriesRes?.data ?? []).map(d => ({
    day:        d.day,
    revenue:    Number(d.revenue    ?? 0),
    sale_count: Number(d.sale_count ?? 0),
  }));

  const hasData = chartData.length > 0 && chartData.some(d => d.revenue > 0);

  return (
    <Card>

      {/* ── Header ── */}
      <Card.Header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 icon-grad-blue">
            <ChartBarIcon className="h-4 w-4" />
          </div>
          <Card.Title>Sales Overview</Card.Title>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
              style={period === p.id ? {
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#64748b',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card.Header>

      <Card.Content>

        {/* ── Custom date range ── */}
        {period === 'custom' && (
          <div
            className="flex flex-wrap items-center gap-3 mb-5 px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-center gap-2">
              <label className="text-xs text-surface-400 font-semibold shrink-0">From</label>
              <input
                type="date"
                value={customFrom}
                max={customTo || todayStr()}
                onChange={e => setCustomFrom(e.target.value)}
                className="h-8 px-2 rounded-lg text-xs text-surface-100 border border-surface-600 bg-surface-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-surface-400 font-semibold shrink-0">To</label>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={todayStr()}
                onChange={e => setCustomTo(e.target.value)}
                className="h-8 px-2 rounded-lg text-xs text-surface-100 border border-surface-600 bg-surface-800"
              />
            </div>
            {(!customFrom || !customTo) && (
              <p className="text-xs text-surface-500 italic">Select both dates to load data.</p>
            )}
          </div>
        )}

        {/* ── KPI summary row ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <KpiStat
            label="Total Sales"
            value={formatCurrency(totalSales)}
            icon={CurrencyDollarIcon}
            color="#34d399"
            loading={loading}
          />
          <KpiStat
            label="Orders"
            value={totalOrders.toLocaleString()}
            icon={ShoppingCartIcon}
            color="#60a5fa"
            loading={loading}
          />
          <KpiStat
            label="Avg Sale"
            value={formatCurrency(avgSale)}
            icon={ArrowTrendingUpIcon}
            color="#a78bfa"
            loading={loading}
          />
        </div>

        {/* ── Chart ── */}
        {loading ? (
          <div className="h-64 skeleton rounded-xl" />
        ) : hasError ? (
          <EmptyState
            icon={ChartBarIcon}
            title="Failed to load chart data"
            sub="Check your connection and try again"
            danger
          />
        ) : !hasData ? (
          <EmptyState
            icon={ChartBarIcon}
            title="No sales in this period"
            sub="Complete a sale in POS to see it here"
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pbc-sales-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.40} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tickFormatter={v => xFmt(v, numDays)}
                  tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                  interval="preserveStartEnd"
                />

                <YAxis
                  tickFormatter={yFmt}
                  tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-2}
                  width={64}
                />

                <Tooltip
                  content={props => <ChartTooltip {...props} numDays={numDays} />}
                  cursor={{ stroke: 'rgba(99,102,241,0.25)', strokeWidth: 1.5 }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#pbc-sales-grad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#60a5fa',
                    stroke: '#1d4ed8',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

// ── Empty / error state ───────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub, danger }) {
  return (
    <div
      className="h-64 flex flex-col items-center justify-center text-surface-400 rounded-xl"
      style={{ border: `1px dashed ${danger ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}` }}
    >
      <Icon className="h-9 w-9 mb-2.5 opacity-25" />
      <p className="text-sm font-semibold">{title}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}
