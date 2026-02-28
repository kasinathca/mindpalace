import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './globals.css';
import { initApiClientStore } from './api/client.js';
import { useAuthStore } from './stores/authStore.js';

// Wire the Zustand auth store into the Axios interceptor.
// Must happen before any API calls are made.
initApiClientStore({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  logoutUser: () => void useAuthStore.getState()._forceLogout(),
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
