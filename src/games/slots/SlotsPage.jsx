import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  { id: 'jackpot', emoji: '🍪', name: 'JACKPOT', weight: 2, payout: 250 },
  { id: 'star', emoji: '⭐', name: 'BONUS STERN', weight: 4, payout: 100, isScatter: true },
  { id: 'wild', emoji: '🃏', name: 'WILD JOKER', weight: 6, payout: 80, isWild: true },
  { id: 'gold', emoji: '🏆', name: 'TROPHÄE', weight: 7, payout: 40 },
  { id: 'seven', emoji: '7️⃣', name: 'GLÜCKS-7', weight: 9, payout: 25 },
  { id: 'cherry', emoji: '🍒', name: 'KIRSCHE', weight: 14, payout: 15 },
  { id: 'lemon', emoji: '🍋', name: 'ZITRONE', weight: 16, payout: 10 },
  { id: 'melon', emoji: '🍈', name: 'MELONE', weight: 18, payout: 7 },
  { id: 'bar', emoji: '📊', name: 'BAR', weight: 20, payout: 5 },
];

const PAYLINES = [
  { id: 0, name: 'Obere Reihe', coords: [[0,0], [1,0], [2,0]] },
  { id: 1, name: 'Mittlere Reihe', coords: [[0,1], [1,1], [2,1]] },
  { id: 2, name: 'Untere Reihe', coords: [[0,2], [1,2], [2,2]] },
  { id: 3, name: 'Diagonale Runter', coords: [[0,0], [1,1], [2,2]] },
  { id: 4, name: 'Diagonale Hoch', coords: [[0,2], [1,1], [2,0]] },
  { id: 5, name: 'V-Form', coords: [[0,0], [1,1], [2,0]] },
  { id: 6, name: 'Dach-Form', coords: [[0,2], [1,1], [2,2]] },
];

const WEIGHTED_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
function pickSymbol() { return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)]; }
function pickReel() { return Array.from({ length: 3 }, pickSymbol); }

function checkWin(reels) {
  let total = 0;
  const wonLines = [];
  const winningCells = new Set();

  // 1. 7 Gewinnlinien prüfen (mit Wild-Joker & 2er-Treffern)
  PAYLINES.forEach((line) => {
    const [c0, c1, c2] = line.coords;
    const s0 = reels[c0[0]][c0[1]];
    const s1 = reels[c1[0]][c1[1]];
    const s2 = reels[c2[0]][c2[1]];

    // 3-of-a-kind (unter Berücksichtigung von Wilds)
    const nonWilds3 = [s0, s1, s2].filter(s => !s.isWild);
    const is3Match = nonWilds3.length === 0 || nonWilds3.every(s => s.id === nonWilds3[0].id);

    if (is3Match) {
      const targetSymbol = nonWilds3[0] || s0;
      const payout = targetSymbol.payout;
      total += payout;
      wonLines.push({
        lineIdx: line.id,
        name: line.name,
        type: '3-match',
        symbol: targetSymbol,
        payout,
        coords: line.coords,
      });
      line.coords.forEach(([c, r]) => winningCells.add(`${c}-${r}`));
      return;
    }

    // 2-of-a-kind von links nach rechts:
    // Klassische Kasino-Regel: Nur Kirschen (🍒) und Wild Joker (🃏) zahlen bei 2er-Treffern.
    // Alle anderen Früchte/Symbole benötigen einen vollen 3er-Treffer auf einer Gewinnlinie.
    // Dadurch verliert man realistisch bei ~60% der Spins ("hin und wieder verlieren"),
    // während Gewinne spannend bleiben und sich echt verdient anfühlen!
    const nonWilds2 = [s0, s1].filter(s => !s.isWild);
    const is2Match = nonWilds2.length === 0 || nonWilds2.length === 1 || s0.id === s1.id;

    if (is2Match) {
      const targetSymbol = nonWilds2[0] || s0;
      if (targetSymbol.id === 'cherry' || targetSymbol.isWild) {
        const payout = 2; // 2x Kirsche zahlt x2
        total += payout;
        wonLines.push({
          lineIdx: line.id,
          name: line.name,
          type: '2-match',
          symbol: targetSymbol,
          payout,
          coords: [c0, c1],
        });
        winningCells.add(`${c0[0]}-${c0[1]}`);
        winningCells.add(`${c1[0]}-${c1[1]}`);
      }
    }
  });

  // 2. Scatter Sterne (⭐) überall auf dem 3x3 Raster
  let starCount = 0;
  const starCoords = [];
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      if (reels[c][r].id === 'star') {
        starCount++;
        starCoords.push([c, r]);
      }
    }
  }

  let scatterFreeSpins = 0;
  let scatterPayout = 0;
  if (starCount >= 2) {
    starCoords.forEach(([c, r]) => winningCells.add(`${c}-${r}`));
    if (starCount === 2) {
      scatterFreeSpins = 5;
      scatterPayout = 5;
    } else if (starCount === 3) {
      scatterFreeSpins = 12;
      scatterPayout = 20;
    } else {
      scatterFreeSpins = 25;
      scatterPayout = 50;
    }
    total += scatterPayout;
  }

  return {
    total,
    wonLines,
    winningCells,
    starCount,
    scatterFreeSpins,
    scatterPayout,
  };
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

function Reel({ reelIndex, symbols, spinning, spinDelay, finalSymbols, isAnticipating, winningCells }) {
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
      {displayed.map((sym, i) => {
        const isWin = !spinning && winningCells?.has(`${reelIndex}-${i}`);
        return (
          <div
            key={i}
            className={`slot-cell ${isWin ? 'win-cell' : ''}`}
          >
            <span
              className="slot-symbol"
              style={isWin ? {
                textShadow: '0 0 16px #ffd700, 0 0 24px #ff9e00',
                transform: 'scale(1.15)',
                display: 'inline-block',
                transition: 'transform 0.2s',
              } : {}}
            >
              {sym.emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 🏆 Big Win & Jackpot Celebration Overlay (Portal auf document.body, perfekt zentriert ohne Teleportation)
function BigWinModal({ type, won, currency, onClose }) {
  const curr = CURRENCIES[currency] || CURRENCIES.cookies;
  const isJackpot = type === 'jackpot';
  const isMega = type === 'mega' || isJackpot;
  const cardVariantClass = isJackpot ? 'is-jackpot' : isMega ? 'is-mega' : 'is-big';

  const modalNode = (
    <div
      className="big-win-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`big-win-card ${cardVariantClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '3.2rem', marginBottom: '8px', lineHeight: 1.2 }}>
          {isJackpot ? '🚨 🍪 🚨' : isMega ? '💥 🏆 💥' : '✨ 🌟 ✨'}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '1.05rem',
          color: isJackpot ? '#ffd700' : isMega ? '#ff3b81' : '#00f2fe',
          textShadow: '0 0 20px currentColor',
          marginBottom: '10px',
          letterSpacing: '1.5px',
        }}>
          {isJackpot ? 'MEGA PROGRESSIVER JACKPOT!' : isMega ? 'ULTRA MEGA GEWINN!' : 'GROSSER GEWINN!'}
        </h2>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '1.4rem',
          color: '#39ff14',
          textShadow: '0 0 24px rgba(57,255,20,0.8)',
          margin: '18px 0',
          fontWeight: 'bold',
        }}>
          +{curr.format(won)} {curr.icon}
        </div>
        <p style={{ fontSize: '0.72rem', color: '#ccc', marginBottom: '22px' }}>
          {isJackpot ? 'UNGLAUBLICH! Du hast den gesamten Jackpot geknackt!' : 'Wahnsinn! Die Keks-Walzen haben geglüht!'}
        </p>
        <button
          className="btn btn-primary"
          style={{
            fontSize: '0.65rem',
            padding: '12px 26px',
            background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
            color: '#000',
            fontWeight: 'bold',
            boxShadow: '0 0 25px rgba(255,215,0,0.8)',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          💰 KASSIEREN & WEITERDREHEN!
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}

// 🃏 Double-or-Nothing Gamble Mini-Game (Portal auf document.body)
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

  const modalNode = (
    <div className="overlay-backdrop" style={{ zIndex: 99999 }} role="dialog" aria-modal="true">
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

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}

export default function SlotsPage({ embedded = false }) {
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
    gems: 200,
  });
  const [gambleAmount, setGambleAmount] = useState(null);
  const [isGambleOpen, setIsGambleOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [anticipating, setAnticipating] = useState(false);
  const [winningCells, setWinningCells] = useState(new Set());
  const [bigWinOverlay, setBigWinOverlay] = useState(null);

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
      state = { cookies: 250, totalCookies: 250, gems: 10, buildings: {}, upgrades: [] };
      await saveGameState(playerName, 'clicker', state);
    }
    if (state.gems === undefined) state.gems = 10;
    clickerRef.current = state;
    setPlayerState({ ...state });

    try {
      const savedJackpotCookies = localStorage.getItem('arcade_slot_jackpot_cookies');
      const savedJackpotGems = localStorage.getItem('arcade_slot_jackpot_gems');
      setJackpotPools({
        cookies: savedJackpotCookies ? Number(savedJackpotCookies) : 88888,
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
      if (e?.detail?.playerName && playerName && e.detail.playerName.toLowerCase() !== playerName.toLowerCase()) {
        return;
      }
      if (e?.detail && !spinningRef.current) {
        setPlayerState(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          if (e.detail.cookies !== undefined) next.cookies = Math.floor(e.detail.cookies);
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

  // Multiplier from hot streak (Bis zu 7x!)
  const streakMult = streak >= 5 ? 7.0 : streak >= 4 ? 4.0 : streak >= 3 ? 2.5 : streak >= 2 ? 1.5 : 1.0;

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
    setWinningCells(new Set());

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

    // Anticipation check: Wenn Walze 1 und 2 zwei Jackpots, Sterne oder Wilds haben, oder zwei übereinstimmende Symbole
    const willAnticipate = PAYLINES.some(line => {
      const s0 = newReels[0][line.coords[0][1]];
      const s1 = newReels[1][line.coords[1][1]];
      return (s0.id === s1.id || s0.isWild || s1.isWild) && (['jackpot', 'star', 'wild', 'gold', 'seven'].includes(s0.id) || ['jackpot', 'star', 'wild', 'gold', 'seven'].includes(s1.id));
    });

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
      setWinningCells(win.winningCells);
      let won = win.total * b;

      // Free Spins Bonus Multiplier (3x Auszahlung für maximalen Thrill!)
      if (isFree) won *= 3;

      // Hot Streak Multiplier
      won = Math.floor(won * streakMult);

      // VIP Glücksklee (+5% Casino-Gewinn)
      const hasLuckyCharm = Boolean(clickerRef.current?.vipLuckyCharm);
      if (won > 0 && hasLuckyCharm) {
        won = Math.floor(won * 1.05);
      }

      // Progressive Jackpot (3x 🍪 auf mittlerer Gewinnlinie)
      const currentJackpot = jackpotPools[activeCurrency] || curr.jackpotDefault;
      const hitJackpot = win.wonLines.some(l => l.lineIdx === 1 && l.symbol.id === 'jackpot' && l.type === '3-match');
      if (hitJackpot) {
        won += currentJackpot;
        setJackpotPools(p => ({ ...p, [activeCurrency]: curr.jackpotDefault }));
        try { localStorage.setItem(`arcade_slot_jackpot_${activeCurrency}`, String(curr.jackpotDefault)); } catch {}
      }

      // Scatter Free Spins trigger (2+ ⭐)
      if (win.scatterFreeSpins > 0) {
        setFreeSpins(fs => fs + win.scatterFreeSpins);
      }

      let finalBal = nextBal + won;
      let insuranceRefund = 0;
      let insuranceLeft = clickerRef.current?.casinoInsuranceCharges || 0;

      // Casino Verlust-Versicherung bei Verlust (25%, max 50.000)
      if (won === 0 && !isFree && insuranceLeft > 0) {
        insuranceRefund = Math.min(50000, Math.floor(b * 0.25));
        finalBal += insuranceRefund;
        insuranceLeft -= 1;
      }

      const nextUpdated = {
        ...clickerRef.current,
        [activeCurrency]: finalBal,
        casinoInsuranceCharges: insuranceLeft,
        lastSaved: Date.now(),
      };
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
          setBigWinOverlay({ type: 'jackpot', won });
        } else if (won >= b * 25 || win.total >= 40) {
          triggerShake();
          playBigWinSound();
          setMessage({ text: `🏆 MEGA WIN! +${curr.format(won)} ${curr.icon}!${hasLuckyCharm ? ' (🍀 VIP +5%)' : ''}`, type: 'big' });
          setBigWinOverlay({ type: 'mega', won });
        } else if (won >= b * 10) {
          triggerShake();
          playBigWinSound();
          setMessage({ text: `🌟 BIG WIN! +${curr.format(won)} ${curr.icon}!${hasLuckyCharm ? ' (🍀 VIP +5%)' : ''}`, type: 'big' });
          setBigWinOverlay({ type: 'big', won });
        } else {
          playWinChime();
          const lineText = win.wonLines.length > 1 ? ` (${win.wonLines.length} LINIEN-COMBO!)` : '';
          setMessage({ text: `🎉 GEWINN! +${curr.format(won)} ${curr.icon}${lineText}${streakMult > 1 ? ` (x${streakMult} STREAK!)` : ''}${hasLuckyCharm ? ' (🍀 VIP +5%)' : ''}`, type: 'win' });
        }

        if (win.scatterFreeSpins > 0) {
          setMessage(m => ({ ...m, text: (m?.text || '') + ` 🌟 +${win.scatterFreeSpins} FREISPIELE!` }));
        }

        // Enable gamble opportunity if not in autoplay
        if (!autoplay && won > 0) {
          setGambleAmount(won);
        }
      } else {
        setStreak(0);
        if (insuranceRefund > 0) {
          setMessage({ text: `-${curr.format(b)} ${curr.icon} (🛡️ VERSICHERUNG: +${curr.format(insuranceRefund)} erstattet! Noch ${insuranceLeft}x Ladungen)`, type: 'loss' });
        } else {
          setMessage({ text: `-${curr.format(b)} ${curr.icon} — Kein Treffer`, type: 'loss' });
        }
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
    <div className={`page-content slots-page ${embedded ? 'embedded-game' : ''}`} style={embedded ? { padding: '8px 0', maxWidth: '100%', minHeight: 'auto' } : {}}>
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
              🌟 {freeSpins} FREISPIELE AKTIV &bull; 3X AUSZAHLUNG!
            </div>
          )}
        </div>

        <div className="slots-balance">
          <span style={{ color: 'var(--muted)', fontSize: '0.45rem', fontFamily: 'var(--font-pixel)' }}>
            GUTHABEN ({curr.name})
          </span>
          <span className="slots-balance-num" style={{ color: activeCurrency === 'gems' ? '#00e5ff' : 'var(--accent)' }}>
            {curr.icon} {curr.format(currentBalance)}
          </span>
        </div>
      </div>

      <div className={`slot-machine ${freeSpins > 0 ? 'slot-freespin-active' : ''} ${screenShake ? 'screen-shake' : ''}`}>
        <div className="slot-machine-top">✦ MORITZFREUND HIGH ROLLER &bull; {curr.name} ✦</div>

        <div className="slot-reels-wrap">
          {reels.map((reel, i) => (
            <Reel
              key={i}
              reelIndex={i}
              symbols={reel}
              spinning={spinning}
              spinDelay={turbo ? i * 80 : i * 160}
              finalSymbols={spinning ? null : reel}
              isAnticipating={anticipating && i === 2}
              winningCells={winningCells}
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

      {/* Big Win & Jackpot Celebration Overlay */}
      {bigWinOverlay && (
        <BigWinModal
          type={bigWinOverlay.type}
          won={bigWinOverlay.won}
          currency={activeCurrency}
          onClose={() => setBigWinOverlay(null)}
        />
      )}

      {/* Auszahlungstabelle */}
      <div className="slots-paytable">
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--accent)', marginBottom: 12 }}>
          AUSZAHLUNGSTABELLE &bull; 7 GEWINNLINIEN &bull; 2X KIRSCHE ZAHLT &bull; WILD JOKER &bull; FREISPIELE (3X)
        </div>
        <div className="slots-paytable-grid">
          {SYMBOLS.map(s => (
            <div key={s.id} className="paytable-row">
              <span className="paytable-sym">{s.emoji}{s.emoji}{s.emoji}</span>
              <span className="paytable-name">{s.name}</span>
              <span className="paytable-mult" style={{ color: s.payout >= 80 ? '#ffd700' : s.payout >= 25 ? '#90be6d' : 'var(--text)' }}>
                3x: x{s.payout} {s.id === 'cherry' ? '| 2x: x2' : ''}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.48rem', color: 'var(--muted)', marginTop: 10 }}>
          🃏 WILD JOKER ersetzt alle Symbole &bull; 🍒 2x Kirsche zahlt x2 &bull; 2+ ⭐ = 5–25 FREISPIELE (3X BOOST) &bull; 3x 🍪 = PROGRESSIVER JACKPOT!
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
