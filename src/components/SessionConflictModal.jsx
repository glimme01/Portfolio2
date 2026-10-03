import React, { useEffect, useState } from 'react';
import { onSessionConflict } from '../lib/auth.js';

export default function SessionConflictModal({ onReLogin }) {
  const [conflictReason, setConflictReason] = useState(null);

  useEffect(() => {
    return onSessionConflict((reason) => {
      setConflictReason(reason || 'Auf einem anderen Gerät oder Tab angemeldet.');
    });
  }, []);

  if (!conflictReason) return null;

  function handleDismiss() {
    setConflictReason(null);
    if (onReLogin) onReLogin();
    else window.location.reload();
  }

  return (
    <div className="overlay-backdrop" role="alertdialog" aria-modal="true">
      <div className="overlay-panel conflict-panel">
        <div style={{ fontSize: '44px', marginBottom: '12px', animation: 'wriggle 0.6s infinite alternate' }}>
          ⚠️
        </div>
        <h2 className="overlay-title" style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '12px' }}>
          AUF ANDEREM GERÄT ANGEMELDET
        </h2>
        <p style={{ color: '#eee', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '16px' }}>
          Es darf <strong>nicht gleichzeitig auf zwei Geräten</strong> mit demselben Account gespielt werden.
        </p>
        <div style={{
          background: 'rgba(255, 77, 77, 0.1)',
          border: '1px solid rgba(255, 77, 77, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#ff9999',
          fontSize: '0.72rem',
          marginBottom: '20px'
        }}>
          {conflictReason}
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', minHeight: '44px', fontSize: '0.6rem' }}
          onClick={handleDismiss}
        >
          VERSTANDEN / ERNEUT ANMELDEN
        </button>
      </div>
    </div>
  );
}
