import React, { useState, useEffect } from 'react';
import { getAllAccounts, deleteAccount } from '../lib/auth.js';
import { getAllScoresAdmin, deleteScore, clearAllScores } from '../lib/scores.js';

export default function AdminModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [scores, setScores] = useState([]);
  const [gameFilter, setGameFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const [accs, scs] = await Promise.all([
        getAllAccounts(),
        getAllScoresAdmin(),
      ]);
      setAccounts(accs || []);
      setScores(scs || []);
    } catch {}
    setLoading(false);
  }

  function showFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  }

  async function handleDeleteAccount(username) {
    if (!confirm(`Möchtest du das Konto von "${username}" wirklich unwiderruflich löschen?`)) return;
    deleteAccount(username);
    setAccounts(a => a.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
    showFeedback(`Konto ${username} gelöscht.`);
  }

  async function handleDeleteScore(id) {
    if (!confirm('Diesen Highscore-Eintrag löschen?')) return;
    await deleteScore(id);
    setScores(s => s.filter(item => String(item.id) !== String(id)));
    showFeedback('Highscore gelöscht.');
  }

  async function handleResetGameScores(game) {
    const label = game ? game.toUpperCase() : 'ALLE SPIELE';
    if (!confirm(`Wirklich alle Highscores für ${label} zurücksetzen?`)) return;
    await clearAllScores(game === 'all' ? null : game);
    await loadData();
    showFeedback(`Highscores für ${label} zurückgesetzt.`);
  }

  function triggerDevTool(type, payload = {}) {
    window.dispatchEvent(new CustomEvent('arcade-admin-event', {
      detail: { type, ...payload }
    }));
    showFeedback(`Admin-Aktion ausgeführt: ${type}`);
  }

  if (!isOpen) return null;

  const filteredScores = gameFilter === 'all'
    ? scores
    : scores.filter(s => s.game === gameFilter);

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Admin Dashboard">
      <div className="overlay-panel admin-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="overlay-title" style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: 0 }}>
            👑 ADMIN-DASHBOARD
          </h2>
          <button className="btn btn-outline" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.5rem' }} onClick={onClose}>
            SCHLIESSEN
          </button>
        </div>

        {/* Tab-Navigation */}
        <div className="auth-tabs" style={{ marginBottom: '16px' }}>
          <button
            className={`auth-tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            SPIELER ({accounts.length})
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'scores' ? 'active' : ''}`}
            onClick={() => setActiveTab('scores')}
          >
            HIGHSCORES ({scores.length})
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'clicker' ? 'active' : ''}`}
            onClick={() => setActiveTab('clicker')}
          >
            CLICKER-TOOLS
          </button>
        </div>

        {feedback && (
          <div style={{
            background: 'rgba(57, 255, 20, 0.15)',
            border: '1px solid #39ff14',
            color: '#39ff14',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            marginBottom: '12px'
          }}>
            {feedback}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>LADE DATEN...</p>
        ) : (
          <>
            {/* TAB 1: ACCOUNTS */}
            {activeTab === 'accounts' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '12px' }}>
                  Verwalte alle registrierten Spieler-Accounts. Konten mit Admin-Rechten sind markiert.
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>USER</th>
                        <th>ROLLE</th>
                        <th>ANGELEGT</th>
                        <th>AKTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>Keine Konten vorhanden</td></tr>
                      ) : (
                        accounts.map(acc => (
                          <tr key={acc.username}>
                            <td style={{ fontWeight: 'bold', color: acc.isAdmin ? 'var(--accent)' : '#fff' }}>
                              {acc.username}
                            </td>
                            <td>
                              {acc.isAdmin ? (
                                <span style={{ color: 'var(--accent)', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)' }}>👑 ADMIN</span>
                              ) : (
                                <span style={{ color: '#888', fontSize: '0.45rem' }}>SPIELER</span>
                              )}
                            </td>
                            <td style={{ color: '#888', fontSize: '0.68rem' }}>
                              {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('de-DE') : '-'}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '3px 8px', fontSize: '0.42rem', borderColor: '#ff4d4d', color: '#ff4d4d', minHeight: '28px' }}
                                onClick={() => handleDeleteAccount(acc.username)}
                              >
                                LÖSCHEN
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: HIGHSCORES */}
            {activeTab === 'scores' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['all', 'snake', 'press', 'clicker'].map(g => (
                      <button
                        key={g}
                        className={`btn ${gameFilter === g ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '4px 8px', fontSize: '0.45rem', minHeight: '30px' }}
                        onClick={() => setGameFilter(g)}
                      >
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '0.45rem', borderColor: '#ff4d4d', color: '#ff4d4d', minHeight: '30px' }}
                    onClick={() => handleResetGameScores(gameFilter)}
                  >
                    FILTER ZURÜCKSETZEN
                  </button>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>SPIELER</th>
                        <th>SPIEL</th>
                        <th>SCORE</th>
                        <th>DATUM</th>
                        <th>AKTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScores.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#666' }}>Keine Einträge gefunden</td></tr>
                      ) : (
                        filteredScores.map(sc => (
                          <tr key={sc.id}>
                            <td style={{ fontWeight: 'bold' }}>{sc.name}</td>
                            <td style={{ color: 'var(--accent)', fontFamily: 'var(--font-pixel)', fontSize: '0.45rem' }}>{sc.game}</td>
                            <td style={{ color: '#ffd700', fontFamily: 'var(--font-pixel)', fontSize: '0.52rem' }}>{Number(sc.score).toLocaleString('de-DE')}</td>
                            <td style={{ color: '#888', fontSize: '0.65rem' }}>{sc.created_at ? new Date(sc.created_at).toLocaleDateString('de-DE') : '-'}</td>
                            <td>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '2px 6px', fontSize: '0.42rem', borderColor: '#ff4d4d', color: '#ff4d4d', minHeight: '26px' }}
                                onClick={() => handleDeleteScore(sc.id)}
                              >
                                X
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: CLICKER TOOLS */}
            {activeTab === 'clicker' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '14px' }}>
                  Teste Random Events, Himmels-Aufstiege und Spiel-Funktionen im Cookie Clicker in Echtzeit:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('SPAWN_COMET')}
                  >
                    ☄️ KEKS-KOMET SPAWNEN
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('START_EVENT', { eventId: 'gold_rush' })}
                  >
                    ✨ GOLD-RAUSCH (x7)
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('START_EVENT', { eventId: 'sugar_festival' })}
                  >
                    🍬 ZUCKER-FESTIVAL (x2 CPS)
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('START_EVENT', { eventId: 'grandma_party' })}
                  >
                    👵 OMAS PARTY (x5 Oma)
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('START_EVENT', { eventId: 'stock_rally' })}
                  >
                    📈 BÖRSEN-RALLYE (+100%)
                  </button>

                  <button
                    className="btn btn-outline"
                    style={{ padding: '10px 8px', fontSize: '0.48rem', borderColor: '#ffd700', color: '#ffd700' }}
                    onClick={() => triggerDevTool('ADD_COOKIES', { amount: 1000000 })}
                  >
                    🍪 +1.000.000 COOKIES
                  </button>

                  <button
                    className="btn btn-outline"
                    style={{ padding: '10px 8px', fontSize: '0.48rem', borderColor: '#70b4ff', color: '#70b4ff' }}
                    onClick={() => triggerDevTool('ADD_CHIPS', { amount: 10 })}
                  >
                    🌟 +10 HIMMELSCHIPS
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
