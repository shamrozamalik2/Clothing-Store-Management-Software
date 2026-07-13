import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import Card from '@components/ui/Card';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user     = useSelector(selectCurrentUser);

  useEffect(() => { dispatch(setPageTitle('Dashboard')); }, []);

  const stats = [
    { label: "Today's Sales",   value: '₨ 0',  icon: CurrencyDollarIcon, color: 'text-green-400',  bg: 'bg-green-900/30 border-green-800/50' },
    { label: "Today's Orders",  value: '0',    icon: ShoppingCartIcon,   color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-800/50' },
    { label: 'Total Products',  value: '0',    icon: ArchiveBoxIcon,     color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800/50' },
    { label: 'Low Stock Items', value: '0',    icon: ExclamationTriangleIcon, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800/50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
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
        {stats.map((stat) => (
          <Card key={stat.label} className={`border ${stat.bg}`}>
            <Card.Content className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl bg-surface-800 flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-surface-400">{stat.label}</p>
                <p className="text-2xl font-bold text-surface-100 mt-0.5">{stat.value}</p>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Placeholder charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <Card.Header>
            <Card.Title>Sales Overview</Card.Title>
          </Card.Header>
          <Card.Content className="flex items-center justify-center h-48 text-surface-600 text-sm">
            Chart will appear here once sales are recorded.
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Top Selling Products</Card.Title>
          </Card.Header>
          <Card.Content className="flex items-center justify-center h-48 text-surface-600 text-sm">
            No sales data yet.
          </Card.Content>
        </Card>
      </div>

      {/* Recent Sales placeholder */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Sales</Card.Title>
        </Card.Header>
        <Card.Content className="flex items-center justify-center h-24 text-surface-600 text-sm">
          No recent sales to display.
        </Card.Content>
      </Card>
    </div>
  );
}
