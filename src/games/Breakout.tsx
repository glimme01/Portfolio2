import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const CW = 400;
const CH = 560;

const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = CH - 40;
const PADDLE_WIDE = 140;
const BALL_R = 10;

const COLS = 8;
const ROWS = 5;
const BRICK_W = 42;
const BRICK_H = 18;
const BRICK_PAD_X = 6;
const BRICK_PAD_Y = 5;
const BRICK_AREA_TOP = 52;

const POWERUP_R = 13;
const POWERUP_SPEED = 1.8;
const POWERUP_CHANCE = 0.15;

const BASE_SPEED = 4;
const SPEED_PER_LEVEL = 0.3;

const ROW_META: { color: string; pts: number }[] = [
  { color: "#B01A2B", pts: 3 },
  { color: "#FFA586", pts: 2 },
  { color: "#f0ebe3", pts: 1 },
  { color: "#4a9eff", pts: 1 },
  { color: "#4aff9e", pts: 1 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
  pts: number;
  row: number;
  hitFlash: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: "wide" | "multi" | "slow";
  vy: number;
}

interface GameState {
  paddle: { x: number; w: number };
  balls: Ball[];
  bricks: Brick[];
  powerups: PowerUp[];
  lives: number;
  score: number;
  level: number;
  wideTimer: number;
  slowTimer: number;
  running: boolean;
  over: boolean;
}

// ─── Power-up meta ─────────────────────────────────────────────────────────────
const POWERUP_META: Record<"wide" | "multi" | "slow", { color: string; label: string }> = {
  wide:  { color: "#FFA586", label: "W" },
  multi: { color: "#4a9eff", label: "M" },
  slow:  { color: "#4aff9e", label: "S" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeBricks(): Brick[] {
  const bricks: Brick[] = [];
  const totalW = COLS * BRICK_W + (COLS - 1) * BRICK_PAD_X;
  const startX = (CW - totalW) / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: startX + c * (BRICK_W + BRICK_PAD_X),
        y: BRICK_AREA_TOP + r * (BRICK_H + BRICK_PAD_Y),
        alive: true,
        color: ROW_META[r].color,
        pts: ROW_META[r].pts,
        row: r,
        hitFlash: 0,
      });
    }
  }
  return bricks;
}

function ballSpeed(level: number): number {
  return BASE_SPEED + (level - 1) * SPEED_PER_LEVEL;
}

function spawnBall(level: number, paddleX: number, paddleW: number): Ball {
  const spd = ballSpeed(level);
  const angleDeg = 60 + Math.random() * 60; // 60–120° upward
  const angle = angleDeg * (Math.PI / 180);
  return {
    x: paddleX + paddleW / 2,
    y: PADDLE_Y - BALL_R - 2,
    vx: spd * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1),
    vy: -Math.abs(spd * Math.sin(angle)),
  };
}

function makeInitialState(level = 1): GameState {
  const paddleX = (CW - PADDLE_W) / 2;
  return {
    paddle: { x: paddleX, w: PADDLE_W },
    balls: [spawnBall(level, paddleX, PADDLE_W)],
    bricks: makeBricks(),
    powerups: [],
    lives: 3,
    score: 0,
    level,
    wideTimer: 0,
    slowTimer: 0,
    running: false,
    over: false,
  };
}

function applyPowerUp(g: GameState, type: "wide" | "multi" | "slow") {
  if (type === "wide") {
    g.paddle.w = PADDLE_WIDE;
    g.wideTimer = 8 * 60;
  } else if (type === "slow") {
    g.slowTimer = 6 * 60;
  } else if (type === "multi") {
    const extras: Ball[] = g.balls.slice(0, 2).map((b) => ({
      x: b.x,
      y: b.y,
      vx: -b.vx + (Math.random() - 0.5) * 1.5,
      vy: b.vy + (Math.random() - 0.5) * 0.5,
    }));
    g.balls.push(...extras);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Breakout() {
  const [highScore, setHighScore] = useState(() =>
    Number(loadState("breakout_high") || "0")
  );
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [isOver, setIsOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [lifeLost, setLifeLost] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>(makeInitialState());
  const mouseXRef = useRef<number | null>(null);
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback((ctx: CanvasRenderingContext2D, g: GameState) => {
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, CW, CH);

    // Grid lines
    ctx.strokeStyle = "rgba(240,235,227,0.03)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CW; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    }
    for (let y = 0; y <= CH; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }

    // Bricks
    g.bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.save();
      if (b.hitFlash > 0) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 24;
      }
      ctx.fillStyle = b.color;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number)=>void }).roundRect(b.x, b.y, BRICK_W, BRICK_H, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, 3);
      ctx.restore();
    });

    // Power-ups
    g.powerups.forEach((p) => {
      const meta = POWERUP_META[p.type];
      ctx.save();
      ctx.shadowColor = meta.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = meta.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POWERUP_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "#141416";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(meta.label, p.x, p.y);
      ctx.restore();
    });

    // Paddle
    const paddleGrad = ctx.createLinearGradient(g.paddle.x, PADDLE_Y, g.paddle.x, PADDLE_Y + PADDLE_H);
    paddleGrad.addColorStop(0, "#f0ebe3");
    paddleGrad.addColorStop(1, "#a09a90");
    ctx.save();
    ctx.shadowColor = "rgba(240,235,227,0.5)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = paddleGrad;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number)=>void }).roundRect(g.paddle.x, PADDLE_Y, g.paddle.w, PADDLE_H, 5);
    ctx.fill();
    ctx.restore();

    // Balls
    g.balls.forEach((ball) => {
      ctx.save();
      ctx.shadowColor = "#FFA586";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#FFA586";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Active power-up indicators (top-left)
    const indicators: string[] = [];
    if (g.wideTimer > 0) indicators.push(`⚡ ${Math.ceil(g.wideTimer / 60)}s`);
    if (g.slowTimer > 0) indicators.push(`🐢 ${Math.ceil(g.slowTimer / 60)}s`);
    if (indicators.length) {
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#a09a90";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      indicators.forEach((txt, i) => ctx.fillText(txt, 6, 6 + i * 16));
    }
  }, []);

  // ── RAF tick ──────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const g = gsRef.current;
    if (!g.running || g.over) return;

    // Mouse paddle movement
    if (mouseXRef.current !== null) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scale = CW / rect.width;
        const mx = (mouseXRef.current - rect.left) * scale;
        g.paddle.x = Math.max(0, Math.min(CW - g.paddle.w, mx - g.paddle.w / 2));
      }
    }

    const slowFactor = g.slowTimer > 0 ? 0.55 : 1;
    const nextBalls: Ball[] = [];
    let scoreGained = 0;

    for (const ball of g.balls) {
      let { x, y, vx, vy } = ball;
      x += vx * slowFactor;
      y += vy * slowFactor;

      // Wall bounces
      if (x - BALL_R <= 0) { x = BALL_R; vx = Math.abs(vx); }
      if (x + BALL_R >= CW) { x = CW - BALL_R; vx = -Math.abs(vx); }
      if (y - BALL_R <= 0) { y = BALL_R; vy = Math.abs(vy); }

      // Paddle collision
      if (
        vy > 0 &&
        y + BALL_R >= PADDLE_Y &&
        y - BALL_R <= PADDLE_Y + PADDLE_H &&
        x >= g.paddle.x &&
        x <= g.paddle.x + g.paddle.w
      ) {
        y = PADDLE_Y - BALL_R;
        const hitPos = (x - (g.paddle.x + g.paddle.w / 2)) / (g.paddle.w / 2);
        const maxAngle = 70 * (Math.PI / 180);
        const ang = hitPos * maxAngle;
        const spd = Math.sqrt(vx * vx + vy * vy);
        vx = spd * Math.sin(ang);
        vy = -spd * Math.cos(ang);
      }

      // Brick collisions
      for (const b of g.bricks) {
        if (!b.alive) continue;
        const nx = Math.max(b.x, Math.min(x, b.x + BRICK_W));
        const ny = Math.max(b.y, Math.min(y, b.y + BRICK_H));
        const dx = x - nx;
        const dy = y - ny;
        if (dx * dx + dy * dy <= BALL_R * BALL_R) {
          b.alive = false;
          b.hitFlash = 6;
          scoreGained += b.pts;

          if (Math.random() < POWERUP_CHANCE) {
            const types: Array<"wide" | "multi" | "slow"> = ["wide", "multi", "slow"];
            g.powerups.push({
              x: b.x + BRICK_W / 2,
              y: b.y + BRICK_H / 2,
              type: types[Math.floor(Math.random() * 3)],
              vy: POWERUP_SPEED,
            });
          }

          const overlapX = BALL_R - Math.abs(dx);
          const overlapY = BALL_R - Math.abs(dy);
          if (overlapX < overlapY) { vx = -vx; } else { vy = -vy; }
          break;
        }
      }

      // Tick hit flash
      for (const b of g.bricks) { if (b.hitFlash > 0) b.hitFlash--; }

      // Ball lost?
      if (y - BALL_R > CH) continue;
      nextBalls.push({ x, y, vx, vy });
    }

    g.balls = nextBalls;

    // No balls left → lose a life
    if (g.balls.length === 0) {
      g.lives -= 1;
      if (g.lives <= 0) {
        g.over = true;
        g.running = false;
        setIsOver(true);
        setDisplayScore(g.score);
        if (g.score > highScoreRef.current) {
          const ns = g.score;
          setHighScore(ns);
          saveState("breakout_high", String(ns));
        }
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) draw(ctx, g);
        return;
      }
      g.balls = [spawnBall(g.level, g.paddle.x, g.paddle.w)];
      g.running = false;
      setDisplayLives(g.lives);
      setLifeLost(true);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) draw(ctx, g);
      return;
    }

    // Update score
    if (scoreGained > 0) {
      g.score += scoreGained;
      setDisplayScore(g.score);
      if (g.score > highScoreRef.current) {
        const ns = g.score;
        setHighScore(ns);
        saveState("breakout_high", String(ns));
      }
    }

    // Power-up movement & collection
    const nextPowerups: PowerUp[] = [];
    for (const p of g.powerups) {
      p.y += p.vy;
      if (p.y > CH) continue;
      if (
        p.y + POWERUP_R >= PADDLE_Y &&
        p.y - POWERUP_R <= PADDLE_Y + PADDLE_H &&
        p.x >= g.paddle.x - POWERUP_R &&
        p.x <= g.paddle.x + g.paddle.w + POWERUP_R
      ) {
        applyPowerUp(g, p.type);
        continue;
      }
      nextPowerups.push(p);
    }
    g.powerups = nextPowerups;

    // Power-up timers
    if (g.wideTimer > 0) { g.wideTimer--; if (g.wideTimer === 0) g.paddle.w = PADDLE_W; }
    if (g.slowTimer > 0) g.slowTimer--;

    // Level clear?
    if (g.bricks.every((b) => !b.alive)) {
      const nextLevel = g.level + 1;
      g.level = nextLevel;
      g.bricks = makeBricks();
      g.powerups = [];
      g.balls = g.balls.map((b) => {
        const spd = ballSpeed(nextLevel);
        const angle = Math.atan2(-b.vy, b.vx);
        return { ...b, vx: spd * Math.cos(angle), vy: -Math.abs(spd * Math.sin(angle)) };
      });
      setDisplayLevel(nextLevel);
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, g);
  }, [draw]);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;
    const loop = () => { tick(); animId = requestAnimationFrame(loop); };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [tick]);

  // ── Initial draw ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, gsRef.current);
  }, [draw]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const STEP = 18;
    const handler = (e: KeyboardEvent) => {
      const g = gsRef.current;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        g.paddle.x = Math.max(0, g.paddle.x - STEP);
        if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        g.paddle.x = Math.min(CW - g.paddle.w, g.paddle.x + STEP);
        if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const startOrResume = () => {
    const g = gsRef.current;
    if (g.over) return;
    g.running = true;
    setIsStarted(true);
    setLifeLost(false);
  };

  const reset = () => {
    const fresh = makeInitialState(1);
    gsRef.current = fresh;
    mouseXRef.current = null;
    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayLevel(1);
    setIsOver(false);
    setIsStarted(false);
    setLifeLost(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx, fresh);
  };

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseXRef.current = e.clientX;
    const g = gsRef.current;
    if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
  };
  const onMouseLeave = () => { mouseXRef.current = null; };

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const g = gsRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CW / rect.width;
    const tx = (e.touches[0].clientX - rect.left) * scale;
    g.paddle.x = Math.max(0, Math.min(CW - g.paddle.w, tx - g.paddle.w / 2));
    if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
  };

  // ── On-screen buttons ─────────────────────────────────────────────────────
  const moveLeft = () => {
    const g = gsRef.current;
    g.paddle.x = Math.max(0, g.paddle.x - 20);
    if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
  };
  const moveRight = () => {
    const g = gsRef.current;
    g.paddle.x = Math.min(CW - g.paddle.w, g.paddle.x + 20);
    if (!g.running && !g.over) { g.running = true; setIsStarted(true); setLifeLost(false); }
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
          <h1 className="font-serif font-black text-3xl mb-1">🧱 Breakout</h1>
          <p className="text-[#a09a90] text-sm">Maus · Touch · Pfeiltasten — Zerstöre alle Blöcke!</p>
        </div>

        {/* HUD */}
        <div className="flex justify-between items-center mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90] block">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{displayScore}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs text-[#a09a90]">Leben</div>
            <div className="flex gap-1 text-lg">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} style={{ opacity: i < displayLives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded text-right">
              <span className="text-xs text-[#a09a90] block">Highscore</span>
              <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
            </div>
            <div className="text-xs text-[#a09a90] pr-1">Level {displayLevel}</div>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden rounded"
          style={{ width: CW, maxWidth: "100%" }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onTouchMove={onTouchMove}
          onClick={startOrResume}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{ width: "100%", height: "auto", display: "block", cursor: "none" }}
          />

          {/* Start overlay */}
          {!isStarted && !isOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/75 backdrop-blur-sm gap-5">
              <div className="text-5xl">🧱</div>
              <div className="text-center">
                <div className="font-serif font-black text-2xl text-[#f0ebe3] mb-1">BREAKOUT</div>
                <div className="text-[#a09a90] text-sm">Bewege die Maus oder tippe zum Starten</div>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-[#a09a90] text-center border border-[rgba(240,235,227,0.12)] px-5 py-3 rounded">
                <span><span className="text-[#FFA586]">W</span> WIDE — Paddle 8s breiter</span>
                <span><span className="text-[#4a9eff]">M</span> MULTI — 2 Extra-Bälle</span>
                <span><span className="text-[#4aff9e]">S</span> SLOW — Ball 6s langsamer</span>
              </div>
              <button onClick={startOrResume} className="btn-main text-base mt-1">▶ Starten</button>
            </div>
          )}

          {/* Life-lost overlay */}
          {lifeLost && !isOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/70 backdrop-blur-sm gap-3">
              <div className="font-serif font-black text-xl text-[#FFA586]">Ball verloren!</div>
              <div className="flex gap-1 text-2xl">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ opacity: i < displayLives ? 1 : 0.2 }}>❤️</span>
                ))}
              </div>
              <button onClick={startOrResume} className="btn-main">▶ Weiter</button>
            </div>
          )}

          {/* Game Over overlay */}
          {isOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/85 backdrop-blur-sm gap-4">
              <div className="text-4xl font-serif font-black text-[#B01A2B]">GAME OVER</div>
              <div className="text-[#FFA586] text-lg font-bold">{displayScore} Punkte</div>
              {displayScore > 0 && displayScore >= highScore && (
                <div className="pill text-sm text-[#4aff9e]">🏆 Neuer Highscore!</div>
              )}
              <button onClick={reset} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        {/* Mobile D-pad */}
        <div className="mt-6 flex justify-center gap-6">
          <button
            className="pill active:bg-[#FFA586] active:text-[#141416] w-16 h-12 flex items-center justify-center text-xl font-bold select-none"
            onPointerDown={moveLeft}
          >
            ◀
          </button>
          <button
            className="pill active:bg-[#FFA586] active:text-[#141416] w-16 h-12 flex items-center justify-center text-xl font-bold select-none"
            onPointerDown={moveRight}
          >
            ▶
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm"
          >
            <RotateCcw size={14} /> Neu starten
          </button>
        </div>
      </div>
    </motion.div>
  );
}
