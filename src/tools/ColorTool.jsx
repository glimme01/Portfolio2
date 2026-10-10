// src/tools/ColorTool.jsx
// Farbe-Picker: Hex, RGB, HSL Umrechnung, WCAG Kontrastprüfung & lokale Palette mit Export

import React, { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconColor, IconPlus, IconTrash } from '../components/Icons';
import CopyButton from '../components/CopyButton';

// Farbumrechnungs-Hilfsfunktionen
function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(lum1, lum2) {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

export default function ColorTool() {
  usePageMeta(
    'Farbe-Picker & Kontrast',
    'Hex, RGB und HSL Farbkonverter mit WCAG Kontrastprüfung, Farbpaletten-Speicher und CSS-Export.'
  );

  const [hexInput, setHexInput] = useState('#FF5B00');
  const [rgbState, setRgbState] = useState({ r: 255, g: 91, b: 0 });

  // Palette aus localStorage (max 12 Farben)
  const [palette, setPalette] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_color_palette');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return ['#FF5B00', '#111111', '#FAF8F5', '#FFD400', '#10B981', '#3B82F6'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mf_tools_color_palette', JSON.stringify(palette));
    } catch (e) {
      console.warn(e);
    }
  }, [palette]);

  // Hex-Änderung verarbeiten
  const handleHexChange = (val) => {
    setHexInput(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      setRgbState(parsed);
    }
  };

  // RGB-Änderung verarbeiten
  const handleRgbChange = (channel, val) => {
    const num = Math.max(0, Math.min(255, parseInt(val, 10) || 0));
    const nextRgb = { ...rgbState, [channel]: num };
    setRgbState(nextRgb);
    setHexInput(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  // HSL berechnen
  const hsl = useMemo(() => {
    return rgbToHsl(rgbState.r, rgbState.g, rgbState.b);
  }, [rgbState]);

  // Kontraste berechnen
  const contrastInfo = useMemo(() => {
    const lum = getLuminance(rgbState.r, rgbState.g, rgbState.b);
    const whiteLum = 1.0;
    const blackLum = 0.0;

    const ratioOnWhite = getContrastRatio(lum, whiteLum);
    const ratioOnBlack = getContrastRatio(lum, blackLum);

    const getWcagRating = (ratio) => {
      if (ratio >= 7.0) return { label: 'AAA (Exzellent)', badge: 'badge-marker' };
      if (ratio >= 4.5) return { label: 'AA (Gut lesbar)', badge: 'badge-offline' };
      if (ratio >= 3.0) return { label: 'AA Groß (Nur große Schrift)', badge: 'badge-offline' };
      return { label: 'Nicht empfohlen (Gering)', badge: 'badge' };
    };

    return {
      ratioWhite: ratioOnWhite.toFixed(2),
      ratioBlack: ratioOnBlack.toFixed(2),
      ratingWhite: getWcagRating(ratioOnWhite),
      ratingBlack: getWcagRating(ratioOnBlack),
    };
  }, [rgbState]);

  // Palette-Aktionen
  const addColorToPalette = () => {
    const currentHex = rgbToHex(rgbState.r, rgbState.g, rgbState.b);
    if (!palette.includes(currentHex) && palette.length < 12) {
      setPalette([...palette, currentHex]);
    }
  };

  const removeColorFromPalette = (col) => {
    setPalette(palette.filter((c) => c !== col));
  };

  // Palette als Text exportieren
  const paletteCssExport = useMemo(() => {
    return palette.map((col, idx) => `  --color-${idx + 1}: ${col};`).join('\n');
  }, [palette]);

  const currentHexClean = rgbToHex(rgbState.r, rgbState.g, rgbState.b);
  const rgbString = `rgb(${rgbState.r}, ${rgbState.g}, ${rgbState.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconColor width={28} height={28} />
            </div>
            <div>
              <h1>FARBE-PICKER & KONTRAST</h1>
              <p className="tool-page-desc">Hex, RGB, HSL Farbumrechner mit barrierefreier WCAG-Kontrastprüfung.</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Große Farb-Vorschau */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div
          style={{
            height: '140px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: currentHexClean,
            border: 'var(--border-width) solid var(--border-color)',
            boxShadow: 'var(--shadow-offset)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.1s ease',
          }}
        >
          <span
            className="font-mono"
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffffff',
              border: '2px solid #111',
              borderRadius: '6px',
              fontWeight: 900,
              fontSize: '1.2rem',
              color: '#111111',
              boxShadow: '3px 3px 0 #111',
            }}
          >
            {currentHexClean}
          </span>
        </div>

        {/* Farbwähler & Hex Input */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center' }}>
          <input
            type="color"
            value={currentHexClean}
            onChange={(e) => handleHexChange(e.target.value)}
            style={{ width: '60px', height: '52px', cursor: 'pointer', padding: '2px' }}
            title="System-Farbpicker öffnen"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#FF5B00"
            className="font-mono"
            style={{ fontWeight: 700, fontSize: '1.1rem' }}
          />
        </div>

        {/* RGB Schieberegler */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
            RGB-KANÄLE
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['r', 'g', 'b'].map((ch) => (
              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="font-mono" style={{ width: '20px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {ch}:
                </span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgbState[ch]}
                  onChange={(e) => handleRgbChange(ch, e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgbState[ch]}
                  onChange={(e) => handleRgbChange(ch, e.target.value)}
                  style={{ width: '70px', minHeight: '38px', padding: '4px 8px' }}
                />
              </div>
            ))}
          </div>
        </div>

        <hr className="dashed-divider" />

        {/* Formate & Schnell-Kopieren */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1.5px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HEX: </span>
              <strong className="font-mono">{currentHexClean}</strong>
            </div>
            <CopyButton textToCopy={currentHexClean} label="KOPIEREN" size="sm" />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1.5px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RGB: </span>
              <strong className="font-mono">{rgbString}</strong>
            </div>
            <CopyButton textToCopy={rgbString} label="KOPIEREN" size="sm" />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1.5px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HSL: </span>
              <strong className="font-mono">{hslString}</strong>
            </div>
            <CopyButton textToCopy={hslString} label="KOPIEREN" size="sm" />
          </div>
        </div>
      </div>

      {/* WCAG Kontrastprüfung */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>WCAG KONTRASTPRÜFUNG</h3>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
          Gemäß den Richtlinien für barrierefreie Web-Inhalte (WCAG 2.1).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Auf Weiß */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: currentHexClean,
            }}
          >
            <div style={{ color: '#111', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
              AUF WEISS (#FFFFFF)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', lineHeight: 1.2 }}>
              Beispiel-Text
            </div>
            <div style={{ color: '#111', fontSize: '0.85rem' }}>
              Kontrast-Ratio: <strong>{contrastInfo.ratioWhite}:1</strong>
            </div>
            <span className={`badge ${contrastInfo.ratingWhite.badge}`} style={{ marginTop: '8px' }}>
              {contrastInfo.ratingWhite.label}
            </span>
          </div>

          {/* Auf Schwarz */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#111111',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: currentHexClean,
            }}
          >
            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
              AUF SCHWARZ (#000000)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', lineHeight: 1.2 }}>
              Beispiel-Text
            </div>
            <div style={{ color: '#fff', fontSize: '0.85rem' }}>
              Kontrast-Ratio: <strong>{contrastInfo.ratioBlack}:1</strong>
            </div>
            <span className={`badge ${contrastInfo.ratingBlack.badge}`} style={{ marginTop: '8px' }}>
              {contrastInfo.ratingBlack.label}
            </span>
          </div>
        </div>
      </div>

      {/* Palette speichern & Exportieren */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>DEINE FARBPALETTE ({palette.length}/12)</h3>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={addColorToPalette}
            disabled={palette.length >= 12 || palette.includes(currentHexClean)}
          >
            <IconPlus width={16} height={16} />
            FARBE SPEICHERN
          </button>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {palette.map((col) => (
            <div
              key={col}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: 'var(--border-width-sm) solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '2px 2px 0 var(--border-color)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => handleHexChange(col)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  boxShadow: 'none',
                  padding: '6px 10px',
                  minHeight: 'auto',
                  cursor: 'pointer',
                  transform: 'none',
                }}
                title="Klicken zum Laden & Kopieren"
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    backgroundColor: col,
                    border: '1px solid #111',
                    display: 'inline-block',
                  }}
                />
                <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {col}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeColorFromPalette(col)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderLeft: '1px solid #ddd',
                  boxShadow: 'none',
                  padding: '6px 8px',
                  minHeight: 'auto',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  transform: 'none',
                }}
                title="Farbe entfernen"
              >
                <IconTrash width={12} height={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Export Palette */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
            PALETTE ALS CSS EXPORTIEREN
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              readOnly
              rows={4}
              value={`:root {\n${paletteCssExport}\n}`}
              className="font-mono"
              style={{ fontSize: '0.85rem', backgroundColor: 'var(--bg-subtle)' }}
            />
            <div style={{ marginTop: '8px' }}>
              <CopyButton
                textToCopy={`:root {\n${paletteCssExport}\n}`}
                label="CSS KOPIEREN"
                copiedLabel="CSS KOPIERT!"
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
