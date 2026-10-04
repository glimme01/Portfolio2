import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getActivePlayerName } from '../../lib/auth.js';
import { fmtCookies } from '../clicker/clickerLogic.js';
import { insertScore, getPlayerScores } from '../../lib/scores.js';
import CurrencyExchangeModal from '../../components/CurrencyExchangeModal.jsx';
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

const CURRENCIES = {
  cookies: {
    id: 'cookies',
    name: 'COOKIES',
    icon: '🍪',
    minBet: 10,
    defaultBet: 50,
    presets: [10, 50, 100, 500, 1000, 5000, 25000, 100000],
    jackpotDefault: 88888,
    jackpotGrowth: 0.15,
    format: (v) => fmtCookies(v),
  },
  heavenlyChips: {
    id: 'heavenlyChips',
    name: 'HIMMELS-CHIPS',
    icon: '✨',
    minBet: 1,
    defaultBet: 2,
    presets: [1, 2, 5, 10, 25, 50, 100],
    jackpotDefault: 50,
    jackpotGrowth: 0.1,
    format: (v) => Number(v || 0).toLocaleString('de-DE'),
  },
  gems: {
    id: 'gems',
    name: 'DIAMANTEN (VIP)',
    icon: '💎',
    minBet: 1,
    defaultBet: 5,
    presets: [1, 2, 5, 10, 20, 50, 100],
    jackpotDefault: 200,
    jackpotGrowth: 0.1,
    format: (v) => Number(v || 0).toLocaleString('de-DE'),
  },
};

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
function GambleModal({ amount, currency, onCollect, onWin, onLose }) {
  const [currentAmount, setCurrentAmount] = useState(amount);
  const [card, setCard] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [msg, setMsg] = useState('WÄHLE ROT ODER SCHWARZ!');

  const curr = CURRENCIES[currency] || CURRENCIES.cookies;

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
        setMsg(`RICHTIG! VERDOPPELT AUF ${curr.format(nextAmount)} ${curr.icon}!`);
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
          POT: {curr.format(currentAmount)} {curr.icon} {curr.name}
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
          💰 GEWINN NEHMEN ({curr.format(currentAmount)} {curr.icon})
        </button>
      </div>
    </div>
  );
}

export default function SlotsPage() {
  const playerName = getActivePlayerName();
  const [activeCurrency, setActiveCurrency] = useState('cookies');
  const [playerState, setPlayerState] = useState(null);
  const [bet, setBet] = useState(50);
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
  const [streak, setStreak] = useState(0);
  const [freeSpins, setFreeSpins] = useState(0);
  const [freeSpinTotalWon, setFreeSpinTotalWon] = useState(0);
  const [jackpotPools, setJackpotPools] = useState({
    cookies: 88888,
    heavenlyChips: 50,
    gems: 200,
  });
  const [gambleAmount, setGambleAmount] = useState(null);
  const [isGambleOpen, setIsGambleOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [anticipating, setAnticipating] = useState(false);

  const clickerRef = useRef(null);
  const spinningRef = useRef(false);
  const bestWinRef = useRef(0);

  const curr = CURRENCIES[activeCurrency] || CURRENCIES.cookies;
  const currentBalance = playerState ? Math.floor(playerState[activeCurrency] ?? 0) : 0;

  // Lade Spielstand & Jackpots
  async function loadData() {
    const { data } = await loadGameState(playerName, 'clicker');
    let state = data?.state;
    if (!state) {
      state = { cookies: 250, totalCookies: 250, heavenlyChips: 0, gems: 10, buildings: {}, upgrades: [] };
      await saveGameState(playerName, 'clicker', state);
    }
    if (state.gems === undefined) state.gems = 10;
    clickerRef.current = state;
    setPlayerState({ ...state });

    try {
      const savedJackpotCookies = localStorage.getItem('arcade_slot_jackpot_cookies');
      const savedJackpotChips = localStorage.getItem('arcade_slot_jackpot_chips');
      const savedJackpotGems = localStorage.getItem('arcade_slot_jackpot_gems');
      setJackpotPools({
        cookies: savedJackpotCookies ? Number(savedJackpotCookies) : 88888,
        heavenlyChips: savedJackpotChips ? Number(savedJackpotChips) : 50,
        gems: savedJackpotGems ? Number(savedJackpotGems) : 200,
      });

      const sc = await getPlayerScores(playerName);
      if (sc?.slots > 0) {
        bestWinRef.current = sc.slots;
        setStats(s => ({ ...s, bestWin: sc.slots }));
      }
    } catch {}
  }

  async function persistPlayerState(newState) {
    clickerRef.current = newState;
    setPlayerState({ ...newState });
    await saveGameState(playerName, 'clicker', newState);
    if (newState.cookies !== undefined) {
      await insertScore(playerName, 'clicker', newState.cookies, { forceUpdate: true });
    }
  }

  useEffect(() => { loadData(); }, [playerName]);

  // Live Sync empfangen
  useEffect(() => {
    function onCookiesSynced(e) {
      if (e?.detail && !spinningRef.current) {
        setPlayerState(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          if (e.detail.cookies !== undefined) next.cookies = Math.floor(e.detail.cookies);
          if (e.detail.heavenlyChips !== undefined) next.heavenlyChips = Math.floor(e.detail.heavenlyChips);
          if (e.detail.gems !== undefined) next.gems = Math.floor(e.detail.gems);
          clickerRef.current = next;
          return next;
        });
      }
    }
    window.addEventListener('arcade-cookies-synced', onCookiesSynced);
    return () => window.removeEventListener('arcade-cookies-synced', onCookiesSynced);
  }, []);

  // Währung wechseln
  function handleSelectCurrency(currId) {
    if (spinning) return;
    setActiveCurrency(currId);
    const targetConfig = CURRENCIES[currId];
    const bal = playerState ? Math.floor(playerState[currId] ?? 0) : 0;
    setBet(Math.min(targetConfig.defaultBet, Math.max(targetConfig.minBet, bal || targetConfig.minBet)));
    setMessage(null);
    setGambleAmount(null);
    setIsGambleOpen(false);
  }

  // Multiplier from hot streak
  const streakMult = streak >= 5 ? 5.0 : streak >= 4 ? 3.0 : streak >= 3 ? 2.0 : streak >= 2 ? 1.5 : 1.0;

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);
  };

  const doSpin = useCallback(async () => {
    if (spinningRef.current) return;
    const curState = clickerRef.current;
    if (!curState) return;

    const isFree = freeSpins > 0;
    const b = Number(bet);
    const bal = Math.floor(curState[activeCurrency] ?? 0);

    if (!isFree && (bal < b || b <= 0)) return;

    spinningRef.current = true;
    setSpinning(true);
    setMessage(null);
    setAnticipating(false);
    setGambleAmount(null);
    setIsGambleOpen(false);

    let nextBal = bal;
    if (!isFree) {
      nextBal = bal - b;
      const updated = { ...curState, [activeCurrency]: nextBal, lastSaved: Date.now() };
      await persistPlayerState(updated);

      // Jackpot wächst
      setJackpotPools(prev => {
        const growth = Math.max(1, Math.floor(b * curr.jackpotGrowth));
        const nextPool = (prev[activeCurrency] || curr.jackpotDefault) + growth;
        try { localStorage.setItem(`arcade_slot_jackpot_${activeCurrency}`, String(nextPool)); } catch {}
        return { ...prev, [activeCurrency]: nextPool };
      });
    } else {
      setFreeSpins(fs => fs - 1);
    }

    const newReels = [pickReel(), pickReel(), pickReel()];

    // Anticipation check: Wenn Walze 1 und 2 Jackpot- oder Stern-Symbole haben
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

      // Progressive Jackpot (3x 🍪 auf mittlerer Gewinnlinie)
      const currentJackpot = jackpotPools[activeCurrency] || curr.jackpotDefault;
      const hitJackpot = win.wonLines.some(l => l.lineIdx === 1 && l.symbol.id === 'jackpot');
      if (hitJackpot) {
        won += currentJackpot;
        setJackpotPools(p => ({ ...p, [activeCurrency]: curr.jackpotDefault }));
        try { localStorage.setItem(`arcade_slot_jackpot_${activeCurrency}`, String(curr.jackpotDefault)); } catch {}
      }

      // Free Spins trigger (3x ⭐ irgendwo)
      const hitFreeSpins = win.wonLines.some(l => l.symbol.id === 'star');
      if (hitFreeSpins) {
        setFreeSpins(fs => fs + 10);
      }

      const finalBal = nextBal + won;
      const nextUpdated = { ...clickerRef.current, [activeCurrency]: finalBal, lastSaved: Date.now() };
      if (activeCurrency === 'cookies') {
        nextUpdated.totalCookies = Math.max(nextUpdated.totalCookies || 0, finalBal);
      }
      await persistPlayerState(nextUpdated);

      if (won > bestWinRef.current) {
        bestWinRef.current = won;
        await insertScore(playerName, 'slots', won);
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
          setMessage({ text: `🚨 MEGA PROGRESSIVER JACKPOT!! +${curr.format(won)} ${curr.icon}! 🚨`, type: 'jackpot' });
        } else if (win.total >= 75 || won >= b * 30) {
          triggerShake();
          playBigWinSound();
          setMessage({ text: `🏆 MEGA WIN! +${curr.format(won)} ${curr.icon}!`, type: 'big' });
        } else {
          playWinChime();
          setMessage({ text: `GEWINN! +${curr.format(won)} ${curr.icon}${streakMult > 1 ? ` (x${streakMult} STREAK!)` : ''}`, type: 'win' });
        }

        if (hitFreeSpins) {
          setMessage(m => ({ ...m, text: (m?.text || '') + ' 🌟 +10 FREISPIELE!' }));
        }

        // Enable gamble opportunity if not in autoplay
        if (!autoplay && won > 0) {
          setGambleAmount(won);
        }
      } else {
        setStreak(0);
        setMessage({ text: `-${curr.format(b)} ${curr.icon} — Kein Treffer`, type: 'loss' });
        setGambleAmount(null);
      }
    }, spinDuration);
  }, [bet, streakMult, freeSpins, jackpotPools, activeCurrency, curr, turbo, autoplay, streak]);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    const interval = turbo ? 1100 : 2500;
    const id = setInterval(() => { doSpin(); }, interval);
    return () => clearInterval(id);
  }, [autoplay, turbo, doSpin]);

  // Spacebar to spin
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === 'Space' && !spinning && !isGambleOpen && !exchangeOpen && (currentBalance >= bet || freeSpins > 0)) {
        e.preventDefault();
        doSpin();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spinning, isGambleOpen, exchangeOpen, currentBalance, bet, freeSpins, doSpin]);

  // Custom Amount Stepper & Modifiers
  function stepBet(delta) {
    if (spinning) return;
    setBet(b => {
      const step = activeCurrency === 'cookies' ? (delta > 0 ? 50 : -50) : (delta > 0 ? 1 : -1);
      const next = Math.max(1, (Number(b) || 0) + step);
      return Math.min(next, currentBalance > 0 ? currentBalance : next);
    });
  }

  function handleCustomBetChange(val) {
    if (spinning) return;
    if (val === '') {
      setBet('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setBet(Math.max(1, num));
    }
  }

  function handleHalfBet() {
    if (spinning) return;
    setBet(b => Math.max(1, Math.floor((Number(b) || 2) / 2)));
  }

  function handleDoubleBet() {
    if (spinning) return;
    setBet(b => {
      const dbl = (Number(b) || 1) * 2;
      return currentBalance > 0 ? Math.min(dbl, currentBalance) : dbl;
    });
  }

  function handleMaxBet() {
    if (spinning || currentBalance <= 0) return;
    const cap = activeCurrency === 'cookies' ? 500000 : 500;
    setBet(Math.min(currentBalance, cap));
  }

  function handleAllIn() {
    if (spinning || currentBalance <= 0) return;
    setBet(currentBalance);
  }

  if (!playerState) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>LADE KASINO...</p>
      </div>
    );
  }

  const currentJackpot = jackpotPools[activeCurrency] || curr.jackpotDefault;

  return (
    <div className={`page-content slots-page ${screenShake ? 'screen-shake' : ''}`}>
      {/* Progressive Jackpot Ticker */}
      <div className="slot-jackpot-banner">
        <span className="jackpot-flame">🔥</span>
        <span className="jackpot-label">PROGRESSIVER JACKPOT ({curr.name}):</span>
        <span className="jackpot-amount">{curr.format(currentJackpot)} {curr.icon}</span>
        <span className="jackpot-flame">🔥</span>
      </div>

      {/* Währungs-Umschalter & Wechselstube */}
      <div className="currency-selector-bar">
        <div className="currency-tabs">
          {Object.values(CURRENCIES).map(c => {
            const bal = Math.floor(playerState[c.id] ?? 0);
            return (
              <button
                key={c.id}
                className={`currency-tab-btn ${activeCurrency === c.id ? 'active' : ''}`}
                onClick={() => handleSelectCurrency(c.id)}
                disabled={spinning}
              >
                <span className="curr-icon">{c.icon}</span>
                <span className="curr-name">{c.name}</span>
                <span className="curr-bal">({c.format(bal)})</span>
              </button>
            );
          })}
        </div>
        <button
          className="btn btn-outline currency-exchange-btn"
          onClick={() => setExchangeOpen(true)}
          title="Cookies, Diamanten und Chips tauschen"
        >
          💱 WECHSELSTUBE
        </button>
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
          <span style={{ color: 'var(--muted)', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)' }}>
            GUTHABEN ({curr.name})
          </span>
          <span className="slots-balance-num" style={{ color: activeCurrency === 'gems' ? '#00e5ff' : activeCurrency === 'heavenlyChips' ? '#ffd700' : 'var(--accent)' }}>
            {curr.icon} {curr.format(currentBalance)}
          </span>
        </div>
      </div>

      <div className={`slot-machine ${freeSpins > 0 ? 'slot-freespin-active' : ''}`}>
        <div className="slot-machine-top">✦ MORITZFREUND HIGH ROLLER &bull; {curr.name} ✦</div>

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
          {message ? message.text : spinning ? (anticipating ? '⚡ SPANNUNG!!' : 'DREHT...') : 'DRÜCKE LEERTASTE ODER DREHEN!'}
        </div>

        {/* Gamble Trigger Button nach Gewinn */}
        {gambleAmount && !spinning && !isGambleOpen && (
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <button
              className="btn slot-gamble-btn"
              onClick={() => setIsGambleOpen(true)}
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
            >
              🃏 GEWINN VERDOPPELN ({curr.format(gambleAmount)} {curr.icon})?
            </button>
          </div>
        )}

        {/* NEUES CUSTOM-EINSATZ SYSTEM */}
        <div className="custom-bet-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.48rem', color: 'var(--muted)' }}>
              EINSATZ WÄHLEN ODER EINTIPPEN:
            </span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--accent)' }}>
              {curr.icon} {curr.name}
            </span>
          </div>

          {/* Zahlen-Eingabefeld mit [-] und [+] */}
          <div className="custom-bet-input-row">
            <button
              className="btn bet-step-btn"
              onClick={() => stepBet(-1)}
              disabled={spinning}
              title="Einsatz verringern"
            >
              -
            </button>
            <input
              type="number"
              className="custom-bet-input"
              value={bet}
              min="1"
              max={currentBalance > 0 ? currentBalance : undefined}
              onChange={(e) => handleCustomBetChange(e.target.value)}
              onBlur={() => {
                if (!bet || Number(bet) < 1) setBet(1);
                else if (currentBalance > 0 && Number(bet) > currentBalance) setBet(currentBalance);
              }}
              disabled={spinning}
              placeholder="Einsatz..."
            />
            <button
              className="btn bet-step-btn"
              onClick={() => stepBet(1)}
              disabled={spinning}
              title="Einsatz erhöhen"
            >
              +
            </button>
          </div>

          {/* Schnell-Chips */}
          <div className="slot-bet-btns" style={{ marginBottom: '10px' }}>
            {curr.presets.map(p => (
              <button
                key={p}
                className={`slot-bet-btn ${Number(bet) === p ? 'active' : ''}`}
                onClick={() => setBet(p)}
                disabled={spinning}
              >
                {curr.icon} {curr.format(p)}
              </button>
            ))}
          </div>

          {/* Modifikatoren: HALB, 2X, MAX, ALL IN */}
          <div className="bet-modifiers">
            <button className="btn btn-outline" onClick={handleHalfBet} disabled={spinning}>
              ½ HALB
            </button>
            <button className="btn btn-outline" onClick={handleDoubleBet} disabled={spinning}>
              2X DOPPELT
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={handleMaxBet} disabled={spinning || currentBalance <= 0}>
              MAX
            </button>
            <button className="btn btn-allin" onClick={handleAllIn} disabled={spinning || currentBalance <= 0}>
              💥 ALL IN!
            </button>
            <button
              className={`btn ${turbo ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTurbo(t => !t)}
              title="Schnellere Spins"
            >
              ⚡ TURBO {turbo ? 'AN' : 'AUS'}
            </button>
          </div>
        </div>

        {/* Spin & Auto Buttons */}
        <div className="slot-action-row">
          <button
            className="btn btn-primary slot-spin-btn"
            onClick={doSpin}
            disabled={spinning || (currentBalance < bet && freeSpins <= 0)}
            id="slots-spin-btn"
          >
            {spinning ? 'DREHT...' : freeSpins > 0 ? `🌟 GRATIS-SPIN (${freeSpins})` : `🎰 DREHEN (${curr.format(bet)} ${curr.icon})`}
          </button>
          <button
            className={`btn ${autoplay ? 'btn-danger' : 'btn-outline'} slot-auto-btn`}
            onClick={() => setAutoplay(a => !a)}
            disabled={!autoplay && currentBalance < bet && freeSpins <= 0}
          >
            {autoplay ? '⏹ STOP AUTO' : '▶ AUTOPLAY'}
          </button>
        </div>

        {currentBalance < bet && freeSpins <= 0 && (
          <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', textAlign: 'center', marginTop: 10 }}>
            ZU WENIG {curr.name}! Wechsle in der Wechselstube Währung oder verringere den Einsatz.
          </div>
        )}
      </div>

      {/* 2X Double or Nothing Gamble Modal */}
      {isGambleOpen && gambleAmount && (
        <GambleModal
          amount={gambleAmount}
          currency={activeCurrency}
          onCollect={async (finalAmount) => {
            const diff = finalAmount - gambleAmount;
            if (diff > 0) {
              const nb = (playerState[activeCurrency] || 0) + diff;
              await persistPlayerState({ ...playerState, [activeCurrency]: nb });
            }
            setGambleAmount(null);
            setIsGambleOpen(false);
          }}
          onWin={async (newAmount) => {
            setGambleAmount(newAmount);
          }}
          onLose={async () => {
            const nb = Math.max(0, (playerState[activeCurrency] || 0) - gambleAmount);
            await persistPlayerState({ ...playerState, [activeCurrency]: nb });
            setGambleAmount(null);
            setIsGambleOpen(false);
          }}
        />
      )}

      {/* Währungs-Wechselstube Modal */}
      <CurrencyExchangeModal
        isOpen={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        state={playerState}
        onExchange={persistPlayerState}
      />

      {/* Auszahlungstabelle */}
      <div className="slots-paytable">
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--accent)', marginBottom: 12 }}>
          AUSZAHLUNGSTABELLE (x EINSATZ) &bull; AUSZAHLUNG IN {curr.name}
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
          { label: 'BESTER WIN', value: `${curr.format(stats.bestWin)} ${curr.icon}`, color: 'var(--accent)' },
          { label: 'GEWONNEN', value: `${curr.format(stats.totalWon)} ${curr.icon}` },
          { label: 'GESETZT', value: `${curr.format(stats.totalBet)} ${curr.icon}` },
          { label: 'BILANZ', value: `${curr.format(stats.totalWon - stats.totalBet)} ${curr.icon}`, color: stats.totalWon >= stats.totalBet ? '#90be6d' : '#f94144' },
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
