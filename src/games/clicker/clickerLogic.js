// Cookie-Clicker-Logik: Gebäude, Upgrades, Achievements, Börse, Random Events, Himmels-Aufstieg (Prestige)
// Komplett ohne Mana — dafür mit dynamischen Random Events & mächtigem Himmels-Skilltree!

// === 10 GEBÄUDE ===
export const BUILDINGS = [
  { id: 'cursor',       name: 'CURSOR',         tag: '01', color: '#00e5ff', baseCps: 0.1,    baseCost: 15,          desc: 'Klickt alle 10 Sekunden automatisch' },
  { id: 'oma',          name: 'OMA',            tag: '02', color: '#ffb703', baseCps: 1,      baseCost: 100,         desc: 'Backt mit Liebe und geheimen Rezepten' },
  { id: 'farm',         name: 'FARM',           tag: '03', color: '#90be6d', baseCps: 8,      baseCost: 1100,        desc: 'Baut Keks-Körner und Schokobohnen an' },
  { id: 'mine',         name: 'SCHOKO-MINE',    tag: '04', color: '#f3722c', baseCps: 47,     baseCost: 12000,       desc: 'Baut Schokoblöcke und Streusel ab' },
  { id: 'fabrik',       name: 'FABRIK',         tag: '05', color: '#f94144', baseCps: 260,    baseCost: 130000,      desc: 'Massenproduktion auf Fließbändern' },
  { id: 'bank',         name: 'KEKS-BANK',      tag: '06', color: '#43aa8b', baseCps: 1400,   baseCost: 1400000,     desc: 'Erzeugt Zinsen aus Keks-Kapital' },
  { id: 'tempel',       name: 'KEKS-TEMPEL',    tag: '07', color: '#577590', baseCps: 7800,   baseCost: 20000000,    desc: 'Betet den antiken Keks-Gott an' },
  { id: 'zauberturm',   name: 'ZAUBERTURM',     tag: '08', color: '#9d4edd', baseCps: 44000,  baseCost: 330000000,   desc: 'Beschwört Teig aus dem Äther' },
  { id: 'portal',       name: 'DIMENSIONS-RISS',tag: '09', color: '#7209b7', baseCps: 260000, baseCost: 5100000000,  desc: 'Öffnet Tor in ein Universum aus Keks' },
  { id: 'zeitmaschine', name: 'ZEITMASCHINE',   tag: '10', color: '#ffd700', baseCps: 1600000,baseCost: 75000000000, desc: 'Holt Cookies aus der Vergangenheit' },
];

export function buildingCost(building, owned = 0, amount = 1) {
  if (amount === 1) {
    return Math.ceil(building.baseCost * Math.pow(1.15, owned));
  }
  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += Math.ceil(building.baseCost * Math.pow(1.15, owned + i));
  }
  return total;
}

export function maxAffordable(building, owned = 0, cookies = 0) {
  if (cookies <= 0) return { count: 0, cost: 0 };
  const nextSingle = buildingCost(building, owned, 1);
  if (cookies < nextSingle) return { count: 0, cost: 0 };

  const base = building.baseCost * Math.pow(1.15, owned);
  const est = Math.floor(Math.log(1 + (cookies * 0.15) / base) / Math.log(1.15));
  let k = Math.max(0, est);
  let cost = buildingCost(building, owned, k);
  while (cost > cookies && k > 0) {
    k--;
    cost = buildingCost(building, owned, k);
  }
  while (true) {
    const nextC = buildingCost(building, owned + k, 1);
    if (cost + nextC <= cookies) {
      cost += nextC;
      k++;
    } else {
      break;
    }
  }
  return { count: k, cost };
}

// === 18 REGULÄRE UPGRADES ===
export const UPGRADES = [
  { id: 'click_x2',    name: 'DOPPELKLICK',         desc: 'Doppelte Cookies pro Klick', cost: 100, effect: 'clickMulti', value: 2, unlockAt: { type: 'clicks', amount: 15 } },
  { id: 'click_x5',    name: 'TURBO-FINGER',        desc: '5x Klickstärke', cost: 1500, effect: 'clickMulti', value: 2.5, unlockAt: { type: 'clicks', amount: 100 } },
  { id: 'click_x10',   name: 'TITAN-KLICK',         desc: '10x Klickstärke', cost: 50000, effect: 'clickMulti', value: 4, unlockAt: { type: 'clicks', amount: 500 } },
  { id: 'cursor_x2',   name: 'VERSTAERKTER CURSOR', desc: 'Cursor-Ertrag x2', cost: 300, effect: 'buildingMulti', target: 'cursor', value: 2, unlockAt: { type: 'building', id: 'cursor', amount: 1 } },
  { id: 'cursor_x5',   name: 'QUANTUM-CURSOR',      desc: 'Cursor-Ertrag x3', cost: 5000, effect: 'buildingMulti', target: 'cursor', value: 3, unlockAt: { type: 'building', id: 'cursor', amount: 10 } },
  { id: 'oma_x2',      name: 'OMIS ROLLHOLZ',       desc: 'Oma-Ertrag x2', cost: 1000, effect: 'buildingMulti', target: 'oma', value: 2, unlockAt: { type: 'building', id: 'oma', amount: 1 } },
  { id: 'oma_x3',      name: 'GEHEIME ZUTAT',       desc: 'Oma-Ertrag x3', cost: 15000, effect: 'buildingMulti', target: 'oma', value: 3, unlockAt: { type: 'building', id: 'oma', amount: 10 } },
  { id: 'farm_x2',     name: 'DOPPEL-DÜNGER',       desc: 'Farm-Ertrag x2', cost: 11000, effect: 'buildingMulti', target: 'farm', value: 2, unlockAt: { type: 'building', id: 'farm', amount: 1 } },
  { id: 'mine_x2',     name: 'DIAMANT-SPITZHACKE',  desc: 'Schoko-Mine x2', cost: 120000, effect: 'buildingMulti', target: 'mine', value: 2, unlockAt: { type: 'building', id: 'mine', amount: 1 } },
  { id: 'fabrik_x2',   name: 'AUTOMATISIERUNG',     desc: 'Fabrik-Ertrag x2', cost: 1300000, effect: 'buildingMulti', target: 'fabrik', value: 2, unlockAt: { type: 'building', id: 'fabrik', amount: 1 } },
  { id: 'bank_x2',     name: 'ZINSESZINS-EFFEKT',   desc: 'Bank-Ertrag x2', cost: 14000000, effect: 'buildingMulti', target: 'bank', value: 2, unlockAt: { type: 'building', id: 'bank', amount: 1 } },
  { id: 'tempel_x2',   name: 'GOETTLICHE SEGNUNG',  desc: 'Tempel-Ertrag x2', cost: 200000000, effect: 'buildingMulti', target: 'tempel', value: 2, unlockAt: { type: 'building', id: 'tempel', amount: 1 } },
  { id: 'zauberturm_x2',name:'AETHER-KRAFT',        desc: 'Zauberturm x2', cost: 3300000000, effect: 'buildingMulti', target: 'zauberturm', value: 2, unlockAt: { type: 'building', id: 'zauberturm', amount: 1 } },
  { id: 'portal_x2',   name: 'MULTIVERSUM-LINK',    desc: 'Portal-Ertrag x2', cost: 51000000000, effect: 'buildingMulti', target: 'portal', value: 2, unlockAt: { type: 'building', id: 'portal', amount: 1 } },
  { id: 'zeit_x2',     name: 'ZEITSCHLEIFE',        desc: 'Zeitmaschine x2', cost: 750000000000, effect: 'buildingMulti', target: 'zeitmaschine', value: 2, unlockAt: { type: 'building', id: 'zeitmaschine', amount: 1 } },
  { id: 'crit_click',  name: 'KRITISCHE TREFFER',   desc: '8% Chance auf x10 Klick', cost: 8000, effect: 'critChance', value: 0.08, unlockAt: { type: 'clicks', amount: 200 } },
  { id: 'golden_boost',name: 'GLUECKS-KLEE',         desc: 'Goldene Cookies dauern doppelt so lang', cost: 77777, effect: 'goldenDuration', value: 2, unlockAt: { type: 'clicks', amount: 300 } },
  { id: 'wrinkler_boost',name:'KRAEFTIGES FUTTER',  desc: 'Wrinkler geben 200% statt 150% zurück', cost: 500000, effect: 'wrinklerBoost', value: 2.0, unlockAt: { type: 'building', id: 'mine', amount: 5 } },
];

// === RANDOM EVENTS SYSTEM ===
export const RANDOM_EVENTS = [
  {
    id: 'gold_rush',
    name: 'GOLD-RAUSCH',
    badge: 'x7 KLICKKRAFT',
    duration: 25,
    color: '#ffd700',
    desc: 'Goldene Blitze durchzucken den Teig! 25s lang 7-fache Klickstärke!'
  },
  {
    id: 'cookie_comet',
    name: 'KEKS-KOMET',
    badge: 'KOMET AM HIMMEL',
    duration: 8,
    color: '#ff9e00',
    desc: 'Ein glühender Komet fliegt über den Schirm! Klick ihn schnell für einen Riesen-Kekssegen!'
  },
  {
    id: 'sugar_festival',
    name: 'ZUCKER-FESTIVAL',
    badge: '2x CPS ALLER GEBÄUDE',
    duration: 30,
    color: '#ff007f',
    desc: 'Puderzucker beflügelt die Maschinen! Alle Gebäude produzieren 30s lang doppelt so schnell!'
  },
  {
    id: 'grandma_party',
    name: 'OMAS GEBURTSTAG',
    badge: '5x OMA-POWER',
    duration: 30,
    color: '#ffb703',
    desc: 'Die Großmütter feiern! Oma-Produktion 30 Sekunden lang verfünffacht!'
  },
  {
    id: 'stock_rally',
    name: 'BÖRSEN-RALLYE',
    badge: '+100% KURSE',
    duration: 30,
    color: '#00e5ff',
    desc: 'Die Keks-Märkte explodieren! Alle Aktienkurse verdoppeln ihren Wert!'
  }
];

// === EXPONENTIELLES AUFSTIEGS-SYSTEM (ASCENSION TIERS & PASSIVES) ===
// Jede Stufe erfordert exponentiell mehr Lebenszeit-Cookies (1 Mio, 25 Mio, 1 Mrd, etc.)
// Verleiht exponentielle Verdopplung des Multiplikators (2^level) plus exklusive Skins & Fähigkeiten!
export const ASCENSION_TIERS = [
  {
    level: 1,
    title: 'ASTRAL-NOVIZE',
    reqCookies: 1_000_000, // 1 Million
    multiplier: 2,
    multiplierText: '2x',
    skinId: 'astral',
    skinName: '✨ Astral-Moritz',
    skillId: 'comet_magnet',
    skillName: 'Kometen-Magnet',
    skillIcon: '☄',
    skillDesc: 'Zufalls-Events & Kometen erscheinen doppelt so häufig! Kometen geben 3x Keks-Ertrag.',
  },
  {
    level: 2,
    title: 'ZEIT-BÄCKER',
    reqCookies: 25_000_000, // 25 Millionen
    multiplier: 4,
    multiplierText: '4x',
    skinId: 'cyber',
    skinName: '⚡ Cyber-Moritz',
    skillId: 'warp_oven',
    skillName: 'Warp-Ofen',
    skillIcon: '⌛',
    skillDesc: 'Offline-Produktion arbeitet mit vollen 100% Effizienz (statt 50%) und Basis-Klickkraft verdoppelt.',
  },
  {
    level: 3,
    title: 'GALAKTISCHER LORD',
    reqCookies: 1_000_000_000, // 1 Milliarde (1 Mrd!)
    multiplier: 8,
    multiplierText: '8x',
    skinId: 'galaxy',
    skinName: '🌌 Galaxie-Moritz',
    skillId: 'eternal_grandmas',
    skillName: 'Ewige Großmütter',
    skillIcon: '★',
    skillDesc: 'Omas backen 5x schneller und beschwören alle 60s einen goldenen Keksregen!',
  },
  {
    level: 4,
    title: 'DIMENSIONS-HERRSCHER',
    reqCookies: 50_000_000_000, // 50 Milliarden
    multiplier: 16,
    multiplierText: '16x',
    skinId: 'quantum',
    skinName: '⚛️ Quanten-Moritz',
    skillId: 'critical_cosmos',
    skillName: 'Kritischer Kosmos',
    skillIcon: '✦',
    skillDesc: '+15% Chance auf Mega-Krit-Treffer (25-fache Klickkraft statt 10x) bei jedem Tastendruck!',
  },
  {
    level: 5,
    title: 'ZEITRAUM-SCHÖPFER',
    reqCookies: 2_000_000_000_000, // 2 Billionen
    multiplier: 32,
    multiplierText: '32x',
    skinId: 'golden_god',
    skinName: '👑 Göttlicher Moritz',
    skillId: 'divine_oven',
    skillName: 'Göttlicher Ofen',
    skillIcon: '♨',
    skillDesc: 'Startet jeden neuen Durchlauf sofort mit 10.000 Cookies. Alle goldenen Buffs halten doppelt so lange!',
  },
  {
    level: 6,
    title: 'UNENDLICHKEITS-MEISTER',
    reqCookies: 100_000_000_000_000, // 100 Billionen
    multiplier: 64,
    multiplierText: '64x',
    skinId: 'infinity',
    skinName: '♾️ Unendlichkeits-Moritz',
    skillId: 'singularity',
    skillName: 'Kosmische Singularität',
    skillIcon: '🌀',
    skillDesc: 'Jedes gekaufte Gebäude gewährt allen anderen Gebäuden dauerhaft +1% zusätzliche Produktion!',
  },
];

export function getAscensionTier(level) {
  if (level <= 0) return null;
  if (level <= ASCENSION_TIERS.length) {
    return ASCENSION_TIERS[level - 1];
  }
  const extraLevels = level - ASCENSION_TIERS.length;
  const baseReq = 100_000_000_000_000;
  const reqCookies = baseReq * Math.pow(25, extraLevels);
  const multiplier = Math.pow(2, level);
  return {
    level,
    title: `KOSMISCHER TITAN ${level}`,
    reqCookies,
    multiplier,
    multiplierText: `${multiplier}x`,
    skinId: 'infinity',
    skinName: '♾️ Unendlichkeits-Moritz',
    skillId: `singularity_${level}`,
    skillName: `Singularitäts-Resonanz Level ${level}`,
    skillIcon: '🪐',
    skillDesc: `Gigantischer exponentieller Multiplikator von ${multiplier}x auf alle Gebäude und Klicks!`,
  };
}

export function getNextAscensionTier(currentLevel = 0) {
  return getAscensionTier((currentLevel || 0) + 1);
}

export function getEligibleAscensionLevel(totalCookies) {
  if (!totalCookies || totalCookies < 1_000_000) return 0;
  let lvl = 0;
  while (true) {
    const tier = getAscensionTier(lvl + 1);
    if (totalCookies >= tier.reqCookies) {
      lvl++;
    } else {
      break;
    }
  }
  return lvl;
}


// === 25 ACHIEVEMENTS MIT EASTER EGGS ===
export const ACHIEVEMENTS = [
  { id: 'first_click',    name: 'ERSTER TAST',       desc: 'Den ersten Cookie gebacken', icon: '★', check: (s) => s.totalClicks >= 1 },
  { id: 'clicks_100',     name: '100 KLICKS',        desc: '100 Klicks gesammelt', icon: '★', check: (s) => s.totalClicks >= 100 },
  { id: 'clicks_1000',    name: 'FINGER-AKROBAT',    desc: '1.000 Klicks erreicht', icon: '★', check: (s) => s.totalClicks >= 1000 },
  { id: 'cookies_1k',     name: 'KEKS-STARTER',      desc: '1.000 Cookies gebacken', icon: '★', check: (s) => s.totalCookies >= 1000 },
  { id: 'cookies_100k',   name: 'KEKS-BAECKEREI',    desc: '100.000 Cookies gebacken', icon: '★', check: (s) => s.totalCookies >= 100000 },
  { id: 'cookies_1m',     name: 'KEKS-MILLIONAER',   desc: '1 Million Cookies gebacken', icon: '★', check: (s) => s.totalCookies >= 1_000_000 },
  { id: 'cookies_1b',     name: 'KEKS-MILLIARDAER',  desc: '1 Milliarde Cookies gebacken', icon: '★', check: (s) => s.totalCookies >= 1_000_000_000 },
  { id: 'cookies_1t',     name: 'KEKS-GOTT',         desc: '1 Billion Cookies gebacken', icon: '★', check: (s) => s.totalCookies >= 1_000_000_000_000 },
  { id: 'first_cursor',   name: 'CURSOR-FREUND',     desc: 'Ersten Cursor gekauft', icon: '★', check: (s) => (s.buildings?.cursor ?? 0) >= 1 },
  { id: 'oma_10',         name: 'OMAS KUCHEN-CLUB',  desc: '10 Omas backen für dich', icon: '★', check: (s) => (s.buildings?.oma ?? 0) >= 10 },
  { id: 'first_farm',     name: 'BAUERNHOF-IDYLLE',  desc: 'Erste Farm angelegt', icon: '★', check: (s) => (s.buildings?.farm ?? 0) >= 1 },
  { id: 'first_mine',     name: 'SCHOKO-BERGWERT',   desc: 'Erste Schoko-Mine erbaut', icon: '★', check: (s) => (s.buildings?.mine ?? 0) >= 1 },
  { id: 'first_bank',     name: 'WALLSTREET-BAECKER',desc: 'Erste Keks-Bank gegründet', icon: '★', check: (s) => (s.buildings?.bank ?? 0) >= 1 },
  { id: 'first_temple',   name: 'KULT DES KEKSRS',   desc: 'Ersten Tempel geweiht', icon: '★', check: (s) => (s.buildings?.tempel ?? 0) >= 1 },
  { id: 'first_magic',    name: 'KEKS-ALCHEMIE',     desc: 'Ersten Zauberturm errichtet', icon: '★', check: (s) => (s.buildings?.zauberturm ?? 0) >= 1 },
  { id: 'first_portal',   name: 'PORTAL-SPRUNG',     desc: 'Erstes Dimensions-Portal geöffnet', icon: '★', check: (s) => (s.buildings?.portal ?? 0) >= 1 },
  { id: 'first_time',     name: 'ZEITREISENDER',     desc: 'Erste Zeitmaschine gebaut', icon: '★', check: (s) => (s.buildings?.zeitmaschine ?? 0) >= 1 },
  { id: 'first_golden',   name: 'GOLDEN EYE',        desc: 'Ersten goldenen Cookie erwischt', icon: '★', check: (s) => s.goldenClicks >= 1 },
  { id: 'golden_10',      name: 'GLUECKSPILZ',       desc: '10 goldene Cookies geklickt', icon: '★', check: (s) => (s.goldenClicks ?? 0) >= 10 },
  // Easter Eggs & Event-Erfolge
  { id: 'konami_code',    name: 'RETRO-MEISTER',     desc: 'Easter Egg: Konami-Code eingegeben!', icon: '★', check: (s) => s.easterEggs?.includes('konami') },
  { id: 'title_clicks',   name: 'NEUGIERIGER BAECKER',desc: 'Easter Egg: 15x auf den Titel geklickt!', icon: '★', check: (s) => s.easterEggs?.includes('title_clicks') },
  { id: 'news_clicker',   name: 'ZEITUNGS-LESER',    desc: 'Easter Egg: Geheime News-Schlagzeile angeklickt', icon: '★', check: (s) => s.easterEggs?.includes('news_click') },
  { id: 'first_ascend',   name: 'AUFERSTANDEN',      desc: 'Zum ersten Mal aufgestiegen (Prestige)', icon: '★', check: (s) => (s.ascensionCount ?? 0) >= 1 },
  { id: 'stock_trader',   name: 'BOERSEN-FUCHS',     desc: 'Aktien an der Keks-Börse gehandelt', icon: '★', check: (s) => (s.tradesDone ?? 0) >= 1 },
  { id: 'event_hunter',   name: 'KOMETEN-JAEGER',    desc: 'Hat ein Random Event oder einen Kometen gefangen', icon: '★', check: (s) => (s.eventsCaught ?? 0) >= 1 },
];

// === KEKS-BÖRSE 2.0 — 8 Aktien, Sektoren, Dividenden, Marktphasen ===
export const INITIAL_STOCKS = [
  // ROHSTOFFE
  { id: 'mehl',    name: 'MEHL AG',         ticker: 'MEH', sector: 'ROHSTOFFE', basePrice: 50,    volatility: 0.06, dividendRate: 0.04, color: '#f3722c', desc: 'Weizenmehl-Monopolist' },
  { id: 'zucker',  name: 'ZUCKER CORP',      ticker: 'ZKR', sector: 'ROHSTOFFE', basePrice: 180,   volatility: 0.09, dividendRate: 0.03, color: '#f9c74f', desc: 'Globaler Zuckerlieferant' },
  // PRODUKTION
  { id: 'schoko',  name: 'KAKAO GLOBAL',     ticker: 'KKO', sector: 'PRODUKTION',basePrice: 620,   volatility: 0.12, dividendRate: 0.025,color: '#9d4edd', desc: 'Vollmilch & Zartbitter' },
  { id: 'butter',  name: 'GOLDENE BUTTER AG',ticker: 'BUT', sector: 'PRODUKTION',basePrice: 2500,  volatility: 0.08, dividendRate: 0.035,color: '#ffd700', desc: 'Alpen-Sauerrahmbutter' },
  // TECH
  { id: 'backbot', name: 'BACKBOT SYSTEMS',  ticker: 'BBT', sector: 'TECH',      basePrice: 8800,  volatility: 0.18, dividendRate: 0.01, color: '#00e5ff', desc: 'KI-gestützte Backroboter' },
  { id: 'keksai',  name: 'KEKS.AI INC',      ticker: 'KAI', sector: 'TECH',      basePrice: 45000, volatility: 0.25, dividendRate: 0.005,color: '#7b2fff', desc: 'Cookie-Algorithmus-Startup' },
  // FINANZEN
  { id: 'keksbank',name: 'KEKS BANK',        ticker: 'KBK', sector: 'FINANZEN',  basePrice: 1200,  volatility: 0.07, dividendRate: 0.06, color: '#43aa8b', desc: 'Größte Keks-Investmentbank' },
  { id: 'goldkeks',name: 'GOLDKEKS ETF',     ticker: 'GKX', sector: 'FINANZEN',  basePrice: 400,   volatility: 0.04, dividendRate: 0.05, color: '#ffa62b', desc: 'Diversifizierter Keks-Index' },
];

// Markt-News-Events die Kurse beeinflussen
export const MARKET_NEWS = [
  { id: 'bullrun',   text: 'ANALYSTEN: "Keks-Bullenmarkt erreicht neues Allzeithoch!"', sector: null,        multiplier: 1.15, prob: 0.05 },
  { id: 'crash',     text: 'CRASH: Massiver Keks-Markteinbruch erschüttert Anleger!',   sector: null,        multiplier: 0.75, prob: 0.04 },
  { id: 'rohstoff',  text: 'ROHSTOFF-BOOM: Mehl- und Zuckerpreise explodieren!',        sector: 'ROHSTOFFE', multiplier: 1.30, prob: 0.07 },
  { id: 'techcrash', text: 'TECH-BLASE: KI-Aktien brechen massiv ein!',                 sector: 'TECH',      multiplier: 0.65, prob: 0.05 },
  { id: 'techboom',  text: 'TECH-BOOM: BackBot meldet revolutionäre neue KI!',          sector: 'TECH',      multiplier: 1.45, prob: 0.06 },
  { id: 'zinserhöh', text: 'ZENTRALBANK erhöht Zinsen — Bankaktien steigen!',           sector: 'FINANZEN',  multiplier: 1.20, prob: 0.07 },
  { id: 'rezession', text: 'REZESSION droht — Produktion bricht ein!',                  sector: 'PRODUKTION',multiplier: 0.80, prob: 0.05 },
  { id: 'dividende', text: 'GOLDKEKS ETF kündigt Sonderdividende an!',                  sector: null,        multiplier: 1.08, prob: 0.08 },
];

// Interne Marktstate-Struktur
function initStockState(stock) {
  return {
    price: stock.basePrice,
    history: [stock.basePrice],
    trend: 0,         // -1 bärisch, 0 neutral, +1 bullisch
    trendStrength: 0, // 0–1
    dividendAccrued: 0,
    allTimeHigh: stock.basePrice,
    allTimeLow: stock.basePrice,
  };
}

export function updateStockPrices(currentStocks = {}, marketEvent = null) {
  const updated = {};

  INITIAL_STOCKS.forEach(stock => {
    const cur = currentStocks[stock.id] || initStockState(stock);

    // Momentum: träges Trend-Update
    let trend = cur.trend ?? 0;
    const trendShift = (Math.random() - 0.5) * 0.4;
    trend = Math.max(-1, Math.min(1, trend + trendShift));

    // Basisvolatilität + Trend-Drift
    const drift = trend * stock.volatility * 0.5;
    const noise = (Math.random() - 0.5) * stock.volatility * 2;
    let changePercent = drift + noise;

    // News-Event anwenden
    if (marketEvent) {
      const affectsSector = marketEvent.sector === null || marketEvent.sector === stock.sector;
      if (affectsSector) {
        changePercent += (marketEvent.multiplier - 1);
      }
    }

    // Zufällige Einzelnachrichten
    MARKET_NEWS.forEach(news => {
      if (Math.random() < news.prob * 0.15) {
        const affects = news.sector === null || news.sector === stock.sector;
        if (affects) changePercent += (news.multiplier - 1) * 0.3;
      }
    });

    // Preis-Berechnung mit Mean-Reversion bei starken Abweichungen
    const deviation = (cur.price - stock.basePrice) / stock.basePrice;
    const meanReversion = -deviation * 0.05;
    changePercent += meanReversion;

    let newPrice = Math.max(Math.floor(stock.basePrice * 0.1), Math.round(cur.price * (1 + changePercent)));
    newPrice = Math.min(newPrice, stock.basePrice * 20); // bis zu 20x möglich!

    const history = [...(cur.history || [cur.price]), newPrice].slice(-32);

    // Dividenden akkumulieren (pro Tick: annualisierte Rate / 8760 Ticks)
    const newDividend = (cur.dividendAccrued || 0) + newPrice * (stock.dividendRate / 8760);

    updated[stock.id] = {
      price: newPrice,
      history,
      trend,
      dividendAccrued: newDividend,
      allTimeHigh: Math.max(cur.allTimeHigh || newPrice, newPrice),
      allTimeLow: Math.min(cur.allTimeLow || newPrice, newPrice),
    };
  });

  return updated;
}

// Dividenden ausschütten und von akkumuliertem Betrag abziehen
export function collectDividends(stockPrices, stockShares) {
  let totalDividend = 0;
  const newPrices = { ...stockPrices };

  INITIAL_STOCKS.forEach(stock => {
    const shares = stockShares?.[stock.id] || 0;
    if (shares <= 0) return;
    const accrued = stockPrices[stock.id]?.dividendAccrued || 0;
    if (accrued < 1) return;
    const payout = Math.floor(accrued * shares);
    totalDividend += payout;
    newPrices[stock.id] = { ...newPrices[stock.id], dividendAccrued: accrued - Math.floor(accrued) };
  });

  return { totalDividend, newPrices };
}

// Portfolio-Wert berechnen
export function calcPortfolioValue(stockPrices, stockShares, stockBuyPrices) {
  let totalValue = 0;
  let totalCost = 0;
  INITIAL_STOCKS.forEach(stock => {
    const shares = stockShares?.[stock.id] || 0;
    if (shares <= 0) return;
    const price = stockPrices?.[stock.id]?.price || stock.basePrice;
    const buyPrice = stockBuyPrices?.[stock.id] || stock.basePrice;
    totalValue += price * shares;
    totalCost += buyPrice * shares;
  });
  return { totalValue, totalCost, profit: totalValue - totalCost };
}

// Gesamte Cookies-pro-Sekunde berechnen mit exponentiellem Aufstiegs-Multiplikator (2^ascensionCount)
export function calcCps(buildings, upgrades, buffMultiplier = 1, grandmaBoost = 1, diamondOvens = 0, ascensionCount = 0) {
  let total = 0;
  const hasSingularity = (ascensionCount >= 6);
  let totalBuildingCount = 0;
  if (hasSingularity) {
    totalBuildingCount = Object.values(buildings || {}).reduce((a, b) => a + (b || 0), 0);
  }

  for (const b of BUILDINGS) {
    const count = buildings[b.id] ?? 0;
    if (count === 0) continue;

    let rate = b.baseCps * count;

    // Upgrades
    const multi = upgrades
      .filter(u => u.effect === 'buildingMulti' && u.target === b.id)
      .reduce((acc, u) => acc * u.value, 1);

    let buildingCps = rate * multi;

    // Aufstiegs-Fähigkeit Stufe 3: Ewige Großmütter (5x Oma-CPS)
    if (b.id === 'oma' && ascensionCount >= 3) {
      buildingCps *= 5.0;
    }

    // Random Event: Omas Geburtstag (x5 Oma-CPS)
    if (b.id === 'oma' && grandmaBoost > 1) {
      buildingCps *= grandmaBoost;
    }

    // Aufstiegs-Fähigkeit Stufe 6: Kosmische Singularität (+1% pro Gebäude weltweit)
    if (hasSingularity && totalBuildingCount > 0) {
      buildingCps *= (1 + totalBuildingCount * 0.01);
    }

    total += buildingCps;
  }

  // VIP Diamanten-Öfen: Max 5 Öfen, jeder gibt +5% CPS + 20 Basis-CPS
  const cappedOvens = Math.min(5, Math.max(0, diamondOvens));
  if (cappedOvens > 0) {
    total = (total + cappedOvens * 20) * (1 + cappedOvens * 0.05);
  }

  // Exponentieller Aufstiegs-Multiplikator: 2^ascensionCount (1: 2x, 2: 4x, 3: 8x, 4: 16x, 5: 32x, 6: 64x...)
  const ascensionMultiplier = Math.pow(2, Math.max(0, ascensionCount || 0));

  return total * ascensionMultiplier * buffMultiplier;
}

// Cookies pro Klick berechnen mit exponentiellem Aufstiegs-Multiplikator & Fähigkeiten
export function calcClickValue(upgrades, critActive = false, buffMultiplier = 1, currentCps = 0, currentSkin = 'moritz', ascensionCount = 0) {
  let base = 1;
  for (const u of upgrades) {
    if (u.effect === 'clickMulti') base *= u.value;
  }

  // Aufstiegs-Fähigkeit Stufe 2 (Warp-Ofen): Basis-Klickkraft verdoppelt
  if (ascensionCount >= 2) {
    base *= 2;
  }

  // Klick-Anteil an der CPS: +2% der aktuellen CPS fließen in Klicks ein ab Stufe 1!
  if (ascensionCount >= 1 && currentCps > 0) {
    base += currentCps * 0.02;
  }

  // VIP Kristall-Moritz Skin (+5% Klick-Stärke)
  if (currentSkin === 'crystal') {
    base *= 1.05;
  }

  // Exponentieller Aufstiegs-Multiplikator: 2^ascensionCount
  const ascensionMultiplier = Math.pow(2, Math.max(0, ascensionCount || 0));
  base *= ascensionMultiplier;

  if (critActive) {
    // Falls Aufstiegs-Fähigkeit Stufe 4 (Kritischer Kosmos) freigeschaltet ist: 25x Mega-Krit statt 10x!
    base *= (ascensionCount >= 4 ? 25 : 10);
  }

  return base * buffMultiplier;
}

// Formatierung: 0,1, 15, 1.5k, 2.3 Mio., 1.5 Mrd., 2.3 Bio. etc.
export function fmtCookies(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + ' Brd.';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' Bio.';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + ' Mrd.';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + ' Mio.';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  if (n > 0 && n < 10) return n % 1 === 0 ? String(Math.floor(n)) : n.toFixed(1).replace('.', ',');
  return Math.floor(n).toLocaleString('de-DE');
}

// Initialer Spielstand (Frei von Himmels-Chips!)
export function createClickerState() {
  return {
    bakeryName: "Keks Imperium",
    cookies: 0,
    totalCookies: 0,
    totalClicks: 0,
    goldenClicks: 0,
    eventsCaught: 0,
    buildings: {},
    upgrades: [],
    achievements: [],
    easterEggs: [],
    skin: 'moritz',
    stockShares: {},
    stockPrices: {},
    tradesDone: 0,
    gems: 5,
    ascensionCount: 0,
    wrinklers: [],
    lastSaved: Date.now(),
    startedAt: Date.now(),
    playTime: 0,
  };
}
