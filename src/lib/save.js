import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_SAVE_PREFIX = 'arcade_save_';

export function normalizePlayerName(name) {
  if (!name || typeof name !== 'string') return 'gast';
  const clean = name.trim().toLowerCase();
  return clean || 'gast';
}

function getLocalSave(name, game) {
  const norm = normalizePlayerName(name);
  try {
    const raw = localStorage.getItem(`${LOCAL_SAVE_PREFIX}${game}_${norm}`);
    if (raw) return JSON.parse(raw);

    // Fallback: try raw name if different
    if (name && name !== norm) {
      const rawOrig = localStorage.getItem(`${LOCAL_SAVE_PREFIX}${game}_${name}`);
      if (rawOrig) return JSON.parse(rawOrig);
    }
    return null;
  } catch {
    return null;
  }
}

function setLocalSave(name, game, state) {
  const norm = normalizePlayerName(name);
  try {
    const payload = JSON.stringify({ state, updated_at: new Date().toISOString() });
    localStorage.setItem(`${LOCAL_SAVE_PREFIX}${game}_${norm}`, payload);
    if (name && name !== norm) {
      localStorage.setItem(`${LOCAL_SAVE_PREFIX}${game}_${name}`, payload);
    }
    return true;
  } catch {
    return false;
  }
}

function removeLocalSave(name, game) {
  const norm = normalizePlayerName(name);
  try {
    localStorage.removeItem(`${LOCAL_SAVE_PREFIX}${game}_${norm}`);
    if (name && name !== norm) {
      localStorage.removeItem(`${LOCAL_SAVE_PREFIX}${game}_${name}`);
    }
    return true;
  } catch {
    return false;
  }
}

// Spielstand laden — gibt null zurück wenn nicht vorhanden
export async function loadGameState(name, game) {
  const norm = normalizePlayerName(name);

  // Wenn offline oder nicht konfiguriert -> sofort aus localStorage
  if (!isSupabaseConfigured() || !supabase) {
    const local = getLocalSave(norm, game);
    return { data: local, offline: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { data, error } = await supabase
      .from('game_states')
      .select('state, updated_at')
      .ilike('name', norm)
      .eq('game', game)
      .maybeSingle()
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { data: data ?? getLocalSave(norm, game), offline: false };
  } catch {
    const local = getLocalSave(norm, game);
    return { data: local, offline: true };
  }
}

// Spielstand speichern (upsert per name+game)
export async function saveGameState(name, game, state) {
  const norm = normalizePlayerName(name);

  if (state && typeof state === 'object') {
    state.lastSaved = Date.now();
  }

  // Immer lokal sichern
  setLocalSave(norm, game, state);

  // Wenn es Clicker-Cookies betrifft: Live Sync Event feuern!
  if (game === 'clicker') {
    window.dispatchEvent(new CustomEvent('arcade-cookies-synced', {
      detail: {
        cookies: state?.cookies,
        state,
        playerName: norm,
        lastSaved: Date.now(),
      }
    }));
  }

  if (!isSupabaseConfigured() || !supabase) {
    return { success: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { error } = await supabase
      .from('game_states')
      .upsert(
        { name: norm, game, state, updated_at: new Date().toISOString() },
        { onConflict: 'name,game' }
      )
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: true }; // Lokal gesichert!
  }
}

// Spielstand löschen (z.B. nach "Neu starten")
export async function deleteGameState(name, game) {
  const norm = normalizePlayerName(name);
  removeLocalSave(norm, game);

  if (!isSupabaseConfigured() || !supabase) {
    return { success: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { error } = await supabase
      .from('game_states')
      .delete()
      .ilike('name', norm)
      .eq('game', game)
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: true };
  }
}
