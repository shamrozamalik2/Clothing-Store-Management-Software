import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  HomeIcon, BuildingOffice2Icon, UsersIcon,
  ShieldCheckIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon,
  Bars3Icon, ChevronLeftIcon,
} from '@heroicons/react/24/outline';

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
  { id: 'users',     label: 'Users',      href: '#/admin/users',     Icon: UsersIcon },
];

export default function SuperAdminLayout({ children, page }) {
  const { admin } = useSuperAdmin();
  const [collapsed, setCollapsed] = useState(false);

  const logout = () => {
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_admin');
    window.location.replace('/#/admin/login');
  };

  const initials = (admin?.name || 'SA').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 shrink-0`}>
        {/* Brand */}
        <div className={`flex items-center h-14 border-b border-slate-800 ${collapsed ? 'justify-center' : 'px-5 gap-3'}`}>
          <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-tight">Super Admin</p>
              <p className="text-xs text-slate-500">Platform Control</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, href, Icon }) => (
            <a key={id} href={href}
              className={`flex items-center gap-3 rounded-lg transition-colors text-sm font-medium
                ${collapsed ? 'h-10 justify-center px-0' : 'h-9 px-3'}
                ${page === id
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-800 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{admin?.name || 'Super Admin'}</p>
                <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
              </div>
              <button onClick={logout} title="Sign out"
                className="text-slate-500 hover:text-red-400 transition-colors">
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Sign out"
              className="text-slate-500 hover:text-red-400 transition-colors">
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute left-[calc(var(--sidebar-w,15rem)-12px)] top-16 z-10 h-6 w-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-colors text-slate-400"
          style={{ left: collapsed ? '52px' : '228px' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronLeftIcon className={`h-3 w-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 shrink-0">
          <button onClick={() => setCollapsed(c => !c)} className="text-slate-400 hover:text-white transition-colors">
            <Bars3Icon className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-slate-200 capitalize">{page}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-500">Garments POS — Admin Portal</span>
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
