import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    // Proxy all /api requests to the Express backend during development.
    // This avoids CORS issues in development — the browser sees requests as same-origin.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Exclude Playwright E2E specs — those are run by `test:e2e` via Playwright directly.
    exclude: ['e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Coverage thresholds are intentionally omitted here at this sprint stage.
      // Frontend component test coverage is being added incrementally, Sprint by Sprint.
      // Thresholds will be introduced once a baseline suite covering all pages exists.
      // Current tested files: NoteCard, SettingsPage, ImportExportPage.
    },
  },
});
