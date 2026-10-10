// src/tools/ConverterTool.jsx
// Einheiten-Umrechner: 7 Kategorien, Live-Berechnung, Quick-Paare, Tausch-Funktion

import React, { useState, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconConverter, IconSwap } from '../components/Icons';
import CopyButton from '../components/CopyButton';

const CATEGORIES_DATA = {
  LAENGE: {
    name: 'LÄNGE',
    units: {
      mm: { label: 'Millimeter (mm)', factor: 0.001 },
      cm: { label: 'Zentimeter (cm)', factor: 0.01 },
      m: { label: 'Meter (m)', factor: 1 },
      km: { label: 'Kilometer (km)', factor: 1000 },
      inch: { label: 'Zoll / Inch (in)', factor: 0.0254 },
      ft: { label: 'Fuß / Feet (ft)', factor: 0.3048 },
      mi: { label: 'Meilen (mi)', factor: 1609.344 },
    },
    defaultFrom: 'cm',
    defaultTo: 'ft',
  },
  GEWICHT: {
    name: 'GEWICHT',
    units: {
      mg: { label: 'Milligramm (mg)', factor: 0.000001 },
      g: { label: 'Gramm (g)', factor: 0.001 },
      kg: { label: 'Kilogramm (kg)', factor: 1 },
      t: { label: 'Tonne (t)', factor: 1000 },
      oz: { label: 'Unzen (oz)', factor: 0.02834952 },
      lbs: { label: 'Pfund (lbs)', factor: 0.45359237 },
    },
    defaultFrom: 'kg',
    defaultTo: 'lbs',
  },
  TEMPERATUR: {
    name: 'TEMPERATUR',
    units: {
      c: { label: 'Grad Celsius (°C)' },
      f: { label: 'Grad Fahrenheit (°F)' },
      k: { label: 'Kelvin (K)' },
    },
    defaultFrom: 'c',
    defaultTo: 'f',
  },
  VOLUMEN: {
    name: 'VOLUMEN',
    units: {
      ml: { label: 'Milliliter (ml)', factor: 0.001 },
      cl: { label: 'Zentiliter (cl)', factor: 0.01 },
      l: { label: 'Liter (l)', factor: 1 },
      m3: { label: 'Kubikmeter (m³)', factor: 1000 },
      cuft: { label: 'Kubikfuß (cu ft)', factor: 28.3168 },
      gal: { label: 'US-Gallonen (gal)', factor: 3.78541 },
    },
    defaultFrom: 'l',
    defaultTo: 'gal',
  },
  FLAECHE: {
    name: 'FLÄCHE',
    units: {
      cm2: { label: 'Quadratzentimeter (cm²)', factor: 0.0001 },
      m2: { label: 'Quadratmeter (m²)', factor: 1 },
      ha: { label: 'Hektar (ha)', factor: 10000 },
      km2: { label: 'Quadratkilometer (km²)', factor: 1000000 },
      sqft: { label: 'Quadratfuß (sq ft)', factor: 0.092903 },
      ac: { label: 'Acre (ac)', factor: 4046.86 },
    },
    defaultFrom: 'm2',
    defaultTo: 'sqft',
  },
  ZEIT: {
    name: 'ZEIT',
    units: {
      ms: { label: 'Millisekunden (ms)', factor: 0.001 },
      s: { label: 'Sekunden (s)', factor: 1 },
      min: { label: 'Minuten (min)', factor: 60 },
      h: { label: 'Stunden (h)', factor: 3600 },
      d: { label: 'Tage (d)', factor: 86400 },
      w: { label: 'Wochen (w)', factor: 604800 },
      a: { label: 'Jahre (a, 365d)', factor: 31536000 },
    },
    defaultFrom: 'h',
    defaultTo: 'min',
  },
  DATEN: {
    name: 'DATENGRÖSSE',
    units: {
      b: { label: 'Byte (B)', factor: 1 },
      kb: { label: 'Kilobyte (KB)', factor: 1000 },
      mb: { label: 'Megabyte (MB)', factor: 1000000 },
      gb: { label: 'Gigabyte (GB)', factor: 1000000000 },
      tb: { label: 'Terabyte (TB)', factor: 1000000000000 },
      pb: { label: 'Petabyte (PB)', factor: 1000000000000000 },
    },
    defaultFrom: 'gb',
    defaultTo: 'mb',
  },
};

const QUICK_PAIRS = [
  { cat: 'LAENGE', from: 'cm', to: 'ft', label: 'cm ↔ ft' },
  { cat: 'GEWICHT', from: 'kg', to: 'lbs', label: 'kg ↔ lbs' },
  { cat: 'LAENGE', from: 'km', to: 'mi', label: 'km ↔ mi' },
  { cat: 'TEMPERATUR', from: 'c', to: 'f', label: '°C ↔ °F' },
  { cat: 'DATEN', from: 'gb', to: 'mb', label: 'GB ↔ MB' },
];

export default function ConverterTool() {
  usePageMeta(
    'Einheiten-Umrechner',
    'Schneller Einheitenumrechner für Länge, Gewicht, Temperatur, Volumen, Fläche, Zeit & Daten. Live-Ergebnis ohne Knopfdruck.'
  );

  const [activeCategory, setActiveCategory] = useState('LAENGE');
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState(CATEGORIES_DATA.LAENGE.defaultFrom);
  const [toUnit, setToUnit] = useState(CATEGORIES_DATA.LAENGE.defaultTo);

  // Kategorie wechseln
  const handleCategoryChange = (catKey) => {
    setActiveCategory(catKey);
    setFromUnit(CATEGORIES_DATA[catKey].defaultFrom);
    setToUnit(CATEGORIES_DATA[catKey].defaultTo);
  };

  // Quick-Paar anwenden
  const handleQuickPair = (pair) => {
    setActiveCategory(pair.cat);
    setFromUnit(pair.from);
    setToUnit(pair.to);
  };

  // Tauschen
  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  // Berechnung
  const result = useMemo(() => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';

    if (activeCategory === 'TEMPERATUR') {
      let celsius = num;
      if (fromUnit === 'f') celsius = (num - 32) * (5 / 9);
      if (fromUnit === 'k') celsius = num - 273.15;

      let res = celsius;
      if (toUnit === 'f') res = celsius * (9 / 5) + 32;
      if (toUnit === 'k') res = celsius + 273.15;

      return Number(res.toFixed(4)).toString();
    }

    const currentCat = CATEGORIES_DATA[activeCategory];
    const fromFactor = currentCat.units[fromUnit]?.factor || 1;
    const toFactor = currentCat.units[toUnit]?.factor || 1;

    const baseValue = num * fromFactor;
    const converted = baseValue / toFactor;

    // Sinnvoll formatieren (ohne unnötige Nullen am Ende)
    if (Math.abs(converted) >= 1e6 || (Math.abs(converted) < 1e-4 && converted !== 0)) {
      return converted.toPrecision(6);
    }
    return Number(converted.toFixed(6)).toString();
  }, [value, activeCategory, fromUnit, toUnit]);

  const currentCat = CATEGORIES_DATA[activeCategory];
  const fromLabel = currentCat.units[fromUnit]?.label || fromUnit;
  const toLabel = currentCat.units[toUnit]?.label || toUnit;

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconConverter width={28} height={28} />
            </div>
            <div>
              <h1>EINHEITEN-UMRECHNER</h1>
              <p className="tool-page-desc">Rechne physikalische und digitale Einheiten in Echtzeit um.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick-Paare Leiste */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
          SCHNELL-PAARE
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {QUICK_PAIRS.map((pair, idx) => (
            <button
              key={idx}
              type="button"
              className={`chip ${activeCategory === pair.cat && fromUnit === pair.from && toUnit === pair.to ? 'active' : ''}`}
              onClick={() => handleQuickPair(pair)}
            >
              {pair.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kategorie-Reiter */}
      <div className="tab-nav">
        {Object.keys(CATEGORIES_DATA).map((catKey) => (
          <button
            key={catKey}
            type="button"
            className={`tab-btn ${activeCategory === catKey ? 'active' : ''}`}
            onClick={() => handleCategoryChange(catKey)}
          >
            {CATEGORIES_DATA[catKey].name}
          </button>
        ))}
      </div>

      {/* Haupt-Berechnungskarte */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'flex-end' }}>
          {/* Von-Bereich */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="unit-input">Eingabewert ({fromLabel.split(' ')[0]})</label>
            <input
              id="unit-input"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Zahl eingeben..."
            />
            <div style={{ marginTop: '8px' }}>
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                aria-label="Ausgangseinheit"
              >
                {Object.entries(currentCat.units).map(([key, u]) => (
                  <option key={key} value={key}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tauschen-Button */}
          <div style={{ paddingBottom: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={handleSwap}
              title="Einheiten tauschen"
              aria-label="Einheiten tauschen"
            >
              <IconSwap width={20} height={20} />
            </button>
          </div>

          {/* Nach-Bereich */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="unit-output">Ergebnis ({toLabel.split(' ')[0]})</label>
            <input
              id="unit-output"
              type="text"
              readOnly
              value={result}
              placeholder="Ergebnis..."
              style={{ fontWeight: 700, backgroundColor: 'var(--bg-subtle)' }}
            />
            <div style={{ marginTop: '8px' }}>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                aria-label="Zieleinheit"
              >
                {Object.entries(currentCat.units).map(([key, u]) => (
                  <option key={key} value={key}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="dashed-divider" />

        {/* Live-Gleichung & Kopieren */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>UMRECHNUNG:</span>
            <p className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {value || '0'} {fromLabel.split(' ')[0]} = {result || '0'} {toLabel.split(' ')[0]}
            </p>
          </div>
          <CopyButton
            textToCopy={result}
            label="ERGEBNIS KOPIEREN"
            copiedLabel="KOPIERT!"
          />
        </div>

        {/* Datengröße-Hinweis */}
        {activeCategory === 'DATEN' && (
          <div className="panel-subtle" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
            <strong>Hinweis zum Dezimalsystem:</strong>
            <p className="text-muted" style={{ marginTop: '4px' }}>
              Dieser Rechner rechnet nach dem internationalen SI-Standard dezimal um (1 GB = 1.000 MB). In Windows und manchen Betriebssystemen wird oft binär gerechnet (1 GiB = 1.024 MiB = 1.073.741.824 Bytes), was zu scheinbar kleineren Speichergrößen führt.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
