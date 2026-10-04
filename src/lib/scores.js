import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_SCORES_KEY = 'arcade_local_scores_v2';

function getStoredLocalScores() {
  try {
    const raw = localStorage.getItem(LOCAL_SCORES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    // Entferne alle alten erfundenen Dummy-Scores
    return Array.isArray(list) ? list.filter(s => s && !String(s.id).startsWith('def-')) : [];
  } catch {
    return [];
  }
}

function saveLocalScore(name, game, score) {
  const list = getStoredLocalScores();
  const existingIdx = list.findIndex(s => s.name === name && s.game === game);

  let entry;
  if (existingIdx !== -1) {
    // Nur updaten wenn neuer Score höher ist
    if (score <= list[existingIdx].score) return list[existingIdx];
    list[existingIdx] = { ...list[existingIdx], score, created_at: new Date().toISOString() };
    entry = list[existingIdx];
  } else {
    entry = {
      id: 'local-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name,
      game,
      score,
      created_at: new Date().toISOString(),
    };
    list.push(entry);
  }

  try {
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(list));
  } catch {}
  return entry;
}

// Gibt Top-N-Scores für ein Spiel zurück
export async function getTopScores(game, limit = 10) {
  // Wenn Supabase nicht konfiguriert ist -> sofort lokale Scores
  if (!isSupabaseConfigured() || !supabase) {
    const local = getStoredLocalScores()
      .filter(s => s.game === game)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { data: local, offline: true };
  }

  try {
    // Timeout von 3 Sekunden für Supabase-Anfrage
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 3000);

    const { data, error } = await supabase
      .from('scores')
      .select('id, name, score, created_at')
      .eq('game', game)
      .order('score', { ascending: false })
      .limit(limit)
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { data: data ?? [], offline: false };
  } catch (err) {
    console.warn('Supabase offline oder Fehler, nutze lokale Scores:', err?.message);
    const local = getStoredLocalScores()
      .filter(s => s.game === game)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { data: local, offline: true };
  }
}

// Gesamtanzahl aller Scores (für Lobby-Statistik)
export async function getTotalScoreCount() {
  if (!isSupabaseConfigured() || !supabase) {
    const local = getStoredLocalScores();
    return { count: local.length, offline: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 3000);

    const { count, error } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { count: count ?? 0, offline: false };
  } catch {
    const local = getStoredLocalScores();
    return { count: local.length, offline: true };
  }
}

// Score eintragen — Plausibilitäts-Check vor dem Submit
export async function insertScore(name, game, score) {
  const maxScore = { snake: 999999, press: 999999, clicker: 999999999 }[game] ?? 999999;
  const cleanName = name.trim().slice(0, 16);

  if (!cleanName || score < 0 || score > maxScore) {
    return { error: 'Ungültiger Score oder Name' };
  }

  // Lokal immer mitspeichern
  const localEntry = saveLocalScore(cleanName, game, score);

  if (!isSupabaseConfigured() || !supabase) {
    return { data: localEntry };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 3500);

    // UPSERT: Bei Konflikt auf (name, game) nur updaten wenn neuer Score höher
    const { data, error } = await supabase
      .from('scores')
      .upsert(
        [{ name: cleanName, game, score }],
        {
          onConflict: 'name,game',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { data };
  } catch (e) {
    console.warn('Online-Eintrag fehlgeschlagen, Score lokal gesichert:', e?.message);
    return { data: localEntry };
  }
}

// Admin: Einzelnen Score löschen (Lokal und in Supabase)
export async function deleteScore(id) {
  const list = getStoredLocalScores().filter(s => String(s.id) !== String(id));
  try {
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(list));
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('scores').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }
}

// Admin: Alle Scores für ein Spiel zurücksetzen
export async function clearAllScores(game) {
  let list = getStoredLocalScores();
  if (game) {
    list = list.filter(s => s.game !== game);
  } else {
    list = [];
  }
  try {
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(list));
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      if (game) {
        await supabase.from('scores').delete().eq('game', game);
      } else {
        await supabase.from('scores').delete().neq('id', 0);
      }
    } catch (err) {
      console.warn('Supabase clearAllScores error:', err);
    }
  }
}

// Admin: Alle Scores für Admin-Dashboard laden
export async function getAllScoresAdmin() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('scores')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);
      if (data && data.length > 0) return data;
    } catch {}
  }
  return getStoredLocalScores().reverse();
}

