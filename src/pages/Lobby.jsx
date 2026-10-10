// src/pages/Lobby.jsx
// Moritzfreund Tools — Inspiriert von SketchPad (Dark) & Gridline Supply (Light)

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from '../components/Icons';

// Icon-Map zur dynamischen Zuordnung
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
    '12 nützliche Alltags-Tools',
    'Moritzfreund Tools: Schnelle, private Werkzeuge für QR-Codes, Passwörter, Noten, Einheiten, Währungen, Bilder, Farben, Würfel, Wordle, Speed & CPS.'
  );

  const navigate = useNavigate();
  const toolsSectionRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  // Einklapp-Zustand für Kategorien aus localStorage laden (Default: alle offen)
  const [openCategories, setOpenCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_open_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('localStorage nicht lesbar', e);
    }
    return {
      SCHULE: true,
      ALLTAG: true,
      SPIELEREI: true,
      TECHNIK: true,
    };
  });

  // Zustand bei Änderungen speichern
  useEffect(() => {
    try {
      localStorage.setItem('mf_tools_open_categories', JSON.stringify(openCategories));
    } catch (e) {
      console.warn('localStorage Schreibfehler', e);
    }
  }, [openCategories]);

  const toggleCategory = (catId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Zufälliges Tool auswählen
  const handleRandomTool = () => {
    const randomIndex = Math.floor(Math.random() * TOOLS_DATA.length);
    navigate(TOOLS_DATA[randomIndex].path);
  };

  const scrollToTools = () => {
    if (toolsSectionRef.current) {
      toolsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Gefilterte Tools basierend auf Suchbegriff und aktiver Kategorie
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

  return (
    <div>
      {/* ====================================================================
          HERO-BEREICH (INSPIRIERT VON SKETCHPAD BILD 1 & GRIDLINE SUPPLY BILD 3)
          ==================================================================== */}
      <section className="hero-layout" aria-label="Einführung">
        {/* Linke Spalte: Markante Headline & CTAs */}
        <div className="hero-content">
          <div className="hero-badge-wrap">
            <span className="sketch-pill">
              Collaborative Studio · 12 Alltags-Tools
            </span>
          </div>

          <h1 className="hero-title">
            Werkzeuge nutzen, <br className="hide-tablet-mobile" />
            ohne den Flow zu verlieren
          </h1>

          <p className="hero-subtitle">
            Moritzfreund Tools ist die handgemachte Werkzeug-Sammlung für deinen Alltag:
            QR-Codes, sichere Passwörter, Noten, Einheiten, Farbwähler, Wordle und mehr — 
            mit Live-Vorschau, 100% privat und ohne Tracker.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-hero-primary"
              onClick={handleRandomTool}
              title="Ein zufälliges Tool aus allen 12 öffnen"
            >
              <IconDice width={20} height={20} />
              Zufälliges Tool starten
            </button>

            <button
              type="button"
              className="btn btn-hero-secondary"
              onClick={scrollToTools}
            >
              Alle 12 Tools ansehen
              <IconArrowRight width={16} height={16} />
            </button>
          </div>
        </div>

        {/* Rechte Spalte: Whiteboard Workshop-Board Card (Image 1 Preview) */}
        <div className="workshop-card" aria-label="Schnellzugriff Workshop Board">
          <div className="workshop-header">
            <span className="workshop-badge">
              ✦ Werkstatt-Board
            </span>
            <span className="badge badge-marker hide-tablet-mobile">
              Direktstart
            </span>
          </div>

          {/* 2x2 Feature-Grid */}
          <div className="workshop-grid">
            <Link to="/qr" className="workshop-tile">
              <div className="workshop-tile-icon" style={{ color: '#e59838' }}>
                <IconQr width={22} height={22} />
              </div>
              <div className="workshop-tile-text">
                <span className="workshop-tile-name">QR-Code</span>
                <span className="workshop-tile-sub">Vektor & PNG</span>
              </div>
            </Link>

            <Link to="/passwort" className="workshop-tile">
              <div className="workshop-tile-icon" style={{ color: '#ef4444' }}>
                <IconPassword width={22} height={22} />
              </div>
              <div className="workshop-tile-text">
                <span className="workshop-tile-name">Passwort</span>
                <span className="workshop-tile-sub">Stark & Entropie</span>
              </div>
            </Link>

            <Link to="/noten" className="workshop-tile">
              <div className="workshop-tile-icon" style={{ color: '#3b82f6' }}>
                <IconGrades width={22} height={22} />
              </div>
              <div className="workshop-tile-text">
                <span className="workshop-tile-name">Notenrechner</span>
                <span className="workshop-tile-sub">Schnitt & Punkte</span>
              </div>
            </Link>

            <Link to="/wordle" className="workshop-tile">
              <div className="workshop-tile-icon" style={{ color: '#10b981' }}>
                <IconWordle width={22} height={22} />
              </div>
              <div className="workshop-tile-text">
                <span className="workshop-tile-name">Wordle DE</span>
                <span className="workshop-tile-sub">7.300+ Wörter</span>
              </div>
            </Link>
          </div>

          {/* Status-Leisten wie in Bild 1 */}
          <div className="workshop-status-list">
            <div className="workshop-status-item">
              <span className="live-dot" />
              <span>100% Client-Side · Alle Berechnungen laufen lokal im Browser</span>
            </div>
            <div className="workshop-status-item">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              <span>0 Tracker · Keine Cookies · Keine Cloud-Pflicht</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          PROJECT DASHBOARD STATS (INSPIRIERT VON SKETCHPAD BILD 2)
          ==================================================================== */}
      <section className="dashboard-stats-grid" aria-label="Studio Statistiken">
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon-box">
              <IconConverter width={20} height={20} />
            </div>
            <span className="stat-badge stat-badge-green">+12 aktiv</span>
          </div>
          <div className="stat-value">12</div>
          <div className="stat-label">Tools im Repertoire</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon-box">
              <IconPassword width={20} height={20} />
            </div>
            <span className="stat-badge stat-badge-green">100% lokal</span>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-label">Tracker & Cookies</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon-box">
              <IconSpeed width={20} height={20} />
            </div>
            <span className="stat-badge">PWA-Ready</span>
          </div>
          <div className="stat-value">&lt; 1s</div>
          <div className="stat-label">Startzeit im Browser</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon-box">
              <IconWordle width={20} height={20} />
            </div>
            <span className="stat-badge">Wortschatz</span>
          </div>
          <div className="stat-value">7.300+</div>
          <div className="stat-label">Deutsche Wörter (Wordle)</div>
        </div>
      </section>

      {/* ====================================================================
          FLOATING CATEGORY DOCK (AUS BILD 1 & 2: "MARKETING / APP / E-COMMERCE")
          ==================================================================== */}
      <div className="category-dock-container" ref={toolsSectionRef}>
        <div className="category-dock" role="tablist" aria-label="Kategorie Filter">
          <button
            type="button"
            className={`dock-pill ${activeCategoryFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('ALL')}
            role="tab"
            aria-selected={activeCategoryFilter === 'ALL'}
          >
            Alle (12)
          </button>
          {CATEGORIES.map((cat) => {
            const count = TOOLS_DATA.filter((t) => t.category === cat.id).length;
            const isActive = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`dock-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat.id)}
                role="tab"
                aria-selected={isActive}
              >
                {cat.title} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          SLEEK PILL LIVE-SUCHFELD (GRIDLINE SUPPLY BILD 3)
          ==================================================================== */}
      <div className="search-pill-wrapper">
        <span style={{ position: 'absolute', left: '18px', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
          <IconSearch width={20} height={20} />
        </span>
        <input
          type="search"
          className="search-pill-input"
          placeholder="Finde ein Tool (z. B. QR, Passwort, Noten, Einheiten, Speed...)"
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
              right: '12px',
              minHeight: '36px',
              height: '36px',
              width: '36px',
              padding: 0,
              boxShadow: 'none',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            title="Suche zurücksetzen"
          >
            <IconClear width={18} height={18} />
          </button>
        )}
      </div>

      {searchTerm && (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px', textAlign: 'center' }}>
          {filteredTools.length} {filteredTools.length === 1 ? 'Treffer' : 'Treffer'} für „{searchTerm}“
        </p>
      )}

      {/* Bei 0 Treffern: Freundliche Leermeldung */}
      {filteredTools.length === 0 && (
        <div className="card text-center" style={{ maxWidth: '520px', margin: '40px auto', padding: '40px 24px' }}>
          <h3 style={{ marginBottom: '12px' }}>KEIN TOOL GEFUNDEN</h3>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            Für „{searchTerm}“ gibt es leider noch kein passendes Werkzeug. Überprüfe die Schreibweise oder setze die Filter zurück.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSearchTerm('');
              setActiveCategoryFilter('ALL');
            }}
          >
            ALLE 12 TOOLS ANZEIGEN
          </button>
        </div>
      )}

      {/* ====================================================================
          KATEGORIEN-LISTE MIT TOOL-KARTEN
          ==================================================================== */}
      {CATEGORIES.map((category) => {
        // Wenn ein Kategoriefilter aktiv ist und nicht übereinstimmt, überspringen
        if (activeCategoryFilter !== 'ALL' && activeCategoryFilter !== category.id) {
          return null;
        }

        const catTools = filteredTools.filter((t) => t.category === category.id);
        if (catTools.length === 0) return null;

        const isOpen = openCategories[category.id] ?? true;

        return (
          <section key={category.id} className="category-section" id={`cat-${category.id.toLowerCase()}`}>
            {/* Kategorie-Header */}
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
                <span className="category-pill">{category.id}</span>
                <h2 style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)' }}>{category.title}</h2>
                <span className="category-count">({catTools.length})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-muted hide-tablet-mobile" style={{ fontSize: '0.85rem' }}>
                  {isOpen ? 'Einklappen' : 'Ausklappen'}
                </span>
                <span style={{ display: 'flex', color: 'var(--text-main)' }}>
                  {isOpen ? <IconChevronUp width={20} height={20} /> : <IconChevronDown width={20} height={20} />}
                </span>
              </div>
            </div>

            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              {category.shortDesc}
            </p>

            <hr className="dashed-divider" style={{ marginTop: '8px', marginBottom: '16px' }} />

            {/* Einklappbarer Grid-Inhalt */}
            {isOpen && (
              <div className="tools-grid">
                {catTools.map((tool) => {
                  const IconComp = iconMap[tool.icon] || IconQr;

                  return (
                    <Link
                      to={tool.path}
                      key={tool.id}
                      className="tool-card card-sketch"
                      aria-label={`${tool.title} öffnen`}
                    >
                      <div>
                        <div className="tool-card-header">
                          <div className="tool-icon-wrapper" aria-hidden="true">
                            <IconComp width={24} height={24} />
                          </div>
                          {tool.badge === 'LIVE' ? (
                            <span className="badge badge-live">
                              <span className="live-dot" /> LIVE
                            </span>
                          ) : (
                            <span className="badge badge-offline">OFFLINE</span>
                          )}
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
            )}
          </section>
        );
      })}
    </div>
  );
}
