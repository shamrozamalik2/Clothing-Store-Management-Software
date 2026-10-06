import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { store } from '@store/index';
import App from './App';
import './index.css';

// Apply saved theme before React renders to avoid flash of wrong theme
document.documentElement.className = localStorage.getItem('sas_theme') || 'light';

// A tab opened before a deploy still points at chunks the new build removed.
// Reload once to pick up the new build; the timestamp guard prevents a loop.
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem('chunk_reload_at') || 0);
  if (Date.now() - last < 10000) return;
  event.preventDefault();
  sessionStorage.setItem('chunk_reload_at', String(Date.now()));
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 minutes
      gcTime: 1000 * 60 * 10,       // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--toast-bg, 255 255 255))',
              color: 'rgb(var(--toast-text, 15 23 42))',
              border: '1px solid rgb(var(--toast-border, 226 232 240))',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.12)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
