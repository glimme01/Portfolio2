// src/pages/Lobby.jsx
// MOOLS — 12 Tools ohne Bullshit
// Asymmetrisches, responsives Neo-Brutalismus-Dashboard mit interaktiver Play-Zone

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
  IconSearch,
  IconClear,
  IconChevronDown,
  IconChevronUp,
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
  // INTERAKTIVE PLAY-ZONE STATES & LOGIK (WÜRFEL, PASSWORT, FARBE, KLICKER)
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
          HAUPTSPALTE (LINKS / MITTE): HERO, STEUERUNG, KATEGORIEN & TOOLS
          ==================================================================== */}
      <div className="mools-main-col">
        {/* Brand Header */}
        <section className="mools-hero">
          <div className="mools-tag-row">
            <span className="mools-tag">[V2.0]</span>
            <span className="mools-tag mools-tag-accent">[100% LOKAL]</span>
            <span className="mools-tag">
              <span className="live-dot" style={{ marginRight: '4px' }} />
              [0 TRACKER]
            </span>
            <span className="mools-tag">[OFFLINE-FIRST]</span>
          </div>

          <h1 className="mools-title">MOOLS</h1>
          <div className="mools-sub">(Moritz und Tools checkst du? :/)</div>

          <p className="mools-lead">
            12 schlaue Werkzeuge für den Alltag. Keine Cookies, kein Login, keine Werbebanner.
            Alles läuft direkt in deinem Browser.
          </p>
        </section>

        {/* Brutalist Toolbar & Controls */}
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

          {/* Filter-Kacheln mit Trefferzahlen */}
          <div className="mools-filter-row">
            <button
              type="button"
              className={`mools-filter-btn ${activeCategoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('ALL')}
            >
              [ALLE: 12]
            </button>
            {CATEGORIES.map((cat) => {
              const count = TOOLS_DATA.filter((t) => t.category === cat.id).length;
              const isActive = activeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`mools-filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                >
                  [{cat.id}: {count}]
                </button>
              );
            })}
          </div>

          {/* Steuerungsleiste: Ausklappen, Ansicht, Zufalls-Tool */}
          <div className="mools-actions-row">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={toggleAllCategories}
                title="Alle Kategorien auf- oder zuklappen"
              >
                {areAllOpen ? '[-] ALLE EINKLAPPEN' : '[+] ALLE AUSKLAPPEN'}
              </button>

              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleRandomTool}
                title="Ein zufälliges Tool aus allen 12 öffnen"
              >
                <IconDice width={14} height={14} />
                [ZUFALLS-TOOL]
              </button>
            </div>

            {/* Ansichts-Umschalter: Grid vs Liste */}
            <div className="mools-view-toggle">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('grid')}
                title="Kachel-Ansicht"
              >
                KACHELN
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('list')}
                title="Kompakte Listenansicht"
              >
                LISTE
              </button>
            </div>
          </div>
        </section>

        {/* Leermeldung bei 0 Treffern */}
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

        {/* Kategorien & Tools */}
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
                                style={{ pointerEvents: 'none' }}
                              >
                                ÖFFNEN
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                }}
                              >
                                <IconComp width={18} height={18} />
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tool.title}</span>
                                <span className="hide-tablet-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                  {tool.description}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* ====================================================================
          SEITENSPALTE (RECHTS): PLAY-ZONE (WÜRFE, PASSWORT, FARBE, KLICKER)
          ==================================================================== */}
      <aside className="mools-side-col" aria-label="Interaktive Play Zone">
        <div className="playzone-card">
          <div className="playzone-header">
            <span className="playzone-title">
              // PLAY_ZONE
            </span>
            <span className="badge badge-marker">[INTERAKTIV]</span>
          </div>

          {/* 1. QUICK WÜRFEL */}
          <div className="widget-box">
            <div className="widget-label">
              <span>🎲 QUICK WÜRFEL</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${diceType === 'd6' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDiceType('d6')}
                >
                  D6
                </button>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${diceType === 'd20' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDiceType('d20')}
                >
                  D20
                </button>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${diceType === 'coin' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDiceType('coin')}
                >
                  MÜNZE
                </button>
              </div>
            </div>

            <div className={`widget-dice-display ${isRolling ? 'rolling' : ''}`}>
              {diceValue}
            </div>

            <button
              type="button"
              className="btn btn-sm btn-primary btn-block"
              onClick={rollDice}
              disabled={isRolling}
            >
              [ WÜRFELN ]
            </button>
          </div>

          {/* 2. INSTANT PASSWORT */}
          <div className="widget-box">
            <div className="widget-label">
              <span>🔑 INSTANT PASSWORT</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${pwdLength === 8 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setPwdLength(8);
                    generateQuickPassword(8);
                  }}
                >
                  8
                </button>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${pwdLength === 16 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setPwdLength(16);
                    generateQuickPassword(16);
                  }}
                >
                  16
                </button>
                <button
                  type="button"
                  style={{ minHeight: '24px', height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
                  className={`btn btn-sm ${pwdLength === 24 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setPwdLength(24);
                    generateQuickPassword(24);
                  }}
                >
                  24
                </button>
              </div>
            </div>

            <div className="widget-pwd-display">
              {quickPwd}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => generateQuickPassword(pwdLength)}
              >
                [ NEU ]
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={copyPassword}
              >
                {pwdCopied ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
                {pwdCopied ? 'KOPIERT!' : 'KOPIEREN'}
              </button>
            </div>
          </div>

          {/* 3. FARB-ROULETTE */}
          <div className="widget-box">
            <div className="widget-label">
              <span>🎨 ZUFALLS-FARBE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{quickColor}</span>
            </div>

            <div
              className="widget-color-preview"
              style={{ backgroundColor: quickColor }}
              onClick={copyColor}
              title="Klicken zum Kopieren"
            >
              {colorCopied ? 'HEX KOPIERT!' : quickColor}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={generateRandomColor}
              >
                [ NEUE FARBE ]
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={copyColor}
              >
                {colorCopied ? 'KOPIERT!' : 'KOPIEREN'}
              </button>
            </div>
          </div>

          {/* 4. MINI CPS KLICK-PAD */}
          <div className="widget-box">
            <div className="widget-label">
              <span>⚡ MINI KLICK-PAD</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>KLICKS: {cpsClicks}</span>
            </div>

            <div
              className="widget-cps-pad"
              onClick={() => setCpsClicks((prev) => prev + 1)}
              role="button"
              tabIndex={0}
              title="Klicke so schnell du kannst!"
            >
              <span>KLICK MICH!</span>
              <span style={{ color: 'var(--btn-primary-bg)' }}>[{cpsClicks}]</span>
            </div>

            {cpsClicks > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary btn-block"
                onClick={() => setCpsClicks(0)}
              >
                [ ZÄHLER ZURÜCKSETZEN ]
              </button>
            )}
          </div>
        </div>

        {/* Quick System Telemetrie */}
        <div className="card" style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted">STATUS:</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>● ALL SYSTEMS GO</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted">TOOLS:</span>
            <span>12 / 12 BEREIT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">TRACKING:</span>
            <span>0 BYTES</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
