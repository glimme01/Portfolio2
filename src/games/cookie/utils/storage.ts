import type { GameStateV2, GameStateV3, PersistedGameState, ThemeConfig } from "../context/types";
import { DEFAULT_THEME } from "../context/types";

const SAVE_V2_KEY = "cc_save_v2";
const SAVE_V3_KEY = "cc_save_v3";

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* silently fail */
  }
}

export function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* silently fail */
  }
}

function migrateV2ToV3(state: GameStateV2): GameStateV3 {
  return {
    ...state,
    saveVersion: 3,
    cash: 0,
    activeSkin: "default",
    inventory: [],
    lastSpinTimestamp: 0,
    themeConfig: { ...DEFAULT_THEME },
  };
}

function ensureV3Fields(state: Partial<GameStateV3> & GameStateV2): GameStateV3 {
  return {
    ...state,
    saveVersion: 3,
    cash: state.cash ?? 0,
    activeSkin: state.activeSkin ?? "default",
    inventory: state.inventory ?? [],
    lastSpinTimestamp: state.lastSpinTimestamp ?? 0,
    themeConfig: state.themeConfig ?? { ...DEFAULT_THEME },
  };
}

export function loadGameState(): GameStateV3 | null {
  const v3Raw = lsGet(SAVE_V3_KEY);
  if (v3Raw) {
    try {
      const parsed = JSON.parse(v3Raw) as Partial<GameStateV3> & GameStateV2;
      return ensureV3Fields(parsed);
    } catch {
      /* fall through */
    }
  }

  const v2Raw = lsGet(SAVE_V2_KEY);
  if (v2Raw) {
    try {
      const parsed = JSON.parse(v2Raw) as GameStateV2;
      const migrated = migrateV2ToV3(parsed);
      saveGameState(migrated);
      return migrated;
    } catch {
      return null;
    }
  }

  return null;
}

export function saveGameState(state: PersistedGameState): void {
  const payload = ensureV3Fields(state);
  lsSet(SAVE_V3_KEY, JSON.stringify(payload));
}

export function stripForCloud(state: PersistedGameState): PersistedGameState {
  return ensureV3Fields(state);
}

export function mergeLoadedState(
  incoming: Partial<PersistedGameState> & GameStateV2
): GameStateV3 {
  return ensureV3Fields(incoming as GameStateV3);
}

export function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(n: number): string {
  if (!isFinite(n)) return "∞";
  const units = [
    { val: 1e66, suf: "UnVig" },
    { val: 1e63, suf: "Vig" },
    { val: 1e60, suf: "NoD" },
    { val: 1e57, suf: "OcD" },
    { val: 1e54, suf: "SpD" },
    { val: 1e51, suf: "SxD" },
    { val: 1e48, suf: "QiD" },
    { val: 1e45, suf: "QaD" },
    { val: 1e42, suf: "TrD" },
    { val: 1e39, suf: "DuD" },
    { val: 1e36, suf: "UnD" },
    { val: 1e33, suf: "Dec" },
    { val: 1e30, suf: "Non" },
    { val: 1e27, suf: "Oct" },
    { val: 1e24, suf: "Sep" },
    { val: 1e21, suf: "Sxt" },
    { val: 1e18, suf: "Qi" },
    { val: 1e15, suf: "Qa" },
    { val: 1e12, suf: "T" },
    { val: 1e9, suf: "B" },
    { val: 1e6, suf: "M" },
    { val: 1e3, suf: "K" },
  ];
  for (const u of units) {
    if (n >= u.val) return `${(n / u.val).toFixed(1)}${u.suf}`;
  }
  return Math.floor(n).toLocaleString("de-DE");
}
