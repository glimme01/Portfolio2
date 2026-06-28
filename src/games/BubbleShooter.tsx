import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 8;
const ROWS = 8;
const RADIUS = 22;
const DIAM = RADIUS * 2;
const CANVAS_W = COLS * DIAM; // 352
const CANVAS_H = 560;
const SHOOTER_Y = CANVAS_H - 60;
const SHOOTER_X = CANVAS_W / 2;
const BALL_SPEED = 9;
const SHOTS_PER_ROW = 5;
const MIN_ANGLE_DEG = 15;
const MAX_ANGLE_DEG = 165;

const COLORS = ["#FFA586", "#B01A2B", "#f0ebe3", "#4a9eff", "#4aff9e", "#c678dd"] as const;
type BubbleColor = (typeof COLORS)[number];

// ─── Types ────────────────────────────────────────────────────────────────────
interface GridBubble {
  color: BubbleColor;
}

interface FlyingBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

interface PopParticle {
  x: number;
  y: number;
  color: BubbleColor;
  life: number;
  vx: number;
  vy: number;
}

type Grid = (GridBubble | null)[][];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomColor(): BubbleColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function cellCenter(col: number, row: number): { x: number; y: number } {
  const offsetX = row % 2 === 0 ? col * DIAM + RADIUS : col * DIAM + RADIUS + RADIUS;
  const y = row * DIAM + RADIUS;
  return { x: offsetX, y };
}

function hexNeighbors(col: number, row: number): Array<[number, number]> {
  const isEven = row % 2 === 0;
  return (
    [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
      [isEven ? col - 1 : col + 1, row - 1],
      [isEven ? col - 1 : col + 1, row + 1],
    ] as Array<[number, number]>
  ).filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
}

function floodFill(
  grid: Grid,
  col: number,
  row: number,
  color: BubbleColor
): Array<[number, number]> {
  const visited = new Set<string>();
  const result: Array<[number, number]> = [];
  const stack: Array<[number, number]> = [[col, row]];
  while (stack.length) {
    const [c, r] = stack.pop()!;
    const key = `${c},${r}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const cell = grid[r]?.[c];
    if (!cell || cell.color !== color) continue;
    result.push([c, r]);
    for (const [nc, nr] of hexNeighbors(c, r)) {
      if (!visited.has(`${nc},${nr}`)) stack.push([nc, nr]);
    }
  }
  return result;
}

function findIsolated(grid: Grid): Array<[number, number]> {
  const connected = new Set<string>();
  const stack: Array<[number, number]> = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c]) stack.push([c, 0]);
  }
  while (stack.length) {
    const [c, r] = stack.pop()!;
    const key = `${c},${r}`;
    if (connected.has(key)) continue;
    if (!grid[r]?.[c]) continue;
    connected.add(key);
    for (const [nc, nr] of hexNeighbors(c, r)) {
      if (!connected.has(`${nc},${nr}`) && grid[nr]?.[nc]) stack.push([nc, nr]);
    }
  }
  const isolated: Array<[number, number]> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && !connected.has(`${c},${r}`)) isolated.push([c, r]);
    }
  }
  return isolated;
}

function clampAngle(angleDeg: number): number {
  const clamped = Math.max(MIN_ANGLE_DEG, Math.min(MAX_ANGLE_DEG, angleDeg));
  return (clamped * Math.PI) / 180;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  if (c.length === 3) {
    return [
      parseInt(c[0] + c[0], 16),
      parseInt(c[1] + c[1], 16),
      parseInt(c[2] + c[2], 16),
    ];
  }
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function clampRgb(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${clampRgb(r + 255 * amt)},${clampRgb(g + 255 * amt)},${clampRgb(b + 255 * amt)})`;
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${clampRgb(r - 255 * amt)},${clampRgb(g - 255 * amt)},${clampRgb(b - 255 * amt)})`;
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1,
  scale = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
  grad.addColorStop(0, lighten(color, 0.45));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, darken(color, 0.3));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 0;
  const hGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, -r * 0.3, -r * 0.4, r * 0.5);
  hGrad.addColorStop(0, "rgba(255,255,255,0.55)");
  hGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = hGrad;
  ctx.fill();

  ctx.restore();
}

function aimAngleFromPointer(px: number, py: number): number {
  const dx = px - SHOOTER_X;
  const dy = SHOOTER_Y - py;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function buildInitialGrid(): Grid {
  const g: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    g.push([]);
    for (let c = 0; c < COLS; c++) {
      if (r < ROWS - 2) {
        g[r].push({ color: randomColor() });
      } else {
        g[r].push(null);
      }
    }
  }
  return g;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BubbleShooter() {
  const [highScore, setHighScore] = useState(() =>
    Number(loadState("bubble_high") || "0")
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const gridRef = useRef<Grid>(buildInitialGrid());
  const ballRef = useRef<FlyingBall | null>(null);
  const currentColorRef = useRef<BubbleColor>(randomColor());
  const nextColorRef = useRef<BubbleColor>(randomColor());
  const aimAngleRef = useRef<number>(90);
  const shotsRef = useRef<number>(0);
  const particlesRef = useRef<PopParticle[]>([]);
  const scoreRef = useRef<number>(0);
  const highScoreRef = useRef<number>(0);
  const gameOverRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);
  const pendingScoreRef = useRef<number>(0);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  const flushScore = useCallback(() => {
    if (pendingScoreRef.current === 0) return;
    const add = pendingScoreRef.current;
    pendingScoreRef.current = 0;
    setScore((prev) => {
      const ns = prev + add;
      scoreRef.current = ns;
      if (ns > highScoreRef.current) {
        setHighScore(ns);
        highScoreRef.current = ns;
        saveState("bubble_high", String(ns));
      }
      return ns;
    });
  }, []);

  const reset = useCallback(() => {
    gridRef.current = buildInitialGrid();
    ballRef.current = null;
    currentColorRef.current = randomColor();
    nextColorRef.current = randomColor();
    aimAngleRef.current = 90;
    shotsRef.current = 0;
    particlesRef.current = [];
    scoreRef.current = 0;
    pendingScoreRef.current = 0;
    gameOverRef.current = false;
    startedRef.current = true;
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  function checkGameOver() {
    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          const { y } = cellCenter(c, r);
          if (y + RADIUS >= SHOOTER_Y - 30) {
            gameOverRef.current = true;
            setGameOver(true);
            return;
          }
        }
      }
    }
  }

  function addNewRow() {
    const grid = gridRef.current;
    for (let r = ROWS - 1; r > 0; r--) {
      grid[r] = grid[r - 1].map((b) => (b ? { ...b } : null));
    }
    for (let c = 0; c < COLS; c++) {
      grid[0][c] = { color: randomColor() };
    }
    checkGameOver();
  }

  function spawnParticles(x: number, y: number, color: BubbleColor) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const spd = 2 + Math.random() * 3;
      particlesRef.current.push({
        x, y, color, life: 1,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
      });
    }
  }

  function landBall(ball: FlyingBall) {
    const grid = gridRef.current;

    // Find nearest free cell
    let bestDist = Infinity;
    let bestCol = -1;
    let bestRow = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!grid[r][c]) {
          const { x, y } = cellCenter(c, r);
          const d = (x - ball.x) ** 2 + (y - ball.y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            bestCol = c;
            bestRow = r;
          }
        }
      }
    }

    if (bestCol < 0) {
      ballRef.current = null;
      return;
    }

    grid[bestRow][bestCol] = { color: ball.color };
    ballRef.current = null;

    const group = floodFill(grid, bestCol, bestRow, ball.color);
    if (group.length >= 3) {
      let pts = 0;
      if (group.length === 3) pts = 30;
      else if (group.length === 4) pts = 60;
      else pts = 100 + (group.length - 5) * 20;

      for (const [gc, gr] of group) {
        const { x, y } = cellCenter(gc, gr);
        grid[gr][gc] = null;
        spawnParticles(x, y, ball.color);
      }
      pendingScoreRef.current += pts;
      flushScore();

      const isolated = findIsolated(grid);
      for (const [ic, ir] of isolated) {
        const { x, y } = cellCenter(ic, ir);
        const iso = grid[ir][ic];
        grid[ir][ic] = null;
        if (iso) spawnParticles(x, y, iso.color);
      }
      pendingScoreRef.current += isolated.length * 15;
      flushScore();
    }

    checkGameOver();
  }

  function shoot() {
    if (ballRef.current || gameOverRef.current || !startedRef.current) return;
    const angleRad = clampAngle(aimAngleRef.current);
    ballRef.current = {
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(angleRad) * BALL_SPEED,
      vy: -Math.sin(angleRad) * BALL_SPEED,
      color: currentColorRef.current,
    };
    currentColorRef.current = nextColorRef.current;
    nextColorRef.current = randomColor();
    shotsRef.current++;
    if (shotsRef.current % SHOTS_PER_ROW === 0) {
      addNewRow();
    }
  }

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    const grid = gridRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle grid outlines
    ctx.strokeStyle = "rgba(240,235,227,0.04)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const { x, y } = cellCenter(c, r);
        ctx.beginPath();
        ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Shooter zone line
    ctx.strokeStyle = "rgba(240,235,227,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, SHOOTER_Y - 30);
    ctx.lineTo(CANVAS_W, SHOOTER_Y - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grid bubbles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const b = grid[r][c];
        if (!b) continue;
        const { x, y } = cellCenter(c, r);
        drawBubble(ctx, x, y, RADIUS, b.color);
      }
    }

    // Aim line
    if (!ballRef.current && startedRef.current && !gameOverRef.current) {
      const angleRad = clampAngle(aimAngleRef.current);
      ctx.strokeStyle = "rgba(240,235,227,0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 8]);
      let ax = SHOOTER_X;
      let ay = SHOOTER_Y;
      let avx = Math.cos(angleRad);
      let avy = -Math.sin(angleRad);
      const totalLen = CANVAS_H * 1.6;
      let drawn = 0;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      while (drawn < totalLen) {
        ax += avx * 6;
        ay += avy * 6;
        drawn += 6;
        if (ax < RADIUS) {
          ax = RADIUS;
          avx = Math.abs(avx);
        }
        if (ax > CANVAS_W - RADIUS) {
          ax = CANVAS_W - RADIUS;
          avx = -Math.abs(avx);
        }
        if (ay < 0) break;
        let nearBubble = false;
        outer: for (let r = 0; r < ROWS; r++) {
          for (let c2 = 0; c2 < COLS; c2++) {
            if (grid[r][c2]) {
              const { x: bx, y: by } = cellCenter(c2, r);
              if ((ax - bx) ** 2 + (ay - by) ** 2 < DIAM * DIAM) {
                nearBubble = true;
                break outer;
              }
            }
          }
        }
        if (nearBubble) break;
        ctx.lineTo(ax, ay);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flying ball + physics
    const ball = ballRef.current;
    if (ball) {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - RADIUS < 0) {
        ball.x = RADIUS;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + RADIUS > CANVAS_W) {
        ball.x = CANVAS_W - RADIUS;
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.y - RADIUS <= 0) {
        landBall(ball);
      } else {
        let hit = false;
        for (let r = 0; r < ROWS && !hit; r++) {
          for (let c = 0; c < COLS && !hit; c++) {
            if (grid[r][c]) {
              const { x: bx, y: by } = cellCenter(c, r);
              const dist = Math.sqrt((ball.x - bx) ** 2 + (ball.y - by) ** 2);
              if (dist < DIAM - 4) {
                landBall(ball);
                hit = true;
              }
            }
          }
        }
        if (!hit && ballRef.current) {
          drawBubble(ctx, ball.x, ball.y, RADIUS, ball.color);
        }
      }
    }

    // Shooter
    const sGrad = ctx.createRadialGradient(
      SHOOTER_X, SHOOTER_Y, 4,
      SHOOTER_X, SHOOTER_Y, RADIUS + 10
    );
    sGrad.addColorStop(0, "rgba(240,235,227,0.1)");
    sGrad.addColorStop(1, "rgba(240,235,227,0)");
    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y, RADIUS + 10, 0, Math.PI * 2);
    ctx.fillStyle = sGrad;
    ctx.fill();
    drawBubble(ctx, SHOOTER_X, SHOOTER_Y, RADIUS, currentColorRef.current);

    // Next preview
    ctx.fillStyle = "rgba(240,235,227,0.35)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", SHOOTER_X + RADIUS + 10, SHOOTER_Y - 10);
    drawBubble(
      ctx,
      SHOOTER_X + RADIUS + 24,
      SHOOTER_Y + 5,
      RADIUS * 0.65,
      nextColorRef.current
    );

    // Particles
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 0.035;
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, [flushScore]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawLoop]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        aimAngleRef.current = Math.min(MAX_ANGLE_DEG, aimAngleRef.current + 3);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        aimAngleRef.current = Math.max(MIN_ANGLE_DEG, aimAngleRef.current - 3);
      } else if (e.key === " ") {
        e.preventDefault();
        if (!startedRef.current) {
          startedRef.current = true;
          setStarted(true);
        }
        shoot();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const getCanvasPos = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!startedRef.current || gameOverRef.current) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (pos) aimAngleRef.current = aimAngleFromPointer(pos.x, pos.y);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current) return;
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (pos) aimAngleRef.current = aimAngleFromPointer(pos.x, pos.y);
    shoot();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!startedRef.current || gameOverRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const pos = getCanvasPos(t.clientX, t.clientY);
    if (pos) aimAngleRef.current = aimAngleFromPointer(pos.x, pos.y);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current) return;
    e.preventDefault();
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    const t = e.changedTouches[0];
    const pos = getCanvasPos(t.clientX, t.clientY);
    if (pos) aimAngleRef.current = aimAngleFromPointer(pos.x, pos.y);
    shoot();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">🫧 Bubble Shooter</h1>
          <p className="text-[#a09a90] text-sm">
            Maus / Touch zum Zielen &nbsp;·&nbsp; Klick zum Schießen &nbsp;·&nbsp; ← → drehen &nbsp;·&nbsp; Leertaste schießen
          </p>
        </div>

        <div className="flex justify-between mb-4 gap-3">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 flex-1 text-center">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 flex-1 text-center">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
        </div>

        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden"
          style={{ width: CANVAS_W, maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              touchAction: "none",
              cursor: "crosshair",
            }}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {!started && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/80 backdrop-blur-sm gap-4">
              <div className="text-5xl mb-1">🫧</div>
              <h2 className="font-serif font-black text-2xl text-[#f0ebe3]">Bubble Shooter</h2>
              <p className="text-[#a09a90] text-sm text-center px-6 max-w-xs">
                Treffe 3 oder mehr gleichfarbige Bubbles, um sie zu zerstören. Isolierte Cluster fallen automatisch!
              </p>
              <button
                onClick={() => {
                  startedRef.current = true;
                  setStarted(true);
                }}
                className="btn-main text-lg mt-2"
              >
                ▶ Start
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/85 backdrop-blur-sm gap-4">
              <div className="text-4xl">💥</div>
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-lg font-bold">{score} Punkte</div>
              {score > 0 && score >= highScore && (
                <div className="pill text-xs text-[#4aff9e]">🏆 Neuer Highscore!</div>
              )}
              <button onClick={reset} className="btn-main flex items-center gap-2 mt-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-[#a09a90]">
          <span className="pill px-3 py-1">← → Drehen</span>
          <span className="pill px-3 py-1">Leertaste Schießen</span>
          <span className="pill px-3 py-1">Klick / Touch Zielen &amp; Schießen</span>
        </div>

        <div className="mt-4 border border-[rgba(240,235,227,0.12)] p-4 text-xs text-[#a09a90] grid grid-cols-2 gap-2">
          <div>🟠 3 Bubbles = <span className="text-[#FFA586]">+30</span></div>
          <div>🔴 4 Bubbles = <span className="text-[#FFA586]">+60</span></div>
          <div>🟢 5+ Bubbles = <span className="text-[#FFA586]">+100+</span></div>
          <div>⬇️ Isoliert = <span className="text-[#FFA586]">+15 / Bubble</span></div>
        </div>
      </div>
    </motion.div>
  );
}
