import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth, selectUserRole } from '@store/slices/authSlice';
import AppLayout from '@components/layout/AppLayout';
import { Suspense, lazy } from 'react';

const PublicLoginPage       = lazy(() => import('@pages/public/PublicLoginPage'));
const DashboardPage         = lazy(() => import('@pages/dashboard/DashboardPage'));
const ExpensesPage          = lazy(() => import('@pages/expenses/ExpensesPage'));
const UsersPage             = lazy(() => import('@pages/users/UsersPage'));
const ProfilePage           = lazy(() => import('@pages/settings/ProfilePage'));
const CategoriesPage        = lazy(() => import('@pages/categories/CategoriesPage'));
const BrandsPage            = lazy(() => import('@pages/brands/BrandsPage'));
const ProductsPage          = lazy(() => import('@pages/products/ProductsPage'));
const ProductFormPage       = lazy(() => import('@pages/products/ProductFormPage'));
const SuppliersPage         = lazy(() => import('@pages/suppliers/SuppliersPage'));
const PurchasesPage         = lazy(() => import('@pages/purchases/PurchasesPage'));
const PurchaseFormPage      = lazy(() => import('@pages/purchases/PurchaseFormPage'));
const PurchaseDetailPage    = lazy(() => import('@pages/purchases/PurchaseDetailPage'));
const StockAdjustPage       = lazy(() => import('@pages/inventory/StockAdjustPage'));
const CustomersPage         = lazy(() => import('@pages/customers/CustomersPage'));
const POSPage               = lazy(() => import('@pages/pos/POSPage'));
const SalesPage             = lazy(() => import('@pages/sales/SalesPage'));
const SaleDetailPage        = lazy(() => import('@pages/sales/SaleDetailPage'));
const ReportsPage           = lazy(() => import('@pages/reports/ReportsPage'));
const SettingsPage          = lazy(() => import('@pages/settings/SettingsPage'));
const RolesPage             = lazy(() => import('@pages/settings/RolesPage'));
const ReturnsPage           = lazy(() => import('@pages/returns/ReturnsPage'));
const ManufacturingPage     = lazy(() => import('@pages/manufacturing/ManufacturingPage'));
const EmployeesPage         = lazy(() => import('@pages/hr/EmployeesPage'));
const LedgerPage            = lazy(() => import('@pages/ledger/LedgerPage'));
const AuditPage             = lazy(() => import('@pages/audit/AuditPage'));
const BarcodePage           = lazy(() => import('@pages/barcodes/BarcodePage'));

function ProtectedRoute({ roles }) {
  const isAuth = useSelector(selectIsAuth);
  const role   = useSelector(selectUserRole);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const isAuth = useSelector(selectIsAuth);
  return isAuth ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export const appRouter = createBrowserRouter([
  // Root → login if not authenticated, dashboard if authenticated
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Login
  { element: <PublicRoute />, children: [
    { path: '/login', element: <Suspense fallback={null}><PublicLoginPage /></Suspense> },
  ]},

  // Protected app routes
  { element: <ProtectedRoute />, children: [{
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
      { path: '/barcodes',            element: <BarcodePage /> },
    ],
  }]},

  { path: '*', element: <Navigate to="/login" replace /> },
]);
