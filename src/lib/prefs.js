// localStorage-Wrapper NUR für: Name, Sound, Steuerung, Tutorial-Flag
// Alles andere (Spielstände) geht via Supabase (save.js)

const KEY_NAME = 'arcade_name';
const KEY_SOUND = 'arcade_sound';
const KEY_CONTROL = 'arcade_control'; // 'swipe' | 'keys'
const KEY_TUTORIAL = 'arcade_tutorial'; // Set<gameName>

export function getLastName() {
  return localStorage.getItem(KEY_NAME) ?? '';
}

export function setLastName(name) {
  localStorage.setItem(KEY_NAME, name.trim().slice(0, 16));
}

export function getSoundEnabled() {
  const val = localStorage.getItem(KEY_SOUND);
  return val === null ? true : val === '1';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(KEY_SOUND, enabled ? '1' : '0');
}

export function getControlPref() {
  return localStorage.getItem(KEY_CONTROL) ?? 'swipe';
}

export function setControlPref(pref) {
  localStorage.setItem(KEY_CONTROL, pref);
}

export function hasTutorialBeenSeen(game) {
  const raw = localStorage.getItem(KEY_TUTORIAL);
  if (!raw) return false;
  try {
    return JSON.parse(raw).includes(game);
  } catch {
    return false;
  }
}

export function markTutorialSeen(game) {
  const raw = localStorage.getItem(KEY_TUTORIAL);
  let seen = [];
  try {
    seen = JSON.parse(raw) ?? [];
  } catch {
    seen = [];
  }
  if (!seen.includes(game)) {
    seen.push(game);
    localStorage.setItem(KEY_TUTORIAL, JSON.stringify(seen));
  }
}
