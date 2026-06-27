import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

type Board = number[][];

function createEmpty(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandom(board: Board): Board {
  const b = board.map((r) => [...r]);
  const empty: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empty.push([r, c]); }));
  if (empty.length === 0) return b;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  b[r][c] = Math.random() < 0.9 ? 2 : 4;
  return b;
}

function slide(row: number[]): { result: number[]; score: number } {
  const filtered = row.filter((v) => v !== 0);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { result: merged, score };
}

function move(board: Board, dir: "left" | "right" | "up" | "down"): { board: Board; score: number; moved: boolean } {
  let totalScore = 0;
  let b = board.map((r) => [...r]);
  let moved = false;

  const process = (rows: number[][]): number[][] => {
    return rows.map((row) => {
      const { result, score } = slide(row);
      totalScore += score;
      if (row.some((v, i) => v !== result[i])) moved = true;
      return result;
    });
  };

  if (dir === "left") {
    b = process(b);
  } else if (dir === "right") {
    b = process(b.map((r) => [...r].reverse())).map((r) => r.reverse());
  } else if (dir === "up") {
    const cols = Array.from({ length: 4 }, (_, c) => b.map((r) => r[c]));
    const processed = process(cols);
    b = Array.from({ length: 4 }, (_, r) => processed.map((col) => col[r]));
  } else {
    const cols = Array.from({ length: 4 }, (_, c) => b.map((r) => r[c]).reverse());
    const processed = process(cols).map((r) => r.reverse());
    b = Array.from({ length: 4 }, (_, r) => processed.map((col) => col[r]));
  }

  return { board: b, score: totalScore, moved };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

const tileColors: Record<number, string> = {
  2: "bg-[#2a2a2e] text-[#f0ebe3]",
  4: "bg-[#2a2a2e] text-[#FFA586]",
  8: "bg-[#FFA586]/30 text-[#FFA586]",
  16: "bg-[#FFA586]/50 text-[#141416]",
  32: "bg-[#FFA586]/70 text-[#141416]",
  64: "bg-[#FFA586] text-[#141416]",
  128: "bg-[#B01A2B]/60 text-white",
  256: "bg-[#B01A2B]/80 text-white",
  512: "bg-[#B01A2B] text-white",
  1024: "bg-[#B01A2B] text-white",
  2048: "bg-gradient-to-br from-[#FFA586] to-[#B01A2B] text-white",
};

export default function Game2048() {
  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(createEmpty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(loadState("2048_best") || "0"));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const doMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (gameOver) return;
    const { board: newBoard, score: gained, moved } = move(board, dir);
    if (!moved) return;
    const withNew = addRandom(newBoard);
    setBoard(withNew);
    setScore((s) => {
      const ns = s + gained;
      if (ns > best) { setBest(ns); saveState("2048_best", String(ns)); }
      return ns;
    });
    if (withNew.some((r) => r.some((v) => v === 2048)) && !won) setWon(true);
    if (!canMove(withNew)) setGameOver(true);
  }, [board, gameOver, best, won]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      if (map[e.key]) { e.preventDefault(); doMove(map[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove]);

  // Touch
  const touchStart = { x: 0, y: 0 };
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
  };

  const reset = () => {
    setBoard(addRandom(addRandom(createEmpty())));
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif font-black text-3xl">🧊 2048</h1>
          <button onClick={reset} className="pill flex items-center gap-2 text-sm px-3 py-2">
            <RotateCcw size={14} /> Neu
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 flex-1 text-center">
            <div className="text-xs text-[#a09a90]">Score</div>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 flex-1 text-center">
            <div className="text-xs text-[#a09a90]">Best</div>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{best}</div>
          </div>
        </div>

        <div
          className="border border-[rgba(240,235,227,0.12)] p-3 relative"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="grid grid-cols-4 gap-2">
            {board.flat().map((val, i) => (
              <motion.div
                key={i}
                layout
                className={`aspect-square rounded-xl flex items-center justify-center font-serif font-black select-none ${
                  val === 0
                    ? "bg-[#141416]/40"
                    : tileColors[val] || "bg-[#B01A2B] text-white"
                } ${val >= 100 ? "text-lg" : "text-xl"} ${val >= 1000 ? "text-base" : ""}`}
              >
                {val > 0 && val}
              </motion.div>
            ))}
          </div>

          {(gameOver || won) && (
            <div className="absolute inset-0 bg-[#141416]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4">
              <div className={`text-3xl font-serif font-black ${won ? "text-[#FFA586]" : "text-[#B01A2B]"}`}>
                {won ? "🎉 2048!" : "Game Over!"}
              </div>
              <div className="text-[#FFA586] text-lg font-bold">{score} Punkte</div>
              <button onClick={reset} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        {/* D-Pad controls for touch devices */}
        <div className="mt-8 flex flex-col items-center gap-2 max-w-[200px] mx-auto">
          <button
            onClick={() => doMove("up")}
            className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
          >
            ▲
          </button>
          <div className="flex gap-8">
            <button
              onClick={() => doMove("left")}
              className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
            >
              ◀
            </button>
            <button
              onClick={() => doMove("right")}
              className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => doMove("down")}
            className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
          >
            ▼
          </button>
        </div>

        <p className="text-center text-[#a09a90] text-xs mt-4">Tastatur / Swipe / Buttons</p>
      </div>
    </motion.div>
  );
}
