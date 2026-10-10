// src/components/Header.jsx
// Kompakter Header (56px) mit Brutalist-Logo und dynamischem Breadcrumb

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconArrowLeft } from './Icons';
import { TOOLS_DATA } from '../data/toolsData';

export default function Header() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Finde heraus, welches Tool gerade aktiv ist
  const activeTool = TOOLS_DATA.find((t) => {
    if (t.path.startsWith(currentPath) && currentPath !== '/') {
      return true;
    }
    // Spezialfall Bilder-Tabs
    if (currentPath === '/bilder' && (t.id === 'bild-kompressor' || t.id === 'bild-konverter')) {
      const search = new URLSearchParams(location.search);
      const tab = search.get('tab');
      if (tab === 'convert' && t.id === 'bild-konverter') return true;
      if (tab !== 'convert' && t.id === 'bild-kompressor') return true;
    }
    return false;
  });

  const isHome = currentPath === '/';

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo & Markenname */}
        <Link to="/" className="header-brand" title="Zurück zur Übersicht">
          <span className="logo-badge" aria-hidden="true">MF</span>
          <span className="brand-title">MORITZFREUND TOOLS</span>
        </Link>

        {/* Dynamischer Breadcrumb auf Tool-Seiten */}
        {!isHome && (
          <nav className="breadcrumb-nav" aria-label="Breadcrumb Navigation">
            <Link to="/" className="breadcrumb-link" title="Alle Tools">
              <IconArrowLeft width={16} height={16} />
              <span className="hide-tablet-mobile">TOOLS</span>
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
            <span className="breadcrumb-current">
              {activeTool ? activeTool.title : 'TOOL'}
            </span>
          </nav>
        )}
      </div>
    </header>
  );
}
