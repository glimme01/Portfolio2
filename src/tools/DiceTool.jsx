// src/tools/DiceTool.jsx
// Würfel & Münzwurf: 3D-Münzflip, 1-6 Würfel mit echten CSS-Dots, Wurfhistorie & Entscheidungs-Rad

import React, { useState, useEffect } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconDice, IconCoin, IconRefresh, IconPlus, IconTrash } from '../components/Icons';

export default function DiceTool() {
  usePageMeta(
    'Würfel & Münzwurf',
    'Faire Zufallsentscheidungen via Web Crypto API: 3D-Münzwurf mit Statistik, 1-6 Würfel und interaktiver Entscheidungshelfer.'
  );

  const [activeTab, setActiveTab] = useState('WUERFEL'); // 'WUERFEL' | 'MUENZE' | 'ENTSCHEIDE'

  // --- 1. WÜRFEL STATE ---
  const [diceCount, setDiceCount] = useState(2); // 1 bis 6
  const [diceValues, setDiceValues] = useState([3, 4]);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceHistory, setDiceHistory] = useState([]); // letzte 10 Würfe

  // --- 2. MÜNZWURF STATE ---
  const [coinResult, setCoinResult] = useState('KOPF'); // 'KOPF' | 'ZAHL'
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  const [coinStats, setCoinStats] = useState({ kopf: 0, zahl: 0, total: 0 });

  // --- 3. ENTSCHEIDUNGS-RAD STATE ---
  const [options, setOptions] = useState(['Pizza', 'Pasta', 'Burger', 'Salat']);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [decisionResult, setDecisionResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Krypto-Zufallshilfe
  const getCryptoRandomInt = (min, max) => {
    const range = max - min + 1;
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    return min + (bytes[0] % range);
  };

  // --- WÜRFEL FUNKTION ---
  const rollDice = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);

    let rolls = 0;
    const interval = setInterval(() => {
      // Optisches Durchwürfeln
      const temp = [];
      for (let i = 0; i < diceCount; i++) {
        temp.push(getCryptoRandomInt(1, 6));
      }
      setDiceValues(temp);
      rolls++;

      if (rolls >= 8) {
        clearInterval(interval);
        // Finaler fairer Wurf
        const finalDice = [];
        let sum = 0;
        for (let i = 0; i < diceCount; i++) {
          const val = getCryptoRandomInt(1, 6);
          finalDice.push(val);
          sum += val;
        }
        setDiceValues(finalDice);
        setDiceHistory((prev) => [{ values: finalDice, sum, id: Date.now() }, ...prev.slice(0, 9)]);
        setIsRollingDice(false);
      }
    }, 70);
  };

  // Bei Änderung der Würfelanzahl anpassen
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < diceCount; i++) {
      arr.push(getCryptoRandomInt(1, 6));
    }
    setDiceValues(arr);
  }, [diceCount]);

  // --- MÜNZ FUNKTION ---
  const flipCoin = () => {
    if (isFlippingCoin) return;
    setIsFlippingCoin(true);

    setTimeout(() => {
      const outcome = getCryptoRandomInt(0, 1) === 0 ? 'KOPF' : 'ZAHL';
      setCoinResult(outcome);
      setCoinStats((prev) => ({
        kopf: outcome === 'KOPF' ? prev.kopf + 1 : prev.kopf,
        zahl: outcome === 'ZAHL' ? prev.zahl + 1 : prev.zahl,
        total: prev.total + 1,
      }));
      setIsFlippingCoin(false);
    }, 600);
  };

  // --- ENTSCHEIDUNG FUNKTION ---
  const decideForMe = () => {
    if (options.length < 2 || isSpinning) return;
    setIsSpinning(true);
    setDecisionResult(null);

    let ticks = 0;
    const interval = setInterval(() => {
      const randomIdx = getCryptoRandomInt(0, options.length - 1);
      setDecisionResult(options[randomIdx]);
      ticks++;

      if (ticks >= 14) {
        clearInterval(interval);
        const finalIdx = getCryptoRandomInt(0, options.length - 1);
        setDecisionResult(options[finalIdx]);
        setIsSpinning(false);
      }
    }, 80);
  };

  const handleAddOption = (e) => {
    e.preventDefault();
    if (!newOptionInput.trim() || options.length >= 8) return;
    setOptions([...options, newOptionInput.trim()]);
    setNewOptionInput('');
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      alert('Mindestens 2 Optionen sind erforderlich.');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  // Hilfskomponente: Einzelner Würfel mit Punkten
  const renderDie = (value, key) => {
    // 3x3 Grid für Augen (Punkte)
    // Positionen: 1: center; 2: top-right, bottom-left; 3: top-right, center, bottom-left
    // 4: 4 corners; 5: 4 corners + center; 6: 6 sides
    const dotsMap = {
      1: [4],
      2: [2, 6],
      3: [2, 4, 6],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const activeDots = dotsMap[value] || [4];

    return (
      <div
        key={key}
        style={{
          width: '74px',
          height: '74px',
          backgroundColor: '#ffffff',
          border: '3px solid #111111',
          borderRadius: '12px',
          boxShadow: '4px 4px 0 #111111',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          padding: '8px',
          transform: isRollingDice ? `rotate(${(value * 45) % 360}deg) scale(0.95)` : 'none',
          transition: 'transform 0.08s ease',
        }}
        aria-label={`Würfel zeigt ${value}`}
      >
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeDots.includes(i) && (
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#111111',
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const currentDiceSum = diceValues.reduce((a, b) => a + b, 0);

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconDice width={28} height={28} />
            </div>
            <div>
              <h1>WÜRFEL & MÜNZWURF</h1>
              <p className="tool-page-desc">Kryptografisch fairer Zufall für Spiele, Wetten und Entscheidungen.</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'WUERFEL' ? 'active' : ''}`}
          onClick={() => setActiveTab('WUERFEL')}
        >
          <IconDice width={16} height={16} /> WÜRFEL (1–6)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'MUENZE' ? 'active' : ''}`}
          onClick={() => setActiveTab('MUENZE')}
        >
          <IconCoin width={16} height={16} /> MÜNZWURF (3D)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'ENTSCHEIDE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ENTSCHEIDE')}
        >
          ENTSCHEIDE FÜR MICH
        </button>
      </div>

      {/* TAB 1: WÜRFEL */}
      {activeTab === 'WUERFEL' && (
        <div>
          <div className="card text-center" style={{ marginBottom: '24px' }}>
            {/* Anzahl Würfel */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                ANZAHL WÜRFEL
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`chip ${diceCount === num ? 'active' : ''}`}
                    onClick={() => setDiceCount(num)}
                    disabled={isRollingDice}
                  >
                    {num} {num === 1 ? 'Würfel' : 'Würfel'}
                  </button>
                ))}
              </div>
            </div>

            {/* Würfel-Anzeige */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                margin: '28px 0',
                minHeight: '80px',
                alignItems: 'center',
              }}
            >
              {diceValues.map((val, idx) => renderDie(val, idx))}
            </div>

            {/* Augensumme */}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AUGENSUMME:</span>
              <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-orange)' }}>
                {currentDiceSum}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={rollDice}
              disabled={isRollingDice}
              style={{ minWidth: '220px' }}
            >
              <IconRefresh width={20} height={20} />
              {isRollingDice ? 'WÜRFELT...' : 'JETZT WÜRFELN'}
            </button>
          </div>

          {/* Wurfhistorie */}
          {diceHistory.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>LETZTE WÜRFE (HISTORIE)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diceHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <span className="text-muted">Wurf #{diceHistory.length - idx}:</span>
                    <span className="font-mono">[{item.values.join(', ')}]</span>
                    <strong className="font-mono">Summe: {item.sum}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MÜNZWURF */}
      {activeTab === 'MUENZE' && (
        <div className="card text-center">
          <div style={{ margin: '30px auto', perspective: '1000px', width: '130px', height: '130px' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: coinResult === 'KOPF' ? 'var(--marker-yellow)' : '#ffffff',
                border: '4px solid #111111',
                boxShadow: '5px 5px 0 #111111',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isFlippingCoin ? 'rotateY(720deg) scale(0.9)' : 'none',
                transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em' }}>
                {coinResult === 'KOPF' ? '★ MF ★' : '1 EURO'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  marginTop: '4px',
                }}
              >
                {coinResult}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>LETZTES ERGEBNIS:</span>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{coinResult}</div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={flipCoin}
            disabled={isFlippingCoin}
            style={{ minWidth: '220px', marginBottom: '24px' }}
          >
            <IconCoin width={20} height={20} />
            {isFlippingCoin ? 'DREHT SICH...' : 'MÜNZE WERFEN'}
          </button>

          <hr className="dashed-divider" />

          {/* Statistik Kopf/Zahl Bilanz */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>BILANZ ({coinStats.total} Würfe)</span>
              {coinStats.total > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCoinStats({ kopf: 0, zahl: 0, total: 0 })}
                >
                  RESET
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="panel-subtle text-center">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>KOPF</span>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                  {coinStats.kopf}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ({coinStats.total > 0 ? Math.round((coinStats.kopf / coinStats.total) * 100) : 50}%)
                  </span>
                </div>
              </div>
              <div className="panel-subtle text-center">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ZAHL</span>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                  {coinStats.zahl}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ({coinStats.total > 0 ? Math.round((coinStats.zahl / coinStats.total) * 100) : 50}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ENTSCHEIDE FÜR MICH */}
      {activeTab === 'ENTSCHEIDE' && (
        <div className="card">
          <h3 style={{ marginBottom: '8px' }}>ENTSCHEIDUNGS-RAD</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
            Kannst du dich nicht entscheiden? Gib 2 bis 8 Möglichkeiten ein und lass den Zufall wählen.
          </p>

          {/* Ergebnis */}
          {decisionResult && (
            <div
              className="panel text-center"
              style={{
                backgroundColor: 'var(--marker-yellow-light)',
                borderColor: 'var(--border-color)',
                padding: '24px',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                DIE ENTSCHEIDUNG LAUTET:
              </span>
              <div
                style={{
                  fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
                  fontWeight: 900,
                  marginTop: '8px',
                  color: 'var(--text-main)',
                }}
              >
                {decisionResult}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={decideForMe}
              disabled={isSpinning || options.length < 2}
              style={{ minWidth: '220px' }}
            >
              <IconRefresh width={20} height={20} />
              {isSpinning ? 'ENTSCHEIDET...' : 'FÜR MICH ENTSCHEIDEN'}
            </button>
          </div>

          <hr className="dashed-divider" />

          {/* Optionen-Liste */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
              OPTIONEN ({options.length}/8)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{opt}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleRemoveOption(idx)}
                    style={{ padding: '4px 8px', minHeight: '30px' }}
                    title="Entfernen"
                  >
                    <IconTrash width={12} height={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Neue Option hinzufügen */}
            {options.length < 8 && (
              <form onSubmit={handleAddOption} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Neue Option (z. B. Kino)..."
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                  <IconPlus width={16} height={16} />
                  HINZUFÜGEN
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
