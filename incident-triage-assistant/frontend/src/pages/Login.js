import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Login() {
  const { login, loading, error, user } = useAuth();
  const [email, setEmail] = useState('admin@triage.com');
  const [password, setPassword] = useState('admin123');
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/dashboard');
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">🛠️ Incident Triage Assistant</div>
        <p className="auth-subtitle">AI-powered bug triage &amp; tracking</p>

        <Alert type="error" message={error} />

        <label className="field-label">Email</label>
        <input
          type="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />

        <label className="field-label">Password</label>
        <input
          type="password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <button className="btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p className="auth-hint">
          Demo credentials: <b>admin@triage.com</b> / <b>admin123</b>
          <br />
          (run <code>npm run seed</code> in the backend to create this user)
        </p>
      </form>
    </div>
  );
}
