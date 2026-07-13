import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const superAdminClient = axios.create({
  baseURL: `${BASE}/admin`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token from sessionStorage on every request
superAdminClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to admin login on 401
superAdminClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('sa_token');
      window.location.hash = '/admin/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const saLogin = (email, password) =>
  superAdminClient.post('/auth/login', { email, password });

// ── Stats ─────────────────────────────────────────────────────────────────────
export const saGetStats = () => superAdminClient.get('/stats');

// ── Companies ─────────────────────────────────────────────────────────────────
export const saListCompanies  = (params) => superAdminClient.get('/companies', { params });
export const saGetCompany     = (id)     => superAdminClient.get(`/companies/${id}`);
export const saCreateCompany  = (data)   => superAdminClient.post('/companies', data);
export const saUpdateCompany  = (id, d)  => superAdminClient.patch(`/companies/${id}`, d);
export const saSuspendCompany = (id, r)  => superAdminClient.post(`/companies/${id}/suspend`, { reason: r });
export const saReinstateCompany = (id)   => superAdminClient.post(`/companies/${id}/reinstate`);

export default superAdminClient;
