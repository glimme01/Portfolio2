// src/pages/Lobby.jsx
// Lobby mit 12 Tool-Karten, 4 einklappbaren Kategorien, Live-Suchfeld und Responsive-Grid

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

  const [searchTerm, setSearchTerm] = useState('');

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

  // Gefilterte Tools basierend auf Suchbegriff
  const filteredTools = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return TOOLS_DATA;

    return TOOLS_DATA.filter((tool) => {
      const matchTitle = tool.title.toLowerCase().includes(term);
      const matchDesc = tool.description.toLowerCase().includes(term);
      const matchTags = tool.tags.some((tag) => tag.toLowerCase().includes(term));
      return matchTitle || matchDesc || matchTags;
    });
  }, [searchTerm]);

  return (
    <div>
      {/* Hero-Bereich */}
      <section style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-width) solid var(--border-color)',
              boxShadow: 'var(--shadow-offset)',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="Moritzfreund Tools Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
            />
          </div>
          <div>
            <span className="badge badge-marker">SCHNELL · PRIVAT · OFFLINE</span>
          </div>
        </div>
        <h1 style={{ marginBottom: '12px' }}>MORITZFREUND TOOLS</h1>
        <p style={{ maxWidth: '640px', margin: '0 auto', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Eine kuratierte Sammlung von 12 nützlichen Werkzeugen für den Alltag.
          Funktioniert direkt im Browser, ohne Tracking und ohne Werbung.
        </p>

        {/* Live-Suchfeld */}
        <div style={{ maxWidth: '540px', margin: '24px auto 0 auto', position: 'relative' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)', display: 'flex' }}>
              <IconSearch width={20} height={20} />
            </span>
            <input
              type="search"
              placeholder="Finde ein Tool (z. B. QR, Passwort, Noten, Speed...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '48px', paddingRight: searchTerm ? '44px' : '16px' }}
              aria-label="Tools durchsuchen"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  minHeight: '36px',
                  height: '36px',
                  width: '36px',
                  padding: 0,
                  boxShadow: 'none',
                  border: 'none',
                  background: 'transparent',
                }}
                title="Suche zurücksetzen"
              >
                <IconClear width={18} height={18} />
              </button>
            )}
          </div>
          {searchTerm && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'left' }}>
              {filteredTools.length} {filteredTools.length === 1 ? 'Treffer' : 'Treffer'} für "{searchTerm}"
            </p>
          )}
        </div>
      </section>

      {/* Bei 0 Treffern: Freundliche Leermeldung */}
      {filteredTools.length === 0 && (
        <div className="card text-center" style={{ maxWidth: '520px', margin: '40px auto', padding: '40px 24px' }}>
          <h3 style={{ marginBottom: '12px' }}>KEIN TOOL GEFUNDEN</h3>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            Für „{searchTerm}“ gibt es leider noch kein passendes Werkzeug. Überprüfe die Schreibweise oder setze die Suche zurück.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setSearchTerm('')}>
            ALLE 12 TOOLS ANZEIGEN
          </button>
        </div>
      )}

      {/* Kategorien-Übersicht */}
      {CATEGORIES.map((category) => {
        const catTools = filteredTools.filter((t) => t.category === category.id);
        if (catTools.length === 0) return null;

        const isOpen = openCategories[category.id] ?? true;

        return (
          <section key={category.id} className="category-section">
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
                <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)' }}>{category.title}</h2>
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
                      className="tool-card"
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
