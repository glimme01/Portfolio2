import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/auth.js';
import { getCachedSettings, saveUserSettings, DEFAULT_SETTINGS } from '../lib/userSettings.js';

export default function SettingsModal({ isOpen, onClose }) {
  const currentUser = getCurrentUser();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getCachedSettings(currentUser?.username || 'gast');
      setSettings(current);
      setSavedMsg(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  async function handleSave(e) {
    if (e) e.preventDefault();
    setSaving(true);
    await saveUserSettings(currentUser?.username || 'gast', settings);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Einstellungen">
      <div className="overlay-panel settings-panel" style={{ maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 className="overlay-title" style={{ color: 'var(--accent)', fontSize: '0.85rem', margin: 0 }}>
            ⚙️ EINSTELLUNGEN
          </h2>
          <button className="btn btn-outline" style={{ minHeight: '30px', padding: '3px 8px', fontSize: '0.45rem' }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{
          background: currentUser ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${currentUser ? 'rgba(255, 215, 0, 0.3)' : '#333'}`,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '0.62rem',
          color: currentUser ? '#ffd700' : 'var(--muted)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>
            {currentUser ? `👑 Eingeloggt als ${currentUser.username} &bull; Cloud-Sync aktiv` : '👤 Gast-Modus &bull; Einstellungen lokal im Browser'}
          </span>
          {currentUser && <span style={{ fontSize: '0.45rem', background: '#333', padding: '2px 6px', borderRadius: '4px' }}>CLOUD</span>}
        </div>

        {savedMsg && (
          <div style={{
            background: 'rgba(57, 255, 20, 0.15)',
            border: '1px solid #39ff14',
            color: '#39ff14',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            marginBottom: '14px',
            textAlign: 'center',
          }}>
            ✅ Einstellungen erfolgreich gespeichert!
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* 1. AUDIO & SOUND */}
          <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: 'var(--accent)', margin: '0 0 10px 0' }}>
              🔊 AUDIO & SOUND-EFFEKTE
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.72rem', color: '#eee' }}>Sound-Effekte aktivieren</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings(s => ({ ...s, soundEnabled: e.target.checked }))}
                />
              </label>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#bbb', marginBottom: '4px' }}>
                  <span>Lautstärke</span>
                  <span>{Math.round((settings.volume ?? 0.8) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume ?? 0.8}
                  onChange={(e) => setSettings(s => ({ ...s, volume: parseFloat(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>

          {/* 2. GRAFIK & RETRO EFFEKTE */}
          <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: '#00e5ff', margin: '0 0 10px 0' }}>
              📺 RETRO-GRAFIK & FILTER
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.72rem', color: '#eee' }}>CRT-Scanlines & Röhreneffekt</span>
                <input
                  type="checkbox"
                  checked={settings.retroCrt}
                  onChange={(e) => setSettings(s => ({ ...s, retroCrt: e.target.checked }))}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.72rem', color: '#eee' }}>Reduzierte Animationen (Motion Safe)</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => setSettings(s => ({ ...s, reducedMotion: e.target.checked }))}
                />
              </label>
            </div>
          </div>

          {/* 3. ZAHLEN-FORMATIERUNG */}
          <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: '#ffd700', margin: '0 0 10px 0' }}>
              🔢 ZAHLEN-DARSTELLUNG
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { id: 'short', label: 'Kurz (1,5 M)' },
                { id: 'full', label: 'Voll (1.500.000)' },
                { id: 'scientific', label: 'Wiss. (1,5e6)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`btn ${settings.numberFormat === opt.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 4px', fontSize: '0.42rem', minHeight: '30px' }}
                  onClick={() => setSettings(s => ({ ...s, numberFormat: opt.id }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. CASINO & KLICKER */}
          <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: '#ff4d6d', margin: '0 0 10px 0' }}>
              🎰 CASINO & CLICKER
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '4px' }}>
                  STANDARD CASINO-WÄHRUNG:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'cookies', label: '🍪 COOKIES' },
                    { id: 'heavenlyChips', label: '✨ CHIPS' },
                    { id: 'gems', label: '💎 GEMS' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`btn ${settings.casinoDefaultCurrency === c.id ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 4px', fontSize: '0.42rem', minHeight: '30px' }}
                      onClick={() => setSettings(s => ({ ...s, casinoDefaultCurrency: c.id }))}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#eee' }}>Schwebende Klick-Zahlen anzeigen</span>
                <input
                  type="checkbox"
                  checked={settings.clickerNumbers}
                  onChange={(e) => setSettings(s => ({ ...s, clickerNumbers: e.target.checked }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#eee' }}>Partikel-Effekte beim Keks-Klick</span>
                <input
                  type="checkbox"
                  checked={settings.clickerParticles}
                  onChange={(e) => setSettings(s => ({ ...s, clickerParticles: e.target.checked }))}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '8px 12px', fontSize: '0.45rem' }}
              onClick={handleReset}
            >
              🔄 STANDARD
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '8px 12px', fontSize: '0.45rem' }}
                onClick={onClose}
              >
                ABBRECHEN
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.52rem' }}
                disabled={saving}
              >
                {saving ? 'SPEICHERN...' : '💾 SPEICHERN'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
