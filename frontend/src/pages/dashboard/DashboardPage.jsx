import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import Card from '@components/ui/Card';
import {
  CurrencyDollarIcon, ShoppingCartIcon,
  ArchiveBoxIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { salesApi }    from '@api/sales.api';
import { productsApi } from '@api/products.api';
import { reportsApi }  from '@api/reports.api';
import { formatCurrency } from '@utils/format';

function KpiCard({ label, value, sub, icon: Icon, color, bg, loading }) {
  return (
    <Card className={`border ${bg}`}>
      <Card.Content className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-surface-400">{label}</p>
          {loading
            ? <div className="h-7 w-20 bg-surface-700 animate-pulse rounded mt-1" />
            : <p className="text-2xl font-bold text-surface-100 mt-0.5">{value}</p>
          }
          {sub && !loading && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
        </div>
      </Card.Content>
    </Card>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, []);

  const { data: todayRes, isLoading: loadingToday } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn:  () => salesApi.today(),
    refetchInterval: 60_000,
  });

  const { data: lowStockRes, isLoading: loadingLow } = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn:  () => productsApi.lowStock(),
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: ovRes, isLoading: loadingOv } = useQuery({
    queryKey: ['dashboard-overview', today],
    queryFn:  () => reportsApi.overview({ from: today, to: today }),
  });

  const { data: recentRes, isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboard-recent-sales'],
    queryFn:  () => salesApi.list({ page: 1, limit: 5 }),
    refetchInterval: 60_000,
  });

  const t        = todayRes?.data;
  const lowStock = lowStockRes?.data ?? [];
  const ov       = ovRes?.data;
  const recent   = recentRes?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-surface-100">
          Hey, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Here's what's happening at your store today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(t?.total_revenue ?? 0)}
          sub={`${formatCurrency(t?.total_paid ?? 0)} collected`}
          icon={CurrencyDollarIcon}
          color="text-green-400"
          bg="bg-green-900/30 border-green-800/50"
          loading={loadingToday}
        />
        <KpiCard
          label="Today's Orders"
          value={t?.sale_count ?? 0}
          sub={t?.total_due > 0 ? `${formatCurrency(t.total_due)} due` : 'All collected'}
          icon={ShoppingCartIcon}
          color="text-blue-400"
          bg="bg-blue-900/30 border-blue-800/50"
          loading={loadingToday}
        />
        <KpiCard
          label="Total Products"
          value={ov?.stock?.total_products ?? 0}
          sub={`${ov?.stock?.out_of_stock ?? 0} out of stock`}
          icon={ArchiveBoxIcon}
          color="text-purple-400"
          bg="bg-purple-900/30 border-purple-800/50"
          loading={loadingOv}
        />
        <KpiCard
          label="Low Stock Items"
          value={lowStock.length}
          sub={lowStock.length > 0 ? 'Needs restocking' : 'Stock levels OK'}
          icon={ExclamationTriangleIcon}
          color="text-amber-400"
          bg="bg-amber-900/30 border-amber-800/50"
          loading={loadingLow}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Recent Sales</Card.Title>
            <Link to="/sales" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </Card.Header>
          <Card.Content className="p-0">
            {loadingRecent ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-700 animate-pulse rounded" />)}
              </div>
            ) : recent.length === 0 ? (
              <p className="p-4 text-sm text-surface-500 text-center">No sales recorded yet.</p>
            ) : (
              <div className="divide-y divide-surface-800">
                {recent.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-surface-200">{s.reference}</p>
                      <p className="text-xs text-surface-500">{s.customer_name || 'Walk-in'}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-400">{formatCurrency(s.total_amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Low Stock */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Low Stock Alert</Card.Title>
            <Link to="/products" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </Card.Header>
          <Card.Content className="p-0">
            {loadingLow ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-700 animate-pulse rounded" />)}
              </div>
            ) : lowStock.length === 0 ? (
              <p className="p-4 text-sm text-surface-500 text-center">All stock levels are healthy.</p>
            ) : (
              <div className="divide-y divide-surface-800">
                {lowStock.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-surface-200">{p.name}</p>
                      <p className="text-xs text-surface-500">{p.sku}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.stock_quantity <= 0
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-amber-900/40 text-amber-400'
                    }`}>
                      {p.stock_quantity <= 0 ? 'Out of stock' : `${p.stock_quantity} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
