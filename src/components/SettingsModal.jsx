import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../lib/auth.js';
import { getCachedSettings, saveUserSettings, DEFAULT_SETTINGS } from '../lib/userSettings.js';

// Retro Arcade Toggle Switch Component
function ArcadeToggle({ label, desc, checked, onChange, activeColor = '#39ff14' }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: '#161616',
        borderRadius: '8px',
        border: `1px solid ${checked ? activeColor : '#2c2c2c'}`,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <div>
        <div style={{ fontSize: '0.72rem', color: '#f0f0f0', fontWeight: 'bold' }}>{label}</div>
        {desc && <div style={{ fontSize: '0.55rem', color: 'var(--muted)', marginTop: '2px' }}>{desc}</div>}
      </div>

      <div
        style={{
          width: '52px',
          height: '26px',
          background: checked ? activeColor : '#222',
          borderRadius: '13px',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: checked ? `0 0 10px ${activeColor}88` : 'none',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: checked ? '8px' : 'auto',
            right: checked ? 'auto' : '8px',
            fontSize: '0.38rem',
            fontFamily: 'var(--font-pixel)',
            fontWeight: 'bold',
            color: checked ? '#000' : '#777',
            pointerEvents: 'none',
          }}
        >
          {checked ? 'AN' : 'AUS'}
        </span>
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: checked ? '#0a0a0a' : '#888',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            transition: 'all 0.15s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }) {
  const currentUser = getCurrentUser();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedMsg, setSavedMsg] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const current = getCachedSettings(currentUser?.username || 'gast');
      setSettings(current);
      setSavedMsg(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  async function updateSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);

    // Sofort live anwenden & im Hintergrund synchronisieren (Cloud oder Lokal)
    await saveUserSettings(currentUser?.username || 'gast', { [key]: value });

    setSavedMsg(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSavedMsg(false), 1800);
  }

  async function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    await saveUserSettings(currentUser?.username || 'gast', DEFAULT_SETTINGS);
    setSavedMsg(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Einstellungen" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="overlay-panel settings-panel" style={{ maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="overlay-title" style={{ color: 'var(--accent)', fontSize: '0.85rem', margin: 0 }}>
              ⚙️ EINSTELLUNGEN
            </h2>
            {savedMsg && (
              <span style={{
                fontSize: '0.42rem',
                fontFamily: 'var(--font-pixel)',
                color: '#39ff14',
                background: 'rgba(57, 255, 20, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #39ff14',
                animation: 'pulse 1s ease',
              }}>
                ✓ GESPEICHERT
              </span>
            )}
          </div>
          <button
            className="btn btn-outline"
            style={{ minHeight: '30px', padding: '3px 10px', fontSize: '0.45rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Sync Info Banner */}
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
            {currentUser ? `👑 Eingeloggt als ${currentUser.username} • Cloud-Sync aktiv` : '👤 Gast-Modus • Einstellungen lokal im Browser'}
          </span>
          <span style={{ fontSize: '0.45rem', background: '#252525', color: '#39ff14', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-pixel)' }}>
            AUTO-SAVE AKTIV
          </span>
        </div>

        {/* 1. AUDIO & SOUND */}
        <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: 'var(--accent)', margin: '0 0 10px 0' }}>
            🔊 AUDIO & SOUND-EFFEKTE
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ArcadeToggle
              label="Sound-Effekte & Musik"
              desc="Piepser, Chimes, Fanfaren & Münz-Sounds"
              checked={settings.soundEnabled}
              onChange={(val) => updateSetting('soundEnabled', val)}
            />

            <div style={{ background: '#161616', padding: '10px 12px', borderRadius: '8px', border: '1px solid #2c2c2c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#bbb', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#eee' }}>Lautstärke</span>
                <span style={{ fontFamily: 'var(--font-pixel)', color: 'var(--accent)' }}>
                  {Math.round((settings.volume ?? 0.8) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume ?? 0.8}
                onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
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
            <ArcadeToggle
              label="CRT-Scanlines & Röhrenmonitor-Filter"
              desc="Authentischer Arcade-Glüheffekt und Scanlines"
              checked={settings.retroCrt}
              onChange={(val) => updateSetting('retroCrt', val)}
              activeColor="#00e5ff"
            />

            <ArcadeToggle
              label="Reduzierte Animationen (Motion Safe)"
              desc="Schaltet intensive Flashes und Wackeln ab"
              checked={settings.reducedMotion}
              onChange={(val) => updateSetting('reducedMotion', val)}
              activeColor="#00e5ff"
            />
          </div>
        </div>

        {/* 3. ZAHLEN-FORMATIERUNG */}
        <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: '#ffd700', margin: '0 0 10px 0' }}>
            🔢 ZAHLEN-DARSTELLUNG
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {[
              { id: 'short', label: 'Kurz (1,5 Mio.)' },
              { id: 'full', label: 'Voll (1.500.000)' },
              { id: 'scientific', label: 'Wiss. (1,5e6)' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`btn ${settings.numberFormat === opt.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 4px', fontSize: '0.42rem', minHeight: '34px' }}
                onClick={() => updateSetting('numberFormat', opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. CASINO & KLICKER */}
        <div className="settings-group" style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #252525', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: '#ff4d6d', margin: '0 0 10px 0' }}>
            🎰 CASINO & CLICKER
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '6px' }}>
                STANDARD CASINO-WÄHRUNG:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'cookies', label: '🍪 COOKIES' },
                  { id: 'gems', label: '💎 DIAMANTEN (VIP)' },
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn ${settings.casinoDefaultCurrency === c.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '8px 4px', fontSize: '0.45rem', minHeight: '34px' }}
                    onClick={() => updateSetting('casinoDefaultCurrency', c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <ArcadeToggle
              label="Schwebende Klick-Zahlen (+X Cookies)"
              desc="Zeigt animierte Zahlen beim Klick an"
              checked={settings.clickerNumbers}
              onChange={(val) => updateSetting('clickerNumbers', val)}
              activeColor="#ff4d6d"
            />

            <ArcadeToggle
              label="Krümel-Partikel beim Keks-Klick"
              desc="Spritzende Teig-Partikel rund um den Cookie"
              checked={settings.clickerParticles}
              onChange={(val) => updateSetting('clickerParticles', val)}
              activeColor="#ff4d6d"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: '0.45rem', borderColor: '#444', color: '#888' }}
            onClick={handleReset}
          >
            🔄 STANDARD
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '8px 24px', fontSize: '0.52rem' }}
            onClick={onClose}
          >
            FERTIG (SCHLIESSEN)
          </button>
        </div>
      </div>
    </div>
  );
}
