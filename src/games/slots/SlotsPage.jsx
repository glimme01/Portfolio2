import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getLastName } from '../../lib/prefs.js';
import { fmtCookies } from '../clicker/clickerLogic.js';
import { insertScore } from '../../lib/scores.js';
import {
  playReelStopSound,
  playWinChime,
  playBigWinSound,
  playJackpotSirens,
  playCoinSound,
  playAnticipationSound,
} from '../../lib/casinoAudio.js';

const SYMBOLS = [
  { id: 'jackpot', emoji: '🍪', name: 'JACKPOT', weight: 1, payout: 500 },
  { id: 'star', emoji: '⭐', name: 'STERN (BONUS)', weight: 2, payout: 150 },
  { id: 'gold', emoji: '🏆', name: 'TROPHAE', weight: 3, payout: 75 },
  { id: 'seven', emoji: '7️⃣', name: 'SIEBEN', weight: 5, payout: 40 },
  { id: 'cherry', emoji: '🍒', name: 'KIRSCHE', weight: 8, payout: 15 },
  { id: 'lemon', emoji: '🍋', name: 'ZITRONE', weight: 10, payout: 8 },
  { id: 'melon', emoji: '🍈', name: 'MELONE', weight: 12, payout: 5 },
  { id: 'bar', emoji: '📊', name: 'BAR', weight: 15, payout: 3 },
];

const WEIGHTED_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
function pickSymbol() { return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)]; }
function pickReel() { return Array.from({ length: 3 }, pickSymbol); }

function checkWin(reels) {
  const lines = [
    [reels[0][0], reels[1][0], reels[2][0]], // Top horizontal
    [reels[0][1], reels[1][1], reels[2][1]], // Middle horizontal
    [reels[0][2], reels[1][2], reels[2][2]], // Bottom horizontal
    [reels[0][0], reels[1][1], reels[2][2]], // Diagonal top-left to bottom-right
    [reels[0][2], reels[1][1], reels[2][0]], // Diagonal bottom-left to top-right
  ];
  let total = 0;
  const wonLines = [];
  lines.forEach((line, idx) => {
    if (line[0].id === line[1].id && line[1].id === line[2].id) {
      wonLines.push({ lineIdx: idx, symbol: line[0], payout: line[0].payout });
      total += line[0].payout;
    }
  });
  return { total, wonLines };
}

function Reel({ symbols, spinning, spinDelay, finalSymbols, isAnticipating }) {
  const [displayed, setDisplayed] = useState(symbols);
  const [blur, setBlur] = useState(false);
  const iRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      const t = setTimeout(() => {
        setBlur(true);
        iRef.current = setInterval(() => setDisplayed([pickSymbol(), pickSymbol(), pickSymbol()]), 70);
      }, spinDelay);
      return () => { clearTimeout(t); clearInterval(iRef.current); };
    } else {
      clearInterval(iRef.current);
      setBlur(false);
      if (finalSymbols) setDisplayed(finalSymbols);
    }
  }, [spinning, finalSymbols, spinDelay]);

  return (
    <div
      className={`slot-reel ${isAnticipating ? 'anticipating' : ''}`}
      style={{
        filter: blur ? 'blur(3px)' : 'none',
        transition: 'filter 0.15s, border-color 0.2s',
      }}
    >
      {displayed.map((sym, i) => (
        <div key={i} className="slot-cell">
          <span className="slot-symbol">{sym.emoji}</span>
        </div>
      ))}
    </div>
  );
}

// 🃏 Double-or-Nothing Gamble Mini-Game
function GambleModal({ amount, onCollect, onWin, onLose }) {
  const [currentAmount, setCurrentAmount] = useState(amount);
  const [card, setCard] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [msg, setMsg] = useState('WAEHLE ROT ODER SCHWARZ!');

  function pickColor(color) {
    if (flipping) return;
    setFlipping(true);
    setMsg('KARTE WIRD AUFGEDECKT...');

    setTimeout(() => {
      const suits = color === 'red' ? ['♥', '♦'] : ['♠', '♣'];
      const otherSuits = color === 'red' ? ['♠', '♣'] : ['♥', '♦'];
      const won = Math.random() < 0.49;
      const actualSuit = won
        ? suits[Math.floor(Math.random() * suits.length)]
        : otherSuits[Math.floor(Math.random() * otherSuits.length)];
      const rank = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 8)];
      const resultCard = { suit: actualSuit, rank, isRed: ['♥', '♦'].includes(actualSuit) };
      setCard(resultCard);
      setFlipping(false);

      if (won) {
        const nextAmount = currentAmount * 2;
        setCurrentAmount(nextAmount);
        setMsg(`RICHTIG! VERDOPPELT AUF ${fmtCookies(nextAmount)}!`);
        playCoinSound();
        onWin(nextAmount);
      } else {
        setMsg('LEIDER FALSCH! ALLES VERLOREN!');
        setTimeout(() => {
          onLose();
        }, 1200);
      }
    }, 600);
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel gamble-panel" style={{ textAlign: 'center', maxWidth: '380px' }}>
        <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '10px' }}>
          🃏 2X RISIKO-SPIEL
        </h2>
        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.9rem', color: '#39ff14', marginBottom: '14px' }}>
          POT: {fmtCookies(currentAmount)} COOKIES
        </p>

        <div style={{
          width: '100px',
          height: '140px',
          margin: '0 auto 16px',
          background: card ? '#fff' : 'linear-gradient(135deg, #111, #2a2a2a)',
          border: '2px solid var(--accent)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: card ? (card.isRed ? '#e63946' : '#111') : 'var(--accent)',
          fontSize: '1.6rem',
          boxShadow: '0 0 16px rgba(255,215,0,0.3)',
          transition: 'transform 0.3s ease',
          transform: flipping ? 'rotateY(90deg)' : 'none',
        }}>
          {card ? (
            <>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{card.rank}</div>
              <div>{card.suit}</div>
            </>
          ) : (
            <span style={{ fontSize: '2rem' }}>🎴</span>
          )}
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--text)', marginBottom: '16px' }}>{msg}</p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <button
            className="btn"
            style={{ flex: 1, background: '#e63946', color: '#fff', fontSize: '0.55rem', padding: '10px' }}
            disabled={flipping}
            onClick={() => pickColor('red')}
          >
            🔴 ROT (♥ ♦)
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: '#222', border: '1px solid #777', color: '#fff', fontSize: '0.55rem', padding: '10px' }}
            disabled={flipping}
            onClick={() => pickColor('black')}
          >
            ⚫ SCHWARZ (♠ ♣)
          </button>
        </div>

        <button
          className="btn btn-outline"
          style={{ width: '100%', borderColor: '#39ff14', color: '#39ff14', fontSize: '0.55rem', padding: '8px' }}
          disabled={flipping}
          onClick={() => onCollect(currentAmount)}
        >
          💰 GEWINN NEHMEN ({fmtCookies(currentAmount)})
        </button>
      </div>
    </div>
  );
}

export default function SlotsPage() {
  const playerName = getLastName();
  const [cookies, setCookies] = useState(null);
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState([
    [SYMBOLS[4], SYMBOLS[5], SYMBOLS[6]],
    [SYMBOLS[3], SYMBOLS[4], SYMBOLS[5]],
    [SYMBOLS[2], SYMBOLS[3], SYMBOLS[4]],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [stats, setStats] = useState({ spins: 0, wins: 0, totalWon: 0, totalBet: 0, bestWin: 0 });
  const [message, setMessage] = useState(null);
  const [streak, setStreak] = useState(0); // Consecutive wins
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinTotalWon, setFreeSpinTotalWon] = useState(0);
  const [jackpotPool, setJackpotPool] = useState(88888);
  const [gambleAmount, setGambleAmount] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [anticipating, setAnticipating] = useState(false);

  const clickerRef = useRef(null);
  const spinningRef = useRef(false);
  const cookiesRef = useRef(null);
  const bestWinRef = useRef(0);

  // Load cookies and jackpot pool
  async function loadCookies() {
    if (!playerName) { setCookies(0); return; }
    const { data } = await loadGameState(playerName, 'clicker');
    clickerRef.current = data?.state ?? null;
    const bal = Math.floor(data?.state?.cookies ?? 0);
    setCookies(bal);
    cookiesRef.current = bal;

    try {
      const savedJackpot = localStorage.getItem('arcade_slot_jackpot');
      if (savedJackpot) setJackpotPool(Number(savedJackpot));
    } catch {}
  }

  async function saveCookies(nb) {
    if (!playerName || !clickerRef.current) return;
    const upd = { ...clickerRef.current, cookies: nb, lastSaved: Date.now() };
    clickerRef.current = upd;
    await saveGameState(playerName, 'clicker', upd);
    // Score sofort live anpassen!
    await insertScore(playerName, 'clicker', nb, { forceUpdate: true });
  }

  useEffect(() => { loadCookies(); }, []);

  // Multiplier from hot streak
  const streakMult = streak >= 5 ? 5.0 : streak >= 4 ? 3.0 : streak >= 3 ? 2.0 : streak >= 2 ? 1.5 : 1.0;

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);
  };

  const doSpin = useCallback(async () => {
    if (spinningRef.current) return;
    const bal = cookiesRef.current;
    const isFree = freeSpins > 0;
    const b = bet;

    if (!isFree && (bal === null || bal < b)) return;

    spinningRef.current = true;
    setSpinning(true);
    setMessage(null);
    setAnticipating(false);

    let nb = bal;
    if (!isFree) {
      nb = bal - b;
      setCookies(nb);
      cookiesRef.current = nb;
      await saveCookies(nb);
      // Jackpot wächst mit jedem Spin
      setJackpotPool(p => {
        const nextP = p + Math.floor(b * 0.15);
        try { localStorage.setItem('arcade_slot_jackpot', String(nextP)); } catch {}
        return nextP;
      });
    } else {
      setFreeSpins(fs => fs - 1);
    }

    const newReels = [pickReel(), pickReel(), pickReel()];

    // Anticipation check: Wenn Walze 1 und 2 zwei Jackpots oder Sterne haben
    const r1Jackpots = newReels[0].filter(s => s.id === 'jackpot' || s.id === 'star').length;
    const r2Jackpots = newReels[1].filter(s => s.id === 'jackpot' || s.id === 'star').length;
    const willAnticipate = r1Jackpots > 0 && r2Jackpots > 0;

    if (willAnticipate) {
      setTimeout(() => {
        setAnticipating(true);
        playAnticipationSound();
      }, turbo ? 250 : 600);
    }

    const spinDuration = turbo ? (willAnticipate ? 900 : 500) : (willAnticipate ? 2100 : 1400);

    setTimeout(() => playReelStopSound(0), spinDuration * 0.4);
    setTimeout(() => playReelStopSound(1), spinDuration * 0.7);

    setTimeout(async () => {
      playReelStopSound(2);
      spinningRef.current = false;
      setSpinning(false);
      setAnticipating(false);
      setReels(newReels);

      const win = checkWin(newReels);
      let won = win.total * b;

      // Free Spins Bonus Multiplier (2x)
      if (isFree) won *= 2;

      // Hot Streak Multiplier
      won = Math.floor(won * streakMult);

      // Check for progressive jackpot (3x 🍪 on middle payline)
      const hitJackpot = win.wonLines.some(l => l.lineIdx === 1 && l.symbol.id === 'jackpot');
      if (hitJackpot) {
        won += jackpotPool;
        setJackpotPool(50000);
        try { localStorage.setItem('arcade_slot_jackpot', '50000'); } catch {}
      }

      // Check for Free Spins trigger (3x ⭐ anywhere)
      const hitFreeSpins = win.wonLines.some(l => l.symbol.id === 'star');
      if (hitFreeSpins) {
        setFreeSpins(fs => fs + 10);
      }

      const fb = nb + won;
      setCookies(fb);
      cookiesRef.current = fb;
      await saveCookies(fb);

      if (won > bestWinRef.current) {
        bestWinRef.current = won;
        await insertScore(playerName, 'slots', won, { forceUpdate: true });
      }

      setStats(s => ({
        spins: s.spins + 1,
        wins: win.total > 0 ? s.wins + 1 : s.wins,
        totalWon: s.totalWon + won,
        totalBet: isFree ? s.totalBet : s.totalBet + b,
        bestWin: Math.max(s.bestWin, won),
      }));

      if (isFree && won > 0) {
        setFreeSpinTotalWon(t => t + won);
      }

      if (won > 0) {
        setStreak(st => st + 1);

        if (hitJackpot) {
          triggerShake();
          playJackpotSirens();
          setMessage({ text: `🍪 MEGA PROGRESSIVE JACKPOT!! +${fmtCookies(won)}! 🚨`, type: 'jackpot' });
        } else if (win.total >= 75 || won >= b * 30) {
          triggerShake();
          playBigWinSound();
          setMessage({ text: `🏆 MEGA WIN! +${fmtCookies(won)}!`, type: 'big' });
        } else {
          playWinChime();
          setMessage({ text: `GEWINN! +${fmtCookies(won)}${streakMult > 1 ? ` (x${streakMult} STREAK!)` : ''}`, type: 'win' });
        }

        if (hitFreeSpins) {
          setMessage(m => ({ ...m, text: (m?.text || '') + ' 🌟 +10 FREISPIELE!' }));
        }

        // Enable gamble opportunity if not in autoplay and won > 0
        if (!autoplay && won > 0) {
          setGambleAmount(won);
        }
      } else {
        setStreak(0);
        setMessage({ text: `-${fmtCookies(b)} — Kein Treffer`, type: 'loss' });
        setGambleAmount(null);
      }
    }, spinDuration);
  }, [bet, streakMult, freeSpins, jackpotPool, turbo, autoplay, streak]);

  // Autoplay loop
  useEffect(() => {
    if (!autoplay) return;
    const interval = turbo ? 1100 : 2500;
    const id = setInterval(() => { doSpin(); }, interval);
    return () => clearInterval(id);
  }, [autoplay, turbo, doSpin]);

  // Spacebar to spin
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === 'Space' && !spinning && !gambleAmount && (cookies >= bet || freeSpins > 0)) {
        e.preventDefault();
        doSpin();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spinning, gambleAmount, cookies, bet, freeSpins, doSpin]);

  // Quick Bet Options
  const betOptions = [10, 50, 100, 500, 1000, 5000];

  function handleAllIn() {
    if (cookies <= 0) return;
    setBet(cookies);
  }

  function handleDoubleBet() {
    setBet(b => Math.min(b * 2, cookies || b * 2));
  }

  function handleHalfBet() {
    setBet(b => Math.max(10, Math.floor(b / 2)));
  }

  if (cookies === null) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>LADE KASINO...</p>
      </div>
    );
  }

  return (
    <div className={`page-content slots-page ${screenShake ? 'screen-shake' : ''}`}>
      {/* Progressive Jackpot Ticker */}
      <div className="slot-jackpot-banner">
        <span className="jackpot-flame">🔥</span>
        <span className="jackpot-label">PROGRESSIVER JACKPOT:</span>
        <span className="jackpot-amount">{fmtCookies(jackpotPool)} COOKIES</span>
        <span className="jackpot-flame">🔥</span>
      </div>

      <div className="slots-header">
        <div>
          <h1 className="slots-title">🎰 KEKS-KASINO SLOTS</h1>
          {streak >= 2 && (
            <div className="slots-streak-badge">
              🔥 {streak}x GEWINN-SERIE &bull; x{streakMult} MULTIPLIER!
            </div>
          )}
          {freeSpins > 0 && (
            <div className="slots-freespin-badge">
              🌟 {freeSpins} FREISPIELE AKTIV &bull; 2X AUSZAHLUNG!
            </div>
          )}
        </div>

        <div className="slots-balance">
          <span style={{ color: 'var(--muted)', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)' }}>COOKIES</span>
          <span className="slots-balance-num">{fmtCookies(cookies)}</span>
        </div>
      </div>

      <div className={`slot-machine ${freeSpins > 0 ? 'slot-freespin-active' : ''}`}>
        <div className="slot-machine-top">✦ MORITZFREUND HIGH ROLLER ✦</div>

        <div className="slot-reels-wrap">
          {reels.map((reel, i) => (
            <Reel
              key={i}
              symbols={reel}
              spinning={spinning}
              spinDelay={turbo ? i * 80 : i * 160}
              finalSymbols={spinning ? null : reel}
              isAnticipating={anticipating && i === 2}
            />
          ))}
          <div className="slot-payline" />
        </div>

        <div className={`slot-result-msg ${message?.type || ''}`}>
          {message ? message.text : spinning ? (anticipating ? '⚡ SPANNUNG!!' : 'DREHT...') : 'DRUECKE LEERTASTE ODER DREHEN!'}
        </div>

        {/* Gamble Trigger Button nach Gewinn */}
        {gambleAmount && !spinning && (
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <button
              className="btn slot-gamble-btn"
              onClick={() => {}}
              style={{
                background: 'linear-gradient(135deg, #ffd700, #ff4444)',
                color: '#000',
                fontWeight: 'bold',
                fontFamily: 'var(--font-pixel)',
                fontSize: '0.55rem',
                padding: '8px 16px',
                borderRadius: '8px',
                boxShadow: '0 0 16px rgba(255, 68, 68, 0.6)',
              }}
              onClick={() => {}}
            >
              🃏 GEWINN VERDOPPELN ({fmtCookies(gambleAmount)})?
            </button>
          </div>
        )}

        {/* Einsatz-Auswahl */}
        <div className="slot-bet-row">
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--muted)' }}>EINSATZ:</span>
          <div className="slot-bet-btns">
            {betOptions.map(b => (
              <button
                key={b}
                className={`slot-bet-btn ${bet === b ? 'active' : ''}`}
                onClick={() => setBet(b)}
                disabled={spinning}
              >
                {fmtCookies(b)}
              </button>
            ))}
          </div>
        </div>

        {/* Schnellwahl: 1/2, 2X, MAX, ALL IN */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.42rem', minHeight: '24px' }} onClick={handleHalfBet} disabled={spinning}>
            ½ HALB
          </button>
          <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.42rem', minHeight: '24px' }} onClick={handleDoubleBet} disabled={spinning}>
            2X DOPPELT
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '3px 8px', fontSize: '0.42rem', minHeight: '24px', borderColor: '#ffd700', color: '#ffd700' }}
            onClick={() => setBet(Math.min(cookies || 1000, 50000))}
            disabled={spinning}
          >
            MAX
          </button>
          <button
            className="btn"
            style={{
              padding: '3px 10px',
              fontSize: '0.42rem',
              minHeight: '24px',
              background: 'linear-gradient(135deg, #ff4444, #ff8800)',
              color: '#fff',
              fontWeight: 'bold',
            }}
            onClick={handleAllIn}
            disabled={spinning || cookies <= 0}
          >
            💥 ALL IN!
          </button>
          <button
            className={`btn ${turbo ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 8px', fontSize: '0.42rem', minHeight: '24px' }}
            onClick={() => setTurbo(t => !t)}
            title="Schnellere Spins"
          >
            ⚡ TURBO {turbo ? 'AN' : 'AUS'}
          </button>
        </div>

        {/* Spin & Auto Buttons */}
        <div className="slot-action-row">
          <button
            className="btn btn-primary slot-spin-btn"
            onClick={doSpin}
            disabled={spinning || (cookies < bet && freeSpins <= 0)}
            id="slots-spin-btn"
          >
            {spinning ? 'DREHT...' : freeSpins > 0 ? `🌟 GRATIS-SPIN (${freeSpins})` : '🎰 DREHEN (LEERTASTE)'}
          </button>
          <button
            className={`btn ${autoplay ? 'btn-danger' : 'btn-outline'} slot-auto-btn`}
            onClick={() => setAutoplay(a => !a)}
            disabled={!autoplay && cookies < bet && freeSpins <= 0}
          >
            {autoplay ? '⏹ STOP AUTO' : '▶ AUTOPLAY'}
          </button>
        </div>

        {cookies < bet && freeSpins <= 0 && (
          <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-pixel)', fontSize: '0.42rem', textAlign: 'center', marginTop: 8 }}>
            ZU WENIG COOKIES! Klicke im Keks-Clicker neue Cookies oder verringere den Einsatz.
          </div>
        )}
      </div>

      {/* 2X Double or Nothing Gamble Modal */}
      {gambleAmount && (
        <GambleModal
          amount={gambleAmount}
          onCollect={async (finalAmount) => {
            const diff = finalAmount - gambleAmount;
            if (diff > 0) {
              const nb = cookiesRef.current + diff;
              setCookies(nb);
              cookiesRef.current = nb;
              await saveCookies(nb);
            }
            setGambleAmount(null);
          }}
          onWin={async (newAmount) => {
            setGambleAmount(newAmount);
          }}
          onLose={async () => {
            const nb = Math.max(0, cookiesRef.current - gambleAmount);
            setCookies(nb);
            cookiesRef.current = nb;
            await saveCookies(nb);
            setGambleAmount(null);
          }}
        />
      )}

      {/* Auszahlungstabelle */}
      <div className="slots-paytable">
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--accent)', marginBottom: 12 }}>
          AUSZAHLUNGSTABELLE (x EINSATZ)
        </div>
        <div className="slots-paytable-grid">
          {SYMBOLS.map(s => (
            <div key={s.id} className="paytable-row">
              <span className="paytable-sym">{s.emoji}{s.emoji}{s.emoji}</span>
              <span className="paytable-name">{s.name}</span>
              <span className="paytable-mult" style={{ color: s.payout >= 100 ? '#ffd700' : s.payout >= 40 ? '#90be6d' : 'var(--text)' }}>
                x{s.payout}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.48rem', color: 'var(--muted)', marginTop: 10 }}>
          5 GEWINNLINIEN &bull; 3x ⭐ = 10 FREISPIELE &bull; 3x 🍪 = PROGRESSIVER JACKPOT!
        </div>
      </div>

      {/* Statistiken */}
      <div className="slots-stats">
        {[
          { label: 'SPINS', value: stats.spins },
          { label: 'SIEGE', value: stats.wins },
          { label: 'BESTER WIN', value: fmtCookies(stats.bestWin), color: 'var(--accent)' },
          { label: 'GEWONNEN', value: fmtCookies(stats.totalWon) },
          { label: 'GESETZT', value: fmtCookies(stats.totalBet) },
          { label: 'BILANZ', value: fmtCookies(stats.totalWon - stats.totalBet), color: stats.totalWon >= stats.totalBet ? '#90be6d' : '#f94144' },
        ].map(s => (
          <div key={s.label} className="slots-stat-item">
            <span style={{ color: 'var(--muted)', fontSize: '0.4rem', fontFamily: 'var(--font-pixel)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem', color: s.color || 'var(--accent)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
