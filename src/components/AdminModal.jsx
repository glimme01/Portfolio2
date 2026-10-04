import React, { useState, useEffect } from 'react';
import { getAllAccounts, deleteAccount } from '../lib/auth.js';
import { getAllScoresAdmin, deleteScore, clearAllScores } from '../lib/scores.js';
import { getAllFeedback, updateFeedbackStatus, deleteFeedback } from '../lib/feedback.js';

export default function AdminModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [scores, setScores] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleFeedbackUpdate() {
      getAllFeedback().then(fb => setFeedbacks(fb || []));
    }
    window.addEventListener('arcade-feedback-updated', handleFeedbackUpdate);
    return () => window.removeEventListener('arcade-feedback-updated', handleFeedbackUpdate);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [accs, scs, fbs] = await Promise.all([
        getAllAccounts(),
        getAllScoresAdmin(),
        getAllFeedback(),
      ]);
      setAccounts(accs || []);
      setScores(scs || []);
      setFeedbacks(fbs || []);
    } catch {}
    setLoading(false);
  }

  function showAlert(msg) {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(''), 3000);
  }

  async function handleDeleteAccount(username) {
    if (!confirm(`Möchtest du das Konto von "${username}" wirklich unwiderruflich löschen?`)) return;
    deleteAccount(username);
    setAccounts(a => a.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
    showAlert(`Konto ${username} gelöscht.`);
  }

  async function handleDeleteScore(id) {
    if (!confirm('Diesen Highscore-Eintrag löschen?')) return;
    await deleteScore(id);
    setScores(s => s.filter(item => String(item.id) !== String(id)));
    showAlert('Highscore gelöscht.');
  }

  async function handleResetGameScores(game) {
    const label = game ? game.toUpperCase() : 'ALLE SPIELE';
    if (!confirm(`Wirklich alle Highscores für ${label} zurücksetzen?`)) return;
    await clearAllScores(game === 'all' ? null : game);
    await loadData();
    showAlert(`Highscores für ${label} zurückgesetzt.`);
  }

  async function handleUpdateFeedbackStatus(id, newStatus) {
    await updateFeedbackStatus(id, newStatus);
    setFeedbacks(items => items.map(it => String(it.id) === String(id) ? { ...it, status: newStatus } : it));
    showAlert(`Status auf "${newStatus}" gesetzt.`);
  }

  async function handleDeleteFeedback(id) {
    if (!confirm('Dieses Feedback unwiderruflich löschen?')) return;
    await deleteFeedback(id);
    setFeedbacks(items => items.filter(it => String(it.id) !== String(id)));
    showAlert('Feedback gelöscht.');
  }

  function triggerDevTool(type, payload = {}) {
    window.dispatchEvent(new CustomEvent('arcade-admin-event', {
      detail: { type, ...payload }
    }));
    showAlert(`Admin-Aktion ausgeführt: ${type}`);
  }

  if (!isOpen) return null;

  const filteredScores = gameFilter === 'all'
    ? scores
    : scores.filter(s => s.game === gameFilter);

  const filteredFeedbacks = feedbacks.filter(item => {
    if (feedbackTypeFilter !== 'all' && item.type !== feedbackTypeFilter) return false;
    if (feedbackStatusFilter !== 'all' && item.status !== feedbackStatusFilter) return false;
    return true;
  });

  const unreadFeedbackCount = feedbacks.filter(f => f.status === 'new').length;

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
        <div className="auth-tabs" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
          <button
            className={`auth-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
            style={unreadFeedbackCount > 0 ? { borderColor: '#ff4444', color: '#ffd700', position: 'relative' } : {}}
          >
            FEEDBACK & BUGS {unreadFeedbackCount > 0 ? `(${unreadFeedbackCount} NEU)` : `(${feedbacks.length})`}
          </button>
        </div>

        {alertMsg && (
          <div style={{
            background: 'rgba(57, 255, 20, 0.15)',
            border: '1px solid #39ff14',
            color: '#39ff14',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            marginBottom: '12px'
          }}>
            {alertMsg}
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
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.45rem',
                                  minHeight: '28px',
                                  color: 'var(--danger)',
                                  borderColor: 'var(--danger)',
                                }}
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
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>FILTER:</span>
                    {['all', 'snake', 'press', 'clicker'].map(g => (
                      <button
                        key={g}
                        className={`btn ${gameFilter === g ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '3px 8px', fontSize: '0.45rem', minHeight: '28px' }}
                        onClick={() => setGameFilter(g)}
                      >
                        {g.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn btn-outline"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.45rem',
                      minHeight: '28px',
                      color: 'var(--danger)',
                      borderColor: 'var(--danger)',
                    }}
                    onClick={() => handleResetGameScores(gameFilter === 'all' ? null : gameFilter)}
                  >
                    🗑️ {gameFilter === 'all' ? 'ALLE ZURÜCKSETZEN' : `${gameFilter.toUpperCase()} ZURÜCKSETZEN`}
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
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
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#666' }}>Keine Scores gefunden</td></tr>
                      ) : (
                        filteredScores.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 'bold' }}>{item.name}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.5rem',
                                background: '#222',
                                color: 'var(--accent)'
                              }}>
                                {item.game?.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                              {Number(item.score).toLocaleString('de-DE')}
                            </td>
                            <td style={{ color: '#888', fontSize: '0.68rem' }}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString('de-DE') : '-'}
                            </td>
                            <td>
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.45rem',
                                  minHeight: '28px',
                                  color: 'var(--danger)',
                                  borderColor: 'var(--danger)',
                                }}
                                onClick={() => handleDeleteScore(item.id)}
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

            {/* TAB 3: CLICKER-TOOLS */}
            {activeTab === 'clicker' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '16px' }}>
                  Ereignisse & Boni live für das Keks-Clicker-Spiel auslösen.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 8px', fontSize: '0.48rem' }}
                    onClick={() => triggerDevTool('SPAWN_GOLDEN')}
                  >
                    🍪 GOLDENER KEKS SPAWNEN
                  </button>

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

            {/* TAB 4: FEEDBACK & BUGS */}
            {activeTab === 'feedback' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '14px' }}>
                  Von Spielern eingereichte Fehlerberichte, Ideen und Feedback. Du kannst den Bearbeitungsstatus ändern oder Einträge löschen.
                </p>

                {/* Status Stats Pillen */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#1c1c1c', border: '1px solid #333', padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem' }}>
                    Gesamt: <strong style={{ color: 'var(--accent)' }}>{feedbacks.length}</strong>
                  </div>
                  <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem', color: '#ff7777' }}>
                    Neu: <strong>{feedbacks.filter(f => f.status === 'new').length}</strong>
                  </div>
                  <div style={{ background: 'rgba(70, 130, 255, 0.1)', border: '1px solid #4682ff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem', color: '#70b4ff' }}>
                    In Arbeit: <strong>{feedbacks.filter(f => f.status === 'in_progress').length}</strong>
                  </div>
                  <div style={{ background: 'rgba(57, 255, 20, 0.1)', border: '1px solid #39ff14', padding: '6px 10px', borderRadius: '6px', fontSize: '0.65rem', color: '#39ff14' }}>
                    Gelöst: <strong>{feedbacks.filter(f => f.status === 'resolved').length}</strong>
                  </div>
                </div>

                {/* Filter-Leiste */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>TYP:</span>
                    {['all', 'bug', 'suggestion', 'feedback'].map(t => (
                      <button
                        key={t}
                        className={`btn ${feedbackTypeFilter === t ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '3px 6px', fontSize: '0.42rem', minHeight: '26px' }}
                        onClick={() => setFeedbackTypeFilter(t)}
                      >
                        {t === 'all' ? 'ALLE' : t === 'bug' ? '🐛 BUGS' : t === 'suggestion' ? '💡 IDEEN' : '💬 LOB'}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>STATUS:</span>
                    {['all', 'new', 'in_progress', 'resolved'].map(s => (
                      <button
                        key={s}
                        className={`btn ${feedbackStatusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '3px 6px', fontSize: '0.42rem', minHeight: '26px' }}
                        onClick={() => setFeedbackStatusFilter(s)}
                      >
                        {s === 'all' ? 'ALLE' : s === 'new' ? 'NEU' : s === 'in_progress' ? 'IN ARBEIT' : 'GELÖST'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback-Karten Liste */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredFeedbacks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', background: '#141414', borderRadius: '8px' }}>
                      Keine Einträge für diese Filterkriterien vorhanden.
                    </div>
                  ) : (
                    filteredFeedbacks.map(item => {
                      const typeMeta = item.type === 'bug'
                        ? { label: '🐛 BUG', color: '#ff4444', bg: 'rgba(255, 68, 68, 0.15)', border: '#ff4444' }
                        : item.type === 'suggestion'
                        ? { label: '💡 IDEE', color: '#ffd700', bg: 'rgba(255, 215, 0, 0.15)', border: '#ffd700' }
                        : { label: '💬 FEEDBACK', color: '#70b4ff', bg: 'rgba(112, 180, 255, 0.15)', border: '#70b4ff' };

                      const statusMeta = item.status === 'resolved'
                        ? { label: 'GELÖST', color: '#39ff14', bg: 'rgba(57, 255, 20, 0.15)' }
                        : item.status === 'in_progress'
                        ? { label: 'IN ARBEIT', color: '#70b4ff', bg: 'rgba(112, 180, 255, 0.15)' }
                        : { label: 'NEU', color: '#ffbb00', bg: 'rgba(255, 187, 0, 0.15)' };

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: '#151515',
                            border: `1px solid ${item.status === 'new' ? 'var(--accent)' : '#282828'}`,
                            borderRadius: '8px',
                            padding: '12px 14px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.45rem',
                                fontFamily: 'var(--font-pixel)',
                                color: typeMeta.color,
                                background: typeMeta.bg,
                                border: `1px solid ${typeMeta.border}`,
                                padding: '3px 6px',
                                borderRadius: '4px',
                              }}>
                                {typeMeta.label}
                              </span>
                              <span style={{
                                fontSize: '0.45rem',
                                fontFamily: 'var(--font-pixel)',
                                color: '#aaa',
                                background: '#222',
                                padding: '3px 6px',
                                borderRadius: '4px',
                              }}>
                                🎮 {item.game ? item.game.toUpperCase() : 'ALLGEMEIN'}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#fff' }}>
                                👤 {item.name || 'Anonym'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.45rem',
                                fontFamily: 'var(--font-pixel)',
                                color: statusMeta.color,
                                background: statusMeta.bg,
                                padding: '3px 6px',
                                borderRadius: '4px',
                              }}>
                                {statusMeta.label}
                              </span>
                              <span style={{ fontSize: '0.62rem', color: '#777' }}>
                                {item.created_at ? new Date(item.created_at).toLocaleString('de-DE') : '-'}
                              </span>
                            </div>
                          </div>

                          <div style={{
                            background: '#0d0d0d',
                            border: '1px solid #222',
                            borderRadius: '6px',
                            padding: '10px',
                            fontSize: '0.75rem',
                            color: 'var(--text)',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap',
                            marginBottom: '10px',
                            wordBreak: 'break-word',
                          }}>
                            {item.message}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.55rem', color: 'var(--muted)' }}>STATUS:</span>
                              <button
                                className={`btn ${item.status === 'new' ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '2px 6px', fontSize: '0.42rem', minHeight: '24px' }}
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'new')}
                              >
                                NEU
                              </button>
                              <button
                                className={`btn ${item.status === 'in_progress' ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '2px 6px', fontSize: '0.42rem', minHeight: '24px', color: item.status === 'in_progress' ? '#000' : '#70b4ff' }}
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'in_progress')}
                              >
                                IN ARBEIT
                              </button>
                              <button
                                className={`btn ${item.status === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '2px 6px', fontSize: '0.42rem', minHeight: '24px', color: item.status === 'resolved' ? '#000' : '#39ff14' }}
                                onClick={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                              >
                                GELÖST
                              </button>
                            </div>

                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.42rem',
                                minHeight: '24px',
                                color: 'var(--danger)',
                                borderColor: 'var(--danger)',
                              }}
                              onClick={() => handleDeleteFeedback(item.id)}
                            >
                              🗑️ LÖSCHEN
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
