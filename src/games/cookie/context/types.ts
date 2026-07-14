export interface Building {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cps: number;
  owned: number;
  desc: string;
}

export interface ClickUpgrade {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cpcAdd: number;
  owned: number;
  maxOwned?: number;
}

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  unlocked: boolean;
  hidden?: boolean;
}

export interface ThemeConfig {
  accentColor: string;
  panelBg: string;
  textColor: string;
  customBgBase64?: string;
  customBgId?: string;
}

export interface InventoryItem {
  id: string;
  shopItemId: string;
  name: string;
  emoji: string;
  acquiredAt: number;
  used: boolean;
}

export interface GameStateV2 {
  cookies: number;
  totalCookies: number;
  totalClicks: number;
  buildings: Building[];
  clickUpgrades: ClickUpgrade[];
  achievements: Achievement[];
  prestigeLevel: number;
  heavenlyChips: number;
  lastSaveTime: number;
  startTime: number;
  goldenClicked: number;
  easterEggsFound: string[];
  cookieSkin: string;
  pirateMode: boolean;
  duckMode: boolean;
  grandmapocalypse: boolean;
  playerName: string;
  lastRenamed: number;
  leaderboardOptIn?: boolean;
  lastCaptchaTime?: number;
  cookiesBakedAllTime?: number;
}

export interface GameStateV3 extends GameStateV2 {
  saveVersion: 3;
  cash: number;
  activeSkin: string;
  inventory: InventoryItem[];
  lastSpinTimestamp: number;
  themeConfig: ThemeConfig;
}

export type PersistedGameState = GameStateV3;

export interface InventoryEffect {
  cpsMult: number;
  expiresAt: number;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  type: "user" | "system";
  timestamp: number;
  isFlex?: boolean;
}

export type ActiveTab =
  | "buildings"
  | "clicks"
  | "pocket"
  | "casino"
  | "achievements"
  | "stats"
  | "leaderboard"
  | "admin";

export const DEFAULT_THEME: ThemeConfig = {
  accentColor: "#FFA586",
  panelBg: "#141416",
  textColor: "#f0ebe3",
};

export const COOKIE_TO_EURO_RATE = 1_000_000;
