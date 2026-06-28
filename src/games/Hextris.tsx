import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const CANVAS_SIZE = 400;
const CENTER = CANVAS_SIZE / 2;
const HEX_RADIUS = 80;          // inner hexagon circumradius
const BLOCK_SIZE = 18;
const MAX_STACK = 4;
const COLORS = [
  "#FFA586",
  "#B01A2B",
  "#f0ebe3",
  "#4a9eff",
  "#4aff9e",
  "#ff4a9e",
];
const NUM_SIDES = 6;
const BASE_SPEED = 1.8;         // px per frame at start
const SPEED_INC = 0.00015;     // added per frame
const SPAWN_INTERVAL = 90;     // frames between spawns

// ─── Types ────────────────────────────────────────────────────────────────────
interface FallingBlock {
  side: number;          // target side (0-5)
  color: string;
  progress: number;      // 0 = outer edge, 1 = hex edge
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
}

interface GameState {
  stacks: string[][];    // stacks[side] = array of color strings (bottom = 0)
  falling: FallingBlock | null;
  score: number;
  gameOver: boolean;
  started: boolean;
  rotation: number;      // how many sides the hex has been rotated (mod 6)
  speed: number;
  frameCount: number;
  spawnTimer: number;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Return the outward-facing midpoint of side `sideIndex` at `distance` from center */
function sidePoint(sideIndex: number, distance: number, rotationOffset: number = 0): [number, number] {
  // Hexagon flat-top: side 0 is top-right, going clockwise
  // Angle for the midpoint of side i: 30° + 60°*i
  const angleDeg = 30 + 60 * sideIndex + rotationOffset * 60;
  const angleRad = (angleDeg * Math.PI) / 180;
  return [
    CENTER + distance * Math.cos(angleRad),
    CENTER + distance * Math.sin(angleRad),
  ];
}

/** Hexagon vertex positions */
function hexVertices(radius: number, rotationOffset: number = 0): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i + rotationOffset * 60;
    const angleRad = (angleDeg * Math.PI) / 180;
    verts.push([CENTER + radius * Math.cos(angleRad), CENTER + radius * Math.sin(angleRad)]);
  }
  return verts;
}

function initState(): GameState {
  return {
    stacks: Array.from({ length: NUM_SIDES }, () => []),
    falling: null,
    score: 0,
    gameOver: false,
    started: false,
    rotation: 0,
    speed: BASE_SPEED,
    frameCount: 0,
    spawnTimer: 0,
  };
}

function spawnBlock(state: GameState): FallingBlock {
  const side = Math.floor(Math.random() * NUM_SIDES);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const outerDist = CENTER - 10;
  const [sx, sy] = sidePoint(side, outerDist, state.rotation);
  const [tx, ty] = sidePoint(side, HEX_RADIUS + BLOCK_SIZE / 2, state.rotation);
  return {
    side,
    color,
    progress: 0,
    x: sx,
    y: sy,
    startX: sx,
    startY: sy,
    targetX: tx,
    targetY: ty,
  };
}

function clearMatches(stacks: string[][]): { newStacks: string[][]; cleared: number } {
  let cleared = 0;
  const newStacks = stacks.map((s) => [...s]);

  // Clear any side where top 3 blocks share the same color
  for (let i = 0; i < NUM_SIDES; i++) {
    const stack = newStacks[i];
    if (stack.length >= 3) {
      const top3 = stack.slice(-3);
      if (top3.every((c) => c === top3[0])) {
        newStacks[i] = stack.slice(0, -3);
        cleared += 3;
      }
    }
  }

  // Also check adjacent side pairs for same-color top blocks
  for (let i = 0; i < NUM_SIDES; i++) {
    const next = (i + 1) % NUM_SIDES;
    const si = newStacks[i];
    const sn = newStacks[next];
    if (si.length > 0 && sn.length > 0) {
      const topI = si[si.length - 1];
      const topN = sn[sn.length - 1];
      if (topI === topN) {
        // Check if there's a third neighbour on the other side
        const prev = (i - 1 + NUM_SIDES) % NUM_SIDES;
        const sp = newStacks[prev];
        if (sp.length > 0 && sp[sp.length - 1] === topI) {
          newStacks[i].pop();
          newStacks[next].pop();
          newStacks[prev].pop();
          cleared += 3;
        }
      }
    }
  }

  return { newStacks, cleared };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function drawHex(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  const { stacks, falling, rotation } = state;

  // Background
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Subtle radial glow
  const grd = ctx.createRadialGradient(CENTER, CENTER, 20, CENTER, CENTER, 180);
  grd.addColorStop(0, "rgba(255,165,134,0.07)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const verts = hexVertices(HEX_RADIUS, rotation);

  // Draw outer guide rings (subtle)
  for (let ring = 1; ring <= MAX_STACK; ring++) {
    const outerR = HEX_RADIUS + ring * BLOCK_SIZE;
    const outerVerts = hexVertices(outerR, rotation);
    ctx.beginPath();
    ctx.moveTo(outerVerts[0][0], outerVerts[0][1]);
    for (let i = 1; i < 6; i++) ctx.lineTo(outerVerts[i][0], outerVerts[i][1]);
    ctx.closePath();
    ctx.strokeStyle = "rgba(240,235,227,0.04)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw stacked blocks on each side
  for (let s = 0; s < NUM_SIDES; s++) {
    const stack = stacks[s];
    for (let b = 0; b < stack.length; b++) {
      const dist = HEX_RADIUS + BLOCK_SIZE / 2 + b * BLOCK_SIZE;
      const [bx, by] = sidePoint(s, dist, rotation);
      drawBlock(ctx, bx, by, stack[b], rotation, s);
    }
  }

  // Draw the falling block
  if (falling) {
    drawBlock(ctx, falling.x, falling.y, falling.color, rotation, falling.side);
    // Trailing glow
    ctx.save();
    ctx.globalAlpha = 0.18;
    const glowGrd = ctx.createRadialGradient(falling.x, falling.y, 2, falling.x, falling.y, BLOCK_SIZE * 2);
    glowGrd.addColorStop(0, falling.color);
    glowGrd.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrd;
    ctx.fillRect(falling.x - BLOCK_SIZE * 2, falling.y - BLOCK_SIZE * 2, BLOCK_SIZE * 4, BLOCK_SIZE * 4);
    ctx.restore();
  }

  // Draw hexagon border
  ctx.beginPath();
  ctx.moveTo(verts[0][0], verts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(verts[i][0], verts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = "#f0ebe3";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Hex center fill (dark glass)
  ctx.fillStyle = "rgba(20,20,22,0.9)";
  ctx.fill();

  // Side indicators – small dot per side showing current "rotation"
  for (let s = 0; s < NUM_SIDES; s++) {
    const [dx, dy] = sidePoint(s, HEX_RADIUS - 12, rotation);
    const isFalling = falling && falling.side === s;
    ctx.beginPath();
    ctx.arc(dx, dy, 3, 0, Math.PI * 2);
    ctx.fillStyle = isFalling ? "#FFA586" : "rgba(240,235,227,0.2)";
    ctx.fill();
  }

  // Danger indicators on sides that are nearly full
  for (let s = 0; s < NUM_SIDES; s++) {
    if (stacks[s].length >= MAX_STACK - 1) {
      const [wx, wy] = sidePoint(s, HEX_RADIUS + BLOCK_SIZE * 2, rotation);
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(Date.now() / 200);
      ctx.beginPath();
      ctx.arc(wx, wy, BLOCK_SIZE, 0, Math.PI * 2);
      ctx.strokeStyle = "#B01A2B";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  rotation: number,
  side: number
) {
  const half = BLOCK_SIZE / 2;
  const angleDeg = 30 + 60 * side + rotation * 60;
  const angleRad = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  // Block shadow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // Main square block
  ctx.fillStyle = color;
  ctx.fillRect(-half, -half, BLOCK_SIZE, BLOCK_SIZE);

  // Highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-half, -half, BLOCK_SIZE, half / 2);

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(-half, -half, BLOCK_SIZE, BLOCK_SIZE);

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Hextris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    Number(loadState("hextris_high") || "0")
  );
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // ── Rotate ─────────────────────────────────────────────────────────────────
  const rotate = useCallback((dir: number) => {
    const gs = stateRef.current;
    if (gs.gameOver || !gs.started) return;

    gs.rotation = ((gs.rotation + dir) % NUM_SIDES + NUM_SIDES) % NUM_SIDES;

    // Update falling block target if present
    if (gs.falling) {
      const side = gs.falling.side;
      const outerDist = CENTER - 10;
      const [sx, sy] = sidePoint(side, outerDist, gs.rotation);
      const [tx, ty] = sidePoint(side, HEX_RADIUS + BLOCK_SIZE / 2, gs.rotation);
      const prog = gs.falling.progress;
      gs.falling = {
        ...gs.falling,
        startX: sx,
        startY: sy,
        targetX: tx,
        targetY: ty,
        x: sx + (tx - sx) * prog,
        y: sy + (ty - sy) * prog,
      };
    }
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const gs = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!gs.started || gs.gameOver) {
      drawHex(ctx, gs);
      return;
    }

    gs.frameCount++;
    gs.speed = BASE_SPEED + gs.frameCount * SPEED_INC;

    // Spawn
    if (!gs.falling) {
      gs.spawnTimer++;
      if (gs.spawnTimer >= SPAWN_INTERVAL) {
        gs.spawnTimer = 0;
        gs.falling = spawnBlock(gs);
      }
    }

    // Move falling block
    if (gs.falling) {
      const f = gs.falling;
      const dx = f.targetX - f.startX;
      const dy = f.targetY - f.startY;
      const totalDist = Math.sqrt(dx * dx + dy * dy);

      if (totalDist > 0) {
        const step = gs.speed / totalDist;
        f.progress = Math.min(1, f.progress + step);
        f.x = f.startX + dx * f.progress;
        f.y = f.startY + dy * f.progress;
      }

      // Block landed
      if (f.progress >= 1) {
        const side = f.side;
        if (gs.stacks[side].length >= MAX_STACK) {
          // Game over
          gs.gameOver = true;
          setGameOver(true);
          const newHigh = Math.max(gs.score, highScore);
          setHighScore(newHigh);
          saveState("hextris_high", String(newHigh));
        } else {
          gs.stacks[side] = [...gs.stacks[side], f.color];
          gs.falling = null;
          gs.spawnTimer = 0;

          // Check matches
          const { newStacks, cleared } = clearMatches(gs.stacks);
          if (cleared > 0) {
            gs.stacks = newStacks;
            const bonus = cleared >= 6 ? 50 : 0;
            const newScore = gs.score + cleared * 10 + bonus;
            gs.score = newScore;
            setScore(newScore);
            if (newScore > highScore) {
              setHighScore(newScore);
              saveState("hextris_high", String(newScore));
            }
          }
        }
      }
    }

    drawHex(ctx, gs);
    rafRef.current = requestAnimationFrame(tick);
  }, [highScore]);

  // ── Start / restart ────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const fresh = initState();
    fresh.started = true;
    stateRef.current = fresh;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        rotate(-1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        rotate(1);
      } else if (e.key === " " || e.key === "Enter") {
        if (!stateRef.current.started || stateRef.current.gameOver) startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate, startGame]);

  // ── Touch canvas ──────────────────────────────────────────────────────────
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const tx = touch.clientX - rect.left;
    if (tx < rect.width / 2) {
      rotate(-1);
    } else {
      rotate(1);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    if (cx < rect.width / 2) {
      rotate(-1);
    } else {
      rotate(1);
    }
  };

  // ── Canvas setup & initial draw ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx) drawHex(ctx, stateRef.current);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Restart RAF when tick changes (highScore update)
  useEffect(() => {
    if (started && !gameOver) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, started, gameOver]);

  // ── Overlay drawing (game over / start) on canvas ─────────────────────────
  useEffect(() => {
    if (!started || gameOver) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawHex(ctx, stateRef.current);

      // Semi-transparent overlay
      ctx.fillStyle = "rgba(20,20,22,0.78)";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (gameOver) {
        ctx.fillStyle = "#B01A2B";
        ctx.font = "bold 28px serif";
        ctx.fillText("GAME OVER", CENTER, CENTER - 36);
        ctx.fillStyle = "#f0ebe3";
        ctx.font = "16px serif";
        ctx.fillText(`Score: ${stateRef.current.score}`, CENTER, CENTER);
        ctx.fillStyle = "#a09a90";
        ctx.font = "13px sans-serif";
        ctx.fillText("Leertaste / Tippen zum Neustart", CENTER, CENTER + 36);
      } else {
        ctx.fillStyle = "#FFA586";
        ctx.font = "bold 26px serif";
        ctx.fillText("🔷 HEXTRIS", CENTER, CENTER - 36);
        ctx.fillStyle = "#f0ebe3";
        ctx.font = "15px sans-serif";
        ctx.fillText("Pfeiltasten / Tippen zum Drehen", CENTER, CENTER);
        ctx.fillStyle = "#a09a90";
        ctx.font = "13px sans-serif";
        ctx.fillText("Leertaste / Klick zum Starten", CENTER, CENTER + 36);
      }
    }
  }, [started, gameOver]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/games"
          className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">🔷 Hextris</h1>
          <p className="text-[#a09a90] text-sm">← → Pfeiltasten / Tippen zum Drehen</p>
        </div>

        {/* Score row */}
        <div className="flex justify-between mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
          <button
            onClick={startGame}
            className="pill px-4 py-2 flex items-center gap-2 text-sm"
            title="Neu starten"
          >
            <RotateCcw size={14} />
            Neu
          </button>
        </div>

        {/* Canvas */}
        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden"
          style={{ maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
            onClick={(e) => {
              if (!stateRef.current.started || stateRef.current.gameOver) {
                startGame();
              } else {
                handleCanvasClick(e);
              }
            }}
            onTouchStart={(e) => {
              if (!stateRef.current.started || stateRef.current.gameOver) {
                startGame();
              } else {
                handleCanvasTouch(e);
              }
            }}
          />
        </div>

        {/* Touch controls */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onTouchStart={(e) => { e.preventDefault(); rotate(-1); }}
            onClick={() => rotate(-1)}
            className="pill py-4 text-xl justify-center"
          >
            ◀ Links
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); rotate(1); }}
            onClick={() => rotate(1)}
            className="pill py-4 text-xl justify-center"
          >
            Rechts ▶
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 border border-[rgba(240,235,227,0.12)] p-4">
          <p className="text-xs text-[#a09a90] leading-relaxed">
            <span className="text-[#f0ebe3] font-bold">Ziel:</span> Drehe das Hexagon, damit farbige Blöcke auf der richtigen Seite landen.{" "}
            <span className="text-[#FFA586]">3 gleichfarbige</span> Blöcke auf einer Seite (oben) oder auf 3 benachbarten Seiten werden gelöscht.{" "}
            Wenn eine Seite{" "}
            <span className="text-[#B01A2B]">{MAX_STACK} Blöcke</span> hat, ist das Spiel vorbei!
          </p>
        </div>
      </div>
    </motion.div>
  );
}
