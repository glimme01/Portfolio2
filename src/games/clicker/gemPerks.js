// VIP Diamanten-Shop: Ausbalancierte Perks ohne Exploits oder Loopholes

export const MAX_DIAMOND_OVENS = 5;

// Gestaffelte Kosten für Diamanten-Öfen
export const DIAMOND_OVEN_COSTS = [15, 25, 40, 60, 90];

export function getDiamondOvenCost(owned = 0) {
  if (owned >= MAX_DIAMOND_OVENS) return null;
  return DIAMOND_OVEN_COSTS[owned] || 90;
}

export const TIME_WARP_COOLDOWN_MS = 15 * 60 * 1000; // 15 Minuten Cooldown
export const GOLD_FRENZY_COOLDOWN_MS = 10 * 60 * 1000; // 10 Minuten Cooldown

export const GEM_PERKS = [
  {
    id: 'time_warp',
    name: 'ZEIT-SPRUNG (15 MIN)',
    icon: '⏳',
    cost: 20,
    badge: '15M CPS • 15M COOLDOWN',
    type: 'instant_cooldown',
    color: '#00e5ff',
    desc: 'Gewährt sofort die Keks-Produktion von 15 Minuten deiner aktuellen Basis-CPS. Hat 15 Minuten Abklingzeit.',
  },
  {
    id: 'gold_frenzy',
    name: 'GOLD-FRENZY (30S)',
    icon: '🌟',
    cost: 15,
    badge: '3x BOOST • 10M COOLDOWN',
    type: 'instant_cooldown',
    color: '#ffd700',
    desc: 'Zündet einen 30-sekündigen Keks-Rausch mit 3-facher Produktion. Hat 10 Minuten Abklingzeit.',
  },
  {
    id: 'diamond_oven',
    name: 'DIAMANTEN-BACKOFEN',
    icon: '💎',
    baseCost: 15,
    badge: 'MAX 5 (+5% CPS PRO OFEN)',
    type: 'stackable_capped',
    maxCount: 5,
    color: '#a855f7',
    desc: 'Edler Diamant-Ofen: Erhöht deine Gesamt-CPS um +5% und +20 Basis-CPS. Bis zu maximal 5x kaufbar!',
  },
  {
    id: 'lucky_clover',
    name: 'VIP CASINO-GLÜCKSKLEE',
    icon: '🍀',
    cost: 25,
    badge: 'EINMALIG (+5% CASINO-GEWINNE)',
    type: 'permanent',
    color: '#39ff14',
    desc: 'Verleiht dauerhaftes VIP-Glück: +5% Bonus-Gewinnauszahlung bei allen Slots, Blackjack und Keks-Münzwurf Runden!',
  },
  {
    id: 'casino_insurance',
    name: 'CASINO-VERSICHERUNG (3x)',
    icon: '🛡️',
    cost: 20,
    badge: '3x SCHUTZ (25% ERSTATTUNG)',
    type: 'charges',
    maxCharges: 3,
    color: '#3a86ff',
    desc: 'Sicherheitsnetz gegen Pechsträhnen: Bei den nächsten 3 verlorenen Casino-Runden (Slots/Blackjack) werden 25% des Einsatzes erstattet (max. 50k Cookies).',
  },
  {
    id: 'crystal_skin',
    name: 'KRISTALL-MORITZ SKIN',
    icon: '✨',
    cost: 35,
    badge: 'EXKLUSIVER SKIN (+5% KLICK)',
    type: 'skin',
    color: '#00f2fe',
    desc: 'Schaltet den legendären funkelnden Kristall-Skin mit magischer Diamant-Aura frei (+5% permanente Klick-Stärke)!',
  },
];
