import { useEffect, useRef, useCallback } from "react";
import { useGameActions } from "./useGameActions";
import { THEME_PRESETS } from "../data/themePresets";

interface EasterEggHandlers {
  unlock: (id: string) => void;
  findEasterEgg: (id: string, msg: string) => void;
  setCookieSkin: (emoji: string) => void;
  setDuckMode: (v: boolean) => void;
  setPirateMode: (v: boolean | ((p: boolean) => boolean)) => void;
  addCookies: (n: number) => void;
  getSeasonalEmoji: () => string | null;
}

export function useEasterEggs(handlers: EasterEggHandlers) {
  const {
    setIsPanicActive,
    setMode420,
    setMode161,
    setActiveSkin,
    setThemeConfig,
  } = useGameActions();

  const konamiRef = useRef<string[]>([]);
  const secretWordRef = useRef("");
  const digitBufferRef = useRef("");

  const trigger420 = useCallback(() => {
    setMode420(true);
    handlers.findEasterEgg("mode_420", "420-Modus! 🌈");
    setTimeout(() => setMode420(false), 4 * 60 * 1000 + 20 * 1000);
  }, [handlers, setMode420]);

  useEffect(() => {
    const konamiCode = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
    ];

    const check420Time = () => {
      const now = new Date();
      if (now.getHours() === 16 && now.getMinutes() === 20) trigger420();
    };
    check420Time();
    const timeId = setInterval(check420Time, 60_000);

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "b" || e.key === "B") {
        setIsPanicActive((p) => !p);
        return;
      }
      if (e.key === "Escape") {
        setIsPanicActive(false);
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      konamiRef.current.push(key);
      if (konamiRef.current.length > 10) konamiRef.current.shift();
      if (konamiRef.current.join(",") === konamiCode.join(",")) {
        handlers.addCookies(9999);
        handlers.unlock("konami");
        handlers.findEasterEgg("konami", "Konami Code! +9999 Cookies! 🎮");
        konamiRef.current = [];
      }

      if (/^\d$/.test(e.key)) {
        digitBufferRef.current += e.key;
        if (digitBufferRef.current.length > 6) {
          digitBufferRef.current = digitBufferRef.current.slice(-6);
        }
        if (digitBufferRef.current.endsWith("420")) {
          trigger420();
          digitBufferRef.current = "";
        }
        if (digitBufferRef.current.endsWith("161")) {
          setMode161(true);
          const punk = THEME_PRESETS.find((p) => p.id === "punk161");
          if (punk) setThemeConfig(punk.config);
          handlers.findEasterEgg("mode_161", "161 Punk Mode! 🤘");
          digitBufferRef.current = "";
        }
      }

      if (key.length === 1 && /[a-z]/.test(key)) {
        secretWordRef.current += key;
        if (secretWordRef.current.length > 10) {
          secretWordRef.current = secretWordRef.current.slice(-10);
        }
        const word = secretWordRef.current;

        if (word.endsWith("moo")) {
          handlers.unlock("moo");
          handlers.findEasterEgg("moo", "Moo! 🐄");
          handlers.setCookieSkin("🐄");
          setTimeout(() => {
            if (!handlers.getSeasonalEmoji()) handlers.setCookieSkin("🍪");
          }, 10000);
          secretWordRef.current = "";
        }
        if (word.endsWith("quack")) {
          handlers.unlock("quack");
          handlers.findEasterEgg("quack", "Quack! 🦆");
          handlers.setDuckMode(true);
          setTimeout(() => handlers.setDuckMode(false), 8000);
          secretWordRef.current = "";
        }
        if (word.endsWith("yarr")) {
          handlers.unlock("pirate");
          handlers.findEasterEgg("pirate", "Yarr! 🏴‍☠️");
          handlers.setPirateMode((p) => !p);
          secretWordRef.current = "";
        }
        if (word.endsWith("67")) {
          handlers.unlock("sixty_seven_code");
          handlers.findEasterEgg("sixty_seven_code", "Secret 67 Code!");
          secretWordRef.current = "";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(timeId);
    };
  }, [handlers, setIsPanicActive, setMode420, setMode161, setThemeConfig, setActiveSkin, trigger420]);
}
