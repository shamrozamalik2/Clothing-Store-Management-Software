import { createHashRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth, selectUserRole } from '@store/slices/authSlice';
import AppLayout from '@components/layout/AppLayout';
import LoginPage from '@pages/auth/LoginPage';
import SuperAdminLoginPage from '@pages/superadmin/SuperAdminLoginPage';
import SuperAdminDashboard from '@pages/superadmin/SuperAdminDashboard';
import SuperAdminCompanies from '@pages/superadmin/SuperAdminCompanies';
import DashboardPage from '@pages/dashboard/DashboardPage';
import UsersPage from '@pages/users/UsersPage';
import ProfilePage from '@pages/settings/ProfilePage';
import CategoriesPage from '@pages/categories/CategoriesPage';
import BrandsPage from '@pages/brands/BrandsPage';
import ProductsPage from '@pages/products/ProductsPage';
import ProductFormPage from '@pages/products/ProductFormPage';
import SuppliersPage from '@pages/suppliers/SuppliersPage';
import PurchasesPage from '@pages/purchases/PurchasesPage';
import PurchaseFormPage from '@pages/purchases/PurchaseFormPage';
import PurchaseDetailPage from '@pages/purchases/PurchaseDetailPage';
import StockAdjustPage from '@pages/inventory/StockAdjustPage';
import CustomersPage from '@pages/customers/CustomersPage';
import POSPage from '@pages/pos/POSPage';
import SalesPage from '@pages/sales/SalesPage';
import SaleDetailPage from '@pages/sales/SaleDetailPage';
import ReportsPage from '@pages/reports/ReportsPage';
import SettingsPage from '@pages/settings/SettingsPage';

// Protected route wrapper
function ProtectedRoute({ roles }) {
  const isAuth = useSelector(selectIsAuth);
  const role   = useSelector(selectUserRole);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Redirect to dashboard if already logged in
function PublicRoute() {
  const isAuth = useSelector(selectIsAuth);
  return isAuth ? <Navigate to="/" replace /> : <Outlet />;
}

export const router = createHashRouter([
  // Public routes
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // Protected app routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/',                    element: <DashboardPage /> },
          { path: '/users',               element: <UsersPage /> },
          { path: '/settings/profile',    element: <ProfilePage /> },
          { path: '/categories',          element: <CategoriesPage /> },
          { path: '/brands',              element: <BrandsPage /> },
          { path: '/products',            element: <ProductsPage /> },
          { path: '/products/new',        element: <ProductFormPage /> },
          { path: '/products/:id/edit',   element: <ProductFormPage /> },
          { path: '/suppliers',            element: <SuppliersPage /> },
          { path: '/purchases',            element: <PurchasesPage /> },
          { path: '/purchases/new',        element: <PurchaseFormPage /> },
          { path: '/purchases/:id',        element: <PurchaseDetailPage /> },
          { path: '/inventory/adjust',     element: <StockAdjustPage /> },
          { path: '/customers',            element: <CustomersPage /> },
          { path: '/pos',                  element: <POSPage /> },
          { path: '/sales',                element: <SalesPage /> },
          { path: '/sales/:id',            element: <SaleDetailPage /> },
          { path: '/reports',              element: <ReportsPage /> },
          { path: '/settings',             element: <SettingsPage /> },
          // Future phases:
          // { path: '/expenses',         element: <ExpensesPage /> },
        ],
      },
    ],
  },

  // Super Admin portal (self-contained auth, no Redux dependency)
  { path: '/admin/login',     element: <SuperAdminLoginPage /> },
  { path: '/admin/dashboard', element: <SuperAdminDashboard /> },
  { path: '/admin/companies', element: <SuperAdminCompanies /> },

  { path: '*', element: <Navigate to="/" replace /> },
]);
