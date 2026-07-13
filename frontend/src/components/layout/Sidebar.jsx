import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { selectSidebarCollapsed, toggleSidebar } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import { cn } from '@utils/cn';

const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/',                icon: HomeIcon,                    permission: 'dashboard' },
  { type: 'divider', label: 'Inventory' },
  { label: 'Products',     path: '/products',         icon: ShoppingBagIcon,             permission: 'products' },
  { label: 'Categories',   path: '/categories',       icon: TagIcon,                     permission: 'categories' },
  { label: 'Brands',       path: '/brands',           icon: BuildingStorefrontIcon,      permission: 'brands' },
  { label: 'Stock Adjust', path: '/inventory/adjust', icon: ArchiveBoxIcon,              permission: 'inventory' },
  { type: 'divider', label: 'Transactions' },
  { label: 'POS / Billing',path: '/pos',              icon: CurrencyDollarIcon,          permission: 'pos' },
  { label: 'Sales',        path: '/sales',            icon: ShoppingCartIcon,            permission: 'sales' },
  { label: 'Purchases',    path: '/purchases',        icon: ArrowsRightLeftIcon,         permission: 'purchases' },
  { label: 'Expenses',     path: '/expenses',         icon: ClipboardDocumentListIcon,   permission: 'expenses' },
  { type: 'divider', label: 'Contacts' },
  { label: 'Customers',    path: '/customers',        icon: UserGroupIcon,               permission: 'customers' },
  { label: 'Suppliers',    path: '/suppliers',        icon: TruckIcon,                   permission: 'suppliers' },
  { type: 'divider', label: 'Reports' },
  { label: 'Reports',      path: '/reports',          icon: ChartBarIcon,                permission: 'reports' },
  { type: 'divider', label: 'System' },
  { label: 'Users',        path: '/users',            icon: UsersIcon,                   permission: 'users' },
  { label: 'Settings',     path: '/settings',         icon: Cog6ToothIcon,               permission: 'settings' },
];

export default function Sidebar() {
  const dispatch    = useDispatch();
  const collapsed   = useSelector(selectSidebarCollapsed);
  const currentUser = useSelector(selectCurrentUser);
  const permissions = currentUser?.permissions || {};

  function hasAccess(permission) {
    if (currentUser?.role === 'admin') return true;
    if (permission === 'dashboard' || permission === 'pos') return permissions[permission] === true;
    return !!permissions[permission];
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-surface-900 border-r border-surface-700',
        'transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-surface-700 shrink-0',
        collapsed ? 'justify-center px-0' : 'px-5 gap-3'
      )}>
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">SG</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-surface-100 leading-tight">SAS Garments</p>
            <p className="text-2xs text-surface-500">Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'divider') {
            return collapsed ? (
              <div key={idx} className="my-1 mx-3 border-t border-surface-700/50" />
            ) : (
              <p key={idx} className="px-4 pt-4 pb-1 text-2xs font-semibold uppercase tracking-widest text-surface-600">
                {item.label}
              </p>
            );
          }

          if (!hasAccess(item.permission)) return null;

          return (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className={cn(
          'absolute -right-3 top-16 z-10',
          'h-6 w-6 rounded-full bg-surface-700 border border-surface-600',
          'flex items-center justify-center',
          'hover:bg-surface-600 transition-colors',
          'text-surface-400 hover:text-surface-200'
        )}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRightIcon className="h-3 w-3" />
          : <ChevronLeftIcon className="h-3 w-3" />
        }
      </button>
    </aside>
  );
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-150',
          'text-sm font-medium',
          collapsed ? 'h-10 justify-center px-0' : 'h-9 px-3',
          isActive
            ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
            : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
