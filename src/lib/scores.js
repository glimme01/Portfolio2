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

function getLoggedInUser() {
  try {
    const raw = localStorage.getItem('arcade_current_user_v2');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalScore(name, game, score, alwaysAdapt = false) {
  if (!name || name.toLowerCase() === 'gast' || name.toLowerCase() === 'anonym') {
    return null;
  }
  const list = getStoredLocalScores();
  const existingIdx = list.findIndex(s => s.name === name && s.game === game);

  let entry;
  if (existingIdx !== -1) {
    // Wenn alwaysAdapt aktiv oder Clicker: Immer an den aktuellen Spielstand/Konto anpassen!
    // Ansonsten für klassische Highscore-Runs (Snake/Press): Nur wenn höher, außer alwaysAdapt ist true.
    if (!alwaysAdapt && game !== 'clicker' && score <= list[existingIdx].score) {
      return list[existingIdx];
    }
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
    window.dispatchEvent(new CustomEvent('arcade-scores-updated', { detail: { game, name, score } }));
  } catch {}
  return entry;
}

// Gibt Top-N-Scores für ein Spiel zurück
export async function getTopScores(game, limit = 10) {
  // Wenn Supabase nicht konfiguriert ist -> sofort lokale Scores
  if (!isSupabaseConfigured() || !supabase) {
    const local = getStoredLocalScores()
      .filter(s => s.game === game && s.name && s.name.toLowerCase() !== 'gast' && s.name.toLowerCase() !== 'anonym')
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
      .limit(limit * 2) // leicht erhöhen um gefilterte Gäste auszugleichen
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    const cleanList = (data ?? [])
      .filter(s => s && s.name && s.name.toLowerCase() !== 'gast' && s.name.toLowerCase() !== 'anonym')
      .slice(0, limit);
    return { data: cleanList, offline: false };
  } catch (err) {
    console.warn('Supabase offline oder Fehler, nutze lokale Scores:', err?.message);
    const local = getStoredLocalScores()
      .filter(s => s.game === game && s.name && s.name.toLowerCase() !== 'gast' && s.name.toLowerCase() !== 'anonym')
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { data: local, offline: true };
  }
}

// Gesamtanzahl aller Scores (für Lobby-Statistik)
export async function getTotalScoreCount() {
  if (!isSupabaseConfigured() || !supabase) {
    const local = getStoredLocalScores().filter(s => s && s.name && s.name.toLowerCase() !== 'gast');
    return { count: local.length, offline: true };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 3000);

    const { count, error } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .not('name', 'ilike', 'gast')
      .abortSignal(abortController.signal);

    clearTimeout(timer);
    if (error) throw error;
    return { count: count ?? 0, offline: false };
  } catch {
    const local = getStoredLocalScores().filter(s => s && s.name && s.name.toLowerCase() !== 'gast');
    return { count: local.length, offline: true };
  }
}

// Score eintragen — Plausibilitäts-Check vor dem Submit
export async function insertScore(name, game, score, options = {}) {
  const maxScore = { snake: 999999, press: 999999, clicker: 999999999999, slots: 999999999999, blackjack: 999999999999 }[game] ?? 999999999999;
  const cleanName = (name || '').trim().slice(0, 16);

  // Wer nicht angemeldet ist oder 'Gast' heißt, darf keinen Highscore einreichen!
  const user = getLoggedInUser();
  if (!user || !cleanName || cleanName.toLowerCase() === 'gast' || cleanName.toLowerCase() === 'anonym') {
    return { error: 'Nur angemeldete Spieler können Scores in die Rangliste eintragen.' };
  }

  if (score < 0 || score > maxScore) {
    return { error: 'Ungültiger Score oder Name' };
  }

  // Clicker passt sich immer an; Snake/Press/Slots/Blackjack nur bei neuem Rekord (außer forceUpdate ist explizit true)
  const alwaysAdapt = options.forceUpdate !== undefined ? options.forceUpdate : (game === 'clicker');
  const localEntry = saveLocalScore(cleanName, game, score, alwaysAdapt);

  if (!isSupabaseConfigured() || !supabase) {
    return { data: localEntry };
  }

  try {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), 3500);

    // Prüfe vorher ob bereits ein höherer Score in DB existiert wenn !alwaysAdapt
    if (!alwaysAdapt) {
      const { data: curDb } = await supabase
        .from('scores')
        .select('score')
        .ilike('name', cleanName)
        .eq('game', game)
        .maybeSingle();

      if (curDb && curDb.score >= score) {
        clearTimeout(timer);
        return { data: curDb };
      }
    }

    // UPSERT: Auf (name, game) aktuellen Score sofort aktualisieren
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
    window.dispatchEvent(new CustomEvent('arcade-scores-updated', { detail: { game, name: cleanName, score } }));
    return { data };
  } catch (e) {
    console.warn('Online-Eintrag fehlgeschlagen, Score lokal gesichert:', e?.message);
    return { data: localEntry };
  }
}

// Admin: Einzelnen Score für einen Spieler gezielt setzen
export async function adminSetPlayerScore(name, game, newScore) {
  const cleanName = (name || '').trim().slice(0, 16);
  const scoreVal = Math.max(0, parseInt(newScore, 10) || 0);

  saveLocalScore(cleanName, game, scoreVal, true);

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error: upsertErr } = await supabase
        .from('scores')
        .upsert(
          [{ name: cleanName, game, score: scoreVal }],
          { onConflict: 'name,game' }
        );
      if (upsertErr) {
        const { data: existing } = await supabase
          .from('scores')
          .select('id')
          .ilike('name', cleanName)
          .eq('game', game)
          .maybeSingle();
        if (existing?.id) {
          await supabase.from('scores').update({ score: scoreVal }).eq('id', existing.id);
        } else {
          await supabase.from('scores').insert([{ name: cleanName, game, score: scoreVal }]);
        }
      }
    } catch (err) {
      console.warn('Admin score update error:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('arcade-scores-updated', { detail: { game, name: cleanName, score: scoreVal } }));
  return { success: true };
}

// Alle Scores eines einzelnen Spielers laden
export async function getPlayerScores(name) {
  const cleanName = (name || '').trim();
  const res = { snake: 0, press: 0, clicker: 0, slots: 0, blackjack: 0 };
  const localList = getStoredLocalScores().filter(s => s.name.toLowerCase() === cleanName.toLowerCase());
  localList.forEach(s => { if (s.game && res[s.game] !== undefined) res[s.game] = s.score; });

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('scores')
        .select('game, score')
        .ilike('name', cleanName);
      if (data) {
        data.forEach(s => {
          if (s.game && res[s.game] !== undefined) res[s.game] = s.score;
        });
      }
    } catch {}
  }
  return res;
}

// Admin: Scores bei Umbenennung eines Spielers migrieren
export async function adminRenamePlayerScores(oldName, newName) {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();
  if (!cleanOld || !cleanNew || cleanOld.toLowerCase() === cleanNew.toLowerCase()) return;

  const list = getStoredLocalScores().map(s => {
    if (s.name.toLowerCase() === cleanOld.toLowerCase()) {
      return { ...s, name: cleanNew };
    }
    return s;
  });
  try { localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(list)); } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('scores')
        .update({ name: cleanNew })
        .ilike('name', cleanOld);
    } catch {}
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

