import { createHashRouter, Navigate } from 'react-router-dom';
import SuperAdminLoginPage  from '@pages/superadmin/SuperAdminLoginPage';
import SuperAdminDashboard  from '@pages/superadmin/SuperAdminDashboard';
import SuperAdminCompanies  from '@pages/superadmin/SuperAdminCompanies';
import SuperAdminUsers      from '@pages/superadmin/SuperAdminUsers';
import { SuperAdminGuard }  from '@pages/superadmin/SuperAdminLayout';

function GuardedRoute({ children }) {
  return <SuperAdminGuard>{children}</SuperAdminGuard>;
}

export const superAdminRouter = createHashRouter([
  { path: '/admin/login',     element: <SuperAdminLoginPage /> },
  { path: '/admin/dashboard', element: <GuardedRoute><SuperAdminDashboard /></GuardedRoute> },
  { path: '/admin/companies', element: <GuardedRoute><SuperAdminCompanies /></GuardedRoute> },
  { path: '/admin/users',     element: <GuardedRoute><SuperAdminUsers /></GuardedRoute> },
  { path: '*',                element: <Navigate to="/admin/login" replace /> },
]);
