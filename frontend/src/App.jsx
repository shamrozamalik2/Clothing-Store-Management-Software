import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import LicenseGate from '@components/auth/LicenseGate';

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

  return <RouterProvider router={router} />;
}
