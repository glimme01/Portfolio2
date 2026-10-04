import React, { useState, useEffect } from 'react';
import { getTopScores } from '../lib/scores.js';
import { getCurrentUser } from '../lib/auth.js';

const GAMES = [
  { id: 'clicker', label: '🍪 COOKIE CLICKER (KONTO)' },
  { id: 'slots', label: '🎰 SLOTS (HOECHSTER GEWINN)' },
  { id: 'blackjack', label: '🃏 BLACKJACK (BESTER GEWINN)' },
  { id: 'snake', label: '🐍 SNAKE' },
  { id: 'press', label: '🔨 PRESSE' },
];

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('de-DE') : n;
}

export default function LeaderboardPage() {
  const [activeGame, setActiveGame] = useState('snake');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const currentUser = getCurrentUser();

  async function fetchScores(game) {
    setLoading(true);
    const { data, offline: off } = await getTopScores(game, 25);
    setScores(data);
    setOffline(off);
    setLoading(false);
  }

  useEffect(() => {
    fetchScores(activeGame);
    const onScoresUpdated = (e) => {
      if (!e?.detail?.game || e.detail.game === activeGame) {
        fetchScores(activeGame);
      }
    };
    window.addEventListener('arcade-scores-updated', onScoresUpdated);
    return () => window.removeEventListener('arcade-scores-updated', onScoresUpdated);
  }, [activeGame]);

  return (
    <main className="page-content" id="leaderboard-main">
      <div className="lobby-intro">
        <img
          src="/logo.png"
          alt="Moritzfreund Arcade Logo"
          className="lobby-logo"
          width={72}
          height={72}
        />
        <h1 className="lobby-title" style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1.4rem)' }}>
          HALL OF FAME &mdash; BESTENLISTEN
        </h1>
        <p className="lobby-subtitle">
          DIE HOECHSTEN SCORES ALLER SPIELER IM VERGLEICH
        </p>
      </div>

      {/* Spiel-Auswahl-Tabs */}
      <div className="lb-tab-container" role="tablist">
        {GAMES.map(g => (
          <button
            key={g.id}
            role="tab"
            aria-selected={activeGame === g.id}
            className={`lb-tab-btn ${activeGame === g.id ? 'active' : ''}`}
            onClick={() => setActiveGame(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="game-card" style={{ maxWidth: '780px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.75rem', color: 'var(--accent)' }}>
            TOP SCORES: {GAMES.find(g => g.id === activeGame)?.label}
          </h2>
          {offline && (
            <span className="offline-badge" style={{ margin: 0, padding: '4px 8px', fontSize: '0.45rem' }}>
              LOKAL
            </span>
          )}
        </div>

        {loading ? (
          <p className="hs-empty">SCORES WERDEN GELADEN...</p>
        ) : scores.length === 0 ? (
          <p className="hs-empty">NOCH KEINE SCORES VORHANDEN. SEI DER ERSTE!</p>
        ) : (
          <table className="hs-table" aria-label={`Rangliste für ${activeGame}`}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>RANG</th>
                <th>SPIELER</th>
                <th style={{ textAlign: 'right' }}>SCORE</th>
                <th style={{ textAlign: 'right', width: '130px' }}>DATUM</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, idx) => {
                const isUser = currentUser && s.name.toLowerCase() === currentUser.username.toLowerCase();
                const rank = idx + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';

                const dateStr = s.created_at
                  ? new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                  : '-';

                return (
                  <tr
                    key={s.id || idx}
                    className={`${isUser ? 'hs-new-entry' : ''}`}
                    style={isUser ? { background: 'rgba(255,215,0,0.14)', fontWeight: 'bold' } : {}}
                  >
                    <td className={`hs-rank ${rankClass}`}>
                      {rank === 1 ? '👑 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`}
                    </td>
                    <td className="hs-name">
                      {s.name} {isUser && <span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>(DU)</span>}
                    </td>
                    <td className="hs-score" style={{ color: rank === 1 ? 'var(--accent)' : 'inherit' }}>
                      {fmt(s.score)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {dateStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
