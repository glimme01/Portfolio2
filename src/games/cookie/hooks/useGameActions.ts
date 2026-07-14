import { useContext } from "react";
import { GameActionsContext } from "../context/GameProvider";

export function useGameActions() {
  const ctx = useContext(GameActionsContext);
  if (!ctx) throw new Error("useGameActions must be used within GameProvider");
  return ctx;
}
