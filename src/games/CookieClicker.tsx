import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, BarChart3, Zap, Building2, Crown, Settings, MessageCircle, Briefcase, Dice5, Send } from "lucide-react";
import { SHOP_ITEMS } from "./cookie/data/shopItems";
import { COOKIE_TO_EURO_RATE } from "./cookie/context/types";
import { filterBadWords } from "./cookie/utils/badWordFilter";
import { pickWheelSegment, WHEEL_SEGMENTS, WHEEL_COOLDOWN_MS } from "./cookie/data/wheelSegments";
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
  maxOwned?: number;
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

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  type: "user" | "system";
  timestamp: number;
  isFlex?: boolean;
}

interface FeedbackEntry {
  id: string;
  author: string;
  text: string;
  rating: number;
  timestamp: number;
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
  { id: "cannabis", name: "Cannabis-Cookie", emoji: "🌿", reqLevel: 4 },
  { id: "planet", name: "Kosmisch", emoji: "🪐", reqLevel: 5 },
  { id: "diamond", name: "Diamant", emoji: "💎", reqLevel: 8 },
  { id: "royal", name: "Königlich", emoji: "👑", reqLevel: 12 },
  { id: "blackhole", name: "Singularität", emoji: "🌌", reqLevel: 18 },
  { id: "portal", name: "Dimension", emoji: "🌀", reqLevel: 25 },
  { id: "ghost", name: "Geist", emoji: "👻", reqLevel: 35 },
  { id: "alien", name: "Alien", emoji: "👽", reqLevel: 50 },
  { id: "angel", name: "Engel", emoji: "👼", reqLevel: 75 },
  { id: "god", name: "67 Cookie", emoji: "6️⃣7️⃣", reqLevel: 100 },
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
  { id: "click1", name: "Super-Finger", emoji: "⚡", baseCost: 50, cpcAdd: 1, owned: 0, maxOwned: 999 },
  { id: "click2", name: "Mega-Finger", emoji: "🚀", baseCost: 500, cpcAdd: 5, owned: 0, maxOwned: 999 },
  { id: "click3", name: "Hyper-Finger", emoji: "💥", baseCost: 5000, cpcAdd: 25, owned: 0, maxOwned: 999 },
  { id: "click4", name: "Ultra-Finger", emoji: "🪐", baseCost: 50000, cpcAdd: 120, owned: 0, maxOwned: 999 },
  { id: "click5", name: "Omega-Finger", emoji: "👑", baseCost: 500000, cpcAdd: 600, owned: 0, maxOwned: 999 },
  { id: "click6", name: "Göttlicher Finger", emoji: "✨", baseCost: 5000000, cpcAdd: 3000, owned: 0, maxOwned: 999 },
  { id: "click7", name: "Kosmo-Finger", emoji: "🌠", baseCost: 50000000, cpcAdd: 15000, owned: 0, maxOwned: 999 },
  { id: "click8", name: "Quanten-Finger", emoji: "🔆", baseCost: 500000000, cpcAdd: 80000, owned: 0, maxOwned: 999 },
  { id: "click9", name: "Infinity-Finger", emoji: "♾️", baseCost: 5000000000, cpcAdd: 450000, owned: 0, maxOwned: 999 },
  { id: "click10", name: "ÜBER-Finger", emoji: "🫳", baseCost: 50000000000, cpcAdd: 2500000, owned: 0, maxOwned: 999 },
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
  { id: "sixty_seven_clicks", name: "Die 67 Klicks", emoji: "🖱️", desc: "Genau 67 mal geklickt", unlocked: false, hidden: true },
  { id: "sixty_seven_cookies", name: "Der 67. Keks", emoji: "🍪", desc: "Genau 67 Cookies besessen", unlocked: false, hidden: true },
  { id: "sixty_seven_cps", name: "67 pro Sekunde", emoji: "🔄", desc: "Genau 67 CPS erreicht", unlocked: false, hidden: true },
  { id: "sixty_seven_cpc", name: "67 pro Klick", emoji: "⚡", desc: "Genau 67 CPC erreicht", unlocked: false, hidden: true },
  { id: "sixty_seven_code", name: "Geheimnis der 67", emoji: "🕵️", desc: "Secret Code: 67", unlocked: false, hidden: true },
  // V1.2 Achievements
  { id: "weed_mode", name: "420 Blaze It", emoji: "🌿", desc: "Cannabis-Cookie freigeschaltet", unlocked: false, hidden: true },
  { id: "mode_420", name: "Stoner Cookie", emoji: "💨", desc: "420 Modus aktiviert", unlocked: false, hidden: true },
  { id: "mode_161", name: "ACAB Cookie", emoji: "🤘", desc: "161 Punk Modus aktiviert", unlocked: false, hidden: true },
  { id: "casino_win", name: "Jackpot!", emoji: "🎰", desc: "Im Casino gewonnen", unlocked: false, hidden: true },
  { id: "casino_lose", name: "Pleite!", emoji: "😭", desc: "Alles im Casino verloren", unlocked: false, hidden: true },
  { id: "rage_500", name: "RAGE MODE!", emoji: "💥", desc: "x500 Multiplier erlebt", unlocked: false, hidden: true },
  { id: "storm_hunter", name: "Storm-Jäger", emoji: "🌪️", desc: "10 Cookies im Storm gefangen", unlocked: false, hidden: true },
  { id: "big_spender", name: "Big Spender", emoji: "💸", desc: "100€ im Shop ausgegeben", unlocked: false, hidden: true },
  { id: "first_chat", name: "Redseliger Bäcker", emoji: "💬", desc: "Erste Chat-Nachricht gesendet", unlocked: false, hidden: true },
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

  const [activeTab, setActiveTab] = useState<"buildings" | "clicks" | "achievements" | "stats" | "leaderboard" | "admin" | "chat" | "casino" | "pocket" | "feedback">("buildings");
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
  const [showTutorial, setShowTutorial] = useState(() => localStorage.getItem("cc_tutorial_seen") !== "true");
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
  const [adminPassword, setAdminPassword] = useState("");
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
  const [syncPassword, setSyncPassword] = useState(() => lsGet("cc_sync_password") || "");
  const [syncUsername, setSyncUsername] = useState(() => lsGet("cc_sync_username") || "");
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });

  useEffect(() => {
    if (playerName && playerName !== "Anonym") {
      setSyncUsername(playerName);
    }
  }, [playerName]);

  const [showPatchlog, setShowPatchlog] = useState(false);

  // ── V1.2 State ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [rageMode, setRageMode] = useState(false);
  const [rageCooldown, setRageCooldown] = useState(0);
  const [stormMultiplier, setStormMultiplier] = useState(1);
  const [stormHits, setStormHits] = useState(0);
  const [coinFlipBet, setCoinFlipBet] = useState("");
  const [casinoCooldown, setCasinoCooldown] = useState(0);
  const [slotResult, setSlotResult] = useState<string[] | null>(null);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [pocketCash, setPocketCash] = useState(0);
  const [pocketInventory, setPocketInventory] = useState<Array<{id: string; shopItemId: string; name: string; emoji: string; acquiredAt: number; used: boolean}>>([]); 
  const [exchangeInput, setExchangeInput] = useState("");
  const [nextClickMult, setNextClickMult] = useState(1);
  const [goldenMagnet, setGoldenMagnet] = useState(false);
  const [permanentCpsBonus, setPermanentCpsBonus] = useState(0);
  const [lastSpinTimestamp, setLastSpinTimestamp] = useState(0);
  const [extraSpins, setExtraSpins] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return lsGet("cc_active_theme_id") || "classic";
  });
  const [customThemes, setCustomThemes] = useState<{
    [id: string]: {
      name: string;
      accentColor: string;
      panelBg: string;
      bgColor: string;
      textColor: string;
    }
  }>(() => {
    const raw = lsGet("cc_custom_themes");
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fallback */ }
    }
    return {};
  });

  const PRESET_THEMES = useMemo(() => [
    {
      id: "classic",
      name: "Klassisch (Default)",
      accentColor: "#FFA586",
      panelBg: "#1c1c1f",
      bgColor: "#141416",
      textColor: "#f0ebe3",
    },
    {
      id: "cyberpunk",
      name: "Neon Cyberpunk",
      accentColor: "#00ffcc",
      panelBg: "#0f0f1b",
      bgColor: "#050508",
      textColor: "#00ffcc",
    },
    {
      id: "sakura",
      name: "Sakura Dream",
      accentColor: "#ffb7c5",
      panelBg: "#2d1a22",
      bgColor: "#1c0f14",
      textColor: "#ffeef2",
    },
    {
      id: "toxic",
      name: "Toxic Waste",
      accentColor: "#39ff14",
      panelBg: "#161b16",
      bgColor: "#090b09",
      textColor: "#e5ffe5",
    },
    {
      id: "deepocean",
      name: "Deep Ocean",
      accentColor: "#00a8ff",
      panelBg: "#0c192c",
      bgColor: "#050c16",
      textColor: "#e1f5fe",
    },
    {
      id: "sunset",
      name: "Sunset Glow",
      accentColor: "#ff5e62",
      panelBg: "#2b141e",
      bgColor: "#180b11",
      textColor: "#ffebee",
    },
  ], []);

  const currentTheme = useMemo(() => {
    if (activeThemeId === "classic") return PRESET_THEMES[0];
    const preset = PRESET_THEMES.find(t => t.id === activeThemeId);
    if (preset) return preset;
    const custom = customThemes[activeThemeId];
    if (custom) return custom;
    return PRESET_THEMES[0]; // fallback
  }, [activeThemeId, customThemes, PRESET_THEMES]);

  useEffect(() => {
    const root = document.querySelector(".cookie-clicker-root") as HTMLElement | null;
    const el = root ?? document.documentElement;
    el.style.setProperty("--cc-accent", currentTheme.accentColor);
    el.style.setProperty("--cc-panel-bg", currentTheme.panelBg);
    el.style.setProperty("--cc-bg", currentTheme.bgColor);
    el.style.setProperty("--cc-text", currentTheme.textColor);
    el.style.setProperty("--cc-text-dim", `color-mix(in srgb, ${currentTheme.textColor} 70%, transparent)`);
    el.style.setProperty("--cc-text-dark", `color-mix(in srgb, ${currentTheme.textColor} 40%, transparent)`);
    lsSet("cc_active_theme_id", activeThemeId);
  }, [currentTheme, activeThemeId]);

  // Chat QoL refs/states
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [tempNameInput, setTempNameInput] = useState("");
  const [notifyChat, setNotifyChat] = useState<boolean>(() => {
    return lsGet("cc_notify_chat") !== "false";
  });
  const [notifyMentions, setNotifyMentions] = useState<boolean>(() => {
    return lsGet("cc_notify_mentions") !== "false";
  });
  const [chatNotifications, setChatNotifications] = useState<Array<{
    id: string;
    author: string;
    text: string;
    isMention: boolean;
  }>>([]);

  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

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
  const frenzyMultiplier = activeEffects.frenzy > 0 ? 2 : 1;
  const permanentBonus = 1 + permanentCpsBonus / 100;
  const baseCps = buildings.reduce((sum, b) => sum + b.cps * b.owned, 0);
  const cps = baseCps * prestigeMultiplier * nightBonus * frenzyMultiplier * permanentBonus * stormMultiplier;
  const clickFrenzyMultiplier = activeEffects.clickFrenzy > 0 ? 10 : 1;
  const rageMult = rageMode ? 500 : 1;
  const baseCpc = 1 + clickUpgrades.reduce((sum, u) => sum + u.cpcAdd * u.owned, 0);
  const cpc = baseCpc * prestigeMultiplier * clickFrenzyMultiplier * rageMult * nextClickMult;
  const totalBuildings = buildings.reduce((sum, b) => sum + b.owned, 0);
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;
  const nextChipLevel = heavenlyChips + 1;
  const nextChipThreshold = Math.floor(1000000 * Math.pow(1.56, heavenlyChips));
  const canAscend = totalCookies >= nextChipThreshold && heavenlyChips < 100;
  const potentialHeavenly = canAscend ? nextChipLevel : heavenlyChips;
  const isAdmin = isAdminUnlocked;

  // ── Notification helper ──
  const showNotification = useCallback((msg: string) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(msg);
    notifTimerRef.current = setTimeout(() => setNotification(null), 4000);
  }, []);

  const deleteCustomTheme = useCallback((id: string) => {
    setCustomThemes(prev => {
      const updated = { ...prev };
      delete updated[id];
      lsSet("cc_custom_themes", JSON.stringify(updated));
      return updated;
    });
    setActiveThemeId("classic");
    showNotification("🗑️ Custom-Theme gelöscht!");
  }, [showNotification]);

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

  const loadState = useCallback((state: GameState) => {
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

    if (state.buildings) {
      setBuildings((prev) => prev.map((b) => {
        const sb = state.buildings.find((x) => x.id === b.id);
        return sb ? { ...b, owned: sb.owned } : b;
      }));
    }
    if (state.clickUpgrades) {
      setClickUpgrades((prev) => prev.map((u) => {
        const su = state.clickUpgrades.find((x) => x.id === u.id);
        return su ? { ...u, owned: su.owned } : u;
      }));
    }
    if (state.achievements) {
      setAchievements((prev) => prev.map((a) => {
        const sa = state.achievements.find((x) => x.id === a.id);
        return sa ? { ...a, unlocked: sa.unlocked } : a;
      }));
    }
  }, [setCookies, setTotalCookies, setCookiesBakedAllTime, setTotalClicks, setPrestigeLevel, setHeavenlyChips, setGoldenClicked, setEasterEggsFound, setCookieSkin, setPirateMode, setDuckMode, setGrandmapocalypse, setLastSaveTime, setPlayerName, setLastRenamed, setLeaderboardOptIn, setLastCaptchaTime, setBuildings, setClickUpgrades, setAchievements]);

  const handleCloudSync = async (mode: 'save' | 'load', isAuto = false) => {
    if (!syncUsername || !syncPassword) {
      if (!isAuto) setSyncStatus({ loading: false, error: "Bitte Name und Passwort eingeben!" });
      return;
    }
    if (!isAuto) setSyncStatus({ loading: true, error: undefined, success: undefined });
    
    try {
      const crypto = window.crypto || (window as any).msCrypto;
      const encoder = new TextEncoder();
      const data = encoder.encode(syncPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const url = `/.netlify/functions/savegame`;
      
      const stateToSave = mode === 'save' ? {
        cookies, totalCookies, cookiesBakedAllTime, totalClicks, buildings, clickUpgrades,
        achievements, prestigeLevel, heavenlyChips, cookieSkin, startTime, goldenClicked,
        easterEggsFound, pirateMode, duckMode, grandmapocalypse, lastSaveTime: Date.now(),
        playerName: syncUsername, lastRenamed, leaderboardOptIn, lastCaptchaTime
      } : null;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          name: syncUsername,
          password: syncPassword,
          state: stateToSave
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Netzwerkfehler');

      if (mode === 'load' && json.state) {
        const cloudTime = json.state.lastSaveTime || 0;
        const localSaveRaw = lsGet("cc_save_v2");
        const localTime = localSaveRaw ? (JSON.parse(localSaveRaw).lastSaveTime || 0) : 0;
        
        if (!isAuto || cloudTime > localTime) {
          loadState(json.state);
          setTimeout(() => doSave(), 500); // Trigger save to local storage
          if (isAuto) {
            showNotification("☁️ Spielstand automatisch geladen!");
          }
        }
      } else if (mode === 'save') {
        setPlayerName(syncUsername);
        setTimeout(() => doSave(), 500);
      }

      if (!isAuto) {
        setSyncStatus({ loading: false, success: mode === 'save' ? 'Erfolgreich gespeichert!' : 'Spielstand geladen!' });
      }
      
      // Save credentials for auto sync
      lsSet("cc_sync_username", syncUsername);
      lsSet("cc_sync_password", syncPassword);

      // Unlock admin automatically if master password is used
      if (syncPassword === 'moritz2026') {
        setIsAdminUnlocked(true);
        setAdminPassword('moritz2026');
        showNotification("🪄 Admin-Modus freigeschaltet!");
      }
    } catch (e: any) {
      setSyncStatus({ loading: false, error: e.message });
    }
  };

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
        loadState(state);

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

      // Check for Patchlog
      if (!lsGet("cc_patchlog_v1_2")) {
        setShowPatchlog(true);
      }

      // V1.2: Load pocket data
      const pocketRaw = lsGet("cc_pocket_v12");
      if (pocketRaw) {
        try {
          const pocket = JSON.parse(pocketRaw);
          setPocketCash(pocket.cash || 0);
          setPocketInventory(pocket.inventory || []);
          setLastSpinTimestamp(pocket.lastSpinTimestamp || 0);
          setPermanentCpsBonus(pocket.permanentCpsBonus || 0);
        } catch { /* ignore */ }
      }

      // V1.2: Auto-unlock skins for players who already have the required prestige level
      // (so new skins added in updates are auto-unlocked if player is already past that level)
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

    // V1.2: Save pocket data separately
    lsSet("cc_pocket_v12", JSON.stringify({
      cash: pocketCash,
      inventory: pocketInventory,
      lastSpinTimestamp,
      permanentCpsBonus,
    }));

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
        setActiveEffects((e) => ({ ...e, frenzy: Math.max(e.frenzy, Date.now() + 5000) }));
        showNotification(`⚡ ${deal.value}x CPS Boost für 30s!`);
        break;
      case "cpc_mult":
        setActiveEffects((e) => ({ ...e, clickFrenzy: Math.max(e.clickFrenzy, Date.now() + 5000) }));
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

  // V1.2: Rage cooldown countdown
  useEffect(() => {
    if (rageCooldown <= 0) return;
    const id = setInterval(() => {
      setRageCooldown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rageCooldown > 0]);

  // V1.2: Chat polling (every 3s)
  useEffect(() => {
    if (!loaded) return;
    const API = '/.netlify/functions';
    const fetchChat = async () => {
      try {
        const res = await fetch(`${API}/chat`);
        if (res.ok) {
          const msgs: ChatMessage[] = await res.json();
          setChatMessages(msgs);
          return;
        }
      } catch { /* ignore */ }

      // Fallback: load local chat if empty or server offline
      const localRaw = lsGet("cc_local_chat");
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          setChatMessages(parsed);
        } catch { /* ignore */ }
      } else {
        // Pre-populate with a welcome message from Oma if first time
        const initialMsgs: ChatMessage[] = [
          {
            id: "welcome_1",
            author: "Keks-Oma 👵",
            text: "Willkommen im Chat! Backe mir ein paar leckere Kekse. 🍪",
            type: "system",
            timestamp: Date.now() - 60000
          }
        ];
        setChatMessages(initialMsgs);
        lsSet("cc_local_chat", JSON.stringify(initialMsgs));
      }
    };
    fetchChat();
    const id = setInterval(fetchChat, 3000);
    return () => clearInterval(id);
  }, [loaded]);

  // Chat auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Chat notification toast handler (bottom-left)
  const lastProcessedChatMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded || chatMessages.length === 0) return;

    const latestMsg = chatMessages[chatMessages.length - 1];

    if (latestMsg.id !== lastProcessedChatMsgIdRef.current) {
      const isNewMsg = lastProcessedChatMsgIdRef.current !== null;
      lastProcessedChatMsgIdRef.current = latestMsg.id;

      if (isNewMsg && latestMsg.author !== playerName) {
        const hasMention = playerName && latestMsg.text.toLowerCase().includes(`@${playerName.toLowerCase()}`);
        
        // Settings flags
        const showAll = notifyChat;
        const showMentions = notifyMentions;

        const shouldNotify = hasMention ? showMentions : showAll;

        if (shouldNotify) {
          const newNotif = {
            id: latestMsg.id,
            author: latestMsg.author,
            text: latestMsg.text,
            isMention: !!hasMention
          };
          setChatNotifications(prev => [...prev, newNotif].slice(-3));

          setTimeout(() => {
            setChatNotifications(prev => prev.filter(n => n.id !== latestMsg.id));
          }, 5000);
        }
      }
    }
  }, [chatMessages, playerName, loaded, notifyChat, notifyMentions]);

  // V1.2: Chat Online Player Simulation (falls back to local only if server functions are offline/404)
  useEffect(() => {
    if (!loaded) return;

    const simulateMsg = () => {
      const users = ["Alessandro", "Kekser_99", "CookieGirl", "Luca", "Lara", "Bäcker_Pro", "OmasLiebling"];
      const messages = [
        "Wie viele Cookies habt ihr so? Ich hab grad die Fabrik freigeschaltet! 🏭",
        "Hat jemand schon das goldene Ticket beim Glücksrad gewonnen? 🎫",
        "Wer von euch backt auch nachts? 🌙",
        "Mein Klick-Finger tut weh... 😂",
        "Das Keks-Schild ist Lebensretter im Casino! 🛡️",
        "Gleich Prestige-Level up! 🚀",
        "Was bringt die Zeitmaschine?",
        "Spielt jemand mit Cannabis-Cookie Skin? Der sieht echt cool aus 🌿",
        playerName ? `Hey @${playerName}, hast du schon den neuen Rekord geknackt?` : "Wer ist hier der beste Bäcker?",
        "Goldener Cookie gespawned! Schnell klicken! ✨",
      ];

      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomText = messages[Math.floor(Math.random() * messages.length)];

      const newMsg: ChatMessage = {
        id: `sim_${Date.now()}`,
        author: randomUser,
        text: randomText,
        type: "user",
        timestamp: Date.now(),
      };

      const API = '/.netlify/functions';
      fetch(`${API}/chat`)
        .then(res => {
          if (!res.ok) {
            setChatMessages(prev => {
              const updated = [...prev, newMsg].slice(-50);
              lsSet("cc_local_chat", JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {
          setChatMessages(prev => {
            const updated = [...prev, newMsg].slice(-50);
            lsSet("cc_local_chat", JSON.stringify(updated));
            return updated;
          });
        });
    };

    const firstTimer = setTimeout(simulateMsg, 15000);
    const interval = setInterval(simulateMsg, 40000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [loaded, playerName]);

  // V1.2: Golden Magnet — golden cookies spawn 2x faster
  useEffect(() => {
    if (!goldenMagnet) return;
    let timerId: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const id = ++goldenIdRef.current;
      const types: GoldenCookie["type"][] = ["frenzy", "clickFrenzy", "lucky"];
      const type = types[Math.floor(Math.random() * types.length)];
      const x = 10 + Math.random() * 70;
      const y = 15 + Math.random() * 60;
      setGoldenCookies((prev) => [...prev, { id, x, y, type }]);
      setTimeout(() => setGoldenCookies((prev) => prev.filter((g) => g.id !== id)), 13000);
    };
    const scheduleExtra = () => {
      const delay = 30000 + Math.random() * 60000;
      timerId = setTimeout(() => {
        spawn();
        scheduleExtra();
      }, delay);
    };
    scheduleExtra();
    return () => clearTimeout(timerId);
  }, [goldenMagnet]);

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
    if (floored === 67 && !numberEggsTriggeredRef.current.has("sixty_seven_cookies")) {
      numberEggsTriggeredRef.current.add("sixty_seven_cookies");
      unlock("sixty_seven_cookies"); findEasterEgg("sixty_seven_cookies", "Der 67. Keks!");
    }
    if (Math.floor(cps) === 67 && !numberEggsTriggeredRef.current.has("sixty_seven_cps")) {
      numberEggsTriggeredRef.current.add("sixty_seven_cps");
      unlock("sixty_seven_cps"); findEasterEgg("sixty_seven_cps", "Exakt 67 Cookies pro Sekunde!");
    }
    if (Math.floor(cpc) === 67 && !numberEggsTriggeredRef.current.has("sixty_seven_cpc")) {
      numberEggsTriggeredRef.current.add("sixty_seven_cpc");
      unlock("sixty_seven_cpc"); findEasterEgg("sixty_seven_cpc", "Exakt 67 Cookies pro Klick!");
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
  }, [loaded, totalCookies, totalClicks, totalBuildings, cookies, cps, cpc, buildings, clickUpgrades, goldenClicked, unlock, findEasterEgg]);

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
        if (word.endsWith("67")) {
          unlock("sixty_seven_code");
          findEasterEgg("sixty_seven_code", "Secret 67 Code!");
          secretWordRef.current = "";
        }
        // V1.2: "weed" code → Cannabis Cookie Skin
        if (word.endsWith("weed")) {
          unlock("weed_mode");
          findEasterEgg("weed_mode", "420 Blaze It! 🌿 Cannabis-Cookie freigeschaltet!");
          setCookieSkin("🌿");
          showNotification("🌿 Cannabis-Cookie Skin freigeschaltet!");
          secretWordRef.current = "";
        }
        // V1.2: "420" code → 420 Mode
        if (word.endsWith("420")) {
          unlock("mode_420");
          findEasterEgg("mode_420", "Stoner Cookie Mode! 💨");
          setCookieSkin("🌿");
          showNotification("💨 420 MODE! Alles wird grün für 4:20 Minuten!");
          // Green tint effect for 4:20 minutes
          document.body.style.filter = "hue-rotate(90deg)";
          setTimeout(() => {
            document.body.style.filter = "";
            showNotification("💨 420 Mode vorbei...");
          }, 260000); // 4:20 = 260 seconds
          secretWordRef.current = "";
        }
        // V1.2: "161" code → Punk Mode (extended)
        if (word.endsWith("161")) {
          unlock("mode_161");
          findEasterEgg("mode_161", "ACAB Cookie! 🤘 Punk Mode!");
          showNotification("🤘 161 PUNK MODE! ACAB Cookie aktiviert!");
          setCookieSkin("✊");
          document.body.style.filter = "contrast(1.5) saturate(1.5)";
          setTimeout(() => {
            document.body.style.filter = "";
            if (!getSeasonalEmoji()) setCookieSkin("🍪");
          }, 60000);
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

    // V1.2: Rage Mode — 0.1% chance for x500, 3s duration, 60s cooldown
    if (!rageMode && rageCooldown <= 0 && Math.random() < 0.001) {
      setRageMode(true);
      unlock("rage_500");
      findEasterEgg("rage_500", "RAGE MODE! x500 für 3 Sekunden! 💥");
      showNotification("💥🔥 RAGE MODE! x500 MULTIPLIER FÜR 3 SEKUNDEN! 🔥💥");
      setTimeout(() => {
        setRageMode(false);
        setRageCooldown(60);
        showNotification("💨 Rage Mode vorbei... 60s Cooldown");
      }, 3000);
    }

    // V1.2: Consume next-click multiplier
    if (nextClickMult > 1) {
      addCookies(cpc);
      setNextClickMult(1);
      showNotification(`💣 BOOM! x${nextClickMult} Klick!`);
    } else {
      addCookies(cpc);
    }
    const newTotalClicks = totalClicks + 1;
    setTotalClicks(newTotalClicks);

    if (newTotalClicks === 67) {
      unlock("sixty_seven_clicks");
      findEasterEgg("sixty_seven_clicks", "Die magischen 67 Klicks!");
    }

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
        setActiveEffects((e) => ({ ...e, frenzy: 5000 }));
        showNotification("🔥 FRENZY! 2x Produktion für 5 Sekunden!");
        break;
      case "clickFrenzy":
        setActiveEffects((e) => ({ ...e, clickFrenzy: 2000 }));
        showNotification("⚡ CLICK FRENZY! 10x Klick-Power für 2 Sekunden!");
        break;
      case "lucky": {
        const bonus = Math.max(cps * 30, cookies * 0.05);
        addCookies(bonus);
        showNotification(`🍀 LUCKY! +${formatNumber(bonus)} Cookies!`);
        break;
      }
      case "storm":
        setCookieStorm(true);
        setStormMultiplier(1);
        setStormHits(0);
        showNotification("🌧️ COOKIE STORM! Fang die Cookies für x100!");
        setTimeout(() => {
          setCookieStorm(false);
          setStormMultiplier(1);
          setStormHits(0);
        }, 5000);
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
      
      let maxCanBuy = u.maxOwned !== undefined ? u.maxOwned - u.owned : Infinity;
      if (maxCanBuy <= 0) return prev;
      
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
        const maxStats = getMaxAffordable(u.baseCost, u.owned, cookies);
        count = maxStats.count;
        cost = maxStats.cost;
      }
      
      if (count > maxCanBuy) {
        count = maxCanBuy;
        cost = getBulkCost(u.baseCost, u.owned, count);
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
      lsRemove("cc_pocket_v12");
      setPocketCash(0);
      setPocketInventory([]);
      setPermanentCpsBonus(0);
    }
  }, []);

  // ── V1.2: Chat send ──
  const sendChatMessage = useCallback(async (text: string, isFlex = false) => {
    if (!text.trim() || !playerName) return;
    const filtered = filterBadWords(text.trim().slice(0, 100));

    const newMsg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      author: playerName,
      text: filtered,
      type: "user",
      timestamp: Date.now(),
      isFlex,
    };

    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: playerName, text: filtered, type: "user", isFlex }),
      });
      if (res.ok) {
        const msgs: ChatMessage[] = await res.json();
        setChatMessages(msgs);
        setChatInput("");
        unlock("first_chat");
        findEasterEgg("first_chat", "Erste Nachricht gesendet! 💬");
        return;
      }
    } catch (err) {
      console.warn("Netlify function failed, falling back to local chat:", err);
    }

    // Fallback: local-only chat simulation
    setChatMessages(prev => {
      const updated = [...prev, newMsg].slice(-50);
      lsSet("cc_local_chat", JSON.stringify(updated));
      return updated;
    });
    setChatInput("");
    unlock("first_chat");
    findEasterEgg("first_chat", "Erste Nachricht gesendet! 💬");
  }, [playerName, unlock, findEasterEgg]);

  // ── V1.2: Glücksrad Spin Handler ──
  const spinWheel = useCallback(() => {
    if (wheelSpinning) return;
    const now = Date.now();
    const timeSinceLast = now - lastSpinTimestamp;
    const canSpin = timeSinceLast >= WHEEL_COOLDOWN_MS || extraSpins > 0;

    if (!canSpin) {
      const remainingMs = WHEEL_COOLDOWN_MS - timeSinceLast;
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      showNotification(`⏳ Glücksrad Cooldown: Noch ${hours}h ${minutes}m`);
      return;
    }

    // Pick segment
    const { segment, index } = pickWheelSegment();

    // Consume spin
    if (timeSinceLast < WHEEL_COOLDOWN_MS && extraSpins > 0) {
      setExtraSpins((s) => s - 1);
    } else {
      setLastSpinTimestamp(now);
    }

    // Spin animation: segment angle in degrees
    const len = WHEEL_SEGMENTS.length;
    const segmentAngle = 360 / len;
    const angle = 360 - (index * segmentAngle) - (segmentAngle / 2);
    const newRotation = wheelRotation + 1800 + angle; // Spin 5 full rounds + segment angle offset

    setWheelRotation(newRotation);
    setWheelSpinning(true);
    setWheelResult(null);

    setTimeout(() => {
      setWheelSpinning(false);
      setWheelResult(segment.label);

      // Apply reward
      const rew = segment.reward;
      switch (rew.type) {
        case "cookies_mult": {
          const bonus = cookies * (rew.value - 1);
          if (bonus > 0) {
            setCookies((c) => c + bonus);
            setTotalCookies((t) => t + bonus);
          }
          showNotification(`🎡 +${rew.value}x Cookies!`);
          break;
        }
        case "cash": {
          setPocketCash((c) => c + rew.value);
          showNotification(`🎡 +${rew.value.toFixed(2)}€ gewonnen!`);
          break;
        }
        case "skin": {
          let skinEmoji = "🍪";
          if (rew.skinId === "gold") skinEmoji = "🌟";
          if (rew.skinId === "cannabis") {
            skinEmoji = "🌿";
            unlock("weed_mode");
          }
          setCookieSkin(skinEmoji);
          showNotification(`🎡 Neuer Keks-Skin: ${segment.label}!`);
          break;
        }
        case "loss": {
          const hasShield = pocketInventory.some((i) => !i.used && i.shopItemId === "cookie_shield");
          if (hasShield) {
            setPocketInventory((prev) => {
              const idx = prev.findIndex((i) => !i.used && i.shopItemId === "cookie_shield");
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], used: true };
                return copy;
              }
              return prev;
            });
            showNotification("🛡️ Keks-Schild hat dich vor Keksverlust bewahrt!");
          } else {
            const lost = cookies * rew.percent;
            setCookies((c) => Math.max(0, c - lost));
            showNotification(`💀 Oh nein! -${Math.floor(rew.percent * 100)}% Cookies verloren!`);
          }
          break;
        }
        case "rage": {
          setRageMode(true);
          unlock("rage_500");
          findEasterEgg("rage_500", "RAGE MODE! x500 für 3 Sekunden! 💥");
          showNotification("💥🔥 RAGE MODE! x500 MULTIPLIER FÜR 3 SEKUNDEN! 🔥💥");
          setTimeout(() => {
            setRageMode(false);
            setRageCooldown(60);
            showNotification("💨 Rage Mode vorbei... 60s Cooldown");
          }, rew.durationMs);
          break;
        }
        case "cps_mult": {
          setStormMultiplier(rew.value);
          showNotification(`⚡ x${rew.value} CPS für ${rew.durationMs / 1000}s!`);
          setTimeout(() => setStormMultiplier(1), rew.durationMs);
          break;
        }
        case "extra_spin": {
          setExtraSpins((s) => s + 1);
          showNotification("🔄 Nochmal drehen! Extra Spin!");
          break;
        }
      }
      doSave();
    }, 4000);
  }, [
    wheelSpinning,
    lastSpinTimestamp,
    extraSpins,
    wheelRotation,
    cookies,
    pocketInventory,
    showNotification,
    unlock,
    findEasterEgg,
    doSave,
  ]);

  // ── V1.2: Casino — Coin Flip ──
  const playCoinFlip = useCallback(() => {
    if (casinoCooldown > 0) {
      showNotification(`⏳ Casino Cooldown: ${casinoCooldown}s`);
      return;
    }
    const betAmount = parseInt(coinFlipBet, 10);
    if (!betAmount || betAmount <= 0 || betAmount > cookies) {
      showNotification("❌ Ungültiger Einsatz!");
      return;
    }
    const won = Math.random() < 0.5;
    if (won) {
      addCookies(betAmount);
      unlock("casino_win");
      showNotification(`🎰 GEWONNEN! +${formatNumber(betAmount)} Cookies! 🎉`);
    } else {
      // Check gamble shield
      const hasShield = pocketInventory.some(i => !i.used && i.shopItemId === "cookie_shield");
      if (hasShield) {
        // Use shield
        setPocketInventory(prev => {
          const idx = prev.findIndex(i => !i.used && i.shopItemId === "cookie_shield");
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], used: true };
            return copy;
          }
          return prev;
        });
        showNotification("🛡️ Keks-Schild hat dich gerettet!");
      } else {
        setCookies(c => Math.max(0, c - betAmount));
        if (cookies - betAmount <= 0) {
          unlock("casino_lose");
        }
        showNotification(`💀 VERLOREN! -${formatNumber(betAmount)} Cookies...`);
      }
    }
    setCoinFlipBet("");
    setCasinoCooldown(5);
    const timer = setInterval(() => {
      setCasinoCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [cookies, coinFlipBet, casinoCooldown, pocketInventory, addCookies, showNotification, unlock]);

  // ── V1.2: Casino — Slot Machine ──
  const SLOT_SYMBOLS = ["🍪", "🍩", "🧁", "💎", "🌟", "💀", "🔥"];
  const playSlots = useCallback(() => {
    if (casinoCooldown > 0) {
      showNotification(`⏳ Casino Cooldown: ${casinoCooldown}s`);
      return;
    }
    const betAmount = parseInt(coinFlipBet, 10);
    if (!betAmount || betAmount <= 0 || betAmount > cookies) {
      showNotification("❌ Ungültiger Einsatz!");
      return;
    }
    setCookies(c => c - betAmount);
    setSlotSpinning(true);
    setTimeout(() => {
      const r1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      const r2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      const r3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      setSlotResult([r1, r2, r3]);
      setSlotSpinning(false);

      if (r1 === r2 && r2 === r3) {
        // Jackpot! x10
        const winnings = betAmount * 10;
        addCookies(winnings);
        unlock("casino_win");
        showNotification(`🎰🎰🎰 JACKPOT! x10! +${formatNumber(winnings)} Cookies!`);
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // Two match — x3
        const winnings = betAmount * 3;
        addCookies(winnings);
        showNotification(`🎰 Doppel! x3! +${formatNumber(winnings)} Cookies!`);
      } else {
        // Lost
        showNotification(`💀 Keine Übereinstimmung. -${formatNumber(betAmount)} Cookies`);
        if (cookies - betAmount <= 0) unlock("casino_lose");
      }
    }, 1500);

    setCoinFlipBet("");
    setCasinoCooldown(5);
    const timer = setInterval(() => {
      setCasinoCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [cookies, coinFlipBet, casinoCooldown, addCookies, showNotification, unlock]);

  // ── V1.2: Pocket — Exchange cookies for cash ──
  const exchangeCookiesForCash = useCallback(() => {
    const amount = parseInt(exchangeInput, 10);
    if (!amount || amount <= 0) {
      showNotification("❌ Ungültige Menge!");
      return;
    }
    if (amount > cookies) {
      showNotification("❌ Nicht genug Cookies!");
      return;
    }
    const euros = amount / COOKIE_TO_EURO_RATE;
    setCookies(c => c - amount);
    setPocketCash(c => c + euros);
    showNotification(`💱 ${euros.toFixed(2)}€ erhalten für ${formatNumber(amount)} Cookies!`);
    setExchangeInput("");
    doSave();
  }, [cookies, exchangeInput, showNotification, doSave]);

  // ── V1.2: Pocket — Buy shop item ──
  const buyPocketItem = useCallback((shopItemId: string) => {
    const item = SHOP_ITEMS.find(s => s.id === shopItemId);
    if (!item) return;
    if (pocketCash < item.price) {
      showNotification(`❌ Nicht genug Cash! (${item.price.toFixed(2)}€ benötigt)`);
      return;
    }
    setPocketCash(c => c - item.price);
    setPocketInventory(prev => [...prev, {
      id: `${shopItemId}_${Date.now()}`,
      shopItemId: item.id,
      name: item.name,
      emoji: item.emoji,
      acquiredAt: Date.now(),
      used: false,
    }]);
    showNotification(`🛒 ${item.name} gekauft!`);
    // Big spender achievement
    const totalSpent = SHOP_ITEMS.filter(s => pocketInventory.some(i => i.shopItemId === s.id)).reduce((sum, s) => sum + s.price, 0) + item.price;
    if (totalSpent >= 100) unlock("big_spender");
    doSave();
  }, [pocketCash, pocketInventory, showNotification, unlock, doSave]);

  // ── V1.2: Pocket — Activate item ──
  const activatePocketItem = useCallback((itemId: string) => {
    const entry = pocketInventory.find(i => i.id === itemId && !i.used);
    if (!entry) return;
    const shopDef = SHOP_ITEMS.find(s => s.id === entry.shopItemId);
    if (!shopDef) return;

    const eff = shopDef.effect;
    if (eff.type === "cps_mult") {
      showNotification(`⚡ ${shopDef.name} aktiv! x${eff.value} CPS für ${eff.durationMs / 1000}s`);
      // Will be handled via stormMultiplier
      setStormMultiplier(eff.value);
      setTimeout(() => setStormMultiplier(1), eff.durationMs);
    } else if (eff.type === "gamble_shield") {
      showNotification("🛡️ Keks-Schild bereit!");
      // Shield is checked in casino
    } else if (eff.type === "instant_production") {
      const earned = cps * eff.hours * 3600;
      addCookies(earned);
      showNotification(`⏰ +${eff.hours}h Produktion = +${formatNumber(earned)} Cookies!`);
    } else if (eff.type === "permanent_cps_bonus") {
      setPermanentCpsBonus(prev => prev + eff.percent);
      showNotification(`💎 Permanenter +${eff.percent}% CPS Bonus!`);
    } else if (eff.type === "extra_spin") {
      setExtraSpins(prev => prev + 1);
      setLastSpinTimestamp(0);
      showNotification("🎫 Extra Spin freigeschaltet!");
    } else if (eff.type === "golden_magnet") {
      setGoldenMagnet(true);
      showNotification(`🧲 Goldene Cookies 2x häufiger für ${eff.durationMs / 60000} Min!`);
      setTimeout(() => setGoldenMagnet(false), eff.durationMs);
    } else if (eff.type === "next_click_mult") {
      setNextClickMult(eff.value);
      showNotification(`💣 Nächster Klick x${eff.value}!`);
    } else if (eff.type === "cookie_storm") {
      setCookieStorm(true);
      setStormHits(0);
      showNotification("🌪️ Cookie Storm aktiviert!");
      setTimeout(() => {
        setCookieStorm(false);
        setStormMultiplier(1);
      }, eff.durationMs);
    }

    setPocketInventory(prev => prev.map(i => i.id === itemId ? { ...i, used: true } : i));
    doSave();
  }, [pocketInventory, cps, cpc, addCookies, showNotification, doSave]);

  // ── V1.2: Feedback submit ──
  const submitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) {
      showNotification("❌ Bitte Text eingeben!");
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: playerName || "Anonym",
          text: feedbackText.trim().slice(0, 500),
          rating: feedbackRating,
        }),
      });
      if (res.ok) {
        showNotification("✅ Feedback gesendet! Danke! 🙏");
        setFeedbackText("");
        setFeedbackRating(5);
        setShowFeedbackModal(false);
      }
    } catch { showNotification("❌ Feedback-Fehler"); }
  }, [feedbackText, feedbackRating, playerName, showNotification]);

  // ── V1.2: Load feedback (admin) ──
  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch("/.netlify/functions/feedback");
      if (res.ok) {
        const data: FeedbackEntry[] = await res.json();
        setFeedbackList(data);
      }
    } catch { /* ignore */ }
  }, []);

  // ── V1.2: 420 Easter Egg (exact cookie count) ──
  useEffect(() => {
    if (cookies === 420) {
      unlock("mode_420");
      findEasterEgg("mode_420", "Genau 420 Cookies! 💨");
      showNotification("💨 420! Genau 420 Cookies gehabt!");
    }
  }, [cookies, unlock, findEasterEgg, showNotification]);

  // ── V1.2: 161 Easter Egg (exact cookie count) ──
  useEffect(() => {
    if (cookies === 161) {
      unlock("mode_161");
      findEasterEgg("mode_161", "161! ACAB Cookie! 🤘");
      showNotification("🤘 161! Punk Mode kurz aktiviert!");
    }
  }, [cookies, unlock, findEasterEgg, showNotification]);

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
        setAdminPassword(pw);
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
        body: JSON.stringify({ clearAll: true, adminPassword }),
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

  // Live Auto Sync (Save to Cloud on Local Save)
  const lastCloudSaveRef = useRef(0);
  useEffect(() => {
    if (!loaded || !syncUsername || !syncPassword) return;
    const now = Date.now();
    if (now - lastCloudSaveRef.current > 15000) { // Throttle to 15s
      lastCloudSaveRef.current = now;
      handleCloudSync('save', true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, lastSaveTime, syncUsername, syncPassword]);

  // Live Auto Sync (Pull from Cloud periodically)
  useEffect(() => {
    if (!loaded || !syncUsername || !syncPassword) return;
    const interval = setInterval(() => {
      handleCloudSync('load', true);
    }, 20000); // Poll every 20s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, syncUsername, syncPassword]);

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
      className="min-h-[100dvh] relative select-none bg-[#141416] text-[#f0ebe3] cookie-clicker-root"
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
                onClick={() => {
                 // V1.2: Storm cookies give x100 multiplier per hit
                 const stormBonus = cps * 5 + cpc * 10;
                 addCookies(stormBonus * 100);
                 setStormHits(prev => {
                   const newHits = prev + 1;
                   if (newHits >= 10) {
                     unlock("storm_hunter");
                     findEasterEgg("storm_hunter", "Storm-Jäger! 10 Cookies im Storm! 🌪️");
                   }
                   return newHits;
                 });
                 setStormMultiplier(100);
                 setTimeout(() => setStormMultiplier(1), 5000);
               }}
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
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.3, repeat: 0 } }}
            transition={{ scale: { repeat: Infinity, duration: 1.5 } }}
            onClick={() => handleGoldenClick(gc)}
            className="fixed z-40 text-5xl md:text-6xl cursor-pointer hover:scale-125 transition-transform select-none drop-shadow-[0_0_20px_rgba(255,215,0,0.6)] p-2"
            style={{ left: `${gc.x}%`, top: `${gc.y}%`, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            {gc.type === "diamond" ? "💎" : "🎁"}
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

      
      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && !showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-[#1c1c1f] border border-[#FFA586]/30 p-6 max-w-md w-full mx-auto rounded-lg space-y-4"
            >
              <h2 className="text-2xl font-bold text-[#FFA586] mb-2">🍪 Willkommen bei Cookie Clicker!</h2>
              <div className="space-y-3 text-sm text-[#f0ebe3]">
                <p>Willkommen zu deinem neuen Lieblings-Klicker-Spiel! Hier ist eine kurze Erklärung:</p>
                
                <div className="bg-[#141416] p-3 rounded border border-[rgba(240,235,227,0.1)]">
                  <h3 className="font-bold text-amber-400 mb-1">👆 1. Klicken & Sammeln</h3>
                  <p className="text-[#a09a90] text-xs">Klicke auf den großen Keks in der Mitte, um Kekse zu produzieren.</p>
                </div>

                <div className="bg-[#141416] p-3 rounded border border-[rgba(240,235,227,0.1)]">
                  <h3 className="font-bold text-emerald-400 mb-1">🏭 2. Upgrades Kaufen</h3>
                  <p className="text-[#a09a90] text-xs">Gehe in den <b>Gebäude-Tab</b> (🏭), um passive Produktion zu kaufen. Im <b>Klick-Tab</b> (⚡) stärkst du deine Mausklicks.</p>
                </div>

                <div className="bg-[#141416] p-3 rounded border border-[rgba(240,235,227,0.1)]">
                  <h3 className="font-bold text-indigo-400 mb-1">☁️ 3. Cloud Sync</h3>
                  <p className="text-[#a09a90] text-xs">Du kannst deinen Spielstand in der Cloud speichern! Öffne die <b>Einstellungen</b> (⚙️ oben rechts) und erstelle ein Passwort für dein Gerät.</p>
                </div>

                <div className="bg-[#141416] p-3 rounded border border-[rgba(240,235,227,0.1)]">
                  <h3 className="font-bold text-rose-400 mb-1">🛡️ 4. Anti-Autoclicker</h3>
                  <p className="text-[#a09a90] text-xs">Nach 5 Stunden aktiver Spielzeit musst du eine kleine Rechenaufgabe lösen, um weiterklicken zu können.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTutorial(false);
                  localStorage.setItem("cc_tutorial_seen", "true");
                }}
                className="w-full mt-4 py-3 bg-[#FFA586] hover:bg-[#FFB99A] text-[#141416] font-bold rounded transition-colors"
              >
                Loslegen! 🚀
              </button>
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

      {/* Patchlog Modal */}
      <AnimatePresence>
        {showPatchlog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1e1c1a] border-2 border-[#FFA586] p-6 rounded-xl max-w-md w-full shadow-[0_0_50px_rgba(255,165,134,0.2)] text-left"
            >
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFA586] to-[#FF8C5F] mb-2 text-center uppercase tracking-widest drop-shadow-lg">
                UPDATE v1.2
              </h2>
              <p className="text-[#a09a90] text-sm mb-4 text-center">Was ist neu im Cookie Clicker?</p>
              
              <div className="space-y-4 text-xs text-[#f0ebe3] bg-black/30 p-4 rounded-lg border border-white/5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <div>
                  <h3 className="font-bold text-[#FFA586] text-sm mb-1">💬 Globaler Chat</h3>
                  <p className="text-[#a09a90]">
                    Chatte live mit anderen Bäckern und teile deine Erfolge mit dem neuen Flex-Button!
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-[#FFA586] text-sm mb-1">🎰 Casino & Glücksrad</h3>
                  <p className="text-[#a09a90]">
                    Drehe das tägliche Glücksrad für kostenlose Belohnungen (wie die x500 Chance) oder zocke Coin Flip und Slots!
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-[#FFA586] text-sm mb-1">👖 Hosentasche (Pocket)</h3>
                  <p className="text-[#a09a90]">
                    Wechsle deine Kekse in Geld (€) um und kaufe starke Power-Ups wie den Keks-Magnet oder Turbo-Booster!
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-[#FFA586] text-sm mb-1">🌿 Cannabis & Easter Eggs</h3>
                  <p className="text-[#a09a90]">
                    Entdecke den 420er & 161er Punk Modus, tippe "weed" für den Cannabis-Skin oder suche nach weiteren Secrets!
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-[#FFA586] text-sm mb-1">💥 Rage Mode & Cookie Storm</h3>
                  <p className="text-[#a09a90]">
                    Erlebe den ultra-seltenen x500 Rage Mode bei Klicks oder fange fallende Kekse im Cookie Storm für x100 CPS!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  lsSet("cc_patchlog_v1_2", "true");
                  setShowPatchlog(false);
                }}
                className="w-full mt-6 py-3 font-bold text-black uppercase tracking-wider bg-gradient-to-r from-[#FFA586] to-[#FF8C5F] hover:from-[#FF8C5F] hover:to-[#FFA586] rounded shadow-[0_0_15px_rgba(255,165,134,0.4)] transition-all active:scale-95 cursor-pointer text-center"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                Gelesen & Loslegen!
              </button>
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
              className="bg-[#1c1c1f] border border-[rgba(240,235,227,0.15)] p-6 max-w-md w-full mx-4 rounded-lg space-y-5 max-h-[85vh] overflow-y-auto scrollbar-thin"
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

              {/* Chat Notifications Settings */}
              <div className="space-y-3 pt-3 border-t border-[rgba(240,235,227,0.06)]">
                <label className="text-[10px] text-[#a09a90] uppercase tracking-wider block font-bold">🔔 Benachrichtigungen</label>
                
                {/* Chat notifications toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-semibold block text-[#f0ebe3]">Chat-Nachrichten 💬</span>
                    <span className="text-[8px] text-[#a09a90]">Benachrichtigung bei neuen Chat-Nachrichten</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !notifyChat;
                      setNotifyChat(next);
                      lsSet("cc_notify_chat", next.toString());
                    }}
                    className={`text-[10px] font-bold px-3 py-1 border rounded-full transition-all cursor-pointer ${
                      notifyChat
                        ? "border-green-500/30 text-green-400 bg-green-500/10"
                        : "border-red-500/30 text-red-400 bg-red-500/10"
                    }`}
                  >
                    {notifyChat ? "AN" : "AUS"}
                  </button>
                </div>
                
                {/* Mention notifications toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-semibold block text-[#f0ebe3]">Erwähnungen (@Name) 📢</span>
                    <span className="text-[8px] text-[#a09a90]">Benachrichtigung wenn du markiert wirst</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !notifyMentions;
                      setNotifyMentions(next);
                      lsSet("cc_notify_mentions", next.toString());
                    }}
                    className={`text-[10px] font-bold px-3 py-1 border rounded-full transition-all cursor-pointer ${
                      notifyMentions
                        ? "border-green-500/30 text-green-400 bg-green-500/10"
                        : "border-red-500/30 text-red-400 bg-red-500/10"
                    }`}
                  >
                    {notifyMentions ? "AN" : "AUS"}
                  </button>
                </div>
              </div>

              {/* ─── Themes & Styles ─── */}
              <div className="space-y-3 pt-3 border-t border-[rgba(240,235,227,0.06)]">
                <label className="text-[10px] text-[#a09a90] uppercase tracking-wider block font-bold">🎨 Themes & Design</label>
                
                {/* Theme presets grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setActiveThemeId(theme.id)}
                      className={`py-1.5 px-1 text-[9px] font-bold border rounded-sm transition-all text-center truncate cursor-pointer ${
                        activeThemeId === theme.id
                          ? "border-[#FFA586] text-[#FFA586] bg-[#FFA586]/10"
                          : "border-[rgba(240,235,227,0.12)] text-[#a09a90] hover:text-[#f0ebe3] bg-transparent"
                      }`}
                    >
                      {theme.name.split(" ")[0]}
                    </button>
                  ))}
                  {Object.keys(customThemes).map((id) => (
                    <button
                      key={id}
                      onClick={() => setActiveThemeId(id)}
                      className={`py-1.5 px-1 text-[9px] font-bold border rounded-sm transition-all text-center truncate cursor-pointer ${
                        activeThemeId === id
                          ? "border-[#FFA586] text-[#FFA586] bg-[#FFA586]/10"
                          : "border-[rgba(240,235,227,0.12)] text-[#a09a90] hover:text-[#f0ebe3] bg-transparent"
                      }`}
                    >
                      {customThemes[id].name}
                    </button>
                  ))}
                  
                  {/* Plus button to add custom theme */}
                  <button
                    onClick={() => {
                      const id = `custom_${Date.now()}`;
                      const newColors = {
                        name: `Custom ${Object.keys(customThemes).length + 1}`,
                        accentColor: currentTheme.accentColor,
                        panelBg: currentTheme.panelBg,
                        bgColor: currentTheme.bgColor,
                        textColor: currentTheme.textColor,
                      };
                      setCustomThemes(prev => {
                        const updated = { ...prev, [id]: newColors };
                        lsSet("cc_custom_themes", JSON.stringify(updated));
                        return updated;
                      });
                      setActiveThemeId(id);
                      showNotification("🎨 Neues Custom Theme erstellt!");
                    }}
                    className="py-1.5 px-1 text-[9px] font-bold border border-dashed border-[rgba(240,235,227,0.2)] text-[#a09a90] hover:text-[#f0ebe3] bg-transparent rounded-sm text-center cursor-pointer"
                  >
                    ➕ Neu
                  </button>
                </div>

                {/* Custom theme color pickers */}
                {activeThemeId.startsWith("custom_") && customThemes[activeThemeId] && (
                  <div className="p-3 border border-[rgba(240,235,227,0.1)] bg-[#141416]/40 rounded-sm space-y-2 mt-2">
                    <div className="flex justify-between items-center text-[9px] border-b border-[rgba(240,235,227,0.06)] pb-1 mb-1">
                      <span className="text-[#FFA586] font-bold">Custom Theme bearbeiten:</span>
                      <button
                        onClick={() => deleteCustomTheme(activeThemeId)}
                        className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                      >
                        Löschen 🗑️
                      </button>
                    </div>
                    
                    {/* Name input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-[#a09a90] uppercase">Name</label>
                      <input
                        type="text"
                        value={customThemes[activeThemeId].name}
                        onChange={(e) => {
                          const updatedName = e.target.value;
                          setCustomThemes(prev => {
                            const updated = {
                              ...prev,
                              [activeThemeId]: {
                                ...prev[activeThemeId],
                                name: updatedName,
                              }
                            };
                            lsSet("cc_custom_themes", JSON.stringify(updated));
                            return updated;
                          });
                        }}
                        className="bg-[#141416] text-[#f0ebe3] text-[10px] px-2 py-1 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none"
                      />
                    </div>

                    {/* Color inputs grid */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customThemes[activeThemeId].bgColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomThemes(prev => {
                              const updated = {
                                ...prev,
                                [activeThemeId]: {
                                  ...prev[activeThemeId],
                                  bgColor: val,
                                }
                              };
                              lsSet("cc_custom_themes", JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded-full border border-neutral-700 cursor-pointer overflow-hidden"
                        />
                        <span className="text-[9px] text-[#a09a90]">Hintergrund</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customThemes[activeThemeId].panelBg}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomThemes(prev => {
                              const updated = {
                                ...prev,
                                [activeThemeId]: {
                                  ...prev[activeThemeId],
                                  panelBg: val,
                                }
                              };
                              lsSet("cc_custom_themes", JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded-full border border-neutral-700 cursor-pointer overflow-hidden"
                        />
                        <span className="text-[9px] text-[#a09a90]">Panel-Bg</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customThemes[activeThemeId].accentColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomThemes(prev => {
                              const updated = {
                                ...prev,
                                [activeThemeId]: {
                                  ...prev[activeThemeId],
                                  accentColor: val,
                                }
                              };
                              lsSet("cc_custom_themes", JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded-full border border-neutral-700 cursor-pointer overflow-hidden"
                        />
                        <span className="text-[9px] text-[#a09a90]">Akzent</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={customThemes[activeThemeId].textColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomThemes(prev => {
                              const updated = {
                                ...prev,
                                [activeThemeId]: {
                                  ...prev[activeThemeId],
                                  textColor: val,
                                }
                              };
                              lsSet("cc_custom_themes", JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          className="w-5 h-5 rounded-full border border-neutral-700 cursor-pointer overflow-hidden"
                        />
                        <span className="text-[9px] text-[#a09a90]">Textfarbe</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cloud Sync Setting */}
              <div className="pt-2 border-t border-[rgba(240,235,227,0.06)]">
                <span className="text-xs font-semibold block text-[#f0ebe3] mb-2">Cloud-Save (Geräte-Sync) ☁️</span>
                <span className="text-[10px] text-[#a09a90] block mb-2">Sichere deinen Spielstand oder lade ihn auf anderen Geräten.</span>
                
                <input
                  type="text"
                  placeholder="Account-Name"
                  value={syncUsername}
                  onChange={(e) => setSyncUsername(e.target.value)}
                  className="w-full bg-[#141416] text-[#f0ebe3] text-sm px-3 py-2 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] transition-colors mb-2"
                />
                <input
                  type="password"
                  placeholder="Dein Passwort"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  className="w-full bg-[#141416] text-[#f0ebe3] text-sm px-3 py-2 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] transition-colors mb-2"
                />
                
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => handleCloudSync('save')}
                    disabled={syncStatus.loading || !syncPassword}
                    className="flex-1 py-1.5 text-xs bg-[rgba(240,235,227,0.04)] hover:bg-[#FFA586]/10 border border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 text-[#f0ebe3] font-bold rounded-sm transition-all disabled:opacity-50"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => handleCloudSync('load')}
                    disabled={syncStatus.loading || !syncPassword}
                    className="flex-1 py-1.5 text-xs bg-[rgba(240,235,227,0.04)] hover:bg-[#FFA586]/10 border border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 text-[#f0ebe3] font-bold rounded-sm transition-all disabled:opacity-50"
                  >
                    Laden
                  </button>
                </div>
                {syncStatus.loading && <span className="text-[10px] text-[#FFA586] block">Lade...</span>}
                {syncStatus.error && <span className="text-[10px] text-red-400 block">{syncStatus.error}</span>}
                {syncStatus.success && <span className="text-[10px] text-green-400 block">{syncStatus.success}</span>}
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
              
              {/* Feedback option */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowFeedbackModal(true);
                  }}
                  className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold transition-all rounded-sm cursor-pointer text-center text-emerald-400"
                >
                  📝 Feedback senden
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c1c1f] border border-[rgba(240,235,227,0.15)] p-6 max-w-sm w-full mx-4 rounded-lg space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[rgba(240,235,227,0.1)] pb-3">
                <h2 className="font-serif text-lg font-bold text-[#FFA586]">📝 Feedback senden</h2>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-xs text-[#a09a90] hover:text-[#f0ebe3] cursor-pointer"
                >
                  Schließen
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#a09a90] uppercase tracking-wider block mb-1">Deine Bewertung</label>
                  <div className="flex items-center gap-1 text-yellow-500 text-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        {star <= feedbackRating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#a09a90] uppercase tracking-wider block mb-1">Dein Feedback</label>
                  <textarea
                    rows={4}
                    placeholder="Was gefällt dir? Was können wir verbessern? (max 500 Zeichen)"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full bg-[#141416] text-[#f0ebe3] text-xs px-3 py-2 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] transition-colors resize-none"
                    maxLength={500}
                  />
                </div>

                <button
                  onClick={submitFeedback}
                  className="w-full py-2 bg-[#FFA586] hover:bg-[#FFB99A] text-[#141416] font-bold text-xs rounded transition-colors"
                >
                  Absenden 🚀
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
                ⚡ x10
              </span>
            )}
            {rageMode && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-red-600/30 text-red-500 border border-red-500/40 rounded-full animate-pulse font-bold">
                💥 RAGE MODE (x500!)
              </span>
            )}
            {rageCooldown > 0 && (
              <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-full font-mono">
                ⏳ Rage Cooldown: {rageCooldown}s
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
            <div className="flex overflow-x-auto border-b border-[rgba(240,235,227,0.12)] shrink-0 scrollbar-hide">
              {([
                { key: "buildings" as const, icon: Building2, label: p("Gebäude") },
                { key: "clicks" as const, icon: Zap, label: p("Klick") },
                { key: "casino" as const, icon: Dice5, label: "🎰" },
                { key: "pocket" as const, icon: Briefcase, label: "👖" },
                { key: "chat" as const, icon: MessageCircle, label: "💬" },
                { key: "achievements" as const, icon: Trophy, label: "🏆" },
                { key: "stats" as const, icon: BarChart3, label: "📊" },
                { key: "leaderboard" as const, icon: Crown, label: "👑" },
                ...(isAdmin ? [{ key: "admin" as const, icon: Settings, label: "⚙️" }] : []),
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "admin" && isAdmin) loadFeedback();
                  }}
                  className={`py-2 px-2 min-w-[48px] text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-colors flex flex-col items-center gap-0.5 shrink-0 ${
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
                      const isUnlocked = prestigeLevel >= skin.reqLevel || (skin.id === "cannabis" && achievements.find(a => a.id === "weed_mode")?.unlocked);
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

              {/* ─── Casino Tab ─── */}
              {activeTab === "casino" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mb-1">🎰 Casino</h3>
                  <p className="text-[10px] text-[#a09a90] mb-3">Setze deine Cookies aufs Spiel! Aber Vorsicht: Alles kann verloren gehen!</p>
                  
                  {/* Daily Wheel Section */}
                  <div className="relative flex flex-col items-center justify-center p-3 border border-[rgba(240,235,227,0.12)] bg-[#141416]/40 rounded-sm space-y-3">
                    <div className="text-[10px] text-[#a09a90] uppercase tracking-wider font-bold">🎡 Tägliches Glücksrad</div>
                    
                    <div className="relative">
                      {/* Pointer */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 z-10 text-xl pointer-events-none">
                        👇
                      </div>
                      {/* Spinning SVG */}
                      <motion.div
                        animate={{ rotate: wheelRotation }}
                        transition={{ type: "spring", stiffness: 20, damping: 10, mass: 1 }}
                        className="w-36 h-36 relative"
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full rounded-full border-2 border-neutral-700 shadow-lg">
                          {WHEEL_SEGMENTS.map((seg, i) => {
                            const angle = 360 / WHEEL_SEGMENTS.length;
                            const startAngle = i * angle - 90;
                            const endAngle = startAngle + angle;
                            const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
                            const d = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                            
                            const midAngle = startAngle + angle / 2;
                            const tx = 50 + 35 * Math.cos((midAngle * Math.PI) / 180);
                            const ty = 50 + 35 * Math.sin((midAngle * Math.PI) / 180);

                            return (
                              <g key={seg.id}>
                                <path d={d} fill={seg.color} className="opacity-90 hover:opacity-100 transition-opacity" />
                                <text
                                  x={tx}
                                  y={ty}
                                  fill="#fff"
                                  fontSize="6"
                                  fontWeight="black"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                                >
                                  {seg.emoji}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </motion.div>
                    </div>

                    {wheelResult && (
                      <div className="text-xs font-bold text-center text-amber-400">
                        Ergebnis: {wheelResult}! 🎉
                      </div>
                    )}

                    <button
                      onClick={spinWheel}
                      disabled={wheelSpinning || (Date.now() - lastSpinTimestamp < WHEEL_COOLDOWN_MS && extraSpins <= 0)}
                      className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#141416] font-bold text-xs rounded transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-full text-center"
                    >
                      {wheelSpinning ? "Dreht..." : extraSpins > 0 ? `Jetzt drehen! (Extra: ${extraSpins})` : "Kostenlos drehen!"}
                    </button>
                    
                    {Date.now() - lastSpinTimestamp < WHEEL_COOLDOWN_MS && extraSpins <= 0 && (
                      <div className="text-[8px] text-[#a09a90] font-mono">
                        Nächster gratis Spin in: {(() => {
                          const diff = WHEEL_COOLDOWN_MS - (Date.now() - lastSpinTimestamp);
                          const h = Math.floor(diff / 3600000);
                          const m = Math.floor((diff % 3600000) / 60000);
                          return `${h}h ${m}m`;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Cooldown visual indicator */}
                  {casinoCooldown > 0 && (
                    <div className="p-2 border border-red-500/20 bg-red-500/5 text-red-400 text-center rounded-sm text-xs font-bold animate-pulse">
                      ⏳ Cooldown aktiv: {casinoCooldown}s
                    </div>
                  )}

                  {/* Bet Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#a09a90] uppercase tracking-wider">Einsatz (Cookies)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Menge eingeben..."
                        value={coinFlipBet}
                        disabled={casinoCooldown > 0 || slotSpinning}
                        onChange={(e) => setCoinFlipBet(e.target.value)}
                        className="flex-1 bg-[#141416] text-[#f0ebe3] text-sm px-3 py-1.5 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] font-mono"
                      />
                      <button
                        onClick={() => setCoinFlipBet(Math.floor(cookies).toString())}
                        disabled={casinoCooldown > 0 || slotSpinning}
                        className="px-3 py-1.5 bg-[rgba(240,235,227,0.06)] hover:bg-[#FFA586]/10 border border-[rgba(240,235,227,0.12)] text-[#f0ebe3] font-bold text-xs rounded-sm transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Games selection */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Coin Flip */}
                    <button
                      onClick={playCoinFlip}
                      disabled={casinoCooldown > 0 || slotSpinning || !coinFlipBet}
                      className="p-3 bg-[#141416]/60 border border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/40 hover:bg-[#FFA586]/5 transition-all text-center rounded-sm flex flex-col items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl">🪙</span>
                      <span className="text-xs font-bold text-[#f0ebe3]">Coin Flip</span>
                      <span className="text-[8px] text-[#a09a90]">50% Chance / x2 Gewinnt</span>
                    </button>

                    {/* Slot Machine */}
                    <button
                      onClick={playSlots}
                      disabled={casinoCooldown > 0 || slotSpinning || !coinFlipBet}
                      className="p-3 bg-[#141416]/60 border border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/40 hover:bg-[#FFA586]/5 transition-all text-center rounded-sm flex flex-col items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl">🎰</span>
                      <span className="text-xs font-bold text-[#f0ebe3]">Slot Machine</span>
                      <span className="text-[8px] text-[#a09a90]">Double: x3 | Triple: x10</span>
                    </button>
                  </div>

                  {/* Slots display */}
                  {(slotSpinning || slotResult) && (
                    <div className="p-4 border border-[rgba(240,235,227,0.12)] bg-[#141416] text-center rounded-sm space-y-2">
                      <div className="text-[10px] text-[#a09a90] uppercase tracking-wider">Slots Ergebnis</div>
                      <div className="flex justify-center gap-4 text-3xl font-bold py-2">
                        {slotSpinning ? (
                          <>
                            <span className="animate-bounce">🌀</span>
                            <span className="animate-bounce [animation-delay:0.2s]">🌀</span>
                            <span className="animate-bounce [animation-delay:0.4s]">🌀</span>
                          </>
                        ) : (
                          slotResult?.map((symbol, i) => (
                            <motion.span
                              key={i}
                              initial={{ scale: 0.5, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="bg-neutral-800 p-2 rounded-sm"
                            >
                              {symbol}
                            </motion.span>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shield warning */}
                  {pocketInventory.some(i => !i.used && i.shopItemId === "cookie_shield") && (
                    <div className="p-2 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-center rounded-sm text-[9px] flex items-center justify-center gap-1.5">
                      <span>🛡️ Keks-Schild aktiv! Nächster Verlust wird geschützt.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Pocket Tab ─── */}
              {activeTab === "pocket" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[rgba(240,235,227,0.1)] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586]">👖 Hosentasche</h3>
                    <span className="text-sm font-mono font-bold text-emerald-400">{pocketCash.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span>
                  </div>

                  {/* Exchange Cookies to Cash */}
                  <div className="p-3 border border-[rgba(240,235,227,0.12)] bg-[#141416]/40 rounded-sm space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#a09a90] uppercase tracking-wider font-mono">Kekse wechseln:</span>
                      <span className="text-emerald-400/80 font-mono">1.0M 🍪 = 1,00€</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Menge an Cookies..."
                        value={exchangeInput}
                        onChange={(e) => setExchangeInput(e.target.value)}
                        className="flex-1 bg-[#141416] text-[#f0ebe3] text-xs px-2.5 py-1.5 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] font-mono"
                      />
                      <button
                        onClick={exchangeCookiesForCash}
                        className="px-3 py-1.5 bg-[#FFA586] text-[#141416] font-bold text-xs rounded-sm hover:bg-[#FFB99A] transition-colors"
                      >
                        Wechseln
                      </button>
                    </div>
                  </div>

                  {/* Pocket Shop */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-[#a09a90] uppercase tracking-wider">Großer Shop</h4>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {SHOP_ITEMS.map((item) => {
                        const canBuy = pocketCash >= item.price;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 border rounded-sm transition-all text-left ${
                              canBuy
                                ? "bg-[#141416]/60 border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/20"
                                : "bg-transparent opacity-40 border-[rgba(240,235,227,0.06)]"
                            }`}
                          >
                            <span className="text-2xl shrink-0">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-[#f0ebe3] truncate">{item.name}</div>
                              <div className="text-[8px] text-[#a09a90] leading-normal">{item.desc}</div>
                            </div>
                            <button
                              disabled={!canBuy}
                              onClick={() => buyPocketItem(item.id)}
                              className={`px-2 py-1 text-[9px] font-bold rounded-sm font-mono transition-colors shrink-0 ${
                                canBuy
                                  ? "bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer"
                                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                              }`}
                            >
                              {item.price.toFixed(2)}€
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Player Inventory (Hosentasche) */}
                  <div className="space-y-2 pt-2 border-t border-[rgba(240,235,227,0.1)]">
                    <h4 className="text-[10px] text-[#a09a90] uppercase tracking-wider">Dein Inventar</h4>
                    {pocketInventory.filter(i => !i.used).length === 0 ? (
                      <p className="text-[9px] text-[#706b63] italic">Keine ungenutzten Gegenstände vorhanden.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {pocketInventory.filter(i => !i.used).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => activatePocketItem(item.id)}
                            className="p-2 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 flex items-center justify-between gap-1 rounded-sm text-[9px] font-semibold cursor-pointer select-none"
                          >
                            <span className="flex items-center gap-1">
                              <span>{item.emoji}</span>
                              <span className="truncate max-w-[80px]">{item.name}</span>
                            </span>
                            <span>Nutzen</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Chat Tab ─── */}
              {activeTab === "chat" && (
                <div className="flex flex-col h-[400px] space-y-2">
                  <div className="flex justify-between items-center border-b border-[rgba(240,235,227,0.1)] pb-1.5 shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586]">💬 Globaler Chat</h3>
                    <button
                      onClick={() => sendChatMessage(`Ich habe gerade ${formatNumber(cookies)} Cookies! 🚀`, true)}
                      disabled={!playerName}
                      className="text-[8px] font-bold px-2 py-0.5 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-sm disabled:opacity-40"
                    >
                      🍪 Cookies teilen (Flex)
                    </button>
                  </div>

                  {!playerName ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-[rgba(240,235,227,0.08)] bg-[#141416]/20 p-4 rounded-sm space-y-3 min-h-0 text-center">
                      <span className="text-xl">👤</span>
                      <p className="text-[10px] text-[#a09a90] max-w-[200px]">Lege einen Spielernamen fest, um am globalen Chat teilnehmen zu können:</p>
                      <div className="flex gap-2 w-full max-w-xs justify-center">
                        <input
                          type="text"
                          placeholder="Dein Bäcker-Name..."
                          value={tempNameInput}
                          onChange={(e) => setTempNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tempNameInput.trim()) {
                              setPlayerName(tempNameInput.trim());
                              doSave();
                              showNotification(`👤 Name gesetzt: ${tempNameInput.trim()}!`);
                            }
                          }}
                          className="bg-[#141416] text-[#f0ebe3] text-xs px-2.5 py-1.5 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586] w-2/3"
                        />
                        <button
                          onClick={() => {
                            if (tempNameInput.trim()) {
                              setPlayerName(tempNameInput.trim());
                              doSave();
                              showNotification(`👤 Name gesetzt: ${tempNameInput.trim()}!`);
                            }
                          }}
                          className="px-3 py-1.5 bg-[#FFA586] text-[#141416] font-bold text-xs rounded-sm hover:bg-[#FFB99A] cursor-pointer"
                        >
                          Setzen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Messages container */}
                      <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto border border-[rgba(240,235,227,0.08)] bg-[#141416]/20 p-2 rounded-sm space-y-2 min-h-0 scrollbar-thin"
                      >
                        {chatMessages.length === 0 ? (
                          <div className="text-center text-[10px] text-[#706b63] italic py-8">Keine Nachrichten vorhanden. Schreib was!</div>
                        ) : (
                          chatMessages.map((msg) => {
                            const isSelf = msg.author === playerName;
                            const isSystem = msg.type === "system";
                            return (
                              <div key={msg.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                                <div className="flex items-center gap-1.5 mb-0.5 text-[8px] text-[#a09a90]">
                                  <span className="font-semibold text-neutral-300">{msg.author}</span>
                                  <span>•</span>
                                  <span>{new Date(msg.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <div className={`p-2 rounded max-w-[85%] text-[10px] leading-relaxed break-words ${
                                  isSystem
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 text-center w-full"
                                    : msg.isFlex
                                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                    : isSelf
                                    ? "bg-[#FFA586]/10 text-[#FFA586] border border-[#FFA586]/20"
                                    : "bg-neutral-800/60 text-[#f0ebe3] border border-neutral-700/30"
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Chat Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          sendChatMessage(chatInput);
                        }}
                        className="flex gap-1.5 shrink-0"
                      >
                        <input
                          type="text"
                          placeholder="Schreibe eine Nachricht..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (chatInput.trim()) {
                                sendChatMessage(chatInput);
                              }
                            }
                          }}
                          className="flex-1 bg-[#141416] text-[#f0ebe3] text-xs px-2.5 py-1.5 rounded border border-[rgba(240,235,227,0.12)] focus:outline-none focus:border-[#FFA586]"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="p-1.5 bg-[#FFA586] hover:bg-[#FFB99A] text-[#141416] rounded-sm transition-colors flex items-center justify-center disabled:opacity-40 cursor-pointer"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </>
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

                  {/* Feedback Manager */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFA586] mt-4 mb-2">📝 Feedback einsehen</h3>
                  {feedbackList.length === 0 ? (
                    <p className="text-[9px] text-[#706b63] italic text-center py-4">Kein Feedback vorhanden.</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {feedbackList.map((entry) => (
                        <div key={entry.id} className="p-2 border border-[rgba(240,235,227,0.06)] bg-[#141416]/20 rounded-sm text-left">
                          <div className="flex justify-between items-center text-[8px] text-[#a09a90] mb-1">
                            <span className="font-bold text-[#f0ebe3]">{entry.author}</span>
                            <span className="text-yellow-500">{"★".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</span>
                          </div>
                          <p className="text-[9px] text-[#f0ebe3] break-words">{entry.text}</p>
                          <span className="text-[7px] text-[#706b63] block mt-1">
                            {new Date(entry.timestamp).toLocaleString("de-DE")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-left Chat Notifications */}
      <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-none max-w-xs md:max-w-sm">
        <AnimatePresence>
          {chatNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className={`p-3 rounded-lg border pointer-events-auto shadow-lg backdrop-blur-md flex flex-col gap-1 ${
                notif.isMention
                  ? "bg-purple-950/80 border-purple-500/40 text-purple-200"
                  : "bg-neutral-900/95 border-neutral-700/50 text-[#f0ebe3]"
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-bold text-[#FFA586] uppercase tracking-wider">
                  {notif.isMention ? "🔔 Erwähnung von" : "💬 Neue Nachricht von"} {notif.author}
                </span>
                <button
                  onClick={() => setChatNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  className="text-[9px] text-[#a09a90] hover:text-[#f0ebe3] cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] leading-relaxed break-words font-medium">
                {notif.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
