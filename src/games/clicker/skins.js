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
];

export const DEFAULT_SKIN = 'moritz';

export function getSkin(id) {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}

export function isSkinUnlocked(skin, state) {
  switch (skin.unlockAt) {
    case 'start':        return true;
    case 'clicks_100':   return state.totalClicks >= 100;
    case 'clicks_1000':  return state.totalClicks >= 1000;
    case 'buildings_10': return getTotalBuildings(state) >= 10;
    case 'buildings_50': return getTotalBuildings(state) >= 50;
    case 'first_golden': return (state.goldenClicks ?? 0) >= 1;
    case 'cookies_1m':   return state.totalCookies >= 1_000_000;
    case 'konami':       return state.easterEggs?.includes('konami') ?? false;
    case 'crystal_skin': return Boolean(state.unlockedGemSkins?.includes('crystal'));
    case 'all_skins':    return SKINS.filter(s => s.id !== 'rainbow' && s.id !== 'retro_arcade' && s.id !== 'crystal').every(s => isSkinUnlocked(s, state));
    default: return false;
  }
}

function getTotalBuildings(state) {
  return Object.values(state.buildings ?? {}).reduce((a, b) => a + b, 0);
}
