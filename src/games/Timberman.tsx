import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

type Branch = "LEFT" | "RIGHT" | "NONE";
type Phase = "idle" | "playing" | "gameover";

interface Log {
  branch: Branch;
  color: string;
}

const LOG_COLORS = ["#7a5230", "#5c3d1e"];
const BRANCH_COLOR = "#4a2e0a";
const LEAF_COLOR = "#2d6a1f";
const W = 360;
const H = 500;
const LOG_H = 48;
const TRUNK_X = 180;
const TRUNK_W = 50;
const VISIBLE_LOGS = 8;
const BOTTOM_Y = 424;

function randomBranch(prev1: Branch, prev2: Branch): Branch {
  // never 3 same in a row
  if (prev1 !== "NONE" && prev1 === prev2) {
    // force no branch or opposite
    return Math.random() < 0.5 ? "NONE" : (prev1 === "LEFT" ? "RIGHT" : "LEFT");
  }
  const r = Math.random();
  if (r < 0.6) return "NONE";
  return r < 0.8 ? "LEFT" : "RIGHT";
}

function makeLogs(): Log[] {
  const logs: Log[] = [];
  // bottom 2 always safe
  logs.push({ branch: "NONE", color: LOG_COLORS[0] });
  logs.push({ branch: "NONE", color: LOG_COLORS[1] });
  for (let i = 2; i < 14; i++) {
    const b = randomBranch(logs[i - 1].branch, logs[i - 2].branch);
    logs.push({ branch: b, color: LOG_COLORS[i % 2] });
  }
  return logs;
}

interface GS {
  logs: Log[];
  playerSide: "LEFT" | "RIGHT";
  timer: number;
  maxTimer: number;
  score: number;
  chopCount: number;
  phase: Phase;
  lastTime: number;
  chopFlash: number; // frames of white flash on player
}

export default function Timberman() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const gsRef = useRef<GS>({
    logs: makeLogs(),
    playerSide: "LEFT",
    timer: 3000,
    maxTimer: 4000,
    score: 0,
    chopCount: 0,
    phase: "idle",
    lastTime: 0,
    chopFlash: 0,
  });

  const [highScore, setHighScore] = useState(() => Number(loadState("timberman_high") || "0"));
  const [displayScore, setDisplayScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gsRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, W, H);

    // Timer bar
    if (gs.phase === "playing") {
      const pct = Math.max(0, gs.timer / gs.maxTimer);
      const barColor = pct > 0.4 ? "#FFA586" : "#B01A2B";
      ctx.fillStyle = "#2a2a2e";
      ctx.fillRect(0, 0, W, 8);
      ctx.fillStyle = barColor;
      ctx.fillRect(0, 0, W * pct, 8);
    }

    // Draw logs
    for (let i = 0; i < VISIBLE_LOGS; i++) {
      const log = gs.logs[i];
      const logY = BOTTOM_Y - i * LOG_H;

      // Log body
      ctx.fillStyle = log.color;
      ctx.fillRect(TRUNK_X - TRUNK_W / 2, logY - LOG_H, TRUNK_W, LOG_H);
      // Wood grain
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      for (let g = 1; g <= 3; g++) {
        ctx.beginPath();
        ctx.moveTo(TRUNK_X - TRUNK_W / 2, logY - LOG_H + g * (LOG_H / 4));
        ctx.lineTo(TRUNK_X + TRUNK_W / 2, logY - LOG_H + g * (LOG_H / 4));
        ctx.stroke();
      }
      // Log outline
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(TRUNK_X - TRUNK_W / 2, logY - LOG_H, TRUNK_W, LOG_H);

      // Branch
      if (log.branch !== "NONE") {
        const bx = log.branch === "LEFT" ? TRUNK_X - TRUNK_W / 2 - 60 : TRUNK_X + TRUNK_W / 2;
        const by = logY - LOG_H + 12;
        ctx.fillStyle = BRANCH_COLOR;
        ctx.fillRect(bx, by, 60, 14);
        // leaf
        const leafX = log.branch === "LEFT" ? bx : bx + 60;
        ctx.fillStyle = LEAF_COLOR;
        ctx.beginPath();
        ctx.arc(leafX, by + 7, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw player
    const px = gs.playerSide === "LEFT" ? 85 : 275;
    const py = BOTTOM_Y;
    const flashColor = gs.chopFlash > 0 ? "#ffffff" : "#FFA586";

    // Body
    ctx.fillStyle = flashColor;
    ctx.fillRect(px - 14, py - 44, 28, 32);
    // Head
    ctx.fillStyle = "#f0ebe3";
    ctx.beginPath();
    ctx.arc(px, py - 54, 12, 0, Math.PI * 2);
    ctx.fill();
    // Hat
    ctx.fillStyle = "#2a2a2e";
    ctx.fillRect(px - 13, py - 67, 26, 8);
    ctx.fillRect(px - 9, py - 76, 18, 10);
    // Legs
    ctx.fillStyle = "#3a3028";
    ctx.fillRect(px - 12, py - 14, 10, 14);
    ctx.fillRect(px + 2, py - 14, 10, 14);
    // Axe
    ctx.strokeStyle = "#a09a90";
    ctx.lineWidth = 3;
    const axeDir = gs.playerSide === "LEFT" ? 1 : -1;
    const axeX = px + axeDir * 20;
    const flashFrame = gs.chopFlash > 0;
    ctx.beginPath();
    ctx.moveTo(px + axeDir * 14, py - 38);
    ctx.lineTo(axeX, py - (flashFrame ? 48 : 30));
    ctx.stroke();
    ctx.fillStyle = flashFrame ? "#FFA586" : "#888";
    ctx.beginPath();
    ctx.arc(axeX, py - (flashFrame ? 48 : 30), 8, 0, Math.PI * 2);
    ctx.fill();

    if (gs.chopFlash > 0) gs.chopFlash--;
  }, []);

  const gameLoop = useCallback((ts: number) => {
    const gs = gsRef.current;
    if (gs.phase !== "playing") return;

    const dt = gs.lastTime ? ts - gs.lastTime : 16;
    gs.lastTime = ts;

    gs.timer -= dt;
    if (gs.timer <= 0) {
      gs.phase = "gameover";
      setPhase("gameover");
      return;
    }

    drawFrame();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [drawFrame]);

  const startRAF = useCallback(() => {
    rafRef.current = requestAnimationFrame((ts) => {
      gsRef.current.lastTime = ts;
      rafRef.current = requestAnimationFrame(gameLoop);
    });
  }, [gameLoop]);

  const chop = useCallback((side: "LEFT" | "RIGHT") => {
    const gs = gsRef.current;

    if (gs.phase === "gameover") return;

    if (gs.phase === "idle") {
      // First chop starts game
      gs.phase = "playing";
      gs.timer = 3000;
      setPhase("playing");
      startRAF();
    }

    // Check branch collision
    if (gs.logs[0].branch === side) {
      gs.phase = "gameover";
      cancelAnimationFrame(rafRef.current);
      drawFrame();
      setPhase("gameover");
      const hs = Number(loadState("timberman_high") || "0");
      if (gs.score > hs) {
        saveState("timberman_high", String(gs.score));
        setHighScore(gs.score);
      }
      return;
    }

    // Remove bottom log, add new at top
    gs.logs.shift();
    const last = gs.logs[gs.logs.length - 1];
    const secondLast = gs.logs[gs.logs.length - 2];
    const newBranch = randomBranch(last.branch, secondLast.branch);
    gs.logs.push({ branch: newBranch, color: LOG_COLORS[gs.logs.length % 2] });

    gs.playerSide = side === "LEFT" ? "RIGHT" : "LEFT";
    gs.score++;
    gs.chopCount++;
    gs.chopFlash = 4;

    // Add time
    gs.timer = Math.min(gs.timer + 500, gs.maxTimer);

    // Speed up every 10 chops
    if (gs.chopCount % 10 === 0) {
      gs.maxTimer = Math.max(1200, gs.maxTimer - 100);
    }

    setDisplayScore(gs.score);
    drawFrame();
  }, [drawFrame, startRAF]);

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    gsRef.current = {
      logs: makeLogs(),
      playerSide: "LEFT",
      timer: 3000,
      maxTimer: 4000,
      score: 0,
      chopCount: 0,
      phase: "idle",
      lastTime: 0,
      chopFlash: 0,
    };
    setDisplayScore(0);
    setPhase("idle");
    drawFrame();
  }, [drawFrame]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        chop("LEFT");
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        chop("RIGHT");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chop]);

  // Canvas click/touch
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    chop(x < rect.width / 2 ? "LEFT" : "RIGHT");
  }, [chop]);

  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    chop(x < rect.width / 2 ? "LEFT" : "RIGHT");
  }, [chop]);

  // Initial draw
  useEffect(() => {
    drawFrame();
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">🪓 Timberman</h1>
          <p className="text-[#a09a90] text-sm">← → hacken · Äste ausweichen!</p>
        </div>

        <div className="flex justify-between mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{displayScore}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
        </div>

        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden"
          style={{ maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: "100%", height: "auto", display: "block" }}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouch}
          />
          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/80 gap-4">
              <div className="text-5xl">🪓</div>
              <div className="font-serif text-2xl italic text-[#f0ebe3]">Drücke ← oder →</div>
              <p className="text-[#a09a90] text-sm">um zu starten · Äste ausweichen!</p>
            </div>
          )}
          {phase === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/85 gap-4">
              <div className="text-4xl">☠️</div>
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-xl font-bold">{displayScore} Hiebe</div>
              <button onClick={restart} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => chop("LEFT")}
            onTouchStart={(e) => { e.preventDefault(); chop("LEFT"); }}
            className="pill py-5 text-2xl justify-center select-none"
          >
            🪓 ←
          </button>
          <button
            onClick={() => chop("RIGHT")}
            onTouchStart={(e) => { e.preventDefault(); chop("RIGHT"); }}
            className="pill py-5 text-2xl justify-center select-none"
          >
            → 🪓
          </button>
        </div>

        <p className="text-center text-xs text-[#a09a90] mt-3">
          Tastatur: ← A | → D · Touch: Canvas-Hälfte tippen
        </p>
      </div>
    </motion.div>
  );
}
