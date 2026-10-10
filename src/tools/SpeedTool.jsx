// src/tools/SpeedTool.jsx
// Speed-Test Mini: Ping, Download und Upload via Cloudflare Speed Endpunkte ohne Werbung

import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconSpeed, IconRefresh } from '../components/Icons';

export default function SpeedTool() {
  usePageMeta(
    'Speed-Test Mini',
    'Werbefreier, schneller Internet-Geschwindigkeitstest. Miss Ping, Download und Upload direkt im Browser.'
  );

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('IDLE'); // 'IDLE', 'PING', 'DOWNLOAD', 'UPLOAD', 'FINISHED', 'ERROR'
  const [progress, setProgress] = useState(0); // 0 bis 100%

  const [ping, setPing] = useState(null);
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Historie der letzten 5 Tests aus localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_speed_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mf_tools_speed_history', JSON.stringify(history));
    } catch (e) {
      console.warn(e);
    }
  }, [history]);

  // Test durchführen
  const startSpeedTest = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setPhase('PING');
    setProgress(5);
    setPing(null);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setErrorMessage('');

    try {
      // 1. PING-MESSUNG (10 kleine Requests)
      const pingTimes = [];
      for (let i = 0; i < 6; i++) {
        const start = performance.now();
        await fetch(`https://speed.cloudflare.com/__down?bytes=0&r=${Math.random()}`, {
          cache: 'no-store',
        });
        const duration = performance.now() - start;
        pingTimes.push(duration);
        setProgress(5 + Math.round((i / 6) * 20));
      }

      // Durchschnittlicher Ping
      const avgPing = Math.round(pingTimes.reduce((a, b) => a + b, 0) / pingTimes.length);
      setPing(avgPing);
      setProgress(28);

      // 2. DOWNLOAD-MESSUNG (~10 MB)
      setPhase('DOWNLOAD');
      const dlBytes = 10000000; // 10 MB
      const dlStart = performance.now();
      const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${dlBytes}&r=${Math.random()}`, {
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Download-Server antwortete nicht.');

      // Daten lesen mit Fortschritt
      const reader = res.body?.getReader();
      let receivedBytes = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedBytes += value.length;
          const currentPercent = 28 + Math.round((receivedBytes / dlBytes) * 35);
          setProgress(Math.min(65, currentPercent));
        }
      } else {
        await res.blob();
      }

      const dlDurationSeconds = (performance.now() - dlStart) / 1000;
      // Bits pro Sekunde in Mbit/s (Megabit = 1.000.000 Bits)
      const dlMbit = (dlBytes * 8) / dlDurationSeconds / 1000000;
      const finalDl = parseFloat(dlMbit.toFixed(1));
      setDownloadSpeed(finalDl);
      setProgress(68);

      // 3. UPLOAD-MESSUNG (~3 MB Blob POST)
      setPhase('UPLOAD');
      const ulBytes = 3000000; // 3 MB
      const dummyData = new Uint8Array(ulBytes);
      const ulBlob = new Blob([dummyData], { type: 'application/octet-stream' });

      const ulStart = performance.now();
      const upRes = await fetch(`https://speed.cloudflare.com/__up?r=${Math.random()}`, {
        method: 'POST',
        body: ulBlob,
        cache: 'no-store',
      });

      if (!upRes.ok) throw new Error('Upload-Server antwortete nicht.');

      const ulDurationSeconds = (performance.now() - ulStart) / 1000;
      const ulMbit = (ulBytes * 8) / ulDurationSeconds / 1000000;
      const finalUl = parseFloat(ulMbit.toFixed(1));
      setUploadSpeed(finalUl);

      setProgress(100);
      setPhase('FINISHED');

      // In Historie ablegen
      const record = {
        id: Date.now(),
        date: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        ping: avgPing,
        download: finalDl,
        upload: finalUl,
      };
      setHistory((prev) => [record, ...prev.slice(0, 4)]);
    } catch (err) {
      console.error('Speed-Test Fehler', err);
      setPhase('ERROR');
      setErrorMessage(
        'Die Messung konnte nicht abgeschlossen werden. Möglicherweise blockiert ein Ad-Blocker oder Tracking-Schutz den Geschwindigkeitsserver.'
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconSpeed width={28} height={28} />
            </div>
            <div>
              <h1>SPEED-TEST MINI</h1>
              <p className="tool-page-desc">Schneller, neutraler Geschwindigkeitstest ohne Werbung und Downloads.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hauptkarte mit den 3 großen Zahlen */}
      <div className="card text-center" style={{ marginBottom: '24px', padding: '32px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {/* PING */}
          <div className="panel-subtle" style={{ padding: '16px 8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              PING (LATENZ)
            </span>
            <div
              className="font-mono"
              style={{
                fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
                fontWeight: 900,
                color: phase === 'PING' ? 'var(--accent-orange)' : 'var(--text-main)',
                margin: '6px 0',
              }}
            >
              {ping !== null ? ping : phase === 'PING' ? '...' : '—'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ms</span>
          </div>

          {/* DOWNLOAD */}
          <div className="panel-subtle" style={{ padding: '16px 8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              DOWNLOAD
            </span>
            <div
              className="font-mono"
              style={{
                fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
                fontWeight: 900,
                color: phase === 'DOWNLOAD' ? 'var(--accent-orange)' : 'var(--text-main)',
                margin: '6px 0',
              }}
            >
              {downloadSpeed !== null ? downloadSpeed : phase === 'DOWNLOAD' ? '...' : '—'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mbit/s</span>
          </div>

          {/* UPLOAD */}
          <div className="panel-subtle" style={{ padding: '16px 8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              UPLOAD
            </span>
            <div
              className="font-mono"
              style={{
                fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
                fontWeight: 900,
                color: phase === 'UPLOAD' ? 'var(--accent-orange)' : 'var(--text-main)',
                margin: '6px 0',
              }}
            >
              {uploadSpeed !== null ? uploadSpeed : phase === 'UPLOAD' ? '...' : '—'}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mbit/s</span>
          </div>
        </div>

        {/* Papier-Studio Fortschrittsbalken */}
        {isRunning && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <strong>
                {phase === 'PING'
                  ? 'Miss Latenz...'
                  : phase === 'DOWNLOAD'
                  ? 'Miss Download-Geschwindigkeit...'
                  : 'Miss Upload-Geschwindigkeit...'}
              </strong>
              <span className="font-mono">{progress}%</span>
            </div>
            <div
              style={{
                height: '16px',
                width: '100%',
                backgroundColor: 'var(--bg-subtle)',
                border: '2px solid #111111',
                borderRadius: '0px',
                overflow: 'hidden',
                boxShadow: '2px 2px 0 #111111',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: 'var(--accent-orange)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Start-Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={startSpeedTest}
          disabled={isRunning}
          style={{ minWidth: '240px', fontSize: '1.05rem' }}
        >
          <IconRefresh width={20} height={20} />
          {isRunning ? 'MESSUNG LÄUFT...' : 'TEST STARTEN'}
        </button>

        {/* Fehler-Hinweis */}
        {errorMessage && (
          <div className="panel-subtle" style={{ backgroundColor: 'var(--danger-red-light)', marginTop: '20px' }}>
            <p style={{ color: 'var(--danger-red)', fontSize: '0.85rem' }}>{errorMessage}</p>
          </div>
        )}

        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '20px' }}>
          Grobe Messung via CDN-Endpunkte — für exakte Messungen mit Provider-Zertifikat bitte einen vollwertigen Desktop-Breitbandtest nutzen.
        </p>
      </div>

      {/* Historie der letzten Tests */}
      {history.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>DEINE LETZTEN TESTS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '0px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                }}
              >
                <span className="text-muted">{h.date} Uhr</span>
                <span>Ping: <strong>{h.ping} ms</strong></span>
                <span>Down: <strong>{h.download} Mbit/s</strong></span>
                <span>Up: <strong>{h.upload} Mbit/s</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
