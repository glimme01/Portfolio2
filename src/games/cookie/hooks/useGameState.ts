import { useContext } from "react";
import { GameStatsContext } from "../context/GameProvider";

export function useGameState() {
  const ctx = useContext(GameStatsContext);
  if (!ctx) throw new Error("useGameState must be used within GameProvider");
  return ctx;
}
