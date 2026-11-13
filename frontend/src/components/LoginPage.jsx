import { useState } from 'react';
import { api } from '../api.js';

const DEMO_USERS = ['linh', 'huy', 'mai'];

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api.login(username, password));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <span className="brand-mark">VO</span>
          <div>
            <h1>Vendor Onboarding</h1>
            <p className="muted">Sign in as an Ops Coordinator</p>
          </div>
        </div>

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary block" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="demo-users">
          <span className="muted">Demo accounts (password: <code>password</code>)</span>
          <div className="chips">
            {DEMO_USERS.map((u) => (
              <button
                type="button"
                key={u}
                className="chip"
                onClick={() => {
                  setUsername(u);
                  setPassword('password');
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
