import React, { useCallback, useRef, type MutableRefObject } from "react";
import { useClickRateLimit } from "./useClickRateLimit";

export interface ClickEngineConfig {
  cpc: number;
  activeSkin: string;
  duckMode: boolean;
  addCookies: (amount: number) => void;
  onClickRegistered: () => void;
  onRageTrigger: () => void;
  isRageActiveRef: MutableRefObject<boolean>;
  setIsRageActive: (v: boolean) => void;
  onParticle: (x: number, y: number, emoji: string) => void;
  onShake: () => void;
  onBlocked: () => void;
  showCaptcha: boolean;
}

export function useClickEngine(config: ClickEngineConfig) {
  const {
    cpc,
    activeSkin,
    duckMode,
    addCookies,
    onClickRegistered,
    onRageTrigger,
    isRageActiveRef,
    setIsRageActive,
    onParticle,
    onShake,
    onBlocked,
    showCaptcha,
  } = config;

  const clickTimesRef = useRef<number[]>([]);
  const { registerClick } = useClickRateLimit(onBlocked);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (showCaptcha) return;
      if (!registerClick()) return;

      if (Math.random() < 0.001) {
        isRageActiveRef.current = true;
        setIsRageActive(true);
        onRageTrigger();
        setTimeout(() => {
          isRageActiveRef.current = false;
          setIsRageActive(false);
        }, 3000);
      }

      const mult = isRageActiveRef.current ? 500 : 1;
      addCookies(cpc * mult);
      onClickRegistered();

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let emoji = "🍪";
      if (duckMode) emoji = "🦆";
      else if (activeSkin === "cannabis") emoji = "💨";
      else if (isRageActiveRef.current) emoji = "🔥";

      onParticle(x, y, emoji);
      onShake();

      const now = Date.now();
      clickTimesRef.current.push(now);
      clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < 5000);
    },
    [
      showCaptcha,
      registerClick,
      cpc,
      activeSkin,
      duckMode,
      addCookies,
      onClickRegistered,
      onRageTrigger,
      isRageActiveRef,
      setIsRageActive,
      onParticle,
      onShake,
    ]
  );

  return { handleClick };
}
