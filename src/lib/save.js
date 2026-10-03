import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_SAVE_PREFIX = 'arcade_save_';

function getLocalSave(name, game) {
  try {
    const raw = localStorage.getItem(`${LOCAL_SAVE_PREFIX}${game}_${name}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSave(name, game, state) {
  try {
    localStorage.setItem(
      `${LOCAL_SAVE_PREFIX}${game}_${name}`,
      JSON.stringify({ state, updated_at: new Date().toISOString() })
    );
    return true;
  } catch {
    return false;
  }
}

function removeLocalSave(name, game) {
  try {
    localStorage.removeItem(`${LOCAL_SAVE_PREFIX}${game}_${name}`);
    return true;
  } catch {
    return false;
  }
}

// Spielstand laden — gibt null zurück wenn nicht vorhanden
export async function loadGameState(name, game) {
  // Wenn offline oder nicht konfiguriert -> sofort aus localStorage
  if (!isSupabaseConfigured() || !supabase) {
    const local = getLocalSave(name, game);
    return { data: local, offline: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { data, error } = await supabase
      .from('game_states')
      .select('state, updated_at')
      .eq('name', name)
      .eq('game', game)
      .maybeSingle()
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { data: data ?? getLocalSave(name, game), offline: false };
  } catch {
    const local = getLocalSave(name, game);
    return { data: local, offline: true };
  }
}

// Spielstand speichern (upsert per name+game)
export async function saveGameState(name, game, state) {
  // Immer lokal sichern
  setLocalSave(name, game, state);

  if (!isSupabaseConfigured() || !supabase) {
    return { success: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { error } = await supabase
      .from('game_states')
      .upsert(
        { name, game, state, updated_at: new Date().toISOString() },
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
  removeLocalSave(name, game);

  if (!isSupabaseConfigured() || !supabase) {
    return { success: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 2500);

    const { error } = await supabase
      .from('game_states')
      .delete()
      .eq('name', name)
      .eq('game', game)
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: true };
  }
}
