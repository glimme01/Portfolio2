import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './styles.css';
import Lobby from './pages/Lobby.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import SnakePage from './games/snake/SnakePage.jsx';
import PressPage from './games/press/PressPage.jsx';
import ClickerPage from './games/clicker/ClickerPage.jsx';
import SlotsPage from './games/slots/SlotsPage.jsx';
import BlackjackPage from './games/blackjack/BlackjackPage.jsx';
import AuthModal from './components/AuthModal.jsx';
import AdminModal from './components/AdminModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';
import SessionConflictModal from './components/SessionConflictModal.jsx';
import PatchLogModal from './components/PatchLogModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { getCurrentUser, logout, onAuthChange } from './lib/auth.js';
import { getUnreadFeedbackCount } from './lib/feedback.js';
import { loadUserSettings } from './lib/userSettings.js';

// Offizielles Logo
function LogoMark() {
  return (
    <img
      src="/logo.png"
      alt="Moritzfreund Arcade Logo"
      className="logo-mark"
      width={44}
      height={44}
      style={{ imageRendering: 'pixelated', display: 'block', objectFit: 'contain' }}
    />
  );
}

function Header({ onOpenFeedback }) {
  const [user, setUser] = useState(getCurrentUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [patchLogOpen, setPatchLogOpen] = useState(false);
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  useEffect(() => {
    loadUserSettings(user?.username);
  }, [user]);

  useEffect(() => {
    return onAuthChange((newUser) => setUser(newUser));
  }, []);

  useEffect(() => {
    function refreshFeedbackCount() {
      getUnreadFeedbackCount().then(c => setUnreadFeedback(c));
    }
    function handleOpenAuth() {
      setAuthOpen(true);
    }
    function handleOpenPatchlog() {
      setPatchLogOpen(true);
    }
    refreshFeedbackCount();
    window.addEventListener('arcade-feedback-updated', refreshFeedbackCount);
    window.addEventListener('arcade-open-auth', handleOpenAuth);
    window.addEventListener('arcade-open-patchlog', handleOpenPatchlog);
    return () => {
      window.removeEventListener('arcade-feedback-updated', refreshFeedbackCount);
      window.removeEventListener('arcade-open-auth', handleOpenAuth);
      window.removeEventListener('arcade-open-patchlog', handleOpenPatchlog);
    };
  }, []);

  const isAdmin = Boolean(user && user.isAdmin);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <LogoMark />
        <NavLink to="/" className="site-title">MORITZFREUND ARCADE</NavLink>
        <nav className="site-nav" aria-label="Hauptnavigation">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>LOBBY</NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>RANGLISTE</NavLink>
          <NavLink to="/snake" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>SNAKE</NavLink>
          <NavLink to="/clicker" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>CLICKER</NavLink>
          <NavLink to="/press" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>PRESS</NavLink>
        </nav>

        {/* Benutzer-Konto im Header */}
        <div className="header-auth-box">
          <button
            className="btn btn-outline"
            style={{ padding: '6px 9px', fontSize: '0.48rem', minHeight: '36px', borderColor: '#ffd700', color: '#ffd700' }}
            onClick={() => setPatchLogOpen(true)}
            title="Riesigen Patch-Log v3.3 ansehen"
            aria-label="Patch-Log"
          >
            📜 v3.3
          </button>

          <button
            className="btn btn-outline"
            style={{ padding: '6px 9px', fontSize: '0.62rem', minHeight: '36px' }}
            onClick={() => setSettingsOpen(true)}
            title="Einstellungen öffnen"
            aria-label="Einstellungen"
          >
            ⚙️
          </button>

          {user ? (
            <div className="user-badge-wrap">
              <span className="user-badge" title="Angemeldeter Spieler">
                👑 {user.username}
              </span>
              {isAdmin && (
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '6px 10px',
                    fontSize: '0.45rem',
                    minHeight: '36px',
                    background: 'linear-gradient(135deg, #ffd700, #ff8800)',
                    color: '#000',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)',
                    position: 'relative',
                  }}
                  onClick={() => setAdminOpen(true)}
                  title="Admin Dashboard öffnen"
                >
                  ADMIN
                  {unreadFeedback > 0 && (
                    <span className="admin-badge-indicator" title={`${unreadFeedback} neue Meldungen`}>
                      {unreadFeedback}
                    </span>
                  )}
                </button>
              )}
              <button
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '0.45rem', minHeight: '36px' }}
                onClick={logout}
                title="Abmelden"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.5rem', minHeight: '38px' }}
              onClick={() => setAuthOpen(true)}
            >
              LOGIN
            </button>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />

      <AdminModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <PatchLogModal
        isOpen={patchLogOpen}
        onClose={() => setPatchLogOpen(false)}
      />

      <SessionConflictModal
        onReLogin={() => setAuthOpen(true)}
      />
    </header>
  );
}

function Footer({ onOpenFeedback }) {
  return (
    <footer className="site-footer">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span>MORITZFREUND ARCADE &mdash; HANDGEMACHT &mdash; {new Date().getFullYear()}</span>
        <button
          className="footer-feedback-link"
          style={{ color: '#ffd700', borderColor: 'rgba(255,215,0,0.3)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('arcade-open-patchlog'))}
          title="Changelog & Patch-Historie ansehen"
        >
          📜 PATCH-LOG (v3.3)
        </button>
        <button
          className="footer-feedback-link"
          onClick={onOpenFeedback}
          title="Feedback senden oder Bug melden"
        >
          💬 FEEDBACK / BUG MELDEN
        </button>
      </div>
    </footer>
  );
}

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => {
    function handleOpenFeedback() {
      setFeedbackOpen(true);
    }
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback-modal', handleOpenFeedback);
  }, []);

  useEffect(() => {
    // Check initial broadcast
    try {
      const raw = localStorage.getItem('arcade_global_broadcast');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.timestamp || 0) < 180000) { // 3 minutes active
          setBroadcast(parsed);
        }
      }
    } catch {}

    function onBroadcast(e) {
      if (e?.detail) {
        setBroadcast(e.detail);
      }
    }
    window.addEventListener('arcade-admin-broadcast', onBroadcast);
    return () => window.removeEventListener('arcade-admin-broadcast', onBroadcast);
  }, []);

  return (
    <BrowserRouter>
      <Header onOpenFeedback={() => setFeedbackOpen(true)} />
      {broadcast && (
        <div className="arcade-broadcast-banner">
          <div className="broadcast-content">
            <span className="broadcast-icon">📢</span>
            <span className="broadcast-badge">ADMIN-DURCHSAGE:</span>
            <span className="broadcast-text">{broadcast.message}</span>
          </div>
          <button className="broadcast-close" onClick={() => setBroadcast(null)} title="Schließen">✕</button>
        </div>
      )}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/snake" element={<SnakePage />} />
          <Route path="/press" element={<PressPage />} />
          <Route path="/clicker" element={<ClickerPage />} />
          <Route path="/clicker/achievements" element={<ClickerPage defaultTab="achievements" />} />
          <Route path="/slots" element={<Navigate to="/clicker?tab=slots" replace />} />
          <Route path="/blackjack" element={<Navigate to="/clicker?tab=blackjack" replace />} />
        </Routes>
      </ErrorBoundary>
      <Footer onOpenFeedback={() => setFeedbackOpen(true)} />

      {/* Floating Action Button für Feedback & Bug Reports */}
      <button
        className="feedback-fab"
        onClick={() => setFeedbackOpen(true)}
        title="Feedback oder Bug melden"
        aria-label="Feedback oder Bug melden"
      >
        <span className="feedback-fab-icon">💬</span>
        <span className="feedback-fab-text">FEEDBACK & BUGS</span>
      </button>

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </BrowserRouter>
  );
}
