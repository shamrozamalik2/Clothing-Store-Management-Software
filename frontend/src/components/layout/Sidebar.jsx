import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
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
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import { selectSidebarCollapsed, toggleSidebar } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import { settingsApi } from '@api/settings.api';
import { cn } from '@utils/cn';

/* ─── Navigation structure ─────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    items: [
      { label: 'Dashboard',    path: '/',                icon: HomeIcon,                  permission: 'dashboard' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products',     path: '/products',        icon: ShoppingBagIcon,           permission: 'products' },
      { label: 'Categories',   path: '/categories',      icon: TagIcon,                   permission: 'categories' },
      { label: 'Brands',       path: '/brands',          icon: BuildingStorefrontIcon,    permission: 'brands' },
      { label: 'Stock Adjust', path: '/inventory/adjust',icon: ArchiveBoxIcon,            permission: 'inventory' },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { label: 'POS / Billing',path: '/pos',             icon: CurrencyDollarIcon,        permission: 'pos' },
      { label: 'Sales',        path: '/sales',           icon: ShoppingCartIcon,          permission: 'sales' },
      { label: 'Purchases',    path: '/purchases',       icon: ArrowsRightLeftIcon,       permission: 'purchases' },
      { label: 'Expenses',     path: '/expenses',        icon: ClipboardDocumentListIcon, permission: 'expenses' },
      { label: 'Returns',      path: '/returns',         icon: ReceiptRefundIcon,         permission: 'sales' },
    ],
  },
  {
    label: 'Contacts',
    items: [
      { label: 'Customers',    path: '/customers',       icon: UserGroupIcon,             permission: 'customers' },
      { label: 'Suppliers',    path: '/suppliers',       icon: TruckIcon,                 permission: 'suppliers' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Reports',      path: '/reports',         icon: ChartBarIcon,              permission: 'reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users',        path: '/users',           icon: UsersIcon,                 permission: 'users' },
      { label: 'Settings',     path: '/settings',        icon: Cog6ToothIcon,             permission: 'settings' },
    ],
  },
];

/* ─── Logo / Brand mark ─────────────────────────────────────────────────── */
function PBCMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer C arc */}
      <path
        d="M36 20C36 28.837 28.837 36 20 36C11.163 36 4 28.837 4 20C4 11.163 11.163 4 20 4C24.418 4 28.418 5.791 31.314 8.686"
        stroke="#60a5fa"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner C arc */}
      <path
        d="M29 20C29 25.523 24.523 30 19 30C13.477 30 9 25.523 9 20C9 14.477 13.477 10 19 10C21.761 10 24.261 11.119 26.071 12.929"
        stroke="#3b82f6"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* P glyph */}
      <rect x="12" y="14" width="1.8" height="12" rx="0.9" fill="white"/>
      <path d="M13.8 14H17.2C18.746 14 20 15.254 20 16.8V16.8C20 18.346 18.746 19.6 17.2 19.6H13.8V14Z" fill="white"/>
      {/* B glyph */}
      <rect x="21.5" y="14" width="1.8" height="12" rx="0.9" fill="white"/>
      <path d="M23.3 14H26.2C27.526 14 28.6 15.074 28.6 16.4V16.4C28.6 17.726 27.526 18.8 26.2 18.8H23.3V14Z" fill="white"/>
      <path d="M23.3 18.8H26.5C27.936 18.8 29.1 19.964 29.1 21.4V21.4C29.1 22.836 27.936 24 26.5 24H23.3V18.8Z" fill="white"/>
    </svg>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const dispatch    = useDispatch();
  const collapsed   = useSelector(selectSidebarCollapsed);
  const currentUser = useSelector(selectCurrentUser);
  const permissions = currentUser?.permissions || {};

  const { data: settingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
  const companyName    = settingsRes?.data?.company?.company_name?.value    || 'ProBusinessCloud';
  const companyTagline = settingsRes?.data?.company?.company_tagline?.value || 'Management System';

  function hasAccess(permission) {
    if (currentUser?.role === 'admin') return true;
    if (permission === 'dashboard' || permission === 'pos') return permissions[permission] === true;
    return !!permissions[permission];
  }

  return (
    <aside
      className={cn(
        // Always dark navy, regardless of app theme
        'relative flex flex-col h-full shrink-0',
        'bg-[#0c1427] border-r border-white/5',
        'transition-all duration-300 ease-in-out',
        'shadow-sidebar',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* ── Brand area ── */}
      <div className={cn(
        'flex items-center h-16 border-b border-white/5 shrink-0',
        collapsed ? 'justify-center px-0' : 'px-4 gap-3'
      )}>
        <div className="shrink-0">
          <PBCMark />
        </div>
        {!collapsed && (
          <div className="min-w-0 select-none">
            <p className="text-sm font-bold text-white leading-tight truncate tracking-tight">
              {companyName}
            </p>
            <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">{companyTagline}</p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
        {NAV_GROUPS.map((group, gi) => {
          // Filter items by permission
          const visibleItems = group.items.filter(item => hasAccess(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {/* Section label (only when expanded and label exists) */}
              {group.label && !collapsed && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                  {group.label}
                </p>
              )}
              {/* Collapsed divider */}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t border-white/10" />
              )}

              <div className="px-2 space-y-0.5">
                {visibleItems.map(item => (
                  <NavItem key={item.path} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className={cn(
          'absolute -right-3 top-[68px] z-20',
          'h-6 w-6 rounded-full',
          'bg-[#1e3a5f] border border-[#2d5a8f]',
          'flex items-center justify-center',
          'hover:bg-[#2a4f82] transition-all duration-150',
          'text-slate-300 hover:text-white shadow-md'
        )}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRightIcon className="h-3 w-3" />
          : <ChevronLeftIcon  className="h-3 w-3" />
        }
      </button>

      {/* ── Version footer ── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[10px] text-slate-600 select-none">ProBusinessCloud v2.0</p>
        </div>
      )}
    </aside>
  );
}

/* ─── Individual nav item ────────────────────────────────────────────────── */
function NavItem({ item, collapsed }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg transition-all duration-150 select-none',
          'text-sm font-medium group',
          collapsed ? 'h-10 justify-center px-0' : 'h-9 px-3',
          isActive
            ? [
                'bg-primary-600/15 text-primary-300',
                'border border-primary-500/20',
              ]
            : [
                'text-slate-400 border border-transparent',
                'hover:text-white hover:bg-white/5',
              ]
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn(
            'h-4.5 w-4.5 shrink-0 transition-colors',
            isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
          )} />
          {!collapsed && (
            <span className="truncate">{item.label}</span>
          )}
          {/* Active dot indicator when collapsed */}
          {collapsed && isActive && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary-400" />
          )}
        </>
      )}
    </NavLink>
  );
}