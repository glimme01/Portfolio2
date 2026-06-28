import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { loadState, saveState } from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 400;
const H = 560;
const BALL_R = 8;
const COLS = 8;
const ROWS = 6;
const BRICK_GAP = 4;
const BRICK_W = 45;
const BRICK_H = 20;
const BRICKS_START_Y = 40;
const PADDLE_H = 12;
const PADDLE_Y = 530;
const PADDLE_W_NORMAL = 90;
const PADDLE_W_WIDE = 140;
const WIDE_DURATION = 8000; // ms
const POWERUP_R = 12;
const POWERUP_SPEED = 2;

const ROW_COLORS = [
  '#B01A2B', // row 0 – red, 5pts
  '#c0392b', // row 1 – dark red, 4pts
  '#FFA586', // row 2 – orange, 3pts
  '#f0ebe3', // row 3 – cream, 2pts
  '#4a9eff', // row 4 – blue, 1pt
  '#4aff9e', // row 5 – green, 1pt
];

const ROW_POINTS = [5, 4, 3, 2, 1, 1];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'playing' | 'gameover' | 'levelup';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Paddle {
  x: number; // center X
}

interface PowerUp {
  x: number;
  y: number;
  type: 'W' | 'S';
}

interface GameState {
  ball: Ball;
  paddle: Paddle;
  bricks: boolean[][]; // [row][col] true = alive
  lives: number;
  score: number;
  level: number;
  phase: Phase;
  powerup: PowerUp | null;
  powerupTimer: number; // ms remaining for active effect
  wideActive: boolean;
  slowActive: boolean;
  speedMult: number;
  keys: { left: boolean; right: boolean };
  lastTime: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBricks(): boolean[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(true));
}

function brickRect(row: number, col: number) {
  const totalBrickW = COLS * BRICK_W + (COLS - 1) * BRICK_GAP;
  const offsetX = (W - totalBrickW) / 2;
  const x = offsetX + col * (BRICK_W + BRICK_GAP);
  const y = BRICKS_START_Y + row * (BRICK_H + BRICK_GAP);
  return { x, y, w: BRICK_W, h: BRICK_H };
}

function initBall(speedMult: number): Ball {
  return {
    x: W / 2,
    y: 420,
    vx: 3 * speedMult,
    vy: -4 * speedMult,
  };
}

function clampPaddle(cx: number, paddleW: number): number {
  return Math.max(paddleW / 2, Math.min(W - paddleW / 2, cx));
}

function darken(hex: string): string {
  // Return a slightly darkened version of the color for brick border
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 40);
  const g = Math.max(0, ((n >> 8) & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `rgb(${r},${g},${b})`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);

  const [highScore, setHighScore] = useState<number>(() =>
    Number(loadState('breakout_high') || '0'),
  );
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');

  // ── Build initial game state ──────────────────────────────────────────────

  const buildInitialState = useCallback((): GameState => {
    return {
      ball: initBall(1),
      paddle: { x: W / 2 },
      bricks: makeBricks(),
      lives: 3,
      score: 0,
      level: 1,
      phase: 'playing',
      powerup: null,
      powerupTimer: 0,
      wideActive: false,
      slowActive: false,
      speedMult: 1,
      keys: { left: false, right: false },
      lastTime: performance.now(),
    };
  }, []);

  // ── Render a single frame ─────────────────────────────────────────────────

  const render = useCallback((gs: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, W, H);

    // 2. Bricks – crisp, NO shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!gs.bricks[r][c]) continue;
        const { x, y, w, h } = brickRect(r, c);
        const color = ROW_COLORS[r];
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        // 1px darker border
        ctx.strokeStyle = darken(color);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
    }

    // 3. Power-up falling circle
    if (gs.powerup) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      const puColor = gs.powerup.type === 'W' ? '#4aff9e' : '#4a9eff';
      ctx.beginPath();
      ctx.arc(gs.powerup.x, gs.powerup.y, POWERUP_R, 0, Math.PI * 2);
      ctx.fillStyle = puColor;
      ctx.fill();
      ctx.fillStyle = '#141416';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gs.powerup.type, gs.powerup.x, gs.powerup.y);
    }

    // 4. Paddle
    const paddleW = gs.wideActive ? PADDLE_W_WIDE : PADDLE_W_NORMAL;
    const px = gs.paddle.x - paddleW / 2;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#f0ebe3';
    ctx.fillRect(px, PADDLE_Y, paddleW, PADDLE_H);

    // 5. Ball with glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFA586';
    ctx.beginPath();
    ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#FFA586';
    ctx.fill();
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }, []);

  // ── Game loop tick ────────────────────────────────────────────────────────

  const tick = useCallback(
    (timestamp: number) => {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;

      const dt = Math.min(timestamp - gs.lastTime, 50); // cap at 50ms
      gs.lastTime = timestamp;

      const paddleW = gs.wideActive ? PADDLE_W_WIDE : PADDLE_W_NORMAL;

      // Keyboard paddle movement
      if (gs.keys.left) gs.paddle.x -= 8;
      if (gs.keys.right) gs.paddle.x += 8;
      gs.paddle.x = clampPaddle(gs.paddle.x, paddleW);

      // Power-up timer
      if (gs.powerupTimer > 0) {
        gs.powerupTimer -= dt;
        if (gs.powerupTimer <= 0) {
          gs.wideActive = false;
          gs.slowActive = false;
          gs.powerupTimer = 0;
        }
      }

      // Move ball
      const speed = gs.slowActive ? gs.speedMult * 0.6 : gs.speedMult;
      const stepX = gs.ball.vx * speed;
      const stepY = gs.ball.vy * speed;
      gs.ball.x += stepX;
      gs.ball.y += stepY;

      // Wall collisions
      if (gs.ball.x - BALL_R < 0) {
        gs.ball.x = BALL_R;
        gs.ball.vx = Math.abs(gs.ball.vx);
      }
      if (gs.ball.x + BALL_R > W) {
        gs.ball.x = W - BALL_R;
        gs.ball.vx = -Math.abs(gs.ball.vx);
      }
      // Ceiling
      if (gs.ball.y - BALL_R < 0) {
        gs.ball.y = BALL_R;
        gs.ball.vy = Math.abs(gs.ball.vy);
      }

      // Ball-paddle collision
      if (
        gs.ball.y + BALL_R >= PADDLE_Y &&
        gs.ball.y + BALL_R <= PADDLE_Y + PADDLE_H + Math.abs(gs.ball.vy * speed) &&
        gs.ball.vy > 0
      ) {
        const leftEdge = gs.paddle.x - paddleW / 2;
        const rightEdge = gs.paddle.x + paddleW / 2;
        if (gs.ball.x >= leftEdge - BALL_R && gs.ball.x <= rightEdge + BALL_R) {
          const hitPos = (gs.ball.x - gs.paddle.x) / (paddleW / 2); // -1 to 1
          gs.ball.vx = Math.max(-5, Math.min(5, hitPos * 5));
          gs.ball.vy = -Math.abs(gs.ball.vy);
          gs.ball.y = PADDLE_Y - BALL_R;
        }
      }

      // Ball-brick collision (AABB)
      let bricksLeft = 0;
      outer: for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!gs.bricks[r][c]) continue;
          bricksLeft++;
          const { x, y, w, h } = brickRect(r, c);
          const bx = gs.ball.x;
          const by = gs.ball.y;

          // Expand brick by ball radius for collision
          if (
            bx >= x - BALL_R &&
            bx <= x + w + BALL_R &&
            by >= y - BALL_R &&
            by <= y + h + BALL_R
          ) {
            gs.bricks[r][c] = false;
            bricksLeft--;
            gs.score += ROW_POINTS[r];

            // Determine bounce axis
            const overlapLeft = bx - (x - BALL_R);
            const overlapRight = x + w + BALL_R - bx;
            const overlapTop = by - (y - BALL_R);
            const overlapBottom = y + h + BALL_R - by;

            const minH = Math.min(overlapLeft, overlapRight);
            const minV = Math.min(overlapTop, overlapBottom);

            if (minV <= minH) {
              gs.ball.vy = -gs.ball.vy;
            } else {
              gs.ball.vx = -gs.ball.vx;
            }

            // Spawn power-up (20% chance, only if none active falling)
            if (!gs.powerup && Math.random() < 0.2) {
              const type: 'W' | 'S' = Math.random() < 0.5 ? 'W' : 'S';
              gs.powerup = {
                x: x + w / 2,
                y: y + h / 2,
                type,
              };
            }

            // Update React score sparingly
            setScore(gs.score);
            break outer;
          }
        }
      }

      // Move falling power-up
      if (gs.powerup) {
        gs.powerup.y += POWERUP_SPEED;
        // Check paddle collection
        const leftEdge = gs.paddle.x - paddleW / 2;
        const rightEdge = gs.paddle.x + paddleW / 2;
        if (
          gs.powerup.y + POWERUP_R >= PADDLE_Y &&
          gs.powerup.y - POWERUP_R <= PADDLE_Y + PADDLE_H &&
          gs.powerup.x >= leftEdge &&
          gs.powerup.x <= rightEdge
        ) {
          if (gs.powerup.type === 'W') {
            gs.wideActive = true;
            gs.slowActive = false;
          } else {
            gs.slowActive = true;
            gs.wideActive = false;
          }
          gs.powerupTimer = WIDE_DURATION;
          gs.powerup = null;
        }
        // Off screen
        if (gs.powerup && gs.powerup.y > H + POWERUP_R) {
          gs.powerup = null;
        }
      }

      // Ball fell below canvas
      if (gs.ball.y - BALL_R > H) {
        gs.lives--;
        setLives(gs.lives);
        if (gs.lives <= 0) {
          gs.phase = 'gameover';
          setPhase('gameover');
          const newHigh = Math.max(gs.score, highScore);
          if (newHigh > highScore) {
            setHighScore(newHigh);
            saveState('breakout_high', String(newHigh));
          }
          render(gs);
          return;
        }
        // Reset ball, keep everything else
        gs.ball = initBall(gs.speedMult);
        gs.powerup = null;
        gs.wideActive = false;
        gs.slowActive = false;
        gs.powerupTimer = 0;
      }

      // Level complete
      if (bricksLeft === 0) {
        gs.phase = 'levelup';
        gs.level++;
        gs.speedMult *= 1.1;
        setLevel(gs.level);
        setPhase('levelup');
        render(gs);

        setTimeout(() => {
          if (gsRef.current) {
            gsRef.current.bricks = makeBricks();
            gsRef.current.ball = initBall(gsRef.current.speedMult);
            gsRef.current.powerup = null;
            gsRef.current.wideActive = false;
            gsRef.current.slowActive = false;
            gsRef.current.powerupTimer = 0;
            gsRef.current.phase = 'playing';
            gsRef.current.lastTime = performance.now();
            setPhase('playing');
            rafRef.current = requestAnimationFrame(tick);
          }
        }, 1500);
        return;
      }

      render(gs);
      rafRef.current = requestAnimationFrame(tick);
    },
    [highScore, render],
  );

  // ── Start / Restart ───────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const gs = buildInitialState();
    gsRef.current = gs;
    setScore(0);
    setLives(3);
    setLevel(1);
    setPhase('playing');
    render(gs);
    rafRef.current = requestAnimationFrame(tick);
  }, [buildInitialState, render, tick]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Mouse / touch / keyboard controls ────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const rawX = (e.clientX - rect.left) * scaleX;
      const paddleW = gs.wideActive ? PADDLE_W_WIDE : PADDLE_W_NORMAL;
      gs.paddle.x = clampPaddle(rawX, paddleW);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const touch = e.touches[0];
      const rawX = (touch.clientX - rect.left) * scaleX;
      const paddleW = gs.wideActive ? PADDLE_W_WIDE : PADDLE_W_NORMAL;
      gs.paddle.x = clampPaddle(rawX, paddleW);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (!gs) return;
      if (e.key === 'ArrowLeft') gs.keys.left = true;
      if (e.key === 'ArrowRight') gs.keys.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const gs = gsRef.current;
      if (!gs) return;
      if (e.key === 'ArrowLeft') gs.keys.left = false;
      if (e.key === 'ArrowRight') gs.keys.right = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── On-screen button refs ─────────────────────────────────────────────────

  const leftHeld = useRef(false);
  const rightHeld = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const gs = gsRef.current;
      if (!gs || gs.phase !== 'playing') return;
      const paddleW = gs.wideActive ? PADDLE_W_WIDE : PADDLE_W_NORMAL;
      if (leftHeld.current) gs.paddle.x = clampPaddle(gs.paddle.x - 8, paddleW);
      if (rightHeld.current) gs.paddle.x = clampPaddle(gs.paddle.x + 8, paddleW);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // ── Render initial canvas background once ─────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, W, H);
  }, []);

  // ─── Hearts helper ──────────────────────────────────────────────────────

  const heartsDisplay = Array.from({ length: 3 }, (_, i) => (
    <span
      key={i}
      style={{ opacity: i < lives ? 1 : 0.2, fontSize: '1.1rem', lineHeight: 1 }}
    >
      ❤️
    </span>
  ));

  // ─── JSX ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#141416',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '24px 16px 32px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Link
          to="/games"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#a09a90',
            textDecoration: 'none',
            fontSize: '0.85rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) =>
            (e.currentTarget.style.color = '#f0ebe3')
          }
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) =>
            (e.currentTarget.style.color = '#a09a90')
          }
        >
          <ArrowLeft size={16} /> Games
        </Link>
        <span
          style={{
            fontSize: '0.75rem',
            color: '#a09a90',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Best: {highScore}
        </span>
      </div>

      {/* HUD */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          padding: '6px 0',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>{heartsDisplay}</div>
        <span
          style={{
            color: '#f0ebe3',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '0.04em',
          }}
        >
          {score}
        </span>
        <span
          style={{
            color: '#a09a90',
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Lvl {level}
        </span>
      </div>

      {/* Canvas container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          border: '1px solid rgba(240,235,227,0.12)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#141416',
          lineHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' }}
        />

        {/* Idle overlay */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(20,20,22,0.88)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h1
                  className="font-serif"
                  style={{
                    color: '#FFA586',
                    fontSize: '2.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    margin: 0,
                    textShadow: '0 0 24px #FFA58680',
                  }}
                >
                  BREAKOUT
                </h1>
                <p style={{ color: '#a09a90', fontSize: '0.82rem', marginTop: 6 }}>
                  Move your mouse • Arrow keys • Touch
                </p>
              </div>

              {/* Power-up legend */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '10px 18px',
                  background: 'rgba(240,235,227,0.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(240,235,227,0.12)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#4aff9e',
                      color: '#141416',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    W
                  </span>
                  <span style={{ color: '#a09a90', fontSize: '0.78rem' }}>Wide paddle</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#4a9eff',
                      color: '#141416',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    S
                  </span>
                  <span style={{ color: '#a09a90', fontSize: '0.78rem' }}>Slow ball</span>
                </div>
              </div>

              <button
                className="btn-main"
                onClick={startGame}
                style={{
                  background: '#FFA586',
                  color: '#141416',
                  border: 'none',
                  borderRadius: 999,
                  padding: '12px 36px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 0 20px #FFA58650',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 32px #FFA58680';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px #FFA58650';
                }}
              >
                Starten
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over overlay */}
        <AnimatePresence>
          {phase === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(20,20,22,0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <h2
                style={{
                  color: '#B01A2B',
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: '0.1em',
                }}
              >
                GAME OVER
              </h2>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#f0ebe3', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                  {score}
                </p>
                <p style={{ color: '#a09a90', fontSize: '0.78rem', margin: '4px 0 0' }}>
                  Best: {highScore}
                </p>
              </div>
              <button
                onClick={startGame}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#FFA586',
                  color: '#141416',
                  border: 'none',
                  borderRadius: 999,
                  padding: '10px 28px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.transform = 'scale(1.05)')
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                <RotateCcw size={15} /> Nochmal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level Up overlay */}
        <AnimatePresence>
          {phase === 'levelup' && (
            <motion.div
              key="levelup"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(20,20,22,0.80)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                pointerEvents: 'none',
              }}
            >
              <p style={{ color: '#4aff9e', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
                Level {level}! ▶
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* On-screen controls */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 20,
          width: '100%',
          maxWidth: 400,
          justifyContent: 'center',
        }}
      >
        {(
          [
            { label: '◀', dir: 'left' },
            { label: '▶', dir: 'right' },
          ] as const
        ).map(({ label, dir }) => (
          <button
            key={dir}
            onPointerDown={() => {
              if (dir === 'left') leftHeld.current = true;
              else rightHeld.current = true;
              const gs = gsRef.current;
              if (gs) gs.keys[dir === 'left' ? 'left' : 'right'] = true;
            }}
            onPointerUp={() => {
              if (dir === 'left') leftHeld.current = false;
              else rightHeld.current = false;
              const gs = gsRef.current;
              if (gs) gs.keys[dir === 'left' ? 'left' : 'right'] = false;
            }}
            onPointerLeave={() => {
              if (dir === 'left') leftHeld.current = false;
              else rightHeld.current = false;
              const gs = gsRef.current;
              if (gs) gs.keys[dir === 'left' ? 'left' : 'right'] = false;
            }}
            style={{
              flex: 1,
              maxWidth: 120,
              padding: '14px 0',
              background: 'rgba(240,235,227,0.07)',
              border: '1px solid rgba(240,235,227,0.12)',
              borderRadius: 10,
              color: '#f0ebe3',
              fontSize: '1.4rem',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
              transition: 'background 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
