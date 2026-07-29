import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';

const router = createHashRouter([
  { path: '/',           element: <Navigate to="/dashboard" replace /> },
  { path: '/login',      element: <LoginPage /> },
  { path: '/dashboard',  element: <DashboardPage /> },
  { path: '/companies',  element: <CompaniesPage /> },
  { path: '/users',      element: <UsersPage /> },
  { path: '*',           element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
