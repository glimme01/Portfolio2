export interface WheelSegment {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number;
  reward: WheelReward;
}

export type WheelReward =
  | { type: "cookies_mult"; value: number }
  | { type: "cash"; value: number }
  | { type: "skin"; skinId: string }
  | { type: "loss"; percent: number }
  | { type: "rage"; mult: number; durationMs: number }
  | { type: "cps_mult"; value: number; durationMs: number }
  | { type: "extra_spin" };

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "x2", label: "x2", emoji: "🍪", color: "#FFA586", weight: 18, reward: { type: "cookies_mult", value: 2 } },
  { id: "x5", label: "x5", emoji: "🔥", color: "#f97316", weight: 10, reward: { type: "cookies_mult", value: 5 } },
  { id: "cash1", label: "1€", emoji: "💶", color: "#22c55e", weight: 14, reward: { type: "cash", value: 1 } },
  { id: "cash5", label: "5€", emoji: "💰", color: "#16a34a", weight: 5, reward: { type: "cash", value: 5 } },
  { id: "gold", label: "Gold", emoji: "✨", color: "#eab308", weight: 7, reward: { type: "skin", skinId: "gold" } },
  { id: "loss10", label: "-10%", emoji: "💀", color: "#ef4444", weight: 13, reward: { type: "loss", percent: 0.1 } },
  { id: "x10", label: "x10", emoji: "⭐", color: "#a855f7", weight: 5, reward: { type: "cookies_mult", value: 10 } },
  { id: "luck", label: "Glück", emoji: "🍀", color: "#14b8a6", weight: 18, reward: { type: "cookies_mult", value: 1.5 } },
  { id: "cps3x", label: "3x CPS", emoji: "⚡", color: "#3b82f6", weight: 4, reward: { type: "cps_mult", value: 3, durationMs: 30_000 } },
  { id: "cannabis", label: "420", emoji: "🌿", color: "#10b981", weight: 3, reward: { type: "skin", skinId: "cannabis" } },
  { id: "respin", label: "Nochmal!", emoji: "🔄", color: "#8b5cf6", weight: 2, reward: { type: "extra_spin" } },
  { id: "x500", label: "x500!", emoji: "💥", color: "#fbbf24", weight: 0.1, reward: { type: "rage", mult: 500, durationMs: 3_000 } },
];

export const WHEEL_COOLDOWN_MS = 86_400_000;

export function pickWheelSegment(): { segment: WheelSegment; index: number } {
  const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i].weight;
    if (roll <= 0) return { segment: WHEEL_SEGMENTS[i], index: i };
  }
  return { segment: WHEEL_SEGMENTS[0], index: 0 };
}
