import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadState, saveState } from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const CX = 200;
const CY = 220;
const HEX_R = 70;
const BLOCK_SIZE = 22;
const FALL_DISTANCE = 210;
const COLORS = ['#FFA586', '#B01A2B', '#f0ebe3', '#4a9eff', '#4aff9e', '#ff4a9e'];
const MAX_STACK = 4;
const BASE_SPEED = 2.5; // px per frame

// ─── Hex math (pointy-top) ────────────────────────────────────────────────────
function hexCorner(i: number): { x: number; y: number } {
  const ang = ((i * 60 - 90) * Math.PI) / 180;
  return { x: CX + HEX_R * Math.cos(ang), y: CY + HEX_R * Math.sin(ang) };
}

function faceMid(i: number): { x: number; y: number } {
  const c0 = hexCorner(i);
  const c1 = hexCorner((i + 1) % 6);
  return { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
}

function faceNormal(i: number): { nx: number; ny: number } {
  const ang = (i * 60 * Math.PI) / 180;
  return { nx: Math.sin(ang), ny: -Math.cos(ang) };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FallingBlock {
  lane: number;
  color: string;
  dist: number;
}

interface ClearAnim {
  lane: number;
  frames: number;
}

interface GameState {
  stacks: string[][];
  falling: FallingBlock | null;
  targetLane: number;
  score: number;
  blocksPlaced: number;
  speed: number;
  clearAnims: ClearAnim[];
  gameOver: boolean;
  started: boolean;
  rafId: number | null;
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function spawnBlock(lane: number): FallingBlock {
  return { lane, color: randomColor(), dist: FALL_DISTANCE };
}

export default function Hextris() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(loadState('hextris_high') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gsRef = useRef<GameState>({
    stacks: Array.from({ length: 6 }, () => []),
    falling: null,
    targetLane: 0,
    score: 0,
    blocksPlaced: 0,
    speed: BASE_SPEED,
    clearAnims: [],
    gameOver: false,
    started: false,
    rafId: null,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gsRef.current;

    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 400, 500);

    // Lane guides
    for (let i = 0; i < 6; i++) {
      const fm = faceMid(i);
      const { nx, ny } = faceNormal(i);
      const isTarget = i === gs.targetLane;
      ctx.save();
      ctx.strokeStyle = isTarget ? 'rgba(255,165,134,0.35)' : 'rgba(240,235,227,0.07)';
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(fm.x, fm.y);
      ctx.lineTo(fm.x + nx * FALL_DISTANCE, fm.y + ny * FALL_DISTANCE);
      ctx.stroke();
      ctx.restore();
    }

    // Hex shape
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(i);
      i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y);
    }
    ctx.closePath();
    ctx.fillStyle = '#1a1a1e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,235,227,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Highlight target face
    {
      const i = gs.targetLane;
      const c0 = hexCorner(i);
      const c1 = hexCorner((i + 1) % 6);
      ctx.save();
      ctx.strokeStyle = '#FFA586';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#FFA586';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(c0.x, c0.y);
      ctx.lineTo(c1.x, c1.y);
      ctx.stroke();
      ctx.restore();

      // Arrow
      const fm = faceMid(i);
      const { nx, ny } = faceNormal(i);
      const arrowTip = { x: fm.x + nx * 28, y: fm.y + ny * 28 };
      const arrowBase = { x: fm.x + nx * 48, y: fm.y + ny * 48 };
      const perp = { x: -ny * 7, y: nx * 7 };
      ctx.save();
      ctx.fillStyle = '#FFA586';
      ctx.shadowColor = '#FFA586';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(arrowTip.x, arrowTip.y);
      ctx.lineTo(arrowBase.x + perp.x, arrowBase.y + perp.y);
      ctx.lineTo(arrowBase.x - perp.x, arrowBase.y - perp.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Stacked blocks
    for (let i = 0; i < 6; i++) {
      const stack = gs.stacks[i];
      const fm = faceMid(i);
      const { nx, ny } = faceNormal(i);
      const clearAnim = gs.clearAnims.find((a) => a.lane === i);

      for (let s = 0; s < stack.length; s++) {
        const dist = BLOCK_SIZE * s + 6;
        const bx = fm.x + nx * dist;
        const by = fm.y + ny * dist;
        const isFlashing = clearAnim !== undefined;
        const color = isFlashing ? '#ffffff' : stack[s];
        const ang = Math.atan2(ny, nx);

        ctx.save();
        ctx.fillStyle = color;
        if (!isFlashing) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
        }
        ctx.translate(bx, by);
        ctx.rotate(ang);
        ctx.fillRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
        ctx.restore();
      }
    }

    // Falling block
    if (gs.falling) {
      const { lane, color, dist } = gs.falling;
      const fm = faceMid(lane);
      const { nx, ny } = faceNormal(lane);
      const bx = fm.x + nx * dist;
      const by = fm.y + ny * dist;
      const ang = Math.atan2(ny, nx);

      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.translate(bx, by);
      ctx.rotate(ang);
      ctx.fillRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
      ctx.restore();
    }

    // Score inside hex
    ctx.save();
    ctx.fillStyle = 'rgba(240,235,227,0.5)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(gs.score), CX, CY);
    ctx.restore();
  }, []);

  const gameLoop = useCallback(() => {
    const gs = gsRef.current;
    if (gs.gameOver || !gs.started) return;

    gs.clearAnims = gs.clearAnims
      .map((a) => ({ ...a, frames: a.frames - 1 }))
      .filter((a) => a.frames > 0);

    if (gs.falling) {
      gs.falling.dist -= gs.speed;

      if (gs.falling.dist <= 0) {
        const lane = gs.falling.lane;
        const color = gs.falling.color;
        gs.falling = null;
        gs.stacks[lane].push(color);
        gs.blocksPlaced += 1;
        gs.speed = BASE_SPEED + Math.floor(gs.blocksPlaced / 10) * 0.5;

        let didClear = checkClear(gs, lane);

        if (!didClear && gs.stacks[lane].length >= MAX_STACK) {
          gs.gameOver = true;
          setGameOver(true);
          setScore(gs.score);
          draw();
          return;
        }

        if (!gs.gameOver) {
          gs.falling = spawnBlock(gs.targetLane);
        }

        setScore(gs.score);
      }
    } else {
      gs.falling = spawnBlock(gs.targetLane);
    }

    draw();
    gs.rafId = requestAnimationFrame(gameLoop);
  }, [draw]);

  function checkClear(gs: GameState, lane: number): boolean {
    const stack = gs.stacks[lane];
    if (stack.length < 3) return false;
    const top = stack.slice(-3);
    if (top[0] === top[1] && top[1] === top[2]) {
      gs.stacks[lane] = stack.slice(0, -3);
      gs.score += 30;
      gs.clearAnims.push({ lane, frames: 12 });
      return true;
    }
    return false;
  }

  const rotateLane = useCallback((dir: number) => {
    const gs = gsRef.current;
    if (gs.gameOver || !gs.started) return;
    gs.targetLane = ((gs.targetLane + dir + 6) % 6);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const gs = gsRef.current;
    if (!gs.started || gs.gameOver) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    rotateLane(x < rect.width / 2 ? -1 : 1);
  }, [rotateLane]);

  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const gs = gsRef.current;
    if (!gs.started || gs.gameOver) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    rotateLane(x < rect.width / 2 ? -1 : 1);
  }, [rotateLane]);

  const startGame = useCallback(() => {
    const gs = gsRef.current;
    if (gs.rafId) cancelAnimationFrame(gs.rafId);

    gs.stacks = Array.from({ length: 6 }, () => []);
    gs.falling = null;
    gs.targetLane = 0;
    gs.score = 0;
    gs.blocksPlaced = 0;
    gs.speed = BASE_SPEED;
    gs.clearAnims = [];
    gs.gameOver = false;
    gs.started = true;

    setScore(0);
    setGameOver(false);
    setStarted(true);

    gs.falling = spawnBlock(0);
    gs.rafId = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (!gs.started || gs.gameOver) {
        if (e.key === 'Enter' || e.key === ' ') startGame();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') rotateLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rotateLane(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame, rotateLane]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (gameOver) {
      const newHs = Math.max(score, highScore);
      setHighScore(newHs);
      saveState('hextris_high', String(newHs));
    }
  }, [gameOver, score, highScore]);

  useEffect(() => {
    return () => {
      const gs = gsRef.current;
      if (gs.rafId) cancelAnimationFrame(gs.rafId);
    };
  }, []);

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
          <h1 className="font-serif font-black text-3xl mb-1">🔷 Hextris</h1>
          <p className="text-[#a09a90] text-sm">← → Pfeiltasten zum Drehen</p>
        </div>

        <div className="flex justify-between mb-4">
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
        </div>

        <div
          className="relative mx-auto border border-[rgba(240,235,227,0.12)] overflow-hidden rounded"
          style={{ maxWidth: '100%', cursor: 'pointer' }}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouch}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={500}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />

          {!started && !gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'rgba(20,20,22,0.88)' }}
            >
              <p className="font-serif font-black text-3xl text-[#f0ebe3] mb-2">🔷 Hextris</p>
              <p className="text-[#a09a90] text-sm mb-6 text-center px-4">
                Drehe das Hex und lass Blöcke auf den richtigen Seiten landen.<br />
                3 gleiche Farben → Combo!
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="btn-main px-8 py-3 text-lg font-bold rounded-full"
                style={{ background: '#FFA586', color: '#141416' }}
              >
                Spielen
              </button>
            </div>
          )}

          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'rgba(20,20,22,0.88)' }}
            >
              <p className="font-serif font-black text-3xl text-[#B01A2B] mb-1">Game Over</p>
              <p className="text-[#f0ebe3] text-lg mb-1">Score: <span className="text-[#FFA586] font-bold">{score}</span></p>
              <p className="text-[#a09a90] text-sm mb-6">Highscore: {highScore}</p>
              <button
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="btn-main px-8 py-3 text-lg font-bold rounded-full"
                style={{ background: '#FFA586', color: '#141416' }}
              >
                Nochmal
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => rotateLane(-1)}
            className="pill py-4 text-xl justify-center"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            ◀ Links
          </button>
          <button
            onClick={() => rotateLane(1)}
            className="pill py-4 text-xl justify-center"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            Rechts ▶
          </button>
        </div>

        <p className="text-center text-xs text-[#a09a90] mt-3">
          3 gleiche Farben auf einer Seite → Combo! Max 4 Blöcke pro Seite.
        </p>
      </div>
    </motion.div>
  );
}
