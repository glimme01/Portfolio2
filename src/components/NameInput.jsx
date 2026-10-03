import React, { useState, useEffect } from 'react';
import { getLastName, setLastName } from '../lib/prefs.js';

// Name-Eingabe-Feld: max 16 Zeichen, merkt letzten Namen, validiert
export default function NameInput({ value, onChange, label = 'DEIN NAME' }) {
  // Beim ersten Render: letzten Namen laden wenn kein Wert
  useEffect(() => {
    if (!value) {
      const saved = getLastName();
      if (saved) onChange(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e) {
    const raw = e.target.value;
    // Nur alphanumerisch + Leerzeichen + Sonderzeichen, max 16 Zeichen
    const clean = raw.slice(0, 16);
    onChange(clean);
    setLastName(clean);
  }

  const isValid = value.trim().length >= 1;

  return (
    <div className="name-input-wrap">
      <label className="name-input-label" htmlFor="name-input-field">{label}</label>
      <input
        id="name-input-field"
        className="name-input"
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="MAX 16 ZEICHEN"
        maxLength={16}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label="Spielername eingeben"
      />
      <span className="name-input-hint">{value.length}/16 Zeichen</span>
      {value.length > 0 && !isValid && (
        <span style={{ color: 'var(--danger)', fontSize: '0.65rem' }}>Kein Leerzeichen am Anfang</span>
      )}
    </div>
  );
}
