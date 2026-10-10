// src/pages/Lobby.jsx
// MOOLS — 12 Tools ohne Bullshit
// Aufgeräumtes, schnelles Dashboard mit GEMOSH-Poster-Titel, Eck-Suche und responsivem Grid

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import { TOOLS_DATA } from '../data/toolsData';
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
    'Tools ohne Bullshit'
  );

  const [searchTerm, setSearchTerm] = useState('');

  // Gefilterte Tools nach Suchbegriff
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
    <div className="mools-dashboard">
      {/* ====================================================================
          AUFGERÄUMTER HEADER: NUR "Tools ohne Bullshit" + ECK-SUCHE
          ==================================================================== */}
      <header className="mools-clean-header">
        <h1 className="mools-main-title">Tools ohne Bullshit</h1>

        {/* SUCHE */}
        <div className="mools-corner-search">
          <div className="mools-search-wrapper">
            <input
              type="search"
              className="mools-search-input"
              placeholder="Tools durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tools durchsuchen"
            />
            {searchTerm && (
              <button
                type="button"
                className="mools-search-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Suche leeren"
                aria-label="Suche leeren"
              >
                <IconClear width={16} height={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          RESPONSIVER WERKZEUG-RASTER (KEINE LANGWEILIGEN ACCORDIONS)
          ==================================================================== */}
      <main className="mools-tools-container">
        {filteredTools.length === 0 ? (
          <div className="card text-center" style={{ padding: '40px 20px', maxWidth: '540px', margin: '40px auto' }}>
            <h3 style={{ marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>[KEINE TREFFER]</h3>
            <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
              Kein Tool passend zu „{searchTerm}“ gefunden.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setSearchTerm('')}
            >
              SUCHE ZURÜCKSETZEN
            </button>
          </div>
        ) : (
          <div className="tools-grid">
            {filteredTools.map((tool) => {
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
                    </div>

                    <h2 className="tool-card-title">{tool.title}</h2>
                    <p className="tool-card-desc">{tool.description}</p>
                  </div>

                  <div className="tool-card-footer">
                    <span
                      className="btn btn-sm btn-secondary tool-card-btn"
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
        )}
      </main>
    </div>
  );
}
