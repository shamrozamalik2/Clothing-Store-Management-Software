import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { selectCurrentUser, clearCredentials } from '@store/slices/authSlice';
import { selectTheme, toggleTheme, selectPageTitle } from '@store/slices/uiSlice';
import { authApi } from '@api/auth.api';
import { productsApi } from '@api/products.api';
import { cn } from '@utils/cn';

/* ─── Gradient avatar ────────────────────────────────────────────────────── */
function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const dim = size === 'md' ? { height: 32, width: 32, fontSize: 13 } : { height: 28, width: 28, fontSize: 11 };

  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{
        height:    dim.height,
        width:     dim.width,
        fontSize:  dim.fontSize,
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
      }}
    >
      {initials}
    </span>
  );
}

export default function Header() {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const currentUser  = useSelector(selectCurrentUser);
  const theme        = useSelector(selectTheme);
  const pageTitle    = useSelector(selectPageTitle);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      dispatch(clearCredentials());
      navigate('/login', { replace: true });
      toast.success('Logged out successfully.');
    },
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ['notifications-low-stock'],
    queryFn:  productsApi.lowStock,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const lowStock   = lowStockRes?.data ?? [];
  const alertCount = lowStock.length;

  return (
    <header
      className="h-14 flex items-center justify-between px-5 shrink-0"
      style={{
        backgroundColor: 'rgb(var(--card))',
        borderBottom: '1px solid rgb(var(--s-700))',
      }}
    >
      {/* Page title */}
      <h1 className="text-sm font-semibold text-surface-100 tracking-tight">{pageTitle}</h1>

      <div className="flex items-center gap-1">

        {/* Theme toggle */}
        <IconBtn onClick={() => dispatch(toggleTheme())} title="Toggle theme">
          {theme === 'dark'
            ? <SunIcon className="h-4.5 w-4.5" />
            : <MoonIcon className="h-4.5 w-4.5" />
          }
        </IconBtn>

        {/* Notifications bell */}
        <Menu as="div" className="relative">
          <Menu.Button as={Fragment}>
            {({ open }) => (
              <button
                className={cn(
                  'relative h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                  'text-surface-400 hover:text-surface-100',
                  open ? 'bg-surface-700 text-surface-100' : 'hover:bg-surface-800'
                )}
                title="Notifications"
              >
                <BellIcon className="h-4.5 w-4.5" />
                {alertCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-0.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
            )}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95 translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className={cn(
              'absolute right-0 mt-2 w-80 rounded-xl shadow-card-lg z-50',
              'bg-card border border-surface-700',
              'focus:outline-none origin-top-right'
            )}>
              <div className="px-4 py-3 border-b border-surface-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-100">Notifications</p>
                {alertCount > 0 && (
                  <span className="badge badge-warning">
                    {alertCount} alert{alertCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {lowStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-surface-500">
                    <InboxIcon className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-medium">All stock levels are healthy</p>
                  </div>
                ) : (
                  lowStock.slice(0, 10).map(p => (
                    <Menu.Item key={p.id}>
                      {({ active }) => (
                        <button
                          onClick={() => navigate('/products')}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                            'border-b border-surface-700/40 last:border-0',
                            active ? 'bg-surface-800/50' : ''
                          )}
                        >
                          <span className={cn(
                            'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            p.stock_quantity <= 0
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-amber-500/10 text-amber-500'
                          )}>
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-surface-100 truncate">{p.name}</p>
                            <p className={cn(
                              'text-xs mt-0.5',
                              p.stock_quantity <= 0 ? 'text-red-500' : 'text-amber-500'
                            )}>
                              {p.stock_quantity <= 0 ? 'Out of stock' : `Only ${p.stock_quantity} left`}
                            </p>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  ))
                )}
              </div>

              {lowStock.length > 0 && (
                <div className="border-t border-surface-700 px-4 py-2.5">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/products')}
                        className={cn(
                          'w-full text-xs text-center font-medium transition-colors',
                          active ? 'text-primary-400' : 'text-primary-500'
                        )}
                      >
                        View all products →
                      </button>
                    )}
                  </Menu.Item>
                </div>
              )}
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Divider */}
        <div className="h-5 w-px bg-surface-700 mx-1.5" />

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-lg transition-colors',
            'text-surface-300 hover:text-surface-100 hover:bg-surface-800'
          )}>
            <Avatar name={currentUser?.name} />
            <span className="max-w-[110px] truncate text-sm font-medium hidden sm:block">
              {currentUser?.name?.split(' ')[0]}
            </span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-surface-500 shrink-0" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95 translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className={cn(
              'absolute right-0 mt-2 w-56 rounded-xl shadow-card-lg z-50',
              'bg-card border border-surface-700',
              'focus:outline-none py-1 origin-top-right'
            )}>
              {/* User info */}
              <div className="px-4 py-3 border-b border-surface-700">
                <div className="flex items-center gap-3">
                  <Avatar name={currentUser?.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-surface-100 truncate">{currentUser?.name}</p>
                    <p className="text-xs text-surface-400 truncate">{currentUser?.email}</p>
                  </div>
                </div>
                <span className="badge badge-info mt-2.5 capitalize">{currentUser?.role}</span>
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/settings/profile')}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
                        active ? 'bg-surface-800 text-surface-100' : 'text-surface-300'
                      )}
                    >
                      <KeyIcon className="h-4 w-4 shrink-0" />
                      Change Password
                    </button>
                  )}
                </Menu.Item>
              </div>

              <div className="border-t border-surface-700 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 transition-colors',
                        active ? 'bg-red-500/5' : ''
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
                      {logoutMutation.isPending ? 'Logging out…' : 'Sign Out'}
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

      </div>
    </header>
  );
}

/* ─── Icon button helper ─────────────────────────────────────────────────── */
function IconBtn({ children, className, ...props }) {
  return (
    <button
      className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
        'text-surface-400 hover:text-surface-100 hover:bg-surface-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}