import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, BarChart3, Zap, Building2, Crown, Settings } from "lucide-react";
// Direct localStorage helpers (work regardless of cookie consent)
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* silently fail */ }
}
function lsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* silently fail */ }
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface Building {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cps: number;
  owned: number;
  desc: string;
}

interface ClickUpgrade {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cpcAdd: number;
  owned: number;
}

interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  unlocked: boolean;
  hidden?: boolean;
}

interface GoldenCookie {
  id: number;
  x: number;
  y: number;
  type: "frenzy" | "clickFrenzy" | "lucky" | "storm" | "diamond";
}

interface ClickParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

interface TraderDeal {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  effect: "cps_mult" | "cpc_mult" | "cookies" | "building" | "golden_rush" | "time_warp";
  value: number;
  buildingId?: string;
}

interface LeaderboardEntry {
  name: string;
  cookies: number;
  totalCookies: number;
  prestigeLevel: number;
  achievements: number;
  lastPlayed: number;
}

interface GameState {
  cookies: number;
  totalCookies: number;
  totalClicks: number;
  buildings: Building[];
  clickUpgrades: ClickUpgrade[];
  achievements: Achievement[];
  prestigeLevel: number;
  heavenlyChips: number;
  lastSaveTime: number;
  startTime: number;
  goldenClicked: number;
  easterEggsFound: string[];
  cookieSkin: string;
  pirateMode: boolean;
  duckMode: boolean;
  grandmapocalypse: boolean;
  playerName: string;
  lastRenamed: number;
  leaderboardOptIn?: boolean;
  lastCaptchaTime?: number;
  cookiesBakedAllTime?: number;
}

const playClickSound = (soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch { /* ignored */ }
};

interface CookieSkin {
  id: string;
  name: string;
  emoji: string;
  reqLevel: number;
}

const COOKIE_SKINS: CookieSkin[] = [
  { id: "cookie", name: "Klassisch", emoji: "🍪", reqLevel: 0 },
  { id: "donut", name: "Schoko-Donut", emoji: "🍩", reqLevel: 1 },
  { id: "muffin", name: "Cupcake", emoji: "🧁", reqLevel: 2 },
  { id: "pizza", name: "Pizza-Cookie", emoji: "🍕", reqLevel: 3 },
  { id: "planet", name: "Kosmisch", emoji: "🪐", reqLevel: 5 },
  { id: "diamond", name: "Diamant", emoji: "💎", reqLevel: 8 },
  { id: "royal", name: "Königlich", emoji: "👑", reqLevel: 12 },
  { id: "blackhole", name: "Singularität", emoji: "🌌", reqLevel: 18 },
  { id: "portal", name: "Dimension", emoji: "🌀", reqLevel: 25 },
];

/* ═══════════════════════════════════════════════════════════
   INITIAL DATA
   ═══════════════════════════════════════════════════════════ */

const BUILDINGS: Building[] = [
  { id: "cursor", name: "Auto-Klicker", emoji: "👆", baseCost: 15, cps: 0.1, owned: 0, desc: "Klickt automatisch für dich." },
  { id: "grandma", name: "Oma", emoji: "👵", baseCost: 100, cps: 1, owned: 0, desc: "Backt leckere Cookies." },
  { id: "farm", name: "Cookie-Farm", emoji: "🌾", baseCost: 1100, cps: 8, owned: 0, desc: "Baut Cookie-Teig an." },
  { id: "mine", name: "Cookie-Mine", emoji: "⛏️", baseCost: 12000, cps: 47, owned: 0, desc: "Gräbt nach seltenen Schoko-Chips." },
  { id: "factory", name: "Fabrik", emoji: "🏭", baseCost: 130000, cps: 260, owned: 0, desc: "Massenproduziert Cookies." },
  { id: "bank", name: "Cookie-Bank", emoji: "🏦", baseCost: 1400000, cps: 1400, owned: 0, desc: "Generiert Cookie-Zinsen." },
  { id: "temple", name: "Tempel", emoji: "⛪", baseCost: 20000000, cps: 7800, owned: 0, desc: "Betet zum Cookie-Gott." },
  { id: "wizard", name: "Zauberer-Turm", emoji: "🧙", baseCost: 330000000, cps: 44000, owned: 0, desc: "Beschwört Cookies mit Magie." },
  { id: "ship", name: "Cookie-Schiff", emoji: "🚀", baseCost: 5100000000, cps: 260000, owned: 0, desc: "Importiert Cookies aus dem All." },
  { id: "lab", name: "Alchemie-Lab", emoji: "🧪", baseCost: 75000000000, cps: 1600000, owned: 0, desc: "Verwandelt Gold in Cookies." },
  { id: "portal", name: "Portal", emoji: "🌀", baseCost: 1000000000000, cps: 10000000, owned: 0, desc: "Öffnet ein Tor in die Cookie-Dimension." },
  { id: "tea", name: "Tee-Maschine", emoji: "☕", baseCost: 14000000000000, cps: 65000000, owned: 0, desc: "Brüht Cookie-Tee — natürlich mit Cookies." },
  { id: "quantum", name: "Quanten-Ofen", emoji: "⚛️", baseCost: 170000000000000, cps: 430000000, owned: 0, desc: "Backt in allen Dimensionen gleichzeitig." },
  { id: "galaxy", name: "Cookie-Galaxie", emoji: "🌌", baseCost: 2100000000000000, cps: 2900000000, owned: 0, desc: "Eine ganze Galaxie voller Cookies." },
  { id: "time", name: "Zeitmaschine", emoji: "⏳", baseCost: 26000000000000000, cps: 21000000000, owned: 0, desc: "Holt Cookies aus der Zukunft." },
  { id: "condenser", name: "Antimaterie-K.", emoji: "💫", baseCost: 310000000000000000, cps: 150000000000, owned: 0, desc: "Verdichtet Antimaterie zu Cookies." },
  { id: "prism", name: "Prisma", emoji: "🔮", baseCost: 7100000000000000000, cps: 1100000000000, owned: 0, desc: "Verwandelt Licht in Cookies." },
  { id: "chance", name: "Glücksmaschine", emoji: "🎰", baseCost: 12000000000000000000, cps: 8300000000000, owned: 0, desc: "Gewinnt immer den Cookie-Jackpot." },
  { id: "fractal", name: "Fraktal-Motor", emoji: "🔬", baseCost: 19900000000000000000, cps: 64000000000000, owned: 0, desc: "Unendlich viele Cookie-Dimensionen." },
  { id: "multiverse", name: "Multiversum", emoji: "🌐", baseCost: 39900000000000000000, cps: 510000000000000, owned: 0, desc: "Cookies aus ALLEN Universen." },
];

const CLICK_UPGRADES: ClickUpgrade[] = [
  { id: "click1", name: "Super-Finger", emoji: "⚡", baseCost: 50, cpcAdd: 1, owned: 0 },
  { id: "click2", name: "Mega-Finger", emoji: "🚀", baseCost: 500, cpcAdd: 5, owned: 0 },
  { id: "click3", name: "Hyper-Finger", emoji: "💥", baseCost: 5000, cpcAdd: 25, owned: 0 },
  { id: "click4", name: "Ultra-Finger", emoji: "🪐", baseCost: 50000, cpcAdd: 120, owned: 0 },
  { id: "click5", name: "Omega-Finger", emoji: "👑", baseCost: 500000, cpcAdd: 600, owned: 0 },
  { id: "click6", name: "Göttlicher Finger", emoji: "✨", baseCost: 5000000, cpcAdd: 3000, owned: 0 },
  { id: "click7", name: "Kosmo-Finger", emoji: "🌠", baseCost: 50000000, cpcAdd: 15000, owned: 0 },
  { id: "click8", name: "Quanten-Finger", emoji: "🔆", baseCost: 500000000, cpcAdd: 80000, owned: 0 },
  { id: "click9", name: "Infinity-Finger", emoji: "♾️", baseCost: 5000000000, cpcAdd: 450000, owned: 0 },
  { id: "click10", name: "ÜBER-Finger", emoji: "🫳", baseCost: 50000000000, cpcAdd: 2500000, owned: 0 },
];

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // Cookie milestones
  { id: "cookie_100", name: "Erste Schritte", emoji: "🍪", desc: "100 Cookies gebacken", unlocked: false },
  { id: "cookie_1k", name: "Kleiner Bäcker", emoji: "🧁", desc: "1.000 Cookies gebacken", unlocked: false },
  { id: "cookie_100k", name: "Cookie-Meister", emoji: "🎂", desc: "100.000 Cookies gebacken", unlocked: false },
  { id: "cookie_1m", name: "Millionen-Bäcker", emoji: "💰", desc: "1 Million Cookies", unlocked: false },
  { id: "cookie_1b", name: "Milliardär-Bäcker", emoji: "💎", desc: "1 Milliarde Cookies", unlocked: false },
  { id: "cookie_1t", name: "One Small Cookie for Man", emoji: "🌕", desc: "1 Billion Cookies — Mondlandung!", unlocked: false, hidden: true },
  // Click milestones
  { id: "click_100", name: "Klick-Neuling", emoji: "👆", desc: "100 mal geklickt", unlocked: false },
  { id: "click_1k", name: "Klick-Veteran", emoji: "🖱️", desc: "1.000 mal geklickt", unlocked: false },
  { id: "click_10k", name: "Regenbogen-Klicker", emoji: "🌈", desc: "10.000 mal geklickt", unlocked: false, hidden: true },
  { id: "click_50k", name: "Unaufhaltsam", emoji: "⚡", desc: "50.000 mal geklickt", unlocked: false },
  // Building milestones
  { id: "first_building", name: "Hausbesitzer", emoji: "🏠", desc: "Erstes Gebäude gekauft", unlocked: false },
  { id: "own_100", name: "Immobilien-Mogul", emoji: "🏗️", desc: "100 Gebäude insgesamt", unlocked: false },
  { id: "own_500", name: "Cookie-Imperium", emoji: "👑", desc: "500 Gebäude insgesamt", unlocked: false },
  { id: "skynet", name: "Skynet Approved", emoji: "🤖", desc: "100 Auto-Klicker gekauft", unlocked: false, hidden: true },
  { id: "grandmapocalypse", name: "Grandmapocalypse", emoji: "👵💀", desc: "50 Omas ... sie übernehmen!", unlocked: false, hidden: true },
  { id: "wizard_7", name: "Du bist ein Zauberer!", emoji: "🧙", desc: "7 Zauberer-Türme gekauft", unlocked: false, hidden: true },
  // Easter eggs
  { id: "nice", name: "Nice.", emoji: "😏", desc: "69 Cookies gehabt", unlocked: false, hidden: true },
  { id: "blaze", name: "Blazing Cookies", emoji: "🔥", desc: "420 Cookies gehabt", unlocked: false, hidden: true },
  { id: "devil", name: "Devil's Dozen", emoji: "💀", desc: "666 Cookies gehabt", unlocked: false, hidden: true },
  { id: "leet", name: "L33T BAKER", emoji: "💻", desc: "1337 Cookies gehabt", unlocked: false, hidden: true },
  { id: "answer", name: "The Answer", emoji: "🌌", desc: "42 von irgendwas besitzen", unlocked: false, hidden: true },
  { id: "konami", name: "↑↑↓↓←→←→BA", emoji: "🎮", desc: "Den Code eingegeben", unlocked: false, hidden: true },
  { id: "midnight", name: "Midnight Baker", emoji: "🌙", desc: "Zwischen 22-6 Uhr gespielt", unlocked: false, hidden: true },
  { id: "speed_demon", name: "Speed Demon", emoji: "🐱", desc: "50 Klicks in 5 Sekunden", unlocked: false, hidden: true },
  { id: "golden_1", name: "Gold-Finder", emoji: "🌟", desc: "Ersten goldenen Cookie geklickt", unlocked: false },
  { id: "golden_10", name: "Gold-Jäger", emoji: "⭐", desc: "10 goldene Cookies geklickt", unlocked: false },
  { id: "golden_50", name: "Gold-Maniac", emoji: "🏆", desc: "50 goldene Cookies geklickt", unlocked: false, hidden: true },
  { id: "prestige_1", name: "Aufgestiegener", emoji: "🔄", desc: "Zum ersten Mal ascended", unlocked: false },
  { id: "xmas", name: "Santa's Helper", emoji: "🎅", desc: "Am 24./25. Dez gespielt", unlocked: false, hidden: true },
  { id: "halloween", name: "Spooky Baker", emoji: "🎃", desc: "An Halloween gespielt", unlocked: false, hidden: true },
  { id: "moo", name: "Moo!", emoji: "🐄", desc: "Secret Code: moo", unlocked: false, hidden: true },
  { id: "quack", name: "Quack!", emoji: "🦆", desc: "Secret Code: quack", unlocked: false, hidden: true },
  { id: "pizza", name: "Falsches Spiel!", emoji: "🍕", desc: "Secret Code: pizza", unlocked: false, hidden: true },
  { id: "pirate", name: "Yarr!", emoji: "🏴‍☠️", desc: "Secret Code: yarr", unlocked: false, hidden: true },
  { id: "snake", name: "Wrong Game!", emoji: "🐍", desc: "Secret Code: snake", unlocked: false, hidden: true },
  { id: "elite_time", name: "Elite Baker", emoji: "⏰", desc: "Um genau 13:37 Uhr gespielt", unlocked: false, hidden: true },
  { id: "diamond", name: "Diamond Cookie!", emoji: "💎", desc: "Seltenen Diamond Cookie gefunden", unlocked: false, hidden: true },
];

/* ═══════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

function formatNumber(n: number): string {
  if (!isFinite(n)) return "∞";
  const units = [
    { val: 1e66, suf: "UnVig" }, { val: 1e63, suf: "Vig" },
    { val: 1e60, suf: "NoD" }, { val: 1e57, suf: "OcD" },
    { val: 1e54, suf: "SpD" }, { val: 1e51, suf: "SxD" },
    { val: 1e48, suf: "QiD" }, { val: 1e45, suf: "QaD" },
    { val: 1e42, suf: "TrD" }, { val: 1e39, suf: "DuD" },
    { val: 1e36, suf: "UnD" }, { val: 1e33, suf: "Dec" },
    { val: 1e30, suf: "Non" }, { val: 1e27, suf: "Oct" },
    { val: 1e24, suf: "Sep" }, { val: 1e21, suf: "Sxt" },
    { val: 1e18, suf: "Qi" }, { val: 1e15, suf: "Qa" },
    { val: 1e12, suf: "T" }, { val: 1e9, suf: "B" },
    { val: 1e6, suf: "M" }, { val: 1e3, suf: "K" },
  ];
  for (const u of units) {
    if (n >= u.val) return `${(n / u.val).toFixed(1)}${u.suf}`;
  }
  return Math.floor(n).toLocaleString("de-DE");
}

function getCost(baseCost: number, owned: number): number {
  return Math.floor(baseCost * Math.pow(1.15, owned));
}

function getBulkCost(baseCost: number, owned: number, count: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(baseCost * Math.pow(1.15, owned + i));
  }
  return total;
}

function getMaxAffordable(baseCost: number, owned: number, cookies: number): { count: number; cost: number } {
  let count = 0;
  let totalCost = 0;
  while (true) {
    const nextCost = Math.floor(baseCost * Math.pow(1.15, owned + count));
    if (totalCost + nextCost <= cookies) {
      totalCost += nextCost;
      count++;
    } else {
      break;
    }
  }
  return { count, cost: totalCost };
}

function getSeasonalEmoji(): string | null {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  if (m === 11 && (d === 24 || d === 25)) return "🎄";
  if (m === 9 && d === 31) return "🎃";
  return null;
}

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

function isEliteTime(): boolean {
  const now = new Date();
  return now.getHours() === 13 && now.getMinutes() === 37;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function CookieClicker() {
  // ── State ──
  const [cookies, setCookies] = useState(0);
  const [totalCookies, setTotalCookies] = useState(0);
  const [cookiesBakedAllTime, setCookiesBakedAllTime] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [buildings, setBuildings] = useState<Building[]>(() => BUILDINGS.map((b) => ({ ...b })));
  const [clickUpgrades, setClickUpgrades] = useState<ClickUpgrade[]>(() => CLICK_UPGRADES.map((u) => ({ ...u })));
  const [achievements, setAchievements] = useState<Achievement[]>(() => INITIAL_ACHIEVEMENTS.map((a) => ({ ...a })));
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [heavenlyChips, setHeavenlyChips] = useState(0);
  const [goldenClicked, setGoldenClicked] = useState(0);
  const [easterEggsFound, setEasterEggsFound] = useState<string[]>([]);
  const [startTime] = useState(() => Date.now());
  const [lastSaveTime, setLastSaveTime] = useState(() => Date.now());

  const [activeTab, setActiveTab] = useState<"buildings" | "clicks" | "achievements" | "stats" | "leaderboard" | "admin">("buildings");
  const [buyMode, setBuyMode] = useState<1 | 10 | 100 | "max">(1);
  const [particles, setParticles] = useState<ClickParticle[]>([]);
  const [goldenCookies, setGoldenCookies] = useState<GoldenCookie[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeEffects, setActiveEffects] = useState<{ frenzy: number; clickFrenzy: number }>({ frenzy: 0, clickFrenzy: 0 });
  const [cookieSkin, setCookieSkin] = useState("🍪");
  const [pirateMode, setPirateMode] = useState(false);
  const [duckMode, setDuckMode] = useState(false);
  const [grandmapocalypse, setGrandmapocalypse] = useState(false);
  const [showAscendModal, setShowAscendModal] = useState(false);
  const [rainbowMode, setRainbowMode] = useState(false);
  const [cookieStorm, setCookieStorm] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [lastRenamed, setLastRenamed] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [nameError, setNameError] = useState("");
  const [editingPlayerName, setEditingPlayerName] = useState<string | null>(null);
  const [editCookiesInput, setEditCookiesInput] = useState("");
  const [editPrestigeInput, setEditPrestigeInput] = useState("");
  const [editAchievementsInput, setEditAchievementsInput] = useState("");
  const [traderDeals, setTraderDeals] = useState<TraderDeal[]>([]);
  const [traderVisible, setTraderVisible] = useState(false);
  const [traderTimer, setTraderTimer] = useState(0);
  const [saveFlash, setSaveFlash] = useState(false);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState<{ num1: number; num2: number; options: number[] }>({ num1: 0, num2: 0, options: [] });
  const [lastCaptchaTime, setLastCaptchaTime] = useState(() => Date.now());
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const titleClicksRef = useRef(0);
  const [uiScale, setUiScale] = useState<number>(() => {
    const s = lsGet("cc_ui_scale");
    return s ? parseFloat(s) : 1.0;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const s = lsGet("cc_sound_enabled");
    return s !== "false";
  });
  const [bgEffectsEnabled, setBgEffectsEnabled] = useState<boolean>(() => {
    const s = lsGet("cc_bg_effects_enabled");
    return s !== "false";
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // ── Refs ──
  const konamiRef = useRef<string[]>([]);
  const secretWordRef = useRef("");
  const clickTimesRef = useRef<number[]>([]);
  const particleIdRef = useRef(0);
  const goldenIdRef = useRef(0);
  const cookieRef = useRef<HTMLButtonElement>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const numberEggsTriggeredRef = useRef<Set<string>>(new Set());
  const lastSyncRef = useRef(0);
  const buyingDealsRef = useRef<Set<string>>(new Set());
  const clickedGoldenIdsRef = useRef<Set<number>>(new Set());
  const isAscendingRef = useRef(false);

  // ── Derived values ──
  const prestigeMultiplier = 1 + heavenlyChips * 0.1;
  const nightBonus = isNightTime() ? 2 : 1;
  const frenzyMultiplier = activeEffects.frenzy > 0 ? 4 : 1;
  const baseCps = buildings.reduce((sum, b) => sum + b.cps * b.owned, 0);
  const cps = baseCps * prestigeMultiplier * nightBonus * frenzyMultiplier;
  const clickFrenzyMultiplier = activeEffects.clickFrenzy > 0 ? 77 : 1;
  const baseCpc = 1 + clickUpgrades.reduce((sum, u) => sum + u.cpcAdd * u.owned, 0);
  const cpc = baseCpc * prestigeMultiplier * clickFrenzyMultiplier;
  const totalBuildings = buildings.reduce((sum, b) => sum + b.owned, 0);
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;
  const potentialHeavenly = Math.floor(Math.pow(cookiesBakedAllTime / 1000000, 0.5));
  const nextChipLevel = Math.max(potentialHeavenly, heavenlyChips) + 1;
  const nextChipThreshold = 1000000 * Math.pow(nextChipLevel, 2);
  const isAdmin = isAdminUnlocked;

  // ── Notification helper ──
  const showNotification = useCallback((msg: string) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(msg);
    notifTimerRef.current = setTimeout(() => setNotification(null), 4000);
  }, []);

  const addCookies = useCallback((amount: number) => {
    setCookies((c) => c + amount);
    setTotalCookies((t) => t + amount);
    setCookiesBakedAllTime((a) => a + amount);
  }, []);

  // ── Unlock achievement (safe: no-ops if already unlocked) ──
  const unlock = useCallback((id: string) => {
    setAchievements((prev) => {
      const a = prev.find((x) => x.id === id);
      if (!a || a.unlocked) return prev;
      showNotification(`🏆 Achievement: ${a.name} ${a.emoji}`);
      return prev.map((x) => (x.id === id ? { ...x, unlocked: true } : x));
    });
  }, [showNotification]);

  // ── Easter egg tracker (safe: no-ops if already found) ──
  const findEasterEgg = useCallback((id: string, msg: string) => {
    setEasterEggsFound((prev) => {
      if (prev.includes(id)) return prev;
      showNotification(`🥚 Easter Egg: ${msg}`);
      return [...prev, id];
    });
  }, [showNotification]);

  // ── Load save ──
  useEffect(() => {
    try {
      // Load leaderboard (filter inactive 20 days)
      const TWENTY_DAYS_LOAD = 20 * 24 * 60 * 60 * 1000;
      const lbRaw = lsGet("cc_leaderboard");
      if (lbRaw) {
        try {
          const parsed: LeaderboardEntry[] = JSON.parse(lbRaw);
          const active = parsed.filter(e => Date.now() - e.lastPlayed < TWENTY_DAYS_LOAD);
          setLeaderboard(active);
        } catch { /* ignore */ }
      }

      const saved = lsGet("cc_save_v2");
      if (saved) {
        const state: GameState = JSON.parse(saved);
        setCookies(state.cookies || 0);
        setTotalCookies(state.totalCookies || 0);
        const loadedAllTime = state.cookiesBakedAllTime !== undefined
          ? state.cookiesBakedAllTime
          : (state.totalCookies || 0) + 1000000 * Math.pow(state.heavenlyChips || 0, 2);
        setCookiesBakedAllTime(loadedAllTime);
        setTotalClicks(state.totalClicks || 0);
        setPrestigeLevel(state.prestigeLevel || 0);
        setHeavenlyChips(state.heavenlyChips || 0);
        setGoldenClicked(state.goldenClicked || 0);
        setEasterEggsFound(state.easterEggsFound || []);
        setCookieSkin(state.cookieSkin || "🍪");
        setPirateMode(state.pirateMode || false);
        setDuckMode(state.duckMode || false);
        setGrandmapocalypse(state.grandmapocalypse || false);
        setLastSaveTime(state.lastSaveTime || Date.now());

        // Populate number eggs triggered ref from existing easter eggs
        if (state.easterEggsFound) {
          const numEggs = ["nice", "blaze", "devil", "leet"];
          numEggs.forEach((e) => {
            if (state.easterEggsFound.includes(e)) numberEggsTriggeredRef.current.add(e);
          });
        }

        if (state.playerName) {
          setPlayerName(state.playerName);
        } else {
          setShowNameModal(true);
        }
        setLastRenamed(state.lastRenamed || 0);
        setLeaderboardOptIn(state.leaderboardOptIn !== undefined ? state.leaderboardOptIn : true);
        setLastCaptchaTime(state.lastCaptchaTime || Date.now());

        // Merge saved buildings
        if (state.buildings) {
          setBuildings((prev) =>
            prev.map((b) => {
              const sb = state.buildings.find((x) => x.id === b.id);
              return sb ? { ...b, owned: sb.owned } : b;
            })
          );
        }
        if (state.clickUpgrades) {
          setClickUpgrades((prev) =>
            prev.map((u) => {
              const su = state.clickUpgrades.find((x) => x.id === u.id);
              return su ? { ...u, owned: su.owned } : u;
            })
          );
        }
        if (state.achievements) {
          setAchievements((prev) =>
            prev.map((a) => {
              const sa = state.achievements.find((x) => x.id === a.id);
              return sa ? { ...a, unlocked: sa.unlocked } : a;
            })
          );
        }

        // Offline earnings
        if (state.lastSaveTime) {
          const offlineSec = (Date.now() - state.lastSaveTime) / 1000;
          if (offlineSec > 60) {
            const offlineCps = state.buildings
              ? state.buildings.reduce((sum: number, b: Building) => {
                  const def = BUILDINGS.find((d) => d.id === b.id);
                  return sum + (def ? def.cps * b.owned : 0);
                }, 0)
              : 0;
            const offlineEarnings = offlineCps * offlineSec * 0.5 * (1 + (state.prestigeLevel || 0) * 0.1);
            if (offlineEarnings > 0) {
              addCookies(offlineEarnings);
              const mins = Math.floor(offlineSec / 60);
              const hrs = Math.floor(mins / 60);
              const timeStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
              showNotification(`🌙 Willkommen zurück! +${formatNumber(offlineEarnings)} Cookies (${timeStr} offline, 50% Rate)`);
            }
          }
        }
      } else {
        setShowNameModal(true);
      }
    } catch (e) {
      console.warn("Failed to load save:", e);
      setShowNameModal(true);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save helper ──
  const doSave = useCallback(() => {
    if (!loaded) return;
    const TWENTY_DAYS = 20 * 24 * 60 * 60 * 1000;
    const state: GameState = {
      cookies, totalCookies, cookiesBakedAllTime, totalClicks, buildings, clickUpgrades, achievements,
      prestigeLevel, heavenlyChips, lastSaveTime: Date.now(), startTime,
      goldenClicked, easterEggsFound, cookieSkin, pirateMode, duckMode, grandmapocalypse,
      playerName, lastRenamed, leaderboardOptIn, lastCaptchaTime,
    };
    lsSet("cc_save_v2", JSON.stringify(state));
    setLastSaveTime(Date.now());

    // Update leaderboard (skip anonymous players)
    if (playerName && playerName !== "Anonym") {
      setLeaderboard((prev) => {
        // Filter inactive (20 days)
        const active = prev.filter((e) => Date.now() - e.lastPlayed < TWENTY_DAYS);
        const existing = active.filter((e) => e.name !== playerName);
        
        if (!leaderboardOptIn) {
          // If opted out, just remove player and save
          lsSet("cc_leaderboard", JSON.stringify(existing));
          return existing;
        }

        const entry: LeaderboardEntry = {
          name: playerName,
          cookies,
          totalCookies,
          prestigeLevel,
          achievements: achievements.filter((a) => a.unlocked).length,
          lastPlayed: Date.now(),
        };
        const updated = [...existing, entry].sort((a, b) => b.totalCookies - a.totalCookies).slice(0, 1000);
        lsSet("cc_leaderboard", JSON.stringify(updated));
        return updated;
      });
    }
  }, [loaded, cookies, totalCookies, cookiesBakedAllTime, totalClicks, buildings, clickUpgrades, achievements, prestigeLevel, heavenlyChips, goldenClicked, easterEggsFound, cookieSkin, pirateMode, duckMode, grandmapocalypse, startTime, playerName, lastRenamed, leaderboardOptIn, lastCaptchaTime]);

  // ── Auto-save every 5s ──
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(doSave, 5000);
    return () => clearInterval(id);
  }, [loaded, doSave]);

  // ── Save on page unload + visibilitychange ──
  useEffect(() => {
    const handleUnload = () => doSave();
    const handleVisibility = () => { if (document.visibilityState === "hidden") doSave(); };
    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [doSave]);

  // ── Manual save ──
  const handleManualSave = useCallback(() => {
    doSave();
    setSaveFlash(true);
    showNotification("💾 Gespeichert!");
    setTimeout(() => setSaveFlash(false), 1000);
  }, [doSave, showNotification]);

  // ── Generate trader deals based on progress ──
  const generateTraderDeals = useCallback((): TraderDeal[] => {
    const pool: TraderDeal[] = [];
    const base = Math.max(cookies * 0.3, cps * 60);

    // Cookie deals (always available)
    pool.push({
      id: "deal_cookies_1", name: "Cookie-Ladung", emoji: "📦",
      desc: `+${formatNumber(base * 3)} Cookies sofort!`,
      cost: Math.floor(base * 0.8), effect: "cookies", value: Math.floor(base * 3),
    });
    pool.push({
      id: "deal_cookies_2", name: "Mega-Lieferung", emoji: "🚚",
      desc: `+${formatNumber(base * 8)} Cookies!`,
      cost: Math.floor(base * 2.5), effect: "cookies", value: Math.floor(base * 8),
    });

    // CPS multiplier (30s boost)
    pool.push({
      id: "deal_cps", name: "Turbo-Boost", emoji: "⚡",
      desc: "3x CPS für 30 Sekunden!",
      cost: Math.floor(cps * 120), effect: "cps_mult", value: 3,
    });

    // CPC multiplier
    pool.push({
      id: "deal_cpc", name: "Power-Finger", emoji: "💪",
      desc: "5x Klick-Power für 30 Sekunden!",
      cost: Math.floor(base * 1.5), effect: "cpc_mult", value: 5,
    });

    // Golden rush
    pool.push({
      id: "deal_golden", name: "Goldener Regen", emoji: "🌟",
      desc: "3 goldene Cookies sofort!",
      cost: Math.floor(base * 2), effect: "golden_rush", value: 3,
    });

    // Time warp
    pool.push({
      id: "deal_timewarp", name: "Zeitsprung", emoji: "⏰",
      desc: `+${formatNumber(cps * 3600)} Cookies (1h Produktion)`,
      cost: Math.floor(cps * 1800), effect: "time_warp", value: 3600,
    });

    // Building deals (random building at 50% discount)
    const affordableBuildings = buildings.filter((b) => b.owned > 0);
    if (affordableBuildings.length > 0) {
      const b = affordableBuildings[Math.floor(Math.random() * affordableBuildings.length)];
      const normalCost = getCost(b.baseCost, b.owned);
      pool.push({
        id: `deal_building_${b.id}`, name: `${b.name} (50% Rabatt!)`, emoji: b.emoji,
        desc: `+1 ${b.name} zum halben Preis!`,
        cost: Math.floor(normalCost * 0.5), effect: "building", value: 1, buildingId: b.id,
      });
    }

    // Pick 2-3 random deals
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2 + (Math.random() > 0.5 ? 1 : 0));
  }, [cookies, cps, buildings]);

  // ── Handle trader deal ──
  const buyDeal = useCallback((deal: TraderDeal) => {
    if (buyingDealsRef.current.has(deal.id)) return;
    if (cookies < deal.cost) return;
    
    buyingDealsRef.current.add(deal.id);
    setCookies((c) => c - deal.cost);

    switch (deal.effect) {
      case "cookies":
        addCookies(deal.value);
        showNotification(`📦 +${formatNumber(deal.value)} Cookies vom Händler!`);
        break;
      case "cps_mult":
        setActiveEffects((e) => ({ ...e, frenzy: Math.max(e.frenzy, Date.now() + 30000) }));
        showNotification(`⚡ ${deal.value}x CPS Boost für 30s!`);
        break;
      case "cpc_mult":
        setActiveEffects((e) => ({ ...e, clickFrenzy: Math.max(e.clickFrenzy, Date.now() + 30000) }));
        showNotification(`💪 ${deal.value}x Klick-Power für 30s!`);
        break;
      case "golden_rush":
        for (let i = 0; i < deal.value; i++) {
          const id = ++goldenIdRef.current;
          const x = 10 + Math.random() * 70;
          const y = 15 + Math.random() * 60;
          setGoldenCookies((prev) => [...prev, { id, x, y, type: "frenzy" }]);
          setTimeout(() => setGoldenCookies((prev) => prev.filter((g) => g.id !== id)), 13000);
        }
        showNotification("🌟 Goldener Regen! 3 goldene Cookies!");
        break;
      case "time_warp":
        const earned = cps * deal.value;
        addCookies(earned);
        showNotification(`⏰ Zeitsprung! +${formatNumber(earned)} Cookies!`);
        break;
      case "building":
        if (deal.buildingId) {
          setBuildings((prev) =>
            prev.map((b) => b.id === deal.buildingId ? { ...b, owned: b.owned + deal.value } : b)
          );
          showNotification(`${deal.emoji} +${deal.value} ${deal.name}!`);
        }
        break;
    }
    // Remove purchased deal
    setTraderDeals((prev) => prev.filter((d) => d.id !== deal.id));
  }, [cookies, cps, showNotification, addCookies]);

  // ── Trader spawner (every 90-300s, stays 60s) ──
  useEffect(() => {
    if (!loaded) return;
    let spawnTimer: ReturnType<typeof setTimeout>;
    let countdownTimer: ReturnType<typeof setInterval>;

    const spawnTrader = () => {
      buyingDealsRef.current.clear();
      const deals = generateTraderDeals();
      if (deals.length === 0 || cps <= 0) {
        scheduleNext();
        return;
      }
      setTraderDeals(deals);
      setTraderVisible(true);
      setTraderTimer(60);
      showNotification("🧳 Ein wandernder Händler ist aufgetaucht!");

      // Countdown
      let remaining = 60;
      countdownTimer = setInterval(() => {
        remaining--;
        setTraderTimer(remaining);
        if (remaining <= 0) {
          clearInterval(countdownTimer);
          setTraderVisible(false);
          setTraderDeals([]);
          scheduleNext();
        }
      }, 1000);
    };

    const scheduleNext = () => {
      const delay = 90000 + Math.random() * 210000; // 90-300s
      spawnTimer = setTimeout(spawnTrader, delay);
    };

    // First trader after 45-90s
    spawnTimer = setTimeout(spawnTrader, 45000 + Math.random() * 45000);

    return () => {
      clearTimeout(spawnTimer);
      clearInterval(countdownTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, cps > 0]);

  // ── Auto-generation (10 ticks/sec) ──
  useEffect(() => {
    if (cps <= 0) return;
    const id = setInterval(() => {
      if (showCaptcha) return;
      addCookies(cps / 10);
    }, 100);
    return () => clearInterval(id);
  }, [cps, showCaptcha, addCookies]);

  // ── Golden cookie spawner ──
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const id = ++goldenIdRef.current;
      const types: GoldenCookie["type"][] = ["frenzy", "clickFrenzy", "lucky", "storm"];
      if (Math.random() < 0.001) types.push("diamond");
      const type = types[Math.floor(Math.random() * types.length)];
      const x = 10 + Math.random() * 70;
      const y = 15 + Math.random() * 60;
      setGoldenCookies((prev) => [...prev, { id, x, y, type }]);
      const expireTimer = setTimeout(() => {
        setGoldenCookies((prev) => prev.filter((g) => g.id !== id));
      }, 13000);
      // Store for cleanup
      expireTimers.push(expireTimer);
    };

    const expireTimers: ReturnType<typeof setTimeout>[] = [];

    const scheduleNext = () => {
      const delay = 120000 + Math.random() * 180000; // 120s - 300s (2-5 mins)
      timerId = setTimeout(() => {
        spawn();
        scheduleNext();
      }, delay);
    };

    // First spawn after 90-180s
    timerId = setTimeout(() => {
      spawn();
      scheduleNext();
    }, 90000 + Math.random() * 90000);

    return () => {
      clearTimeout(timerId);
      expireTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // ── Effect timers ──
  useEffect(() => {
    if (activeEffects.frenzy > 0) {
      const t = setTimeout(() => setActiveEffects((e) => ({ ...e, frenzy: 0 })), activeEffects.frenzy);
      return () => clearTimeout(t);
    }
  }, [activeEffects.frenzy]);

  useEffect(() => {
    if (activeEffects.clickFrenzy > 0) {
      const t = setTimeout(() => setActiveEffects((e) => ({ ...e, clickFrenzy: 0 })), activeEffects.clickFrenzy);
      return () => clearTimeout(t);
    }
  }, [activeEffects.clickFrenzy]);

  // ── Achievement checker ──
  useEffect(() => {
    if (!loaded) return;

    // Cookie milestones
    if (totalCookies >= 100) unlock("cookie_100");
    if (totalCookies >= 1000) unlock("cookie_1k");
    if (totalCookies >= 100000) unlock("cookie_100k");
    if (totalCookies >= 1e6) unlock("cookie_1m");
    if (totalCookies >= 1e9) unlock("cookie_1b");
    if (totalCookies >= 1e12) unlock("cookie_1t");

    // Click milestones
    if (totalClicks >= 100) unlock("click_100");
    if (totalClicks >= 1000) unlock("click_1k");
    if (totalClicks >= 10000) unlock("click_10k");
    if (totalClicks >= 50000) unlock("click_50k");

    // Building milestones
    if (totalBuildings >= 1) unlock("first_building");
    if (totalBuildings >= 100) unlock("own_100");
    if (totalBuildings >= 500) unlock("own_500");

    // Special building milestones
    const cursors = buildings.find((b) => b.id === "cursor")?.owned || 0;
    const grandmas = buildings.find((b) => b.id === "grandma")?.owned || 0;
    const wizards = buildings.find((b) => b.id === "wizard")?.owned || 0;
    if (cursors >= 100) unlock("skynet");
    if (grandmas >= 50) {
      unlock("grandmapocalypse");
      setGrandmapocalypse(true);
    }
    if (wizards >= 7) unlock("wizard_7");

    // Easter egg numbers — use Math.floor and a ref to trigger only once
    const floored = Math.floor(cookies);
    if (floored === 69 && !numberEggsTriggeredRef.current.has("nice")) {
      numberEggsTriggeredRef.current.add("nice");
      unlock("nice"); findEasterEgg("nice", "Nice. 😏");
    }
    if (floored === 420 && !numberEggsTriggeredRef.current.has("blaze")) {
      numberEggsTriggeredRef.current.add("blaze");
      unlock("blaze"); findEasterEgg("blaze", "Blazing cookies! 🔥");
    }
    if (floored === 666 && !numberEggsTriggeredRef.current.has("devil")) {
      numberEggsTriggeredRef.current.add("devil");
      unlock("devil"); findEasterEgg("devil", "The Devil's Dozen 💀");
    }
    if (floored === 1337 && !numberEggsTriggeredRef.current.has("leet")) {
      numberEggsTriggeredRef.current.add("leet");
      unlock("leet"); findEasterEgg("leet", "L33T BAKER 💻");
    }

    // The answer (42 of anything)
    if (buildings.some((b) => b.owned === 42) || clickUpgrades.some((u) => u.owned === 42)) {
      unlock("answer");
      findEasterEgg("answer", "The Answer to Everything: 42 🌌");
    }

    // Golden cookies
    if (goldenClicked >= 1) unlock("golden_1");
    if (goldenClicked >= 10) unlock("golden_10");
    if (goldenClicked >= 50) unlock("golden_50");

    // Time-based
    if (isNightTime()) {
      unlock("midnight");
      findEasterEgg("midnight", "Midnight Baker 🌙 — 2x CPS Bonus!");
    }
    if (isEliteTime()) {
      unlock("elite_time");
      findEasterEgg("elite_time", "Elite Baker ⏰ — 13:37 Uhr!");
    }

    // Seasonal
    const seasonal = getSeasonalEmoji();
    if (seasonal === "🎄") {
      unlock("xmas");
      findEasterEgg("xmas", "Frohe Weihnachten! 🎄 Cookie-Skin changed!");
      setCookieSkin("🎄");
    }
    if (seasonal === "🎃") {
      unlock("halloween");
      findEasterEgg("halloween", "Spooky Baker 🎃");
      setCookieSkin("🎃");
    }
  }, [loaded, totalCookies, totalClicks, totalBuildings, cookies, buildings, clickUpgrades, goldenClicked, unlock, findEasterEgg]);

  // ── Keyboard listener for Konami + secret words ──
  useEffect(() => {
    const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      // Konami code
      konamiRef.current.push(key);
      if (konamiRef.current.length > 10) konamiRef.current.shift();
      if (konamiRef.current.join(",") === konamiCode.join(",")) {
        setCookies((c) => c + 9999);
        setTotalCookies((t) => t + 9999);
        unlock("konami");
        findEasterEgg("konami", "Konami Code! +9999 Cookies! 🎮");
        konamiRef.current = [];
      }

      // Secret words
      if (key.length === 1 && /[a-z]/.test(key)) {
        secretWordRef.current += key;
        if (secretWordRef.current.length > 10) {
          secretWordRef.current = secretWordRef.current.slice(-10);
        }
        const word = secretWordRef.current;

        if (word.endsWith("moo")) {
          unlock("moo");
          findEasterEgg("moo", "Moo! 🐄");
          setCookieSkin("🐄");
          setTimeout(() => { if (!getSeasonalEmoji()) setCookieSkin("🍪"); }, 10000);
          secretWordRef.current = "";
        }
        if (word.endsWith("quack")) {
          unlock("quack");
          findEasterEgg("quack", "Quack! 🦆 Alles wird zu Enten!");
          setDuckMode(true);
          setTimeout(() => setDuckMode(false), 8000);
          secretWordRef.current = "";
        }
        if (word.endsWith("pizza")) {
          unlock("pizza");
          findEasterEgg("pizza", "Falsches Spiel! 🍕");
          setCookieSkin("🍕");
          setTimeout(() => { if (!getSeasonalEmoji()) setCookieSkin("🍪"); }, 10000);
          secretWordRef.current = "";
        }
        if (word.endsWith("yarr")) {
          unlock("pirate");
          findEasterEgg("pirate", "Yarr! 🏴‍☠️ Pirate Mode!");
          setPirateMode((p) => !p);
          secretWordRef.current = "";
        }
        if (word.endsWith("snake")) {
          unlock("snake");
          findEasterEgg("snake", "Wrong Game! 🐍");
          setCookieSkin("🐍");
          setTimeout(() => { if (!getSeasonalEmoji()) setCookieSkin("🍪"); }, 8000);
          secretWordRef.current = "";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [unlock, findEasterEgg]);

  // ── Anti-autoclick captcha generator ──
  const generateCaptcha = useCallback(() => {
    const num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const num2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const answer = num1 + num2;

    const choices = new Set<number>();
    choices.add(answer);
    while (choices.size < 3) {
      const wrong = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
      if (wrong > 0 && wrong !== answer) {
        choices.add(wrong);
      }
    }
    const options = Array.from(choices).sort(() => Math.random() - 0.5);

    setCaptchaQuestion({ num1, num2, options });
    setShowCaptcha(true);
  }, []);

  // ── Click handler ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (showCaptcha) return;

    // Captcha verification check: if clicked after 5 hours since last solved/session start
    const now = Date.now();
    const FIVE_HOURS = 5 * 60 * 60 * 1000;
    if (now - lastCaptchaTime > FIVE_HOURS) {
      generateCaptcha();
      return;
    }

    playClickSound(soundEnabled);

    addCookies(cpc);
    setTotalClicks((c) => c + 1);

    // Particle (max 5)
    const pid = ++particleIdRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setParticles((prev) => {
      const emojis = duckMode ? ["🦆"] : ["🍪", "✨", "⭐", "💫"];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const next = prev.length >= 5 ? prev.slice(1) : prev;
      return [...next, { id: pid, x, y, emoji }];
    });
    setTimeout(() => setParticles((prev) => prev.filter((pp) => pp.id !== pid)), 1000);

    // Shake
    setShakeIntensity(3);
    setTimeout(() => setShakeIntensity(0), 100);

    // Speed demon check
    clickTimesRef.current.push(now);
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < 5000);
    if (clickTimesRef.current.length >= 50) {
      unlock("speed_demon");
      findEasterEgg("speed_demon", "Speed Demon! 🐱 50 Klicks in 5 Sekunden!");
    }

    // Rapid click rainbow (10+ clicks/sec)
    const recentClicks = clickTimesRef.current.filter((t) => now - t < 1000);
    if (recentClicks.length >= 10) {
      setRainbowMode(true);
      setTimeout(() => setRainbowMode(false), 2000);
    }
  }, [cpc, duckMode, unlock, findEasterEgg, showCaptcha, generateCaptcha, lastCaptchaTime, soundEnabled, addCookies]);

  // ── Golden cookie click handler ──
  const handleGoldenClick = useCallback((gc: GoldenCookie) => {
    if (clickedGoldenIdsRef.current.has(gc.id)) return;
    clickedGoldenIdsRef.current.add(gc.id);

    setGoldenCookies((prev) => prev.filter((g) => g.id !== gc.id));
    setGoldenClicked((c) => c + 1);

    switch (gc.type) {
      case "frenzy":
        setActiveEffects((e) => ({ ...e, frenzy: 15000 }));
        showNotification("🔥 FRENZY! 2x Produktion für 15 Sekunden!");
        break;
      case "clickFrenzy":
        setActiveEffects((e) => ({ ...e, clickFrenzy: 5000 }));
        showNotification("⚡ CLICK FRENZY! 10x Klick-Power für 5 Sekunden!");
        break;
      case "lucky": {
        const bonus = Math.max(cps * 30, cookies * 0.05);
        addCookies(bonus);
        showNotification(`🍀 LUCKY! +${formatNumber(bonus)} Cookies!`);
        break;
      }
      case "storm":
        setCookieStorm(true);
        showNotification("🌧️ COOKIE STORM! Fang die Cookies!");
        setTimeout(() => setCookieStorm(false), 5000);
        break;
      case "diamond": {
        const bonus2 = Math.max(cps * 180, cookies * 0.15);
        addCookies(bonus2);
        unlock("diamond");
        findEasterEgg("diamond", "DIAMOND COOKIE! 💎 Mega Bonus!");
        showNotification(`💎 DIAMOND COOKIE! +${formatNumber(bonus2)} Cookies!`);
        break;
      }
    }
  }, [cps, cookies, showNotification, unlock, findEasterEgg, addCookies]);

  // ── Buy building ──
  const buyBuilding = useCallback((id: string) => {
    setBuildings((prev) => {
      const b = prev.find((x) => x.id === id);
      if (!b) return prev;
      
      let count = 0;
      let cost = 0;
      
      if (buyMode === 1) {
        count = 1;
        cost = getCost(b.baseCost, b.owned);
      } else if (buyMode === 10) {
        count = 10;
        cost = getBulkCost(b.baseCost, b.owned, 10);
      } else if (buyMode === 100) {
        count = 100;
        cost = getBulkCost(b.baseCost, b.owned, 100);
      } else {
        // "max"
        const maxStats = getMaxAffordable(b.baseCost, b.owned, cookies);
        count = maxStats.count;
        cost = maxStats.cost;
      }
      
      if (count <= 0 || cookies < cost) return prev;
      setCookies((c) => c - cost);
      return prev.map((x) => (x.id === id ? { ...x, owned: x.owned + count } : x));
    });
  }, [cookies, buyMode]);

  // ── Buy click upgrade ──
  const buyClickUpgrade = useCallback((id: string) => {
    setClickUpgrades((prev) => {
      const u = prev.find((x) => x.id === id);
      if (!u) return prev;
      
      let count = 0;
      let cost = 0;
      
      if (buyMode === 1) {
        count = 1;
        cost = getCost(u.baseCost, u.owned);
      } else if (buyMode === 10) {
        count = 10;
        cost = getBulkCost(u.baseCost, u.owned, 10);
      } else if (buyMode === 100) {
        count = 100;
        cost = getBulkCost(u.baseCost, u.owned, 100);
      } else {
        // "max"
        const maxStats = getMaxAffordable(u.baseCost, u.owned, cookies);
        count = maxStats.count;
        cost = maxStats.cost;
      }
      
      if (count <= 0 || cookies < cost) return prev;
      setCookies((c) => c - cost);
      return prev.map((x) => (x.id === id ? { ...x, owned: x.owned + count } : x));
    });
  }, [cookies, buyMode]);

  // ── Ascend / Prestige ──
  const ascend = useCallback(() => {
    if (isAscendingRef.current) return;
    if (potentialHeavenly <= heavenlyChips) return;
    
    isAscendingRef.current = true;
    const newChips = potentialHeavenly;
    setHeavenlyChips(newChips);
    setPrestigeLevel(newChips);
    setCookies(0);
    setTotalCookies(0);
    setTotalClicks(0);
    setBuildings(BUILDINGS.map((b) => ({ ...b })));
    setClickUpgrades(CLICK_UPGRADES.map((u) => ({ ...u })));
    setGoldenClicked(0);
    setGrandmapocalypse(false);
    setShowAscendModal(false);
    numberEggsTriggeredRef.current.clear();
    unlock("prestige_1");
    showNotification(`🔄 Ascended! Prestige Level ${newChips} — ${newChips} Heavenly Chips (+${(newChips * 10).toFixed(0)}% Bonus)`);
    // Save after ascend
    setTimeout(() => {
      doSave();
      isAscendingRef.current = false;
    }, 500);
  }, [potentialHeavenly, heavenlyChips, unlock, showNotification, doSave]);

  // ── Reset ──
  const resetAll = useCallback(() => {
    if (window.confirm("Möchtest du ALLES zurücksetzen? (inkl. Prestige & Achievements)")) {
      setCookies(0);
      setTotalCookies(0);
      setCookiesBakedAllTime(0);
      setTotalClicks(0);
      setBuildings(BUILDINGS.map((b) => ({ ...b })));
      setClickUpgrades(CLICK_UPGRADES.map((u) => ({ ...u })));
      setAchievements(INITIAL_ACHIEVEMENTS.map((a) => ({ ...a })));
      setPrestigeLevel(0);
      setHeavenlyChips(0);
      setGoldenClicked(0);
      setEasterEggsFound([]);
      setCookieSkin("🍪");
      setPirateMode(false);
      setDuckMode(false);
      setGrandmapocalypse(false);
      numberEggsTriggeredRef.current.clear();
      lsRemove("cc_save_v2");
    }
  }, []);

  // ── Pirate text helper ──
  const p = useCallback((text: string) => {
    if (!pirateMode) return text;
    const map: Record<string, string> = {
      "Cookies": "Doubloons", "Cookie": "Doubloon", "cookies": "doubloons", "cookie": "doubloon",
      "Gebäude": "Schiffe", "Klick": "Schwerthieb", "kaufen": "plündern", "Kauf": "Plünderung",
      "pro Sek": "pro Tide", "Zurück": "Rückzug", "Spielstand": "Schatzkarte",
    };
    let result = text;
    Object.entries(map).forEach(([k, v]) => { result = result.replaceAll(k, v); });
    return result;
  }, [pirateMode]);

  // ── Handle name submit (unique check, case-insensitive, 30-day cooldown) ──
  const submitName = useCallback((name: string) => {
    const trimmed = name.trim() || "Anonym";
    setNameError("");

    // 30-day rename cooldown (only if already named and not first-time or from Anonym, bypassed for admin)
    const isFirstTime = !playerName || playerName === "Anonym";
    if (!isFirstTime && trimmed !== playerName && lastRenamed > 0 && !isAdminUnlocked) {
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - lastRenamed;
      if (elapsed < THIRTY_DAYS) {
        const daysLeft = Math.ceil((THIRTY_DAYS - elapsed) / (24 * 60 * 60 * 1000));
        setNameError(`Name kann nur alle 30 Tage geändert werden! (Noch ${daysLeft} Tage)`);
        return;
      }
    }

    // Check uniqueness: is a different player already using this name?
    const nameLower = trimmed.toLowerCase();
    const currentLower = playerName.toLowerCase();
    const duplicate = leaderboard.find(
      (e) => e.name.toLowerCase() === nameLower && nameLower !== currentLower
    );
    if (duplicate && trimmed !== "Anonym") {
      setNameError("Name ist schon vergeben!");
      return;
    }

    // On successful rename (not first-time), set cooldown
    if (!isFirstTime && trimmed !== playerName) {
      setLastRenamed(Date.now());
    } else if (isFirstTime && trimmed !== "Anonym") {
      // First-time naming: set lastRenamed so future renames have a reference
      setLastRenamed(Date.now());
    }

    setPlayerName(trimmed);
    setShowNameModal(false);
    setNameInput("");
    setNameError("");
  }, [playerName, leaderboard, lastRenamed, isAdminUnlocked]);

  const handleHeaderClick = useCallback(() => {
    titleClicksRef.current++;
    if (titleClicksRef.current >= 5) {
      titleClicksRef.current = 0;
      const pw = prompt("Admin-Passwort eingeben:");
      if (pw === "moritz2026") {
        setIsAdminUnlocked(true);
        setActiveTab("admin");
        showNotification("🪄 Admin-Modus freigeschaltet!");
      } else if (pw !== null) {
        showNotification("❌ Falsches Passwort!");
      }
    }
  }, [showNotification]);

  // ── Leaderboard sync ──
  const TWENTY_DAYS = 20 * 24 * 60 * 60 * 1000;
  const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '' : '/.netlify/functions';

  const leaveLeaderboard = useCallback(async () => {
    if (!playerName || playerName === 'Anonym') return;
    
    // Local remove
    setLeaderboard((prev) => {
      const updated = prev.filter((e) => e.name !== playerName);
      lsSet('cc_leaderboard', JSON.stringify(updated));
      return updated;
    });

    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName }),
      });
      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
      }
    } catch {
      // Ignore network failure, local fallback is already done
    }
  }, [playerName, API_BASE]);

  const resetServerLeaderboard = useCallback(async () => {
    setLeaderboard([]);
    lsSet('cc_leaderboard', JSON.stringify([]));

    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
      }
    } catch {
      // Keep cleared local state
    }
  }, [API_BASE]);

  const adminDeletePlayer = useCallback(async (name: string) => {
    if (!confirm(`Möchtest du wirklich den Spieler "${name}" löschen?`)) return;
    setLeaderboard((prev) => {
      const updated = prev.filter((e) => e.name !== name);
      lsSet('cc_leaderboard', JSON.stringify(updated));
      return updated;
    });
    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
        showNotification(`🪄 Admin: Spieler "${name}" gelöscht!`);
      }
    } catch {
      showNotification("❌ Fehler beim Löschen des Spielers.");
    }
  }, [API_BASE, showNotification]);

  const adminUpdatePlayer = useCallback(async (name: string, cookiesVal: number, prestigeVal: number, achievementsVal: number) => {
    const entry: LeaderboardEntry = {
      name,
      cookies: cookiesVal,
      totalCookies: cookiesVal,
      prestigeLevel: prestigeVal,
      achievements: achievementsVal,
      lastPlayed: Date.now(),
    };
    setLeaderboard((prev) => {
      const updated = prev.map((e) => e.name === name ? entry : e);
      lsSet('cc_leaderboard', JSON.stringify(updated));
      return updated;
    });
    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
        setEditingPlayerName(null);
        showNotification(`🪄 Admin: Spieler "${name}" aktualisiert!`);
      }
    } catch {
      showNotification("❌ Fehler beim Aktualisieren des Spielers.");
    }
  }, [API_BASE, showNotification]);

  const syncLeaderboard = useCallback(async () => {
    if (!playerName || playerName === 'Anonym') return;
    if (!leaderboardOptIn) {
      leaveLeaderboard();
      return;
    }
    if (!API_BASE) return; // Skip on localhost
    try {
      const entry: LeaderboardEntry = {
        name: playerName,
        cookies,
        totalCookies,
        prestigeLevel,
        achievements: achievements.filter(a => a.unlocked).length,
        lastPlayed: Date.now(),
      };

      const res = await fetch(`${API_BASE}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
      }
    } catch {
      // Fallback: keep local leaderboard
    }
  }, [playerName, cookies, totalCookies, prestigeLevel, achievements, API_BASE, leaderboardOptIn, leaveLeaderboard]);

  const handleToggleLeaderboard = useCallback((val: boolean) => {
    setLeaderboardOptIn(val);
    if (!val) {
      leaveLeaderboard();
    } else {
      // Force sync immediately
      setTimeout(() => {
        if (playerName && playerName !== 'Anonym') {
          const entry: LeaderboardEntry = {
            name: playerName,
            cookies,
            totalCookies,
            prestigeLevel,
            achievements: achievements.filter(a => a.unlocked).length,
            lastPlayed: Date.now(),
          };
          if (API_BASE) {
            fetch(`${API_BASE}/leaderboard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
            }).then(async res => {
              if (res.ok) {
                const remote = await res.json();
                setLeaderboard(remote);
                lsSet('cc_leaderboard', JSON.stringify(remote));
              }
            }).catch(() => {});
          }
        }
      }, 100);
    }
  }, [playerName, cookies, totalCookies, prestigeLevel, achievements, API_BASE, leaveLeaderboard]);

  const fetchLeaderboard = useCallback(async () => {
    if (!API_BASE) return; // Skip on localhost
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (res.ok) {
        const remote: LeaderboardEntry[] = await res.json();
        setLeaderboard(remote);
        lsSet('cc_leaderboard', JSON.stringify(remote));
      }
    } catch {
      // Keep local
    }
  }, [API_BASE]);

  // Sync every 30s + initial fetch
  useEffect(() => {
    if (!loaded) return;
    fetchLeaderboard(); // Initial fetch
    const id = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(id);
  }, [loaded, fetchLeaderboard]);

  // Push on doSave (throttled - only sync every 30s on save)
  useEffect(() => {
    if (!loaded || !playerName || playerName === 'Anonym') return;
    const now = Date.now();
    if (now - lastSyncRef.current > 30000) {
      lastSyncRef.current = now;
      syncLeaderboard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, lastSaveTime]);

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  const bgCookieCount = cps > 0 ? Math.min(8, Math.floor(Math.log10(cps + 1) * 3)) : 0;

  // Cooldown info for name button
  const renameCooldownDays = (() => {
    if (!lastRenamed || !playerName || playerName === 'Anonym') return 0;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastRenamed;
    if (elapsed >= THIRTY_DAYS) return 0;
    return Math.ceil((THIRTY_DAYS - elapsed) / (24 * 60 * 60 * 1000));
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[100dvh] relative select-none bg-[#141416] text-[#f0ebe3]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Grandmapocalypse background */}
      {grandmapocalypse && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-red-950/20 animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-5xl opacity-10 select-none"
              style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 4 + i, repeat: Infinity }}
            >
              👵
            </motion.div>
          ))}
        </div>
      )}

      {/* Cookie storm (max 20) */}
      <AnimatePresence>
        {cookieStorm && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-3xl cursor-pointer pointer-events-auto select-none"
                initial={{ x: `${Math.random() * 100}vw`, y: -50 }}
                animate={{ y: "110vh", rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
                transition={{ duration: 2 + Math.random() * 3, delay: Math.random() * 3, ease: "linear" }}
                onClick={() => addCookies(cps * 5 + cpc * 10)}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                🍪
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-[#1c1c1f] border border-[#FFA586]/40 text-xs md:text-sm text-[#FFA586] rounded-lg shadow-[0_0_30px_rgba(255,165,134,0.2)] max-w-[90vw] md:max-w-md text-center backdrop-blur-md"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Golden cookies */}
      <AnimatePresence>
        {goldenCookies.filter((gc) => !clickedGoldenIdsRef.current.has(gc.id)).map((gc) => (
          <motion.button
            key={gc.id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [1, 1.15, 1], rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ scale: { repeat: Infinity, duration: 1.5 } }}
            onClick={() => handleGoldenClick(gc)}
            className="fixed z-40 text-5xl md:text-6xl cursor-pointer hover:scale-125 transition-transform select-none drop-shadow-[0_0_20px_rgba(255,215,0,0.6)] p-2"
            style={{ left: `${gc.x}%`, top: `${gc.y}%`, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            {gc.type === "diamond" ? "💎" : "✨"}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Captcha Modal */}
      <AnimatePresence>
        {showCaptcha && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-[#1c1c1f] border-2 border-red-500/50 p-6 max-w-sm w-full mx-4 rounded-lg text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <div className="text-4xl mb-3">🤖</div>
              <h2 className="font-serif text-xl font-bold mb-2 text-red-400">Autoklicker-Schutz</h2>
              <p className="text-xs text-[#a09a90] mb-4">
                Bist du noch da? Bitte löse diese kleine Rechenaufgabe, um weiterzuspielen:
              </p>
              
              <div className="text-2xl font-serif font-black text-[#f0ebe3] my-4 p-3 bg-black/40 rounded-sm border border-[rgba(240,235,227,0.08)]">
                {captchaQuestion.num1} + {captchaQuestion.num2} = ?
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                {captchaQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === captchaQuestion.num1 + captchaQuestion.num2) {
                        setShowCaptcha(false);
                        setLastCaptchaTime(Date.now());
                        clickTimesRef.current = []; // Reset click tracking
                        showNotification("✅ Verifiziert! Weiterspielen!");
                      } else {
                        // Wrong answer, generate new captcha
                        generateCaptcha();
                        showNotification("❌ Falsch! Versuche es noch einmal.");
                      }
                    }}
                    className="py-2.5 px-3 bg-[#141416] hover:bg-[#FFA586] hover:text-[#141416] border border-[rgba(240,235,227,0.15)] rounded-sm text-sm font-bold transition-all cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name Entry Modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-[#1c1c1f] border border-[rgba(240,235,227,0.15)] p-8 max-w-sm w-full mx-4 rounded-lg"
            >
              <div className="text-center mb-6">
                <span className="text-6xl">🍪</span>
                <h2 className="font-serif text-2xl font-bold mt-3">
                  {playerName ? "Name ändern" : "Wie heißt du?"}
                </h2>
                <p className="text-sm text-[#a09a90] mt-2">
                  {playerName
                    ? `Aktuell: ${playerName}`
                    : "Dein Name erscheint auf der Rangliste"}
                </p>
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value.slice(0, 20)); setNameError(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameInput.trim()) {
                    submitName(nameInput);
                  }
                }}
                placeholder="Dein Name..."
                autoFocus
                enterKeyHint="done"
                autoComplete="off"
                autoCapitalize="words"
                className={`w-full bg-transparent border px-4 py-3 text-lg text-center text-[#f0ebe3] placeholder:text-[#a09a90]/40 focus:outline-none transition-colors rounded ${
                  nameError ? "border-red-500/60 focus:border-red-500" : "border-[rgba(240,235,227,0.2)] focus:border-[#FFA586]/50"
                }`}
              />
              {nameError && (
                <p className="text-red-400 text-xs text-center mt-2 animate-pulse">
                  ⚠️ {nameError}
                </p>
              )}
              <button
                onClick={() => submitName(nameInput)}
                disabled={!nameInput.trim()}
                className="w-full mt-4 py-3 text-sm bg-[#FFA586] text-[#141416] font-bold hover:bg-[#FFB99A] transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {playerName ? "Name ändern ✏️" : "Los geht's! 🚀"}
              </button>
              {!playerName && (
                <button
                  onClick={() => submitName("Anonym")}
                  className="w-full mt-2 py-2 text-xs text-[#a09a90] hover:text-[#f0ebe3] transition-colors"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Anonym spielen
                </button>
              )}
              {playerName && (
                <button
                  onClick={() => { setShowNameModal(false); setNameInput(""); setNameError(""); }}
                  className="w-full mt-2 py-2 text-xs text-[#a09a90] hover:text-[#f0ebe3] transition-colors"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Abbrechen
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c1f] border border-[rgba(240,235,227,0.15)] p-6 max-w-sm w-full mx-4 rounded-lg space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[rgba(240,235,227,0.1)] pb-3">
                <h2 className="font-serif text-xl font-bold text-[#FFA586]">⚙️ Einstellungen</h2>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-xs text-[#a09a90] hover:text-[#f0ebe3] cursor-pointer"
                >
                  Schließen
                </button>
              </div>

              {/* UI Scale Setting */}
              <div className="space-y-2">
                <label className="text-[10px] text-[#a09a90] uppercase tracking-wider block">UI-Skalierung (Größe)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { label: "100%", val: 1.0 },
                    { label: "115%", val: 1.15 },
                    { label: "130%", val: 1.3 },
                    { label: "145%", val: 1.45 },
                  ]).map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setUiScale(opt.val);
                        lsSet("cc_ui_scale", opt.val.toString());
                      }}
                      className={`py-1.5 text-[10px] font-bold border rounded-sm transition-all cursor-pointer ${
                        uiScale === opt.val
                          ? "border-[#FFA586] text-[#FFA586] bg-[#FFA586]/10"
                          : "border-[rgba(240,235,227,0.12)] text-[#a09a90] hover:text-[#f0ebe3] bg-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effects Setting */}
              <div className="flex items-center justify-between py-2 border-b border-[rgba(240,235,227,0.06)]">
                <div>
                  <span className="text-xs font-semibold block text-[#f0ebe3]">Sound-Effekte 🔊</span>
                  <span className="text-[8px] text-[#a09a90]">Spielt Klick-Töne beim Keksklicken</span>
                </div>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    lsSet("cc_sound_enabled", next.toString());
                    if (next) playClickSound(true);
                  }}
                  className={`text-[10px] font-bold px-3 py-1 border rounded-full transition-all cursor-pointer ${
                    soundEnabled
                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : "border-red-500/30 text-red-400 bg-red-500/10"
                  }`}
                >
                  {soundEnabled ? "AN" : "AUS"}
                </button>
              </div>

              {/* Background Effects Setting */}
              <div className="flex items-center justify-between py-2 border-b border-[rgba(240,235,227,0.06)]">
                <div>
                  <span className="text-xs font-semibold block text-[#f0ebe3]">Hintergrund-Kekse 🍪</span>
                  <span className="text-[8px] text-[#a09a90]">Fliegende Kekse im Hintergrund</span>
                </div>
                <button
                  onClick={() => {
                    const next = !bgEffectsEnabled;
                    setBgEffectsEnabled(next);
                    lsSet("cc_bg_effects_enabled", next.toString());
                  }}
                  className={`text-[10px] font-bold px-3 py-1 border rounded-full transition-all cursor-pointer ${
                    bgEffectsEnabled
                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                      : "border-red-500/30 text-red-400 bg-red-500/10"
                  }`}
                >
                  {bgEffectsEnabled ? "AN" : "AUS"}
                </button>
              </div>

              {/* Profile rename option */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setNameInput(playerName);
                    setShowNameModal(true);
                  }}
                  className="w-full py-2 bg-[rgba(240,235,227,0.04)] hover:bg-[#FFA586]/10 border border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 text-xs font-bold transition-all rounded-sm cursor-pointer text-center text-[#f0ebe3]"
                >
                  👤 Spielername ändern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ascend Modal */}
      <AnimatePresence>
        {showAscendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAscendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c1f] border border-[rgba(240,235,227,0.15)] p-8 max-w-md w-full mx-4 rounded-lg"
            >
              <h2 className="font-serif text-2xl font-bold mb-4 text-center">🔄 Ascend?</h2>
              <p className="text-sm text-[#a09a90] mb-6 text-center leading-relaxed">
                Dein gesamter Fortschritt wird zurückgesetzt, aber du erhältst
                <span className="text-[#FFA586] font-bold"> {potentialHeavenly} Heavenly Chips</span>.
                <br /><br />
                Jeder Chip gibt <span className="text-[#FFA586]">+10% permanenten Bonus</span> auf alles.
                <br />
                Aktuelles Prestige Level: <span className="font-bold">{prestigeLevel}</span>
                <br />
                Aktueller Bonus: <span className="text-[#FFA586]">+{prestigeLevel * 10}%</span>
                <br />
                Neuer Bonus: <span className="text-[#FFA586]">+{(prestigeLevel + 1) * 10}%</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAscendModal(false)}
                  className="flex-1 py-3 text-sm border border-[rgba(240,235,227,0.12)] text-[#a09a90] hover:text-[#f0ebe3] transition-colors rounded"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={ascend}
                  disabled={potentialHeavenly <= heavenlyChips}
                  className="flex-1 py-3 text-sm bg-[#FFA586] text-[#141416] font-bold hover:bg-[#FFB99A] transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Ascend! 🔄
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="max-w-[1200px] mx-auto px-3 md:px-6 py-3 md:py-4" style={{ zoom: uiScale }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm">
            <ArrowLeft size={16} /> {p("Zurück")}
          </Link>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            {/* Active effects */}
            {activeEffects.frenzy > 0 && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full animate-pulse">
                🔥 FRENZY
              </span>
            )}
            {activeEffects.clickFrenzy > 0 && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full animate-pulse">
                ⚡ x77
              </span>
            )}
            {isNightTime() && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                🌙 2x
              </span>
            )}
            {prestigeLevel > 0 && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                ✨ +{prestigeLevel * 10}%
              </span>
            )}
            {/* Player name */}
            {playerName && (
              <button
                onClick={() => { setNameInput(playerName); setShowNameModal(true); }}
                className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-[rgba(240,235,227,0.05)] text-[#a09a90] hover:text-[#FFA586] border border-[rgba(240,235,227,0.12)] rounded-full transition-colors cursor-pointer"
                title={renameCooldownDays > 0 ? `Name ändern (Cooldown: ${renameCooldownDays} Tage)` : "Name ändern"}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                👤 {playerName}{renameCooldownDays > 0 ? ` (${renameCooldownDays}d)` : ''}
              </button>
            )}
            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-[rgba(240,235,227,0.05)] text-[#a09a90] hover:text-[#FFA586] border border-[rgba(240,235,227,0.12)] rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[26px]"
              title="Einstellungen öffnen"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              ⚙️ <span className="hidden sm:inline">Einstellungen</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 h-[calc(100dvh-120px)]">
          {/* ═══ LEFT: Cookie Clicker Area ═══ */}
          <div className="flex flex-col items-center text-center py-3 md:py-4 px-3 md:px-5 border border-[rgba(240,235,227,0.12)] bg-[#141416]/40 relative overflow-hidden rounded-sm">
            {/* Background floating cookies (max 8) */}
            {bgCookieCount > 0 && bgEffectsEnabled && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: bgCookieCount }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-lg opacity-[0.06] select-none"
                    style={{ left: `${(i * 13 + 5) % 90}%` }}
                    animate={{ y: [500, -50] }}
                    transition={{
                      duration: 6 + (i % 4) * 2,
                      repeat: Infinity,
                      delay: i * 0.8,
                      ease: "linear",
                    }}
                  >
                    {duckMode ? "🦆" : "🍪"}
                  </motion.div>
                ))}
              </div>
            )}

            <h1 
              onClick={handleHeaderClick}
              className="font-serif font-black text-lg md:text-2xl mb-1 text-center relative z-10 cursor-pointer select-none active:scale-95 transition-transform"
            >
              {duckMode ? "🦆" : "🍪"} {p("Cookie Clicker")}
            </h1>
            {pirateMode && (
              <p className="text-xs text-amber-500 font-mono mb-2">☠️ PIRATE MODE ☠️</p>
            )}

            {/* Stats Dashboard - single row */}
            <div className="flex items-center justify-center gap-3 md:gap-4 my-2 md:my-3 relative z-10">
              <div className="text-center">
                <div className={`text-base md:text-xl font-serif font-black ${rainbowMode ? "animate-rainbow-text" : "text-[#FFA586]"}`}>
                  {formatNumber(cookies)}
                </div>
                <div className="text-[8px] md:text-[9px] text-[#a09a90] uppercase tracking-wider">{p("Cookies")}</div>
              </div>
              <div className="w-px h-6 bg-[rgba(240,235,227,0.12)]" />
              <div className="text-center">
                <div className="text-sm md:text-base font-serif font-bold text-[#f0ebe3]">{formatNumber(cpc)}</div>
                <div className="text-[8px] md:text-[9px] text-[#a09a90] uppercase tracking-wider">{p("pro Klick")}</div>
              </div>
              <div className="w-px h-6 bg-[rgba(240,235,227,0.12)]" />
              <div className="text-center">
                <div className="text-sm md:text-base font-serif font-bold text-[#f0ebe3]">{formatNumber(cps)}</div>
                <div className="text-[8px] md:text-[9px] text-[#a09a90] uppercase tracking-wider">{p("pro Sek")}</div>
              </div>
            </div>

            {/* THE COOKIE */}
            <div className="relative my-2 md:my-3 z-10 flex justify-center">
              <motion.button
                ref={cookieRef}
                onClick={handleClick}
                animate={{
                  scale: cps > 100 ? [1, 1.02, 1] : 1,
                  rotate: shakeIntensity,
                }}
                transition={{
                  scale: { repeat: Infinity, duration: 1.5 },
                }}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.08 }}
                className={`w-28 h-28 md:w-36 md:h-36 rounded-full border-2 flex items-center justify-center text-[56px] md:text-[72px] select-none cursor-pointer relative overflow-hidden bg-transparent transition-all duration-300 ${
                  activeEffects.clickFrenzy > 0
                    ? "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                    : activeEffects.frenzy > 0
                    ? "border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.4)]"
                    : rainbowMode
                    ? "border-[#FFA586] shadow-[0_0_50px_rgba(255,165,134,0.5)]"
                    : "border-[rgba(240,235,227,0.12)] hover:border-[rgba(240,235,227,0.25)]"
                } ${grandmapocalypse ? "hover:shadow-[0_0_40px_rgba(220,38,38,0.3)]" : ""}`}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <span className={`${rainbowMode ? "animate-spin-slow" : ""}`}>{cookieSkin}</span>

                {/* Click particles (max 5) */}
                <AnimatePresence>
                  {particles.map((pt) => (
                    <motion.span
                      key={pt.id}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{
                        opacity: 0,
                        y: -100 - Math.random() * 50,
                        x: (Math.random() - 0.5) * 80,
                        scale: 1.5,
                        rotate: Math.random() * 360,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute pointer-events-none text-lg"
                      style={{ left: pt.x, top: pt.y }}
                    >
                      {pt.emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>

                {/* +CPC text */}
                <AnimatePresence>
                  {particles.slice(-3).map((pp) => (
                    <motion.span
                      key={`t-${pp.id}`}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -60, scale: 1.4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute text-[#FFA586] font-serif font-bold text-sm pointer-events-none"
                      style={{ left: pp.x - 20, top: pp.y - 30 }}
                    >
                      +{formatNumber(cpc)}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Bottom info */}
            <div className="text-center relative z-10 mt-1">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <button
                  onClick={() => setShowAscendModal(true)}
                  className="text-[10px] md:text-xs px-2.5 md:px-3 py-1 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full transition-colors min-h-[32px]"
                  title="Ascend für permanente Boni"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  ✨ Ascend {potentialHeavenly > heavenlyChips ? `(${potentialHeavenly})` : ""}
                </button>
                <button
                  onClick={handleManualSave}
                  className={`text-[10px] md:text-xs px-2.5 md:px-3 py-1 border rounded-full transition-all min-h-[32px] ${
                    saveFlash
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : "border-[rgba(240,235,227,0.15)] text-[#a09a90] hover:text-[#FFA586] hover:border-[#FFA586]/30"
                  }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  💾 Save
                </button>
                <button
                  onClick={resetAll}
                  className="text-[10px] md:text-xs text-red-500/40 hover:text-red-500 transition-all min-h-[32px]"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  🗑️
                </button>
              </div>

              {/* Ascension Progress Bar */}
              <div className="mt-3 w-full max-w-[240px] mx-auto relative z-10">
                <div className="flex justify-between items-center text-[8px] text-[#a09a90] mb-1 font-mono uppercase tracking-wider">
                  <span>Nächster Chip</span>
                  <span className="text-amber-400 font-bold">
                    {potentialHeavenly - heavenlyChips > 0 ? `+${potentialHeavenly - heavenlyChips} 💫` : "0 💫"}
                  </span>
                </div>
                <div className="w-full h-1 bg-[rgba(240,235,227,0.06)] rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (totalCookies / nextChipThreshold) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[7px] text-[#a09a90]/40 mt-1 font-mono">
                  <span>{formatNumber(totalCookies)} / {formatNumber(nextChipThreshold)}</span>
                  <span>{Math.floor(Math.min(100, (totalCookies / nextChipThreshold) * 100))}%</span>
                </div>
              </div>

              <p className="text-[8px] text-[#a09a90]/25 mt-1 font-mono">
                🥚 {easterEggsFound.length}/25 · {totalClicks.toLocaleString("de-DE")} Klicks
              </p>
            </div>

            {/* Wandering Trader (in cookie area) */}
            <AnimatePresence>
              {traderVisible && traderDeals.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full max-w-sm border border-emerald-500/20 bg-emerald-500/5 rounded-sm overflow-hidden relative z-10"
                >
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] md:text-[10px] font-bold text-emerald-400">
                        🧳 Händler
                      </span>
                      <span className="text-[8px] font-mono text-emerald-400/60">
                        ⏱ {traderTimer}s
                      </span>
                    </div>
                    <div className="space-y-1">
                      {traderDeals.map((deal) => {
                        const canBuy = cookies >= deal.cost;
                        return (
                          <button
                            key={deal.id}
                            onClick={() => buyDeal(deal)}
                            disabled={!canBuy}
                            className={`w-full flex items-center gap-1.5 p-1.5 text-left border rounded-sm transition-all ${
                              canBuy
                                ? "bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer"
                                : "bg-transparent opacity-40 cursor-not-allowed border-[rgba(240,235,227,0.06)]"
                            }`}
                            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          >
                            <span className="text-sm shrink-0">{deal.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[9px] font-semibold truncate text-emerald-300">{deal.name}</div>
                              <div className="text-[7px] text-[#a09a90]">{deal.desc}</div>
                            </div>
                            <span className="text-[8px] font-mono font-bold text-emerald-400/80 shrink-0">
                              {formatNumber(deal.cost)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ RIGHT: Shop / Tabs ═══ */}
          <div className="border border-[rgba(240,235,227,0.12)] flex flex-col rounded-sm overflow-hidden">
            {/* Tab bar */}
            <div className={`grid ${isAdmin ? "grid-cols-6" : "grid-cols-5"} border-b border-[rgba(240,235,227,0.12)] shrink-0`}>
              {([
                { key: "buildings" as const, icon: Building2, label: p("Gebäude") },
                { key: "clicks" as const, icon: Zap, label: p("Klick") },
                { key: "achievements" as const, icon: Trophy, label: "🏆" },
                { key: "stats" as const, icon: BarChart3, label: "📊" },
                { key: "leaderboard" as const, icon: Crown, label: "👑" },
                ...(isAdmin ? [{ key: "admin" as const, icon: Settings, label: "⚙️" }] : []),
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors flex flex-col items-center gap-0.5 ${
                    activeTab === tab.key
                      ? "bg-[rgba(240,235,227,0.05)] text-[#FFA586]"
                      : "text-[#a09a90] hover:text-[#f0ebe3]"
                  }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Buy Mode Selector */}
            {(activeTab === "buildings" || activeTab === "clicks") && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(240,235,227,0.02)] border-b border-[rgba(240,235,227,0.08)] shrink-0">
                <span className="text-[9px] text-[#a09a90] uppercase tracking-wider font-mono">Menge kaufen:</span>
                <div className="flex gap-1">
                  {([1, 10, 100, "max"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBuyMode(mode)}
                      className={`px-2 py-0.5 text-[9px] font-bold font-mono border rounded-sm transition-all cursor-pointer ${
                        buyMode === mode
                          ? "border-[#FFA586] text-[#FFA586] bg-[#FFA586]/10"
                          : "border-[rgba(240,235,227,0.08)] text-[#a09a90] hover:text-[#f0ebe3] bg-transparent"
                      }`}
                    >
                      {mode === "max" ? "MAX" : `x${mode}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-1.5">
              {/* ─── Buildings Tab ─── */}
              {activeTab === "buildings" && buildings.map((b) => {
                const cost = getCost(b.baseCost, b.owned);
                let bulkCount = 1;
                let bulkCost = cost;
                let canBuyBulk = cookies >= cost;
                
                if (buyMode === 10) {
                  bulkCount = 10;
                  bulkCost = getBulkCost(b.baseCost, b.owned, 10);
                  canBuyBulk = cookies >= bulkCost;
                } else if (buyMode === 100) {
                  bulkCount = 100;
                  bulkCost = getBulkCost(b.baseCost, b.owned, 100);
                  canBuyBulk = cookies >= bulkCost;
                } else if (buyMode === "max") {
                  const stats = getMaxAffordable(b.baseCost, b.owned, cookies);
                  bulkCount = Math.max(1, stats.count);
                  bulkCost = stats.count > 0 ? stats.cost : cost;
                  canBuyBulk = stats.count > 0;
                }

                return (
                  <button
                    key={b.id}
                    onClick={() => buyBuilding(b.id)}
                    disabled={!canBuyBulk}
                    className={`w-full flex items-center gap-2 md:gap-3 p-3 transition-all text-left border rounded-sm min-h-[56px] ${
                      canBuyBulk
                        ? "bg-[#141416]/60 hover:bg-[#FFA586]/10 border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 cursor-pointer"
                        : "bg-transparent opacity-30 cursor-not-allowed border-[rgba(240,235,227,0.06)]"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="text-xl md:text-2xl shrink-0">{duckMode ? "🦆" : b.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] md:text-xs font-semibold truncate text-[#f0ebe3]">{p(b.name)}</div>
                      <div className="text-[9px] text-[#a09a90] font-mono mt-0.5">
                        +{formatNumber(b.cps * prestigeMultiplier * nightBonus * bulkCount)}/s · {formatNumber(bulkCost)} 🍪
                      </div>
                      <div className="text-[8px] text-[#706b63] mt-0.5 hidden sm:block">{b.desc}</div>
                    </div>
                    <span className="text-xs md:text-sm font-serif font-black text-[#a09a90] px-1 md:px-2 shrink-0">
                      {buyMode !== 1 && bulkCount > 0 ? `+${bulkCount} ` : ""}x{b.owned}
                    </span>
                  </button>
                );
              })}

              {/* ─── Click Upgrades Tab ─── */}
              {activeTab === "clicks" && clickUpgrades.map((u) => {
                const cost = getCost(u.baseCost, u.owned);
                let bulkCount = 1;
                let bulkCost = cost;
                let canBuyBulk = cookies >= cost;
                
                if (buyMode === 10) {
                  bulkCount = 10;
                  bulkCost = getBulkCost(u.baseCost, u.owned, 10);
                  canBuyBulk = cookies >= bulkCost;
                } else if (buyMode === 100) {
                  bulkCount = 100;
                  bulkCost = getBulkCost(u.baseCost, u.owned, 100);
                  canBuyBulk = cookies >= bulkCost;
                } else if (buyMode === "max") {
                  const stats = getMaxAffordable(u.baseCost, u.owned, cookies);
                  bulkCount = Math.max(1, stats.count);
                  bulkCost = stats.count > 0 ? stats.cost : cost;
                  canBuyBulk = stats.count > 0;
                }

                return (
                  <button
                    key={u.id}
                    onClick={() => buyClickUpgrade(u.id)}
                    disabled={!canBuyBulk}
                    className={`w-full flex items-center gap-2 md:gap-3 p-3 transition-all text-left border rounded-sm min-h-[56px] ${
                      canBuyBulk
                        ? "bg-[#141416]/60 hover:bg-[#FFA586]/10 border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 cursor-pointer"
                        : "bg-transparent opacity-30 cursor-not-allowed border-[rgba(240,235,227,0.06)]"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className="text-xl md:text-2xl shrink-0">{duckMode ? "🦆" : u.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] md:text-xs font-semibold truncate text-[#f0ebe3]">{u.name}</div>
                      <div className="text-[9px] text-[#a09a90] font-mono mt-0.5">
                        +{formatNumber(u.cpcAdd * prestigeMultiplier * bulkCount)}/klick · {formatNumber(bulkCost)} 🍪
                      </div>
                    </div>
                    <span className="text-xs md:text-sm font-serif font-black text-[#a09a90] px-1 md:px-2 shrink-0">
                      {buyMode !== 1 && bulkCount > 0 ? `+${bulkCount} ` : ""}x{u.owned}
                    </span>
                  </button>
                );
              })}

              {/* ─── Achievements Tab ─── */}
              {activeTab === "achievements" && (
                <div>
                  <div className="text-xs text-[#a09a90] mb-3 px-1">
                    {unlockedAchievements} / {achievements.length} freigeschaltet
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {achievements.map((a) => (
                      <div
                        key={a.id}
                        className={`p-2.5 border rounded-sm transition-all ${
                          a.unlocked
                            ? "border-[#FFA586]/30 bg-[#FFA586]/5"
                            : a.hidden
                            ? "border-[rgba(240,235,227,0.06)] bg-transparent opacity-40"
                            : "border-[rgba(240,235,227,0.08)] bg-transparent opacity-50"
                        }`}
                      >
                        <div className="text-lg mb-1">{a.unlocked ? a.emoji : a.hidden ? "❓" : a.emoji}</div>
                        <div className="text-[10px] font-semibold text-[#f0ebe3] truncate">
                          {a.unlocked ? a.name : a.hidden ? "???" : a.name}
                        </div>
                        <div className="text-[8px] text-[#706b63] mt-0.5 truncate">
                          {a.unlocked ? a.desc : a.hidden ? "Verstecktes Achievement" : a.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Stats Tab ─── */}
              {activeTab === "stats" && (
                <div className="space-y-3 overflow-y-auto">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mb-2">📊 Statistiken</h3>
                  {([
                    ["🍪 Aktuelle Cookies", formatNumber(cookies)],
                    ["📦 Cookies Gesamt", formatNumber(totalCookies)],
                    ["👆 Klicks Gesamt", totalClicks.toLocaleString("de-DE")],
                    ["🏗️ Gebäude Gesamt", totalBuildings.toString()],
                    ["⚡ Pro Klick", formatNumber(cpc)],
                    ["🔄 Pro Sekunde", formatNumber(cps)],
                    ["✨ Prestige Level", prestigeLevel.toString()],
                    ["💫 Heavenly Chips", heavenlyChips.toString()],
                    ["📈 Prestige Bonus", `+${prestigeLevel * 10}%`],
                    ["🌟 Goldene Cookies", goldenClicked.toString()],
                    ["🏆 Achievements", `${unlockedAchievements}/${achievements.length}`],
                    ["🥚 Easter Eggs", `${easterEggsFound.length}/25`],
                    ["⏱️ Spielzeit", formatTime(Date.now() - startTime)],
                    [isNightTime() ? "🌙 Nacht-Bonus" : "☀️ Tag-Modus", isNightTime() ? "2x AKTIV!" : "Normal"],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-[rgba(240,235,227,0.06)]">
                      <span className="text-[10px] md:text-[11px] text-[#a09a90]">{label}</span>
                      <span className="text-[10px] md:text-xs font-mono font-bold text-[#f0ebe3]">{value}</span>
                    </div>
                  ))}

                  {/* Building breakdown */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mt-4 mb-2">🏗️ Gebäude-Details</h3>
                  {buildings.filter((b) => b.owned > 0).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-[rgba(240,235,227,0.04)]">
                      <span className="text-[10px] md:text-[11px] text-[#a09a90]">{b.emoji} {b.name}</span>
                      <span className="text-[10px] md:text-xs font-mono text-[#f0ebe3]">x{b.owned} ({formatNumber(b.cps * b.owned * prestigeMultiplier * nightBonus)}/s)</span>
                    </div>
                  ))}
                  {buildings.filter((b) => b.owned > 0).length === 0 && (
                    <p className="text-[10px] text-[#706b63] italic">Noch keine Gebäude gekauft</p>
                  )}

                  {/* Easter eggs found */}
                  {easterEggsFound.length > 0 && (
                    <>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mt-4 mb-2">🥚 Gefundene Easter Eggs</h3>
                      <div className="flex flex-wrap gap-1">
                        {easterEggsFound.map((egg) => {
                          const a = achievements.find((x) => x.id === egg);
                          return (
                            <span key={egg} className="text-[10px] md:text-xs px-2 py-1 bg-[#FFA586]/10 border border-[#FFA586]/20 rounded-full">
                              {a?.emoji || "🥚"} {a?.name || egg}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Cookie Skins */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mt-4 mb-2">🎨 Cookie Skins</h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COOKIE_SKINS.map((skin) => {
                      const isUnlocked = prestigeLevel >= skin.reqLevel;
                      const isEquipped = cookieSkin === skin.emoji;
                      return (
                        <button
                          key={skin.id}
                          disabled={!isUnlocked}
                          onClick={() => {
                            setCookieSkin(skin.emoji);
                            showNotification(`🎨 Skin gewechselt: ${skin.name}!`);
                          }}
                          className={`p-2 border rounded-sm transition-all flex flex-col items-center justify-center relative ${
                            isEquipped
                              ? "border-[#FFA586] bg-[#FFA586]/10 text-[#FFA586]"
                              : isUnlocked
                              ? "border-[rgba(240,235,227,0.12)] bg-[#141416]/40 hover:bg-[#FFA586]/5 cursor-pointer text-[#f0ebe3]"
                              : "border-[rgba(240,235,227,0.06)] bg-transparent opacity-40 cursor-not-allowed text-[#706b63]"
                          }`}
                        >
                          <span className="text-2xl mb-1">{isUnlocked ? skin.emoji : "🔒"}</span>
                          <span className="text-[8px] font-semibold truncate w-full text-center">{skin.name}</span>
                          {!isUnlocked && (
                            <span className="text-[7px] text-amber-500 mt-0.5 font-mono">Prestige Lv.{skin.reqLevel}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Leaderboard Tab ─── */}
              {activeTab === "leaderboard" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586]">👑 Rangliste</h3>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[rgba(240,235,227,0.02)] border border-[rgba(240,235,227,0.08)] rounded-sm mb-3">
                    <span className="text-[10px] md:text-xs text-[#a09a90]">Auf Rangliste anzeigen:</span>
                    <button
                      onClick={() => handleToggleLeaderboard(!leaderboardOptIn)}
                      className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        leaderboardOptIn
                          ? "border-green-500/30 text-green-400 bg-green-500/10"
                          : "border-red-500/30 text-red-400 bg-red-500/10"
                      }`}
                    >
                      {leaderboardOptIn ? "Ja" : "Nein"}
                    </button>
                  </div>
                  {leaderboard.length === 0 ? (
                    <p className="text-[10px] text-[#706b63] italic text-center py-8">
                      Noch keine Einträge. Spiel weiter, um auf die Rangliste zu kommen!
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {leaderboard.map((entry, i) => {
                        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                        const isCurrentPlayer = entry.name === playerName;
                        return (
                          <div
                            key={`${entry.name}-${i}`}
                            className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 border rounded-sm min-h-[50px] ${
                              isCurrentPlayer
                                ? "border-[#FFA586]/30 bg-[#FFA586]/5"
                                : "border-[rgba(240,235,227,0.06)] bg-transparent"
                            }`}
                          >
                            <span className="text-base md:text-lg shrink-0 w-8 text-center font-serif font-bold">
                              {medal}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[11px] md:text-xs font-semibold truncate ${isCurrentPlayer ? "text-[#FFA586]" : "text-[#f0ebe3]"}`}>
                                {entry.name}
                              </div>
                              <div className="text-[9px] text-[#a09a90] font-mono mt-0.5">
                                {formatNumber(entry.totalCookies)} 🍪 total · ✨ Lv.{entry.prestigeLevel} · 🏆 {entry.achievements}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Admin Tab ─── */}
              {activeTab === "admin" && isAdmin && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mb-2">⚙️ Admin Menü</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        addCookies(1000000);
                        showNotification("🪄 Admin: +1M Cookies!");
                      }}
                      className="w-full py-2 bg-[#141416] hover:bg-[#FFA586]/20 border border-[rgba(240,235,227,0.15)] rounded-sm text-xs font-bold transition-all text-left px-3 flex items-center justify-between cursor-pointer"
                    >
                      <span>🍪 Gebe +1M Cookies</span>
                      <span className="text-[#FFA586] font-mono">+1.0M</span>
                    </button>
                    <button
                      onClick={() => {
                        addCookies(1000000000);
                        showNotification("🪄 Admin: +1B Cookies!");
                      }}
                      className="w-full py-2 bg-[#141416] hover:bg-[#FFA586]/20 border border-[rgba(240,235,227,0.15)] rounded-sm text-xs font-bold transition-all text-left px-3 flex items-center justify-between cursor-pointer"
                    >
                      <span>🍪 Gebe +1B Cookies</span>
                      <span className="text-[#FFA586] font-mono">+1.0B</span>
                    </button>
                    <button
                      onClick={() => {
                        const nextId = ++goldenIdRef.current;
                        const x = 10 + Math.random() * 70;
                        const y = 15 + Math.random() * 60;
                        setGoldenCookies((prev) => [...prev, { id: nextId, x, y, type: "clickFrenzy" }]);
                        setTimeout(() => setGoldenCookies((prev) => prev.filter((g) => g.id !== nextId)), 13000);
                        showNotification("🪄 Admin: Goldenen Cookie gespawnt!");
                      }}
                      className="w-full py-2 bg-[#141416] hover:bg-[#FFA586]/20 border border-[rgba(240,235,227,0.15)] rounded-sm text-xs font-bold transition-all text-left px-3 flex items-center justify-between cursor-pointer"
                    >
                      <span>✨ Goldener Cookie rufen</span>
                      <span className="text-amber-400 font-mono">Spawn</span>
                    </button>
                    <button
                      onClick={() => {
                        const deals = generateTraderDeals();
                        if (deals.length > 0) {
                          setTraderDeals(deals);
                          setTraderVisible(true);
                          setTraderTimer(60);
                          buyingDealsRef.current.clear();
                          showNotification("🪄 Admin: Händler gerufen!");
                        }
                      }}
                      className="w-full py-2 bg-[#141416] hover:bg-[#FFA586]/20 border border-[rgba(240,235,227,0.15)] rounded-sm text-xs font-bold transition-all text-left px-3 flex items-center justify-between cursor-pointer"
                    >
                      <span>🧳 Händler rufen</span>
                      <span className="text-emerald-400 font-mono">Spawn</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Möchtest du wirklich die gesamte Rangliste leeren?")) {
                          resetServerLeaderboard();
                          showNotification("🪄 Admin: Rangliste geleert!");
                        }
                      }}
                      className="w-full py-2 bg-red-950/20 hover:bg-red-950/50 border border-red-500/30 rounded-sm text-xs font-bold transition-all text-left px-3 flex items-center justify-between text-red-400 cursor-pointer"
                    >
                      <span>⚠️ Gesamte Rangliste leeren</span>
                      <span className="font-mono">RESET</span>
                    </button>
                  </div>

                  {/* Player Database Manager */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mt-4 mb-2">👥 Spieler-Datenbank verwalten</h3>
                  {leaderboard.length === 0 ? (
                    <p className="text-[9px] text-[#706b63] italic text-center py-4">Keine Spieler auf der Rangliste vorhanden.</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {leaderboard.map((entry) => {
                        const isEditing = editingPlayerName === entry.name;
                        if (isEditing) {
                          return (
                            <div key={entry.name} className="p-2 border border-[#FFA586]/30 bg-[#FFA586]/5 rounded-sm space-y-2">
                              <div className="text-[10px] font-bold text-[#FFA586]">Bearbeite: {entry.name}</div>
                              <div className="grid grid-cols-3 gap-1">
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-[#a09a90]">Cookies</span>
                                  <input
                                    type="number"
                                    value={editCookiesInput}
                                    onChange={(e) => setEditCookiesInput(e.target.value)}
                                    className="bg-[#141416] text-[#f0ebe3] border border-[rgba(240,235,227,0.15)] text-[9px] px-1 py-0.5 rounded-sm w-full font-mono"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-[#a09a90]">Prestige</span>
                                  <input
                                    type="number"
                                    value={editPrestigeInput}
                                    onChange={(e) => setEditPrestigeInput(e.target.value)}
                                    className="bg-[#141416] text-[#f0ebe3] border border-[rgba(240,235,227,0.15)] text-[9px] px-1 py-0.5 rounded-sm w-full font-mono"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[7px] text-[#a09a90]">Achievements</span>
                                  <input
                                    type="number"
                                    value={editAchievementsInput}
                                    onChange={(e) => setEditAchievementsInput(e.target.value)}
                                    className="bg-[#141416] text-[#f0ebe3] border border-[rgba(240,235,227,0.15)] text-[9px] px-1 py-0.5 rounded-sm w-full font-mono"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  onClick={() => setEditingPlayerName(null)}
                                  className="text-[8px] font-bold px-2 py-0.5 border border-[rgba(240,235,227,0.15)] text-[#a09a90] hover:bg-white/5 rounded-sm cursor-pointer"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={() => {
                                    const cookiesVal = parseFloat(editCookiesInput) || 0;
                                    const prestigeVal = parseInt(editPrestigeInput, 10) || 0;
                                    const achievementsVal = parseInt(editAchievementsInput, 10) || 0;
                                    adminUpdatePlayer(entry.name, cookiesVal, prestigeVal, achievementsVal);
                                  }}
                                  className="text-[8px] font-bold px-2 py-0.5 bg-[#FFA586] text-[#141416] rounded-sm cursor-pointer"
                                >
                                  Speichern
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={entry.name} className="flex items-center justify-between p-2 border border-[rgba(240,235,227,0.06)] bg-[#141416]/20 rounded-sm">
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-semibold text-[#f0ebe3] truncate">{entry.name}</div>
                              <div className="text-[8px] text-[#a09a90] font-mono">
                                {formatNumber(entry.totalCookies)} 🍪 · ✨ Lv.{entry.prestigeLevel} · 🏆 {entry.achievements}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <button
                                onClick={() => {
                                  setEditingPlayerName(entry.name);
                                  setEditCookiesInput(entry.totalCookies.toString());
                                  setEditPrestigeInput(entry.prestigeLevel.toString());
                                  setEditAchievementsInput(entry.achievements.toString());
                                }}
                                className="p-1 hover:bg-[#FFA586]/10 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-sm text-[8px] font-bold cursor-pointer"
                                title="Spieler bearbeiten"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => adminDeletePlayer(entry.name)}
                                className="p-1 hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-sm text-[8px] font-bold cursor-pointer"
                                title="Spieler löschen"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
