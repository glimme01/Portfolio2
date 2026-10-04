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

// === HIMMELRICHE PRESTIGE-UPGRADES (CELESTIAL TREE) ===
export const HEAVENLY_UPGRADES = [
  {
    id: 'heavenly_oven',
    name: 'GÖTTLICHER OFEN',
    cost: 1,
    icon: '♨',
    desc: 'Startet jeden neuen Durchlauf sofort mit 500 Start-Cookies und verleiht dauerhaft +25% CPS.',
  },
  {
    id: 'comet_magnet',
    name: 'KOMETEN-MAGNET',
    cost: 2,
    icon: '☄',
    desc: 'Random Events und Kometen erscheinen doppelt so häufig!',
  },
  {
    id: 'celestial_clicks',
    name: 'HIMMLISCHE FINGER',
    cost: 4,
    icon: '✦',
    desc: 'Jeder Klick generiert zusätzlich dauerhaft +2% deiner gesamten CPS!',
  },
  {
    id: 'eternal_grandmas',
    name: 'EWIGE GROSSMÜTTER',
    cost: 8,
    icon: '★',
    desc: 'Omas sind 40% günstiger im Einkauf und backen dauerhaft 100% schneller!',
  },
  {
    id: 'warp_drive',
    name: 'ZEIT-KRÜMMUNG',
    cost: 15,
    icon: '⌛',
    desc: 'Offline-Produktion wird von 50% auf volle 100% Effizienz verdoppelt!',
  },
  {
    id: 'cosmic_multiplier',
    name: 'KOSMISCHE HARMONIE',
    cost: 25,
    icon: '🌌',
    desc: 'Verleiht einen gewaltigen permanenten +50% Bonus auf ALLE Gebäude und Klicks!',
  },
];

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

// === PRESTIGE / ASCENSION BERECHNUNG ===
export function calcPrestigeReward(totalCookies, alreadyClaimed = 0) {
  if (!totalCookies || totalCookies < 100_000) return 0;
  const lifetimeChips = Math.floor(Math.cbrt(totalCookies / 100_000));
  return Math.max(0, lifetimeChips - alreadyClaimed);
}

// Gesamte Cookies-pro-Sekunde berechnen
export function calcCps(buildings, upgrades, prestigeChips = 0, buffMultiplier = 1, heavenlyUpgrades = [], grandmaBoost = 1) {
  let total = 0;
  for (const b of BUILDINGS) {
    const count = buildings[b.id] ?? 0;
    if (count === 0) continue;

    let rate = b.baseCps * count;

    // Upgrades
    const multi = upgrades
      .filter(u => u.effect === 'buildingMulti' && u.target === b.id)
      .reduce((acc, u) => acc * u.value, 1);

    let buildingCps = rate * multi;

    // Himmlisches Upgrade: Ewige Großmütter (+100% Oma-CPS)
    if (b.id === 'oma' && heavenlyUpgrades.includes('eternal_grandmas')) {
      buildingCps *= 2.0;
    }

    // Random Event: Omas Geburtstag (x5 Oma-CPS)
    if (b.id === 'oma' && grandmaBoost > 1) {
      buildingCps *= grandmaBoost;
    }

    total += buildingCps;
  }

  // Himmlisches Upgrade: Göttlicher Ofen (+25% CPS)
  if (heavenlyUpgrades.includes('heavenly_oven')) {
    total *= 1.25;
  }

  // Himmlisches Upgrade: Kosmische Harmonie (+50% CPS)
  if (heavenlyUpgrades.includes('cosmic_multiplier')) {
    total *= 1.5;
  }

  // Prestige-Bonus: +1% pro verdienten Himmlischem Chip
  const prestigeBonus = 1 + (prestigeChips * 0.01);

  return total * prestigeBonus * buffMultiplier;
}

// Cookies pro Klick berechnen
export function calcClickValue(upgrades, critActive = false, buffMultiplier = 1, currentCps = 0, heavenlyUpgrades = []) {
  let base = 1;
  for (const u of upgrades) {
    if (u.effect === 'clickMulti') base *= u.value;
  }

  // Himmlisches Upgrade: Himmlische Finger (+2% der CPS als Klickkraft)
  if (heavenlyUpgrades.includes('celestial_clicks') && currentCps > 0) {
    base += currentCps * 0.02;
  }

  // Himmlisches Upgrade: Kosmische Harmonie (+50%)
  if (heavenlyUpgrades.includes('cosmic_multiplier')) {
    base *= 1.5;
  }

  if (critActive) base *= 10;
  return base * buffMultiplier;
}

// Formatierung: 0,1, 15, 1.5k, 2.3 Mio., etc.
export function fmtCookies(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' Bio.';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + ' Mrd.';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + ' Mio.';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  if (n > 0 && n < 10) return n % 1 === 0 ? String(Math.floor(n)) : n.toFixed(1).replace('.', ',');
  return Math.floor(n).toLocaleString('de-DE');
}

// Initialer Spielstand
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
    heavenlyChips: 0,
    heavenlyChipsClaimed: 0,
    spentHeavenlyChips: 0,
    heavenlyUpgrades: [],
    gems: 10,
    ascensionCount: 0,
    wrinklers: [],
    lastSaved: Date.now(),
    startedAt: Date.now(),
    playTime: 0,
  };
}
