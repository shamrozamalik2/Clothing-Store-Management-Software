import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '@components/ui/CommandPalette';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 6 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } },
};

export default function AppLayout() {
  useTokenRefresh();
  const location = useLocation();

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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'rgb(var(--app-bg))' }}>
      <CommandPalette />
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="p-6 max-w-[1600px] mx-auto"
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <Suspense fallback={<div className="h-40" aria-busy="true" />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
