// src/tools/CpsTool.jsx
// CPS-Test (Clicks Per Second): 5s Countdown ab erstem Klick, pointerdown ohne Delay, Rangsystem & Historie

import React, { useState, useEffect, useRef } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconCps, IconRefresh } from '../components/Icons';

export default function CpsTool() {
  usePageMeta(
    'CPS-Klick-Test',
    'Miss deine Klick-Geschwindigkeit (Clicks Per Second) in 5 Sekunden. Verzögerungsfreie Pointerdown-Erfassung mit Rang-System.'
  );

  const TEST_DURATION = 5.0; // 5 Sekunden

  const [gameState, setGameState] = useState('IDLE'); // 'IDLE', 'RUNNING', 'FINISHED'
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [cpsResult, setCpsResult] = useState(0);

  // Bestwert & Historie aus localStorage
  const [bestCps, setBestCps] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_cps_best');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_cps_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const startTimeRef = useRef(null);
  const timerIdRef = useRef(null);
  const clicksRef = useRef(0);

  // Timer Tick
  useEffect(() => {
    if (gameState === 'RUNNING') {
      const interval = setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, TEST_DURATION - elapsed);
        setTimeLeft(parseFloat(remaining.toFixed(1)));

        if (remaining <= 0) {
          clearInterval(interval);
          finishTest();
        }
      }, 50);

      timerIdRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Test beenden
  const finishTest = () => {
    const finalClicks = clicksRef.current;
    const finalCps = parseFloat((finalClicks / TEST_DURATION).toFixed(1));

    setCpsResult(finalCps);
    setGameState('FINISHED');

    // Bestwert prüfen
    if (finalCps > bestCps) {
      setBestCps(finalCps);
      try {
        localStorage.setItem('mf_tools_cps_best', finalCps.toString());
      } catch (e) {
        console.warn(e);
      }
    }

    // Historie speichern
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      cps: finalCps,
      total: finalClicks,
    };

    setHistory((prev) => {
      const nextList = [newEntry, ...prev.slice(0, 9)];
      try {
        localStorage.setItem('mf_tools_cps_history', JSON.stringify(nextList));
      } catch (e) {
        console.warn(e);
      }
      return nextList;
    });
  };

  // Pointerdown Klick-Handler (Zero-Latency!)
  const handlePointerDown = (e) => {
    e.preventDefault();

    if (gameState === 'FINISHED') return;

    if (gameState === 'IDLE') {
      // Start beim ERSTEN Klick
      clicksRef.current = 1;
      setClicks(1);
      startTimeRef.current = performance.now();
      setGameState('RUNNING');
      return;
    }

    if (gameState === 'RUNNING') {
      clicksRef.current += 1;
      setClicks(clicksRef.current);
    }
  };

  // Test zurücksetzen
  const resetTest = () => {
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    clicksRef.current = 0;
    setClicks(0);
    setTimeLeft(TEST_DURATION);
    setCpsResult(0);
    setGameState('IDLE');
  };

  // Rang-System ermitteln
  const getRankBadge = (cps) => {
    if (cps < 4.0) return { title: 'Normalo', desc: 'Solide Klickrate für alltägliches Surfen.', color: 'var(--text-main)' };
    if (cps < 6.0) return { title: 'Gamer', desc: 'Flotte Finger! Perfekt für Shooter und Actionspiele.', color: '#2563eb' };
    if (cps < 8.0) return { title: 'Profi', desc: 'Rasant schnell! Deine Mausglocke glüht bereits.', color: '#059669' };
    if (cps < 10.0) return { title: 'Klaviervirtuose', desc: 'Wahnsinniges Tempo! Du könntest Chopin im Zeitraffer spielen.', color: 'var(--accent-orange)' };
    return { title: 'Nicht menschlich!', desc: 'Bitte sofort gegen Jitter-Clicker und Bots antreten.', color: 'var(--danger-red)' };
  };

  const rank = getRankBadge(cpsResult);

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconCps width={28} height={28} />
            </div>
            <div>
              <h1>CPS-TEST (CLICKS PER SECOND)</h1>
              <p className="tool-page-desc">5-Sekunden-Schnelltest: Klicke so schnell du kannst!</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Info-Balken: Timer & Klicks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="card text-center" style={{ padding: '16px 8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERBLEIBENDE ZEIT</span>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 900 }}>
            {timeLeft.toFixed(1)} s
          </div>
        </div>

        <div className="card text-center" style={{ padding: '16px 8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>KLICKS</span>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-orange)' }}>
            {clicks}
          </div>
        </div>
      </div>

      {/* GROSSER KLICK-BEREICH */}
      <div
        className="card"
        onPointerDown={handlePointerDown}
        style={{
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: gameState === 'FINISHED' ? 'default' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          backgroundColor: gameState === 'RUNNING' ? 'var(--marker-yellow-light)' : '#ffffff',
          borderColor: gameState === 'RUNNING' ? 'var(--accent-orange)' : 'var(--border-color)',
          boxShadow: gameState === 'RUNNING' ? '2px 2px 0 #111' : 'var(--shadow-offset-lg)',
          transform: gameState === 'RUNNING' ? 'translate(2px, 2px)' : 'none',
          transition: 'all 0.08s ease',
          marginBottom: '24px',
        }}
      >
        {gameState === 'IDLE' && (
          <div className="text-center" style={{ pointerEvents: 'none' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: 'var(--marker-yellow)',
                border: '2px solid #111',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '1.2rem',
                boxShadow: '3px 3px 0 #111',
                marginBottom: '12px',
              }}
            >
              KLICKE ZUM STARTEN
            </span>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Der 5-Sekunden-Timer startet automatisch mit der ersten Berührung!
            </p>
          </div>
        )}

        {gameState === 'RUNNING' && (
          <div className="text-center" style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-orange)' }}>
              KLICKEN! KLICKEN! KLICKEN!
            </span>
            <div className="font-mono" style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1.1 }}>
              {clicks}
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Noch {timeLeft.toFixed(1)} Sekunden
            </p>
          </div>
        )}

        {gameState === 'FINISHED' && (
          <div className="text-center" style={{ width: '100%', padding: '12px' }}>
            <span className="badge badge-marker" style={{ marginBottom: '8px' }}>ERGEBNIS</span>
            <div
              className="font-mono"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                fontWeight: 900,
                color: rank.color,
                lineHeight: 1.1,
                margin: '4px 0',
              }}
            >
              {cpsResult} CPS
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              Gesamtklicks: <strong>{clicks}</strong> in 5.0 Sekunden
            </p>

            <div
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                backgroundColor: 'var(--bg-subtle)',
                border: '2px solid #111',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              Rang: <strong style={{ color: rank.color }}>{rank.title}</strong> — {rank.desc}
            </div>

            <div>
              <button type="button" className="btn btn-primary" onClick={resetTest}>
                <IconRefresh width={18} height={18} /> NOCHMAL TESTEN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rekord & Historie */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>DEIN BESTWERT: <span className="font-mono" style={{ color: 'var(--accent-orange)' }}>{bestCps} CPS</span></h3>
          {history.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setHistory([]);
                setBestCps(0);
                localStorage.removeItem('mf_tools_cps_history');
                localStorage.removeItem('mf_tools_cps_best');
              }}
            >
              HISTORIE LEEREN
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '16px' }}>
            Noch keine Tests absolviert. Klicke oben auf das weiße Feld, um zu starten!
          </p>
        ) : (
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
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                }}
              >
                <span className="text-muted">{h.date} Uhr</span>
                <span>Gesamt: <strong>{h.total} Klicks</strong></span>
                <strong className="font-mono" style={{ fontSize: '1rem' }}>{h.cps} CPS</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
