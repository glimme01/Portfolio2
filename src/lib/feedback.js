import { supabase, isSupabaseConfigured } from './supabase.js';
import { getCurrentUser, isCurrentUserAdmin } from './auth.js';

const LOCAL_FEEDBACK_KEY = 'arcade_feedback_v1';

function getStoredLocalFeedback() {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedbackList(list) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('arcade-feedback-updated'));
  } catch {}
}

/**
 * Submit feedback or bug report
 * @param {{ name?: string, type: 'bug'|'feedback'|'suggestion', game?: string, message: string }} payload
 */
export async function submitFeedback({ name = 'Anonym', type = 'feedback', game = 'general', message }) {
  const cur = getCurrentUser();
  if (cur && (cur.isBanned || cur.is_banned)) {
    throw new Error('Dein Account ist gesperrt. Du kannst kein Feedback einreichen.');
  }

  const cleanName = (name && name.trim()) ? name.trim().slice(0, 24) : 'Anonym';
  const cleanMsg = (message || '').trim().slice(0, 1000);
  const cleanType = ['bug', 'feedback', 'suggestion'].includes(type) ? type : 'feedback';
  const cleanGame = (game || 'general').trim().toLowerCase().slice(0, 30);

  if (cleanMsg.length < 3) {
    throw new Error('Bitte gib mindestens 3 Zeichen für deine Nachricht ein.');
  }

  const newEntry = {
    id: 'fb-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    name: cleanName,
    type: cleanType,
    game: cleanGame,
    message: cleanMsg,
    status: 'new', // 'new' | 'in_progress' | 'resolved'
    created_at: new Date().toISOString(),
  };

  // Try Supabase first if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), 4000);

      const { data, error } = await supabase
        .from('feedback')
        .insert([{
          name: cleanName,
          type: cleanType,
          game: cleanGame,
          message: cleanMsg,
          status: 'new',
        }])
        .select()
        .abortSignal(abortController.signal);

      clearTimeout(timer);

      if (!error && data && data.length > 0) {
        window.dispatchEvent(new CustomEvent('arcade-feedback-updated'));
        return { success: true, entry: data[0], offline: false };
      }
    } catch (err) {
      console.warn('Supabase feedback insert error, falling back to local storage:', err);
    }
  }

  // Fallback to localStorage
  const list = getStoredLocalFeedback();
  list.unshift(newEntry);
  saveLocalFeedbackList(list);

  return { success: true, entry: newEntry, offline: true };
}

/**
 * Get all feedback items for Admin Panel
 */
export async function getAllFeedback() {
  let supabaseItems = [];
  let fetchedFromSupabase = false;

  if (isSupabaseConfigured() && supabase) {
    try {
      const abortController = new AbortController();
      const timer = setTimeout(() => abortController.abort(), 4000);

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(abortController.signal);

      clearTimeout(timer);

      if (!error && data) {
        supabaseItems = data;
        fetchedFromSupabase = true;
      }
    } catch (err) {
      console.warn('Failed to fetch feedback from Supabase:', err);
    }
  }

  const localItems = getStoredLocalFeedback();

  if (fetchedFromSupabase) {
    // Also include any local-only items that might not have reached Supabase
    const supabaseIds = new Set(supabaseItems.map(item => String(item.id)));
    const uniqueLocal = localItems.filter(l => !supabaseIds.has(String(l.id)));
    return [...supabaseItems, ...uniqueLocal].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return localItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Update feedback status (e.g. 'new', 'in_progress', 'resolved')
 */
export async function updateFeedbackStatus(id, newStatus) {
  if (!isCurrentUserAdmin()) {
    console.warn('Unauthorized feedback status update attempt');
    return false;
  }
  if (!['new', 'in_progress', 'resolved'].includes(newStatus)) return false;

  let updated = false;

  if (isSupabaseConfigured() && supabase && !String(id).startsWith('fb-')) {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) updated = true;
    } catch (err) {
      console.warn('Error updating status in Supabase:', err);
    }
  }

  // Also update in localStorage
  const list = getStoredLocalFeedback();
  const idx = list.findIndex(item => String(item.id) === String(id));
  if (idx !== -1) {
    list[idx].status = newStatus;
    saveLocalFeedbackList(list);
    updated = true;
  }

  window.dispatchEvent(new CustomEvent('arcade-feedback-updated'));
  return updated;
}

/**
 * Delete feedback item
 */
export async function deleteFeedback(id) {
  if (!isCurrentUserAdmin()) {
    console.warn('Unauthorized feedback deletion attempt');
    return false;
  }
  let deleted = false;

  if (isSupabaseConfigured() && supabase && !String(id).startsWith('fb-')) {
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', id);

      if (!error) deleted = true;
    } catch (err) {
      console.warn('Error deleting feedback from Supabase:', err);
    }
  }

  const list = getStoredLocalFeedback();
  const nextList = list.filter(item => String(item.id) !== String(id));
  if (nextList.length !== list.length) {
    saveLocalFeedbackList(nextList);
    deleted = true;
  }

  window.dispatchEvent(new CustomEvent('arcade-feedback-updated'));
  return deleted;
}

/**
 * Get count of unread / new items
 */
export async function getUnreadFeedbackCount() {
  try {
    const list = await getAllFeedback();
    return list.filter(item => item.status === 'new').length;
  } catch {
    return 0;
  }
}
