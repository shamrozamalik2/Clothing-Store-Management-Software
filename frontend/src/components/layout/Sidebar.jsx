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
  ShieldCheckIcon,
  CubeIcon,
  BriefcaseIcon,
  BookOpenIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { selectSidebarCollapsed, toggleSidebar } from '@store/slices/uiSlice';
import { selectCurrentUser } from '@store/slices/authSlice';
import { settingsApi } from '@api/settings.api';
import { cn } from '@utils/cn';

/* ─── Navigation structure ─────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    items: [
      { label: 'Dashboard',    path: '/dashboard',       icon: HomeIcon,                  permission: 'dashboard' },
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
    label: 'Operations',
    items: [
      { label: 'Manufacturing',path: '/manufacturing',   icon: CubeIcon,                      permission: 'manufacturing' },
      { label: 'HR & Payroll', path: '/hr',              icon: BriefcaseIcon,                 permission: 'hr' },
      { label: 'Ledger',       path: '/ledger',          icon: BookOpenIcon,                  permission: 'ledger' },
      { label: 'Audit Trail',  path: '/audit',           icon: DocumentMagnifyingGlassIcon,   permission: 'roles_admin' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users',        path: '/users',           icon: UsersIcon,        permission: 'users' },
      { label: 'Settings',     path: '/settings',        icon: Cog6ToothIcon,    permission: 'settings' },
      { label: 'Roles',        path: '/roles',           icon: ShieldCheckIcon,  permission: 'roles_admin' },
    ],
  },
];

/* ─── PBC mark (for collapsed state) ────────────────────────────────────── */
function PBCMark({ size = 32 }) {
  return (
    <img
      src="/newlogo.png"
      alt="ProBusinessCloud"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
    />
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
  const companyTagline = settingsRes?.data?.company?.company_tagline?.value || 'Business Platform';
  const companyLogo    = settingsRes?.data?.company?.company_logo?.value    || '';

  function hasAccess(permission) {
    if (currentUser?.role === 'admin') return true;
    if (permission === 'roles_admin') return false;  // admin-only sentinel
    const perm = permissions[permission];
    if (!perm) return false;
    if (perm === true) return true;
    if (typeof perm === 'object') return Object.values(perm).some(Boolean);
    return false;
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full shrink-0 overflow-hidden',
        'border-r shadow-sidebar',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
      style={{ backgroundColor: '#0c1427', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* ── Animated gradient glow blobs ── */}
      <div className="sidebar-blob-1" />
      <div className="sidebar-blob-2" />
      <div className="sidebar-blob-3" />

      {/* ── Brand area ── */}
      <div className={cn(
        'relative z-10 flex items-center h-16 border-b shrink-0',
        'border-white/6',
        collapsed ? 'justify-center px-0' : 'px-4 gap-3'
      )}>
        {collapsed ? (
          companyLogo ? (
            <img src={companyLogo} alt={companyName}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(255,255,255,0.15)' }} />
          ) : (
            <PBCMark size={30} />
          )
        ) : (
          <div className="flex items-center justify-center w-full">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(255,255,255,0.15)' }} />
            ) : (
              <div className="rounded-xl overflow-hidden flex items-center justify-center select-none"
                style={{ padding: '5px 14px' }}>
                <img src="/newlogo.png" alt="ProBusinessCloud"
                  style={{ height: 36, width: 'auto', maxWidth: 160, objectFit: 'contain', display: 'block' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => hasAccess(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {/* Section label */}
              {group.label && !collapsed && (
                <p
                  className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] select-none"
                  style={{ color: '#4a5a7a' }}
                >
                  {group.label}
                </p>
              )}
              {/* Collapsed divider */}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
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
          'absolute right-[1rem] top-[81px] z-20',
          'h-6 w-6 rounded-full',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110'
        )}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f, #2a2a6e)',
          border: '1px solid rgba(139,92,246,0.30)',
          boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
          color: '#a5b4fc',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRightIcon className="h-3 w-3" />
          : <ChevronLeftIcon  className="h-3 w-3" />
        }
      </button>

      {/* ── Version footer ── */}
      {!collapsed && (
        <div className="relative z-10 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] select-none" style={{ color: '#2d3f5e' }}>ProBusinessCloud v2.0</p>
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
      end={item.path === '/dashboard'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg',
          'transition-all duration-200 select-none text-sm font-medium group',
          collapsed ? 'h-10 justify-center px-0' : 'h-9 px-3',
          isActive
            ? 'nav-gradient-active'
            : 'border border-transparent hover:bg-white/[0.06]'
        )
      }
      style={({ isActive }) =>
        isActive
          ? undefined
          : undefined
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'shrink-0 transition-colors duration-200',
              collapsed ? 'h-5 w-5' : 'h-4.5 w-4.5',
            )}
            style={{
              color: isActive ? '#93c5fd' : '#4a5a7a',
            }}
          />
          {!collapsed && (
            <span
              className="truncate transition-colors duration-200"
              style={{ color: isActive ? '#c4b5fd' : '#6b7faa' }}
            >
              {item.label}
            </span>
          )}
          {/* Active dot when collapsed */}
          {collapsed && isActive && (
            <span
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)' }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}