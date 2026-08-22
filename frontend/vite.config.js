import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// `vite build`                 -> web build, absolute base, real URLs
// `vite build --mode electron`  -> desktop build, relative base for file://
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Electron loads the app from file://, which needs relative asset paths.
  // The web build must use an absolute base or assets 404 on nested routes
  // such as /platform once hash routing is gone.
  base: mode === 'electron' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@api': path.resolve(__dirname, './src/api'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion', 'gsap', '@gsap/react'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
          ui: ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
  },
}));
