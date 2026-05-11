import { motion } from "motion/react";
import {
  Brain,
  Calculator,
  Circle,
  RotateCcw,
  Square,
  Target,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TextReveal } from "../components/InteractiveText";

const calcButtons = [
  "7",
  "8",
  "9",
  "/",
  "4",
  "5",
  "6",
  "*",
  "1",
  "2",
  "3",
  "-",
  "0",
  ".",
  "=",
  "+",
];

const initialBoard = Array(9).fill(null) as Array<"X" | "O" | null>;

function evaluateExpression(expression: string) {
  if (!/^[\d+\-*/. ()]+$/.test(expression)) return "Error";
  try {
    const value = Function(`"use strict"; return (${expression || "0"})`)();
    if (!Number.isFinite(value)) return "Error";
    return String(Math.round(value * 100000) / 100000);
  } catch {
    return "Error";
  }
}

function getWinner(board: Array<"X" | "O" | null>) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

export default function Services() {
  const [calcValue, setCalcValue] = useState("42");
  const [reactionState, setReactionState] = useState<"idle" | "waiting" | "ready" | "done">("idle");
  const [reactionMessage, setReactionMessage] = useState("Start druecken und auf das Signal warten.");
  const [reactionScore, setReactionScore] = useState<number | null>(null);
  const [bestReaction, setBestReaction] = useState<number | null>(null);
  const reactionTimeout = useRef<number | null>(null);
  const reactionStart = useRef(0);

  const [board, setBoard] = useState(initialBoard);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const winner = useMemo(() => getWinner(board), [board]);
  const isDraw = !winner && board.every(Boolean);

  useEffect(() => {
    return () => {
      if (reactionTimeout.current) window.clearTimeout(reactionTimeout.current);
    };
  }, []);

  const handleCalcInput = (button: string) => {
    if (button === "=") {
      setCalcValue(evaluateExpression(calcValue));
      return;
    }

    setCalcValue((current) => {
      if (current === "Error") return button;
      if (current === "0" || current === "42") return button;
      return `${current}${button}`;
    });
  };

  const clearCalc = () => setCalcValue("0");

  const startReaction = () => {
    if (reactionTimeout.current) window.clearTimeout(reactionTimeout.current);
    setReactionState("waiting");
    setReactionScore(null);
    setReactionMessage("Still halten...");

    reactionTimeout.current = window.setTimeout(() => {
      reactionStart.current = performance.now();
      setReactionState("ready");
      setReactionMessage("Jetzt!");
    }, 900 + Math.random() * 1800);
  };

  const hitReaction = () => {
    if (reactionState === "waiting") {
      if (reactionTimeout.current) window.clearTimeout(reactionTimeout.current);
      setReactionState("idle");
      setReactionMessage("Zu frueh. Noch mal mit mehr Geduld.");
      return;
    }

    if (reactionState === "ready") {
      const score = Math.round(performance.now() - reactionStart.current);
      setReactionScore(score);
      setBestReaction((best) => (best === null ? score : Math.min(best, score)));
      setReactionState("done");
      setReactionMessage(`${score} ms`);
    }
  };

  const playCell = (index: number) => {
    if (board[index] || winner) return;

    setBoard((current) => {
      const next = [...current];
      next[index] = turn;
      return next;
    });
    setTurn((current) => (current === "X" ? "O" : "X"));
  };

  const resetBoard = () => {
    setBoard(initialBoard);
    setTurn("X");
  };

  return (
    <div className="min-h-screen bg-surface">
      <section className="px-8 md:px-12 lg:px-24 py-16 border-b border-outline">
        <div className="text-subtle mb-10 flex items-center gap-4 opacity-30">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          Volume 01 // Tools
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-12 xl:gap-20 items-end">
          <h1 className="font-serif text-[clamp(48px,10vw,138px)] leading-[0.85] tracking-tighter italic">
            <TextReveal text="Nuetzliche" />
            <br />
            <TextReveal text="Werkzeuge." delay={0.1} />
          </h1>
          <p className="text-lg md:text-xl opacity-60 leading-relaxed max-w-xl pb-4">
            Kleine Alltagshelfer und schnelle Spiele, gestaltet wie ein ruhiger
            digitaler Arbeitstisch.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 border-b border-outline">
        <ToolPanel
          eyebrow="Utility_01"
          title="Rechner"
          icon={<Calculator strokeWidth={1} />}
          className="bg-surface"
        >
          <div className="border border-outline bg-surface-low/40 p-6">
            <div className="min-h-20 border border-outline bg-surface px-5 py-4 mb-5 flex items-end justify-end">
              <span className="font-serif italic text-4xl tracking-tighter break-all text-right">
                {calcValue}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {calcButtons.map((button) => (
                <button
                  key={button}
                  onClick={() => handleCalcInput(button)}
                  className={`h-14 border border-outline transition-colors hover:bg-primary hover:text-surface ${
                    button === "=" ? "bg-primary text-surface" : "bg-surface/60"
                  }`}
                >
                  {button}
                </button>
              ))}
            </div>
            <button
              onClick={clearCalc}
              className="mt-3 w-full h-12 border border-outline text-subtle hover:bg-surface-high transition-colors"
            >
              Clear
            </button>
          </div>
        </ToolPanel>

        <ToolPanel
          eyebrow="Game_01"
          title="Reaktion"
          icon={<Timer strokeWidth={1} />}
          className="bg-surface-low"
        >
          <button
            onClick={reactionState === "waiting" || reactionState === "ready" ? hitReaction : startReaction}
            className={`w-full aspect-square border border-outline flex flex-col items-center justify-center gap-6 transition-all ${
              reactionState === "ready"
                ? "bg-primary text-surface"
                : "bg-surface/50 hover:bg-surface"
            }`}
          >
            <Target size={46} strokeWidth={1} />
            <span className="font-serif italic text-4xl tracking-tighter text-center px-4">
              {reactionMessage}
            </span>
          </button>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Metric label="Letzter Wert" value={reactionScore ? `${reactionScore} ms` : "-"} />
            <Metric label="Bestwert" value={bestReaction ? `${bestReaction} ms` : "-"} />
          </div>
        </ToolPanel>

        <ToolPanel
          eyebrow="Game_02"
          title="Tic Tac Toe"
          icon={<Brain strokeWidth={1} />}
          className="bg-surface-lowest"
        >
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => playCell(index)}
                className="aspect-square border border-outline bg-surface/50 hover:bg-surface transition-colors flex items-center justify-center"
                aria-label={`Feld ${index + 1}`}
              >
                {cell === "X" && <Square size={38} strokeWidth={1.4} />}
                {cell === "O" && <Circle size={40} strokeWidth={1.4} />}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border border-outline bg-surface/40 px-4 py-3">
            <span className="text-subtle">
              {winner ? `${winner} gewinnt` : isDraw ? "Unentschieden" : `${turn} ist dran`}
            </span>
            <button
              onClick={resetBoard}
              className="w-10 h-10 border border-outline flex items-center justify-center hover:bg-primary hover:text-surface transition-colors"
              title="Spiel zuruecksetzen"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </ToolPanel>
      </section>

      <section className="px-8 md:px-12 lg:px-24 py-20 bg-surface">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-y border-outline py-12">
          {[
            ["01", "Schnell rechnen", "Kleine Kalkulationen ohne extra App."],
            ["02", "Reaktion testen", "Ein kurzer Fokus-Check zwischen zwei Tasks."],
            ["03", "Kurz spielen", "Tic Tac Toe als minimalistischer Pausenmodus."],
          ].map(([num, title, text]) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <span className="font-serif italic text-4xl opacity-10 group-hover:opacity-60 transition-opacity">
                {num}
              </span>
              <h3 className="mt-8 text-3xl font-serif italic tracking-tighter">
                <span className="text-highlight">{title}</span>
              </h3>
              <p className="mt-5 opacity-55 leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolPanel({
  eyebrow,
  title,
  icon,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  className: string;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`min-h-[720px] p-8 md:p-12 xl:p-14 border-r last:border-r-0 border-outline ${className}`}
    >
      <div className="flex items-start justify-between mb-12">
        <span className="text-subtle opacity-35">{eyebrow}</span>
        <div className="opacity-30">{icon}</div>
      </div>
      <h2 className="font-serif text-5xl md:text-6xl italic tracking-tighter mb-10">
        <span className="text-highlight">{title}</span>
      </h2>
      {children}
    </motion.article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-outline bg-surface/40 px-4 py-3">
      <div className="text-subtle opacity-45 mb-3">{label}</div>
      <div className="font-serif italic text-2xl tracking-tighter">{value}</div>
    </div>
  );
}
