import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getLastName } from '../../lib/prefs.js';
import { fmtCookies } from '../clicker/clickerLogic.js';

const SYMBOLS = [
  { id: 'jackpot', emoji: '🍪', name: 'JACKPOT',  weight: 1,  payout: 500 },
  { id: 'star',    emoji: '⭐', name: 'STERN',     weight: 2,  payout: 150 },
  { id: 'gold',    emoji: '🏆', name: 'TROPHAE',   weight: 3,  payout: 75  },
  { id: 'seven',   emoji: '7️⃣',name: 'SIEBEN',    weight: 5,  payout: 40  },
  { id: 'cherry',  emoji: '🍒', name: 'KIRSCHE',   weight: 8,  payout: 15  },
  { id: 'lemon',   emoji: '🍋', name: 'ZITRONE',   weight: 10, payout: 8   },
  { id: 'melon',   emoji: '🍈', name: 'MELONE',    weight: 12, payout: 5   },
  { id: 'bar',     emoji: '📊', name: 'BAR',       weight: 15, payout: 3   },
];
const WEIGHTED_POOL = SYMBOLS.flatMap(s => Array(s.weight).fill(s));
function pickSymbol() { return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)]; }
function pickReel() { return Array.from({ length: 3 }, pickSymbol); }

function checkWin(reels) {
  const lines = [
    [reels[0][0], reels[1][0], reels[2][0]],
    [reels[0][1], reels[1][1], reels[2][1]],
    [reels[0][2], reels[1][2], reels[2][2]],
    [reels[0][0], reels[1][1], reels[2][2]],
    [reels[0][2], reels[1][1], reels[2][0]],
  ];
  let total = 0; const wonLines = [];
  lines.forEach((line, idx) => {
    if (line[0].id === line[1].id && line[1].id === line[2].id) {
      wonLines.push({ lineIdx: idx, symbol: line[0], payout: line[0].payout });
      total += line[0].payout;
    }
  });
  return { total, wonLines };
}

function Reel({ symbols, spinning, spinDelay, finalSymbols }) {
  const [displayed, setDisplayed] = useState(symbols);
  const [blur, setBlur] = useState(false);
  const iRef = useRef(null);
  useEffect(() => {
    if (spinning) {
      const t = setTimeout(() => {
        setBlur(true);
        iRef.current = setInterval(() => setDisplayed([pickSymbol(),pickSymbol(),pickSymbol()]), 80);
      }, spinDelay);
      return () => { clearTimeout(t); clearInterval(iRef.current); };
    } else {
      clearInterval(iRef.current);
      setBlur(false);
      if (finalSymbols) setDisplayed(finalSymbols);
    }
  }, [spinning, finalSymbols, spinDelay]);
  return (
    <div className="slot-reel" style={{ filter: blur ? 'blur(3px)' : 'none', transition: 'filter 0.15s' }}>
      {displayed.map((sym, i) => (
        <div key={i} className="slot-cell"><span className="slot-symbol">{sym.emoji}</span></div>
      ))}
    </div>
  );
}

export default function SlotsPage() {
  const playerName = getLastName();
  const [cookies, setCookies] = useState(null);
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState([
    [SYMBOLS[4],SYMBOLS[5],SYMBOLS[6]],
    [SYMBOLS[3],SYMBOLS[4],SYMBOLS[5]],
    [SYMBOLS[2],SYMBOLS[3],SYMBOLS[4]],
  ]);
  const [spinning, setSpinning] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [stats, setStats] = useState({ spins:0, wins:0, totalWon:0, totalBet:0 });
  const [message, setMessage] = useState(null);
  const clickerRef = useRef(null);
  const spinningRef = useRef(false);
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

  const doSpin = useCallback(async () => {
    if (spinningRef.current) return;
    const bal = cookiesRef.current;
    const b = bet;
    if (bal === null || bal < b) return;
    spinningRef.current = true;
    setSpinning(true);
    const nb = bal - b;
    setCookies(nb); cookiesRef.current = nb;
    await saveCookies(nb);
    setMessage(null);
    const newReels = [pickReel(),pickReel(),pickReel()];
    setTimeout(async () => {
      spinningRef.current = false;
      setSpinning(false);
      setReels(newReels);
      const win = checkWin(newReels);
      const won = win.total * b;
      const fb = nb + won;
      setCookies(fb); cookiesRef.current = fb;
      await saveCookies(fb);
      setStats(s => ({ spins: s.spins+1, wins: win.total>0?s.wins+1:s.wins, totalWon: s.totalWon+won, totalBet: s.totalBet+b }));
      if (win.total > 0) {
        if (win.wonLines.some(l => l.symbol.id === 'jackpot')) setMessage({ text: `🍪 JACKPOT!! +${fmtCookies(won)}!`, type: 'jackpot' });
        else if (win.total >= 75) setMessage({ text: `🏆 MEGA WIN! +${fmtCookies(won)}`, type: 'big' });
        else setMessage({ text: `GEWINN! +${fmtCookies(won)}`, type: 'win' });
      } else {
        setMessage({ text: `-${fmtCookies(b)} — Kein Glueck`, type: 'loss' });
      }
    }, 2000);
  }, [bet]);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => { doSpin(); }, 2700);
    return () => clearInterval(id);
  }, [autoplay, doSpin]);

  const betOptions = [10, 50, 100, 500, 1000, 5000];
  if (cookies === null) return <div className="page-content" style={{textAlign:'center',paddingTop:80}}><p style={{fontFamily:'var(--font-pixel)',color:'var(--muted)'}}>LADE...</p></div>;

  return (
    <div className="page-content slots-page">
      <div className="slots-header">
        <h1 className="slots-title">🎰 KEKS-KASINO SLOTS</h1>
        <div className="slots-balance">
          <span style={{color:'var(--muted)',fontSize:'0.5rem',fontFamily:'var(--font-pixel)'}}>COOKIES</span>
          <span className="slots-balance-num">{fmtCookies(cookies)}</span>
        </div>
      </div>
      <div className="slot-machine">
        <div className="slot-machine-top">✦ MORITZFREUND DELUXE ✦</div>
        <div className="slot-reels-wrap">
          {reels.map((reel,i) => <Reel key={i} symbols={reel} spinning={spinning} spinDelay={i*180} finalSymbols={spinning?null:reel}/>)}
          <div className="slot-payline"/>
        </div>
        <div className={`slot-result-msg ${message?.type||''}`}>
          {message ? message.text : spinning ? 'DREHT...' : 'VIEL GLUECK!'}
        </div>
        <div className="slot-bet-row">
          <span style={{fontFamily:'var(--font-pixel)',fontSize:'0.48rem',color:'var(--muted)'}}>EINSATZ:</span>
          <div className="slot-bet-btns">
            {betOptions.map(b => <button key={b} className={`slot-bet-btn ${bet===b?'active':''}`} onClick={()=>setBet(b)} disabled={spinning}>{fmtCookies(b)}</button>)}
          </div>
        </div>
        <div className="slot-action-row">
          <button className="btn btn-primary slot-spin-btn" onClick={doSpin} disabled={spinning||cookies<bet} id="slots-spin-btn">
            {spinning ? 'DREHT...' : '🎰 DREHEN'}
          </button>
          <button className={`btn ${autoplay?'btn-danger':'btn-outline'} slot-auto-btn`} onClick={()=>setAutoplay(a=>!a)} disabled={!autoplay&&cookies<bet}>
            {autoplay ? 'STOP AUTO' : 'AUTOPLAY'}
          </button>
        </div>
        {cookies < bet && <div style={{color:'var(--danger)',fontFamily:'var(--font-pixel)',fontSize:'0.4rem',textAlign:'center',marginTop:8}}>ZU WENIG COOKIES!</div>}
      </div>
      <div className="slots-paytable">
        <div style={{fontFamily:'var(--font-pixel)',fontSize:'0.5rem',color:'var(--accent)',marginBottom:12}}>AUSZAHLUNGSTABELLE (x EINSATZ)</div>
        <div className="slots-paytable-grid">
          {SYMBOLS.map(s => (
            <div key={s.id} className="paytable-row">
              <span className="paytable-sym">{s.emoji}{s.emoji}{s.emoji}</span>
              <span className="paytable-name">{s.name}</span>
              <span className="paytable-mult" style={{color:s.payout>=100?'#ffd700':s.payout>=40?'#90be6d':'var(--text)'}}>x{s.payout}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:'0.48rem',color:'var(--muted)',marginTop:10}}>5 GEWINNLINIEN: 3 HORIZONTAL + 2 DIAGONAL</div>
      </div>
      <div className="slots-stats">
        {[
          {label:'SPINS',value:stats.spins},
          {label:'SIEGE',value:stats.wins},
          {label:'GEWONNEN',value:fmtCookies(stats.totalWon)},
          {label:'GESETZT',value:fmtCookies(stats.totalBet)},
          {label:'BILANZ',value:fmtCookies(stats.totalWon-stats.totalBet),color:stats.totalWon>=stats.totalBet?'#90be6d':'#f94144'},
        ].map(s => (
          <div key={s.label} className="slots-stat-item">
            <span style={{color:'var(--muted)',fontSize:'0.4rem',fontFamily:'var(--font-pixel)'}}>{s.label}</span>
            <span style={{fontFamily:'var(--font-pixel)',fontSize:'0.65rem',color:s.color||'var(--accent)'}}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
