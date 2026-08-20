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
import { selectSidebarCollapsed, selectTheme, toggleSidebar } from '@store/slices/uiSlice';
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
  const isDark      = useSelector(selectTheme) === 'dark';

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
      style={{
        backgroundColor: isDark ? '#0c1427' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      }}
    >
      {/* ── Animated gradient glow blobs (dark mode only) ── */}
      {isDark && <div className="sidebar-blob-1" />}
      {isDark && <div className="sidebar-blob-2" />}
      {isDark && <div className="sidebar-blob-3" />}

      {/* ── Brand area ── */}
      <div
        className={cn('relative z-10 flex flex-col items-center justify-center border-b shrink-0', collapsed ? 'h-[72px]' : 'h-[95px] gap-1.5')}
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}
      >
        {collapsed ? (
          companyLogo ? (
            <img src={companyLogo} alt={companyName}
              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid #743dab2e' }} />
          ) : (
            <PBCMark size={30} />
          )
        ) : (
          <>
            {companyLogo ? (
              <img src={companyLogo} alt={companyName}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid #743dab2e' }} />
            ) : (
              <div style={{ background: 'white', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #743dab2e', overflow: 'hidden', flexShrink: 0 }}>
                <img src="/newlogo.png" alt="ProBusinessCloud"
                  style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} />
              </div>
            )}
            <p className="text-xs font-semibold select-none truncate max-w-[180px]"
              style={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#475569', letterSpacing: '0.01em' }}>
              {companyName}
            </p>
          </>
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
                  style={{ color: isDark ? '#4a5a7a' : '#94a3b8' }}
                >
                  {group.label}
                </p>
              )}
              {/* Collapsed divider */}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }} />
              )}

              <div className="px-2 space-y-0.5">
                {visibleItems.map(item => (
                  <NavItem key={item.path} item={item} collapsed={collapsed} isDark={isDark} />
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
          'absolute z-20',
          collapsed ? 'right-[0rem] top-[93px]' : 'right-[1rem] top-[112px]',
          'h-6 w-6 rounded-full',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:scale-110'
        )}
        style={isDark ? {
          background: 'linear-gradient(135deg, #1e3a5f, #2a2a6e)',
          border: '1px solid rgba(139,92,246,0.30)',
          boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
          color: '#a5b4fc',
        } : {
          background: '#ffffff',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          color: '#6366f1',
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
        <div className="relative z-10 px-4 py-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}>
          <p className="text-[10px] select-none" style={{ color: isDark ? '#2d3f5e' : '#94a3b8' }}>ProBusinessCloud v2.0</p>
        </div>
      )}
    </aside>
  );
}

/* ─── Individual nav item ────────────────────────────────────────────────── */
function NavItem({ item, collapsed, isDark }) {
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
            ? (isDark ? 'nav-gradient-active' : 'nav-light-active')
            : (isDark ? 'border border-transparent hover:bg-white/[0.06]' : 'border border-transparent hover:bg-black/[0.04]')
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('shrink-0 transition-colors duration-200', collapsed ? 'h-5 w-5' : 'h-4.5 w-4.5')}
            style={{
              color: isActive
                ? (isDark ? '#93c5fd' : '#4f46e5')
                : (isDark ? '#4a5a7a' : '#94a3b8'),
            }}
          />
          {!collapsed && (
            <span
              className="truncate transition-colors duration-200"
              style={{
                color: isActive
                  ? (isDark ? '#c4b5fd' : '#4f46e5')
                  : (isDark ? '#6b7faa' : '#64748b'),
              }}
            >
              {item.label}
            </span>
          )}
          {/* Active dot when collapsed */}
          {collapsed && isActive && (
            <span
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: isDark ? 'linear-gradient(135deg, #60a5fa, #a78bfa)' : '#4f46e5' }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}