export type ShopEffect =
  | { type: "cps_mult"; value: number; durationMs: number }
  | { type: "gamble_shield"; charges: number }
  | { type: "instant_production"; hours: number }
  | { type: "permanent_cps_bonus"; percent: number }
  | { type: "extra_spin" }
  | { type: "golden_magnet"; durationMs: number }
  | { type: "next_click_mult"; value: number }
  | { type: "cookie_storm"; durationMs: number };

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  desc: string;
  effect: ShopEffect;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "caffeine_syringe",
    name: "Koffein-Spritze",
    emoji: "💉",
    price: 5.0,
    desc: "x3 CPS für 30 Sekunden",
    effect: { type: "cps_mult", value: 3, durationMs: 30_000 },
  },
  {
    id: "cookie_shield",
    name: "Keks-Schild",
    emoji: "🛡️",
    price: 12.0,
    desc: "Schützt vor einem Glücksspiel-Verlust",
    effect: { type: "gamble_shield", charges: 1 },
  },
  {
    id: "turbo_booster",
    name: "Turbo-Booster",
    emoji: "🚀",
    price: 25.0,
    desc: "x10 CPS für 10 Sekunden",
    effect: { type: "cps_mult", value: 10, durationMs: 10_000 },
  },
  {
    id: "time_machine",
    name: "Zeitmaschine",
    emoji: "⏰",
    price: 50.0,
    desc: "1 Stunde Offline-Produktion sofort",
    effect: { type: "instant_production", hours: 1 },
  },
  {
    id: "diamond_cookie",
    name: "Diamant-Cookie",
    emoji: "💎",
    price: 100.0,
    desc: "Permanenter +5% CPS Bonus",
    effect: { type: "permanent_cps_bonus", percent: 5 },
  },
  {
    id: "golden_ticket",
    name: "Golden Ticket",
    emoji: "🎫",
    price: 8.0,
    desc: "Ein extra Glücksrad-Spin",
    effect: { type: "extra_spin" },
  },
  {
    id: "cookie_magnet",
    name: "Keks-Magnet",
    emoji: "🧲",
    price: 30.0,
    desc: "Goldene Cookies 2x häufiger für 5 Min",
    effect: { type: "golden_magnet", durationMs: 300_000 },
  },
  {
    id: "cookie_bomb",
    name: "Cookie-Bombe",
    emoji: "💣",
    price: 15.0,
    desc: "x50 für deinen nächsten Klick",
    effect: { type: "next_click_mult", value: 50 },
  },
  {
    id: "mini_storm",
    name: "Mini-Sturm",
    emoji: "🌪️",
    price: 20.0,
    desc: "Cookie Storm für 8 Sekunden",
    effect: { type: "cookie_storm", durationMs: 8_000 },
  },
];
