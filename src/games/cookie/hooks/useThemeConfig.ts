import { useEffect } from "react";
import type { ThemeConfig } from "../context/types";
import { loadBackground } from "../utils/indexedDb";

export function useThemeConfig(themeConfig: ThemeConfig, rootClass = "cookie-clicker-root") {
  useEffect(() => {
    const root = document.querySelector(`.${rootClass}`) as HTMLElement | null;
    const el = root ?? document.documentElement;
    el.style.setProperty("--cc-accent", themeConfig.accentColor);
    el.style.setProperty("--cc-panel-bg", themeConfig.panelBg);
    el.style.setProperty("--cc-text", themeConfig.textColor);
  }, [themeConfig, rootClass]);

  useEffect(() => {
    const root = document.querySelector(`.${rootClass}`) as HTMLElement | null;
    if (!root) return;

    let cancelled = false;

    async function applyBg() {
      if (themeConfig.customBgBase64) {
        if (!cancelled) {
          root!.style.backgroundImage = `url(${themeConfig.customBgBase64})`;
          root!.style.backgroundSize = "cover";
          root!.style.backgroundPosition = "center";
        }
        return;
      }
      if (themeConfig.customBgId) {
        const data = await loadBackground(themeConfig.customBgId);
        if (!cancelled && data) {
          root!.style.backgroundImage = `url(${data})`;
          root!.style.backgroundSize = "cover";
          root!.style.backgroundPosition = "center";
        }
        return;
      }
      if (!cancelled) {
        root!.style.backgroundImage = "";
      }
    }

    applyBg();
    return () => {
      cancelled = true;
    };
  }, [themeConfig.customBgBase64, themeConfig.customBgId, rootClass]);
}
