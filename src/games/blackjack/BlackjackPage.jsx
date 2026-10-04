import React, { useState, useEffect, useRef } from 'react';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getLastName } from '../../lib/prefs.js';
import { fmtCookies } from '../clicker/clickerLogic.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function freshDeck() {
  const d = [];
  for (const suit of SUITS) for (const rank of RANKS) d.push({ suit, rank });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}
function cardValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}
function handValue(hand) {
  let total = hand.reduce((a,c) => a + cardValue(c.rank), 0);
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
      <div className="bj-card-corner bj-card-tl">{card.rank}<br/>{card.suit}</div>
      <div className="bj-card-center">{card.suit}</div>
      <div className="bj-card-corner bj-card-br">{card.rank}<br/>{card.suit}</div>
    </div>
  );
}

const PHASE = { BETTING: 'BETTING', PLAYING: 'PLAYING', DEALER: 'DEALER', RESULT: 'RESULT' };

export default function BlackjackPage() {
  const playerName = getLastName();
  const [cookies, setCookies] = useState(null);
  const [bet, setBet] = useState(50);
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [phase, setPhase] = useState(PHASE.BETTING);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ played:0, won:0, lost:0, pushed:0, totalWon:0, totalBet:0 });
  const [doubledDown, setDoubledDown] = useState(false);
  const [splitHands, setSplitHands] = useState(null);
  const [activeHand, setActiveHand] = useState(0);
  const clickerRef = useRef(null);
  const cookiesRef = useRef(null);

  async function loadCookies() {
    if (!playerName) { setCookies(0); return; }
    const { data } = await loadGameState(playerName, 'clicker');
    clickerRef.current = data?.state ?? null;
    const bal = Math.floor(data?.state?.cookies ?? 0);
    setCookies(bal); cookiesRef.current = bal;
  }
  async function saveCookies(nb) {
    if (!playerName || !clickerRef.current) return;
    const upd = { ...clickerRef.current, cookies: nb, lastSaved: Date.now() };
    clickerRef.current = upd;
    await saveGameState(playerName, 'clicker', upd);
  }
  useEffect(() => { loadCookies(); }, []);

  function deal() {
    if (cookies < bet) return;
    const d = freshDeck();
    const ph = [d.pop(), d.pop()];
    const dh = [d.pop(), d.pop()];
    const nb = cookies - bet;
    setCookies(nb); cookiesRef.current = nb;
    saveCookies(nb);
    setDeck(d);
    setPlayerHand(ph);
    setDealerHand(dh);
    setPhase(PHASE.PLAYING);
    setResult(null);
    setDoubledDown(false);
    setSplitHands(null);
    setActiveHand(0);

    // Naturals prüfen
    if (handValue(ph) === 21) {
      setTimeout(() => endGame(d, ph, dh, 'BLACKJACK! +150%', bet + Math.floor(bet * 1.5)), 400);
    }
  }

  function hit(currentDeck, hand, setHand) {
    const d = [...currentDeck];
    const card = d.pop();
    const newHand = [...hand, card];
    setHand(newHand);
    setDeck(d);
    if (handValue(newHand) > 21) {
      endGame(d, newHand, dealerHand, 'BUST! VERLOREN', 0);
    }
    return newHand;
  }

  function stand(currentDeck, ph, dh) {
    setPhase(PHASE.DEALER);
    let curDeck = [...currentDeck];
    let curDealer = [...dh];
    const dealerPlay = () => {
      if (handValue(curDealer) < 17) {
        curDealer = [...curDealer, curDeck.pop()];
        setDealerHand([...curDealer]);
        setTimeout(dealerPlay, 600);
      } else {
        finishRound(curDeck, ph, curDealer);
      }
    };
    setTimeout(dealerPlay, 600);
  }

  function finishRound(d, ph, dh) {
    const pv = handValue(ph);
    const dv = handValue(dh);
    if (dv > 21 || pv > dv) {
      endGame(d, ph, dh, 'GEWONNEN!', bet * 2);
    } else if (pv === dv) {
      endGame(d, ph, dh, 'UNENTSCHIEDEN', bet);
    } else {
      endGame(d, ph, dh, 'VERLOREN', 0);
    }
  }

  function endGame(d, ph, dh, msg, payout) {
    const nb = cookiesRef.current + payout;
    setCookies(nb); cookiesRef.current = nb;
    saveCookies(nb);
    setPhase(PHASE.RESULT);
    setResult(msg);
    const won = payout > bet;
    const pushed = payout === bet;
    const lost = payout === 0;
    setStats(s => ({
      played: s.played + 1,
      won: won ? s.won + 1 : s.won,
      lost: lost ? s.lost + 1 : s.lost,
      pushed: pushed ? s.pushed + 1 : s.pushed,
      totalWon: s.totalWon + payout,
      totalBet: s.totalBet + bet,
    }));
  }

  function doubleDown() {
    if (cookies < bet) return;
    const nb = cookiesRef.current - bet;
    setCookies(nb); cookiesRef.current = nb;
    saveCookies(nb);
    setDoubledDown(true);
    const d = [...deck];
    const card = d.pop();
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(d);
    if (handValue(newHand) > 21) {
      endGame(d, newHand, dealerHand, 'BUST! VERLOREN', 0);
    } else {
      stand(d, newHand, dealerHand);
    }
  }

  const pv = handValue(playerHand);
  const dv = handValue(dealerHand);
  const betOptions = [25, 50, 100, 250, 500, 1000, 2500, 5000];
  const canDouble = phase === PHASE.PLAYING && playerHand.length === 2 && cookies >= bet;

  const resultColor = result?.includes('GEWONNEN') || result?.includes('BLACKJACK') ? '#90be6d'
    : result?.includes('VERLOREN') || result?.includes('BUST') ? '#f94144' : '#ffd700';

  if (cookies === null) return <div className="page-content" style={{textAlign:'center',paddingTop:80}}>
    <p style={{fontFamily:'var(--font-pixel)',color:'var(--muted)'}}>LADE...</p>
  </div>;

  return (
    <div className="page-content bj-page">
      <div className="slots-header">
        <h1 className="slots-title">🃏 BLACKJACK</h1>
        <div className="slots-balance">
          <span style={{color:'var(--muted)',fontSize:'0.5rem',fontFamily:'var(--font-pixel)'}}>COOKIES</span>
          <span className="slots-balance-num">{fmtCookies(cookies)}</span>
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
            <div className="bj-bet-section">
              <div style={{fontFamily:'var(--font-pixel)',fontSize:'0.55rem',color:'var(--muted)',marginBottom:12}}>SETZE DEINEN EINSATZ</div>
              <div className="slot-bet-btns" style={{justifyContent:'center',marginBottom:16}}>
                {betOptions.map(b => (
                  <button key={b} className={`slot-bet-btn ${bet===b?'active':''}`} onClick={()=>setBet(b)}>{fmtCookies(b)}</button>
                ))}
              </div>
              <button className="btn btn-primary" style={{fontSize:'0.7rem',padding:'14px 40px'}} onClick={deal} disabled={cookies<bet} id="bj-deal-btn">
                🃏 KARTEN AUSTEILEN
              </button>
              {cookies < bet && <div style={{color:'var(--danger)',fontFamily:'var(--font-pixel)',fontSize:'0.4rem',marginTop:8}}>ZU WENIG COOKIES!</div>}
            </div>
          )}

          {phase === PHASE.RESULT && result && (
            <div className="bj-result-banner" style={{color: resultColor}}>
              {result}
              <button className="btn btn-primary" style={{display:'block',margin:'16px auto 0',fontSize:'0.55rem'}} onClick={()=>setPhase(PHASE.BETTING)}>
                NEUE RUNDE
              </button>
            </div>
          )}

          {phase === PHASE.DEALER && (
            <div style={{fontFamily:'var(--font-pixel)',fontSize:'0.6rem',color:'var(--muted)',animation:'pulse 1s infinite'}}>
              DEALER ZIEHT...
            </div>
          )}
        </div>

        {/* Spieler */}
        <div className="bj-hand-area">
          <div className="bj-hand-label">DU ({pv}){pv===21&&playerHand.length===2?' — BLACKJACK!':pv>21?' — BUST!':''}</div>
          <div className="bj-hand">
            {playerHand.map((c, i) => <Card key={i} card={c} />)}
          </div>
          {phase === PHASE.PLAYING && (
            <div className="bj-action-row">
              <button className="btn btn-primary" onClick={() => hit(deck, playerHand, setPlayerHand)} id="bj-hit-btn">HIT</button>
              <button className="btn btn-outline" onClick={() => stand(deck, playerHand, dealerHand)} id="bj-stand-btn">STAND</button>
              {canDouble && (
                <button className="btn" style={{background:'linear-gradient(135deg,#7209b7,#9d4edd)',color:'#fff',border:'none'}} onClick={doubleDown} id="bj-double-btn">
                  DOUBLE DOWN
                </button>
              )}
            </div>
          )}
        </div>

        {/* Aktueller Einsatz */}
        {phase !== PHASE.BETTING && (
          <div className="bj-current-bet">
            EINSATZ: {fmtCookies(doubledDown ? bet * 2 : bet)} Cookies
          </div>
        )}
      </div>

      {/* Regeln */}
      <div className="bj-rules">
        <div style={{fontFamily:'var(--font-pixel)',fontSize:'0.5rem',color:'var(--accent)',marginBottom:10}}>REGELN</div>
        <div className="bj-rules-grid">
          <div>Blackjack zahlt 1.5x Einsatz</div>
          <div>Dealer zieht bis 17</div>
          <div>Double Down verdoppelt Einsatz + 1 Karte</div>
          <div>Unentschieden gibt Einsatz zurück</div>
        </div>
      </div>

      {/* Stats */}
      <div className="slots-stats">
        {[
          {label:'GESPIELT',value:stats.played},
          {label:'GEWONNEN',value:stats.won,color:'#90be6d'},
          {label:'VERLOREN',value:stats.lost,color:'#f94144'},
          {label:'UNENTSCHIEDEN',value:stats.pushed,color:'#ffd700'},
          {label:'BILANZ',value:fmtCookies(stats.totalWon-stats.totalBet),color:stats.totalWon>=stats.totalBet?'#90be6d':'#f94144'},
        ].map(s => (
          <div key={s.label} className="slots-stat-item">
            <span style={{color:'var(--muted)',fontSize:'0.38rem',fontFamily:'var(--font-pixel)'}}>{s.label}</span>
            <span style={{fontFamily:'var(--font-pixel)',fontSize:'0.65rem',color:s.color||'var(--accent)'}}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
