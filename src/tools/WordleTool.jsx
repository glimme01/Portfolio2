// src/tools/WordleTool.jsx
// Deutsches Wordle: 5-Buchstaben-Wort des Tages (Datums-Hash), Übungsmodus, QWERTZ-Tastatur & Statistik

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { IconWordle, IconRefresh, IconShare } from '../components/Icons';
import { WORDLE_WORDS } from '../data/wordleWords';

// QWERTZ-Tastaturlayout
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

// Tageswort deterministisch per Datums-Hash (YYYY-MM-DD)
function getDailyWordIndex() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % WORDLE_WORDS.length;
}

export default function WordleTool() {
  usePageMeta(
    'Wordle Deutsch',
    'Das beliebte 5-Buchstaben-Worträtsel auf Deutsch. Täglich ein neues Wort des Tages oder unbegrenzt im Übungsmodus spielen.'
  );

  const [mode, setMode] = useState('DAILY'); // 'DAILY' | 'PRACTICE'
  const [targetWord, setTargetWord] = useState(() => WORDLE_WORDS[getDailyWordIndex()] || 'APFEL');
  const [guesses, setGuesses] = useState([]); // Array von Strings
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('IN_PROGRESS'); // 'IN_PROGRESS', 'WON', 'LOST'
  const [message, setMessage] = useState('');

  // Statistiken aus localStorage
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_wordle_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  });

  // Daily State aus localStorage laden
  useEffect(() => {
    if (mode === 'DAILY') {
      const todayKey = `mf_wordle_daily_${new Date().toISOString().slice(0, 10)}`;
      try {
        const saved = localStorage.getItem(todayKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setGuesses(parsed.guesses || []);
          setGameStatus(parsed.status || 'IN_PROGRESS');
          setTargetWord(parsed.target || WORDLE_WORDS[getDailyWordIndex()]);
          return;
        }
      } catch (e) {
        console.warn(e);
      }
      // Neuer Tag
      const dailyWord = WORDLE_WORDS[getDailyWordIndex()] || 'APFEL';
      setTargetWord(dailyWord);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('IN_PROGRESS');
    } else {
      // Übungsmodus: zufälliges Wort
      const randomIdx = Math.floor(Math.random() * WORDLE_WORDS.length);
      setTargetWord(WORDLE_WORDS[randomIdx]);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('IN_PROGRESS');
    }
  }, [mode]);

  // Statistik aktualisieren
  const updateStats = useCallback((won) => {
    setStats((prev) => {
      const played = prev.played + 1;
      const wins = won ? prev.won + 1 : prev.won;
      const currentStreak = won ? prev.currentStreak + 1 : 0;
      const maxStreak = Math.max(prev.maxStreak, currentStreak);
      const nextStats = { played, won: wins, currentStreak, maxStreak };
      try {
        localStorage.setItem('mf_tools_wordle_stats', JSON.stringify(nextStats));
      } catch (e) {
        console.warn(e);
      }
      return nextStats;
    });
  }, []);

  // Daily State speichern
  const saveDailyProgress = useCallback((newGuesses, newStatus, target) => {
    if (mode !== 'DAILY') return;
    const todayKey = `mf_wordle_daily_${new Date().toISOString().slice(0, 10)}`;
    try {
      localStorage.setItem(
        todayKey,
        JSON.stringify({
          guesses: newGuesses,
          status: newStatus,
          target,
        })
      );
    } catch (e) {
      console.warn(e);
    }
  }, [mode]);

  // Versuch auswerten
  const evaluateGuess = useCallback((guess, target) => {
    const res = Array(5).fill('ABSENT');
    const targetArr = target.split('');
    const guessArr = guess.split('');

    // Schritt 1: Volltreffer (KORREKT / Grün)
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        res[i] = 'CORRECT';
        targetArr[i] = null;
        guessArr[i] = null;
      }
    }

    // Schritt 2: Enthalten (VORHANDEN / Gelb)
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] !== null) {
        const foundIdx = targetArr.indexOf(guessArr[i]);
        if (foundIdx !== -1) {
          res[i] = 'PRESENT';
          targetArr[foundIdx] = null;
        }
      }
    }

    return res;
  }, []);

  // Buchstabe eingeben
  const handleKeyPress = useCallback((char) => {
    if (gameStatus !== 'IN_PROGRESS') return;

    if (char === 'DEL' || char === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
      setMessage('');
      return;
    }

    if (char === 'ENTER') {
      if (currentGuess.length < 5) {
        setMessage('Wort ist zu kurz (5 Buchstaben benötigt)');
        return;
      }

      if (!WORDLE_WORDS.includes(currentGuess)) {
        setMessage('Wort nicht in der deutschen Liste');
        return;
      }

      const nextGuesses = [...guesses, currentGuess];
      setGuesses(nextGuesses);
      setCurrentGuess('');
      setMessage('');

      if (currentGuess === targetWord) {
        setGameStatus('WON');
        updateStats(true);
        saveDailyProgress(nextGuesses, 'WON', targetWord);
      } else if (nextGuesses.length >= 6) {
        setGameStatus('LOST');
        updateStats(false);
        saveDailyProgress(nextGuesses, 'LOST', targetWord);
      } else {
        saveDailyProgress(nextGuesses, 'IN_PROGRESS', targetWord);
      }
      return;
    }

    if (/^[A-ZÄÖÜ]$/.test(char) && currentGuess.length < 5) {
      // Umlaute in Standardbuchstaben oder ignorieren
      let clean = char;
      if (clean === 'Ä') clean = 'AE';
      if (clean === 'Ö') clean = 'OE';
      if (clean === 'Ü') clean = 'UE';
      if (clean.length === 1) {
        setCurrentGuess((prev) => prev + clean);
        setMessage('');
      }
    }
  }, [currentGuess, gameStatus, guesses, targetWord, updateStats, saveDailyProgress]);

  // Physische Tastatur lauschen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') {
        handleKeyPress('ENTER');
      } else if (key === 'BACKSPACE') {
        handleKeyPress('DEL');
      } else if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyPress]);

  // Status aller Tastaturtasten ermitteln
  const keyStatusMap = useMemo(() => {
    const map = {};
    guesses.forEach((g) => {
      const evalRes = evaluateGuess(g, targetWord);
      for (let i = 0; i < 5; i++) {
        const letter = g[i];
        const status = evalRes[i];
        if (status === 'CORRECT') {
          map[letter] = 'CORRECT';
        } else if (status === 'PRESENT' && map[letter] !== 'CORRECT') {
          map[letter] = 'PRESENT';
        } else if (status === 'ABSENT' && !map[letter]) {
          map[letter] = 'ABSENT';
        }
      }
    });
    return map;
  }, [guesses, targetWord, evaluateGuess]);

  // Neues Wort im Übungsmodus starten
  const startNewPracticeGame = () => {
    const randomIdx = Math.floor(Math.random() * WORDLE_WORDS.length);
    setTargetWord(WORDLE_WORDS[randomIdx]);
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('IN_PROGRESS');
    setMessage('');
  };

  // Ergebnis teilen (Emoji-Raster)
  const handleShareResult = async () => {
    const today = new Date().toLocaleDateString('de-DE');
    const header = `Wordle Deutsch (${today}) ${gameStatus === 'WON' ? guesses.length : 'X'}/6\n\n`;
    const rows = guesses.map((g) => {
      const res = evaluateGuess(g, targetWord);
      return res
        .map((s) => (s === 'CORRECT' ? '🟩' : s === 'PRESENT' ? '🟨' : '⬛'))
        .join('');
    });
    const shareText = `${header}${rows.join('\n')}\n\nmoritzfreund.de/tools/wordle`;

    try {
      await navigator.clipboard.writeText(shareText);
      setMessage('Ergebnis-Raster in die Zwischenablage kopiert!');
    } catch {
      setMessage('Kopieren fehlgeschlagen.');
    }
  };

  return (
    <div className="tool-workspace">
      {/* Header */}
      <div className="tool-page-header">
        <div className="tool-page-title-row">
          <div className="tool-page-heading">
            <div className="tool-page-icon" aria-hidden="true">
              <IconWordle width={28} height={28} />
            </div>
            <div>
              <h1>WORDLE DEUTSCH</h1>
              <p className="tool-page-desc">Errate das 5-Buchstaben-Wort in 6 Versuchen — 100% offline.</p>
            </div>
          </div>
          <span className="badge badge-offline">OFFLINE</span>
        </div>
      </div>

      {/* Modus-Wahl & Statistiken */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`chip ${mode === 'DAILY' ? 'active' : ''}`}
            onClick={() => setMode('DAILY')}
          >
            Wort des Tages
          </button>
          <button
            type="button"
            className={`chip ${mode === 'PRACTICE' ? 'active' : ''}`}
            onClick={() => setMode('PRACTICE')}
          >
            Übungs-Modus
          </button>
        </div>

        {mode === 'PRACTICE' && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={startNewPracticeGame}>
            <IconRefresh width={14} height={14} /> NEUES WORT
          </button>
        )}
      </div>

      {/* Spielfeld (6 Zeilen à 5 Kacheln) */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[...Array(6)].map((_, rowIndex) => {
            const guess = guesses[rowIndex];
            const isCurrentRow = rowIndex === guesses.length;
            const evalResult = guess ? evaluateGuess(guess, targetWord) : null;

            return (
              <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[...Array(5)].map((__, colIndex) => {
                  let letter = '';
                  let status = 'EMPTY';

                  if (guess) {
                    letter = guess[colIndex];
                    status = evalResult[colIndex];
                  } else if (isCurrentRow) {
                    letter = currentGuess[colIndex] || '';
                    status = letter ? 'TYPING' : 'EMPTY';
                  }

                  // Styling Kacheln
                  let bg = '#ffffff';
                  let color = '#111111';
                  let border = '2.5px solid #111111';

                  if (status === 'CORRECT') {
                    bg = '#10b981'; // Grün
                    color = '#ffffff';
                  } else if (status === 'PRESENT') {
                    bg = '#eab308'; // Gelb
                    color = '#ffffff';
                  } else if (status === 'ABSENT') {
                    bg = '#6b7280'; // Grau
                    color = '#ffffff';
                  } else if (status === 'TYPING') {
                    border = '3px solid #ff5b00';
                  }

                  return (
                    <div
                      key={colIndex}
                      style={{
                        width: 'clamp(46px, 11vw, 56px)',
                        height: 'clamp(46px, 11vw, 56px)',
                        backgroundColor: bg,
                        color,
                        border,
                        borderRadius: '6px',
                        boxShadow: '2px 2px 0 #111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.3rem, 4vw, 1.6rem)',
                        fontWeight: 900,
                        userSelect: 'none',
                        textTransform: 'uppercase',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Meldung & Feedback */}
        {message && (
          <div
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--marker-yellow)',
              border: '2px solid #111',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '2px 2px 0 #111',
              marginBottom: '12px',
            }}
          >
            {message}
          </div>
        )}

        {/* Spiel-Ende Banner */}
        {gameStatus !== 'IN_PROGRESS' && (
          <div
            className="panel text-center"
            style={{
              backgroundColor: gameStatus === 'WON' ? 'var(--success-green-light)' : 'var(--danger-red-light)',
              width: '100%',
              maxWidth: '400px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ marginBottom: '4px' }}>
              {gameStatus === 'WON' ? 'GLÜCKWUNSCH! GELÖST!' : 'LEIDER VORBEI!'}
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
              Das gesuchte Wort war: <strong>{targetWord}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleShareResult}>
                <IconShare width={16} height={16} /> ERGEBNIS TEILEN
              </button>
              {mode === 'PRACTICE' && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={startNewPracticeGame}>
                  NOCHMAL SPIELEN
                </button>
              )}
            </div>
          </div>
        )}

        {/* Virtuelle QWERTZ-Tastatur */}
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {KEYBOARD_ROWS.map((row, rIdx) => (
            <div key={rIdx} style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {row.map((k) => {
                const status = keyStatusMap[k];
                let bg = '#ffffff';
                let col = '#111111';

                if (status === 'CORRECT') {
                  bg = '#10b981';
                  col = '#ffffff';
                } else if (status === 'PRESENT') {
                  bg = '#eab308';
                  col = '#ffffff';
                } else if (status === 'ABSENT') {
                  bg = '#9ca3af';
                  col = '#ffffff';
                }

                const isWide = k === 'ENTER' || k === 'DEL';

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKeyPress(k)}
                    style={{
                      flex: isWide ? 1.6 : 1,
                      minHeight: '44px',
                      padding: isWide ? '0 6px' : '0',
                      fontSize: isWide ? '0.75rem' : '0.95rem',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      backgroundColor: bg,
                      color: col,
                      borderRadius: '4px',
                      border: '2px solid #111111',
                      boxShadow: '1.5px 1.5px 0 #111111',
                      cursor: 'pointer',
                      transform: 'none',
                    }}
                  >
                    {k === 'DEL' ? '⌫' : k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lokale Statistik */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>DEINE STATISTIK</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div className="panel-subtle" style={{ padding: '8px' }}>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 900 }}>{stats.played}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gespielt</span>
          </div>
          <div className="panel-subtle" style={{ padding: '8px' }}>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 900 }}>
              {stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gewonnen</span>
          </div>
          <div className="panel-subtle" style={{ padding: '8px' }}>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 900 }}>{stats.currentStreak}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serie</span>
          </div>
          <div className="panel-subtle" style={{ padding: '8px' }}>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 900 }}>{stats.maxStreak}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rekord</span>
          </div>
        </div>

        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '12px', textAlign: 'center' }}>
          Wortliste lokal gebündelt ({WORDLE_WORDS.length} deutsche Wörter). Kein Serverkontakt nötig.
        </p>
      </div>
    </div>
  );
}
