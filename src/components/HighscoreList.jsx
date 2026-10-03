import React, { useState, useEffect, useRef } from 'react';
import { getTopScores, insertScore } from '../lib/scores.js';
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
    if (!name.trim() || submitting || submitted) return;
    setSubmitting(true);
    const { data, error } = await insertScore(name.trim(), game, newScore);
    if (data) {
      setNewId(data.id);
      setSubmitted(true);
      await load();
      if (onSubmitted) onSubmitted(name.trim());
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
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--muted)', marginBottom: '10px' }}>
            NEUER HIGHSCORE: {fmt(newScore)} — NAME EINTRAGEN
          </p>
          <NameInput value={name} onChange={setName} />
          <button
            className="btn btn-primary"
            style={{ marginTop: '10px', width: '100%' }}
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'WIRD EINGETRAGEN...' : 'EINTRAGEN'}
          </button>
        </div>
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
