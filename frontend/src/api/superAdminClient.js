import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const sa = axios.create({
  baseURL: `${BASE}/admin`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

sa.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

sa.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('sa_token');
      sessionStorage.removeItem('sa_admin');
      window.location.hash = '/admin/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const saLogin = (email, password) => sa.post('/auth/login', { email, password });

// ── Stats ─────────────────────────────────────────────────────────────────────
export const saGetStats = () => sa.get('/stats');

// ── Companies ─────────────────────────────────────────────────────────────────
export const saListCompanies    = (params) => sa.get('/companies', { params });
export const saGetCompany       = (id)     => sa.get(`/companies/${id}`);
export const saCreateCompany    = (data)   => sa.post('/companies', data);
export const saUpdateCompany    = (id, d)  => sa.patch(`/companies/${id}`, d);
export const saDeleteCompany    = (id)     => sa.delete(`/companies/${id}`);
export const saSuspendCompany   = (id, r)  => sa.post(`/companies/${id}/suspend`, { reason: r });
export const saReinstateCompany = (id)     => sa.post(`/companies/${id}/reinstate`);
export const saImpersonate      = (id)     => sa.post(`/companies/${id}/impersonate`);

// ── Plan & Features ───────────────────────────────────────────────────────────
export const saUpdatePlan     = (id, d) => sa.put(`/companies/${id}/plan`, d);
export const saUpdateFeatures = (id, d) => sa.put(`/companies/${id}/features`, d);

// ── Users ─────────────────────────────────────────────────────────────────────
export const saListUsers          = (params) => sa.get('/users', { params });
export const saUpdateUser         = (id, d)  => sa.patch(`/users/${id}`, d);
export const saToggleUser         = (id)     => sa.post(`/users/${id}/toggle`);
export const saResetUserPassword  = (id, pw) => sa.post(`/users/${id}/reset-password`, { password: pw });
export const saDeleteUser         = (id)     => sa.delete(`/users/${id}`);

export default sa;
