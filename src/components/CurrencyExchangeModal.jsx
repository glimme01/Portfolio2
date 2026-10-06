import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { fmtCookies } from '../games/clicker/clickerLogic.js';

export default function CurrencyExchangeModal({ isOpen, onClose, state, onExchange }) {
  const [exchangeType, setExchangeType] = useState('cookies_to_gems');
  const [amount, setAmount] = useState(1);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen || !state) return null;

  const cookies = Math.floor(state.cookies || 0);
  const gems = Math.floor(state.gems || 0);

  const OPTIONS = [
    {
      id: 'gems_to_cookies',
      name: '💎 Diamanten ➔ 🍪 Cookies',
      rateText: '1 Diamant = 25.000 Cookies',
      costUnit: 'Diamanten',
      costAmount: 1,
      gainUnit: 'Cookies',
      gainAmount: 25000,
      maxAfford: gems,
      currentBal: gems,
    },
    {
      id: 'cookies_to_gems',
      name: '🍪 Cookies ➔ 💎 Diamanten (VIP)',
      rateText: '1.000.000 Cookies = 1 Diamant (Max 5)',
      costUnit: 'Cookies',
      costAmount: 1000000,
      gainUnit: 'Diamanten',
      gainAmount: 1,
      maxAfford: Math.min(5, Math.floor(cookies / 1000000)),
      currentBal: cookies,
    },
  ];

  const currentOpt = OPTIONS.find(o => o.id === exchangeType) || OPTIONS[0];
  const totalCost = currentOpt.costAmount * amount;
  const totalGain = currentOpt.gainAmount * amount;
  const canAfford = currentOpt.currentBal >= totalCost && amount > 0 && amount <= currentOpt.maxAfford;

  function handleExecute() {
    if (!canAfford) {
      setStatusMsg('Nicht genügend Guthaben oder Limit überschritten!');
      return;
    }

    const nextState = { ...state };
    if (exchangeType === 'cookies_to_gems') {
      nextState.cookies -= totalCost;
      nextState.gems = (nextState.gems || 0) + totalGain;
    } else if (exchangeType === 'gems_to_cookies') {
      nextState.gems -= totalCost;
      nextState.cookies += totalGain;
      nextState.totalCookies = Math.max(nextState.totalCookies || 0, nextState.cookies);
    }

    onExchange(nextState);
    setStatusMsg(`Erfolgreich getauscht: +${totalGain.toLocaleString('de-DE')} ${currentOpt.gainUnit}!`);
    setTimeout(() => setStatusMsg(''), 2500);
  }

  const modalNode = (
    <div className="overlay-backdrop" style={{ zIndex: 99999 }} role="dialog" aria-modal="true" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="overlay-panel" style={{ maxWidth: '440px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--accent)', margin: 0 }}>
            💱 WÄHRUNGS-WECHSELSTUBE
          </h2>
          <button className="btn btn-outline" style={{ minHeight: '30px', padding: '3px 8px', fontSize: '0.45rem' }} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Guthaben Übersicht (2 Währungen: Cookies & Diamanten) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: '#121212', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.45rem', color: 'var(--muted)', fontFamily: 'var(--font-pixel)' }}>COOKIES</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>
              🍪 {fmtCookies(cookies)}
            </div>
          </div>
          <div style={{ background: '#121212', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.45rem', color: 'var(--muted)', fontFamily: 'var(--font-pixel)' }}>DIAMANTEN (VIP)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#00e5ff', marginTop: '4px' }}>
              💎 {gems.toLocaleString('de-DE')}
            </div>
          </div>
        </div>

        {/* Tausch-Richtung wählen */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '6px' }}>
            TAUSCH-OPTION WÄHLEN:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {OPTIONS.map(opt => (
              <button
                key={opt.id}
                className={`btn ${exchangeType === opt.id ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  textAlign: 'left',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  fontSize: '0.48rem',
                  display: 'flex',
                }}
                onClick={() => { setExchangeType(opt.id); setAmount(1); }}
              >
                <span>{opt.name}</span>
                <span style={{ opacity: 0.8, fontSize: '0.4rem' }}>{opt.rateText}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Anzahl Multiplikator */}
        <div style={{ marginBottom: '16px', background: '#0e0e0e', border: '1px solid #222', padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>
              WIE OFT TAUSCHEN:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 5, 10].map(m => (
                <button
                  key={m}
                  className="btn btn-outline"
                  style={{ padding: '2px 6px', fontSize: '0.4rem', minHeight: '22px' }}
                  onClick={() => setAmount(m)}
                >
                  {m}x
                </button>
              ))}
              <button
                className="btn btn-outline"
                style={{ padding: '2px 6px', fontSize: '0.4rem', minHeight: '22px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => setAmount(Math.max(1, currentOpt.maxAfford))}
              >
                MAX ({currentOpt.maxAfford})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ minHeight: '34px', width: '36px', padding: 0 }}
              onClick={() => setAmount(a => Math.max(1, a - 1))}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max={Math.max(1, currentOpt.maxAfford)}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                flex: 1,
                background: '#000',
                border: '1px solid #3a3a3a',
                color: '#fff',
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.75rem',
                padding: '8px',
                textAlign: 'center',
                borderRadius: '6px',
              }}
            />
            <button
              className="btn btn-outline"
              style={{ minHeight: '34px', width: '36px', padding: 0 }}
              onClick={() => setAmount(a => Math.min(Math.max(1, currentOpt.maxAfford), a + 1))}
            >
              +
            </button>
          </div>

          {/* Berechnung */}
          <div style={{ marginTop: '12px', fontSize: '0.62rem', display: 'flex', justifyContent: 'space-between', color: '#aaa', borderTop: '1px solid #222', paddingTop: '8px' }}>
            <span>Kosten: <strong style={{ color: canAfford ? 'var(--danger)' : '#ff4444' }}>-{totalCost.toLocaleString('de-DE')} {currentOpt.costUnit}</strong></span>
            <span>Du erhältst: <strong style={{ color: '#39ff14' }}>+{totalGain.toLocaleString('de-DE')} {currentOpt.gainUnit}</strong></span>
          </div>
        </div>

        {statusMsg && (
          <div style={{
            background: statusMsg.includes('Erfolgreich') ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255, 68, 68, 0.15)',
            border: `1px solid ${statusMsg.includes('Erfolgreich') ? '#39ff14' : '#ff4444'}`,
            color: statusMsg.includes('Erfolgreich') ? '#39ff14' : '#ff4444',
            padding: '8px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            textAlign: 'center',
            marginBottom: '12px'
          }}>
            {statusMsg}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.6rem' }}
          disabled={!canAfford}
          onClick={handleExecute}
        >
          {canAfford ? `JETZT TAUSCHEN (+${totalGain.toLocaleString('de-DE')} ${currentOpt.gainUnit})` : 'ZU WENIG GUTHABEN'}
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
