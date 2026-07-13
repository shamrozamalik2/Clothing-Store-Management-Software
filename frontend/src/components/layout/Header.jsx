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
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { selectCurrentUser, clearCredentials } from '@store/slices/authSlice';
import { selectTheme, toggleTheme, selectPageTitle } from '@store/slices/uiSlice';
import { authApi } from '@api/auth.api';
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

        {/* Notifications placeholder */}
        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors relative">
          <BellIcon className="h-4.5 w-4.5" />
        </button>

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
