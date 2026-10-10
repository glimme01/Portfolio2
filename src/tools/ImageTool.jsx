// src/tools/ImageTool.jsx
// Bild-Werkzeuge: Tab "VERKLEINERN" (Kompressor) & Tab "UMWANDELN" (Format-Konverter)
// 100% clientseitig im Browser via HTML5 Canvas

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  IconImageCompress,
  IconImageConvert,
  IconDownload,
  IconRefresh,
  IconTrash,
} from '../components/Icons';

export default function ImageTool() {
  const location = useLocation();
  const navigate = useNavigate();

  // Tab über Query-Parameter steuern (?tab=compress | ?tab=convert)
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') === 'convert' ? 'convert' : 'compress';

  usePageMeta(
    currentTab === 'convert' ? 'Bild-Format-Konverter' : 'Bild-Kompressor',
    'Komprimiere und konvertiere Fotos (JPG, PNG, WebP) direkt im Browser ohne Datenübertragung. Schnell, privat und kostenlos.'
  );

  const setTab = (tabName) => {
    navigate(`/bilder?tab=${tabName}`, { replace: true });
  };

  // State für Bild
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState(0);

  // Kompressor-State
  const [quality, setQuality] = useState(80); // 10 bis 100%
  const [maxWidth, setMaxWidth] = useState(1920); // 0 = Original
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState('');
  const [compressedSize, setCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Konverter-State
  const [targetFormat, setTargetFormat] = useState('image/webp'); // 'image/jpeg', 'image/png', 'image/webp'
  const [jpgBgColor, setJpgBgColor] = useState('#ffffff'); // Füllfarbe für Transparenz bei JPG
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedUrl, setConvertedUrl] = useState('');
  const [convertedSize, setConvertedSize] = useState(0);

  const fileInputRef = useRef(null);

  // Dateigröße schön formatieren
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Datei laden
  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Bitte wähle eine gültige Bilddatei (JPG, PNG, WebP) aus.');
      return;
    }

    // Alte URLs bereinigen
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);

    setSelectedFile(file);
    setOriginalSize(file.size);

    const objectUrl = URL.createObjectURL(file);
    setOriginalUrl(objectUrl);

    // Abmessungen ermitteln
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 1. REKOMPRESSION VERKLEINERN
  const processCompression = useCallback(() => {
    if (!selectedFile || !originalUrl) return;

    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (maxWidth > 0 && w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Wenn PNG mit Qualität verkleinert wird, WebP oder JPEG nehmen für echte Kompression
      const exportType = selectedFile.type === 'image/png' ? 'image/webp' : selectedFile.type;
      
      // Falls JPEG exportiert wird, weißen Hintergrund zeichnen
      if (exportType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            if (compressedUrl) URL.revokeObjectURL(compressedUrl);
            const url = URL.createObjectURL(blob);
            setCompressedBlob(blob);
            setCompressedUrl(url);
            setCompressedSize(blob.size);
          }
          setIsProcessing(false);
        },
        exportType,
        quality / 100
      );
    };
    img.src = originalUrl;
  }, [selectedFile, originalUrl, quality, maxWidth, compressedUrl]);

  // 2. FORMAT KONVERTIEREN
  const processConversion = useCallback(() => {
    if (!selectedFile || !originalUrl) return;

    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Transparenz-Handling für JPG
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = jpgBgColor;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            if (convertedUrl) URL.revokeObjectURL(convertedUrl);
            const url = URL.createObjectURL(blob);
            setConvertedBlob(blob);
            setConvertedUrl(url);
            setConvertedSize(blob.size);
          }
          setIsProcessing(false);
        },
        targetFormat,
        0.92
      );
    };
    img.src = originalUrl;
  }, [selectedFile, originalUrl, targetFormat, jpgBgColor, convertedUrl]);

  // Automatisch bei Änderung neu verarbeiten
  useEffect(() => {
    if (!originalUrl) return;
    const timer = setTimeout(() => {
      if (currentTab === 'compress') {
        processCompression();
      } else {
        processConversion();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [originalUrl, quality, maxWidth, targetFormat, jpgBgColor, currentTab, processCompression, processConversion]);

  // Download Handler
  const handleDownload = (blob, extension) => {
    if (!blob) return;
    const a = document.createElement('a');
    const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'bild';
    a.download = `${baseName}-${currentTab === 'compress' ? 'komprimiert' : 'konvertiert'}.${extension}`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  const handleClearImage = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    setSelectedFile(null);
    setOriginalUrl('');
    setCompressedBlob(null);
    setCompressedUrl('');
    setConvertedBlob(null);
    setConvertedUrl('');
  };

  // Ersparnis in Prozent
  const savedPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

  return (
    <div className="tool-workspace-wide">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              {currentTab === 'compress' ? (
                <IconImageCompress width={28} height={28} />
              ) : (
                <IconImageConvert width={28} height={28} />
              )}
            </div>
            <div>
              <h1>BILD-WERKZEUGE</h1>
              <p className="tool-page-desc">Komprimieren und Konvertieren im Browser — 100% lokal & privat.</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          type="button"
          className={`tab-btn ${currentTab === 'compress' ? 'active' : ''}`}
          onClick={() => setTab('compress')}
        >
          <IconImageCompress width={18} height={18} />
          VERKLEINERN (KOMPRESSOR)
        </button>
        <button
          type="button"
          className={`tab-btn ${currentTab === 'convert' ? 'active' : ''}`}
          onClick={() => setTab('convert')}
        >
          <IconImageConvert width={18} height={18} />
          UMWANDELN (FORMAT-KONVERTER)
        </button>
      </div>

      {/* Upload-Zone, falls noch kein Bild gewählt */}
      {!selectedFile ? (
        <div
          className="card text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            padding: '50px 20px',
            borderStyle: 'dashed',
            borderWidth: '3px',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-subtle)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <span
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--marker-yellow)',
                border: '2px solid #111',
                boxShadow: '3px 3px 0 #111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconImageCompress width={32} height={32} />
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            BILD HIER HINEINZIEHEN ODER KLICKEN
          </h2>
          <p className="text-muted" style={{ marginBottom: '16px' }}>
            Unterstützt JPG, PNG und WebP. Maximale Dateigröße unbegrenzt.
          </p>
          <button type="button" className="btn btn-primary" style={{ pointerEvents: 'none' }}>
            DATEI AUSWÄHLEN
          </button>
        </div>
      ) : (
        /* Workspace mit Editor links & Vorschau rechts (Responsiv) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Linke Spalte: Optionen & Werkzeuge */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem' }}>
                {currentTab === 'compress' ? 'KOMPRESSIONS-OPTIONEN' : 'KONVERTIERUNGS-OPTIONEN'}
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleClearImage}
                title="Neues Bild wählen"
              >
                <IconTrash width={14} height={14} />
                ANDERE DATEI
              </button>
            </div>

            <div className="panel-subtle" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
              <strong>Originaldatei:</strong> {selectedFile.name}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
                <span>Größe: {formatBytes(originalSize)}</span>
                <span>Maße: {originalDimensions.width} × {originalDimensions.height} px</span>
              </div>
            </div>

            {currentTab === 'compress' ? (
              /* TAB 1: VERKLEINERN */
              <div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="quality-slider">Qualität: {quality}%</label>
                    <span className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                      {quality >= 85 ? 'Kaum sichtbarer Verlust' : quality >= 60 ? 'Optimal für Web' : 'Starke Kompression'}
                    </span>
                  </div>
                  <input
                    id="quality-slider"
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="form-group">
                  <label>Maximale Bildbreite</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Original', val: 0 },
                      { label: '1920 px (Full HD)', val: 1920 },
                      { label: '1280 px (HD)', val: 1280 },
                      { label: '800 px (Web)', val: 800 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`chip ${maxWidth === opt.val ? 'active' : ''}`}
                        onClick={() => setMaxWidth(opt.val)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ergebnis-Zusammenfassung */}
                <div
                  className="panel"
                  style={{
                    backgroundColor: savedPercent > 0 ? 'var(--success-green-light)' : 'var(--bg-subtle)',
                    borderColor: 'var(--border-color)',
                    padding: '16px',
                    margin: '20px 0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>NEUE DATEIGRÖSSE:</span>
                    <span className="font-mono" style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                      {formatBytes(compressedSize)}
                    </span>
                  </div>
                  {savedPercent > 0 && (
                    <p style={{ color: '#047857', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>
                      ✓ {savedPercent}% kleiner als das Original!
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => handleDownload(compressedBlob, selectedFile.type === 'image/png' ? 'webp' : 'jpg')}
                  disabled={!compressedBlob || isProcessing}
                >
                  <IconDownload width={20} height={20} />
                  KOMPRIMIERTES BILD HERUNTERLADEN
                </button>
              </div>
            ) : (
              /* TAB 2: UMWANDELN */
              <div>
                <div className="form-group">
                  <label>Ziel-Format</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'WEBP (Modern & Klein)', format: 'image/webp' },
                      { label: 'PNG (Verlustfrei / Transparenz)', format: 'image/png' },
                      { label: 'JPG (Kompakt)', format: 'image/jpeg' },
                    ].map((f) => (
                      <button
                        key={f.format}
                        type="button"
                        className={`chip ${targetFormat === f.format ? 'active' : ''}`}
                        onClick={() => setTargetFormat(f.format)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {targetFormat === 'image/jpeg' && (
                  <div className="form-group">
                    <label>Füllfarbe für Transparenzen (JPG hat kein Alpha)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={jpgBgColor}
                        onChange={(e) => setJpgBgColor(e.target.value)}
                        style={{ width: '48px', height: '44px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={jpgBgColor}
                        onChange={(e) => setJpgBgColor(e.target.value)}
                        style={{ minHeight: '44px' }}
                      />
                    </div>
                  </div>
                )}

                <div className="panel" style={{ backgroundColor: 'var(--bg-subtle)', margin: '20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>NEUE GRÖSSE:</span>
                    <span className="font-mono" style={{ fontWeight: 900 }}>
                      {formatBytes(convertedSize)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() =>
                    handleDownload(
                      convertedBlob,
                      targetFormat === 'image/webp' ? 'webp' : targetFormat === 'image/png' ? 'png' : 'jpg'
                    )
                  }
                  disabled={!convertedBlob || isProcessing}
                >
                  <IconDownload width={20} height={20} />
                  KONVERTIERTES BILD HERUNTERLADEN
                </button>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Live-Vorschau */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>VORSCHAU</h3>
            <div
              style={{
                flex: 1,
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-subtle)',
                border: 'var(--border-width-sm) solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                padding: '12px',
                position: 'relative',
              }}
            >
              {isProcessing && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'var(--card-bg)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #111',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Wird berechnet...
                </div>
              )}
              <img
                src={currentTab === 'compress' ? compressedUrl || originalUrl : convertedUrl || originalUrl}
                alt="Vorschau"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '12px', textAlign: 'center' }}>
              Verarbeitung erfolgt direkt im Canvas deines Browsers. Dein Foto verlässt niemals dieses Gerät.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
