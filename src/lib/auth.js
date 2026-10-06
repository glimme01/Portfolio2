// Arcade Auth-System: Lokale & Cloud-Konten mit Passwort-Hashing (SHA-256)
// Unterstützt: Admin-Rolle, Cloud-Sync & Single-Device-Lock (nur 1 Gerät gleichzeitig pro Account)

import { setLastName, getLastName } from './prefs.js';
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

export function getLoggedInUser() {
  const user = getCurrentUser();
  return user && user.username ? user.username.trim() : null;
}


export function getActivePlayerName() {
  const user = getCurrentUser();
  if (user && user.username) return user.username.trim();
  const ln = getLastName();
  if (ln && ln.trim()) return ln.trim();
  return 'Gast';
}

export function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return Boolean(user && user.isAdmin);
}

// Lokale Banned-Liste (Fallback wenn Cloud-Schema keine is_banned Spalte hat)
export function getBannedUsers() {
  try {
    const raw = localStorage.getItem('arcade_banned_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setBannedUser(username, banned) {
  try {
    let list = getBannedUsers();
    const clean = username.trim().toLowerCase();
    if (banned) {
      if (!list.includes(clean)) list.push(clean);
    } else {
      list = list.filter(u => u !== clean);
    }
    localStorage.setItem('arcade_banned_users', JSON.stringify(list));
  } catch {}
}

// Cloud Heartbeat: Prüft alle 6 Sekunden ob in Supabase ein anderer SessionToken aktiv ist
let heartbeatTimer = null;
function startHeartbeat(username, sessionToken) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (!isSupabaseConfigured() || !supabase) return;

  heartbeatTimer = setInterval(async () => {
    try {
      const bannedList = getBannedUsers();
      if (bannedList.includes(username.trim().toLowerCase())) {
        clearInterval(heartbeatTimer);
        triggerSessionConflict('Dieses Konto wurde von der Administration gesperrt.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('active_session_token')
        .ilike('username', username)
        .maybeSingle();

      if (!error && data) {
        if (data.active_session_token && data.active_session_token !== sessionToken) {
          clearInterval(heartbeatTimer);
          triggerSessionConflict('Dieses Konto wird gerade auf einem anderen Gerät verwendet.');
        }
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

  // Vorher prüfen ob in Supabase bereits vergeben
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', clean)
        .maybeSingle();
      if (data) {
        return { error: 'Dieser Benutzername ist bereits vergeben.' };
      }
    } catch {}
  }

  const passHash = await hashPassword(password);
  const sessionToken = generateSessionToken();

  // Admin-Rolle vergeben: Nur mit dem geheimen Admin-Key
  const isAdmin = adminKey.trim() === ADMIN_SECRET_CODE;

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

  // In Supabase nachsehen (Groß-/Kleinschreibung ignorieren mit ilike)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', clean)
        .maybeSingle();
      if (data) {
        if (!user) {
          user = {
            username: data.username,
            passHash: data.pass_hash,
            isAdmin: Boolean(data.is_admin),
            createdAt: data.created_at,
          };
          accounts.push(user);
        } else {
          user.isAdmin = Boolean(data.is_admin);
          user.isBanned = Boolean(getBannedUsers().includes(clean.toLowerCase()));
          user.passHash = data.pass_hash;
        }
        saveAccounts(accounts);
      }
    } catch {}
  }

  if (!user) {
    return { error: 'Benutzer existiert nicht.' };
  }

  if (user.isBanned) {
    return { error: 'Dieses Konto wurde von der Administration gesperrt.' };
  }

  const passHash = await hashPassword(password);
  if (user.passHash !== passHash) {
    return { error: 'Falsches Passwort.' };
  }

  const sessionToken = generateSessionToken();
  const isAdmin = Boolean(user.isAdmin);

  user.sessionToken = sessionToken;
  user.isAdmin = isAdmin;
  saveAccounts(accounts);

  // In Supabase registrieren, dass DIESES Gerät jetzt aktiv ist
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('profiles').update({
        active_session_token: sessionToken,
        last_heartbeat: new Date().toISOString(),
      }).ilike('username', clean);
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

  // Cloud Spielstand des angemeldeten Benutzers sofort in den lokalen Browser synchronisieren
  try {
    const { data: cloudSave } = await loadGameState(user.username, 'clicker');
    if (cloudSave?.state) {
      window.dispatchEvent(new CustomEvent('arcade-cookies-synced', {
        detail: {
          cookies: cloudSave.state.cookies,
          gems: cloudSave.state.gems,
          state: cloudSave.state,
          playerName: normalizePlayerName(user.username),
          lastSaved: Date.now(),
        }
      }));
    }
  } catch (err) {
    console.warn('Fehler beim Laden des Cloud-Spielstands beim Login:', err);
  }

  // Broadcast an andere Tabs/Geräte auf dem Rechner
  if (syncChannel) {
    syncChannel.postMessage({ type: 'DEVICE_LOGIN', username: clean, sessionToken, clientId: CLIENT_ID });
  }
  startHeartbeat(clean, sessionToken);

  window.dispatchEvent(new CustomEvent('arcade-user-logged-in', { detail: { user: sessionUser } }));
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

import { loadGameState, saveGameState, deleteGameState, normalizePlayerName } from './save.js';
import { insertScore, deleteScore, getPlayerScores, adminSetPlayerScore, adminRenamePlayerScores } from './scores.js';

// Admin Tools: Alle Konten auflisten inkl. Spielstände, Gebäude & Highscores
export async function getAllAccounts() {
  const local = getStoredAccounts();
  const bannedList = getBannedUsers();
  const map = new Map();

  // 1. Lokale Accounts erfassen
  local.forEach(u => {
    map.set(u.username.toLowerCase(), {
      ...u,
      isBanned: Boolean(u.isBanned || bannedList.includes(u.username.toLowerCase())),
    });
  });

  // 2. Supabase Profiles abrufen (nur Spalten, die in der DB existieren)
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_admin, created_at, last_heartbeat')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach(p => {
          const key = p.username.toLowerCase();
          const existing = map.get(key) || {};
          map.set(key, {
            ...existing,
            username: p.username,
            isAdmin: Boolean(p.is_admin),
            isBanned: Boolean(existing.isBanned || bannedList.includes(key)),
            createdAt: p.created_at || existing.createdAt || new Date().toISOString(),
            lastHeartbeat: p.last_heartbeat || existing.lastHeartbeat,
          });
        });
      }
    } catch (err) {
      console.warn('Profiles fetch error:', err);
    }

    // 3. Auch alle registrierten Spieler aus scores erfassen (außer 'Gast')
    try {
      const { data: scorePlayers } = await supabase
        .from('scores')
        .select('name');
      if (scorePlayers && scorePlayers.length > 0) {
        scorePlayers.forEach(sp => {
          if (!sp.name || sp.name.trim().toLowerCase() === 'gast') return;
          const key = sp.name.trim().toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              username: sp.name.trim(),
              isAdmin: false,
              isBanned: Boolean(bannedList.includes(key)),
              createdAt: new Date().toISOString(),
            });
          }
        });
      }
    } catch {}
  }

  const accountsList = Array.from(map.values());

  // Lade detaillierte Daten für jeden Spieler (Clicker-Guthaben, Gebäude, Highscores)
  const enriched = await Promise.all(
    accountsList.map(async (acc) => {
      try {
        const [clickerRes, scoresRes] = await Promise.all([
          loadGameState(acc.username, 'clicker'),
          getPlayerScores(acc.username),
        ]);
        const st = clickerRes?.data?.state;
        return {
          ...acc,
          cookies: Math.floor(st?.cookies ?? 0),
          totalCookies: Math.floor(st?.totalCookies ?? 0),
          gems: Math.floor(st?.gems ?? 10),
          buildings: st?.buildings || {},
          totalClicks: st?.totalClicks || 0,
          ascensionCount: st?.ascensionCount || 0,
          scores: scoresRes || { snake: 0, press: 0, clicker: 0, slots: 0, blackjack: 0 },
        };
      } catch {
        return {
          ...acc,
          cookies: 0,
          totalCookies: 0,
          gems: 10,
          buildings: {},
          totalClicks: 0,
          ascensionCount: 0,
          scores: { snake: 0, press: 0, clicker: 0, slots: 0, blackjack: 0 },
        };
      }
    })
  );

  return enriched;
}

// Admin Tools: Konto löschen
export function deleteAccount(username) {
  if (!isCurrentUserAdmin()) return { error: 'Nur Admins dürfen Konten löschen.' };
  let list = getStoredAccounts();
  list = list.filter(a => a.username.toLowerCase() !== username.toLowerCase());
  saveAccounts(list);
  if (isSupabaseConfigured() && supabase) {
    supabase.from('profiles').delete().eq('username', username).then(() => {});
  }
  return { success: true };
}

// Admin Tools: Neuen Spieler anlegen
export async function adminCreateAccount({
  username,
  password = 'password123',
  isAdmin = false,
  initialCookies = 1000,
  initialChips = 0,
  initialGems = 10,
}) {
  if (!isCurrentUserAdmin()) {
    return { error: 'Zugriff verweigert: Nur Administratoren dürfen Spieler anlegen.' };
  }

  const clean = username.trim().slice(0, 16);
  if (!clean || clean.length < 2) {
    return { error: 'Username muss mindestens 2 Zeichen lang sein.' };
  }
  if (!password || password.length < 3) {
    return { error: 'Passwort muss mindestens 3 Zeichen lang sein.' };
  }

  const accounts = getStoredAccounts();
  if (accounts.some(a => a.username.toLowerCase() === clean.toLowerCase())) {
    return { error: 'Dieser Benutzername ist bereits vergeben.' };
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', clean)
        .maybeSingle();
      if (data) return { error: 'Dieser Benutzername ist in der Datenbank bereits vergeben.' };
    } catch {}
  }

  const passHash = await hashPassword(password);
  const sessionToken = generateSessionToken();
  const createdAt = new Date().toISOString();

  const newUser = {
    username: clean,
    passHash,
    isAdmin: Boolean(isAdmin),
    isBanned: false,
    createdAt,
    sessionToken,
  };

  accounts.push(newUser);
  saveAccounts(accounts);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('profiles').upsert({
        username: clean,
        pass_hash: passHash,
        is_admin: Boolean(isAdmin),
        active_session_token: sessionToken,
        last_heartbeat: createdAt,
      }, { onConflict: 'username' });
    } catch (err) {
      console.warn('Admin profile creation sync error:', err);
    }
  }

  // Initialen Spielstand mit Guthaben anlegen
  const clickerState = {
    bakeryName: `${clean}s Imperium`,
    cookies: Number(initialCookies) || 0,
    totalCookies: Number(initialCookies) || 0,
    totalClicks: 0,
    goldenClicks: 0,
    eventsCaught: 0,
    buildings: {},
    upgrades: [],
    achievements: [],
    easterEggs: [],
    skin: 'moritz',
    stockShares: {},
    stockPrices: {},
    tradesDone: 0,
    gems: Number(initialGems) >= 0 ? Number(initialGems) : 10,
    ascensionCount: 0,
    wrinklers: [],
    lastSaved: Date.now(),
    startedAt: Date.now(),
    playTime: 0,
  };

  await saveGameState(clean, 'clicker', clickerState);
  if (initialCookies > 0) {
    await insertScore(clean, 'clicker', initialCookies, { forceUpdate: true });
  }

  return { success: true, user: newUser };
}

// Admin Tools: Spielerdaten, Währungen, Gebäude & Highscores einzeln editieren
export async function adminUpdateAccount(username, updates = {}) {
  if (!isCurrentUserAdmin()) {
    return { error: 'Zugriff verweigert: Nur Administratoren dürfen Spieler bearbeiten.' };
  }

  const norm = normalizePlayerName(username);
  let targetUsername = username;

  // 1. Umbenennung des Spielers (falls newUsername angegeben und anders ist)
  if (updates.newUsername && updates.newUsername.trim() && updates.newUsername.trim().toLowerCase() !== norm) {
    const cleanNew = updates.newUsername.trim().slice(0, 16);
    if (cleanNew.length < 2) return { error: 'Neuer Name muss mind. 2 Zeichen lang sein.' };

    const accounts = getStoredAccounts();
    if (accounts.some(a => a.username.toLowerCase() === cleanNew.toLowerCase())) {
      return { error: 'Dieser neue Benutzername ist bereits vergeben.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.from('profiles').select('username').ilike('username', cleanNew).maybeSingle();
        if (data) return { error: 'Dieser Name existiert bereits in der Datenbank.' };
      } catch {}
    }

    // In localStorage Konten umbenennen
    const accIdx = accounts.findIndex(a => a.username.toLowerCase() === norm);
    if (accIdx >= 0) {
      accounts[accIdx].username = cleanNew;
      saveAccounts(accounts);
    }

    // In Supabase umbenennen
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('profiles').update({ username: cleanNew }).ilike('username', norm);
      } catch {}
    }

    // Alle Spielstände migrieren
    for (const g of ['clicker', 'slots', 'blackjack', 'snake', 'press']) {
      const { data } = await loadGameState(username, g);
      if (data && data.state) {
        await saveGameState(cleanNew, g, data.state);
        await deleteGameState(username, g);
      }
    }

    // Scores migrieren
    await adminRenamePlayerScores(username, cleanNew);

    // Wenn der aktuelle Spieler umbenannt wurde
    const cur = getCurrentUser();
    if (cur && normalizePlayerName(cur.username) === norm) {
      cur.username = cleanNew;
      localStorage.setItem(SESSION_KEY, JSON.stringify(cur));
      setLastName(cleanNew);
      notifyAuthChange(cur);
    }

    targetUsername = cleanNew;
  }

  const currentTargetNorm = normalizePlayerName(targetUsername);
  const accounts = getStoredAccounts();
  const accIndex = accounts.findIndex(a => a.username.toLowerCase() === currentTargetNorm);

  let newPassHash = null;
  if (updates.newPassword && updates.newPassword.trim().length >= 3) {
    newPassHash = await hashPassword(updates.newPassword.trim());
  }

  if (updates.isBanned !== undefined) {
    setBannedUser(targetUsername, updates.isBanned);
  }

  if (accIndex >= 0) {
    if (updates.isAdmin !== undefined) accounts[accIndex].isAdmin = Boolean(updates.isAdmin);
    if (updates.isBanned !== undefined) accounts[accIndex].isBanned = Boolean(updates.isBanned);
    if (newPassHash) accounts[accIndex].passHash = newPassHash;
    saveAccounts(accounts);
  } else {
    accounts.push({
      username: targetUsername,
      isAdmin: Boolean(updates.isAdmin),
      isBanned: Boolean(updates.isBanned),
      passHash: newPassHash || '',
      createdAt: new Date().toISOString(),
    });
    saveAccounts(accounts);
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const dbUpdates = {};
      if (updates.isAdmin !== undefined) dbUpdates.is_admin = Boolean(updates.isAdmin);
      if (updates.isBanned) dbUpdates.active_session_token = null;
      if (newPassHash) dbUpdates.pass_hash = newPassHash;
      if (Object.keys(dbUpdates).length > 0) {
        const { error: pErr } = await supabase.from('profiles').update(dbUpdates).ilike('username', currentTargetNorm);
        if (pErr) console.warn('Supabase profile update warning:', pErr);
      }
    } catch (err) {
      console.warn('Profile Supabase update failed:', err);
    }
  }

  // Clicker Spielstand aktualisieren (Guthaben, Gebäude, Upgrades, Stats)
  const { data } = await loadGameState(targetUsername, 'clicker');
  let st = data?.state || {
    bakeryName: `${targetUsername}s Bäckerei`,
    cookies: 0,
    totalCookies: 0,
    buildings: {},
    upgrades: [],
    gems: 10,
  };

  if (updates.cookies !== undefined) {
    st.cookies = Math.max(0, Number(updates.cookies));
    st.totalCookies = Math.max(st.totalCookies || 0, st.cookies);
  }
  if (updates.totalCookies !== undefined) {
    st.totalCookies = Math.max(0, Number(updates.totalCookies));
  }
  if (updates.gems !== undefined) {
    st.gems = Math.max(0, Number(updates.gems));
  }
  if (updates.buildings && typeof updates.buildings === 'object') {
    st.buildings = { ...(st.buildings || {}), ...updates.buildings };
  }
  if (updates.ascensionCount !== undefined) {
    st.ascensionCount = Math.max(0, Number(updates.ascensionCount));
  }
  if (updates.totalClicks !== undefined) {
    st.totalClicks = Math.max(0, Number(updates.totalClicks));
  }
  st.lastSaved = Date.now();

  await saveGameState(targetUsername, 'clicker', st, { forceOverwrite: true });
  if (updates.cookies !== undefined) {
    await insertScore(targetUsername, 'clicker', st.cookies, { forceUpdate: true });
  }

  // Scores für einzelne Spiele anpassen (Snake, Press, Slots, Blackjack)
  if (updates.scores && typeof updates.scores === 'object') {
    for (const [game, sc] of Object.entries(updates.scores)) {
      if (sc !== undefined && sc !== null) {
        await adminSetPlayerScore(targetUsername, game, sc);
      }
    }
  }

  // Wenn der aktuell eingeloggte Spieler editiert wurde: Live Event feuern
  const cur = getCurrentUser();
  if (cur && normalizePlayerName(cur.username) === currentTargetNorm) {
    window.dispatchEvent(new CustomEvent('arcade-cookies-synced', {
      detail: {
        cookies: st.cookies,
        gems: st.gems,
        state: st,
        playerName: currentTargetNorm,
        lastSaved: Date.now(),
      }
    }));
  }

  return { success: true, username: targetUsername };
}

// Admin Tools: Schneller Guthaben-Zuschuss (+ / -)
export async function adminQuickAdjustBalance(username, { cookiesDelta = 0, gemsDelta = 0 }) {
  if (!isCurrentUserAdmin()) return { error: 'Zugriff verweigert: Nur Administratoren erlaubt.' };
  const { data } = await loadGameState(username, 'clicker');
  let st = data?.state || {
    bakeryName: `${username}s Bäckerei`,
    cookies: 0,
    totalCookies: 0,
    buildings: {},
    upgrades: [],
    gems: 10,
  };

  st.cookies = Math.max(0, Math.floor((st.cookies || 0) + (cookiesDelta || 0)));
  st.totalCookies = Math.max(st.totalCookies || 0, st.cookies);
  st.gems = Math.max(0, Math.floor((st.gems || 0) + (gemsDelta || 0)));
  st.lastSaved = Date.now();

  await saveGameState(username, 'clicker', st);
  await insertScore(username, 'clicker', st.cookies, { forceUpdate: true });

  const cur = getCurrentUser();
  if (cur && normalizePlayerName(cur.username) === normalizePlayerName(username)) {
    window.dispatchEvent(new CustomEvent('arcade-cookies-synced', {
      detail: {
        cookies: st.cookies,
        gems: st.gems,
        state: st,
        playerName: normalizePlayerName(username),
        lastSaved: Date.now(),
      }
    }));
  }

  return { success: true, cookies: st.cookies, gems: st.gems };
}

// Admin Tools: Fortschritt eines Spielers zurücksetzen
export async function adminResetPlayerProgress(username) {
  if (!isCurrentUserAdmin()) return { error: 'Zugriff verweigert: Nur Administratoren erlaubt.' };
  const norm = normalizePlayerName(username);
  await deleteGameState(norm, 'clicker');
  await deleteGameState(norm, 'slots');
  await deleteGameState(norm, 'blackjack');
  await deleteGameState(norm, 'snake');
  await deleteGameState(norm, 'press');

  // Neues Standard-Konto
  const fresh = {
    cookies: 250,
    totalCookies: 250,
    buildings: {},
    upgrades: [],
    gems: 10,
    heavenlyChips: 0,
    lastSaved: Date.now(),
  };
  await saveGameState(norm, 'clicker', fresh);
  await insertScore(norm, 'clicker', 250, { forceUpdate: true });

  const cur = getCurrentUser();
  if (cur && normalizePlayerName(cur.username) === norm) {
    window.dispatchEvent(new CustomEvent('arcade-cookies-synced', {
      detail: { cookies: 250, gems: 10, state: fresh, playerName: norm, lastSaved: Date.now() }
    }));
  }

  return { success: true };
}

// Admin Tools: Globalen Broadcast an alle Tabs & Spieler senden
export function adminBroadcastMessage(message) {
  if (!isCurrentUserAdmin()) return { error: 'Zugriff verweigert: Nur Administratoren erlaubt.' };
  const payload = {
    message: message.trim(),
    id: 'msg_' + Date.now(),
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem('arcade_global_broadcast', JSON.stringify(payload));
  } catch {}

  window.dispatchEvent(new CustomEvent('arcade-admin-broadcast', { detail: payload }));

  if (syncChannel) {
    syncChannel.postMessage({ type: 'ADMIN_BROADCAST', payload, clientId: CLIENT_ID });
  }

  return { success: true };
}
