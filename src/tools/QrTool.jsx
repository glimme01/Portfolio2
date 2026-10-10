// src/tools/QrTool.jsx
// QR-Code Generator: Live-Generierung, Farbkonfiguration, Kontrast-Warnung, PNG-Download

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconQr, IconDownload } from '../components/Icons';
import CopyButton from '../components/CopyButton';

export default function QrTool() {
  usePageMeta(
    'QR-Code-Generator',
    'Erstelle QR-Codes für Links oder Texte kostenlos & offline. Wähle Größe und Farben, mit direktem PNG-Download.'
  );

  const [text, setText] = useState('https://moritzfreund.de/tools');
  const [size, setSize] = useState(512); // 256, 512, 1024
  const [darkColor, setDarkColor] = useState('#111111');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [errorMsg, setErrorMsg] = useState('');
  const [contrastWarning, setContrastWarning] = useState(false);

  const canvasRef = useRef(null);

  // Einfache relative Luminanz zur Kontrastberechnung (WCAG)
  const getLuminance = (hex) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const checkContrast = (c1, c2) => {
    try {
      const l1 = getLuminance(c1);
      const l2 = getLuminance(c2);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return ratio < 3.5; // Bei unter 3.5:1 Warnung ausgeben
    } catch {
      return false;
    }
  };

  // QR-Code im Canvas neu zeichnen
  useEffect(() => {
    if (!canvasRef.current) return;
    setErrorMsg('');

    const hasLowContrast = checkContrast(darkColor, lightColor);
    setContrastWarning(hasLowContrast);

    if (!text.trim()) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    QRCode.toCanvas(
      canvasRef.current,
      text,
      {
        width: size,
        margin: 2,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          setErrorMsg('QR-Code konnte nicht erzeugt werden (Text eventuell zu lang).');
          console.error(error);
        }
      }
    );
  }, [text, size, darkColor, lightColor]);

  // Download als PNG
  const handleDownload = () => {
    if (!canvasRef.current || !text.trim()) return;
    try {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `qrcode-${size}px-${Date.now()}.png`;
      a.href = url;
      a.click();
    } catch (err) {
      console.error('Download-Fehler', err);
    }
  };

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconQr width={28} height={28} />
            </div>
            <div>
              <h1>QR-CODE-GENERATOR</h1>
              <p className="tool-page-desc">Erstelle hochauflösende QR-Codes ohne Tracking — 100% offline.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        {/* Eingabe-Textfeld */}
        <div className="form-group">
          <label htmlFor="qr-input">Inhalt (Link, Text, Telefonnummer oder WLAN)</label>
          <textarea
            id="qr-input"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z. B. https://deine-website.de oder beliebiger Text"
          />
        </div>

        {/* Größen-Auswahl */}
        <div className="form-group">
          <label>Auflösung für Download</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[256, 512, 1024].map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                {s} × {s} px {s === 512 ? '(Standard)' : s === 1024 ? '(Druckqualität)' : '(Web)'}
              </button>
            ))}
          </div>
        </div>

        {/* Farb-Presets & Farbwahl */}
        <div className="form-group">
          <label>Farbkombination</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              type="button"
              className={`chip ${darkColor === '#111111' && lightColor === '#ffffff' ? 'active' : ''}`}
              onClick={() => {
                setDarkColor('#111111');
                setLightColor('#ffffff');
              }}
            >
              Schwarz auf Weiß
            </button>
            <button
              type="button"
              className={`chip ${darkColor === '#ffffff' && lightColor === '#111111' ? 'active' : ''}`}
              onClick={() => {
                setDarkColor('#ffffff');
                setLightColor('#111111');
              }}
            >
              Weiß auf Dunkel
            </button>
            <button
              type="button"
              className={`chip ${darkColor === '#ff5b00' && lightColor === '#ffffff' ? 'active' : ''}`}
              onClick={() => {
                setDarkColor('#ff5b00');
                setLightColor('#ffffff');
              }}
            >
              Orange auf Weiß
            </button>
            <button
              type="button"
              className={`chip ${darkColor === '#111111' && lightColor === '#ffd400' ? 'active' : ''}`}
              onClick={() => {
                setDarkColor('#111111');
                setLightColor('#ffd400');
              }}
            >
              Schwarz auf Gelb
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="dark-color" style={{ fontSize: '0.75rem' }}>Muster-Farbe</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="dark-color"
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  style={{ width: '48px', height: '44px', padding: '2px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="light-color" style={{ fontSize: '0.75rem' }}>Hintergrund</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="light-color"
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  style={{ width: '48px', height: '44px', padding: '2px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kontrast-Warnung */}
        {contrastWarning && (
          <div
            className="panel-subtle"
            style={{
              backgroundColor: 'var(--warning-amber-light)',
              borderColor: 'var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <strong style={{ color: '#b45309' }}>Achtung — Geringer Kontrast!</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Der Farbunterschied zwischen Muster und Hintergrund ist sehr gering. Manche Kameras oder Smartphones könnten Probleme beim Scannen haben.
            </p>
          </div>
        )}

        {/* Fehler-Meldung */}
        {errorMsg && (
          <div
            className="panel-subtle"
            style={{ backgroundColor: 'var(--danger-red-light)', marginBottom: '16px' }}
          >
            <strong style={{ color: 'var(--danger-red)' }}>{errorMsg}</strong>
          </div>
        )}

        <hr className="dashed-divider" />

        {/* Vorschau & Download */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              padding: '16px',
              backgroundColor: lightColor,
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-offset)',
              maxWidth: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                width: 'auto',
                height: 'auto',
                display: text.trim() ? 'block' : 'none',
              }}
            />
            {!text.trim() && (
              <p className="text-muted" style={{ padding: '30px' }}>
                Gib oben einen Text oder Link ein, um die Vorschau zu sehen.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={!text.trim()}
              style={{ flex: '1 1 200px' }}
            >
              <IconDownload width={20} height={20} />
              PNG HERUNTERLADEN ({size}px)
            </button>
            <CopyButton
              textToCopy={text}
              label="TEXT KOPIEREN"
              copiedLabel="TEXT KOPIERT!"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
