import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 400;
const H = 500;
const NUM_VISIBLE = 8;
const SEG_H = 48;
const SEG_W = 140;
const TRUNK_X = (W - SEG_W) / 2;
const TIMER_START = 3;
const TIMER_MAX_CAP = 4;
const CHOP_RESTORE = 0.5;
const SPEED_STEP = 10;
const SPEED_PENALTY = 0.1;

// ─── Types ────────────────────────────────────────────────────────────────────
type Branch = "left" | "right" | null;
type Side = "left" | "right";

interface Log {
  id: number;
  branch: Branch;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _logId = 0;
function mkLog(branch: Branch): Log {
  return { id: _logId++, branch };
}

function generateStack(): Log[] {
  const stack: Log[] = [];
  const options: Branch[] = ["left", "right", null, null];
  for (let i = 0; i < NUM_VISIBLE + 4; i++) {
    let branch: Branch;
    if (i < 2) {
      branch = null;
    } else {
      branch = options[Math.floor(Math.random() * options.length)];
      if (
        branch !== null &&
        stack.length >= 2 &&
        stack[stack.length - 1].branch === branch &&
        stack[stack.length - 2].branch === branch
      ) {
        branch = null;
      }
    }
    stack.push(mkLog(branch));
  }
  return stack;
}

function nextBranch(last1: Branch, last2: Branch): Branch {
  const options: Branch[] = ["left", "right", null, null];
  let b: Branch = options[Math.floor(Math.random() * options.length)];
  if (b !== null && b === last1 && b === last2) {
    b = null;
  }
  return b;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  branch: Branch,
  idx: number
) {
  const shade = idx % 2 === 0 ? "#5c3d1e" : "#7a5230";
  const lighter = idx % 2 === 0 ? "#7a5230" : "#8b6040";

  ctx.fillStyle = shade;
  ctx.beginPath();
  (ctx as any).roundRect(x, y, w, h, 3);
  ctx.fill();

  ctx.strokeStyle = lighter;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  const grainCount = 5;
  for (let g = 1; g <= grainCount; g++) {
    const gy = y + (h * g) / (grainCount + 1);
    ctx.beginPath();
    ctx.moveTo(x + 8, gy);
    ctx.lineTo(x + w - 8, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  (ctx as any).roundRect(x, y, w, h, 3);
  ctx.stroke();

  ctx.strokeStyle = "#9b6d40";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 4, w / 2 - 10, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (branch === "left") {
    drawBranch(ctx, x, y + h / 2, "left");
  } else if (branch === "right") {
    drawBranch(ctx, x + w, y + h / 2, "right");
  }
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  dir: "left" | "right"
) {
  const len = 55;
  const endX = dir === "left" ? baseX - len : baseX + len;

  ctx.strokeStyle = "#4a2e0a";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(endX, baseY - 6);
  ctx.stroke();

  ctx.strokeStyle = "#6b4520";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY - 1);
  ctx.lineTo(endX, baseY - 7);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.arc(endX, baseY - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d5a1b";
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const ox = (dir === "left" ? -1 : 1) * (i * 6 - 6);
    ctx.beginPath();
    ctx.ellipse(endX + ox, baseY - 14 - i * 4, 8 - i, 12 - i * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  side: Side,
  swinging: boolean,
  logBottomY: number
) {
  const cx = side === "left" ? TRUNK_X - 36 : TRUNK_X + SEG_W + 36;
  const cy = logBottomY - 30;
  const dir = side === "left" ? 1 : -1;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(-8 * dir, 30, 8, 22);
  ctx.fillRect(2 * dir, 30, 8, 22);

  ctx.fillStyle = "#f0ebe3";
  ctx.beginPath();
  (ctx as any).roundRect(-12, 6, 24, 26, 4);
  ctx.fill();

  ctx.fillStyle = "#FFA586";
  ctx.fillRect(-12, 14, 24, 6);

  ctx.fillStyle = "#d4a574";
  ctx.beginPath();
  ctx.arc(0, -4, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(-13, -17, 26, 5);
  ctx.fillRect(-9, -30, 18, 14);

  ctx.fillStyle = "#141416";
  ctx.beginPath();
  ctx.arc(5 * dir, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  const swing = swinging ? (side === "left" ? 0.6 : -0.6) : 0;
  ctx.save();
  ctx.translate(12 * dir, 12);
  ctx.rotate(swing);

  ctx.strokeStyle = "#d4a574";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16 * dir, -14);
  ctx.stroke();

  ctx.strokeStyle = "#7a5230";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(16 * dir, -14);
  ctx.lineTo(28 * dir, -24);
  ctx.stroke();

  ctx.fillStyle = "#8c9bb5";
  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(28, -24);
    ctx.lineTo(38, -30);
    ctx.lineTo(42, -18);
    ctx.lineTo(32, -16);
  } else {
    ctx.moveTo(-28, -24);
    ctx.lineTo(-38, -30);
    ctx.lineTo(-42, -18);
    ctx.lineTo(-32, -16);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#6070a0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function drawChopParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function spawnParticles(side: Side): Particle[] {
  const px = side === "left" ? TRUNK_X + 10 : TRUNK_X + SEG_W - 10;
  const py = H - SEG_H * 1.5;
  const colors = ["#7a5230", "#5c3d1e", "#9b6d40", "#f0ebe3"];
  return Array.from({ length: 12 }, () => ({
    x: px,
    y: py,
    vx: (Math.random() - 0.5) * 6 * (side === "left" ? -1 : 1),
    vy: -Math.random() * 5 - 2,
    r: Math.random() * 4 + 2,
    life: 1,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Timberman() {
  const [highScore, setHighScore] = useState(() =>
    Number(loadState("timberman_high") || "0")
  );
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [playerSide, setPlayerSide] = useState<Side>("left");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stackRef = useRef<Log[]>([]);
  const timerRef = useRef<number>(TIMER_START);
  const maxTimerRef = useRef<number>(TIMER_START);
  const scoreRef = useRef<number>(0);
  const playerSideRef = useRef<Side>("left");
  const swingingRef = useRef<boolean>(false);
  const swingTimerRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const gameStateRef = useRef<"idle" | "playing" | "dead">("idle");
  const highScoreRef = useRef<number>(highScore);

  const flyingLogRef = useRef<{ y: number; vy: number; branch: Branch } | null>(null);

  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
  useEffect(() => { playerSideRef.current = playerSide; }, [playerSide]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const resetGame = useCallback(() => {
    stackRef.current = generateStack();
    timerRef.current = TIMER_START;
    maxTimerRef.current = TIMER_START;
    scoreRef.current = 0;
    playerSideRef.current = "left";
    swingingRef.current = false;
    swingTimerRef.current = 0;
    particlesRef.current = [];
    flyingLogRef.current = null;
    lastTimeRef.current = 0;
    setScore(0);
    setPlayerSide("left");
    setGameState("playing");
  }, []);

  const chop = useCallback((side: Side) => {
    if (gameStateRef.current !== "playing") return;

    const bottomLog = stackRef.current[0];
    if (!bottomLog) return;

    if (bottomLog.branch === side) {
      gameStateRef.current = "dead";
      setGameState("dead");
      const final = scoreRef.current;
      if (final > highScoreRef.current) {
        highScoreRef.current = final;
        setHighScore(final);
        saveState("timberman_high", String(final));
      }
      return;
    }

    const chopped = stackRef.current[0];
    flyingLogRef.current = {
      y: H - SEG_H,
      vy: -8,
      branch: chopped.branch,
    };

    const top1 = stackRef.current[stackRef.current.length - 1];
    const top2 = stackRef.current[stackRef.current.length - 2];
    const newBranch = nextBranch(top1?.branch ?? null, top2?.branch ?? null);
    stackRef.current = [...stackRef.current.slice(1), mkLog(newBranch)];

    scoreRef.current += 1;
    setScore(scoreRef.current);

    const chopsNow = scoreRef.current;
    const speedLevel = Math.floor(chopsNow / SPEED_STEP);
    maxTimerRef.current = Math.max(1.2, TIMER_MAX_CAP - speedLevel * SPEED_PENALTY);
    timerRef.current = Math.min(timerRef.current + CHOP_RESTORE, maxTimerRef.current);

    if (chopsNow > highScoreRef.current) {
      highScoreRef.current = chopsNow;
      setHighScore(chopsNow);
      saveState("timberman_high", String(chopsNow));
    }

    playerSideRef.current = side;
    setPlayerSide(side);

    swingingRef.current = true;
    swingTimerRef.current = 0.12;

    particlesRef.current = [
      ...particlesRef.current,
      ...spawnParticles(side),
    ];
  }, []);

  const loop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

    const dt = lastTimeRef.current ? Math.min((ts - lastTimeRef.current) / 1000, 0.05) : 0;
    lastTimeRef.current = ts;

    if (gameStateRef.current === "playing") {
      timerRef.current -= dt;
      if (timerRef.current <= 0) {
        timerRef.current = 0;
        gameStateRef.current = "dead";
        setGameState("dead");
        const final = scoreRef.current;
        if (final > highScoreRef.current) {
          highScoreRef.current = final;
          setHighScore(final);
          saveState("timberman_high", String(final));
        }
      }

      if (swingingRef.current) {
        swingTimerRef.current -= dt;
        if (swingTimerRef.current <= 0) swingingRef.current = false;
      }

      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - dt * 3,
        }))
        .filter((p) => p.life > 0);

      if (flyingLogRef.current) {
        flyingLogRef.current.y += flyingLogRef.current.vy;
        flyingLogRef.current.vy -= 0.3;
        if (flyingLogRef.current.y < -SEG_H * 2) flyingLogRef.current = null;
      }
    }

    // ── DRAW ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(240,235,227,0.03)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    const groundY = H - 8;
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = "#4a2e0a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    const visibleLogs = stackRef.current.slice(0, NUM_VISIBLE + 1);
    const stackBaseY = groundY - SEG_H;

    visibleLogs.forEach((log, i) => {
      const logY = stackBaseY - (NUM_VISIBLE - 1 - i) * SEG_H;
      drawLog(ctx, TRUNK_X, logY, SEG_W, SEG_H - 2, log.branch, i);
    });

    if (flyingLogRef.current) {
      const fl = flyingLogRef.current;
      ctx.globalAlpha = Math.max(0, Math.min(1, (fl.y + SEG_H) / SEG_H));
      drawLog(ctx, TRUNK_X - 20, fl.y, SEG_W, SEG_H - 2, fl.branch, 0);
      ctx.globalAlpha = 1;
    }

    const logBottomY = stackBaseY + SEG_H;
    drawPlayer(ctx, playerSideRef.current, swingingRef.current, logBottomY);

    drawChopParticles(ctx, particlesRef.current);

    const timerRatio = Math.max(0, timerRef.current / TIMER_MAX_CAP);
    const barH = 8;
    const barY = 16;
    const barPad = 24;

    ctx.fillStyle = "rgba(240,235,227,0.1)";
    ctx.beginPath();
    (ctx as any).roundRect(barPad, barY, W - barPad * 2, barH, 4);
    ctx.fill();

    const gCh = Math.floor(165 * timerRatio);
    const rCh = Math.floor(255 - (255 - 176) * timerRatio);
    ctx.fillStyle = `rgb(${rCh}, ${gCh}, 134)`;
    if (timerRatio > 0) {
      ctx.beginPath();
      (ctx as any).roundRect(barPad, barY, (W - barPad * 2) * timerRatio, barH, 4);
      ctx.fill();
    }

    if (timerRatio > 0.1) {
      ctx.shadowColor = `rgb(${rCh}, ${gCh}, 134)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      (ctx as any).roundRect(barPad, barY, (W - barPad * 2) * timerRatio, barH, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "rgba(240,235,227,0.4)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TIME", barPad, barY - 4);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (gameStateRef.current === "idle") resetGame();
        else chop("left");
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (gameStateRef.current === "idle") resetGame();
        else chop("right");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chop, resetGame]);

  const onCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = touch.clientX - rect.left;
    const halfW = rect.width / 2;
    if (gameStateRef.current === "idle") { resetGame(); return; }
    chop(relX < halfW ? "left" : "right");
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
          <h1 className="font-serif font-black text-3xl mb-1">🪓 Timberman</h1>
          <p className="text-[#a09a90] text-sm">← / → hacken · Finger auf dem Canvas · Buttons unten</p>
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
          style={{ width: W, maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
            onTouchStart={onCanvasTouch}
          />

          {gameState === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/75 backdrop-blur-sm gap-4">
              <div className="text-5xl">🪓</div>
              <h2 className="font-serif font-black text-2xl text-[#f0ebe3]">Timberman</h2>
              <p className="text-[#a09a90] text-sm text-center px-6">
                Hacke den Baumstamm – weiche den Ästen aus!<br />
                Drücke ← oder → um zu starten
              </p>
              <button onClick={resetGame} className="btn-main text-lg mt-2">
                ▶ Starten
              </button>
            </div>
          )}

          {gameState === "dead" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/85 backdrop-blur-sm gap-4">
              <div className="text-4xl">💀</div>
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-2xl font-bold">{score} Hiebe</div>
              {score > 0 && score >= highScore && (
                <div className="pill text-sm text-[#141416] bg-[#FFA586] font-bold">
                  🏆 Neuer Highscore!
                </div>
              )}
              <button
                onClick={resetGame}
                className="btn-main flex items-center gap-2 mt-2"
              >
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            className="pill active:bg-[#FFA586] active:text-[#141416] w-20 h-16 flex items-center justify-center text-3xl font-bold select-none"
            onTouchStart={(e: React.TouchEvent) => {
              e.preventDefault();
              if (gameStateRef.current === "idle") resetGame();
              else chop("left");
            }}
            onClick={() => {
              if (gameStateRef.current === "idle") resetGame();
              else chop("left");
            }}
            aria-label="Chop Left"
          >
            ←
          </button>
          <button
            className="pill active:bg-[#FFA586] active:text-[#141416] w-20 h-16 flex items-center justify-center text-3xl font-bold select-none"
            onTouchStart={(e: React.TouchEvent) => {
              e.preventDefault();
              if (gameStateRef.current === "idle") resetGame();
              else chop("right");
            }}
            onClick={() => {
              if (gameStateRef.current === "idle") resetGame();
              else chop("right");
            }}
            aria-label="Chop Right"
          >
            →
          </button>
        </div>

        <p className="text-center text-[#a09a90] text-xs mt-4">
          Tastatur: ← A &nbsp;|&nbsp; → D &nbsp;·&nbsp; Touch: Canvas-Hälfte tippen
        </p>
      </div>
    </motion.div>
  );
}
