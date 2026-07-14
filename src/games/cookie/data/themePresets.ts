import type { ThemeConfig } from "../context/types";

export interface ThemePreset {
  id: string;
  name: string;
  config: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Standard",
    config: { accentColor: "#FFA586", panelBg: "#141416", textColor: "#f0ebe3" },
  },
  {
    id: "stealth",
    name: "Stealth Mode",
    config: { accentColor: "#6b7280", panelBg: "#f3f4f6", textColor: "#374151" },
  },
  {
    id: "midnight",
    name: "Midnight",
    config: { accentColor: "#6366f1", panelBg: "#0f172a", textColor: "#e2e8f0" },
  },
  {
    id: "punk161",
    name: "161 Punk",
    config: { accentColor: "#ff00ff", panelBg: "#000000", textColor: "#ffffff" },
  },
];
