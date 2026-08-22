import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { superAdminRouter } from '@/router/superAdminRouter';
import LicenseGate from '@components/auth/LicenseGate';

const ADMIN_HOSTS = ['admin.probusinesscloud.com'];
const isAdminSubdomain = ADMIN_HOSTS.includes(window.location.hostname);

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

  if (isAdminSubdomain) {
    return <RouterProvider router={superAdminRouter} />;
  }

  return <RouterProvider router={router} />;
}
