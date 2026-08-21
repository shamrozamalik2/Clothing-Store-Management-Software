import axios from 'axios';
import { store } from '@store/index';
import { clearCredentials, setToken } from '@store/slices/authSlice';

// Priority: Electron preload URL → VITE env var → same-origin /api
const BASE_URL = window.electronAPI?.backendUrl
  ? `${window.electronAPI.backendUrl}/api`
  : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api');

const client = axios.create({
  baseURL:         BASE_URL,
  timeout:         30_000,
  withCredentials: true, // sends HttpOnly refresh-token cookie automatically
  headers:         { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
client.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];

function drainQueue(err, token) {
  queue.forEach(cb => cb(err, token));
  queue = [];
}

// Shared refresh logic — used by both the reactive interceptor and the proactive hook.
// The `refreshing` flag ensures only one refresh flight is in progress at a time.
export async function callRefresh() {
  if (refreshing) {
    return new Promise((resolve, reject) => {
      queue.push((e, token) => (e ? reject(e) : resolve(token)));
    });
  }
  refreshing = true;
  try {
    const data = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
    const newToken = data.data?.data?.token ?? data.data?.token;
    if (!newToken) throw new Error('No token in refresh response');
    store.dispatch(setToken(newToken));
    drainQueue(null, newToken);
    return newToken;
  } catch (err) {
    drainQueue(err, null);
    throw err;
  } finally {
    refreshing = false;
  }
}

// Transparent token refresh on 401 TOKEN_EXPIRED
client.interceptors.response.use(
  (response) => response.data,
  async (err) => {
    const original  = err.config;
    const status    = err.response?.status;
    const code      = err.response?.data?.code;

    if (status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const newToken = await callRefresh();
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch (refreshErr) {
        store.dispatch(clearCredentials());
        window.location.hash = '/login';
        return Promise.reject(refreshErr);
      }
    }

    if (status === 401) {
      const msg = err.response?.data?.message || '';
      store.dispatch(clearCredentials());
      if (['COMPANY_SUSPENDED', 'COMPANY_EXPIRED', 'TRIAL_EXPIRED'].includes(code)) {
        sessionStorage.setItem('login_error', msg);
      }
      window.location.hash = '/login';
    }

    const message =
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default client;
