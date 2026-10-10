// src/pages/Lobby.jsx
// MOOLS — 12 Tools ohne Bullshit
// Responsives Neo-Brutalismus-Dashboard mit GEMOSH Poster-Typografie & interaktivem Play-Deck

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { CATEGORIES, TOOLS_DATA } from '../data/toolsData';
import {
  IconQr,
  IconPassword,
  IconConverter,
  IconCurrency,
  IconGrades,
  IconImageCompress,
  IconImageConvert,
  IconColor,
  IconDice,
  IconWordle,
  IconSpeed,
  IconCps,
  IconClear,
  IconArrowRight,
  IconCopy,
  IconCheck,
} from '../components/Icons';

// Icon-Map
const iconMap = {
  IconQr,
  IconPassword,
  IconConverter,
  IconCurrency,
  IconGrades,
  IconImageCompress,
  IconImageConvert,
  IconColor,
  IconDice,
  IconWordle,
  IconSpeed,
  IconCps,
};

export default function Lobby() {
  usePageMeta(
    'Mools — 12 Tools ohne Bullshit',
    'Mools (Moritz + Tools): 12 schnelle Alltags-Tools ohne Tracker, ohne Werbung, 100% lokal im Browser.'
  );

  const navigate = useNavigate();

  // Navigation & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [playDeckOpen, setPlayDeckOpen] = useState(false);

  // Einklappbare Kategorien (Default: alle offen)
  const [openCategories, setOpenCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('mools_open_cats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('localStorage Fehler', e);
    }
    return {
      SCHULE: true,
      ALLTAG: true,
      SPIELEREI: true,
      TECHNIK: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('mools_open_cats', JSON.stringify(openCategories));
    } catch (e) {
      console.warn('localStorage Fehler', e);
    }
  }, [openCategories]);

  const toggleCategory = (catId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const areAllOpen = Object.values(openCategories).every(Boolean);

  const toggleAllCategories = () => {
    const nextState = !areAllOpen;
    setOpenCategories({
      SCHULE: nextState,
      ALLTAG: nextState,
      SPIELEREI: nextState,
      TECHNIK: nextState,
    });
  };

  // =========================================================================
  // INTERAKTIVES PLAY-DECK LOGIK (WÜRFEL, PASSWORT, FARBE, CPS)
  // =========================================================================

  // 1. Quick Würfel
  const [diceType, setDiceType] = useState('d6'); // 'd6' | 'd20' | 'coin'
  const [diceValue, setDiceValue] = useState('6');
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      if (diceType === 'd6') {
        setDiceValue(String(Math.floor(Math.random() * 6) + 1));
      } else if (diceType === 'd20') {
        setDiceValue(String(Math.floor(Math.random() * 20) + 1));
      } else {
        setDiceValue(Math.random() < 0.5 ? 'KOPF' : 'ZAHL');
      }
      setIsRolling(false);
    }, 180);
  };

  // 2. Instant Passwort
  const [pwdLength, setPwdLength] = useState(16);
  const [quickPwd, setQuickPwd] = useState('mK8#vL9$pQ2@xR4!');
  const [pwdCopied, setPwdCopied] = useState(false);

  const generateQuickPassword = (len = pwdLength) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
    let res = '';
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) {
      res += chars[array[i] % chars.length];
    }
    setQuickPwd(res);
    setPwdCopied(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(quickPwd);
    setPwdCopied(true);
    setTimeout(() => setPwdCopied(false), 1500);
  };

  // 3. Farb-Roulette
  const [quickColor, setQuickColor] = useState('#E59838');
  const [colorCopied, setColorCopied] = useState(false);

  const generateRandomColor = () => {
    const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    setQuickColor(hex);
    setColorCopied(false);
  };

  const copyColor = () => {
    navigator.clipboard.writeText(quickColor);
    setColorCopied(true);
    setTimeout(() => setColorCopied(false), 1500);
  };

  // 4. Mini CPS Clicker Pad
  const [cpsClicks, setCpsClicks] = useState(0);

  // Gefilterte Tools
  const filteredTools = useMemo(() => {
    let list = TOOLS_DATA;

    if (activeCategoryFilter !== 'ALL') {
      list = list.filter((t) => t.category === activeCategoryFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter((tool) => {
      const matchTitle = tool.title.toLowerCase().includes(term);
      const matchDesc = tool.description.toLowerCase().includes(term);
      const matchTags = tool.tags.some((tag) => tag.toLowerCase().includes(term));
      return matchTitle || matchDesc || matchTags;
    });
  }, [searchTerm, activeCategoryFilter]);

  // Zufalls-Tool Navigation
  const handleRandomTool = () => {
    const randomIndex = Math.floor(Math.random() * TOOLS_DATA.length);
    navigate(TOOLS_DATA[randomIndex].path);
  };

  return (
    <div className="mools-dashboard">
      {/* ====================================================================
          HERO BRANDING (GEMOSH POSTER-TYPOGRAFIE + DIE SMARTE FORMEL)
          ==================================================================== */}
      <section className="mools-hero">
        <div className="mools-kicker-row">
          <span className="mools-kicker-tag mools-kicker-accent">PORTFOLIO // LAB</span>
          <span className="mools-kicker-tag">12 CLIENT-SIDE APPS</span>
          <span className="mools-kicker-tag">100% LOKAL & WERBEFREI</span>
        </div>

        {/* GEMOSH PLAKAT-POSTER TITEL */}
        <div className="mools-poster-container">
          <div className="mools-poster-eyebrow">
            CLIENT-SIDE WEB SUITE // EDITION 2026
          </div>

          <div className="mools-poster-row">
            <h1 className="mools-poster-title" title="MOOLS = Moritz + Tools">
              MOOLS
            </h1>
          </div>

          {/* DIE SMARTE FORMEL: MORITZ + TOOLS = MOOLS */}
          <div className="mools-formula-lockup" aria-label="Erklärung: Moritz plus Tools ergibt Mools">
            <div className="mools-formula-chunk" title="MO stammt aus Moritz">
              <span className="formula-label">URHEBER</span>
              <strong className="formula-hl">MO</strong>
              <span className="formula-tail">RITZ</span>
            </div>
            <span className="mools-formula-symbol">+</span>
            <div className="mools-formula-chunk" title="OOLS stammt aus Tools">
              <span className="formula-label">SYSTEM</span>
              <span className="formula-tail">T</span>
              <strong className="formula-hl">OOLS</strong>
            </div>
            <span className="mools-formula-symbol">=</span>
            <div className="mools-formula-chunk mools-formula-chunk-result" title="MO + OLS = MOOLS">
              <strong className="formula-res-text">MOOLS</strong>
              <span className="formula-badge">12 TOOLS</span>
            </div>
          </div>

          {/* Der geforderte Spruch */}
          <div className="mools-cheeky-sub">
            (Moritz und Tools checkst du? :/)
          </div>
        </div>

        <p className="mools-lead">
          12 kompromisslose Alltags-Werkzeuge für Schule, Alltag, Spielerei & Technik.
          Keine Cookies, kein Login, keine Werbebanner — 100% lokal im Browser.
        </p>
      </section>

      {/* ====================================================================
          TOOLBAR & CONTROLS (SUCHE, FILTER, VIEWS & PLAY-DECK TRIGGER)
          ==================================================================== */}
      <section className="mools-controls" aria-label="Toolbox Filter & Suche">
        {/* Suchfeld */}
        <div className="mools-search-row">
          <input
            type="search"
            className="mools-search-input"
            placeholder="> filter_tools(suche, tags, namen)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Tools durchsuchen"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                minHeight: '32px',
                height: '32px',
                width: '32px',
                padding: 0,
                boxShadow: 'none',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Suche leeren"
            >
              <IconClear width={16} height={16} />
            </button>
          )}
        </div>

        {/* Kategorie-Filterbuttons */}
        <div className="mools-filter-row">
          <button
            type="button"
            className={`mools-filter-btn ${activeCategoryFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('ALL')}
          >
            ALLE ({TOOLS_DATA.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = TOOLS_DATA.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                className={`mools-filter-btn ${activeCategoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat.id)}
              >
                {cat.title} ({count})
              </button>
            );
          })}
        </div>

        {/* Toolbar Aktionen */}
        <div className="mools-toolbar-actions">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleRandomTool}
              title="Ein zufälliges Tool aus den 12 öffnen"
            >
              🎲 ZUFALLS-TOOL
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={toggleAllCategories}
              title="Alle Kategorien auf- oder zuklappen"
            >
              {areAllOpen ? '▾ ALLE ZUKLAPPEN' : '▴ ALLE AUSKLAPPEN'}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${playDeckOpen ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPlayDeckOpen(!playDeckOpen)}
              title="Interaktives Play-Deck ein- oder ausblenden"
            >
              {playDeckOpen ? '✕ PLAY-DECK SCHLIESSEN' : '⚡ PLAY-DECK AUSKLAPPEN'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>ANSICHT:</span>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('grid')}
              aria-label="Kachelansicht"
            >
              KACHELN
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
              aria-label="Listenansicht"
            >
              LISTE
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          AUSKLAPPBARES INTERAKTIVES PLAY-DECK (ELEMENTE ZUM SPIELEN)
          ==================================================================== */}
      {playDeckOpen && (
        <section className="mools-playdeck" aria-label="Interaktives Play-Deck">
          <div className="mools-playdeck-header">
            <div className="mools-playdeck-title">
              <span>⚡ INTERAKTIVES PLAY-DECK</span>
              <span className="badge badge-live">LIVE TESTING</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setPlayDeckOpen(false)}
              style={{ minHeight: '30px', padding: '2px 8px' }}
            >
              SCHLIESSEN
            </button>
          </div>

          <div className="mools-playdeck-grid">
            {/* 1. Quick Würfel */}
            <div className="mools-play-card">
              <div className="mools-play-card-title">
                <IconDice width={14} height={14} /> WÜRFEL / COIN
              </div>
              <div className="mools-play-screen mools-dice-screen">
                {isRolling ? '...' : diceValue}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${diceType === 'd6' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px', fontSize: '0.75rem', minHeight: '32px' }}
                  onClick={() => setDiceType('d6')}
                >
                  D6
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${diceType === 'd20' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px', fontSize: '0.75rem', minHeight: '32px' }}
                  onClick={() => setDiceType('d20')}
                >
                  D20
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${diceType === 'coin' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px', fontSize: '0.75rem', minHeight: '32px' }}
                  onClick={() => setDiceType('coin')}
                >
                  MÜNZE
                </button>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={rollDice}
                disabled={isRolling}
                style={{ width: '100%' }}
              >
                {isRolling ? 'ROLLT...' : '🎲 WÜRFELN'}
              </button>
            </div>

            {/* 2. Instant Passwort */}
            <div className="mools-play-card">
              <div className="mools-play-card-title">
                <IconPassword width={14} height={14} /> INSTANT PASSWORT
              </div>
              <div className="mools-play-screen mools-pwd-screen" title={quickPwd}>
                {quickPwd}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[8, 16, 24].map((len) => (
                  <button
                    key={len}
                    type="button"
                    className={`btn btn-sm ${pwdLength === len ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px', fontSize: '0.75rem', minHeight: '32px' }}
                    onClick={() => {
                      setPwdLength(len);
                      generateQuickPassword(len);
                    }}
                  >
                    {len}z
                  </button>
                ))}
              </div>
              <div className="mools-play-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => generateQuickPassword()}
                  style={{ flex: 1 }}
                >
                  NEU
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={copyPassword}
                  style={{ flex: 1 }}
                >
                  {pwdCopied ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
                  {pwdCopied ? 'KOPIERT' : 'KOPIEREN'}
                </button>
              </div>
            </div>

            {/* 3. Farb-Roulette */}
            <div className="mools-play-card">
              <div className="mools-play-card-title">
                <IconColor width={14} height={14} /> FARB-ROULETTE
              </div>
              <div
                className="mools-play-screen mools-color-screen"
                style={{
                  backgroundColor: quickColor,
                  color: '#ffffff',
                }}
              >
                {quickColor}
              </div>
              <div className="mools-play-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={generateRandomColor}
                  style={{ flex: 1 }}
                >
                  ZUFALL
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={copyColor}
                  style={{ flex: 1 }}
                >
                  {colorCopied ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
                  {colorCopied ? 'HEX OK' : 'HEX KOPIEREN'}
                </button>
              </div>
            </div>

            {/* 4. CPS Mini-Clicker */}
            <div className="mools-play-card">
              <div className="mools-play-card-title">
                <IconCps width={14} height={14} /> CPS KLICKER
              </div>
              <div className="mools-play-screen mools-cps-screen">
                {cpsClicks} KLICKS
              </div>
              <div className="mools-play-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setCpsClicks((c) => c + 1)}
                  style={{ flex: 2, minHeight: '36px', fontWeight: 800 }}
                >
                  KLICKEN!
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCpsClicks(0)}
                  style={{ flex: 1 }}
                  title="Zurücksetzen"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          LEERMELDUNG BEI 0 TREFFERN
          ==================================================================== */}
      {filteredTools.length === 0 && (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>[0 TREFFER]</h3>
          <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
            Kein Tool passend zu „{searchTerm}“ gefunden.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              setSearchTerm('');
              setActiveCategoryFilter('ALL');
            }}
          >
            FILTER ZURÜCKSETZEN
          </button>
        </div>
      )}

      {/* ====================================================================
          KATEGORIEN & TOOLS (RESPONSIVES GRID ODER LISTE)
          ==================================================================== */}
      {CATEGORIES.map((category, catIndex) => {
        if (activeCategoryFilter !== 'ALL' && activeCategoryFilter !== category.id) {
          return null;
        }

        const catTools = filteredTools.filter((t) => t.category === category.id);
        if (catTools.length === 0) return null;

        const isOpen = openCategories[category.id] ?? true;

        return (
          <section key={category.id} className="category-section" id={`cat-${category.id.toLowerCase()}`}>
            {/* Einklappbarer Kategorie-Kopf */}
            <div
              className="category-header"
              onClick={() => toggleCategory(category.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCategory(category.id);
                }
              }}
              aria-expanded={isOpen}
            >
              <div className="category-title-group">
                <span className="badge badge-marker">
                  [#0{catIndex + 1}]
                </span>
                <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', letterSpacing: '-0.02em' }}>
                  {category.title}
                </h2>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ({catTools.length})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {isOpen ? '[-] ZUKLAPPEN' : '[+] AUSKLAPPEN'}
                </span>
              </div>
            </div>

            <hr className="dashed-divider" style={{ marginTop: '6px', marginBottom: '14px' }} />

            {/* Inhalt: Kachel-Ansicht oder Listen-Ansicht */}
            {isOpen && (
              <>
                {viewMode === 'grid' ? (
                  <div className="tools-grid">
                    {catTools.map((tool) => {
                      const IconComp = iconMap[tool.icon] || IconQr;

                      return (
                        <Link
                          to={tool.path}
                          key={tool.id}
                          className="tool-card"
                          aria-label={`${tool.title} öffnen`}
                        >
                          <div>
                            <div className="tool-card-header">
                              <div className="tool-icon-wrapper" aria-hidden="true">
                                <IconComp width={22} height={22} />
                              </div>
                              <span className={`badge ${tool.badge === 'LIVE' ? 'badge-live' : 'badge-offline'}`}>
                                {tool.badge === 'LIVE' ? (
                                  <>
                                    <span className="live-dot" /> LIVE
                                  </>
                                ) : (
                                  'OFFLINE'
                                )}
                              </span>
                            </div>

                            <h3 className="tool-card-title">{tool.title}</h3>
                            <p className="tool-card-desc">{tool.description}</p>
                          </div>

                          <div className="tool-card-footer">
                            <span
                              className="btn btn-sm btn-secondary"
                              style={{ pointerEvents: 'none', width: '100%', justifyContent: 'space-between' }}
                            >
                              <span>ÖFFNEN</span>
                              <IconArrowRight width={14} height={14} />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* Kompakte Listen-Ansicht */
                  <div className="mools-tools-list">
                    {catTools.map((tool) => {
                      const IconComp = iconMap[tool.icon] || IconQr;
                      return (
                        <Link
                          to={tool.path}
                          key={tool.id}
                          className="mools-list-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                border: 'var(--border-width-sm) solid var(--border-color)',
                                background: 'var(--bg-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '1px 1px 0 var(--shadow-color)',
                                flexShrink: 0,
                              }}
                            >
                              <IconComp width={18} height={18} />
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block' }}>
                                {tool.title}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tool.description}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span className="badge" style={{ fontSize: '0.68rem' }}>
                              {tool.badge}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                              &gt;
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
