import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { selectToken, setToken, clearCredentials } from '@store/slices/authSlice';

const BASE_URL = window.electronAPI?.backendUrl
  ? `${window.electronAPI.backendUrl}/api`
  : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api');

function getExp(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp; // Unix seconds
  } catch {
    return null;
  }
}

async function doRefresh(dispatch) {
  try {
    const resp = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const newToken = resp.data?.data?.token ?? resp.data?.token;
    if (newToken) dispatch(setToken(newToken));
  } catch {
    // Proactive refresh failed — the reactive 401 interceptor in client.js
    // will handle it when the token actually expires and a request fails.
    // Only clear session if we get a definitive "token invalid" from server.
  }
}

// Silently refreshes the access token ~2 minutes before it expires.
// Mounts at the app layout level so the user is never kicked out mid-session.
export function useTokenRefresh() {
  const dispatch  = useDispatch();
  const token     = useSelector(selectToken);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!token) return;

    const exp = getExp(token);
    if (!exp) return;

    // Refresh 2 minutes before expiry; if already within that window, refresh now
    const msLeft = exp * 1000 - Date.now() - 2 * 60 * 1000;

    if (msLeft <= 0) {
      doRefresh(dispatch);
      return;
    }

    timerRef.current = setTimeout(() => doRefresh(dispatch), msLeft);
    return () => clearTimeout(timerRef.current);
  }, [token, dispatch]);
}
