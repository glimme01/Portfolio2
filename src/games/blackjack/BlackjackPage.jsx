import React, { useState, useEffect, useRef } from 'react';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getActivePlayerName } from '../../lib/auth.js';
import { fmtCookies } from '../clicker/clickerLogic.js';
import { insertScore, getPlayerScores } from '../../lib/scores.js';
import CurrencyExchangeModal from '../../components/CurrencyExchangeModal.jsx';
import {
  playChipSound,
  playCardDealSound,
  playWinChime,
  playBigWinSound,
  playCoinSound,
} from '../../lib/casinoAudio.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function freshShoe(numDecks = 4) {
  const d = [];
  for (let k = 0; k < numDecks; k++) {
    for (const suit of SUITS) for (const rank of RANKS) d.push({ suit, rank });
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Spielerfreundliches Ziehen: Verhindert frustrierende Dauer-Busts auf 12-16
function drawPlayerCard(currentDeck, currentHand) {
  const d = [...currentDeck];
  const val = handValue(currentHand);
  if (val >= 12 && val <= 16 && Math.random() < 0.68) {
    const safeIdx = d.findIndex(c => handValue([...currentHand, c]) <= 21);
    if (safeIdx >= 0) {
      const [card] = d.splice(safeIdx, 1);
      return { card, newDeck: d };
    }
  }
  const card = d.pop();
  return { card, newDeck: d };
}


function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function handValue(hand) {
  let total = hand.reduce((a, c) => a + cardValue(c.rank), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isRed(suit) { return suit === '♥' || suit === '♦'; }

function Card({ card, faceDown }) {
  if (faceDown) return (
    <div className="bj-card bj-card-back">
      <div className="bj-card-pattern">🎴</div>
    </div>
  );
  const red = isRed(card.suit);
  return (
    <div className={`bj-card ${red ? 'bj-card-red' : 'bj-card-black'}`}>
      <div className="bj-card-corner bj-card-tl">{card.rank}<br />{card.suit}</div>
      <div className="bj-card-center">{card.suit}</div>
      <div className="bj-card-corner bj-card-br">{card.rank}<br />{card.suit}</div>
    </div>
  );
}

const CURRENCIES = {
  cookies: {
    id: 'cookies',
    name: 'COOKIES',
    icon: '🍪',
    minBet: 10,
    defaultBet: 50,
    presets: [25, 50, 100, 250, 500, 1000, 2500, 5000, 25000],
    format: (v) => fmtCookies(v),
  },
  gems: {
    id: 'gems',
    name: 'DIAMANTEN (VIP)',
    icon: '💎',
    minBet: 1,
    defaultBet: 5,
    presets: [1, 2, 5, 10, 20, 50, 100],
    format: (v) => Number(v || 0).toLocaleString('de-DE'),
  },
};

// 🃏 Double-or-Nothing Gamble Overlay for Blackjack
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
      const won = Math.random() < 0.60;
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
          🃏 2X BLACKJACK RISIKO
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

const PHASE = { BETTING: 'BETTING', PLAYING: 'PLAYING', DEALER: 'DEALER', RESULT: 'RESULT' };

export default function BlackjackPage({ embedded = false }) {
  const playerName = getActivePlayerName();
  const [activeCurrency, setActiveCurrency] = useState('cookies');
  const [playerState, setPlayerState] = useState(null);
  const [bet, setBet] = useState(50);
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [splitHands, setSplitHands] = useState(null);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [phase, setPhase] = useState(PHASE.BETTING);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ played: 0, won: 0, lost: 0, pushed: 0, totalWon: 0, totalBet: 0, bestWin: 0 });
  const [doubledDown, setDoubledDown] = useState(false);
  const [streak, setStreak] = useState(0);
  const [gambleAmount, setGambleAmount] = useState(null);
  const [isGambleOpen, setIsGambleOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);

  const clickerRef = useRef(null);
  const bestWinRef = useRef(0);

  const curr = CURRENCIES[activeCurrency] || CURRENCIES.cookies;
  const currentBalance = playerState ? Math.floor(playerState[activeCurrency] ?? 0) : 0;

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
      const sc = await getPlayerScores(playerName);
      if (sc?.blackjack > 0) {
        bestWinRef.current = sc.blackjack;
        setStats(s => ({ ...s, bestWin: sc.blackjack }));
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

  // Live Cookie/Currency Sync
  useEffect(() => {
    function onCookiesSynced(e) {
      if (e?.detail?.playerName && playerName && e.detail.playerName.toLowerCase() !== playerName.toLowerCase()) {
        return;
      }
      if (e?.detail && phase === PHASE.BETTING) {
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
  }, [phase, playerName]);

  function handleSelectCurrency(currId) {
    if (phase !== PHASE.BETTING) return;
    setActiveCurrency(currId);
    const targetConfig = CURRENCIES[currId];
    const bal = playerState ? Math.floor(playerState[currId] ?? 0) : 0;
    setBet(Math.min(targetConfig.defaultBet, Math.max(targetConfig.minBet, bal || targetConfig.minBet)));
    setGambleAmount(null);
    setIsGambleOpen(false);
  }

  function deal() {
    const b = Number(bet);
    if (currentBalance < b || b <= 0) return;
    playChipSound();
    playCardDealSound();

    const d = freshShoe(4);
    let ph;
    // 14% Chance auf ein direktes Natural Blackjack (oder starkes 20er Blatt) für mehr Spielspaß
    if (Math.random() < 0.14) {
      const aceIdx = d.findIndex(c => c.rank === 'A');
      const ace = d.splice(aceIdx >= 0 ? aceIdx : 0, 1)[0];
      const tenIdx = d.findIndex(c => ['10', 'J', 'Q', 'K'].includes(c.rank));
      const ten = d.splice(tenIdx >= 0 ? tenIdx : 0, 1)[0];
      ph = [ace, ten];
    } else {
      ph = [d.pop(), d.pop()];
    }
    const dh = [d.pop(), d.pop()];
    const nextBal = currentBalance - b;

    persistPlayerState({ ...clickerRef.current, [activeCurrency]: nextBal });

    setDeck(d);
    setPlayerHand(ph);
    setDealerHand(dh);
    setSplitHands(null);
    setActiveHandIndex(0);
    setPhase(PHASE.PLAYING);
    setResult(null);
    setDoubledDown(false);
    setGambleAmount(null);
    setIsGambleOpen(false);

    // Naturals prüfen
    if (handValue(ph) === 21) {
      setTimeout(() => {
        playBigWinSound();
        const payout = b + Math.floor(b * 1.5);
        endGame(d, ph, dh, '👑 NATURAL BLACKJACK! +150%', payout);
      }, 500);
    }
  }

  function hit(currentDeck, hand, setHand) {
    playCardDealSound();
    const { card, newDeck: d } = drawPlayerCard(currentDeck, hand);
    const newHand = [...hand, card];
    setHand(newHand);
    setDeck(d);

    // 5-Card Charlie Regel: 5 Karten ohne Bust gewinnt sofort!
    if (newHand.length === 5 && handValue(newHand) <= 21) {
      playBigWinSound();
      const activeBet = doubledDown ? bet * 2 : bet;
      endGame(d, newHand, dealerHand, '🌟 5-CARD CHARLIE! AUTOMATISCHER GEWINN! 🏆', activeBet * 2);
      return newHand;
    }

    if (handValue(newHand) > 21) {
      endGame(d, newHand, dealerHand, '💥 BUST! ÜBER 21', 0);
    }
    return newHand;
  }

  function split() {
    if (!canSplit) return;
    const b = Number(bet);
    playChipSound();
    playCardDealSound();

    const nextBal = currentBalance - b;
    persistPlayerState({ ...clickerRef.current, [activeCurrency]: nextBal });

    const d = [...deck];
    const c1 = d.pop();
    const c2 = d.pop();

    const h0 = {
      cards: [playerHand[0], c1],
      bet: b,
      doubled: false,
      busted: false,
      stood: false,
    };
    const h1 = {
      cards: [playerHand[1], c2],
      bet: b,
      doubled: false,
      busted: false,
      stood: false,
    };

    setDeck(d);
    setSplitHands([h0, h1]);
    setActiveHandIndex(0);
  }

  function handleHit() {
    if (!splitHands) {
      hit(deck, playerHand, setPlayerHand);
      return;
    }
    playCardDealSound();
    const activeH = splitHands[activeHandIndex];
    const { card, newDeck: d } = drawPlayerCard(deck, activeH.cards);
    const updated = splitHands.map((h, i) => {
      if (i !== activeHandIndex) return h;
      const nextCards = [...h.cards, card];
      const val = handValue(nextCards);
      return {
        ...h,
        cards: nextCards,
        busted: val > 21,
      };
    });
    setDeck(d);
    setSplitHands(updated);

    const updatedH = updated[activeHandIndex];
    if (updatedH.cards.length === 5 && !updatedH.busted) {
      playBigWinSound();
      updatedH.stood = true;
    }

    if (updatedH.busted || updatedH.cards.length === 5) {
      if (activeHandIndex === 0) {
        setActiveHandIndex(1);
      } else {
        if (updated[0].busted && updatedH.busted) {
          endGameSplit(d, updated, dealerHand, '💥 BEIDE HÄNDE BUST! ÜBER 21', 0, updated[0].bet + updated[1].bet);
        } else {
          dealerTurnForSplit(d, updated, dealerHand);
        }
      }
    }
  }

  function stand(currentDeck, ph, dh) {
    setPhase(PHASE.DEALER);
    let curDeck = [...currentDeck];
    let curDealer = [...dh];

    const dealerPlay = () => {
      if (handValue(curDealer) < 17) {
        playCardDealSound();
        curDealer = [...curDealer, curDeck.pop()];
        setDealerHand([...curDealer]);
        setTimeout(dealerPlay, 500);
      } else {
        finishRound(curDeck, ph, curDealer);
      }
    };
    setTimeout(dealerPlay, 500);
  }

  function handleStand() {
    if (!splitHands) {
      stand(deck, playerHand, dealerHand);
      return;
    }
    const updated = splitHands.map((h, i) => i === activeHandIndex ? { ...h, stood: true } : h);
    setSplitHands(updated);

    if (activeHandIndex === 0) {
      setActiveHandIndex(1);
    } else {
      dealerTurnForSplit(deck, updated, dealerHand);
    }
  }

  function dealerTurnForSplit(curDeck, hands, curDealer) {
    setPhase(PHASE.DEALER);
    let d = [...curDeck];
    let dh = [...curDealer];

    const dealerPlay = () => {
      if (handValue(dh) < 17) {
        playCardDealSound();
        dh = [...dh, d.pop()];
        setDealerHand([...dh]);
        setTimeout(dealerPlay, 500);
      } else {
        finishSplitRound(d, hands, dh);
      }
    };
    setTimeout(dealerPlay, 500);
  }

  function finishRound(d, ph, dh) {
    const pv = handValue(ph);
    const dv = handValue(dh);
    const activeBet = doubledDown ? bet * 2 : bet;

    if (dv > 21) {
      playBigWinSound();
      endGame(d, ph, dh, 'DEALER BUST! DU GEWINNST! 🎉', activeBet * 2);
    } else if (pv > dv) {
      playWinChime();
      endGame(d, ph, dh, 'GEWONNEN! 🏆', activeBet * 2);
    } else if (pv === dv) {
      playCoinSound();
      endGame(d, ph, dh, 'UNENTSCHIEDEN (PUSH)', activeBet);
    } else {
      endGame(d, ph, dh, 'VERLOREN! DEALER GEWINNT', 0);
    }
  }

  function finishSplitRound(d, hands, dh) {
    const dv = handValue(dh);
    let totalPayout = 0;
    let totalInvested = 0;
    const summaries = [];

    hands.forEach((h, idx) => {
      const hv = handValue(h.cards);
      const hBet = h.doubled ? h.bet * 2 : h.bet;
      totalInvested += hBet;

      if (h.busted) {
        summaries.push(`H${idx + 1}: BUST (${hv}) ❌`);
      } else if (dv > 21) {
        totalPayout += hBet * 2;
        summaries.push(`H${idx + 1}: GEWONNEN (${hv} vs BUST) 🎉`);
      } else if (hv > dv) {
        totalPayout += hBet * 2;
        summaries.push(`H${idx + 1}: GEWONNEN (${hv} vs ${dv}) 🏆`);
      } else if (hv === dv) {
        totalPayout += hBet;
        summaries.push(`H${idx + 1}: PUSH (${hv}) 🤝`);
      } else {
        summaries.push(`H${idx + 1}: VERLOREN (${hv} vs ${dv}) ❌`);
      }
    });

    const net = totalPayout - totalInvested;
    const banner = net > 0 ? `GEWINN! +${curr.format(net)} ${curr.icon} (${summaries.join(' | ')})`
      : net === 0 ? `BREAK-EVEN! (${summaries.join(' | ')})`
      : `VERLUST! ${curr.format(Math.abs(net))} ${curr.icon} (${summaries.join(' | ')})`;

    endGameSplit(d, hands, dh, banner, totalPayout, totalInvested);
  }

  async function endGameSplit(d, hands, dh, msg, rawPayout, totalInvested) {
    let payout = rawPayout;
    const hasLuckyCharm = Boolean(clickerRef.current?.vipLuckyCharm);
    if (payout > totalInvested && hasLuckyCharm) {
      payout = Math.floor(payout * 1.05);
      msg += ' 🍀 (VIP +5%)';
    }

    let insuranceRefund = 0;
    let insuranceLeft = clickerRef.current?.casinoInsuranceCharges || 0;
    if (payout < totalInvested && insuranceLeft > 0) {
      insuranceRefund = Math.min(50000, Math.floor(totalInvested * 0.25));
      insuranceLeft -= 1;
      msg += ` (🛡️ Versicherung: +${curr.format(insuranceRefund)} erstattet!)`;
    }

    const curBal = playerState ? Math.floor(playerState[activeCurrency] ?? 0) : 0;
    const finalBal = curBal + payout + insuranceRefund;

    const updated = {
      ...clickerRef.current,
      [activeCurrency]: finalBal,
      casinoInsuranceCharges: insuranceLeft,
    };
    if (activeCurrency === 'cookies') {
      updated.totalCookies = Math.max(updated.totalCookies || 0, finalBal);
    }
    await persistPlayerState(updated);

    setPhase(PHASE.RESULT);
    setResult(msg);

    const netWin = payout - totalInvested;
    const won = payout > totalInvested;
    const lost = payout < totalInvested;
    const pushed = payout === totalInvested && payout > 0;

    if (won) playWinChime();

    if (netWin > bestWinRef.current) {
      bestWinRef.current = netWin;
      await insertScore(playerName, 'blackjack', netWin);
    }

    if (won) {
      setStreak(s => s + 1);
      setGambleAmount(payout);
    } else if (lost) {
      setStreak(0);
      setGambleAmount(payout > 0 ? payout : null);
    } else {
      setGambleAmount(payout > 0 ? payout : null);
    }

    setStats(s => ({
      played: s.played + 1,
      won: won ? s.won + 1 : s.won,
      lost: lost ? s.lost + 1 : s.lost,
      pushed: pushed ? s.pushed + 1 : s.pushed,
      totalWon: s.totalWon + payout,
      totalBet: s.totalBet + totalInvested,
      bestWin: Math.max(s.bestWin, netWin),
    }));
  }

  async function endGame(d, ph, dh, msg, rawPayout) {
    const activeBet = doubledDown ? bet * 2 : bet;
    let payout = rawPayout;

    const hasLuckyCharm = Boolean(clickerRef.current?.vipLuckyCharm);
    if (payout > activeBet && hasLuckyCharm) {
      payout = Math.floor(payout * 1.05);
      msg += ' 🍀 (VIP +5%)';
    }

    let insuranceRefund = 0;
    let insuranceLeft = clickerRef.current?.casinoInsuranceCharges || 0;
    if (payout === 0 && insuranceLeft > 0) {
      insuranceRefund = Math.min(50000, Math.floor(activeBet * 0.25));
      insuranceLeft -= 1;
      msg += ` (🛡️ Casino-Versicherung: +${curr.format(insuranceRefund)} erstattet!)`;
    }

    const curBal = playerState ? Math.floor(playerState[activeCurrency] ?? 0) : 0;
    const finalBal = curBal + payout + insuranceRefund;

    const updated = {
      ...clickerRef.current,
      [activeCurrency]: finalBal,
      casinoInsuranceCharges: insuranceLeft,
    };
    if (activeCurrency === 'cookies') {
      updated.totalCookies = Math.max(updated.totalCookies || 0, finalBal);
    }
    await persistPlayerState(updated);

    setPhase(PHASE.RESULT);
    setResult(msg);

    const won = payout > activeBet;
    const pushed = payout === activeBet;
    const lost = payout === 0;

    const netWin = payout - activeBet;
    if (netWin > bestWinRef.current) {
      bestWinRef.current = netWin;
      await insertScore(playerName, 'blackjack', netWin);
    }

    if (won) {
      setStreak(s => s + 1);
      setGambleAmount(payout);
    } else if (lost) {
      setStreak(0);
      setGambleAmount(null);
    }

    setStats(s => ({
      played: s.played + 1,
      won: won ? s.won + 1 : s.won,
      lost: lost ? s.lost + 1 : s.lost,
      pushed: pushed ? s.pushed + 1 : s.pushed,
      totalWon: s.totalWon + payout,
      totalBet: s.totalBet + activeBet,
      bestWin: Math.max(s.bestWin, netWin),
    }));
  }

  function doubleDown() {
    if (currentBalance < bet) return;
    playChipSound();
    playCardDealSound();

    const nextBal = currentBalance - bet;
    persistPlayerState({ ...clickerRef.current, [activeCurrency]: nextBal });

    setDoubledDown(true);
    const d = [...deck];
    const card = d.pop();
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(d);

    if (handValue(newHand) > 21) {
      endGame(d, newHand, dealerHand, '💥 BUST NACH DOUBLE DOWN!', 0);
    } else {
      stand(d, newHand, dealerHand);
    }
  }

  function handleDouble() {
    if (!splitHands) {
      doubleDown();
      return;
    }
    const currentH = splitHands[activeHandIndex];
    if (currentBalance < currentH.bet) return;
    playChipSound();
    playCardDealSound();

    const nextBal = currentBalance - currentH.bet;
    persistPlayerState({ ...clickerRef.current, [activeCurrency]: nextBal });

    const d = [...deck];
    const card = d.pop();
    const updated = splitHands.map((h, i) => {
      if (i !== activeHandIndex) return h;
      const nextCards = [...h.cards, card];
      const val = handValue(nextCards);
      return {
        ...h,
        cards: nextCards,
        doubled: true,
        stood: val <= 21,
        busted: val > 21,
      };
    });
    setDeck(d);
    setSplitHands(updated);

    if (activeHandIndex === 0) {
      setActiveHandIndex(1);
    } else {
      if (updated[0].busted && updated[1].busted) {
        const totalInvested = (updated[0].doubled ? updated[0].bet * 2 : updated[0].bet) +
                              (updated[1].doubled ? updated[1].bet * 2 : updated[1].bet);
        endGameSplit(d, updated, dealerHand, '💥 BEIDE HÄNDE BUST!', 0, totalInvested);
      } else {
        dealerTurnForSplit(d, updated, dealerHand);
      }
    }
  }

  // Custom Amount Helpers
  function stepBet(delta) {
    if (phase !== PHASE.BETTING) return;
    setBet(b => {
      const step = activeCurrency === 'cookies' ? (delta > 0 ? 50 : -50) : (delta > 0 ? 1 : -1);
      const next = Math.max(1, (Number(b) || 0) + step);
      return Math.min(next, currentBalance > 0 ? currentBalance : next);
    });
  }

  function handleCustomBetChange(val) {
    if (phase !== PHASE.BETTING) return;
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
    if (phase !== PHASE.BETTING) return;
    setBet(b => Math.max(1, Math.floor((Number(b) || 2) / 2)));
  }

  function handleDoubleBet() {
    if (phase !== PHASE.BETTING) return;
    setBet(b => {
      const dbl = (Number(b) || 1) * 2;
      return currentBalance > 0 ? Math.min(dbl, currentBalance) : dbl;
    });
  }

  function handleMaxBet() {
    if (phase !== PHASE.BETTING || currentBalance <= 0) return;
    const cap = activeCurrency === 'cookies' ? 100000 : 250;
    setBet(Math.min(currentBalance, cap));
  }

  function handleAllIn() {
    if (phase !== PHASE.BETTING || currentBalance <= 0) return;
    setBet(currentBalance);
  }

  const pv = handValue(playerHand);
  const dv = handValue(dealerHand);
  const canSplit = phase === PHASE.PLAYING && !splitHands && playerHand.length === 2 &&
    cardValue(playerHand[0].rank) === cardValue(playerHand[1].rank) &&
    currentBalance >= bet;
  const canDouble = phase === PHASE.PLAYING && (
    splitHands
      ? (splitHands[activeHandIndex]?.cards.length === 2 && currentBalance >= splitHands[activeHandIndex]?.bet)
      : (playerHand.length === 2 && currentBalance >= bet)
  );

  const resultColor = result?.includes('GEWONNEN') || result?.includes('BLACKJACK') ? '#90be6d'
    : result?.includes('VERLOREN') || result?.includes('BUST') ? '#f94144' : '#ffd700';

  if (!playerState) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ fontFamily: 'var(--font-pixel)', color: 'var(--muted)' }}>LADE BLACKJACK...</p>
      </div>
    );
  }

  return (
    <div className={`page-content bj-page ${embedded ? 'embedded-game' : ''}`} style={embedded ? { padding: '8px 0', maxWidth: '100%' } : {}}>
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
                disabled={phase !== PHASE.BETTING}
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
          <h1 className="slots-title">🃏 BLACKJACK 21</h1>
          {streak >= 2 && (
            <div className="slots-streak-badge">
              🔥 {streak}x GEWINN-SERIE &bull; HIGH ROLLER!
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

      <div className="bj-table">
        {/* Dealer */}
        <div className="bj-hand-area">
          <div className="bj-hand-label">
            DEALER {phase !== PHASE.PLAYING ? `(${dv})` : ''}
          </div>
          <div className="bj-hand">
            {dealerHand.map((c, i) => (
              <Card key={i} card={c} faceDown={phase === PHASE.PLAYING && i === 1} />
            ))}
          </div>
        </div>

        {/* Tisch-Mitte */}
        <div className="bj-center">
          {phase === PHASE.BETTING && (
            <div className="bj-bet-section" style={{ width: '100%', maxWidth: '520px' }}>
              {/* NEUES CUSTOM-EINSATZ SYSTEM */}
              <div className="custom-bet-box" style={{ margin: '0 auto 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.48rem', color: 'var(--muted)' }}>
                    EINSATZ EINTIPPEN:
                  </span>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--accent)' }}>
                    {curr.icon} {curr.name}
                  </span>
                </div>

                {/* Eingabe mit Stepper */}
                <div className="custom-bet-input-row">
                  <button className="btn bet-step-btn" onClick={() => stepBet(-1)}>-</button>
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
                    placeholder="Einsatz..."
                  />
                  <button className="btn bet-step-btn" onClick={() => stepBet(1)}>+</button>
                </div>

                {/* Schnell-Chips */}
                <div className="slot-bet-btns" style={{ justifyContent: 'center', marginBottom: '10px' }}>
                  {curr.presets.map(b => (
                    <button
                      key={b}
                      className={`slot-bet-btn ${Number(bet) === b ? 'active' : ''}`}
                      onClick={() => { playChipSound(); setBet(b); }}
                    >
                      {curr.icon} {curr.format(b)}
                    </button>
                  ))}
                </div>

                {/* Modifikatoren */}
                <div className="bet-modifiers">
                  <button className="btn btn-outline" onClick={handleHalfBet}>½ HALB</button>
                  <button className="btn btn-outline" onClick={handleDoubleBet}>2X DOPPELT</button>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={handleMaxBet} disabled={currentBalance <= 0}>MAX</button>
                  <button className="btn btn-allin" onClick={handleAllIn} disabled={currentBalance <= 0}>💥 ALL IN!</button>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ fontSize: '0.7rem', padding: '14px 40px' }}
                onClick={deal}
                disabled={currentBalance < bet || Number(bet) <= 0}
                id="bj-deal-btn"
              >
                🃏 KARTEN AUSTEILEN ({curr.format(bet)} {curr.icon})
              </button>
              {currentBalance < bet && (
                <div style={{ color: 'var(--danger)', fontFamily: 'var(--font-pixel)', fontSize: '0.42rem', marginTop: 10 }}>
                  ZU WENIG {curr.name}! Wechsle in der Wechselstube Währung oder passe den Einsatz an.
                </div>
              )}
            </div>
          )}

          {phase === PHASE.RESULT && result && (
            <div className="bj-result-banner" style={{ color: resultColor }}>
              {result}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                {gambleAmount && (
                  <button
                    className="btn"
                    style={{
                      fontSize: '0.55rem',
                      background: 'linear-gradient(135deg, #ffd700, #ff4444)',
                      color: '#000',
                      fontWeight: 'bold',
                    }}
                    onClick={() => setIsGambleOpen(true)}
                  >
                    🃏 2X DOPPELN ({curr.format(gambleAmount)} {curr.icon})?
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.55rem' }}
                  onClick={() => setPhase(PHASE.BETTING)}
                >
                  NEUE RUNDE
                </button>
              </div>
            </div>
          )}

          {phase === PHASE.DEALER && (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.6rem', color: 'var(--muted)', animation: 'pulse 1s infinite' }}>
              DEALER ZIEHT...
            </div>
          )}
        </div>

        {/* Spieler */}
        {splitHands ? (
          <div className="bj-split-container">
            {splitHands.map((h, idx) => {
              const hv = handValue(h.cards);
              const isActive = phase === PHASE.PLAYING && activeHandIndex === idx;
              return (
                <div
                  key={idx}
                  className={`bj-split-hand-box ${isActive ? 'active' : ''} ${h.busted ? 'busted' : ''}`}
                >
                  <div className="bj-hand-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      HAND {idx + 1} ({hv})
                      {isActive ? ' ◀ AKTIV' : ''}
                      {h.busted ? ' 💥 BUST' : h.stood ? ' ✋ STAND' : ''}
                    </span>
                    <span className="bj-split-badge">
                      {curr.format(h.doubled ? h.bet * 2 : h.bet)} {curr.icon}
                    </span>
                  </div>
                  <div className="bj-hand">
                    {h.cards.map((c, i) => (
                      <Card key={i} card={c} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bj-hand-area">
            <div className="bj-hand-label">
              DU ({pv}){pv === 21 && playerHand.length === 2 ? ' — 👑 BLACKJACK!' : pv > 21 ? ' — 💥 BUST!' : ''}
            </div>
            <div className="bj-hand">
              {playerHand.map((c, i) => <Card key={i} card={c} />)}
            </div>
          </div>
        )}

        {phase === PHASE.PLAYING && (
          <div className="bj-action-row">
            <button className="btn btn-primary" onClick={handleHit} id="bj-hit-btn">
              HIT (+ KARTE)
            </button>
            <button className="btn btn-outline" onClick={handleStand} id="bj-stand-btn">
              STAND (HALTEN)
            </button>
            {canDouble && (
              <button
                className="btn"
                style={{ background: 'linear-gradient(135deg, #7209b7, #9d4edd)', color: '#fff', border: 'none' }}
                onClick={handleDouble}
                id="bj-double-btn"
              >
                ⚡ DOUBLE DOWN
              </button>
            )}
            {canSplit && (
              <button
                className="btn"
                style={{ background: 'linear-gradient(135deg, #0077b6, #00b4d8)', color: '#fff', border: 'none' }}
                onClick={split}
                id="bj-split-btn"
              >
                ✂️ SPLIT ({curr.format(bet)} {curr.icon})
              </button>
            )}
          </div>
        )}

        {/* Aktueller Einsatz */}
        {phase !== PHASE.BETTING && (
          <div className="bj-current-bet">
            EINSATZ: {curr.format(
              splitHands
                ? splitHands.reduce((acc, h) => acc + (h.doubled ? h.bet * 2 : h.bet), 0)
                : (doubledDown ? bet * 2 : bet)
            )} {curr.icon}
          </div>
        )}
      </div>

      {/* 2x Double or Nothing Modal */}
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

      {/* Regeln */}
      <div className="bj-rules">
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: 'var(--accent)', marginBottom: 10 }}>
          REGELN & AUSZAHLUNGEN &bull; AKTIVE WÄHRUNG: {curr.name} {curr.icon}
        </div>
        <div className="bj-rules-grid">
          <div>Natural Blackjack zahlt 3:2 (150%)</div>
          <div>Dealer muss bis 17 ziehen</div>
          <div>Double Down verdoppelt Einsatz + 1 Karte</div>
          <div>Paare splitten (teilen) in 2 separate Hände</div>
          <div>Unentschieden (Push) gibt vollen Einsatz zurück</div>
        </div>
      </div>

      {/* Stats */}
      <div className="slots-stats">
        {[
          { label: 'GESPIELT', value: stats.played },
          { label: 'GEWONNEN', value: stats.won, color: '#90be6d' },
          { label: 'VERLOREN', value: stats.lost, color: '#f94144' },
          { label: 'UNENTSCHIEDEN', value: stats.pushed, color: '#ffd700' },
          { label: 'BESTE HAND', value: `${curr.format(stats.bestWin)} ${curr.icon}`, color: 'var(--accent)' },
          { label: 'BILANZ', value: `${curr.format(stats.totalWon - stats.totalBet)} ${curr.icon}`, color: stats.totalWon >= stats.totalBet ? '#90be6d' : '#f94144' },
        ].map(s => (
          <div key={s.label} className="slots-stat-item">
            <span style={{ color: 'var(--muted)', fontSize: '0.38rem', fontFamily: 'var(--font-pixel)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem', color: s.color || 'var(--accent)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
