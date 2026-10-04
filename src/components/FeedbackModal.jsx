import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentUser } from '../lib/auth.js';
import { getLastName } from '../lib/prefs.js';
import { submitFeedback } from '../lib/feedback.js';

const TYPE_OPTIONS = [
  { id: 'bug', label: '🐛 BUG / FEHLER', placeholder: 'Was ist passiert? Welches Verhalten hast du beobachtet?' },
  { id: 'suggestion', label: '💡 IDEE / VORSCHLAG', placeholder: 'Welches neue Feature, Spiel oder Verbesserung wünschst du dir?' },
  { id: 'feedback', label: '💬 LOB & FEEDBACK', placeholder: 'Was gefällt dir besonders gut oder was können wir noch verbessern?' },
];

const GAME_OPTIONS = [
  { id: 'general', label: '🌐 Allgemein / Gesamte Website' },
  { id: 'clicker', label: '🍪 Keks-Clicker & Börse' },
  { id: 'slots', label: '🎰 Slot-Automat' },
  { id: 'blackjack', label: '🃏 Blackjack' },
  { id: 'snake', label: '🐍 Snake' },
  { id: 'press', label: '🔨 Press (Reaktion)' },
  { id: 'leaderboard', label: '🏆 Rangliste' },
  { id: 'auth', label: '🔑 Login / Account' },
];

function detectGameFromPath(pathname) {
  if (pathname.includes('/clicker')) return 'clicker';
  if (pathname.includes('/slots')) return 'slots';
  if (pathname.includes('/blackjack')) return 'blackjack';
  if (pathname.includes('/snake')) return 'snake';
  if (pathname.includes('/press')) return 'press';
  if (pathname.includes('/leaderboard')) return 'leaderboard';
  return 'general';
}

export default function FeedbackModal({ isOpen, onClose }) {
  const location = useLocation();
  const [type, setType] = useState('bug');
  const [game, setGame] = useState('general');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const user = getCurrentUser();
      const detectedName = user ? user.username : (getLastName() || '');
      setName(detectedName);
      setGame(detectGameFromPath(location.pathname));
      setError('');
      setSubmitted(false);
      setMessage('');
    }
  }, [isOpen, location.pathname]);

  if (!isOpen) return null;

  const currentOption = TYPE_OPTIONS.find(t => t.id === type) || TYPE_OPTIONS[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (message.trim().length < 3) {
      setError('Bitte gib eine aussagekräftige Nachricht ein (mind. 3 Zeichen).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitFeedback({
        name: name.trim() || 'Anonym',
        type,
        game,
        message: message.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      setError(err.message || 'Fehler beim Senden. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Feedback und Bug-Report">
      <div className="overlay-panel feedback-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 className="overlay-title" style={{ fontSize: '0.85rem', color: 'var(--accent)', margin: 0 }}>
            💬 FEEDBACK & BUG-REPORT
          </h2>
          <button
            className="btn btn-outline"
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.5rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 10px',
            animation: 'fade-in 0.3s ease',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚀</div>
            <h3 style={{ color: '#39ff14', fontSize: '0.8rem', marginBottom: '8px' }}>
              VIELEN DANK!
            </h3>
            <p style={{ color: 'var(--text)', fontSize: '0.8rem', lineHeight: '1.5' }}>
              Deine Nachricht wurde erfolgreich an Moritz übermittelt und ist direkt im Admin-Dashboard sichtbar!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '16px' }}>
              Hast du einen Bug gefunden oder eine coole Idee für die Arcade? Schreib es uns hier:
            </p>

            {/* Typ-Auswahl */}
            <div className="auth-tabs" style={{ marginBottom: '16px' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  className={`auth-tab-btn ${type === opt.id ? 'active' : ''}`}
                  onClick={() => setType(opt.id)}
                  style={{ fontSize: '0.45rem', padding: '8px 4px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Bereich / Spiel */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)', marginBottom: '6px' }}>
                BEREICH / SPIEL:
              </label>
              <select
                className="feedback-select"
                value={game}
                onChange={e => setGame(e.target.value)}
              >
                {GAME_OPTIONS.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)', marginBottom: '6px' }}>
                DEIN NAME (OPTIONAL):
              </label>
              <input
                type="text"
                className="feedback-input"
                placeholder="Anonym (oder dein Spielername)"
                value={name}
                maxLength={24}
                onChange={e => setName(e.target.value)}
              />
            </div>

            {/* Nachricht */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)' }}>
                  BESCHREIBUNG:
                </label>
                <span style={{ fontSize: '0.65rem', color: message.length > 900 ? 'var(--danger)' : 'var(--muted)' }}>
                  {message.length} / 1000
                </span>
              </div>
              <textarea
                className="feedback-textarea"
                rows={4}
                required
                maxLength={1000}
                placeholder={currentOption.placeholder}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 68, 68, 0.15)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                marginBottom: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, minHeight: '38px', fontSize: '0.52rem' }}
                onClick={onClose}
                disabled={loading}
              >
                ABBRECHEN
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, minHeight: '38px', fontSize: '0.52rem' }}
                disabled={loading || message.trim().length === 0}
              >
                {loading ? 'WIRD GESENDET...' : 'ABSENDEN 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
