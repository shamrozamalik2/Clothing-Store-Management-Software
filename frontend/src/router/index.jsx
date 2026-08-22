import { createBrowserRouter, createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth, selectUserRole } from '@store/slices/authSlice';
import AppLayout from '@components/layout/AppLayout';
import { Suspense, lazy } from 'react';

/* The marketing site is code-split away from the application: a visitor
   landing on the homepage never downloads the POS, and a cashier signing in
   never downloads the marketing pages or the animation libraries. */
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

/* Minimal, non-flashing fallback on the site's own ink ground. */
function SiteFallback() {
  return <div style={{ minHeight: '100vh', background: '#0B1020' }} aria-busy="true" />;
}

function Site({ children }) {
  return <Suspense fallback={<SiteFallback />}>{children}</Suspense>;
}

const PublicLoginPage = lazy(() => import('@pages/public/PublicLoginPage'));
const DashboardPage = lazy(() => import('@pages/dashboard/DashboardPage'));
const ExpensesPage = lazy(() => import('@pages/expenses/ExpensesPage'));
const UsersPage = lazy(() => import('@pages/users/UsersPage'));
const ProfilePage = lazy(() => import('@pages/settings/ProfilePage'));
const CategoriesPage = lazy(() => import('@pages/categories/CategoriesPage'));
const BrandsPage = lazy(() => import('@pages/brands/BrandsPage'));
const ProductsPage = lazy(() => import('@pages/products/ProductsPage'));
const ProductFormPage = lazy(() => import('@pages/products/ProductFormPage'));
const SuppliersPage = lazy(() => import('@pages/suppliers/SuppliersPage'));
const PurchasesPage = lazy(() => import('@pages/purchases/PurchasesPage'));
const PurchaseFormPage = lazy(() => import('@pages/purchases/PurchaseFormPage'));
const PurchaseDetailPage = lazy(() => import('@pages/purchases/PurchaseDetailPage'));
const StockAdjustPage = lazy(() => import('@pages/inventory/StockAdjustPage'));
const CustomersPage = lazy(() => import('@pages/customers/CustomersPage'));
const POSPage = lazy(() => import('@pages/pos/POSPage'));
const SalesPage = lazy(() => import('@pages/sales/SalesPage'));
const SaleDetailPage = lazy(() => import('@pages/sales/SaleDetailPage'));
const ReportsPage = lazy(() => import('@pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@pages/settings/SettingsPage'));
const RolesPage = lazy(() => import('@pages/settings/RolesPage'));
const ReturnsPage = lazy(() => import('@pages/returns/ReturnsPage'));
const ManufacturingPage = lazy(() => import('@pages/manufacturing/ManufacturingPage'));
const EmployeesPage = lazy(() => import('@pages/hr/EmployeesPage'));
const LedgerPage = lazy(() => import('@pages/ledger/LedgerPage'));
const AuditPage = lazy(() => import('@pages/audit/AuditPage'));

// Redirect authenticated users to dashboard; unauthenticated users to login
function ProtectedRoute({ roles }) {
  const isAuth = useSelector(selectIsAuth);
  const role   = useSelector(selectUserRole);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Redirect to dashboard if already logged in (used for /login)
function PublicRoute() {
  const isAuth = useSelector(selectIsAuth);
  return isAuth ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

// Smart catch-all: authenticated → dashboard, otherwise → home
function CatchAll() {
  const isAuth = useSelector(selectIsAuth);
  return <Navigate to={isAuth ? '/dashboard' : '/'} replace />;
}

/*
 * Router strategy
 * ───────────────
 * The web build uses real paths (/platform) so that crawlers, social
 * unfurlers and analytics see distinct URLs. The packaged desktop build is
 * loaded from file://, where the History API cannot work, so it falls back to
 * hash routing. The route table below is shared by both.
 */
const isFileProtocol =
  typeof window !== 'undefined' && window.location.protocol === 'file:';

const createRouter = isFileProtocol ? createHashRouter : createBrowserRouter;

export const router = createRouter([

  // ── Public marketing website (always accessible) ──────────────────────────
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
      // Legacy public paths — keep old links working
      { path: '/features', element: <Navigate to="/platform" replace /> },
      { path: '/about',    element: <Navigate to="/solutions" replace /> },
      { path: '/contact',  element: <Navigate to="/demo" replace /> },
    ],
  },

  // ── Login — redirect to dashboard if already authenticated ────────────────
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <PublicLoginPage /> },
    ],
  },

  // ── Protected application routes ──────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard',           element: <DashboardPage /> },
          { path: '/users',               element: <UsersPage /> },
          { path: '/settings/profile',    element: <ProfilePage /> },
          { path: '/categories',          element: <CategoriesPage /> },
          { path: '/brands',              element: <BrandsPage /> },
          { path: '/products',            element: <ProductsPage /> },
          { path: '/products/new',        element: <ProductFormPage /> },
          { path: '/products/:id/edit',   element: <ProductFormPage /> },
          { path: '/suppliers',           element: <SuppliersPage /> },
          { path: '/purchases',           element: <PurchasesPage /> },
          { path: '/purchases/new',       element: <PurchaseFormPage /> },
          { path: '/purchases/:id',       element: <PurchaseDetailPage /> },
          { path: '/inventory/adjust',    element: <StockAdjustPage /> },
          { path: '/customers',           element: <CustomersPage /> },
          { path: '/pos',                 element: <POSPage /> },
          { path: '/sales',               element: <SalesPage /> },
          { path: '/sales/:id',           element: <SaleDetailPage /> },
          { path: '/reports',             element: <ReportsPage /> },
          { path: '/settings',            element: <SettingsPage /> },
          { path: '/roles',               element: <RolesPage /> },
          { path: '/expenses',            element: <ExpensesPage /> },
          { path: '/returns',             element: <ReturnsPage /> },
          { path: '/manufacturing',       element: <ManufacturingPage /> },
          { path: '/hr',                  element: <EmployeesPage /> },
          { path: '/ledger',              element: <LedgerPage /> },
          { path: '/audit',               element: <AuditPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <CatchAll /> },
]);
