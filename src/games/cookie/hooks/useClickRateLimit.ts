import { useRef, useCallback } from "react";

const MAX_CLICKS_PER_SEC = 35;
const BLOCK_DURATION_MS = 2000;

export function useClickRateLimit(onBlocked?: () => void) {
  const timestampsRef = useRef<number[]>([]);
  const blockedRef = useRef(false);

  const registerClick = useCallback((): boolean => {
    if (blockedRef.current) return false;

    const now = Date.now();
    timestampsRef.current = timestampsRef.current.filter((t) => now - t < 1000);

    if (timestampsRef.current.length >= MAX_CLICKS_PER_SEC) {
      if (!blockedRef.current) {
        blockedRef.current = true;
        onBlocked?.();
        setTimeout(() => {
          blockedRef.current = false;
          timestampsRef.current = [];
        }, BLOCK_DURATION_MS);
      }
      return false;
    }

    timestampsRef.current.push(now);
    return true;
  }, [onBlocked]);

  return { registerClick, isBlockedRef: blockedRef };
}
