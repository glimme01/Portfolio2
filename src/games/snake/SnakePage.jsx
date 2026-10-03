import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GRID, CELL, CANVAS_SIZE, DIR,
  createInitialState, restoreState, setDirection,
  step, goldAppleBlink, serializeState, tickInterval,
} from './engine.js';
import { createBotState, stepBot } from './botEngine.js';
import { loadGameState, saveGameState, deleteGameState } from '../../lib/save.js';
import { getSoundEnabled, setSoundEnabled, getLastName } from '../../lib/prefs.js';
import HighscoreList from '../../components/HighscoreList.jsx';
import SaveIndicator from '../../components/SaveIndicator.jsx';

// === WEB AUDIO API — prozedurale Retro-Sounds ===
function createAudioCtx() {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || window.webkitAudioContext)();
}

function playBeep(ctx, freq = 440, dur = 0.06, type = 'square') {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playAppleSound(ctx) { playBeep(ctx, 660, 0.08, 'square'); }

function playGoldSound(ctx) {
  if (!ctx) return;
  try {
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    });
  } catch {}
}

function playDeathSound(ctx) {
  if (!ctx) return;
  try {
    [440, 330, 220, 110].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.start(t); osc.stop(t + 0.14);
    });
  } catch {}
}

// === PROCEDURAL CANVAS RENDERER ===
function renderFrame(canvas, state, now, isWaiting = false, botState = null) {
  if (!canvas || !state) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. Hintergrund
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Subtiles Arcade-Gitter
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CANVAS_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(CANVAS_SIZE, i * CELL); ctx.stroke();
  }

  // 2. Bot-Schlange (falls aktiv und lebendig)
  if (botState && botState.alive) {
    botState.snake.slice(1).forEach((seg, index) => {
      const px = seg.x * CELL, py = seg.y * CELL;
      ctx.fillStyle = '#004d40';
      ctx.fillRect(px, py, CELL, CELL);
      ctx.fillStyle = index % 2 === 0 ? '#00b4d8' : '#0077b6';
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(px + 2, py + 2, 2, 2);
    });

    const bHead = botState.snake[0];
    if (bHead) {
      const hx = bHead.x * CELL, hy = bHead.y * CELL;
      ctx.fillStyle = '#005f73';
      ctx.fillRect(hx, hy, CELL, CELL);
      ctx.fillStyle = '#00e5ff'; // Leuchtendes Cyan
      ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);

      // Rote Roboter-Augen
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(hx + 3, hy + 4, 3, 3);
      ctx.fillRect(hx + 10, hy + 4, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx + 4, hy + 5, 1, 1);
      ctx.fillRect(hx + 11, hy + 5, 1, 1);
    }
  }

  // 3. Schlangenkörper (Gold-Nuancen mit Segment-Glow)
  state.snake.slice(1).forEach((seg, index) => {
    const px = seg.x * CELL, py = seg.y * CELL;
    ctx.fillStyle = '#6b5100';
    ctx.fillRect(px, py, CELL, CELL);
    ctx.fillStyle = index % 2 === 0 ? '#d4af37' : '#e6c200';
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(px + 2, py + 2, 3, 3);
  });

  // 4. Schlangenkopf
  const head = state.snake[0];
  if (head) {
    const hx = head.x * CELL, hy = head.y * CELL;
    ctx.fillStyle = '#8a6800';
    ctx.fillRect(hx, hy, CELL, CELL);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);

    ctx.fillStyle = '#000';
    const dir = state.nextDir || state.dir || DIR.RIGHT;
    let eye1, eye2;

    if (dir.x === 1) {
      eye1 = [hx + 10, hy + 3]; eye2 = [hx + 10, hy + 9];
    } else if (dir.x === -1) {
      eye1 = [hx + 2, hy + 3]; eye2 = [hx + 2, hy + 9];
    } else if (dir.y === -1) {
      eye1 = [hx + 3, hy + 2]; eye2 = [hx + 9, hy + 2];
    } else {
      eye1 = [hx + 3, hy + 10]; eye2 = [hx + 9, hy + 10];
    }

    ctx.fillRect(eye1[0], eye1[1], 3, 3);
    ctx.fillRect(eye2[0], eye2[1], 3, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(eye1[0] + 1, eye1[1] + 1, 1, 1);
    ctx.fillRect(eye2[0] + 1, eye2[1] + 1, 1, 1);
  }

  // 5. Normaler Apfel
  if (state.apple) {
    const ax = state.apple.x * CELL, ay = state.apple.y * CELL;
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(ax + 3, ay + 4, 10, 8);
    ctx.fillRect(ax + 4, ay + 2, 8, 11);
    ctx.fillRect(ax + 5, ay + 13, 6, 2);
    ctx.fillStyle = '#ff8899';
    ctx.fillRect(ax + 5, ay + 4, 2, 3);
    ctx.fillStyle = '#39ff14';
    ctx.fillRect(ax + 7, ay + 1, 2, 2);
  }

  // 6. Gold-Apfel
  if (state.goldApple) {
    const blink = goldAppleBlink(state.goldApple, now);
    if (!blink) {
      const gx = state.goldApple.x * CELL, gy = state.goldApple.y * CELL;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(gx - 1, gy - 1, CELL + 2, CELL + 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(gx + 2, gy + 3, 12, 10);
      ctx.fillRect(gx + 4, gy + 1, 8, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx + 4, gy + 3, 3, 3);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(gx + 7, gy, 2, 2);
    }
  }

  // 7. Start-Hinweis Overlay
  if (isWaiting) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = '#ffd700';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BEREIT?', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 16);

    ctx.fillStyle = '#f0ead0';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('PFEILTASTE ODER D-PAD', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
    ctx.fillText('ZUM STARTEN DRUECKEN', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 26);
  }
}

// === GAME-OVER-OVERLAY ===
function GameOverOverlay({ score, onRestart, onClose }) {
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Game Over">
      <div className="overlay-panel">
        <img
          src="/logo.png"
          alt="Moritzfreund Arcade Logo"
          width={56}
          height={56}
          style={{ imageRendering: 'pixelated', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}
        />
        <h2 className="overlay-title">GAME OVER</h2>
        <p className="overlay-score-display">{score.toLocaleString('de-DE')}</p>
        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '20px' }}>
          PUNKTE
        </p>

        <HighscoreList
          game="snake"
          newScore={score}
          onSubmitted={() => {}}
          limit={10}
        />

        <div className="overlay-btn-row" style={{ marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={onRestart}>NEU STARTEN</button>
          <button className="btn btn-outline" onClick={onClose}>LOBBY</button>
        </div>
      </div>
    </div>
  );
}

// === SPIELSTAND-DIALOG ===
function SaveDialog({ onContinue, onNew }) {
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Spielstand gefunden">
      <div className="overlay-panel">
        <img
          src="/logo.png"
          alt="Moritzfreund Arcade Logo"
          width={56}
          height={56}
          style={{ imageRendering: 'pixelated', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}
        />
        <h2 className="overlay-title">SPIELSTAND GEFUNDEN</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Ein gespeicherter Spielstand wurde gefunden. Weiterspielen?
        </p>
        <div className="overlay-btn-row">
          <button className="btn btn-primary" onClick={onContinue}>WEITERSPIELEN</button>
          <button className="btn btn-outline" onClick={onNew}>NEU STARTEN</button>
        </div>
      </div>
    </div>
  );
}

// === SNAKE-SEITE ===
export default function SnakePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stateRef = useRef(null);
  const botRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const audioCtxRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const playerName = getLastName();

  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [vsBot, setVsBot] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [shake, setShake] = useState(false);
  const [goldFlash, setGoldFlash] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedState, setSavedState] = useState(null);
  const [loaded, setLoaded] = useState(false);

  function getAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioCtx();
    }
    return audioCtxRef.current;
  }

  // === SPIELSCHLEIFE ===
  const gameLoop = useCallback((timestamp) => {
    const state = stateRef.current;
    if (!state || !state.alive || state.paused || !hasStarted) {
      renderFrame(canvasRef.current, stateRef.current, timestamp, !hasStarted, vsBot ? botRef.current : null);
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const interval = tickInterval(state);
    if (timestamp - lastTickRef.current >= interval) {
      lastTickRef.current = timestamp;
      const { newState, event } = step(state, timestamp);
      stateRef.current = newState;

      // Bot-Logik
      if (vsBot && botRef.current) {
        const target = newState.goldApple || newState.apple;
        const { newBotState, event: bEvent } = stepBot(botRef.current, newState, target);
        botRef.current = newBotState;

        if (bEvent === 'apple') {
          // Bot hat Apfel gefressen
          if (soundOn) playAppleSound(getAudio());
          stateRef.current.apple = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
          setBotScore(newBotState.score);
        } else if (bEvent === 'death') {
          // Bot ist gestorben -> Spieler bekommt Bonus!
          if (soundOn) playGoldSound(getAudio());
          stateRef.current.score += 5;
        }

        // Spieler kollidiert mit Bot?
        const playerHead = newState.snake[0];
        if (newBotState.alive && newBotState.snake.some(s => s.x === playerHead.x && s.y === playerHead.y)) {
          if (soundOn) playDeathSound(getAudio());
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setGameOver(true);
          setScore(newState.score);
          renderFrame(canvasRef.current, newState, timestamp, false, botRef.current);
          return;
        }
      }

      if (event === 'apple' && soundOn) playAppleSound(getAudio());
      if (event === 'gold') {
        if (soundOn) playGoldSound(getAudio());
        setGoldFlash(true);
        setTimeout(() => setGoldFlash(false), 400);
      }
      if (event === 'death') {
        if (soundOn) playDeathSound(getAudio());
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setGameOver(true);
        setScore(newState.score);
        renderFrame(canvasRef.current, newState, timestamp, false, vsBot ? botRef.current : null);
        return;
      }

      setScore(newState.score);
      setLevel(Math.floor(newState.apples / 5) + 1);
    }

    renderFrame(canvasRef.current, stateRef.current, timestamp, false, vsBot ? botRef.current : null);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [soundOn, hasStarted, vsBot]);

  // === INITIALISIERUNG & NEUSTART ===
  function startGame(savedData = null) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = savedData ? restoreState(savedData) : createInitialState();
    botRef.current = vsBot ? createBotState() : null;
    lastTickRef.current = 0;
    setScore(stateRef.current.score);
    setBotScore(0);
    setLevel(Math.floor(stateRef.current.apples / 5) + 1);
    setGameOver(false);
    setPaused(false);
    setShowSaveDialog(false);
    setHasStarted(false);

    renderFrame(canvasRef.current, stateRef.current, 0, true, botRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }

  // Richtungs-Trigger
  const handleDirectionInput = useCallback((dir) => {
    if (!stateRef.current || !stateRef.current.alive) return;
    if (stateRef.current.paused) return;

    setDirection(stateRef.current, dir);
    if (!hasStarted) {
      setHasStarted(true);
      lastTickRef.current = performance.now();
    }
  }, [hasStarted]);

  // === SPIELSTAND LADEN ===
  useEffect(() => {
    async function init() {
      if (playerName) {
        const { data } = await loadGameState(playerName, 'snake');
        if (data && data.state && data.state.snakePositions) {
          setSavedState(data.state);
          setShowSaveDialog(true);
        } else {
          startGame();
        }
      } else {
        startGame();
      }
      setLoaded(true);
    }
    init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBot]);

  useEffect(() => {
    if (!loaded || gameOver || showSaveDialog) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [gameLoop, loaded, gameOver, showSaveDialog]);

  // === AUTOSAVE ===
  useEffect(() => {
    if (!playerName || vsBot) return;

    async function doSave() {
      const state = stateRef.current;
      if (!state || !state.alive || !hasStarted) return;
      await saveGameState(playerName, 'snake', serializeState(state));
      setSaveVisible(true);
      setTimeout(() => setSaveVisible(false), 800);
    }

    autosaveTimerRef.current = setInterval(doSave, 30000);
    const onVisibility = () => { if (document.hidden) doSave(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(autosaveTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [playerName, hasStarted, vsBot]);

  // === TASTATURSTEUERUNG ===
  useEffect(() => {
    const map = {
      ArrowUp: DIR.UP, w: DIR.UP, W: DIR.UP,
      ArrowDown: DIR.DOWN, s: DIR.DOWN, S: DIR.DOWN,
      ArrowLeft: DIR.LEFT, a: DIR.LEFT, A: DIR.LEFT,
      ArrowRight: DIR.RIGHT, d: DIR.RIGHT, D: DIR.RIGHT,
    };

    function onKey(e) {
      if (map[e.key]) {
        e.preventDefault();
        handleDirectionInput(map[e.key]);
      }
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
      }
      if (e.key === ' ' && !hasStarted) {
        e.preventDefault();
        setHasStarted(true);
        lastTickRef.current = performance.now();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDirectionInput, hasStarted]);

  // === SWIPE-STEUERUNG ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let startX = 0, startY = 0;
    const THRESHOLD = 20;

    function onTouchStart(e) {
      e.preventDefault();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      if (!hasStarted) {
        setHasStarted(true);
        lastTickRef.current = performance.now();
      }
    }

    function onTouchMove(e) {
      e.preventDefault();
      if (!stateRef.current) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        handleDirectionInput(dx > 0 ? DIR.RIGHT : DIR.LEFT);
      } else {
        handleDirectionInput(dy > 0 ? DIR.DOWN : DIR.UP);
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [loaded, hasStarted, handleDirectionInput]);

  function togglePause() {
    if (!stateRef.current || !hasStarted) return;
    stateRef.current.paused = !stateRef.current.paused;
    setPaused(p => !p);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  function toggleBotMode() {
    setVsBot(prev => !prev);
  }

  const speedLabel = stateRef.current ? `${stateRef.current.tick} Z/S` : '8 Z/S';

  return (
    <main className="page-content" style={{ padding: '16px 16px 48px' }}>
      <div className="game-page" id="snake-game">
        {/* HUD */}
        <div className="game-hud" aria-label="Spielinfo">
          <div className="hud-item" aria-label="Punkte">
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--muted)' }}>
              {vsBot ? 'DU VS BOT' : 'SCORE'}
            </span>
            <span className="hud-value hud-value-accent" style={{ fontSize: '1.05rem' }}>
              {vsBot ? `${score} : ${botScore}` : score.toLocaleString('de-DE')}
            </span>
          </div>
          <div className="hud-item" aria-label="Level">
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--muted)' }}>LEVEL</span>
            <span className="hud-value" style={{ fontSize: '1.05rem' }}>{level}</span>
          </div>
          <div className="hud-item" aria-label="Geschwindigkeit">
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--muted)' }}>SPEED</span>
            <span className="hud-value" style={{ fontSize: '1.05rem' }}>{speedLabel}</span>
          </div>

          <div className="hud-spacer" />

          {/* Bot-Gegner-Umschalter */}
          <button
            className={`sound-toggle ${vsBot ? 'on' : ''}`}
            onClick={toggleBotMode}
            title="Gegen Bot-Gegner spielen"
            style={{ fontSize: '0.5rem', padding: '10px 12px' }}
          >
            {vsBot ? '🤖 VS BOT' : '👤 SOLO'}
          </button>

          <button
            className={`sound-toggle ${soundOn ? 'on' : ''}`}
            onClick={toggleSound}
            aria-label={soundOn ? 'Sound ausschalten' : 'Sound einschalten'}
            aria-pressed={soundOn}
            style={{ fontSize: '0.5rem', padding: '10px 12px' }}
          >
            {soundOn ? 'SND ON' : 'SND OFF'}
          </button>
          <button
            className="btn btn-outline"
            onClick={togglePause}
            aria-label={paused ? 'Weiterspielen' : 'Pause'}
            style={{ minHeight: '48px', padding: '10px 14px', fontSize: '0.5rem', fontFamily: 'var(--font-pixel)' }}
          >
            {paused ? 'PLAY' : 'PAUSE'}
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={wrapRef}
          className={`game-canvas-wrap${shake ? ' shake' : ''}${goldFlash ? ' gold-flash' : ''}`}
          style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
            aria-label="Snake-Spielfeld"
            onClick={() => {
              if (!hasStarted) {
                setHasStarted(true);
                lastTickRef.current = performance.now();
              }
            }}
          />
          {paused && !gameOver && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-pixel)', color: 'var(--accent)', fontSize: '1.4rem' }}>
                PAUSE
              </span>
            </div>
          )}
        </div>

        {/* Virtuelles D-Pad für Touch & Mobile */}
        <div className="dpad-container" aria-label="Virtuelle Steuerung">
          <div className="dpad-row">
            <button
              className="dpad-btn"
              onClick={() => handleDirectionInput(DIR.UP)}
              aria-label="Nach oben"
            >
              ▲
            </button>
          </div>
          <div className="dpad-row dpad-middle">
            <button
              className="dpad-btn"
              onClick={() => handleDirectionInput(DIR.LEFT)}
              aria-label="Nach links"
            >
              ◄
            </button>
            <button
              className="dpad-btn dpad-center"
              onClick={() => {
                if (!hasStarted) {
                  setHasStarted(true);
                  lastTickRef.current = performance.now();
                } else {
                  togglePause();
                }
              }}
              aria-label="Start / Pause"
            >
              {hasStarted ? (paused ? '▶' : '❚❚') : 'GO'}
            </button>
            <button
              className="dpad-btn"
              onClick={() => handleDirectionInput(DIR.RIGHT)}
              aria-label="Nach rechts"
            >
              ►
            </button>
          </div>
          <div className="dpad-row">
            <button
              className="dpad-btn"
              onClick={() => handleDirectionInput(DIR.DOWN)}
              aria-label="Nach unten"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Steuerungshinweis */}
        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.55rem', color: 'var(--muted)', textAlign: 'center', marginTop: '12px' }}>
          PFEILTASTEN / WASD / SWIPE / D-PAD {vsBot && '| SCHLAGE DEN KI-ROBOTER!'}
        </p>
      </div>

      {/* Overlays */}
      {showSaveDialog && (
        <SaveDialog
          onContinue={() => {
            setShowSaveDialog(false);
            startGame(savedState);
          }}
          onNew={async () => {
            if (playerName) await deleteGameState(playerName, 'snake');
            setSavedState(null);
            startGame();
          }}
        />
      )}

      {gameOver && (
        <GameOverOverlay
          score={score}
          onRestart={() => {
            if (playerName) deleteGameState(playerName, 'snake');
            startGame();
          }}
          onClose={() => navigate('/')}
        />
      )}

      <SaveIndicator visible={saveVisible} />
    </main>
  );
}
