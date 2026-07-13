import { useEffect, useState } from 'react';

export function useSuperAdmin() {
  const token = sessionStorage.getItem('sa_token');
  const admin = JSON.parse(sessionStorage.getItem('sa_admin') || 'null');
  return { token, admin, isAuth: !!token };
}

export function SuperAdminGuard({ children }) {
  const { isAuth } = useSuperAdmin();
  useEffect(() => {
    if (!isAuth) window.location.hash = '/admin/login';
  }, [isAuth]);
  if (!isAuth) return null;
  return children;
}

export default function SuperAdminLayout({ children, page }) {
  const { admin } = useSuperAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const nav = [
    { id: 'dashboard',  label: 'Dashboard',  icon: '📊', href: '#/admin/dashboard' },
    { id: 'companies',  label: 'Companies',  icon: '🏢', href: '#/admin/companies' },
  ];

  const logout = () => {
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_admin');
    window.location.hash = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all`}>
        <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
          <span className="text-lg">🔐</span>
          {sidebarOpen && <span className="text-white font-bold text-sm">Super Admin</span>}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {nav.map(item => (
            <a
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
                ${page === item.id
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <span>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        {sidebarOpen && admin && (
          <div className="p-3 border-t border-slate-800">
            <div className="text-xs text-slate-500 truncate">{admin.email}</div>
            <button
              onClick={logout}
              className="mt-2 text-xs text-red-400 hover:text-red-300"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="text-slate-400 hover:text-white"
          >
            ☰
          </button>
          <h1 className="text-white font-semibold capitalize">{page}</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
