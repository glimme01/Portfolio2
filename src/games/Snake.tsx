import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

const GRID = 20;
const CELL = 20;
const TICK = 120;

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(loadState("snake_high") || "0"));
  const [started, setStarted] = useState(false);
  const dirRef = useRef<Direction>("RIGHT");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    let p: Point;
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (currentSnake.some((s) => s.x === p.x && s.y === p.y));
    return p;
  }, []);

  const reset = () => {
    const initial = [{ x: 10, y: 10 }];
    setSnake(initial);
    setFood(spawnFood(initial));
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setStarted(true);
  };

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) return;
      e.preventDefault();
      if (!started) { setStarted(true); }

      const opp: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (opp[newDir] !== dirRef.current) {
        dirRef.current = newDir;
        setDir(newDir);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] };
        const d = dirRef.current;
        if (d === "UP") head.y--;
        if (d === "DOWN") head.y++;
        if (d === "LEFT") head.x--;
        if (d === "RIGHT") head.x++;

        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
          setGameOver(true);
          return prev;
        }
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          return prev;
        }

        const next = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => {
            const ns = s + 1;
            if (ns > highScore) {
              setHighScore(ns);
              saveState("snake_high", String(ns));
            }
            return ns;
          });
          setFood(spawnFood(next));
        } else {
          next.pop();
        }
        return next;
      });
    }, TICK);
    return () => clearInterval(interval);
  }, [started, gameOver, food, highScore, spawnFood]);

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const size = GRID * CELL;
    ctx.clearRect(0, 0, size, size);

    // Grid
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,165,134,0.05)";
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(size, i * CELL); ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#B01A2B";
    ctx.shadowColor = "#B01A2B";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((seg, i) => {
      const alpha = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = i === 0
        ? `rgba(255,165,134,${alpha})`
        : `rgba(255,165,134,${alpha * 0.7})`;
      if (i === 0) { ctx.shadowColor = "#FFA586"; ctx.shadowBlur = 10; }
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.shadowBlur = 0;
    });
  }, [snake, food]);

  // Touch controls
  const touchStart = useRef<Point | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    let newDir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? "RIGHT" : "LEFT";
    } else {
      newDir = dy > 0 ? "DOWN" : "UP";
    }
    const opp: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (opp[newDir] !== dirRef.current) {
      dirRef.current = newDir;
      setDir(newDir);
    }
    if (!started) setStarted(true);
  };

  const handleDirection = (newDir: Direction) => {
    if (!started) setStarted(true);
    if (gameOver) return;
    const opp: Record<Direction, Direction> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (opp[newDir] !== dirRef.current) {
      dirRef.current = newDir;
      setDir(newDir);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">🐍 Snake</h1>
          <p className="text-[#a09a90] text-sm">Tastatur / Swipe / D-Pad Steuerung</p>
        </div>

        <div className="flex justify-between mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
        </div>

        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden"
          style={{ width: GRID * CELL, maxWidth: "100%" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={GRID * CELL}
            height={GRID * CELL}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          {!started && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#141416]/70 backdrop-blur-sm">
              <button onClick={reset} className="btn-main text-lg">▶ Start</button>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/80 backdrop-blur-sm gap-4">
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-lg font-bold">{score} Punkte</div>
              <button onClick={reset} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        {/* Mobile & Tablet D-Pad Controller */}
        <div className="mt-8 flex flex-col items-center gap-2 max-w-[200px] mx-auto">
          <button
            onClick={() => handleDirection("UP")}
            className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
          >
            ▲
          </button>
          <div className="flex gap-8">
            <button
              onClick={() => handleDirection("LEFT")}
              className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
            >
              ◀
            </button>
            <button
              onClick={() => handleDirection("RIGHT")}
              className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => handleDirection("DOWN")}
            className="pill active:bg-[#FFA586] active:text-[#141416] w-12 h-12 flex items-center justify-center text-lg font-bold"
          >
            ▼
          </button>
        </div>
      </div>
    </motion.div>
  );
}
