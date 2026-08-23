import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';

const PublicLayout   = lazy(() => import('@pages/public/PublicLayout'));
const HomePage       = lazy(() => import('@pages/public/HomePage'));
const PlatformPage   = lazy(() => import('@pages/public/PlatformPage'));
const HowItWorksPage = lazy(() => import('@pages/public/HowItWorksPage'));
const SolutionsPage  = lazy(() => import('@pages/public/SolutionsPage'));
const AppsPage       = lazy(() => import('@pages/public/AppsPage'));
const SecurityPage   = lazy(() => import('@pages/public/SecurityPage'));
const DemoPage       = lazy(() => import('@pages/public/DemoPage'));
const FAQPage        = lazy(() => import('@pages/public/FAQPage'));
const PricingPage    = lazy(() => import('@pages/public/PricingPage'));

function SiteFallback() {
  return <div style={{ minHeight: '100vh', background: '#0B1020' }} aria-busy="true" />;
}

function Site({ children }) {
  return <Suspense fallback={<SiteFallback />}>{children}</Suspense>;
}

// Redirect any non-marketing path to the app subdomain
function ToApp() {
  useEffect(() => {
    const dest = `https://app.probusinesscloud.com${window.location.pathname}${window.location.search}`;
    window.location.replace(dest);
  }, []);
  return <SiteFallback />;
}

export const marketingRouter = createBrowserRouter([
  {
    element: <Site><PublicLayout /></Site>,
    children: [
      { path: '/',             element: <HomePage /> },
      { path: '/platform',     element: <PlatformPage /> },
      { path: '/how-it-works', element: <HowItWorksPage /> },
      { path: '/solutions',    element: <SolutionsPage /> },
      { path: '/apps',         element: <AppsPage /> },
      { path: '/security',     element: <SecurityPage /> },
      { path: '/demo',         element: <DemoPage /> },
      { path: '/faq',          element: <FAQPage /> },
      { path: '/pricing',      element: <PricingPage /> },
      { path: '/features',     element: <Navigate to="/platform" replace /> },
      { path: '/about',        element: <Navigate to="/solutions" replace /> },
      { path: '/contact',      element: <Navigate to="/demo" replace /> },
    ],
  },
  // Any other path (login, dashboard, pos, etc.) → app subdomain
  { path: '*', element: <ToApp /> },
]);
