import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  HomeIcon, BuildingOffice2Icon, UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon, ChevronLeftIcon, TagIcon, EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Logo from '@components/ui/Logo';

export function useSuperAdmin() {
  const token = sessionStorage.getItem('sa_token');
  const admin = JSON.parse(sessionStorage.getItem('sa_admin') || 'null');
  return { token, admin, isAuth: !!token };
}

export function SuperAdminGuard({ children }) {
  const { isAuth } = useSuperAdmin();
  if (!isAuth) return <Navigate to="/admin/login" replace />;
  return children;
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  href: '#/admin/dashboard', Icon: HomeIcon },
  { id: 'companies', label: 'Companies',  href: '#/admin/companies', Icon: BuildingOffice2Icon },
  { id: 'business-categories', label: 'Business Categories', href: '#/admin/business-categories', Icon: TagIcon },
  { id: 'leads',     label: 'Demo Leads', href: '#/admin/leads',     Icon: EnvelopeIcon },
  { id: 'users',     label: 'Users',      href: '#/admin/users',     Icon: UsersIcon },
];

export default function SuperAdminLayout({ children, page }) {
  const { admin } = useSuperAdmin();
  const [collapsed, setCollapsed] = useState(false);

  // This section is dark-only by design (same as the login page it sits
  // behind) — force the product's own `html.dark` token set rather than
  // inventing a second, slightly-different dark palette.
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const logout = () => {
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_admin');
    window.location.replace('/#/admin/login');
  };

  const initials = (admin?.name || 'SA').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex text-surface-200" style={{ backgroundColor: 'rgb(var(--app-bg))' }}>
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} relative overflow-hidden bg-surface-900/80 backdrop-blur-md border-r border-surface-700 flex flex-col transition-all duration-200 shrink-0`}>
        <div className="sidebar-blob-1" />
        <div className="sidebar-blob-2" />

        {/* Brand */}
        <div className={`relative flex items-center h-14 border-b border-surface-700 ${collapsed ? 'justify-center' : 'px-5 gap-3'}`}>
          {collapsed ? (
            <Logo variant="mark" height={28} />
          ) : (
            <Logo variant="lockup" height={22} mono style={{ color: '#F8FAFC' }} />
          )}
        </div>
        {!collapsed && (
          <p className="relative px-5 pt-2 text-[10px] font-semibold text-surface-500 uppercase tracking-widest">
            Super Admin
          </p>
        )}

        {/* Nav */}
        <nav className="relative flex-1 p-2 pt-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, href, Icon }) => (
            <a key={id} href={href}
              className={`flex items-center gap-3 rounded-xl transition-all text-sm font-medium
                ${collapsed ? 'h-10 justify-center px-0' : 'h-9 px-3'}
                ${page === id
                  ? 'text-white shadow-lg shadow-primary-900/30'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'}`}
              style={page === id ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)' } : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className={`relative border-t border-surface-700 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-200 truncate">{admin?.name || 'Super Admin'}</p>
                <p className="text-xs text-surface-500 truncate">{admin?.email}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="text-surface-500 hover:text-red-400 transition-colors">
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Sign out"
              className="text-surface-500 hover:text-red-400 transition-colors">
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute z-10 h-6 w-6 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center hover:bg-surface-600 transition-colors text-surface-300"
          style={{ left: collapsed ? '52px' : '228px', top: '64px' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronLeftIcon className={`h-3 w-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-surface-900/70 backdrop-blur-md border-b border-surface-700 flex items-center px-6 gap-4 shrink-0">
          <button onClick={() => setCollapsed(c => !c)} className="text-surface-400 hover:text-surface-100 transition-colors">
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-surface-200 capitalize">{page}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-surface-500">ProBusinessCloud — Admin Portal</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
