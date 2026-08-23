import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { appRouter } from '@/router/appRouter';
import { marketingRouter } from '@/router/marketingRouter';
import { superAdminRouter } from '@/router/superAdminRouter';
import LicenseGate from '@components/auth/LicenseGate';

const hostname = window.location.hostname;
const isAdminSubdomain  = hostname === 'admin.probusinesscloud.com';
const isAppSubdomain    = hostname === 'app.probusinesscloud.com';
const isMainDomain      = hostname === 'probusinesscloud.com' || hostname === 'www.probusinesscloud.com';

export default function App() {
  const [licStatus, setLicStatus] = useState(null);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.license?.getStatus) {
      setReady(true);
      return;
    }
    window.electronAPI.license.getStatus().then((status) => {
      setLicStatus(status);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <div className="h-screen bg-surface-950" />;
  }

  if (licStatus && licStatus.mode === 'expired') {
    return (
      <LicenseGate
        status={licStatus}
        onActivated={(result) => setLicStatus({ mode: 'licensed', license: result, trial: licStatus.trial })}
      />
    );
  }

  if (isAdminSubdomain) return <RouterProvider router={superAdminRouter} />;
  if (isAppSubdomain)   return <RouterProvider router={appRouter} />;
  if (isMainDomain)     return <RouterProvider router={marketingRouter} />;

  return <RouterProvider router={router} />;
}
