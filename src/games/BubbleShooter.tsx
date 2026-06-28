import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

const COLORS = ["#FFA586", "#B01A2B", "#f0ebe3", "#4a9eff", "#4aff9e", "#c678dd"];
const COLS = 8;
const ROWS = 12;
const CELL = 40;
const R = 18;
const CW = COLS * CELL; // 320
const CH = 580;
const SHOOTER_Y = 540;
const SHOOTER_X = CW / 2; // 160
const BALL_SPEED = 10;
const GAME_OVER_ROW = 10;

type Grid = (string | null)[][];
type Phase = "idle" | "playing" | "gameover";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  active: boolean;
}

interface GS {
  grid: Grid;
  ball: Ball;
  currentColor: string;
  nextColor: string;
  aimAngle: number; // radians, -PI to 0 (upward)
  shotsThisRound: number;
  phase: Phase;
  score: number;
  popAnim: { x: number; y: number; color: string; frame: number }[];
}

function makeGrid(): Grid {
  const g: Grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < COLS; col++) {
      g[row][col] = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
  }
  return g;
}

function cellCenter(col: number, row: number) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function randColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// BFS: find connected group of same color from (row, col)
function findGroup(grid: Grid, row: number, col: number, color: string): [number, number][] {
  const visited = new Set<string>();
  const queue: [number, number][] = [[row, col]];
  const group: [number, number][] = [];
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== color) continue;
    visited.add(key);
    group.push([r, c]);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

// BFS: find all bubbles connected to row 0 (ceiling)
function findConnected(grid: Grid): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c] !== null) queue.push([0, c]);
  }
  while (queue.length) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] === null) continue;
    visited.add(key);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return visited;
}

export default function BubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const gsRef = useRef<GS>({
    grid: makeGrid(),
    ball: { x: SHOOTER_X, y: SHOOTER_Y, vx: 0, vy: 0, color: randColor(), active: false },
    currentColor: randColor(),
    nextColor: randColor(),
    aimAngle: -Math.PI / 2,
    shotsThisRound: 0,
    phase: "idle",
    score: 0,
    popAnim: [],
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(loadState("bubble_high") || "0"));
  const [phase, setPhase] = useState<Phase>("idle");

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gsRef.current;

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, CW, CH);

    // Grid bubbles
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const color = gs.grid[row][col];
        if (!color) continue;
        const { x, y } = cellCenter(col, row);
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // Highlight
        ctx.beginPath();
        ctx.arc(x - 5, y - 5, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fill();
      }
    }

    // Pop animations
    gs.popAnim = gs.popAnim.filter(p => p.frame > 0);
    gs.popAnim.forEach(p => {
      const alpha = p.frame / 15;
      const scale = 1 + (1 - alpha) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R * scale, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
      p.frame--;
    });

    // Game over line
    const gameOverY = GAME_OVER_ROW * CELL;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(176,26,43,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, gameOverY);
    ctx.lineTo(CW, gameOverY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim line (only when not shooting)
    if (!gs.ball.active && gs.phase === "playing") {
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(240,235,227,0.4)";
      ctx.lineWidth = 1.5;
      const angle = gs.aimAngle;
      let sx = SHOOTER_X, sy = SHOOTER_Y;
      let dx = Math.cos(angle), dy = Math.sin(angle);
      let remaining = 300;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (let bounce = 0; bounce < 3 && remaining > 0; bounce++) {
        // Find wall or top
        let tLeft = dx < 0 ? -sx / dx : Infinity;
        let tRight = dx > 0 ? (CW - sx) / dx : Infinity;
        let tTop = dy < 0 ? -sy / dy : Infinity;
        const t = Math.min(tLeft, tRight, tTop, remaining);
        const nx = sx + dx * t;
        const ny = sy + dy * t;
        ctx.lineTo(nx, ny);
        remaining -= t;
        if (t === tLeft || t === tRight) dx = -dx;
        else break;
        sx = nx; sy = ny;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Active ball
    if (gs.ball.active) {
      ctx.beginPath();
      ctx.arc(gs.ball.x, gs.ball.y, R, 0, Math.PI * 2);
      ctx.fillStyle = gs.ball.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gs.ball.x - 5, gs.ball.y - 5, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fill();
    }

    // Shooter arrow
    ctx.fillStyle = "#f0ebe3";
    ctx.beginPath();
    ctx.moveTo(SHOOTER_X, SHOOTER_Y + 20);
    ctx.lineTo(SHOOTER_X - 12, SHOOTER_Y + 36);
    ctx.lineTo(SHOOTER_X + 12, SHOOTER_Y + 36);
    ctx.closePath();
    ctx.fill();

    // Current bubble above shooter
    if (!gs.ball.active) {
      ctx.beginPath();
      ctx.arc(SHOOTER_X, SHOOTER_Y - 2, R, 0, Math.PI * 2);
      ctx.fillStyle = gs.currentColor;
      ctx.fill();
    }

    // Next bubble preview
    ctx.fillStyle = "#a09a90";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("next", CW - 45, SHOOTER_Y - 30);
    ctx.beginPath();
    ctx.arc(CW - 30, SHOOTER_Y, R * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = gs.nextColor;
    ctx.fill();

    // Score
    ctx.fillStyle = "#a09a90";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(`Score: ${gs.score}`, 8, 18);
  };

  const snapAndMatch = (gs: GS, bx: number, by: number) => {
    let col = Math.round((bx - CELL / 2) / CELL);
    let row = Math.round((by - CELL / 2) / CELL);
    col = Math.max(0, Math.min(COLS - 1, col));
    row = Math.max(0, Math.min(ROWS - 1, row));

    // Find nearest empty
    if (gs.grid[row][col] !== null) {
      let found = false;
      for (let dr = -1; dr <= 1 && !found; dr++) {
        for (let dc = -1; dc <= 1 && !found; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && gs.grid[nr][nc] === null) {
            row = nr; col = nc; found = true;
          }
        }
      }
      if (!found) row = Math.max(0, row - 1);
    }

    gs.grid[row][col] = gs.ball.color;

    // Match check
    const group = findGroup(gs.grid, row, col, gs.ball.color);
    let newScore = gs.score;
    if (group.length >= 3) {
      group.forEach(([r, c]) => {
        const { x, y } = cellCenter(c, r);
        gs.popAnim.push({ x, y, color: gs.grid[r][c]!, frame: 15 });
        gs.grid[r][c] = null;
      });
      newScore += group.length === 3 ? 30 : group.length === 4 ? 60 : 100;

      // Remove isolated
      const connected = findConnected(gs.grid);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (gs.grid[r][c] !== null && !connected.has(`${r},${c}`)) {
            const { x, y } = cellCenter(c, r);
            gs.popAnim.push({ x, y, color: gs.grid[r][c]!, frame: 15 });
            gs.grid[r][c] = null;
            newScore += 10;
          }
        }
      }
    }

    gs.score = newScore;
    setScore(newScore);
    if (newScore > Number(loadState("bubble_high") || "0")) {
      saveState("bubble_high", String(newScore));
      setHighScore(newScore);
    }

    // New row every 8 shots
    gs.shotsThisRound++;
    if (gs.shotsThisRound % 8 === 0) {
      gs.grid.unshift(Array(COLS).fill(null).map(() => COLORS[Math.floor(Math.random() * COLORS.length)]));
      gs.grid.pop();
    }

    // Game over check
    for (let c = 0; c < COLS; c++) {
      if (gs.grid[GAME_OVER_ROW] && gs.grid[GAME_OVER_ROW][c] !== null) {
        gs.phase = "gameover";
        setPhase("gameover");
        return;
      }
    }

    // Next ball
    gs.ball.color = gs.currentColor;
    gs.currentColor = gs.nextColor;
    gs.nextColor = randColor();
    gs.ball.active = false;
    gs.ball.x = SHOOTER_X;
    gs.ball.y = SHOOTER_Y;
  };

  const gameLoop = () => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;

    if (gs.ball.active) {
      gs.ball.x += gs.ball.vx;
      gs.ball.y += gs.ball.vy;

      // Wall bounce
      if (gs.ball.x - R < 0) { gs.ball.x = R; gs.ball.vx = Math.abs(gs.ball.vx); }
      if (gs.ball.x + R > CW) { gs.ball.x = CW - R; gs.ball.vx = -Math.abs(gs.ball.vx); }

      // Top
      if (gs.ball.y - R < CELL / 2) {
        snapAndMatch(gs, gs.ball.x, gs.ball.y);
      } else {
        // Bubble collision
        let snapped = false;
        outer: for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            if (!gs.grid[row][col]) continue;
            const { x, y } = cellCenter(col, row);
            const dist = Math.sqrt((gs.ball.x - x) ** 2 + (gs.ball.y - y) ** 2);
            if (dist < R * 2) {
              snapAndMatch(gs, gs.ball.x, gs.ball.y);
              snapped = true;
              break outer;
            }
          }
        }
        if (!snapped && gs.ball.y > CH + R) {
          gs.ball.active = false;
          gs.ball.x = SHOOTER_X;
          gs.ball.y = SHOOTER_Y;
        }
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  };

  const shoot = () => {
    const gs = gsRef.current;
    if (gs.ball.active || gs.phase !== "playing") return;
    gs.ball.x = SHOOTER_X;
    gs.ball.y = SHOOTER_Y;
    gs.ball.vx = Math.cos(gs.aimAngle) * BALL_SPEED;
    gs.ball.vy = Math.sin(gs.aimAngle) * BALL_SPEED;
    gs.ball.color = gs.currentColor;
    gs.ball.active = true;
  };

  const updateAim = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;
    let angle = Math.atan2(cy - SHOOTER_Y, cx - SHOOTER_X);
    // Clamp upward only: -170deg to -10deg
    angle = Math.max(-Math.PI + 0.17, Math.min(-0.17, angle));
    gsRef.current.aimAngle = angle;
  };

  const startGame = () => {
    gsRef.current.phase = "playing";
    setPhase("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  };

  const restart = () => {
    cancelAnimationFrame(rafRef.current);
    gsRef.current = {
      grid: makeGrid(),
      ball: { x: SHOOTER_X, y: SHOOTER_Y, vx: 0, vy: 0, color: randColor(), active: false },
      currentColor: randColor(),
      nextColor: randColor(),
      aimAngle: -Math.PI / 2,
      shotsThisRound: 0,
      phase: "idle",
      score: 0,
      popAnim: [],
    };
    setScore(0);
    setPhase("idle");
    draw();
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (e.key === "ArrowLeft") {
        gs.aimAngle = Math.max(-Math.PI + 0.17, gs.aimAngle - 0.087);
      } else if (e.key === "ArrowRight") {
        gs.aimAngle = Math.min(-0.17, gs.aimAngle + 0.087);
      } else if (e.key === " ") {
        e.preventDefault();
        if (gs.phase === "idle") startGame();
        else shoot();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateAim(e.clientX, e.clientY);
  };

  const handleMouseClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gsRef.current.phase === "idle") { startGame(); return; }
    updateAim(e.clientX, e.clientY);
    shoot();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    updateAim(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gsRef.current.phase === "idle") { startGame(); return; }
    if (e.changedTouches[0]) updateAim(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    shoot();
  };

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">🫧 Bubble Shooter</h1>
          <p className="text-[#a09a90] text-sm">Bewegen zum Zielen · Tippen/Klick zum Schießen</p>
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

        <div className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden" style={{ maxWidth: "100%" }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
            onMouseMove={handleMouseMove}
            onClick={handleMouseClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/80 gap-4">
              <div className="text-5xl">🫧</div>
              <div className="font-serif text-2xl italic text-[#f0ebe3]">Bubble Shooter</div>
              <p className="text-[#a09a90] text-sm text-center px-8">Bewege die Maus / Finger zum Zielen<br />Klick / Tippen zum Schießen</p>
              <button onClick={startGame} className="btn-main">▶ Starten</button>
            </div>
          )}
          {phase === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/85 gap-4">
              <div className="text-4xl">💥</div>
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-xl font-bold">{score} Punkte</div>
              <button onClick={restart} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#a09a90] mt-3">
          ← → Pfeiltasten zum Zielen · Leertaste schießen · 3+ gleiche Farben platzen!
        </p>
      </div>
    </motion.div>
  );
}
