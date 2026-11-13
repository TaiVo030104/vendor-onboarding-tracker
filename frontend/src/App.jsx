import { useCallback, useEffect, useState } from 'react';
import { api, setToken, getToken } from './api.js';
import LoginPage from './components/LoginPage.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = useCallback(({ token, user }) => {
    setToken(token);
    setUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
    }
    setToken(null);
    setUser(null);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  if (checking) return <div className="center muted">Loading…</div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />;
}
