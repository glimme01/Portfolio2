import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

const CANVAS_W = 400;
const CANVAS_H = 600;
const BIRD_X = 80;
const BIRD_SIZE = 20;
const GRAVITY = 0.25;
const JUMP = -5.5;
const PIPE_W = 50;
const PIPE_GAP = 160;
const PIPE_SPEED = 1.8;

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(loadState("flappy_best") || "0"));

  const birdY = useRef(CANVAS_H / 2);
  const velocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frameScore = useRef(0);
  const animFrame = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const spawnPipe = (): Pipe => ({
    x: CANVAS_W + 20,
    gapY: 80 + Math.random() * (CANVAS_H - PIPE_GAP - 160),
    scored: false,
  });

  const reset = () => {
    birdY.current = CANVAS_H / 2;
    velocity.current = 0;
    pipes.current = [spawnPipe()];
    frameScore.current = 0;
    setScore(0);
    setState("playing");
  };

  const jump = useCallback(() => {
    if (stateRef.current === "idle") {
      reset();
      return;
    }
    if (stateRef.current === "dead") return;
    velocity.current = JUMP;
  }, []);

  // Controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  // Game loop
  useEffect(() => {
    if (state !== "playing") return;

    let frameCount = 0;
    const loop = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      // Physics
      velocity.current += GRAVITY;
      birdY.current += velocity.current;

      // Pipes
      frameCount++;
      if (frameCount % 100 === 0) pipes.current.push(spawnPipe());

      pipes.current.forEach((p) => { p.x -= PIPE_SPEED; });
      pipes.current = pipes.current.filter((p) => p.x > -PIPE_W - 10);

      // Scoring
      pipes.current.forEach((p) => {
        if (!p.scored && p.x + PIPE_W < BIRD_X) {
          p.scored = true;
          frameScore.current++;
          setScore(frameScore.current);
        }
      });

      // Collision
      const bY = birdY.current;
      if (bY < 0 || bY + BIRD_SIZE > CANVAS_H) {
        die();
        return;
      }
      for (const p of pipes.current) {
        if (BIRD_X + BIRD_SIZE > p.x && BIRD_X < p.x + PIPE_W) {
          if (bY < p.gapY || bY + BIRD_SIZE > p.gapY + PIPE_GAP) {
            die();
            return;
          }
        }
      }

      // Draw
      // Background
      ctx.fillStyle = "#141416";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid lines
      ctx.strokeStyle = "rgba(255,165,134,0.04)";
      for (let y = 0; y < CANVAS_H; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // Pipes
      pipes.current.forEach((p) => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad.addColorStop(0, "#2a2a2e");
        grad.addColorStop(1, "#222225");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, CANVAS_H);

        // Pipe edges
        ctx.fillStyle = "rgba(255,165,134,0.15)";
        ctx.fillRect(p.x - 3, p.gapY - 4, PIPE_W + 6, 4);
        ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP, PIPE_W + 6, 4);
      });

      // Bird
      ctx.fillStyle = "#FFA586";
      ctx.shadowColor = "#FFA586";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(BIRD_X + BIRD_SIZE / 2, bY + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eye
      ctx.fillStyle = "#141416";
      ctx.beginPath();
      ctx.arc(BIRD_X + BIRD_SIZE / 2 + 4, bY + BIRD_SIZE / 2 - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      animFrame.current = requestAnimationFrame(loop);
    };

    animFrame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame.current);
  }, [state]);

  const die = () => {
    setState("dead");
    if (frameScore.current > best) {
      setBest(frameScore.current);
      saveState("flappy_best", String(frameScore.current));
    }
  };

  // Draw idle/dead screens
  useEffect(() => {
    if (state === "playing") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#141416";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = "rgba(255,165,134,0.04)";
    for (let y = 0; y < CANVAS_H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Bird
    ctx.fillStyle = "#FFA586";
    ctx.shadowColor = "#FFA586";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2, CANVAS_H / 2 - 30, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#141416";
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 + 7, CANVAS_H / 2 - 35, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [state]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-4">
          <h1 className="font-serif font-black text-3xl mb-1">🐦 Flappy Bird</h1>
          <p className="text-[#a09a90] text-sm">Leertaste / Tippen zum Fliegen</p>
        </div>

        <div className="flex justify-between mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2">
            <span className="text-xs text-[#a09a90]">Best</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{best}</div>
          </div>
        </div>

        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden cursor-pointer"
          style={{ width: CANVAS_W, maxWidth: "100%" }}
          onClick={state === "dead" ? reset : jump}
          onTouchStart={(e) => { e.preventDefault(); if (state === "dead") reset(); else jump(); }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ width: "100%", height: "auto", display: "block" }}
          />

          {state === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/60 backdrop-blur-sm gap-4">
              <button onClick={reset} className="btn-main text-lg">▶ Start</button>
            </div>
          )}

          {state === "dead" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141416]/80 backdrop-blur-sm gap-4">
              <div className="text-3xl font-serif font-black text-[#B01A2B]">Game Over!</div>
              <div className="text-[#FFA586] text-lg font-bold">{score} Punkte</div>
              <button onClick={reset} className="btn-main flex items-center gap-2">
                <RotateCcw size={16} /> Nochmal
              </button>
            </div>
          )}
        </div>

        {/* iPad & Mobile Jump helper */}
        {state === "playing" && (
          <div className="mt-6 flex justify-center">
            <button
              onTouchStart={(e) => { e.preventDefault(); jump(); }}
              onClick={jump}
              className="pill w-full max-w-sm py-4 active:bg-[#FFA586] active:text-[#141416] text-center font-bold text-lg select-none"
            >
              TAP zum Fliegen 🚀
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
