// Clicker-Skins: zentral verwaltet
export const SKINS = [
  { id: 'moritz',       name: 'DER MORITZ (LOGO)', image: '/logo.png', particleColor: '#ffd700', unlockAt: 'start' },
  { id: 'classic',      name: 'KLASSISCH',         emoji: '🍪', particleColor: '#c8832a', unlockAt: 'start' },
  { id: 'bagel',        name: 'BAGEL',             emoji: '🥯', particleColor: '#d4a574', unlockAt: 'clicks_100' },
  { id: 'donut',        name: 'DONUT',             emoji: '🍩', particleColor: '#ff69b4', unlockAt: 'clicks_1000' },
  { id: 'moon',         name: 'MOND',              emoji: '🌕', particleColor: '#fffacd', unlockAt: 'buildings_10' },
  { id: 'waffle',       name: 'WAFFEL',            emoji: '🧇', particleColor: '#daa520', unlockAt: 'buildings_50' },
  { id: 'disco',        name: 'DISCO',             emoji: '🪩', particleColor: '#9370db', unlockAt: 'first_golden' },
  { id: 'yellow',       name: 'GOLD-KEKS',         emoji: '🟡', particleColor: '#ffd700', unlockAt: 'cookies_1m' },
  { id: 'rainbow',      name: 'REGENBOGEN',        emoji: '🌈', particleColor: '#ff6ec7', unlockAt: 'all_skins' },
  { id: 'retro_arcade', name: 'RETRO PIXEL (EASTER EGG)', emoji: '👾', particleColor: '#ffd700', unlockAt: 'konami' },
  { id: 'crystal',      name: '💎 KRISTALL-MORITZ (VIP)', emoji: '💎', particleColor: '#00f2fe', unlockAt: 'crystal_skin' },
  // Exklusive Aufstiegs-Skins (Dauerhaft freigeschaltet ab jeweiliger Aufstiegs-Stufe)
  { id: 'astral',       name: '✨ ASTRAL-MORITZ (STUFE 1)', emoji: '✨', particleColor: '#00e5ff', unlockAt: 'ascension_1' },
  { id: 'cyber',        name: '⚡ CYBER-MORITZ (STUFE 2)',  emoji: '⚡', particleColor: '#39ff14', unlockAt: 'ascension_2' },
  { id: 'galaxy',       name: '🌌 GALAXIE-MORITZ (STUFE 3)',emoji: '🌌', particleColor: '#bf5af2', unlockAt: 'ascension_3' },
  { id: 'quantum',      name: '⚛️ QUANTEN-MORITZ (STUFE 4)',emoji: '⚛️', particleColor: '#00f2fe', unlockAt: 'ascension_4' },
  { id: 'golden_god',   name: '👑 GÖTTLICHER MORITZ (STUFE 5)', emoji: '👑', particleColor: '#ffd700', unlockAt: 'ascension_5' },
  { id: 'infinity',     name: '♾️ UNENDLICHKEIT (STUFE 6)', emoji: '♾️', particleColor: '#ff007f', unlockAt: 'ascension_6' },
];

export const DEFAULT_SKIN = 'moritz';

export function getSkin(id) {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}

const ASCENSION_SKIN_IDS = ['astral', 'cyber', 'galaxy', 'quantum', 'golden_god', 'infinity'];

export function isSkinUnlocked(skin, state) {
  if (!state) return skin.unlockAt === 'start';
  switch (skin.unlockAt) {
    case 'start':        return true;
    case 'clicks_100':   return (state.totalClicks ?? 0) >= 100;
    case 'clicks_1000':  return (state.totalClicks ?? 0) >= 1000;
    case 'buildings_10': return getTotalBuildings(state) >= 10;
    case 'buildings_50': return getTotalBuildings(state) >= 50;
    case 'first_golden': return (state.goldenClicks ?? 0) >= 1;
    case 'cookies_1m':   return (state.totalCookies ?? 0) >= 1_000_000;
    case 'konami':       return state.easterEggs?.includes('konami') ?? false;
    case 'crystal_skin': return Boolean(state.unlockedGemSkins?.includes('crystal'));
    case 'ascension_1':  return (state.ascensionCount ?? 0) >= 1;
    case 'ascension_2':  return (state.ascensionCount ?? 0) >= 2;
    case 'ascension_3':  return (state.ascensionCount ?? 0) >= 3;
    case 'ascension_4':  return (state.ascensionCount ?? 0) >= 4;
    case 'ascension_5':  return (state.ascensionCount ?? 5) >= 5 && (state.ascensionCount ?? 0) >= 5;
    case 'ascension_6':  return (state.ascensionCount ?? 0) >= 6;
    case 'all_skins':    return SKINS.filter(s => s.id !== 'rainbow' && s.id !== 'retro_arcade' && s.id !== 'crystal' && !ASCENSION_SKIN_IDS.includes(s.id)).every(s => isSkinUnlocked(s, state));
    default: return false;
  }
}

function getTotalBuildings(state) {
  return Object.values(state?.buildings ?? {}).reduce((a, b) => a + b, 0);
}
