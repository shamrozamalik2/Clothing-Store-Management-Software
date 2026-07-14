import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { selectCurrentUser, clearCredentials } from '@store/slices/authSlice';
import { selectTheme, toggleTheme, selectPageTitle } from '@store/slices/uiSlice';
import { authApi } from '@api/auth.api';
import { productsApi } from '@api/products.api';
import { cn } from '@utils/cn';

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
    <header className="h-14 flex items-center justify-between px-6 bg-surface-900 border-b border-surface-700 shrink-0">
      {/* Page title */}
      <h1 className="text-base font-semibold text-surface-100">{pageTitle}</h1>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark'
            ? <SunIcon className="h-4.5 w-4.5" />
            : <MoonIcon className="h-4.5 w-4.5" />
          }
        </button>

        {/* Notifications */}
        <Menu as="div" className="relative">
          <Menu.Button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors relative"
            title="Notifications"
          >
            <BellIcon className="h-4.5 w-4.5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className={cn(
              'absolute right-0 mt-1 w-72 rounded-xl shadow-card-lg z-50',
              'bg-surface-800 border border-surface-700',
              'focus:outline-none origin-top-right'
            )}>
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-surface-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-100">Notifications</p>
                {alertCount > 0 && (
                  <span className="text-xs text-amber-400 font-medium">
                    {alertCount} alert{alertCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Alert list */}
              <div className="max-h-72 overflow-y-auto">
                {lowStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-surface-500">
                    <InboxIcon className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs">All stock levels are healthy</p>
                  </div>
                ) : (
                  lowStock.slice(0, 10).map(p => (
                    <Menu.Item key={p.id}>
                      {({ active }) => (
                        <button
                          onClick={() => navigate('/products')}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left',
                            'border-b border-surface-700/50 last:border-0',
                            active ? 'bg-surface-700/50' : ''
                          )}
                        >
                          <ExclamationTriangleIcon className={cn(
                            'h-4 w-4 mt-0.5 shrink-0',
                            p.stock_quantity <= 0 ? 'text-red-400' : 'text-amber-400'
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-surface-200 truncate">{p.name}</p>
                            <p className={cn(
                              'text-xs mt-0.5',
                              p.stock_quantity <= 0 ? 'text-red-400' : 'text-amber-400'
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

              {/* Footer link */}
              {lowStock.length > 0 && (
                <div className="border-t border-surface-700 px-4 py-2">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/products')}
                        className={cn(
                          'w-full text-xs text-center py-1',
                          active ? 'text-primary-300' : 'text-primary-400'
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
        <div className="h-6 w-px bg-surface-700 mx-1" />

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button className={cn(
            'flex items-center gap-2 h-8 px-2 rounded-lg',
            'text-surface-300 hover:text-surface-100 hover:bg-surface-800',
            'transition-colors text-sm font-medium'
          )}>
            <UserCircleIcon className="h-5 w-5 text-surface-400" />
            <span className="max-w-[120px] truncate">{currentUser?.name}</span>
            <ChevronDownIcon className="h-4 w-4 text-surface-500 shrink-0" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className={cn(
              'absolute right-0 mt-1 w-52 rounded-xl shadow-card-lg z-50',
              'bg-surface-800 border border-surface-700',
              'focus:outline-none py-1 origin-top-right'
            )}>
              <div className="px-3 py-2 border-b border-surface-700">
                <p className="text-sm font-semibold text-surface-100 truncate">{currentUser?.name}</p>
                <p className="text-xs text-surface-500 truncate">{currentUser?.email}</p>
                <span className="badge badge-info mt-1 capitalize">{currentUser?.role}</span>
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/settings/profile')}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm',
                        active ? 'bg-surface-700 text-surface-100' : 'text-surface-300'
                      )}
                    >
                      <KeyIcon className="h-4 w-4" />
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
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400',
                        active ? 'bg-surface-700' : ''
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      {logoutMutation.isPending ? 'Logging out…' : 'Log Out'}
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
