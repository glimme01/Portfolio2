import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  InventoryItem,
  InventoryEffect,
  ThemeConfig,
} from "./types";
import { COOKIE_TO_EURO_RATE, DEFAULT_THEME } from "./types";
import { SHOP_ITEMS } from "../data/shopItems";
import { formatEuro } from "../utils/storage";

export interface GameBridge {
  getCookies: () => number;
  addCookies: (amount: number) => void;
  spendCookies: (amount: number) => boolean;
  getCps: () => number;
  getCpc: () => number;
  playerName: string;
  showNotification: (msg: string) => void;
  onPersist: () => void;
  setActiveSkinExternal?: (skin: string) => void;
  setCookieSkinEmoji?: (emoji: string) => void;
  triggerCookieStorm?: (durationMs: number) => void;
  setNextClickMult?: (mult: number) => void;
  setGoldenMagnet?: (active: boolean) => void;
  addPermanentCpsBonus?: (percent: number) => void;
  grantExtraSpin?: () => void;
}

export interface V12PersistedSlice {
  cash: number;
  activeSkin: string;
  inventory: InventoryItem[];
  lastSpinTimestamp: number;
  themeConfig: ThemeConfig;
  permanentCpsBonus: number;
}

export interface GameStatsContextValue {
  cookies: number;
  cash: number;
  cps: number;
  cpc: number;
  activeSkin: string;
  inventory: InventoryItem[];
  lastSpinTimestamp: number;
  themeConfig: ThemeConfig;
  isRageActive: boolean;
  isPanicActive: boolean;
  mode420: boolean;
  mode161: boolean;
  inventoryCpsMult: number;
  hasGambleShield: boolean;
  permanentCpsBonus: number;
}

export interface GameActionsContextValue {
  exchangeCookies: (amount: number) => boolean;
  buyShopItem: (shopItemId: string) => boolean;
  activateInventoryItem: (itemId: string) => boolean;
  setLastSpinTimestamp: (ts: number) => void;
  setThemeConfig: (config: ThemeConfig | ((prev: ThemeConfig) => ThemeConfig)) => void;
  setActiveSkin: (skin: string) => void;
  applyWheelReward: (reward: import("../data/wheelSegments").WheelReward) => boolean;
  consumeGambleShield: () => boolean;
  setIsPanicActive: (v: boolean | ((p: boolean) => boolean)) => void;
  setMode420: (v: boolean) => void;
  setMode161: (v: boolean) => void;
  loadV12Slice: (slice: Partial<V12PersistedSlice>) => void;
  getV12Slice: () => V12PersistedSlice;
  registerInventoryCpsMult: (mult: number, durationMs: number) => void;
  getInventoryCpsMult: () => number;
  setIsRageActive: (v: boolean) => void;
  isRageActiveRef: React.MutableRefObject<boolean>;
}

export const GameStatsContext = createContext<GameStatsContextValue | null>(null);
export const GameActionsContext = createContext<GameActionsContextValue | null>(null);

interface GameProviderProps {
  bridge: GameBridge;
  initialV12?: Partial<V12PersistedSlice>;
  children: ReactNode;
  displayCookies: number;
  displayTick: number;
}

export function GameProvider({
  bridge,
  initialV12,
  children,
  displayCookies,
  displayTick,
}: GameProviderProps) {
  const [cash, setCash] = useState(initialV12?.cash ?? 0);
  const [activeSkin, setActiveSkinState] = useState(initialV12?.activeSkin ?? "default");
  const [inventory, setInventory] = useState<InventoryItem[]>(initialV12?.inventory ?? []);
  const [lastSpinTimestamp, setLastSpinTimestampState] = useState(
    initialV12?.lastSpinTimestamp ?? 0
  );
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(
    initialV12?.themeConfig ?? { ...DEFAULT_THEME }
  );
  const [isRageActive, setIsRageActive] = useState(false);
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [mode420, setMode420] = useState(false);
  const [mode161, setMode161] = useState(false);
  const [inventoryCpsMult, setInventoryCpsMult] = useState(1);
  const [hasGambleShield, setHasGambleShield] = useState(false);
  const [permanentCpsBonus, setPermanentCpsBonus] = useState(initialV12?.permanentCpsBonus ?? 0);

  const isRageActiveRef = useRef(false);
  const inventoryEffectRef = useRef<InventoryEffect | null>(null);
  const gambleShieldRef = useRef(false);

  const registerInventoryCpsMult = useCallback((mult: number, durationMs: number) => {
    const expiresAt = Date.now() + durationMs;
    inventoryEffectRef.current = { cpsMult: mult, expiresAt };
    setInventoryCpsMult(mult);
    setTimeout(() => {
      if (inventoryEffectRef.current?.expiresAt === expiresAt) {
        inventoryEffectRef.current = null;
        setInventoryCpsMult(1);
      }
    }, durationMs);
  }, []);

  const getInventoryCpsMult = useCallback(() => {
    const eff = inventoryEffectRef.current;
    if (!eff || Date.now() > eff.expiresAt) {
      inventoryEffectRef.current = null;
      return 1;
    }
    return eff.cpsMult;
  }, []);

  const loadV12Slice = useCallback((slice: Partial<V12PersistedSlice>) => {
    if (slice.cash !== undefined) setCash(slice.cash);
    if (slice.activeSkin !== undefined) setActiveSkinState(slice.activeSkin);
    if (slice.inventory !== undefined) setInventory(slice.inventory);
    if (slice.lastSpinTimestamp !== undefined) setLastSpinTimestampState(slice.lastSpinTimestamp);
    if (slice.themeConfig !== undefined) setThemeConfigState(slice.themeConfig);
    if (slice.permanentCpsBonus !== undefined) setPermanentCpsBonus(slice.permanentCpsBonus);
  }, []);

  const getV12Slice = useCallback(
    (): V12PersistedSlice => ({
      cash,
      activeSkin,
      inventory,
      lastSpinTimestamp,
      themeConfig,
      permanentCpsBonus,
    }),
    [cash, activeSkin, inventory, lastSpinTimestamp, themeConfig, permanentCpsBonus]
  );

  const exchangeCookies = useCallback(
    (amount: number) => {
      if (amount <= 0) return false;
      if (bridge.getCookies() < amount) {
        bridge.showNotification("❌ Nicht genug Cookies!");
        return false;
      }
      const euros = amount / COOKIE_TO_EURO_RATE;
      if (!bridge.spendCookies(amount)) return false;
      setCash((c) => c + euros);
      bridge.showNotification(`💱 ${formatEuro(euros)} erhalten!`);
      bridge.onPersist();
      return true;
    },
    [bridge]
  );

  const buyShopItem = useCallback(
    (shopItemId: string) => {
      const item = SHOP_ITEMS.find((s) => s.id === shopItemId);
      if (!item) return false;
      if (cash < item.price) {
        bridge.showNotification("❌ Nicht genug Cash!");
        return false;
      }
      setCash((c) => c - item.price);
      setInventory((prev) => [
        ...prev,
        {
          id: `${shopItemId}_${Date.now()}`,
          shopItemId: item.id,
          name: item.name,
          emoji: item.emoji,
          acquiredAt: Date.now(),
          used: false,
        },
      ]);
      bridge.showNotification(`🛒 ${item.name} gekauft!`);
      bridge.onPersist();
      return true;
    },
    [cash, bridge]
  );

  const activateInventoryItem = useCallback(
    (itemId: string) => {
      const entry = inventory.find((i) => i.id === itemId && !i.used);
      if (!entry) return false;
      const shopDef = SHOP_ITEMS.find((s) => s.id === entry.shopItemId);
      if (!shopDef) return false;

      const { effect } = shopDef;

      if (effect.type === "cps_mult") {
        registerInventoryCpsMult(effect.value, effect.durationMs);
        bridge.showNotification(`💉 ${shopDef.name} aktiv! x${effect.value} CPS`);
      } else if (effect.type === "gamble_shield") {
        gambleShieldRef.current = true;
        setHasGambleShield(true);
        bridge.showNotification("🛡️ Keks-Schild aktiv!");
      } else if (effect.type === "instant_production") {
        const earned = bridge.getCps() * effect.hours * 3600;
        bridge.addCookies(earned);
        bridge.showNotification(`⏰ +${effect.hours}h Produktion! Mega!`);
      } else if (effect.type === "permanent_cps_bonus") {
        const percent = effect.percent;
        setPermanentCpsBonus((prev) => prev + percent);
        bridge.addPermanentCpsBonus?.(percent);
        bridge.showNotification(`💎 Permanenter +${percent}% CPS Bonus!`);
      } else if (effect.type === "extra_spin") {
        bridge.grantExtraSpin?.();
        bridge.showNotification("🎫 Extra Spin freigeschaltet!");
      } else if (effect.type === "golden_magnet") {
        bridge.setGoldenMagnet?.(true);
        bridge.showNotification(`🧲 Goldene Cookies 2x häufiger für ${effect.durationMs / 60000} Min!`);
        setTimeout(() => bridge.setGoldenMagnet?.(false), effect.durationMs);
      } else if (effect.type === "next_click_mult") {
        bridge.setNextClickMult?.(effect.value);
        bridge.showNotification(`💣 Nächster Klick x${effect.value}!`);
      } else if (effect.type === "cookie_storm") {
        bridge.triggerCookieStorm?.(effect.durationMs);
        bridge.showNotification("🌪️ Cookie Storm aktiviert!");
      }

      setInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, used: true } : i))
      );
      bridge.onPersist();
      return true;
    },
    [inventory, bridge, registerInventoryCpsMult]
  );

  const consumeGambleShield = useCallback(() => {
    if (!gambleShieldRef.current) return false;
    gambleShieldRef.current = false;
    setHasGambleShield(false);
    bridge.showNotification("🛡️ Keks-Schild hat dich gerettet!");
    return true;
  }, [bridge]);

  const applyWheelReward = useCallback(
    (reward: import("../data/wheelSegments").WheelReward) => {
      switch (reward.type) {
        case "cookies_mult": {
          const bonus = bridge.getCookies() * (reward.value - 1);
          if (bonus > 0) bridge.addCookies(bonus);
          bridge.showNotification(`🎡 +${reward.value}x Cookies!`);
          return true;
        }
        case "cash":
          setCash((c) => c + reward.value);
          bridge.showNotification(`🎡 +${formatEuro(reward.value)} gewonnen!`);
          bridge.onPersist();
          return true;
        case "skin":
          setActiveSkinState(reward.skinId);
          bridge.setActiveSkinExternal?.(reward.skinId);
          if (reward.skinId === "gold") bridge.setCookieSkinEmoji?.("🌟");
          if (reward.skinId === "cannabis") bridge.setCookieSkinEmoji?.("🌿");
          bridge.showNotification("🎡 Neuer Keks-Skin freigeschaltet!");
          bridge.onPersist();
          return true;
        case "loss": {
          const loss = bridge.getCookies() * reward.percent;
          if (consumeGambleShield()) return true;
          if (loss > 0 && bridge.spendCookies(loss)) {
            bridge.showNotification(`💀 -${Math.floor(reward.percent * 100)}% Cookies verloren!`);
          }
          bridge.onPersist();
          return true;
        }
        case "rage": {
          registerInventoryCpsMult(reward.mult, reward.durationMs);
          bridge.showNotification(`💥 x${reward.mult} RAGE MODE für ${reward.durationMs / 1000}s!`);
          return true;
        }
        case "cps_mult": {
          registerInventoryCpsMult(reward.value, reward.durationMs);
          bridge.showNotification(`⚡ x${reward.value} CPS für ${reward.durationMs / 1000}s!`);
          return true;
        }
        case "extra_spin": {
          bridge.grantExtraSpin?.();
          bridge.showNotification("🔄 Nochmal drehen! Extra Spin!");
          return true;
        }
        default:
          return false;
      }
    },
    [bridge, consumeGambleShield, registerInventoryCpsMult]
  );

  const setActiveSkin = useCallback(
    (skin: string) => {
      setActiveSkinState(skin);
      bridge.setActiveSkinExternal?.(skin);
      if (skin === "cannabis") bridge.setCookieSkinEmoji?.("🌿");
      else if (skin === "gold") bridge.setCookieSkinEmoji?.("🌟");
      else if (skin === "default") bridge.setCookieSkinEmoji?.("🍪");
      bridge.onPersist();
    },
    [bridge]
  );

  const statsValue = useMemo<GameStatsContextValue>(
    () => ({
      cookies: displayCookies,
      cash,
      cps: bridge.getCps() * getInventoryCpsMult(),
      cpc: bridge.getCpc(),
      activeSkin,
      inventory,
      lastSpinTimestamp,
      themeConfig,
      isRageActive,
      isPanicActive,
      mode420,
      mode161,
      inventoryCpsMult: getInventoryCpsMult(),
      hasGambleShield,
      permanentCpsBonus,
    }),
    [
      displayCookies,
      displayTick,
      cash,
      activeSkin,
      inventory,
      lastSpinTimestamp,
      themeConfig,
      isRageActive,
      isPanicActive,
      mode420,
      mode161,
      hasGambleShield,
      inventoryCpsMult,
      permanentCpsBonus,
      bridge,
      getInventoryCpsMult,
    ]
  );

  const actionsValue = useMemo<GameActionsContextValue>(
    () => ({
      exchangeCookies,
      buyShopItem,
      activateInventoryItem,
      setLastSpinTimestamp: (ts: number) => {
        setLastSpinTimestampState(ts);
        bridge.onPersist();
      },
      setThemeConfig: setThemeConfigState,
      setActiveSkin,
      applyWheelReward,
      consumeGambleShield,
      setIsPanicActive,
      setMode420,
      setMode161,
      loadV12Slice,
      getV12Slice,
      registerInventoryCpsMult,
      getInventoryCpsMult,
      setIsRageActive: (v: boolean) => {
        isRageActiveRef.current = v;
        setIsRageActive(v);
      },
      isRageActiveRef,
    }),
    [
      exchangeCookies,
      buyShopItem,
      activateInventoryItem,
      setActiveSkin,
      applyWheelReward,
      consumeGambleShield,
      loadV12Slice,
      getV12Slice,
      registerInventoryCpsMult,
      getInventoryCpsMult,
      bridge,
    ]
  );

  return (
    <GameStatsContext.Provider value={statsValue}>
      <GameActionsContext.Provider value={actionsValue}>{children}</GameActionsContext.Provider>
    </GameStatsContext.Provider>
  );
}
