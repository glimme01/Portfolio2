import React, { useState, useEffect } from 'react';
import {
  getAllAccounts,
  deleteAccount,
  adminCreateAccount,
  adminUpdateAccount,
  adminQuickAdjustBalance,
  adminResetPlayerProgress,
  adminBroadcastMessage,
  isCurrentUserAdmin,
} from '../lib/auth.js';
import { getAllScoresAdmin, deleteScore, clearAllScores, getPlayerScores } from '../lib/scores.js';
import { loadGameState } from '../lib/save.js';
import { getAllFeedback, updateFeedbackStatus, deleteFeedback } from '../lib/feedback.js';
import { fmtCookies, BUILDINGS } from '../games/clicker/clickerLogic.js';

export default function AdminModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [scores, setScores] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
  const [gameFilter, setGameFilter] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Modus: Neuen Spieler anlegen
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: 'password123',
    isAdmin: false,
    initialCookies: 10000,
    initialChips: 5,
    initialGems: 50,
  });

  // Modus: Spieler vollständig & individuell bearbeiten
  const [editingUser, setEditingUser] = useState(null);
  const [editTab, setEditTab] = useState('account');
  const [editForm, setEditForm] = useState({
    newUsername: '',
    newPassword: '',
    isAdmin: false,
    isBanned: false,
    cookies: 0,
    totalCookies: 0,
    heavenlyChips: 0,
    heavenlyChipsClaimed: 0,
    gems: 10,
    totalClicks: 0,
    ascensionCount: 0,
    buildings: {},
    scores: { snake: 0, press: 0, clicker: 0, slots: 0, blackjack: 0 },
  });

  const [broadcastText, setBroadcastText] = useState('');

  // Sicherheits-Check: Nur echte Admins dürfen das Modal sehen
  const isAdmin = isCurrentUserAdmin();

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadData();
    }
  }, [isOpen, isAdmin]);

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
    setTimeout(() => setAlertMsg(''), 3500);
  }

  // Neuen Spieler anlegen
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!createForm.username || createForm.username.trim().length < 2) {
      showAlert('Username muss mindestens 2 Zeichen lang sein.');
      return;
    }

    setSaving(true);
    const res = await adminCreateAccount(createForm);
    setSaving(false);
    if (res.error) {
      showAlert(`Fehler: ${res.error}`);
      return;
    }

    showAlert(`Spieler "${createForm.username}" erfolgreich angelegt!`);
    setCreateOpen(false);
    setCreateForm({
      username: '',
      password: 'password123',
      isAdmin: false,
      initialCookies: 10000,
      initialChips: 5,
      initialGems: 50,
    });
    await loadData();
  }

  // Spieler-Editor öffnen und alle Daten vorausfüllen (inklusive asynchronem Nachladen von Cloud/Local State)
  async function openEditModal(acc) {
    setEditingUser(acc);
    setEditTab('account');
    setEditForm({
      newUsername: acc.username,
      newPassword: '',
      isAdmin: Boolean(acc.isAdmin),
      isBanned: Boolean(acc.isBanned),
      cookies: acc.cookies || 0,
      totalCookies: acc.totalCookies || acc.cookies || 0,
      heavenlyChips: acc.heavenlyChips || 0,
      heavenlyChipsClaimed: acc.heavenlyChipsClaimed || 0,
      gems: acc.gems ?? 10,
      totalClicks: acc.totalClicks || 0,
      ascensionCount: acc.ascensionCount || 0,
      buildings: { ...(acc.buildings || {}) },
      scores: { ...(acc.scores || { snake: 0, press: 0, clicker: 0, slots: 0, blackjack: 0 }) },
    });

    try {
      const [{ data: csData }, playerScores] = await Promise.all([
        loadGameState(acc.username, 'clicker'),
        getPlayerScores(acc.username),
      ]);
      const st = csData?.state;
      if (st) {
        setEditForm(f => ({
          ...f,
          cookies: st.cookies !== undefined ? st.cookies : f.cookies,
          totalCookies: st.totalCookies !== undefined ? st.totalCookies : f.totalCookies,
          heavenlyChips: st.heavenlyChips !== undefined ? st.heavenlyChips : f.heavenlyChips,
          heavenlyChipsClaimed: st.heavenlyChipsClaimed !== undefined ? st.heavenlyChipsClaimed : f.heavenlyChipsClaimed,
          gems: st.gems !== undefined ? st.gems : f.gems,
          totalClicks: st.totalClicks !== undefined ? st.totalClicks : f.totalClicks,
          ascensionCount: st.ascensionCount !== undefined ? st.ascensionCount : f.ascensionCount,
          buildings: { ...(st.buildings || f.buildings) },
          scores: { ...(playerScores || f.scores) },
        }));
      }
    } catch (e) {
      console.warn('Could not refresh full player details:', e);
    }
  }

  // Alle Änderungen für diesen Spieler speichern
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    const res = await adminUpdateAccount(editingUser.username, editForm);
    setSaving(false);

    if (res.error) {
      showAlert(`Fehler: ${res.error}`);
      return;
    }

    showAlert(`Spieler "${res.username || editingUser.username}" erfolgreich aktualisiert!`);
    setEditingUser(null);
    await loadData();
  }

  // Gebäude-Mengen im Editor anpassen
  function handleBuildingChange(buildingId, count) {
    setEditForm(f => ({
      ...f,
      buildings: {
        ...f.buildings,
        [buildingId]: Math.max(0, parseInt(count, 10) || 0)
      }
    }));
  }

  function handleBatchBuildings(amount) {
    const updated = {};
    BUILDINGS.forEach(b => {
      updated[b.id] = amount;
    });
    setEditForm(f => ({ ...f, buildings: updated }));
  }

  // Highscores im Editor anpassen
  function handleScoreChange(gameKey, score) {
    setEditForm(f => ({
      ...f,
      scores: {
        ...f.scores,
        [gameKey]: Math.max(0, parseInt(score, 10) || 0)
      }
    }));
  }

  // Schneller Bonus
  async function handleQuickBonus(username, { cookiesDelta = 0, chipsDelta = 0, gemsDelta = 0 }) {
    await adminQuickAdjustBalance(username, { cookiesDelta, chipsDelta, gemsDelta });
    showAlert(`Bonus an "${username}" vergeben!`);
    await loadData();
  }

  // Fortschritt selektiv zurücksetzen
  async function handleResetProgress(username) {
    if (!confirm(`Soll der gesamte Spiel-Fortschritt von "${username}" wirklich auf 0 zurückgesetzt werden?`)) return;
    await adminResetPlayerProgress(username);
    showAlert(`Fortschritt von "${username}" zurückgesetzt.`);
    if (editingUser) setEditingUser(null);
    await loadData();
  }

  // Account löschen
  async function handleDeleteAccount(username) {
    if (!confirm(`Möchtest du das Konto von "${username}" wirklich unwiderruflich löschen?`)) return;
    deleteAccount(username);
    setAccounts(a => a.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
    showAlert(`Konto "${username}" gelöscht.`);
  }

  // Broadcast senden
  function handleSendBroadcast(e) {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    adminBroadcastMessage(broadcastText);
    showAlert('📢 Server-Mitteilung an alle Spieler gesendet!');
    setBroadcastText('');
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

  if (!isOpen || !isAdmin) return null;

  const filteredAccounts = accounts.filter(a => {
    if (!searchUser.trim()) return true;
    return a.username.toLowerCase().includes(searchUser.toLowerCase().trim());
  });

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
      <div className="overlay-panel admin-panel" style={{ maxWidth: '860px', width: '96%', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Haupt-Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="overlay-title" style={{ color: 'var(--accent)', fontSize: '0.9rem', margin: 0, textAlign: 'left' }}>
            👑 ADMIN-DASHBOARD &amp; MANAGEMENT
          </h2>
          <button className="btn btn-outline" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.5rem' }} onClick={onClose}>
            SCHLIESSEN
          </button>
        </div>

        {alertMsg && (
          <div style={{
            background: alertMsg.includes('Fehler') ? 'rgba(255, 68, 68, 0.2)' : 'rgba(57, 255, 20, 0.15)',
            border: `1px solid ${alertMsg.includes('Fehler') ? '#ff4444' : '#39ff14'}`,
            color: alertMsg.includes('Fehler') ? '#ff7777' : '#39ff14',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {alertMsg}
          </div>
        )}

        {/* -------------------------------------------------------------
            ANSICHT 1: SPIELER VOLLSTÄNDIG & INDIVIDUELL BEARBEITEN
            ------------------------------------------------------------- */}
        {editingUser ? (
          <div className="admin-edit-player-view" style={{ background: '#0e0e0e', padding: '16px', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #222', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.48rem' }}
                  onClick={() => setEditingUser(null)}
                >
                  ⬅️ ZURÜCK ZUR LISTE
                </button>
                <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--accent)', margin: 0 }}>
                  ✏️ SPIELER BEARBEITEN: {editingUser.username}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: '30px', padding: '4px 8px', fontSize: '0.45rem' }}
                onClick={() => setEditingUser(null)}
              >
                ✕ ABBRECHEN
              </button>
            </div>

            {/* Sub-Tabs für den Spieler-Editor */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${editTab === 'account' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '0.45rem', minHeight: '28px' }}
                onClick={() => setEditTab('account')}
              >
                🔒 KONTO &amp; STATUS
              </button>
              <button
                type="button"
                className={`btn ${editTab === 'currency' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '0.45rem', minHeight: '28px' }}
                onClick={() => setEditTab('currency')}
              >
                💰 WÄHRUNGEN &amp; STATS
              </button>
              <button
                type="button"
                className={`btn ${editTab === 'buildings' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '0.45rem', minHeight: '28px' }}
                onClick={() => setEditTab('buildings')}
              >
                🏭 GEBÄUDE ({BUILDINGS.length})
              </button>
              <button
                type="button"
                className={`btn ${editTab === 'scores' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '4px 10px', fontSize: '0.45rem', minHeight: '28px' }}
                onClick={() => setEditTab('scores')}
              >
                🏆 HIGHSCORES
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* 1. KONTO & STATUS TAB */}
              {editTab === 'account' && (
                <div style={{ background: '#121212', padding: '14px', borderRadius: '8px', border: '1px solid #282828', marginBottom: '14px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '4px' }}>
                      BENUTZERNAME UMBENENNEN:
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      className="custom-bet-input"
                      style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                      value={editForm.newUsername}
                      onChange={(e) => setEditForm(f => ({ ...f, newUsername: e.target.value }))}
                    />
                    <span style={{ fontSize: '0.62rem', color: '#777', marginTop: '2px', display: 'block' }}>
                      Benennt Spielstände und Highscores dieses Spielers automatisch um.
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '4px' }}>
                      NEUES PASSWORT SETZEN (OPTIONAL):
                    </label>
                    <input
                      type="text"
                      className="custom-bet-input"
                      style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                      placeholder="Leer lassen um altes Passwort zu behalten..."
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.isAdmin}
                        onChange={(e) => setEditForm(f => ({ ...f, isAdmin: e.target.checked }))}
                      />
                      <span style={{ fontSize: '0.7rem', color: editForm.isAdmin ? 'var(--accent)' : '#fff' }}>
                        👑 Administrator-Rechte aktivieren
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editForm.isBanned}
                        onChange={(e) => setEditForm(f => ({ ...f, isBanned: e.target.checked }))}
                      />
                      <span style={{ fontSize: '0.7rem', color: editForm.isBanned ? '#ff4444' : '#fff' }}>
                        🚫 Account sperren / Bannen (Login wird blockiert)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* 2. WÄHRUNGEN & STATS TAB */}
              {editTab === 'currency' && (
                <div style={{ background: '#121212', padding: '14px', borderRadius: '8px', border: '1px solid #282828', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>🍪 KONTO-COOKIES:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.cookies}
                        onChange={(e) => setEditForm(f => ({ ...f, cookies: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>🍪 TOTAL COOKIES (LEBENSZEIT):</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.totalCookies}
                        onChange={(e) => setEditForm(f => ({ ...f, totalCookies: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#ffd700', fontFamily: 'var(--font-pixel)' }}>✨ HIMMELSCHIPS:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.heavenlyChips}
                        onChange={(e) => setEditForm(f => ({ ...f, heavenlyChips: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#ffd700', fontFamily: 'var(--font-pixel)' }}>✨ EINGELÖSTE CHIPS:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.heavenlyChipsClaimed}
                        onChange={(e) => setEditForm(f => ({ ...f, heavenlyChipsClaimed: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#00e5ff', fontFamily: 'var(--font-pixel)' }}>💎 DIAMANTEN:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.gems}
                        onChange={(e) => setEditForm(f => ({ ...f, gems: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#90be6d', fontFamily: 'var(--font-pixel)' }}>🌟 AUFSTIEGE:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.ascensionCount}
                        onChange={(e) => setEditForm(f => ({ ...f, ascensionCount: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#bbb', fontFamily: 'var(--font-pixel)' }}>🖱️ TOTAL KLICKS:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.totalClicks}
                        onChange={(e) => setEditForm(f => ({ ...f, totalClicks: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. GEBÄUDE TAB */}
              {editTab === 'buildings' && (
                <div style={{ background: '#121212', padding: '14px', borderRadius: '8px', border: '1px solid #282828', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '0.52rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>
                      GEBÄUDE-ANZAHL INDIVIDUELL SETZEN:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.4rem', minHeight: '22px' }} onClick={() => handleBatchBuildings(0)}>
                        Alle 0
                      </button>
                      <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.4rem', minHeight: '22px' }} onClick={() => handleBatchBuildings(25)}>
                        Alle 25
                      </button>
                      <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.4rem', minHeight: '22px', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => handleBatchBuildings(100)}>
                        Alle 100
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {BUILDINGS.map(b => (
                      <div key={b.id} style={{ background: '#0a0a0a', border: '1px solid #222', padding: '8px', borderRadius: '6px' }}>
                        <label style={{ display: 'block', fontSize: '0.44rem', fontFamily: 'var(--font-pixel)', color: b.color, marginBottom: '4px' }}>
                          {b.name}:
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="custom-bet-input"
                          style={{ width: '100%', padding: '4px', fontSize: '0.75rem' }}
                          value={editForm.buildings[b.id] ?? 0}
                          onChange={(e) => handleBuildingChange(b.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. HIGHSCORES TAB */}
              {editTab === 'scores' && (
                <div style={{ background: '#121212', padding: '14px', borderRadius: '8px', border: '1px solid #282828', marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '12px' }}>
                    Setze für diesen Spieler gezielt die Highscores in den einzelnen Arcade-Spielen fest:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#39ff14', fontFamily: 'var(--font-pixel)' }}>🐍 SNAKE SCORE:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.scores.snake ?? 0}
                        onChange={(e) => handleScoreChange('snake', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#ff4444', fontFamily: 'var(--font-pixel)' }}>⏹️ PRESS SCORE:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.scores.press ?? 0}
                        onChange={(e) => handleScoreChange('press', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>🎰 SLOTS BESTER GEWINN:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.scores.slots ?? 0}
                        onChange={(e) => handleScoreChange('slots', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.45rem', color: '#90be6d', fontFamily: 'var(--font-pixel)' }}>🃏 BLACKJACK BESTER GEWINN:</label>
                      <input
                        type="number"
                        className="custom-bet-input"
                        style={{ width: '100%', marginTop: '3px', padding: '6px' }}
                        value={editForm.scores.blackjack ?? 0}
                        onChange={(e) => handleScoreChange('blackjack', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Speichern & Reset Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', fontSize: '0.65rem' }} disabled={saving}>
                  {saving ? '💾 WIRD GESPEICHERT...' : '💾 ALLES SPEICHERN'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '12px 16px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.55rem' }}
                  onClick={() => handleResetProgress(editingUser.username)}
                  disabled={saving}
                  title="Setzt nur Cookies und Fortschritt zurück"
                >
                  RESET
                </button>
              </div>
            </form>
          </div>
        ) : createOpen ? (
          /* -------------------------------------------------------------
              ANSICHT 2: NEUEN SPIELER ERSTELLEN
              ------------------------------------------------------------- */
          <div className="admin-create-player-view" style={{ background: '#0e0e0e', padding: '16px', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #222', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.48rem' }}
                  onClick={() => setCreateOpen(false)}
                >
                  ⬅️ ZURÜCK ZUR LISTE
                </button>
                <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.75rem', color: 'var(--accent)', margin: 0 }}>
                  ➕ NEUEN SPIELER ANLEGEN
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ minHeight: '30px', padding: '4px 8px', fontSize: '0.45rem' }}
                onClick={() => setCreateOpen(false)}
              >
                ✕ ABBRECHEN
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '4px' }}>
                  BENUTZERNAME:
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  className="custom-bet-input"
                  style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                  value={createForm.username}
                  onChange={(e) => setCreateForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Z.B. ProGamer"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: 'var(--muted)', marginBottom: '4px' }}>
                  PASSWORT:
                </label>
                <input
                  type="text"
                  required
                  className="custom-bet-input"
                  style={{ width: '100%', textAlign: 'left', padding: '8px' }}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.42rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)', marginBottom: '4px' }}>
                    🍪 COOKIES:
                  </label>
                  <input
                    type="number"
                    className="custom-bet-input"
                    style={{ width: '100%', padding: '6px' }}
                    value={createForm.initialCookies}
                    onChange={(e) => setCreateForm(f => ({ ...f, initialCookies: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.42rem', fontFamily: 'var(--font-pixel)', color: '#ffd700', marginBottom: '4px' }}>
                    ✨ CHIPS:
                  </label>
                  <input
                    type="number"
                    className="custom-bet-input"
                    style={{ width: '100%', padding: '6px' }}
                    value={createForm.initialChips}
                    onChange={(e) => setCreateForm(f => ({ ...f, initialChips: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.42rem', fontFamily: 'var(--font-pixel)', color: '#00e5ff', marginBottom: '4px' }}>
                    💎 GEMS:
                  </label>
                  <input
                    type="number"
                    className="custom-bet-input"
                    style={{ width: '100%', padding: '6px' }}
                    value={createForm.initialGems}
                    onChange={(e) => setCreateForm(f => ({ ...f, initialGems: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="create-admin-check"
                  checked={createForm.isAdmin}
                  onChange={(e) => setCreateForm(f => ({ ...f, isAdmin: e.target.checked }))}
                />
                <label htmlFor="create-admin-check" style={{ fontSize: '0.68rem', color: '#fff', cursor: 'pointer' }}>
                  👑 Diesem Spieler Admin-Rechte gewähren
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.65rem' }} disabled={saving}>
                {saving ? 'WIRD ERSTELLT...' : 'SPIELER ERSTELLEN'}
              </button>
            </form>
          </div>
        ) : (
          /* -------------------------------------------------------------
              ANSICHT 3: STANDARD ADMIN TABS (KONTEN, DURCHSAGE, HIGHSCORES, ETC.)
              ------------------------------------------------------------- */
          <>
            {/* Tab-Navigation */}
            <div className="auth-tabs" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                className={`auth-tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
              >
                👥 SPIELER &amp; KONTEN ({accounts.length})
              </button>
              <button
                className={`auth-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
                onClick={() => setActiveTab('broadcast')}
              >
                📢 SERVER-DURCHSAGE
              </button>
              <button
                className={`auth-tab-btn ${activeTab === 'scores' ? 'active' : ''}`}
                onClick={() => setActiveTab('scores')}
              >
                🏆 HIGHSCORES ({scores.length})
              </button>
              <button
                className={`auth-tab-btn ${activeTab === 'clicker' ? 'active' : ''}`}
                onClick={() => setActiveTab('clicker')}
              >
                ⚡ CLICKER-TOOLS
              </button>
              <button
                className={`auth-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                onClick={() => setActiveTab('feedback')}
                style={unreadFeedbackCount > 0 ? { borderColor: '#ff4444', color: '#ffd700', position: 'relative' } : {}}
              >
                💬 FEEDBACK &amp; BUGS {unreadFeedbackCount > 0 ? `(${unreadFeedbackCount} NEU)` : `(${feedbacks.length})`}
              </button>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>LADE DATEN...</p>
            ) : (
              <>
                {/* TAB 1: ACCOUNTS & SPIELER MANAGEMENT */}
                {activeTab === 'accounts' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                        <input
                          type="text"
                          placeholder="🔍 Spieler suchen..."
                          value={searchUser}
                          onChange={(e) => setSearchUser(e.target.value)}
                          style={{
                            background: '#111',
                            border: '1px solid #333',
                            color: '#fff',
                            fontSize: '0.7rem',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            width: '100%',
                            maxWidth: '260px'
                          }}
                        />
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.52rem', minHeight: '34px' }}
                        onClick={() => setCreateOpen(true)}
                      >
                        ➕ NEUEN SPIELER ERSTELLEN
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>USER</th>
                            <th>STATUS</th>
                            <th>GUTHABEN &amp; STATS</th>
                            <th>HIGHSCORES</th>
                            <th>AKTIONEN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAccounts.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#666' }}>Keine Konten gefunden</td></tr>
                          ) : (
                            filteredAccounts.map(acc => (
                              <tr key={acc.username}>
                                <td style={{ fontWeight: 'bold' }}>
                                  <span style={{ color: acc.isAdmin ? 'var(--accent)' : '#fff' }}>
                                    {acc.username}
                                  </span>
                                  {acc.isAdmin && <span style={{ color: 'var(--accent)', fontSize: '0.42rem', marginLeft: '6px' }}>👑 ADMIN</span>}
                                </td>
                                <td>
                                  {acc.isBanned ? (
                                    <span style={{ color: '#ff4444', fontSize: '0.45rem', background: 'rgba(255,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                      🚫 GESPERRT
                                    </span>
                                  ) : (
                                    <span style={{ color: '#39ff14', fontSize: '0.45rem' }}>
                                      AKTIV
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.58rem' }}>
                                    <span>🍪 <strong>{fmtCookies(acc.cookies || 0)}</strong> Cookies</span>
                                    <span style={{ color: '#ffd700' }}>✨ <strong>{acc.heavenlyChips || 0}</strong> Chips</span>
                                    <span style={{ color: '#00e5ff' }}>💎 <strong>{acc.gems || 0}</strong> Gems</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: '0.55rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span>🐍 Snake: <strong style={{ color: '#fff' }}>{acc.scores?.snake || 0}</strong></span>
                                    <span>🎰 Slots: <strong style={{ color: 'var(--accent)' }}>{fmtCookies(acc.scores?.slots || 0)}</strong></span>
                                    <span>🃏 BJ: <strong style={{ color: '#90be6d' }}>{fmtCookies(acc.scores?.blackjack || 0)}</strong></span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <button
                                      className="btn btn-outline"
                                      style={{ padding: '4px 8px', fontSize: '0.44rem', minHeight: '26px', color: '#70b4ff', borderColor: '#70b4ff', fontWeight: 'bold' }}
                                      onClick={() => openEditModal(acc)}
                                      title="Alle Daten dieses Spielers bearbeiten"
                                    >
                                      ✏️ BEARBEITEN
                                    </button>
                                    <button
                                      className="btn btn-outline"
                                      style={{ padding: '4px 6px', fontSize: '0.42rem', minHeight: '26px', color: '#ffd700', borderColor: '#ffd700' }}
                                      onClick={() => handleQuickBonus(acc.username, { cookiesDelta: 100000 })}
                                      title="+100.000 Cookies"
                                    >
                                      +100k 🍪
                                    </button>
                                    <button
                                      className="btn btn-outline"
                                      style={{ padding: '4px 6px', fontSize: '0.42rem', minHeight: '26px', color: '#00e5ff', borderColor: '#00e5ff' }}
                                      onClick={() => handleQuickBonus(acc.username, { gemsDelta: 25 })}
                                      title="+25 Diamanten"
                                    >
                                      +25 💎
                                    </button>
                                    <button
                                      className="btn btn-outline"
                                      style={{
                                        padding: '4px 6px',
                                        fontSize: '0.42rem',
                                        minHeight: '26px',
                                        color: 'var(--danger)',
                                        borderColor: 'var(--danger)',
                                      }}
                                      onClick={() => handleDeleteAccount(acc.username)}
                                      title="Account löschen"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: SERVER-DURCHSAGE */}
                {activeTab === 'broadcast' && (
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '14px' }}>
                      Sende eine Benachrichtigung live an alle aktuell verbundenen Spieler und Tabs in der Arcade.
                    </p>

                    <form onSubmit={handleSendBroadcast} style={{ background: '#121212', padding: '16px', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                      <label style={{ display: 'block', fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: 'var(--accent)', marginBottom: '8px' }}>
                        📢 NACHRICHT AN ALLE SPIELER:
                      </label>
                      <textarea
                        rows={3}
                        className="custom-bet-input"
                        style={{ width: '100%', textAlign: 'left', fontSize: '0.8rem', padding: '10px', marginBottom: '14px' }}
                        placeholder="Z.B.: 🎉 ADMIN-EVENT: Doppelter Casino-Gewinn für die nächsten 30 Minuten!"
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                      />

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setBroadcastText('🍪 ADMIN-GESCHENK: 1.000.000 Gratis-Kekse für alle aktiven Spieler!')}
                          style={{ fontSize: '0.45rem', padding: '6px 10px' }}
                        >
                          Vorlage: Geschenk 🍪
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setBroadcastText('🎰 CASINO-FIEBER: Der Slots Jackpot wurde soeben aufgestockt!')}
                          style={{ fontSize: '0.45rem', padding: '6px 10px' }}
                        >
                          Vorlage: Casino 🎰
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ fontSize: '0.55rem', padding: '8px 16px' }}
                          disabled={!broadcastText.trim()}
                        >
                          📢 JETZT SENDEN
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 3: HIGHSCORES */}
                {activeTab === 'scores' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>FILTER:</span>
                        {['all', 'snake', 'press', 'clicker', 'slots', 'blackjack'].map(g => (
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

                {/* TAB 4: CLICKER-TOOLS */}
                {activeTab === 'clicker' && (
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '16px' }}>
                      Ereignisse &amp; Boni live für das Keks-Clicker-Spiel auslösen.
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
                        onClick={() => triggerDevTool('ADD_COOKIES', { amount: 10000000 })}
                      >
                        🍪 +10.000.000 COOKIES
                      </button>

                      <button
                        className="btn btn-outline"
                        style={{ padding: '10px 8px', fontSize: '0.48rem', borderColor: '#70b4ff', color: '#70b4ff' }}
                        onClick={() => triggerDevTool('ADD_CHIPS', { amount: 50 })}
                      >
                        🌟 +50 HIMMELSCHIPS
                      </button>

                      <button
                        className="btn btn-outline"
                        style={{ padding: '10px 8px', fontSize: '0.48rem', borderColor: '#00e5ff', color: '#00e5ff' }}
                        onClick={() => triggerDevTool('ADD_GEMS', { amount: 50 })}
                      >
                        💎 +50 DIAMANTEN
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: FEEDBACK & BUGS */}
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
          </>
        )}
      </div>
    </div>
  );
}
