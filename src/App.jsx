import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
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
import FeedbackModal from './components/FeedbackModal.jsx';
import SessionConflictModal from './components/SessionConflictModal.jsx';
import { getCurrentUser, logout, onAuthChange } from './lib/auth.js';
import { getUnreadFeedbackCount } from './lib/feedback.js';

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
  const [unreadFeedback, setUnreadFeedback] = useState(0);

  useEffect(() => {
    return onAuthChange((newUser) => setUser(newUser));
  }, []);

  useEffect(() => {
    function refreshFeedbackCount() {
      getUnreadFeedbackCount().then(c => setUnreadFeedback(c));
    }
    refreshFeedbackCount();
    window.addEventListener('arcade-feedback-updated', refreshFeedbackCount);
    return () => window.removeEventListener('arcade-feedback-updated', refreshFeedbackCount);
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
          <NavLink to="/slots" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>SLOTS</NavLink>
          <NavLink to="/blackjack" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>BLACKJACK</NavLink>
          <NavLink to="/press" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>PRESS</NavLink>
        </nav>

        {/* Benutzer-Konto im Header */}
        <div className="header-auth-box">
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

  useEffect(() => {
    function handleOpenFeedback() {
      setFeedbackOpen(true);
    }
    window.addEventListener('open-feedback-modal', handleOpenFeedback);
    return () => window.removeEventListener('open-feedback-modal', handleOpenFeedback);
  }, []);

  return (
    <BrowserRouter>
      <Header onOpenFeedback={() => setFeedbackOpen(true)} />
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/snake" element={<SnakePage />} />
        <Route path="/press" element={<PressPage />} />
        <Route path="/clicker" element={<ClickerPage />} />
        <Route path="/clicker/achievements" element={<ClickerPage defaultTab="achievements" />} />
        <Route path="/slots" element={<SlotsPage />} />
        <Route path="/blackjack" element={<BlackjackPage />} />
      </Routes>
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
