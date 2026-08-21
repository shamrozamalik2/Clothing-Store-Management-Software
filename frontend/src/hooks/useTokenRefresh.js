import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectToken } from '@store/slices/authSlice';
import { callRefresh } from '@api/client';

function getExp(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp; // Unix seconds
  } catch {
    return null;
  }
}

// Silently refreshes the access token ~2 minutes before it expires.
// Uses the shared callRefresh() from client.js so it shares the refresh lock
// with the reactive 401 interceptor — no duplicate refresh flights.
export function useTokenRefresh() {
  const token    = useSelector(selectToken);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!token) return;

    const exp = getExp(token);
    if (!exp) return;

    // Refresh 2 minutes before expiry; if already within that window, refresh now
    const msLeft = exp * 1000 - Date.now() - 2 * 60 * 1000;

    const doRefresh = () => callRefresh().catch(() => {
      // Proactive refresh failed — reactive 401 interceptor is the backstop.
    });

    if (msLeft <= 0) { doRefresh(); return; }

    timerRef.current = setTimeout(doRefresh, msLeft);
    return () => clearTimeout(timerRef.current);
  }, [token]);
}
