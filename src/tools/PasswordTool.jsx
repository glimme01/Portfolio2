// src/tools/PasswordTool.jsx
// Passwort-Generator mit crypto.getRandomValues, Entropieberechnung und Mehrfach-Modus

import React, { useState, useEffect, useCallback } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconPassword, IconRefresh } from '../components/Icons';
import CopyButton from '../components/CopyButton';

const CHAR_SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~',
};

export default function PasswordTool() {
  usePageMeta(
    'Passwort-Generator',
    'Erzeuge kryptografisch sichere Zufallspasswörter. Mit Entropie-Bewertung, Mehrfachmodus und 100% lokaler Web Crypto API.'
  );

  const [length, setLength] = useState(16);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [multiMode, setMultiMode] = useState(false); // 5 Passwörter auf einmal

  const [passwords, setPasswords] = useState([]);

  // Sicheres Passwort via crypto.getRandomValues
  const generateOnePassword = useCallback((len, options) => {
    let pool = '';
    const guaranteed = [];

    if (options.useLower) {
      pool += CHAR_SETS.lower;
      const r = new Uint32Array(1);
      window.crypto.getRandomValues(r);
      guaranteed.push(CHAR_SETS.lower[r[0] % CHAR_SETS.lower.length]);
    }
    if (options.useUpper) {
      pool += CHAR_SETS.upper;
      const r = new Uint32Array(1);
      window.crypto.getRandomValues(r);
      guaranteed.push(CHAR_SETS.upper[r[0] % CHAR_SETS.upper.length]);
    }
    if (options.useNumbers) {
      pool += CHAR_SETS.numbers;
      const r = new Uint32Array(1);
      window.crypto.getRandomValues(r);
      guaranteed.push(CHAR_SETS.numbers[r[0] % CHAR_SETS.numbers.length]);
    }
    if (options.useSymbols) {
      pool += CHAR_SETS.symbols;
      const r = new Uint32Array(1);
      window.crypto.getRandomValues(r);
      guaranteed.push(CHAR_SETS.symbols[r[0] % CHAR_SETS.symbols.length]);
    }

    if (!pool) return '';

    const remainingLength = Math.max(0, len - guaranteed.length);
    const randomBytes = new Uint32Array(remainingLength);
    window.crypto.getRandomValues(randomBytes);

    const chars = [...guaranteed];
    for (let i = 0; i < remainingLength; i++) {
      chars.push(pool[randomBytes[i] % pool.length]);
    }

    // Fisher-Yates Shuffle mit crypto.getRandomValues
    const shuffleBytes = new Uint32Array(chars.length);
    window.crypto.getRandomValues(shuffleBytes);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }, []);

  // Passwörter neu erzeugen
  const generatePasswords = useCallback(() => {
    const opts = { useLower, useUpper, useNumbers, useSymbols };
    const count = multiMode ? 5 : 1;
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(generateOnePassword(length, opts));
    }
    setPasswords(list);
  }, [length, useLower, useUpper, useNumbers, useSymbols, multiMode, generateOnePassword]);

  useEffect(() => {
    generatePasswords();
  }, [generatePasswords]);

  // Entropie berechnen in Bits: L * log2(Poolgröße)
  const poolSize = (useLower ? 26 : 0) + (useUpper ? 26 : 0) + (useNumbers ? 10 : 0) + (useSymbols ? 32 : 0);
  const entropy = poolSize > 0 ? Math.round(length * (Math.log(poolSize) / Math.log(2))) : 0;

  // Stärke-Einstufung
  let strengthLabel = 'Sehr schwach';
  let strengthColor = 'var(--danger-red)';
  let strengthWidth = '25%';
  let strengthDesc = 'Dieses Passwort bietet kaum Schutz vor automatisierten Wörterbuch-Angriffen.';

  if (entropy >= 90) {
    strengthLabel = 'Exzellent';
    strengthColor = '#059669';
    strengthWidth = '100%';
    strengthDesc = 'Höchste Sicherheitsstufe — selbst Supercomputer bräuchten Milliarden Jahre zum Entschlüsseln.';
  } else if (entropy >= 70) {
    strengthLabel = 'Stark';
    strengthColor = 'var(--success-green)';
    strengthWidth = '75%';
    strengthDesc = 'Sehr robuster Schutz für alle wichtigen Konten wie E-Mail oder Online-Banking.';
  } else if (entropy >= 50) {
    strengthLabel = 'Mittel';
    strengthColor = 'var(--warning-amber)';
    strengthWidth = '50%';
    strengthDesc = 'Ausreichend für unkritische Logins, aber für sensible Daten sollte es länger sein.';
  }

  const primaryPassword = passwords[0] || '';

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconPassword width={28} height={28} />
            </div>
            <div>
              <h1>PASSWORT-GENERATOR</h1>
              <p className="tool-page-desc">Kryptografisch zufällige Passwörter — verlässt nie dein Gerät.</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Haupt-Anzeige bei Einzelmodus */}
      {!multiMode ? (
        <div className="card" style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DEIN SICHERES PASSWORT</label>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subtle)',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              margin: '8px 0 16px 0',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
              fontWeight: 700,
              minHeight: '64px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {primaryPassword || 'Bitte mindestens einen Zeichensatz wählen'}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={generatePasswords}
              style={{ flex: '1 1 160px' }}
            >
              <IconRefresh width={18} height={18} />
              NEU GENERIEREN
            </button>
            <CopyButton
              textToCopy={primaryPassword}
              label="PASSWORT KOPIEREN"
              copiedLabel="KOPIERT!"
            />
          </div>

          <hr className="dashed-divider" />

          {/* Entropie & Ampel */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                SICHERHEIT: <span style={{ color: strengthColor }}>{strengthLabel.toUpperCase()}</span>
              </span>
              <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {entropy} Bits Entropie
              </span>
            </div>

            <div className="traffic-light-bar">
              <div
                className="traffic-segment"
                style={{ width: strengthWidth, backgroundColor: strengthColor }}
              />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              {strengthDesc}
            </p>
          </div>
        </div>
      ) : (
        /* 5 Passwörter auf einmal */
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>5 PASSWÖRTER AUF EINMAL</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={generatePasswords}>
              <IconRefresh width={16} height={16} />
              ALLE NEU
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {passwords.map((pw, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: 'var(--border-width-sm) solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                }}
              >
                <span className="font-mono" style={{ fontWeight: 700, fontSize: '1rem', wordBreak: 'break-all' }}>
                  {pw}
                </span>
                <CopyButton
                  textToCopy={pw}
                  label="KOPIEREN"
                  copiedLabel="KOPIERT!"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Einstellungen */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>EINSTELLUNGEN</h3>

        {/* Modus-Umschalter */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginBottom: '8px', display: 'block' }}>ANZEIGE-MODUS</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`chip ${!multiMode ? 'active' : ''}`}
              onClick={() => setMultiMode(false)}
            >
              Einzelnes Passwort
            </button>
            <button
              type="button"
              className={`chip ${multiMode ? 'active' : ''}`}
              onClick={() => setMultiMode(true)}
            >
              5 Passwörter auf einmal
            </button>
          </div>
        </div>

        {/* Längen-Schieberegler */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="pw-length">Länge: {length} Zeichen</label>
            <span className="font-mono text-muted" style={{ fontSize: '0.85rem' }}>8 bis 64</span>
          </div>
          <input
            id="pw-length"
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value, 10))}
          />
        </div>

        {/* Schnellauswahl-Längen */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[12, 16, 20, 24, 32].map((len) => (
            <button
              key={len}
              type="button"
              className={`chip ${length === len ? 'active' : ''}`}
              onClick={() => setLength(len)}
            >
              {len} Zeichen
            </button>
          ))}
        </div>

        {/* Zeichensatz-Optionen */}
        <div className="form-group">
          <label>Zeichensätze</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
              />
              <span>Großbuchstaben (A-Z)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
              />
              <span>Kleinbuchstaben (a-z)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useNumbers}
                onChange={(e) => setUseNumbers(e.target.checked)}
              />
              <span>Zahlen (0-9)</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
              />
              <span>Sonderzeichen (!@#$...)</span>
            </label>
          </div>
        </div>

        <div className="panel-subtle" style={{ marginTop: '16px' }}>
          <strong style={{ fontSize: '0.85rem' }}>Datenschutz-Garantie:</strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Die Zufallsgenerierung nutzt die hardwarebeschleunigte <code>crypto.getRandomValues()</code>-Schnittstelle deines Browsers. Kein einziges erstelltes Passwort wird über das Internet übertragen oder irgendwo gespeichert.
          </p>
        </div>
      </div>
    </div>
  );
}
