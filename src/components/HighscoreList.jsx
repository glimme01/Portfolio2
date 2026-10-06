import React, { useState, useEffect, useRef } from 'react';
import { getTopScores, insertScore } from '../lib/scores.js';
import { getLoggedInUser } from '../lib/auth.js';
import NameInput from './NameInput.jsx';

const RANK_LABELS = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'];

// Formatiert Zahl mit Punkten (z.B. 12345 -> "12.345")
function fmt(n) {
  return n.toLocaleString('de-DE');
}

// Top-10-Highscore-Tabelle mit optionalem Eintrag-Formular
export default function HighscoreList({
  game,
  newScore = null,       // wenn gesetzt, Formular anzeigen
  newEntry = false,      // ob gerade ein neuer Eintrag eingetragen wurde
  onSubmitted = null,    // Callback nach Eintrag
  compact = false,       // nur Top-3, kein Formular
  limit = 10,
}) {
  const [scores, setScores] = useState([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newId, setNewId] = useState(null);
  const newRowRef = useRef(null);
  const loggedInUser = getLoggedInUser();

  // Scores laden
  async function load() {
    setLoading(true);
    const { data, offline: off } = await getTopScores(game, limit);
    setScores(data);
    setOffline(off);
    setLoading(false);
  }

  useEffect(() => { load(); }, [game]);

  // Nach Eintrag neu laden
  async function handleSubmit() {
    const submitName = (loggedInUser || name || '').trim();
    if (!submitName || submitting || submitted) return;
    setSubmitting(true);
    const { data, error } = await insertScore(submitName, game, newScore);
    if (data) {
      setNewId(data.id);
      setSubmitted(true);
      await load();
      if (onSubmitted) onSubmitted(submitName);
    } else {
      console.warn('Score-Eintrag fehlgeschlagen:', error);
    }
    setSubmitting(false);
  }

  // Scroll zu neuem Eintrag
  useEffect(() => {
    if (newId && newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [newId, scores]);

  const displayScores = compact ? scores.slice(0, 3) : scores;

  return (
    <div>
      {offline && !compact && (
        <div className="offline-badge">LOKALER MODUS (OFFLINE)</div>
      )}

      {/* Eintrag-Formular */}
      {!compact && newScore !== null && !submitted && (
        !loggedInUser ? (
          <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '10px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.52rem', color: 'var(--accent)', marginBottom: '6px' }}>
              🏆 NEUER SCORE: {fmt(newScore)}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '12px' }}>
              Melde dich an, um deinen Highscore auf der Rangliste einzutragen!
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '0.55rem', padding: '10px' }}
              onClick={() => window.dispatchEvent(new CustomEvent('arcade-open-auth'))}
            >
              🔑 JETZT ANMELDEN
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', borderRadius: '10px' }}>
            <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--muted)', marginBottom: '8px' }}>
              NEUER HIGHSCORE: {fmt(newScore)} — SPIELER: <strong style={{ color: 'var(--accent)' }}>{loggedInUser}</strong>
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.58rem' }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'WIRD EINGETRAGEN...' : `👑 SCORE FÜR "${loggedInUser}" EINTRAGEN`}
            </button>
          </div>
        )
      )}

      {/* Tabelle */}
      {loading ? (
        <p className="hs-empty">LADEN...</p>
      ) : displayScores.length === 0 ? (
        <p className="hs-empty">NOCH KEINE SCORES</p>
      ) : (
        <table className="hs-table" aria-label={`Highscores ${game}`}>
          <thead>
            <tr>
              <th>#</th>
              <th>NAME</th>
              <th style={{ textAlign: 'right' }}>SCORE</th>
            </tr>
          </thead>
          <tbody>
            {displayScores.map((s, i) => {
              const isNew = s.id === newId;
              return (
                <tr
                  key={s.id}
                  className={isNew ? 'hs-new-entry' : ''}
                  ref={isNew ? newRowRef : null}
                  style={isNew ? { background: 'rgba(255,215,0,0.12)' } : {}}
                >
                  <td className={`hs-rank hs-rank-${i + 1}`}>{RANK_LABELS[i] ?? `#${i + 1}`}</td>
                  <td className="hs-name">{s.name}</td>
                  <td className="hs-score">{fmt(s.score)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
