import React, { useState } from 'react';
import { login, register } from '../lib/auth.js';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = isRegister
      ? await register(username, password, adminKey)
      : await login(username, password);

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setUsername('');
      setPassword('');
      if (onAuthSuccess) onAuthSuccess(res.user);
      onClose();
    }
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Spieler-Konto">
      <div className="overlay-panel auth-panel">
        <img
          src="/logo.png"
          alt="Moritzfreund Arcade Logo"
          width={64}
          height={64}
          style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto 12px', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}
        />
        <h2 className="overlay-title" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
          {isRegister ? 'KONTO ERSTELLEN' : 'SPIELER LOGIN'}
        </h2>

        {/* Tab-Wechsel */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            ANMELDEN
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            REGISTRIEREN
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '14px' }}>
            <label className="auth-label">BENUTZERNAME</label>
            <input
              type="text"
              className="name-input"
              value={username}
              onChange={(e) => setUsername(e.target.value.slice(0, 16))}
              placeholder="z.B. Ayrie"
              maxLength={16}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: isRegister ? '14px' : '18px' }}>
            <label className="auth-label">PASSWORT</label>
            <input
              type="password"
              className="name-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mind. 4 Zeichen"
              required
            />
          </div>

          {isRegister && (
            <div style={{ marginBottom: '18px' }}>
              <label className="auth-label">ADMIN-CODE (OPTIONAL)</label>
              <input
                type="password"
                className="name-input"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder=""
              />
            </div>
          )}

          {error && <div className="auth-error-msg">{error}</div>}

          <div className="overlay-btn-row" style={{ marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !username.trim() || !password}
              style={{ flex: 1 }}
            >
              {loading ? 'LADEN...' : (isRegister ? 'KONTO ANLEGEN' : 'EINLOGGEN')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              ABBRECHEN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
