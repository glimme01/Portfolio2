import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BUILDINGS, UPGRADES, ACHIEVEMENTS, INITIAL_STOCKS, MARKET_NEWS,
  RANDOM_EVENTS, ASCENSION_TIERS,
  buildingCost, maxAffordable, calcCps, calcClickValue, fmtCookies,
  createClickerState, updateStockPrices,
  getAscensionTier, getNextAscensionTier, getEligibleAscensionLevel,
  collectDividends, calcPortfolioValue,
} from './clickerLogic.js';
import {
  getDiamondOvenCost,
  MAX_DIAMOND_OVENS,
  TIME_WARP_COOLDOWN_MS,
  GOLD_FRENZY_COOLDOWN_MS,
} from './gemPerks.js';
import { SKINS, getSkin, isSkinUnlocked, DEFAULT_SKIN } from './skins.js';
import { loadGameState, saveGameState } from '../../lib/save.js';
import { getLastName } from '../../lib/prefs.js';
import { getCurrentUser, onAuthChange, getActivePlayerName } from '../../lib/auth.js';
import { insertScore } from '../../lib/scores.js';
import SaveIndicator from '../../components/SaveIndicator.jsx';
import ClickerGamblingTab from './ClickerGamblingTab.jsx';

const MAX_OFFLINE_S = 86400; // Bis zu 24 Stunden Offline-Fortschritt

// Lustige, klickbare Ticker-News
const NEWS_HEADLINES = [
  { text: 'Lokalzeitung: Omas fordern mehr Wolle für Keks-Pullover.', secret: false },
  { text: 'Keks-Börse: Schoko-Futures erreichen Allzeithoch.', secret: false },
  { text: 'Wissenschaftler entdecken: Das Universum schmeckt nach Vanille.', secret: false },
  { text: 'GEHEIM-TIPP: Klicke auf diese Schlagzeile für eine Überraschung!', secret: true },
  { text: 'Eilmeldung: Riesiger Teigberg im Stadtpark gesichtet.', secret: false },
  { text: 'Philosoph fragt: Wenn ein Keks im Wald zerbröselt, macht er ein Geräusch?', secret: false },
];

// Sparkline Mini-Chart für Aktien
function StockChart({ history, color = '#ffd700' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !history || history.length < 2) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = (max - min) || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((val, i) => {
      const x = (i / (history.length - 1)) * (w - 6) + 3;
      const y = h - ((val - min) / range) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [history, color]);

  return <canvas ref={ref} width={90} height={36} style={{ display: 'block', background: '#0a0a0a', borderRadius: '4px' }} />;
}

// Floating Numbers beim Klick
let floatId = 0;
function FloatingNumbers({ floats }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {floats.map(f => (
        <span
          key={f.id}
          className="floating-number"
          style={{ left: f.x, top: f.y }}
          aria-hidden="true"
        >
          +{fmtCookies(f.value)}
        </span>
      ))}
    </div>
  );
}

// Achievement Toast
function AchievementToast({ achievement, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="achievement-toast" role="alert" aria-live="assertive">
      <span className="toast-icon">{achievement.icon}</span>
      <div className="toast-text">
        <div className="toast-title">ACHIEVEMENT FREIGESCHALTET!</div>
        <div className="toast-name">{achievement.name}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{achievement.desc}</div>
      </div>
    </div>
  );
}

// Golden Cookie
function GoldenCookie({ onCollect }) {
  const x = useMemo(() => Math.random() * 60 + 15, []);
  const y = useMemo(() => Math.random() * 50 + 20, []);
  return (
    <button
      className="golden-cookie"
      style={{ left: `${x}vw`, top: `${y}vh` }}
      onClick={onCollect}
      aria-label="Goldenen Cookie klicken!"
    >
      ✨
    </button>
  );
}

// Keks-Komet (fliegt über den Schirm)
function CookieComet({ onCollect }) {
  const [pos, setPos] = useState({ x: -12, y: Math.random() * 45 + 10 });
  const speed = 1.3;

  useEffect(() => {
    const timer = setInterval(() => {
      setPos(p => {
        if (p.x > 115) return p;
        return { x: p.x + speed, y: p.y + (speed * 0.45) };
      });
    }, 40);
    return () => clearInterval(timer);
  }, []);

  if (pos.x > 110) return null;

  return (
    <button
      className="cookie-comet-btn"
      style={{ left: `${pos.x}vw`, top: `${pos.y}vh` }}
      onClick={onCollect}
      aria-label="Keks-Komet anklicken!"
    >
      <span className="comet-core">☄️</span>
    </button>
  );
}

// Offline Dialog
function OfflineDialog({ gained, onClose }) {
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true">
      <div className="overlay-panel">
        <h2 className="overlay-title">WILLKOMMEN ZURÜCK</h2>
        <div className="offline-progress">
          WÄHREND DEINER ABWESENHEIT:<br />
          +{fmtCookies(gained)} COOKIES GEBACKEN
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
          EINSAMMELN
        </button>
      </div>
    </div>
  );
}

export default function ClickerPage({ defaultTab = 'buildings' }) {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  useEffect(() => {
    return onAuthChange((u) => setCurrentUser(u));
  }, []);
  const playerName = currentUser?.username ? currentUser.username.trim() : 'Gast';
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlSub = searchParams.get('sub');

  const [tab, setTab] = useState(() => {
    if (urlTab === 'slots' || urlTab === 'blackjack' || urlTab === 'gems' || urlTab === 'diamonds' || urlTab === 'casino') {
      return 'casino';
    }
    return urlTab || defaultTab;
  });

  const initialCasinoSubTab = useMemo(() => {
    if (urlTab === 'slots' || urlTab === 'blackjack') return urlTab;
    if (urlTab === 'gems' || urlTab === 'diamonds') return 'diamonds';
    if (urlTab === 'coinflip' || urlTab === 'muenzwurf') return 'coinflip';
    if (urlSub) return urlSub;
    return 'coinflip';
  }, [urlTab, urlSub]);

  useEffect(() => {
    if (urlTab === 'slots' || urlTab === 'blackjack' || urlTab === 'gems' || urlTab === 'diamonds' || urlTab === 'casino') {
      setTab('casino');
    } else if (urlTab) {
      setTab(urlTab);
    }
  }, [urlTab]);

  const [gs, setGs] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [floats, setFloats] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [goldenVisible, setGoldenVisible] = useState(false);
  const [goldenBoost, setGoldenBoost] = useState(false);
  const [activeComet, setActiveComet] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null); // { id, name, badge, color, desc, remaining, duration }
  const [cookieScale, setCookieScale] = useState(1);
  const [saveVisible, setSaveVisible] = useState(false);
  const [offlineGain, setOfflineGain] = useState(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [newsIndex, setNewsIndex] = useState(0);
  const [titleClicks, setTitleClicks] = useState(0);
  const [ascendModalOpen, setAscendModalOpen] = useState(false);

  const gsRef = useRef(null);
  const rafRef = useRef(null);
  const goldenTimerRef = useRef(null);
  const eventTimerRef = useRef(null);
  const autosaveRef = useRef(null);
  const konamiRef = useRef([]);
  const lastSubmittedScoreRef = useRef(0);
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;
  const goldenBoostRef = useRef(goldenBoost);
  goldenBoostRef.current = goldenBoost;

  // Audio Synth
  const audioCtxRef = useRef(null);
  function getAudio() {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }
  function playClickPip() {
    const ctx = getAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    } catch { }
  }
  function playFanfare() {
    const ctx = getAudio();
    if (!ctx) return;
    try {
      [440, 554, 659, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.15);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.15);
      });
    } catch { }
  }

  function getActiveUpgrades(state) {
    return UPGRADES.filter(u => state.upgrades?.includes(u.id));
  }

  // Initialisierung
  useEffect(() => {
    async function init() {
      let state = createClickerState();
      state.stockPrices = updateStockPrices({}, null, 50000);
      const { data } = await loadGameState(playerName, 'clicker');

      if (data?.state) {
        state = { ...createClickerState(), ...data.state };
        const savedWealth = Math.max(state.cookies || 0, (state.totalCookies || 0) * 0.15, 50000);
        if (!state.stockPrices || Object.keys(state.stockPrices).length === 0) {
          state.stockPrices = updateStockPrices({}, null, savedWealth);
        } else {
          state.stockPrices = updateStockPrices(state.stockPrices, null, savedWealth);
        }

        // Offline Fortschritt berechnen (data.state.lastSaved oder data.updated_at)
        const lastSavedTs = data.state.lastSaved || (data.updated_at ? new Date(data.updated_at).getTime() : null);
        const offlineEfficiency = (state.ascensionCount || 0) >= 2 ? 1.0 : 0.5;
        const cps = calcCps(state.buildings, getActiveUpgrades(state), 1, 1, state.diamondOvens || 0, state.ascensionCount || 0);

        if (cps > 0 && lastSavedTs) {
          const elapsed = Math.min((Date.now() - lastSavedTs) / 1000, MAX_OFFLINE_S);
          if (elapsed >= 5) {
            const gained = Math.floor(cps * elapsed * offlineEfficiency);
            if (gained > 0) {
              state.cookies += gained;
              state.totalCookies += gained;
              setOfflineGain(gained);
            }
          }
        }
        state.lastSaved = Date.now();
        await saveGameState(playerName, 'clicker', state);
        if (playerName.toLowerCase() !== 'gast') {
          await insertScore(playerName, 'clicker', state.cookies, { forceUpdate: true });
        }
      }

      gsRef.current = state;
      setGs({ ...state });
      setLoaded(true);
    }
    init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (goldenTimerRef.current) clearTimeout(goldenTimerRef.current);
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      if (autosaveRef.current) clearInterval(autosaveRef.current);

      // Beim Verlassen der Seite speichern falls geladen
      if (gsRef.current && playerName && loaded) {
        gsRef.current.lastSaved = Date.now();
        saveGameState(playerName, 'clicker', gsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // rAF Loop für CPS & Börsen-Update
  useEffect(() => {
    if (!loaded) return;
    let lastFrame = Date.now();
    let tickCount = 0;

    function loop() {
      const now = Date.now();
      const dt = (now - lastFrame) / 1000;
      lastFrame = now;
      tickCount++;

      const state = gsRef.current;
      if (!state) { rafRef.current = requestAnimationFrame(loop); return; }

      const activeUpgrades = getActiveUpgrades(state);
      const curActiveEvent = activeEventRef.current;
      const isSugarFestival = curActiveEvent?.id === 'sugar_festival';
      const isGrandmaParty = curActiveEvent?.id === 'grandma_party';
      const isGoldFrenzy = curActiveEvent?.id === 'gold_frenzy';

      const buffMulti = (goldenBoostRef.current ? 2 : 1) * (isSugarFestival ? 2 : 1) * (isGoldFrenzy ? 3 : 1);
      const grandmaBoost = isGrandmaParty ? 5 : 1;

      const cps = calcCps(
        state.buildings,
        activeUpgrades,
        buffMulti,
        grandmaBoost,
        state.diamondOvens || 0,
        state.ascensionCount || 0
      );

      // Wrinkler-Abzug (5% pro Wrinkler)
      const wrinklerCount = state.wrinklers?.length || 0;
      const leechRate = Math.min(0.5, wrinklerCount * 0.05);
      const effectiveCps = cps * (1 - leechRate);
      const leechedCookies = (cps * leechRate) * dt;

      if (wrinklerCount > 0 && state.wrinklers) {
        state.wrinklers.forEach(w => {
          w.consumed = (w.consumed || 0) + (leechedCookies / wrinklerCount);
        });
      }

      state.cookies += effectiveCps * dt;
      state.totalCookies += cps * dt;
      state.playTime = (state.playTime ?? 0) + dt;
      state.lastSaved = Date.now();

      // Gelegentlich Wrinkler spawnen (alle ~120s wenn < 4 und > 100.000 Cookies)
      if (tickCount % 600 === 0 && (!state.wrinklers || state.wrinklers.length < 4) && state.totalCookies > 100000) {
        state.wrinklers = state.wrinklers || [];
        state.wrinklers.push({
          id: 'wrinkler-' + Date.now(),
          consumed: 0,
          clicks: 0,
          angle: Math.random() * Math.PI * 2,
        });
      }

      // UI alle 100ms aktualisieren
      if (tickCount % 6 === 0) {
        setGs({ ...state });
      }

      // Achievements prüfen
      ACHIEVEMENTS.forEach(ach => {
        if (!state.achievements.includes(ach.id) && ach.check(state)) {
          state.achievements.push(ach.id);
          state.gems = (state.gems || 0) + 2; // +2 Diamanten Belohnung!
          setToasts(t => [...t, { ...ach, desc: `${ach.desc} (+2 💎 Diamanten!)` }]);
          playFanfare();
        }
      });

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loaded]);

  // Autarker Börsen- & Dividenden-Ticker (läuft ununterbrochen alle 6 Sekunden – auch während aktiven Events!)
  useEffect(() => {
    if (!loaded) return;

    const stockInterval = setInterval(() => {
      const state = gsRef.current;
      if (!state) return;

      const portfolioVal = calcPortfolioValue(state.stockPrices, state.stockShares, state.stockBuyPrices).totalValue || 0;
      const playerWealth = Math.max(
        state.cookies || 0,
        (state.totalCookies || 0) * 0.15,
        portfolioVal,
        50000
      );

      const curEvent = activeEventRef.current;
      let marketEv = null;
      if (curEvent?.id === 'stock_downfall') {
        marketEv = { sector: null, multiplier: 0.70 }; // Baisse-Druck während des Crashs
      } else if (curEvent?.id === 'stock_rally') {
        marketEv = { sector: null, multiplier: 1.30 }; // Hausse-Druck während der Rallye
      }

      state.stockPrices = updateStockPrices(state.stockPrices, marketEv, playerWealth);
      setGs({ ...state });
    }, 6000);

    const divInterval = setInterval(() => {
      const state = gsRef.current;
      if (!state || !state.stockShares || Object.keys(state.stockShares).length === 0) return;

      const { totalDividend, newPrices } = collectDividends(state.stockPrices, state.stockShares);
      if (totalDividend > 0) {
        state.cookies += totalDividend;
        state.totalCookies += totalDividend;
        state.stockPrices = newPrices;
        state.totalDividendsEarned = (state.totalDividendsEarned || 0) + totalDividend;
        setToasts(t => [...t, { icon: '💰', name: 'DIVIDENDEN!', desc: `+${fmtCookies(totalDividend)} Cookies Dividendenausschüttung!` }]);
        setGs({ ...state });
      }
    }, 60000);

    return () => {
      clearInterval(stockInterval);
      clearInterval(divInterval);
    };
  }, [loaded]);

  // Rotierender News-Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex(i => (i + 1) % NEWS_HEADLINES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Autosave alle 12s & bei Verlassen
  useEffect(() => {
    if (!loaded || !playerName) return;

    async function doSave() {
      const state = gsRef.current;
      if (!state) return;
      state.lastSaved = Date.now();
      await saveGameState(playerName, 'clicker', state);

      // Highscore spiegelt immer den aktuellen Kontostand wider (nur für angemeldete Spieler)
      const currentScore = Math.floor(state.cookies);
      if (playerName.toLowerCase() !== 'gast' && currentScore !== lastSubmittedScoreRef.current) {
        lastSubmittedScoreRef.current = currentScore;
        await insertScore(playerName, 'clicker', currentScore, { forceUpdate: true });
      }
      setSaveVisible(true);
      setTimeout(() => setSaveVisible(false), 800);
    }

    autosaveRef.current = setInterval(doSave, 12000);
    const onVis = () => { if (document.hidden) doSave(); };
    window.addEventListener('beforeunload', doSave);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(autosaveRef.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', doSave);
      doSave();
    };
  }, [loaded, playerName]);

  // Live Cookie-Sync von Slots & Blackjack empfangen
  useEffect(() => {
    function onCookiesSynced(e) {
      if (e?.detail?.playerName && playerName && e.detail.playerName.toLowerCase() !== playerName.toLowerCase()) {
        return;
      }
      if (e?.detail && gsRef.current) {
        let changed = false;
        if (e.detail.state && Object.keys(e.detail.state.buildings || {}).length > 0) {
          gsRef.current = { ...createClickerState(), ...e.detail.state };
          setGs({ ...gsRef.current });
          return;
        }
        if (e.detail.cookies !== undefined) {
          const nextCookies = Math.floor(e.detail.cookies);
          if (gsRef.current.cookies !== nextCookies) {
            gsRef.current.cookies = nextCookies;
            changed = true;
          }
        }
        if (e.detail.gems !== undefined) {
          const nextGems = Math.floor(e.detail.gems);
          if (gsRef.current.gems !== nextGems) {
            gsRef.current.gems = nextGems;
            changed = true;
          }
        }
        if (changed) {
          setGs(prev => prev ? {
            ...prev,
            cookies: gsRef.current.cookies,
            gems: gsRef.current.gems,
          } : prev);
        }
      }
    }
    window.addEventListener('arcade-cookies-synced', onCookiesSynced);
    return () => window.removeEventListener('arcade-cookies-synced', onCookiesSynced);
  }, [playerName]);

  // Golden Cookie Spawner
  useEffect(() => {
    if (!loaded) return;
    function scheduleGolden() {
      const delay = (50 + Math.random() * 50) * 1000;
      goldenTimerRef.current = setTimeout(() => {
        setGoldenVisible(true);
        setTimeout(() => setGoldenVisible(false), 14000);
        scheduleGolden();
      }, delay);
    }
    scheduleGolden();
    return () => { if (goldenTimerRef.current) clearTimeout(goldenTimerRef.current); };
  }, [loaded]);

  // === RANDOM EVENTS ENGINE ===
  const triggerSpecificEvent = useCallback((eventId) => {
    const ev = RANDOM_EVENTS.find(e => e.id === eventId) || RANDOM_EVENTS[0];
    const state = gsRef.current;
    if (state) {
      state.eventsCaught = (state.eventsCaught || 0) + 1;
    }

    if (ev.id === 'cookie_comet') {
      setActiveComet(true);
      setTimeout(() => setActiveComet(false), 8000);
      playFanfare();
      setToasts(t => [...t, { icon: '☄️', name: 'KEKS-KOMET GESICHTET!', desc: 'Klick ihn schnell am Himmel!' }]);
      return;
    }

    if (ev.id === 'stock_rally' && state) {
      const updated = {};
      Object.entries(state.stockPrices || {}).forEach(([k, v]) => {
        const doublePrice = v.price * 2;
        updated[k] = { ...v, price: doublePrice, ratio: (v.ratio || 1) * 2, history: [...(v.history || []), doublePrice].slice(-32) };
      });
      state.stockPrices = updated;
    }

    if (ev.id === 'stock_downfall' && state) {
      const updated = {};
      Object.entries(state.stockPrices || {}).forEach(([k, v]) => {
        const crashPrice = Math.max(1, Math.floor(v.price * 0.3));
        const newRatio = Math.max(0.15, (v.ratio || 1) * 0.3);
        updated[k] = {
          ...v,
          price: crashPrice,
          ratio: newRatio,
          trend: -1,
          history: [...(v.history || []), crashPrice].slice(-32),
        };
      });
      state.stockPrices = updated;
    }

    const baseDur = ev.duration;
    const dur = (state?.ascensionCount || 0) >= 5 ? baseDur * 2 : baseDur; // Stufe 5: Göttlicher Ofen

    playFanfare();
    setActiveEvent({
      ...ev,
      duration: dur,
      remaining: dur,
    });
    setToasts(t => [...t, { icon: ev.id === 'stock_downfall' ? '🚨' : '★', name: ev.name, desc: ev.desc }]);
  }, []);

  // Automatischer Event-Loop
  useEffect(() => {
    if (!loaded) return;

    function scheduleNextEvent() {
      const state = gsRef.current;
      const hasMagnet = (state?.ascensionCount || 0) >= 1; // Stufe 1: Kometen-Magnet
      // Wenn Kometen-Magnet aktiv: 20-38s, sonst 45-70s
      const delay = hasMagnet
        ? (20 + Math.random() * 18) * 1000
        : (45 + Math.random() * 25) * 1000;

      eventTimerRef.current = setTimeout(() => {
        const pool = ['cookie_comet', 'gold_rush', 'sugar_festival', 'grandma_party', 'stock_rally', 'stock_downfall'];
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        triggerSpecificEvent(chosen);
        scheduleNextEvent();
      }, delay);
    }

    scheduleNextEvent();
    return () => { if (eventTimerRef.current) clearTimeout(eventTimerRef.current); };
  }, [loaded, triggerSpecificEvent]);

  // Active Event Countdown Ticker
  useEffect(() => {
    if (!activeEvent) return;
    const interval = setInterval(() => {
      setActiveEvent(ev => {
        if (!ev) return null;
        if (ev.remaining <= 1) return null;
        return { ...ev, remaining: ev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEvent]);

  // Admin Custom Events Listener (Dev-Tools)
  useEffect(() => {
    function handleAdminEvent(e) {
      const { type, eventId, amount } = e.detail || {};
      const state = gsRef.current;
      if (!state) return;

      if (type === 'SPAWN_COMET') {
        setActiveComet(true);
        setTimeout(() => setActiveComet(false), 8000);
        setToasts(t => [...t, { icon: '☄️', name: 'ADMIN: KOMET GESTARTET', desc: 'Fang ihn am Himmel!' }]);
      } else if (type === 'START_EVENT') {
        triggerSpecificEvent(eventId);
      } else if (type === 'ADD_COOKIES') {
        state.cookies += amount || 1000000;
        state.totalCookies += amount || 1000000;
        playFanfare();
        setGs({ ...state });
      } else if (type === 'ADD_ASCENSION') {
        state.ascensionCount = (state.ascensionCount || 0) + (amount || 1);
        playFanfare();
        setGs({ ...state });
      } else if (type === 'ADD_GEMS') {
        state.gems = (state.gems || 0) + (amount || 25);
        playFanfare();
        setGs({ ...state });
      }
    }

    window.addEventListener('arcade-admin-event', handleAdminEvent);
    return () => window.removeEventListener('arcade-admin-event', handleAdminEvent);
  }, [triggerSpecificEvent]);

  // Klick auf fliegenden Keks-Kometen
  function handleCometClick() {
    const state = gsRef.current;
    if (!state) return;
    setActiveComet(false);

    const activeUpgrades = getActiveUpgrades(state);
    const cps = calcCps(state.buildings, activeUpgrades, 1, 1, state.diamondOvens || 0, state.ascensionCount || 0);
    // Belohnung: 15 Minuten CPS oder mindestens 7.777 Cookies
    let reward = Math.max(7777, Math.floor(cps * 900));
    if ((state.ascensionCount || 0) >= 1) {
      reward *= 3; // Stufe 1: Kometen-Magnet 3x Ertrag!
    }

    state.cookies += reward;
    state.totalCookies += reward;
    state.eventsCaught = (state.eventsCaught || 0) + 1;

    playFanfare();
    setToasts(t => [...t, { icon: '☄️', name: 'KOMET GEFANGEN!', desc: `+${fmtCookies(reward)} Himmels-Kekse!` }]);
    setGs({ ...state });
  }

  // Klick auf den großen Cookie
  const handleCookieClick = useCallback((e) => {
    const state = gsRef.current;
    if (!state) return;

    const activeUpgrades = getActiveUpgrades(state);
    const hasCrit = activeUpgrades.some(u => u.effect === 'critChance');
    const critChance = (hasCrit ? 0.08 : 0) + ((state.ascensionCount || 0) >= 4 ? 0.15 : 0);
    const isCrit = Math.random() < critChance;

    const isGoldRush = activeEvent?.id === 'gold_rush';
    const clickMultiplier = (isGoldRush ? 7 : 1) * (goldenBoost ? 2 : 1);

    const currentCps = calcCps(state.buildings, activeUpgrades, 1, grandmaBoost, state.diamondOvens || 0, state.ascensionCount || 0);
    const val = calcClickValue(activeUpgrades, isCrit, clickMultiplier, currentCps, state.skin, state.ascensionCount || 0);

    state.cookies += val;
    state.totalCookies += val;
    state.totalClicks = (state.totalClicks ?? 0) + 1;

    playClickPip();

    // Floating number
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
    const id = ++floatId;
    setFloats(f => [...f, { id, value: val, x, y }]);
    setTimeout(() => setFloats(f => f.filter(item => item.id !== id)), 1000);

    // Keks-Bouncing
    setCookieScale(0.92);
    setTimeout(() => setCookieScale(1), 80);

    setGs({ ...state });
  }, [activeEvent, goldenBoost]);

  // Wrinkler platzen lassen
  function popWrinkler(wId) {
    const state = gsRef.current;
    if (!state || !state.wrinklers) return;

    const w = state.wrinklers.find(item => item.id === wId);
    if (!w) return;

    w.clicks = (w.clicks || 0) + 1;
    playClickPip();

    if (w.clicks >= 3) {
      const activeUpgrades = getActiveUpgrades(state);
      const boost = activeUpgrades.some(u => u.effect === 'wrinklerBoost') ? 2.0 : 1.5;
      const returned = Math.floor((w.consumed || 50) * boost);
      state.cookies += returned;
      state.totalCookies += returned;
      state.wrinklers = state.wrinklers.filter(item => item.id !== wId);
      playFanfare();
      setToasts(t => [...t, { icon: '★', name: 'WRINKLER GEPLATZT!', desc: `+${fmtCookies(returned)} Cookies zurückgewonnen!` }]);
      setGs({ ...state });
    } else {
      setGs({ ...state });
    }
  }

  // Gebäude kaufen
  function buyBuilding(b, amount = 1) {
    const state = gsRef.current;
    if (!state) return;
    const owned = state.buildings[b.id] ?? 0;
    let actualAmount = amount;
    let cost = 0;

    if (amount === 'max') {
      const calc = maxAffordable(b, owned, state.cookies);
      if (calc.count <= 0) return;
      actualAmount = calc.count;
      cost = calc.cost;
    } else {
      actualAmount = Number(amount) || 1;
      cost = buildingCost(b, owned, actualAmount);
      if (state.cookies < cost) return;
    }

    state.cookies -= cost;
    state.buildings[b.id] = owned + actualAmount;
    playClickPip();
    setGs({ ...state });
  }

  // Upgrade kaufen
  function buyUpgrade(u) {
    const state = gsRef.current;
    if (!state) return;
    if (state.upgrades.includes(u.id) || state.cookies < u.cost) return;

    state.cookies -= u.cost;
    state.upgrades.push(u.id);
    playFanfare();
    setToasts(t => [...t, { icon: '★', name: 'UPGRADE GEKAUFT!', desc: u.name }]);
    setGs({ ...state });
  }

  // Exponentiellen Aufstieg durchführen
  async function executeAscension() {
    const state = gsRef.current;
    if (!state) return;

    const currentCount = state.ascensionCount || 0;
    const nextTier = getNextAscensionTier(currentCount);
    if (!nextTier) return;

    const eligibleLevel = getEligibleAscensionLevel(state.totalCookies);
    const canAscend = eligibleLevel > currentCount || (state.totalCookies || 0) >= nextTier.reqCookies;
    if (!canAscend) return;

    const targetLevel = Math.max(currentCount + 1, eligibleLevel);
    state.ascensionCount = targetLevel;

    // Stufe 5 (Göttlicher Ofen): Startet sofort mit 10.000 Start-Cookies
    const startingCookies = state.ascensionCount >= 5 ? 10000 : 0;
    state.cookies = startingCookies;
    state.buildings = {};
    state.upgrades = [];
    state.wrinklers = [];
    state.stockShares = {};
    state.lastSaved = Date.now();
    setAscendModalOpen(false);

    await saveGameState(playerName, 'clicker', state);
    await insertScore(playerName, 'clicker', startingCookies, { forceUpdate: true });

    const currentTier = getAscensionTier(state.ascensionCount);
    playFanfare();
    setToasts(t => [...t, {
      icon: '🌌',
      name: `AUFSTIEG AUF STUFE ${state.ascensionCount}!`,
      desc: `${currentTier ? currentTier.title : 'Aufstieg'}: ${Math.pow(2, state.ascensionCount)}x Multiplikator aktiv!`,
    }]);
    setGs({ ...state });
  }

  // Aktien handeln
  function buyStock(stockId, amount = 1) {
    const state = gsRef.current;
    if (!state) return;
    const price = state.stockPrices?.[stockId]?.price || 10;
    const numToBuy = amount === 'max'
      ? Math.floor(state.cookies / price)
      : Math.floor(Number(amount) || 1);
    if (!numToBuy || numToBuy <= 0) return;
    const totalCost = price * numToBuy;
    if (state.cookies < totalCost) return;

    state.cookies -= totalCost;
    state.stockShares = state.stockShares || {};
    state.stockBuyPrices = state.stockBuyPrices || {};
    const prevShares = state.stockShares[stockId] || 0;
    // Durchschnitts-Kaufpreis berechnen
    const prevAvg = state.stockBuyPrices[stockId] || price;
    state.stockBuyPrices[stockId] = (prevAvg * prevShares + price * numToBuy) / (prevShares + numToBuy);
    state.stockShares[stockId] = prevShares + numToBuy;
    state.tradesDone = (state.tradesDone || 0) + 1;
    playClickPip();
    setToasts(t => [...t, { icon: '📈', name: 'KAUF ERFOLGT!', desc: `${numToBuy}x ${stockId.toUpperCase()} für ${fmtCookies(totalCost)} Cookies` }]);
    setGs({ ...state });
  }

  function sellStock(stockId, amount = 1) {
    const state = gsRef.current;
    if (!state) return;
    const shares = state.stockShares?.[stockId] || 0;
    const numToSell = amount === 'max'
      ? shares
      : Math.floor(Number(amount) || 1);
    if (!numToSell || numToSell <= 0 || shares < numToSell) return;

    const price = state.stockPrices?.[stockId]?.price || 10;
    const proceeds = price * numToSell;
    const buyPrice = state.stockBuyPrices?.[stockId] || price;
    const profit = (price - buyPrice) * numToSell;
    state.cookies += proceeds;
    state.totalCookies += proceeds;
    state.stockShares[stockId] = shares - numToSell;
    state.tradesDone = (state.tradesDone || 0) + 1;
    state.stockProfitRealized = (state.stockProfitRealized || 0) + profit;
    playClickPip();
    setToasts(t => [...t, {
      icon: profit >= 0 ? '📈' : '📉',
      name: profit >= 0 ? 'GEWINN REALISIERT!' : 'VERLUST REALISIERT',
      desc: `${profit >= 0 ? '+' : ''}${fmtCookies(profit)} Cookies Profit`
    }]);
    setGs({ ...state });
  }

  // Easter Egg: News Anklicken
  function handleNewsClick(item) {
    if (item.secret && gsRef.current) {
      const state = gsRef.current;
      if (!state.easterEggs?.includes('news_click')) {
        state.easterEggs = [...(state.easterEggs || []), 'news_click'];
        state.cookies += 777;
        state.totalCookies += 777;
        playFanfare();
        setToasts(t => [...t, { icon: '★', name: 'GEHEIME NACHRICHT!', desc: '+777 Überraschungs-Cookies!' }]);
        setGs({ ...state });
      }
    }
  }

  // Easter Egg: Titel-Klicks
  function handleTitleClick() {
    setTitleClicks(c => {
      const next = c + 1;
      if (next === 15 && gsRef.current) {
        const state = gsRef.current;
        if (!state.easterEggs?.includes('title_clicks')) {
          state.easterEggs = [...(state.easterEggs || []), 'title_clicks'];
          state.cookies += 10000;
          state.totalCookies += 10000;
          playFanfare();
          setToasts(t => [...t, { icon: '🔍', name: 'NEUGIERIGE NASE!', desc: '+10.000 Cookies für Neugier!' }]);
          setGs({ ...state });
        }
      }
      return next;
    });
  }

  // VIP Diamanten-Perks kaufen (Balanciert ohne Exploits)
  function handleBuyGemPerk(perk) {
    const state = gsRef.current;
    if (!state) return;

    const currentOvens = state.diamondOvens || 0;
    const cost = perk.id === 'diamond_oven' ? getDiamondOvenCost(currentOvens) : perk.cost;
    if (cost === null || (state.gems || 0) < cost) return;

    const now = Date.now();

    if (perk.id === 'time_warp') {
      const lastUsed = state.lastTimeWarpUsed || 0;
      if (now - lastUsed < TIME_WARP_COOLDOWN_MS) {
        const remainingMin = Math.ceil((TIME_WARP_COOLDOWN_MS - (now - lastUsed)) / 60000);
        setToasts(t => [...t, { icon: '⏳', name: 'ABKLINGZEIT!', desc: `Zeit-Sprung ist noch ${remainingMin} Min. auf Cooldown!` }]);
        return;
      }
      state.gems = (state.gems || 0) - cost;
      state.lastTimeWarpUsed = now;
      const activeUpgrades = getActiveUpgrades(state);
      const activeCps = calcCps(state.buildings, activeUpgrades, 1, 1, currentOvens, state.ascensionCount || 0);
      const reward = Math.max(10000, Math.floor(activeCps * 900)); // 15 Min. Basis-CPS
      state.cookies += reward;
      state.totalCookies += reward;
      playFanfare();
      setToasts(t => [...t, { icon: '⏳', name: 'ZEIT-SPRUNG!', desc: `+${fmtCookies(reward)} Cookies (15 Min. CPS) erhalten!` }]);
    } else if (perk.id === 'gold_frenzy') {
      const lastUsed = state.lastGoldFrenzyUsed || 0;
      if (now - lastUsed < GOLD_FRENZY_COOLDOWN_MS) {
        const remainingMin = Math.ceil((GOLD_FRENZY_COOLDOWN_MS - (now - lastUsed)) / 60000);
        setToasts(t => [...t, { icon: '🌟', name: 'ABKLINGZEIT!', desc: `Gold-Frenzy ist noch ${remainingMin} Min. auf Cooldown!` }]);
        return;
      }
      state.gems = (state.gems || 0) - cost;
      state.lastGoldFrenzyUsed = now;
      setActiveEvent({
        id: 'gold_frenzy',
        name: '🌟 DIAMANT-FRENZY!',
        badge: '3x CPS BOOST',
        duration: 30,
        remaining: 30,
        color: '#ffd700',
        desc: 'Diamantene Energie durchflutet deine Öfen: 30s lang 3-fache Keks-Produktion!',
      });
      playFanfare();
      setToasts(t => [...t, { icon: '🌟', name: 'GOLD-FRENZY AKTIV!', desc: '30s lang 3-fache Keks-Produktion gestartet!' }]);
    } else if (perk.id === 'diamond_oven') {
      if (currentOvens >= MAX_DIAMOND_OVENS) {
        setToasts(t => [...t, { icon: '💎', name: 'MAXIMAL ERREICHT!', desc: `Maximal ${MAX_DIAMOND_OVENS} Diamant-Öfen erlaubt!` }]);
        return;
      }
      state.gems = (state.gems || 0) - cost;
      state.diamondOvens = currentOvens + 1;
      playFanfare();
      setToasts(t => [...t, { icon: '💎', name: 'DIAMANTEN-OFEN!', desc: `Ofen #${state.diamondOvens}/${MAX_DIAMOND_OVENS} aktiv (+5% Gesamt-CPS & +20 Basis-CPS)!` }]);
    } else if (perk.id === 'lucky_clover') {
      if (state.vipLuckyCharm) return;
      state.gems = (state.gems || 0) - cost;
      state.vipLuckyCharm = true;
      playFanfare();
      setToasts(t => [...t, { icon: '🍀', name: 'VIP GLÜCKSKLEE!', desc: '+5% Gewinne in allen Casino-Spielen dauerhaft aktiv!' }]);
    } else if (perk.id === 'casino_insurance') {
      if ((state.casinoInsuranceCharges || 0) >= 3) {
        setToasts(t => [...t, { icon: '🛡️', name: 'VERSICHERUNG VOLL!', desc: 'Du hast bereits 3 Schutz-Ladungen aktiv!' }]);
        return;
      }
      state.gems = (state.gems || 0) - cost;
      state.casinoInsuranceCharges = 3;
      playFanfare();
      setToasts(t => [...t, { icon: '🛡️', name: 'CASINO-VERSICHERUNG!', desc: '3 Schutz-Ladungen aufgeladen (25% Erstattung bei Verlust, max 50k Cookies)!' }]);
    } else if (perk.id === 'crystal_skin') {
      if (state.unlockedGemSkins?.includes('crystal')) return;
      state.gems = (state.gems || 0) - cost;
      state.unlockedGemSkins = [...new Set([...(state.unlockedGemSkins || []), 'crystal'])];
      state.skin = 'crystal';
      playFanfare();
      setToasts(t => [...t, { icon: '✨', name: 'KRISTALL-MORITZ SKIN!', desc: 'Legendärer Kristall-Skin ausgerüstet (+5% Klick-Stärke)!' }]);
    }

    setGs({ ...state });
    saveGameState(playerName, 'clicker', state);
  }

  function handleUpdateState(newState) {
    if (!gsRef.current) return;
    gsRef.current = { ...gsRef.current, ...newState };
    setGs({ ...gsRef.current });
    saveGameState(playerName, 'clicker', gsRef.current);
  }

  if (!loaded || !gs) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <p className="hs-empty">LADE KEKS IMPERIUM...</p>
      </div>
    );
  }

  const activeUpgrades = getActiveUpgrades(gs);
  const isSugarFestival = activeEvent?.id === 'sugar_festival';
  const isGrandmaParty = activeEvent?.id === 'grandma_party';
  const isGoldFrenzy = activeEvent?.id === 'gold_frenzy';
  const buffMulti = (goldenBoost ? 2 : 1) * (isSugarFestival ? 2 : 1) * (isGoldFrenzy ? 3 : 1);
  const grandmaBoost = isGrandmaParty ? 5 : 1;

  const currentCps = calcCps(
    gs.buildings,
    activeUpgrades,
    buffMulti,
    grandmaBoost,
    gs.diamondOvens || 0,
    gs.ascensionCount || 0
  );

  const isGoldRush = activeEvent?.id === 'gold_rush';
  const clickVal = calcClickValue(
    activeUpgrades,
    false,
    (isGoldRush ? 7 : 1) * (goldenBoost ? 2 : 1),
    currentCps,
    gs.skin,
    gs.ascensionCount || 0
  );

  const currentSkin = getSkin(gs.skin);

  return (
    <div className="page-content" style={{ padding: '8px 16px 48px' }}>
      {/* 1. Klickbarer News-Ticker */}
      <div className="clicker-news-ticker" onClick={() => handleNewsClick(NEWS_HEADLINES[newsIndex])}>
        <span className="ticker-label">NEWS:</span>
        <span className="ticker-text">{NEWS_HEADLINES[newsIndex].text}</span>
      </div>

      <div className={`clicker-layout ${tab === 'casino' ? 'casino-active' : ''}`}>
        {/* LINKE SPALTE: Bäckerei, Großer Keks, Statistiken */}
        <div className="clicker-cookie-area">
          <div
            className="bakery-title"
            onClick={handleTitleClick}
            title="Klicke mich oft für ein Geheimnis!"
          >
            Keks Imperium
          </div>

          <div className="cookie-score-hud">
            <span className="cookie-count-big">{fmtCookies(gs.cookies)}</span>
            <span className="cookie-cps-display">
              {fmtCookies(currentCps)} PRO SEKUNDE
              {gs.ascensionCount > 0 && (
                <span style={{ color: '#00e5ff', marginLeft: '6px' }}>
                  (x{Math.pow(2, gs.ascensionCount)} Multi)
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: '#00e5ff', background: 'rgba(0, 229, 255, 0.12)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.35)' }}>
                💎 {Number(gs.gems || 0).toLocaleString('de-DE')} DIAMANTEN
              </span>
              {gs.ascensionCount > 0 && (
                <span style={{ fontSize: '0.48rem', fontFamily: 'var(--font-pixel)', color: '#ffd700', background: 'rgba(255, 215, 0, 0.12)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255, 215, 0, 0.35)' }}>
                  🌌 STUFE {gs.ascensionCount} ({Math.pow(2, gs.ascensionCount)}x BOOST)
                </span>
              )}
            </div>
          </div>

          {/* Keks-Bereich */}
          <div className="cookie-wrapper">
            <button
              className={`big-cookie-btn ${isGoldRush ? 'sugar-rush-active' : ''}`}
              onClick={handleCookieClick}
              style={{ transform: `scale(${cookieScale})` }}
              aria-label="Keks anklicken"
            >
              {currentSkin.image ? (
                <img
                  src={currentSkin.image}
                  alt={currentSkin.name}
                  className="big-cookie-img"
                />
              ) : (
                <span className="big-cookie-skin-icon">{currentSkin.emoji}</span>
              )}
            </button>

            {/* Wrinkler im Orbit */}
            {gs.wrinklers?.map((w, idx) => {
              const radius = 105;
              const angle = w.angle || (idx * (Math.PI / 2));
              const wx = 85 + Math.cos(angle) * radius - 16;
              const wy = 85 + Math.sin(angle) * radius - 16;
              return (
                <button
                  key={w.id}
                  className="wrinkler-btn"
                  style={{ left: `${wx}px`, top: `${wy}px` }}
                  onClick={() => popWrinkler(w.id)}
                  title="Klick 3x zum Zerplatzen!"
                >
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-pixel)', color: '#ff4444', background: '#222', padding: '2px 5px', borderRadius: '4px', border: '1px solid #ff4444' }}>
                    W
                  </span>
                </button>
              );
            })}

            <FloatingNumbers floats={floats} />
          </div>

          <div className="click-val-badge">
            +{fmtCookies(clickVal)} PRO KLICK
          </div>

          {/* Aktives Random Event Banner */}
          {activeEvent && (
            <div className="random-event-banner">
              <div className="random-event-header">
                <span>⚡ {activeEvent.name}</span>
                <span>{activeEvent.remaining}s</span>
              </div>
              <div className="random-event-progress-track">
                <div
                  className="random-event-progress-fill"
                  style={{ width: `${(activeEvent.remaining / activeEvent.duration) * 100}%` }}
                />
              </div>
              <div className="random-event-desc">{activeEvent.desc}</div>
            </div>
          )}
        </div>

        {/* RECHTE SPALTE: Multi-Buy, Tabs und Inhalte */}
        <div className="clicker-right">
          <div className="clicker-top-controls">
            <div className="buy-amount-selector">
              {[1, 10, 100, 'max'].map(amt => (
                <button
                  key={amt}
                  className={`buy-amount-btn ${buyAmount === amt ? 'active' : ''}`}
                  onClick={() => setBuyAmount(amt)}
                >
                  {amt === 'max' ? 'MAX' : `${amt}x`}
                </button>
              ))}
            </div>
          </div>

          <div className="clicker-tabs">
            {[
              { id: 'buildings', label: 'GEBÄUDE' },
              { id: 'upgrades', label: `UPGRADES (${UPGRADES.filter(u => !gs.upgrades?.includes(u.id) && gs.cookies >= u.cost * 0.5).length})` },
              { id: 'casino', label: '🎰 CASINO' },
              { id: 'stocks', label: 'BÖRSE' },
              { id: 'prestige', label: `AUFSTIEG (LVL ${gs.ascensionCount || 0})` },
              { id: 'skins', label: 'SKINS' },
              { id: 'achievements', label: 'ERFOLGE' },
            ].map(t => (
              <button
                key={t.id}
                className={`clicker-tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: GEBÄUDE */}
          {tab === 'buildings' && (
            <div className="building-list">
              {BUILDINGS.map(b => {
                const owned = gs.buildings[b.id] ?? 0;
                let cost = 0;
                let count = 1;
                let canAfford = false;

                if (buyAmount === 'max') {
                  const maxRes = maxAffordable(b, owned, gs.cookies);
                  count = maxRes.count;
                  cost = count > 0 ? maxRes.cost : buildingCost(b, owned, 1);
                  canAfford = count > 0;
                } else {
                  count = buyAmount;
                  cost = buildingCost(b, owned, buyAmount);
                  canAfford = gs.cookies >= cost;
                }

                return (
                  <button
                    key={b.id}
                    className={`building-card ${canAfford ? 'affordable' : 'locked'}`}
                    onClick={() => buyBuilding(b, buyAmount)}
                    disabled={!canAfford}
                  >
                    <div className="building-tag" style={{ color: b.color, borderColor: b.color }}>
                      {b.tag}
                    </div>

                    <div className="building-info">
                      <div className="building-title-row">
                        <span className="building-name">{b.name}</span>
                        <span className="building-cps-rate">
                          +{fmtCookies(b.baseCps * (buyAmount === 'max' ? (count || 1) : count))}/s
                          {buyAmount === 'max' && count > 0 && (
                            <span style={{ color: '#39ff14', marginLeft: '6px', fontWeight: 'bold' }}>
                              (+{count})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="building-desc">{b.desc}</div>
                    </div>

                    <div className="building-action-wrap">
                      <div className="building-cost">{fmtCookies(cost)} 🍪</div>
                      <div className="building-owned-badge">{owned}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: UPGRADES */}
          {tab === 'upgrades' && (
            <div className="upgrade-list">
              {UPGRADES.map(u => {
                const bought = gs.upgrades?.includes(u.id);
                const canAfford = gs.cookies >= u.cost;
                return (
                  <div
                    key={u.id}
                    className={`upgrade-row ${bought ? 'bought' : ''} ${!canAfford && !bought ? 'disabled' : ''}`}
                    onClick={() => !bought && buyUpgrade(u)}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="upgrade-name">{u.name}</div>
                      <div className="upgrade-desc">{u.desc}</div>
                    </div>
                    <div className="upgrade-cost">
                      {bought ? 'GEKAUFT' : fmtCookies(u.cost)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: GLÜCKSSPIEL */}
          {tab === 'casino' && (
            <ClickerGamblingTab
              cookies={gs.cookies}
              gems={gs.gems || 0}
              diamondOvens={gs.diamondOvens || 0}
              vipLuckyCharm={Boolean(gs.vipLuckyCharm)}
              casinoInsuranceCharges={gs.casinoInsuranceCharges || 0}
              unlockedGemSkins={gs.unlockedGemSkins || []}
              currentCps={currentCps}
              lastTimeWarpUsed={gs.lastTimeWarpUsed || 0}
              lastGoldFrenzyUsed={gs.lastGoldFrenzyUsed || 0}
              onUpdateCookies={(delta) => {
                if (!gsRef.current) return;
                gsRef.current.cookies = Math.max(0, gsRef.current.cookies + delta);
                if (delta > 0) {
                  gsRef.current.totalCookies = (gsRef.current.totalCookies || 0) + delta;
                }
                setGs({ ...gsRef.current });
              }}
              onUpdateGems={(delta) => {
                if (!gsRef.current) return;
                gsRef.current.gems = Math.max(0, (gsRef.current.gems || 0) + delta);
                setGs({ ...gsRef.current });
              }}
              onBuyPerk={handleBuyGemPerk}
              onUpdateState={handleUpdateState}
              onTriggerEvent={(evtId) => {
                triggerSpecificEvent(evtId);
              }}
              initialSubTab={initialCasinoSubTab}
            />
          )}

          {/* TAB 3: BÖRSE 2.0 */}
          {tab === 'stocks' && (() => {
            const portfolio = calcPortfolioValue(gs.stockPrices, gs.stockShares, gs.stockBuyPrices);
            const sectors = [...new Set(INITIAL_STOCKS.map(s => s.sector))];
            return (
              <div className="stocks-terminal">
                {/* Portfolio-Übersicht */}
                <div className="stocks-portfolio-bar">
                  <div className="stocks-portfolio-item">
                    <span className="stocks-portfolio-label">PORTFOLIO-WERT</span>
                    <span className="stocks-portfolio-value" style={{ color: '#ffd700' }}>{fmtCookies(portfolio.totalValue)}</span>
                  </div>
                  <div className="stocks-portfolio-item">
                    <span className="stocks-portfolio-label">INVESTIERT</span>
                    <span className="stocks-portfolio-value">{fmtCookies(portfolio.totalCost)}</span>
                  </div>
                  <div className="stocks-portfolio-item">
                    <span className="stocks-portfolio-label">UNREALIS. P&L</span>
                    <span className="stocks-portfolio-value" style={{ color: portfolio.profit >= 0 ? '#90be6d' : '#f94144' }}>
                      {portfolio.profit >= 0 ? '+' : ''}{fmtCookies(portfolio.profit)}
                    </span>
                  </div>
                  <div className="stocks-portfolio-item">
                    <span className="stocks-portfolio-label">REALIS. PROFIT</span>
                    <span className="stocks-portfolio-value" style={{ color: (gs.stockProfitRealized||0) >= 0 ? '#90be6d' : '#f94144' }}>
                      {(gs.stockProfitRealized||0) >= 0 ? '+' : ''}{fmtCookies(gs.stockProfitRealized||0)}
                    </span>
                  </div>
                  <div className="stocks-portfolio-item">
                    <span className="stocks-portfolio-label">DIVIDENDEN</span>
                    <span className="stocks-portfolio-value" style={{ color: '#90be6d' }}>+{fmtCookies(gs.totalDividendsEarned||0)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.48rem', color: 'var(--muted)', padding: '4px 12px 8px', borderBottom: '1px solid #2a2a2a' }}>
                  KURSE FLUKTUIEREN ALLE 6 SEKUNDEN ∙ DIVIDENDEN ALLE 60 SEKUNDEN ∙ MENGE: {buyAmount === 'max' ? 'MAX' : `${buyAmount}x`}
                </div>

                {/* Event-Banner: Börsen-Downfall oder Börsen-Rallye */}
                {activeEvent?.id === 'stock_downfall' && (
                  <div style={{
                    background: 'linear-gradient(90deg, rgba(249, 65, 68, 0.25), rgba(180, 0, 0, 0.45), rgba(249, 65, 68, 0.25))',
                    border: '1px solid #f94144',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    margin: '8px 12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 20px rgba(249, 65, 68, 0.4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>🚨</span>
                      <div>
                        <div style={{ color: '#f94144', fontFamily: 'var(--font-pixel)', fontSize: '0.62rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                          BÖRSEN-DOWNFALL AKTIV! (-70% FLASH-CRASH)
                        </div>
                        <div style={{ color: '#fff', fontSize: '0.48rem', opacity: 0.9, marginTop: '2px' }}>
                          Massiver Panikverkauf an der Keks-Wallstreet! Kurse am Boden — Nutze den Rabatt und KAUF DEN DIP!
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#ffd700', fontFamily: 'var(--font-pixel)', fontSize: '0.75rem', padding: '4px 8px', background: '#2a0505', borderRadius: '4px', border: '1px solid #f94144' }}>
                      {activeEvent.remaining}s
                    </div>
                  </div>
                )}

                {activeEvent?.id === 'stock_rally' && (
                  <div style={{
                    background: 'linear-gradient(90deg, rgba(57, 255, 20, 0.18), rgba(0, 160, 50, 0.35), rgba(57, 255, 20, 0.18))',
                    border: '1px solid #39ff14',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    margin: '8px 12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📈</span>
                      <div>
                        <div style={{ color: '#39ff14', fontFamily: 'var(--font-pixel)', fontSize: '0.62rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                          BÖRSEN-RALLYE AKTIV! (+100% KURSE)
                        </div>
                        <div style={{ color: '#fff', fontSize: '0.48rem', opacity: 0.9, marginTop: '2px' }}>
                          Keks-Märkte explodieren! Allzeithochs überall — Perfekter Zeitpunkt für massive Gewinnmitnahmen!
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#ffd700', fontFamily: 'var(--font-pixel)', fontSize: '0.75rem', padding: '4px 8px', background: '#052a0a', borderRadius: '4px', border: '1px solid #39ff14' }}>
                      {activeEvent.remaining}s
                    </div>
                  </div>
                )}

                {/* Sektoren */}
                {sectors.map(sector => (
                  <div key={sector} className="stocks-sector">
                    <div className="stocks-sector-header">{sector}</div>
                    {INITIAL_STOCKS.filter(s => s.sector === sector).map(st => {
                      const sd = gs.stockPrices?.[st.id] || { price: st.basePrice, history: [st.basePrice] };
                      const shares = gs.stockShares?.[st.id] || 0;
                      const buyPrice = gs.stockBuyPrices?.[st.id] || st.basePrice;
                      const isUp = (sd.history?.slice(-1)[0] ?? 0) >= (sd.history?.slice(-2)[0] ?? 0);
                      const pct = ((sd.price - sd.history?.[0]) / (sd.history?.[0] || 1) * 100).toFixed(1);
                      const positionPnl = shares > 0 ? (sd.price - buyPrice) * shares : 0;
                      const positionPct = shares > 0 ? ((sd.price - buyPrice) / buyPrice * 100).toFixed(1) : null;
                      const maxAffordable = sd.price > 0 ? Math.floor(gs.cookies / sd.price) : 0;
                      const canBuy = buyAmount === 'max' ? maxAffordable > 0 : gs.cookies >= sd.price * buyAmount;
                      const canSell = buyAmount === 'max' ? shares > 0 : shares >= buyAmount;
                      const accrued = sd.dividendAccrued || 0;
                      const nextDiv = accrued > 0.1 ? fmtCookies(Math.floor(accrued * shares)) : null;
                      return (
                        <div key={st.id} className="stock-row">
                          <div className="stock-chart-col">
                            <StockChart history={sd.history} color={st.color} />
                          </div>
                          <div className="stock-info-col">
                            <div className="stock-ticker-row">
                              <span className="stock-ticker" style={{ color: st.color }}>{st.ticker}</span>
                              <span className="stock-name-small">{st.name}</span>
                              <span className="stock-sector-badge">{st.sector}</span>
                            </div>
                            <div className="stock-price-row">
                              <span className="stock-price" style={{ color: isUp ? '#90be6d' : '#f94144' }}>
                                {fmtCookies(sd.price)}
                              </span>
                              <span className="stock-change" style={{ color: isUp ? '#90be6d' : '#f94144' }}>
                                {isUp ? '▲' : '▼'} {pct}%
                              </span>
                              <span className="stock-div-rate">DIV: {(st.dividendRate * 100).toFixed(1)}%</span>
                              {sd.allTimeHigh && <span className="stock-ath">ATH: {fmtCookies(sd.allTimeHigh)}</span>}
                            </div>
                            {shares > 0 && (
                              <div className="stock-position-row">
                                <span style={{ color: 'var(--muted)', fontSize: '0.45rem' }}>
                                  {shares} Aktien @ Ø {fmtCookies(Math.floor(buyPrice))}
                                </span>
                                <span style={{ color: positionPnl >= 0 ? '#90be6d' : '#f94144', fontSize: '0.48rem', fontFamily: 'var(--font-pixel)' }}>
                                  {positionPnl >= 0 ? '+' : ''}{fmtCookies(positionPnl)} ({positionPct}%)
                                </span>
                                {nextDiv && <span style={{ color: '#ffa62b', fontSize: '0.4rem' }}>DIV bereit: ~{nextDiv}</span>}
                              </div>
                            )}
                          </div>
                          <div className="stock-actions-col">
                            <button
                              className="btn btn-primary"
                              disabled={!canBuy}
                              onClick={() => buyStock(st.id, buyAmount)}
                              style={{ fontSize: '0.42rem', minHeight: '30px', padding: '4px 10px' }}
                            >
                              KAUFEN {buyAmount === 'max' ? `(MAX: ${maxAffordable}x)` : (buyAmount > 1 ? `(${buyAmount}x)` : '')}
                            </button>
                            <button
                              className="btn btn-outline"
                              disabled={!canSell}
                              onClick={() => sellStock(st.id, buyAmount)}
                              style={{ fontSize: '0.42rem', minHeight: '30px', padding: '4px 10px' }}
                            >
                              VERKAUFEN {buyAmount === 'max' ? `(ALLE: ${shares}x)` : (buyAmount > 1 ? `(${buyAmount}x)` : '')}
                            </button>
                            {shares > 0 && buyAmount !== 'max' && (
                              <button
                                className="btn"
                                onClick={() => sellStock(st.id, shares)}
                                style={{ fontSize: '0.38rem', minHeight: '26px', padding: '3px 8px', background: '#3a0a0a', borderColor: '#f94144', color: '#f94144' }}
                              >
                                ALLES
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* TAB 4: EXPONENTIELLER AUFSTIEGS-HUB */}
          {tab === 'prestige' && (() => {
            const currentCount = gs.ascensionCount || 0;
            const currentTier = getAscensionTier(currentCount);
            const nextTier = getNextAscensionTier(currentCount);
            const eligibleLevel = getEligibleAscensionLevel(gs.totalCookies || 0);
            const canAscend = eligibleLevel > currentCount || (nextTier && (gs.totalCookies || 0) >= nextTier.reqCookies);
            const currentMultiplier = Math.pow(2, currentCount);
            const nextMultiplier = nextTier ? Math.pow(2, Math.max(currentCount + 1, eligibleLevel)) : currentMultiplier * 2;

            const prevReq = currentTier ? currentTier.reqCookies : 0;
            const nextReq = nextTier ? nextTier.reqCookies : 1;
            const progressPercent = nextTier
              ? Math.min(100, Math.max(0, (((gs.totalCookies || 0) - prevReq) / (nextReq - prevReq)) * 100))
              : 100;

            return (
              <div className="heavenly-shrine">
                {/* Hero Header Box */}
                <div className="heavenly-header-box">
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem', color: '#bf5af2', letterSpacing: '1px' }}>
                    🌌 EXPONENTIELLER AUFSTIEGS-KOSMOS
                  </div>

                  <div className="heavenly-chips-available" style={{ color: '#00e5ff', textShadow: '0 0 16px rgba(0, 229, 255, 0.6)' }}>
                    ⚡ {currentMultiplier}x PERMANENTER MULTIPLIKATOR
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#ccc', marginBottom: '16px', lineHeight: 1.6 }}>
                    Aktuelle Stufe: <strong style={{ color: '#ffd700' }}>Level {currentCount} {currentTier ? `(${currentTier.title})` : '(Novize)'}</strong><br />
                    Lebenszeit-Cookies: <strong style={{ color: 'var(--accent)' }}>{fmtCookies(gs.totalCookies || 0)}</strong><br />
                    {nextTier ? (
                      <span>
                        Nächstes Ziel: <strong style={{ color: '#39ff14' }}>Level {nextTier.level} ({nextTier.title})</strong> &bull; Benötigt <strong style={{ color: '#fff' }}>{fmtCookies(nextTier.reqCookies)}</strong> ({Math.floor(progressPercent)}%)
                      </span>
                    ) : (
                      <span style={{ color: '#39ff14' }}>Höchste bekannte Stufe erreicht! Weiterer exponentieller Aufstieg möglich.</span>
                    )}
                  </div>

                  {/* Fortschrittsbalken */}
                  {nextTier && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.52rem', color: '#aaa', marginBottom: '4px', fontFamily: 'var(--font-pixel)' }}>
                        <span>{fmtCookies(gs.totalCookies || 0)} COOKIES</span>
                        <span>ZIEL: {fmtCookies(nextTier.reqCookies)}</span>
                      </div>
                      <div style={{ width: '100%', height: '12px', background: '#111', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                        <div
                          style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: canAscend ? 'linear-gradient(90deg, #39ff14, #00e5ff)' : 'linear-gradient(90deg, #7928ca, #ff0080)',
                            transition: 'width 0.3s ease',
                            boxShadow: canAscend ? '0 0 10px #00e5ff' : 'none',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!canAscend) {
                        alert(`Du benötigst mindestens ${fmtCookies(nextTier ? nextTier.reqCookies : 1000000)} gebackene Cookies für den nächsten Aufstieg!`);
                      } else {
                        setAscendModalOpen(true);
                      }
                    }}
                    style={{
                      background: canAscend ? 'linear-gradient(135deg, #7928ca, #ff0080)' : '#222',
                      borderColor: canAscend ? '#ff0080' : '#444',
                      color: canAscend ? '#fff' : '#666',
                      fontSize: '0.62rem',
                      padding: '12px 24px',
                      boxShadow: canAscend ? '0 0 24px rgba(255, 0, 128, 0.5)' : 'none',
                      cursor: canAscend ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {canAscend
                      ? `🌌 JETZT AUFSTEIGEN (VERDOPPELT MULTIPLIKATOR AUF ${nextMultiplier}x!)`
                      : nextTier
                        ? `🔒 BENÖTIGT ${fmtCookies(nextTier.reqCookies)} COOKIES (NOCH ${fmtCookies(Math.max(0, nextTier.reqCookies - (gs.totalCookies || 0)))})`
                        : 'AUFSTIEG BEREIT'}
                  </button>
                </div>

                <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.72rem', color: '#fff', textAlign: 'left', marginTop: '28px', marginBottom: '14px' }}>
                  STUFEN-ROADMAP & FREISCHALTBARE FÄHIGKEITEN & SKINS
                </h3>

                {/* Tier Roadmap Grid */}
                <div className="heavenly-grid">
                  {ASCENSION_TIERS.map(tier => {
                    const isUnlocked = currentCount >= tier.level;
                    const isNext = !isUnlocked && nextTier && nextTier.level === tier.level;
                    const isSkinEquipped = gs.skin === tier.skinId;

                    return (
                      <div
                        key={tier.level}
                        className={`heavenly-card ${isUnlocked ? 'owned' : ''} ${!isUnlocked && !isNext ? 'locked' : ''}`}
                        style={{
                          borderColor: isUnlocked ? '#39ff14' : isNext ? '#00e5ff' : '#233157',
                          background: isUnlocked ? 'rgba(57, 255, 20, 0.05)' : isNext ? 'rgba(0, 229, 255, 0.05)' : '#111522',
                        }}
                      >
                        <div className="heavenly-card-header">
                          <span className="heavenly-icon" style={{ color: isUnlocked ? '#39ff14' : isNext ? '#00e5ff' : '#70b4ff' }}>
                            {tier.skillIcon}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="heavenly-title">STUFE {tier.level}: {tier.title}</div>
                              <span style={{ fontSize: '0.45rem', fontFamily: 'var(--font-pixel)', color: isUnlocked ? '#39ff14' : isNext ? '#00e5ff' : '#888' }}>
                                {tier.multiplierText} MULTI
                              </span>
                            </div>
                            <div className="heavenly-cost" style={{ color: isUnlocked ? '#39ff14' : '#ffd700' }}>
                              {isUnlocked ? '✓ FREIGESCHALTET' : `${fmtCookies(tier.reqCookies)} COOKIES`}
                            </div>
                          </div>
                        </div>

                        {/* Passive Skill */}
                        <div style={{ background: '#161616', padding: '8px 10px', borderRadius: '6px', border: '1px solid #282828' }}>
                          <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-pixel)', color: '#00e5ff', marginBottom: '2px' }}>
                            ⚡ FÄHIGKEIT: {tier.skillName}
                          </div>
                          <div className="heavenly-desc" style={{ margin: 0, fontSize: '0.62rem' }}>
                            {tier.skillDesc}
                          </div>
                        </div>

                        {/* Skin Reward */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#161616', padding: '8px 10px', borderRadius: '6px', border: '1px solid #282828' }}>
                          <div>
                            <div style={{ fontSize: '0.45rem', color: 'var(--muted)', fontFamily: 'var(--font-pixel)' }}>EXKLUSIVER SKIN:</div>
                            <div style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold' }}>{tier.skinName}</div>
                          </div>
                          {isUnlocked ? (
                            <button
                              className={`btn ${isSkinEquipped ? 'btn-primary' : 'btn-outline'}`}
                              style={{ fontSize: '0.42rem', padding: '4px 8px', minHeight: '26px' }}
                              onClick={() => {
                                gsRef.current.skin = tier.skinId;
                                setGs({ ...gsRef.current });
                                setToasts(t => [...t, { icon: '✨', name: 'SKIN AUSGERÜSTET', desc: tier.skinName }]);
                              }}
                            >
                              {isSkinEquipped ? 'AUSGERÜSTET' : 'AUSRÜSTEN'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.42rem', color: '#666', fontFamily: 'var(--font-pixel)' }}>
                              🔒 GESPERRT
                            </span>
                          )}
                        </div>

                        {/* Status Footer */}
                        <div>
                          {isUnlocked ? (
                            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.48rem', color: '#39ff14' }}>
                              ✓ AKTIV & EXPONENTIELLER BOOST WIRKT
                            </span>
                          ) : isNext ? (
                            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.48rem', color: '#00e5ff' }}>
                              ⏳ NÄCHSTE STUFE &bull; {Math.floor(progressPercent)}%
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.48rem', color: '#666' }}>
                              🔒 GESPERRT (BENÖTIGT STUFE {tier.level - 1})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 5: SKINS */}
          {tab === 'skins' && (
            <div className="skin-grid">
              {SKINS.map(s => {
                const unlocked = isSkinUnlocked(s, gs);
                const active = gs.skin === s.id;
                return (
                  <button
                    key={s.id}
                    className={`skin-card ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}`}
                    onClick={() => {
                      if (unlocked) {
                        gsRef.current.skin = s.id;
                        setGs({ ...gsRef.current });
                      }
                    }}
                    disabled={!unlocked}
                  >
                    <span className="skin-preview">
                      {s.image ? (
                        <img
                          src={s.image}
                          alt={s.name}
                          style={{ imageRendering: 'pixelated', display: 'inline-block' }}
                        />
                      ) : (
                        s.emoji
                      )}
                    </span>
                    <span className="skin-name">{s.name}</span>
                    {!unlocked && <span className="skin-lock-badge">GESPERRT</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 6: STATS & ERFOLGE */}
          {tab === 'achievements' && (
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="hud-item" style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>KLICKS GESAMT</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>
                    {fmtCookies(gs.totalClicks)}
                  </span>
                </div>
                <div className="hud-item" style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>EVENTS GEFANGEN</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>
                    {gs.eventsCaught || 0}
                  </span>
                </div>
                <div className="hud-item" style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>GOLDENE KLICKS</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--font-pixel)' }}>
                    {gs.goldenClicks || 0}
                  </span>
                </div>
              </div>

              <div className="achievement-grid">
                {ACHIEVEMENTS.map(a => {
                  const unlocked = gs.achievements?.includes(a.id);
                  return (
                    <div key={a.id} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                      <span className="achievement-icon">{unlocked ? a.icon : '?'}</span>
                      <div className="achievement-info">
                        <div className="achievement-title">{a.name}</div>
                        <div className="achievement-desc">{a.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Keks-Komet */}
      {activeComet && <CookieComet onCollect={handleCometClick} />}

      {/* Golden Cookie */}
      {goldenVisible && (
        <GoldenCookie
          onCollect={() => {
            setGoldenVisible(false);
            setGoldenBoost(true);
            setTimeout(() => setGoldenBoost(false), 20000);
            if (gsRef.current) {
              gsRef.current.goldenClicks = (gsRef.current.goldenClicks || 0) + 1;
            }
            playFanfare();
            setToasts(t => [...t, { icon: '✨', name: 'GOLDENER COOKIE!', desc: '20s lang doppelte Produktion!' }]);
          }}
        />
      )}

      {/* Offline Dialog */}
      {offlineGain !== null && (
        <OfflineDialog gained={offlineGain} onClose={() => setOfflineGain(null)} />
      )}

      {/* Aufstiegs-Bestätigungs-Modal */}
      {ascendModalOpen && (() => {
        const currentCount = gs.ascensionCount || 0;
        const eligibleLevel = getEligibleAscensionLevel(gs.totalCookies || 0);
        const targetLevel = Math.max(currentCount + 1, eligibleLevel);
        const targetTier = getAscensionTier(targetLevel);
        const currentMultiplier = Math.pow(2, currentCount);
        const newMultiplier = Math.pow(2, targetLevel);

        return (
          <div className="overlay-backdrop" role="dialog" aria-modal="true" onClick={(e) => {
            if (e.target === e.currentTarget) setAscendModalOpen(false);
          }}>
            <div className="overlay-panel" style={{ maxWidth: '520px', borderColor: '#bf5af2', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌌</div>
              <h2 className="overlay-title" style={{ color: '#00e5ff', fontSize: '0.9rem', marginBottom: '14px' }}>
                BEREIT FÜR DEN AUFSTIEG AUF STUFE {targetLevel}?
              </h2>
              <p style={{ color: '#ddd', fontSize: '0.78rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Deine irdischen Cookies, Gebäude und normalen Upgrades werden zurückgesetzt.<br />
                <strong style={{ color: '#39ff14', fontSize: '0.88rem' }}>
                  DU ERHÄLTST EINEN GEWALTIGEN EXPONENTIELLEN BOOST:
                </strong><br />
                🏆 <strong>Aufstieg auf Stufe {targetLevel}: {targetTier?.title}</strong><br />
                ⚡ <strong style={{ color: '#ffd700' }}>Multiplikator verdoppelt sich von {currentMultiplier}x auf {newMultiplier}x!</strong><br />
                {targetTier && (
                  <span>
                    ✨ Neuer Skin: <strong style={{ color: '#00e5ff' }}>{targetTier.skinName}</strong><br />
                    ✦ Neue Fähigkeit: <strong style={{ color: '#39ff14' }}>{targetTier.skillName}</strong> ({targetTier.skillDesc})<br />
                  </span>
                )}
                <br />
                <span style={{ color: '#90be6d', fontSize: '0.72rem' }}>
                  💎 Diamanten, erreichte Achievements und freigeschaltete Skins bleiben dauerhaft erhalten!
                </span>
              </p>
              <div className="overlay-btn-row">
                <button
                  className="btn btn-primary"
                  onClick={executeAscension}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #7928ca, #ff0080)', borderColor: '#ff0080' }}
                >
                  JETZT AUFSTEIGEN ({newMultiplier}x BOOST!)
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setAscendModalOpen(false)}
                >
                  ABBRECHEN
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((toast, i) => (
          <AchievementToast
            key={i}
            achievement={toast}
            onDone={() => setToasts(t => t.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>

      <SaveIndicator visible={saveVisible} />
    </div>
  );
}
