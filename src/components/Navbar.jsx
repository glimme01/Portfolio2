// src/components/Navbar.jsx
// Neo-Brutalismus Navbar: Eigenes Logo, Dropdown für alle 12 Tools, Dark-Mode-Umschalter & Mobile-Drawer

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  IconSun,
  IconMoon,
  IconMenu,
  IconClose,
  IconChevronDown,
  IconChevronUp,
  IconArrowLeft,
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
} from './Icons';
import { TOOLS_DATA, CATEGORIES } from '../data/toolsData';

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

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Klick außerhalb des Dropdowns schließt es
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bei Routenwechsel Menüs schließen
  useEffect(() => {
    setToolsDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location]);

  // Aktives Tool für Breadcrumb ermitteln
  const activeTool = TOOLS_DATA.find((t) => {
    if (t.path.startsWith(currentPath) && currentPath !== '/') return true;
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
    <header className="app-navbar" role="banner">
      <div className="navbar-container">
        {/* Linke Seite: Logo & Markenname */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="nav-brand" title="Mools — Startseite">
            <span className="nav-logo-box" aria-hidden="true">
              <img
                src="/logo.png"
                alt="Mools Logo"
                className="nav-logo-img"
              />
            </span>
            <div className="brand-text-col">
              <span className="brand-title">MOOLS</span>
              <span className="brand-sub">(Moritz und Tools checkst du? :/)</span>
            </div>
          </Link>

          {/* Breadcrumb auf Tool-Seiten (auf Desktop) */}
          {!isHome && (
            <nav className="breadcrumb-nav hide-tablet-mobile" aria-label="Breadcrumb">
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span className="breadcrumb-current">
                {activeTool ? activeTool.title : 'TOOL'}
              </span>
            </nav>
          )}
        </div>

        {/* Rechte Seite: Desktop Navigation & Theme-Umschalter */}
        <div className="nav-actions-group">
          {/* Desktop Links */}
          <nav className="nav-links-desktop" aria-label="Hauptnavigation">


            {/* Dropdown für alle 12 Tools */}
            <div className="nav-dropdown-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`nav-link ${toolsDropdownOpen ? 'active' : ''}`}
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                aria-expanded={toolsDropdownOpen}
                aria-haspopup="true"
              >
                TOOLS
                {toolsDropdownOpen ? (
                  <IconChevronUp width={14} height={14} />
                ) : (
                  <IconChevronDown width={14} height={14} />
                )}
              </button>

              {toolsDropdownOpen && (
                <div className="nav-dropdown-menu">
                  {CATEGORIES.map((cat) => {
                    const catTools = TOOLS_DATA.filter((t) => t.category === cat.id);
                    return (
                      <div key={cat.id}>
                        <div className="dropdown-category-title">{cat.title}</div>
                        {catTools.map((t) => {
                          const IconComp = iconMap[t.icon] || IconQr;
                          return (
                            <Link
                              key={t.id}
                              to={t.path}
                              className="dropdown-item"
                              onClick={() => setToolsDropdownOpen(false)}
                            >
                              <IconComp width={16} height={16} />
                              <span>{t.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>



          {/* Dark Mode Umschalter */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
            title={theme === 'dark' ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
          >
            {theme === 'dark' ? (
              <>
                <IconSun width={18} height={18} />
                <span>HELL</span>
              </>
            ) : (
              <>
                <IconMoon width={18} height={18} />
                <span>DUNKEL</span>
              </>
            )}
          </button>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="btn btn-secondary mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <IconClose width={22} height={22} />
            ) : (
              <IconMenu width={22} height={22} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                to="/"
                className="btn btn-block btn-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                ZUR ÜBERSICHT (ALLE 12 TOOLS)
              </Link>
            </div>

            <hr className="dashed-divider" style={{ margin: '8px 0' }} />

            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                ALLE 12 WERKZEUGE DIREKT ÖFFNEN:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {TOOLS_DATA.map((t) => {
                  const IconComp = iconMap[t.icon] || IconQr;
                  const isActive = currentPath === t.path;
                  return (
                    <Link
                      key={t.id}
                      to={t.path}
                      className="dropdown-item"
                      style={{
                        padding: '10px 12px',
                        backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                        border: 'var(--border-width-sm) solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <IconComp width={18} height={18} />
                      <span style={{ flexGrow: 1 }}>{t.title}</span>
                      {t.badge === 'LIVE' ? (
                        <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>LIVE</span>
                      ) : (
                        <span className="badge badge-offline" style={{ fontSize: '0.7rem' }}>OFFLINE</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
