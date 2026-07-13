import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [updateState, setUpdateState] = useState(null); // null | 'available' | 'downloaded'
  const [updateInfo,  setUpdateInfo]  = useState(null);
  const [dismissed,   setDismissed]   = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.updater?.onStatus) return;
    const unsub = window.electronAPI.updater.onStatus((payload) => {
      if (payload.state === 'available') {
        setUpdateState('available');
        setUpdateInfo(payload.info);
        setDismissed(false);
      }
      if (payload.state === 'downloaded') {
        setUpdateState('downloaded');
        setUpdateInfo(payload.info);
        setDismissed(false);
      }
    });
    return unsub;
  }, []);

  const showBanner = !dismissed && (updateState === 'available' || updateState === 'downloaded');

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Update notification banner */}
        {showBanner && (
          <div className="flex items-center justify-between px-4 py-2 bg-primary-600/90 text-white text-xs shrink-0">
            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="h-3.5 w-3.5 shrink-0" />
              {updateState === 'downloaded'
                ? <>Update v{updateInfo?.version} downloaded — restart to install.</>
                : <>Update v{updateInfo?.version} is available.</>
              }
            </div>
            <div className="flex items-center gap-3">
              {updateState === 'downloaded' && (
                <button
                  onClick={() => window.electronAPI.updater.install()}
                  className="font-semibold underline underline-offset-2 hover:no-underline">
                  Restart & Install
                </button>
              )}
              {updateState === 'available' && (
                <button
                  onClick={() => window.electronAPI.updater.download()}
                  className="font-semibold underline underline-offset-2 hover:no-underline">
                  Download
                </button>
              )}
              <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
