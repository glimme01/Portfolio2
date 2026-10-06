import { loadGameState, saveGameState, normalizePlayerName } from './save.js';
import { setSoundEnabled, setControlPref } from './prefs.js';
import { getCurrentUser } from './auth.js';

export const DEFAULT_SETTINGS = {
  soundEnabled: true,
  volume: 0.8,
  retroCrt: true,
  reducedMotion: false,
  numberFormat: 'short', // 'short' (1.2M), 'full' (1.200.000), 'scientific' (1.2e6)
  casinoDefaultCurrency: 'cookies', // 'cookies' | 'heavenlyChips' | 'gems'
  clickerParticles: true,
  clickerNumbers: true,
  controls: 'swipe', // 'swipe' | 'keys' | 'wasd'
};

const SETTINGS_KEY_PREFIX = 'arcade_user_settings_';

export function getCachedSettings(username = 'gast') {
  const norm = normalizePlayerName(username);
  try {
    const raw = localStorage.getItem(`${SETTINGS_KEY_PREFIX}${norm}`);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function applySettingsToDOM(settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // CRT Scanline Filter Toggle
  if (!settings.retroCrt) {
    root.classList.add('crt-off');
  } else {
    root.classList.remove('crt-off');
  }

  // Reduced Motion
  if (settings.reducedMotion) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  // Audio / Prefs synchronisieren
  setSoundEnabled(Boolean(settings.soundEnabled));
  setControlPref(settings.controls || 'swipe');

  // CSS Custom Properties
  root.style.setProperty('--arcade-volume', String(settings.volume ?? 0.8));
}

// Einstellungen aus der Datenbank laden (Fallback: Lokaler Cache)
export async function loadUserSettings(username) {
  const norm = normalizePlayerName(username || getCurrentUser()?.username || 'gast');
  const cached = getCachedSettings(norm);

  if (norm === 'gast') {
    applySettingsToDOM(cached);
    return cached;
  }

  try {
    const { data } = await loadGameState(norm, 'settings');
    const cloudSettings = data?.state;
    const merged = { ...DEFAULT_SETTINGS, ...cached, ...(cloudSettings || {}) };

    localStorage.setItem(`${SETTINGS_KEY_PREFIX}${norm}`, JSON.stringify(merged));
    applySettingsToDOM(merged);
    return merged;
  } catch {
    applySettingsToDOM(cached);
    return cached;
  }
}

// Einstellungen in der Datenbank & lokal speichern
export async function saveUserSettings(username, updates) {
  const norm = normalizePlayerName(username || getCurrentUser()?.username || 'gast');
  const current = getCachedSettings(norm);
  const next = { ...current, ...updates };

  try {
    localStorage.setItem(`${SETTINGS_KEY_PREFIX}${norm}`, JSON.stringify(next));
  } catch {}

  applySettingsToDOM(next);

  // In die Supabase Datenbank speichern falls angemeldet
  if (norm !== 'gast') {
    try {
      await saveGameState(norm, 'settings', next, { forceOverwrite: true });
    } catch (err) {
      console.warn('Fehler beim Speichern der Einstellungen in Supabase:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('arcade-settings-updated', { detail: next }));
  return { success: true, settings: next };
}
