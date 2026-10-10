// src/tools/CurrencyTool.jsx
// Währungsrechner mit Live-Kurs-API, Offline-Cache (localStorage), Schnell-Chips & LIVE-Badge

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconCurrency, IconRefresh, IconSwap } from '../components/Icons';
import CopyButton from '../components/CopyButton';

// Standard-Fallbacks, falls gar keine Internetverbindung vorhanden ist
const INITIAL_FALLBACK_RATES = {
  EUR: 1.0,
  USD: 1.09,
  GBP: 0.86,
  JPY: 165.2,
  CHF: 0.97,
  CAD: 1.48,
  AUD: 1.64,
  PLN: 4.31,
  SEK: 11.45,
  CZK: 25.1,
  TRY: 35.2,
  CNY: 7.82,
  DKK: 7.46,
  NOK: 11.6,
};

const CURRENCY_NAMES = {
  EUR: 'Euro (EUR)',
  USD: 'US-Dollar (USD)',
  GBP: 'Britisches Pfund (GBP)',
  JPY: 'Japanischer Yen (JPY)',
  CHF: 'Schweizer Franken (CHF)',
  CAD: 'Kanadischer Dollar (CAD)',
  AUD: 'Australischer Dollar (AUD)',
  PLN: 'Polnischer Zloty (PLN)',
  SEK: 'Schwedische Krone (SEK)',
  CZK: 'Tschechische Krone (CZK)',
  TRY: 'Türkische Lira (TRY)',
  CNY: 'Chinesischer Yuan (CNY)',
  DKK: 'Dänische Krone (DKK)',
  NOK: 'Norwegische Krone (NOK)',
};

const CURRENCY_CHIPS = [
  { from: 'EUR', to: 'USD', label: 'EUR ↔ USD' },
  { from: 'EUR', to: 'GBP', label: 'EUR ↔ GBP' },
  { from: 'EUR', to: 'JPY', label: 'EUR ↔ JPY' },
  { from: 'EUR', to: 'CHF', label: 'EUR ↔ CHF' },
];

export default function CurrencyTool() {
  usePageMeta(
    'Währungsrechner',
    'Aktueller Währungsrechner mit Live-Wechselkursen, Offline-Cache und Schnellwahl-Paaren. 100% werbefrei.'
  );

  const [amount, setAmount] = useState('100');
  const [fromCurr, setFromCurr] = useState('EUR');
  const [toCurr, setToCurr] = useState('USD');
  const [rates, setRates] = useState(INITIAL_FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Kurse laden & cachen
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');

    try {
      // Open Exchange Rates free API (kein Key nötig, Basis EUR)
      const res = await fetch('https://open.er-api.com/v6/latest/EUR', { cache: 'no-cache' });
      if (!res.ok) throw new Error('API antwortete nicht korrekt.');
      const data = await res.json();

      if (data && data.rates) {
        setRates(data.rates);
        const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date().toLocaleDateString('de-DE');
        const updateInfo = `${dateStr} um ${timeStr} Uhr`;
        setLastUpdated(updateInfo);
        setIsOfflineMode(false);

        // Im localStorage cachen
        try {
          localStorage.setItem(
            'mf_tools_cached_rates',
            JSON.stringify({
              rates: data.rates,
              timestamp: updateInfo,
            })
          );
        } catch (e) {
          console.warn('Cache-Fehler', e);
        }
      }
    } catch (err) {
      console.warn('Live-Abruf fehlgeschlagen, lade Offline-Cache', err);
      // Fallback aus localStorage
      try {
        const cached = localStorage.getItem('mf_tools_cached_rates');
        if (cached) {
          const parsed = JSON.parse(cached);
          setRates(parsed.rates || INITIAL_FALLBACK_RATES);
          setLastUpdated(parsed.timestamp || 'Aus Offline-Speicher');
          setIsOfflineMode(true);
          setFetchError('Keine Internetverbindung oder API-Ausfall — gespeicherte Kurse aktiv.');
        } else {
          setRates(INITIAL_FALLBACK_RATES);
          setLastUpdated('Eingebaute Richtwerte');
          setIsOfflineMode(true);
          setFetchError('Offline: Standard-Kurse verwendet.');
        }
      } catch (cacheErr) {
        setRates(INITIAL_FALLBACK_RATES);
        setIsOfflineMode(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Beim ersten Laden Cache prüfen und versuchen neu zu laden
    try {
      const cached = localStorage.getItem('mf_tools_cached_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.rates) setRates(parsed.rates);
        if (parsed.timestamp) setLastUpdated(parsed.timestamp);
      }
    } catch (e) {
      console.warn(e);
    }

    fetchRates();
  }, [fetchRates]);

  // Währungen tauschen
  const handleSwap = () => {
    setFromCurr(toCurr);
    setToCurr(fromCurr);
  };

  // Berechnung
  const convertedAmount = useMemo(() => {
    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) return '0.00';

    // Basis ist EUR in der API
    const rateFrom = rates[fromCurr] || 1;
    const rateTo = rates[toCurr] || 1;

    // Betrag in EUR umrechnen, dann in Zielwährung
    const inEur = val / rateFrom;
    const inTo = inEur * rateTo;

    return inTo.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amount, fromCurr, toCurr, rates]);

  // Einzelkurs für Anzeige
  const singleRate = useMemo(() => {
    const rateFrom = rates[fromCurr] || 1;
    const rateTo = rates[toCurr] || 1;
    const single = (1 / rateFrom) * rateTo;
    return single.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }, [fromCurr, toCurr, rates]);

  const currencyKeys = Object.keys(CURRENCY_NAMES).filter((k) => rates[k] !== undefined);

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconCurrency width={28} height={28} />
            </div>
            <div>
              <h1>WÄHRUNGSRECHNER</h1>
              <p className="tool-page-desc">Tagesaktuelle Umrechnungskurse ohne Registrierung und Gebühren.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schnell-Auswahl Chips */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
          SCHNELL-UMRECHNUNG
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CURRENCY_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className={`chip ${fromCurr === chip.from && toCurr === chip.to ? 'active' : ''}`}
              onClick={() => {
                setFromCurr(chip.from);
                setToCurr(chip.to);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Haupt-Rechner Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'flex-end' }}>
          {/* Von */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="curr-amount">Betrag ({fromCurr})</label>
            <input
              id="curr-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
            <div style={{ marginTop: '8px' }}>
              <select
                value={fromCurr}
                onChange={(e) => setFromCurr(e.target.value)}
                aria-label="Ausgangswährung"
              >
                {currencyKeys.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_NAMES[c] || c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tausch-Button */}
          <div style={{ paddingBottom: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={handleSwap}
              title="Währungen tauschen"
              aria-label="Währungen tauschen"
            >
              <IconSwap width={20} height={20} />
            </button>
          </div>

          {/* Nach */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="curr-result">Ergebnis ({toCurr})</label>
            <input
              id="curr-result"
              type="text"
              readOnly
              value={convertedAmount}
              style={{ fontWeight: 700, backgroundColor: 'var(--bg-subtle)' }}
            />
            <div style={{ marginTop: '8px' }}>
              <select
                value={toCurr}
                onChange={(e) => setToCurr(e.target.value)}
                aria-label="Zielwährung"
              >
                {currencyKeys.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_NAMES[c] || c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="dashed-divider" />

        {/* Statuszeile & Kurs-Stand */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>WECHSELKURS:</span>
              <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                1 {fromCurr} = {singleRate} {toCurr}
              </span>
            </div>
            {lastUpdated && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Stand: {lastUpdated}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={fetchRates}
              disabled={isLoading}
              title="Kurse jetzt aktualisieren"
            >
              <IconRefresh width={16} height={16} />
              {isLoading ? 'LÄDT...' : 'AKTUALISIEREN'}
            </button>
            <CopyButton
              textToCopy={`${convertedAmount} ${toCurr}`}
              label="BETRAG KOPIEREN"
              copiedLabel="KOPIERT!"
              size="sm"
            />
          </div>
        </div>

        {/* Offline / Hinweis */}
        {isOfflineMode && (
          <div className="panel-subtle" style={{ marginTop: '16px', backgroundColor: 'var(--warning-amber-light)' }}>
            <strong>Hinweis zum Offline-Modus:</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              {fetchError || 'Kurse wurden aus dem lokalen Browser-Cache geladen. Sobald wieder eine Internetverbindung besteht, werden aktuelle Kurse automatisch abgerufen.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
