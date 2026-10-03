// Arcade Auth-System: Lokale & Cloud-Konten mit Passwort-Hashing (SHA-256)
// Unterstützt: Admin-Rolle, Cloud-Sync & Single-Device-Lock (nur 1 Gerät gleichzeitig pro Account)

import { setLastName } from './prefs.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

const ACCOUNTS_KEY = 'arcade_accounts_v2';
const SESSION_KEY = 'arcade_current_user_v2';
const ADMIN_SECRET_CODE = 'moritzarcade2026';

// SHA-256 Hash Funktion via Web Crypto API
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSessionToken() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export function getStoredAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

const authListeners = new Set();
export function onAuthChange(cb) {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

function notifyAuthChange(user) {
  authListeners.forEach(cb => {
    try { cb(user); } catch {}
  });
}

// Session-Konflikt (wenn anderes Gerät eingeloggt ist)
const conflictListeners = new Set();
export function onSessionConflict(cb) {
  conflictListeners.add(cb);
  return () => conflictListeners.delete(cb);
}

export function triggerSessionConflict(reason = 'Auf einem anderen Gerät angemeldet') {
  conflictListeners.forEach(cb => {
    try { cb(reason); } catch {}
  });
  logout();
}

// BroadcastChannel für Multi-Tab/Gerät-Sync auf demselben System
const CLIENT_ID = typeof window !== 'undefined' ? ('client_' + Math.random().toString(36).slice(2)) : 'srv';
let syncChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  syncChannel = new BroadcastChannel('arcade_device_sync');
  syncChannel.onmessage = (evt) => {
    const msg = evt?.data;
    if (!msg || msg.clientId === CLIENT_ID) return;
    const cur = getCurrentUser();
    if (!cur) return;
    if (msg.type === 'DEVICE_LOGIN' && msg.username.toLowerCase() === cur.username.toLowerCase()) {
      if (msg.sessionToken !== cur.sessionToken) {
        triggerSessionConflict('Ein anderes Gerät oder Browser-Fenster hat sich mit diesem Account angemeldet.');
      }
    }
  };
}

// Aktueller Benutzer
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.isAdmin);
}

// Cloud Heartbeat: Prüft alle 6 Sekunden ob in Supabase ein anderer SessionToken aktiv ist
let heartbeatTimer = null;
function startHeartbeat(username, sessionToken) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (!isSupabaseConfigured() || !supabase) return;

  heartbeatTimer = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('active_session_token')
        .eq('username', username)
        .maybeSingle();

      if (!error && data && data.active_session_token && data.active_session_token !== sessionToken) {
        clearInterval(heartbeatTimer);
        triggerSessionConflict('Dieses Konto wird gerade auf einem anderen Gerät verwendet.');
      }
    } catch {}
  }, 6000);
}

// Registrierung
export async function register(username, password, adminKey = '') {
  const clean = username.trim().slice(0, 16);
  if (!clean || clean.length < 2) {
    return { error: 'Username muss mindestens 2 Zeichen lang sein.' };
  }
  if (!password || password.length < 4) {
    return { error: 'Passwort muss mindestens 4 Zeichen lang sein.' };
  }

  const accounts = getStoredAccounts();
  const exists = accounts.some(a => a.username.toLowerCase() === clean.toLowerCase());
  if (exists) {
    return { error: 'Dieser Benutzername ist bereits vergeben.' };
  }

  const passHash = await hashPassword(password);
  const sessionToken = generateSessionToken();

  // Admin-Rolle vergeben: Wenn "admin" oder "moritz" oder richtiger Admin-Key
  const isAdmin = clean.toLowerCase() === 'admin' ||
                  clean.toLowerCase() === 'moritz' ||
                  adminKey.trim() === ADMIN_SECRET_CODE;

  const newUser = {
    username: clean,
    passHash,
    isAdmin,
    createdAt: new Date().toISOString(),
    sessionToken,
  };

  accounts.push(newUser);
  saveAccounts(accounts);

  // Cloud Sync mit Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('profiles').upsert({
        username: clean,
        pass_hash: passHash,
        is_admin: isAdmin,
        active_session_token: sessionToken,
        last_heartbeat: new Date().toISOString(),
      }, { onConflict: 'username' });
    } catch (err) {
      console.warn('Profile Supabase sync error:', err);
    }
  }

  const sessionUser = {
    username: clean,
    createdAt: newUser.createdAt,
    isAdmin,
    sessionToken,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  setLastName(clean);

  if (syncChannel) {
    syncChannel.postMessage({ type: 'DEVICE_LOGIN', username: clean, sessionToken, clientId: CLIENT_ID });
  }
  startHeartbeat(clean, sessionToken);

  notifyAuthChange(sessionUser);
  return { user: sessionUser };
}

// Login
export async function login(username, password) {
  const clean = username.trim();
  if (!clean || !password) {
    return { error: 'Bitte Benutzername und Passwort eingeben.' };
  }

  const accounts = getStoredAccounts();
  let user = accounts.find(a => a.username.toLowerCase() === clean.toLowerCase());

  // Falls lokal nicht gefunden, in Supabase nachsehen
  if (!user && isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', clean)
        .maybeSingle();
      if (data) {
        user = {
          username: data.username,
          passHash: data.pass_hash,
          isAdmin: data.is_admin,
          createdAt: data.created_at,
        };
        accounts.push(user);
        saveAccounts(accounts);
      }
    } catch {}
  }

  if (!user) {
    return { error: 'Benutzer existiert nicht.' };
  }

  const passHash = await hashPassword(password);
  if (user.passHash !== passHash) {
    return { error: 'Falsches Passwort.' };
  }

  const sessionToken = generateSessionToken();
  const isAdmin = Boolean(
    user.isAdmin ||
    clean.toLowerCase() === 'admin' ||
    clean.toLowerCase() === 'moritz'
  );

  user.sessionToken = sessionToken;
  user.isAdmin = isAdmin;
  saveAccounts(accounts);

  // In Supabase registrieren, dass DIESES Gerät jetzt aktiv ist
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('profiles').update({
        active_session_token: sessionToken,
        last_heartbeat: new Date().toISOString(),
      }).eq('username', clean);
    } catch {}
  }

  const sessionUser = {
    username: user.username,
    createdAt: user.createdAt,
    isAdmin,
    sessionToken,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  setLastName(user.username);

  // Broadcast an andere Tabs/Geräte auf dem Rechner
  if (syncChannel) {
    syncChannel.postMessage({ type: 'DEVICE_LOGIN', username: clean, sessionToken, clientId: CLIENT_ID });
  }
  startHeartbeat(clean, sessionToken);

  notifyAuthChange(sessionUser);
  return { user: sessionUser };
}

// Logout
export function logout() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange(null);
}

// Admin Tools: Alle Konten auflisten
export async function getAllAccounts() {
  const local = getStoredAccounts();
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, is_admin, created_at, last_heartbeat')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const map = new Map();
        local.forEach(u => map.set(u.username.toLowerCase(), u));
        data.forEach(p => {
          map.set(p.username.toLowerCase(), {
            username: p.username,
            isAdmin: p.is_admin,
            createdAt: p.created_at,
            lastHeartbeat: p.last_heartbeat,
          });
        });
        return Array.from(map.values());
      }
    } catch {}
  }
  return local;
}

// Admin Tools: Konto löschen
export function deleteAccount(username) {
  let list = getStoredAccounts();
  list = list.filter(a => a.username.toLowerCase() !== username.toLowerCase());
  saveAccounts(list);
  if (isSupabaseConfigured() && supabase) {
    supabase.from('profiles').delete().eq('username', username).then(() => {});
  }
}
