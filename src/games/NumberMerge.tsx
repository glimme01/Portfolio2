import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { loadState, saveState } from '../utils/storage';

// ─── Tile colours ────────────────────────────────────────────────────────────
interface TileStyle { bg: string; text: string }
function getTileStyle(val: number | null): TileStyle {
  if (!val) return { bg: 'transparent', text: 'transparent' };
  if (val >= 1024) return { bg: '#2a2a00', text: '#ffd700' };
  const map: Record<number, TileStyle> = {
    2:   { bg: '#2a2a2e', text: '#a09a90' },
    4:   { bg: '#3a3028', text: '#FFA586' },
    8:   { bg: '#4a2020', text: '#ff8566' },
    16:  { bg: '#B01A2B', text: '#f0ebe3' },
    32:  { bg: '#8B0F1F', text: '#FFA586' },
    64:  { bg: '#1a3a4a', text: '#4a9eff' },
    128: { bg: '#1a4a2a', text: '#4aff9e' },
    256: { bg: '#3a1a4a', text: '#c678dd' },
    512: { bg: '#4a3a00', text: '#ffd700' },
  };
  return map[val] ?? { bg: '#2a2a00', text: '#ffd700' };
}

// ─── Tile generation ─────────────────────────────────────────────────────────
function genTile(): number {
  const r = Math.random();
  if (r < 0.70) return 2;
  if (r < 0.90) return 4;
  return 8;
}

// ─── Drop + merge (pure) ─────────────────────────────────────────────────────
interface DropResult {
  newGrid: (number | null)[][];
  merged: string[];
  score: number;
  landed: string; // "row-col" of where tile landed
}

function dropTile(
  grid: (number | null)[][],
  col: number,
  value: number,
): DropResult {
  const g = grid.map(r => [...r]);

  // find bottom-most empty row
  let row = -1;
  for (let r = 7; r >= 0; r--) {
    if (!g[r][col]) { row = r; break; }
  }
  if (row === -1) {
    return { newGrid: g, merged: [], score: 0, landed: '-1--1' };
  }

  g[row][col] = value;
  const landed = `${row}-${col}`;

  let totalScore = 0;
  const mergedCells: string[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 7; r > 0; r--) {
      if (g[r][col] !== null && g[r][col] === g[r - 1][col]) {
        const merged = (g[r][col] as number) * 2;
        g[r - 1][col] = merged;
        g[r][col] = null;
        // compact: shift everything above r down by one
        for (let rr = r; rr < 7; rr++) g[rr][col] = g[rr + 1][col];
        g[7][col] = null;
        totalScore += merged;
        mergedCells.push(`${r - 1}-${col}`);
        changed = true;
        break;
      }
    }
  }

  return { newGrid: g, merged: mergedCells, score: totalScore, landed };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function emptyGrid(): (number | null)[][] {
  return Array(8).fill(null).map(() => Array(5).fill(null));
}

function highestTile(grid: (number | null)[][]): number {
  let max = 0;
  grid.forEach(row => row.forEach(v => { if (v && v > max) max = v; }));
  return max;
}

const CELL = 60;
const GAP  = 4;

// ─── Component ───────────────────────────────────────────────────────────────
export default function NumberMerge() {
  const [grid, setGrid]           = useState<(number | null)[][]>(emptyGrid);
  const [currentTile, setCurrentTile] = useState<number>(() => genTile());
  const [nextTile, setNextTile]   = useState<number>(() => genTile());
  const [selectedCol, setSelectedCol] = useState(2);
  const [score, setScore]         = useState(0);
  const [highScore, setHighScore] = useState(() => Number(loadState('merge_high') ?? 0));
  const [phase, setPhase]         = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [mergeFlash, setMergeFlash] = useState<Set<string>>(new Set());
  const [landFlash, setLandFlash] = useState<string | null>(null);
  const [dropping, setDropping]   = useState(false);

  const gridRef = useRef(grid);
  gridRef.current = grid;

  // ── Flash helpers ─────────────────────────────────────────────────────────
  const flashCells = useCallback((cells: string[], duration = 320) => {
    if (!cells.length) return;
    setMergeFlash(new Set(cells));
    setTimeout(() => setMergeFlash(new Set()), duration);
  }, []);

  // ── Drop action ───────────────────────────────────────────────────────────
  const drop = useCallback((col: number) => {
    if (phase !== 'playing' || dropping) return;

    // game-over check: top row of col is full
    if (gridRef.current[0][col] !== null) {
      setPhase('gameover');
      const best = highestTile(gridRef.current);
      const hs = Math.max(best, Number(loadState('merge_high') ?? 0));
      setHighScore(hs);
      saveState('merge_high', String(hs));
      return;
    }

    setDropping(true);
    const { newGrid, merged, score: gained, landed } = dropTile(
      gridRef.current,
      col,
      currentTile,
    );

    setGrid(newGrid);
    setScore(s => s + gained);

    // brief land flash
    setLandFlash(landed);
    setTimeout(() => setLandFlash(null), 150);

    // merge flash
    if (merged.length) flashCells(merged, 350);

    // update high score tile
    const best = highestTile(newGrid);
    if (best > highScore) {
      setHighScore(best);
      saveState('merge_high', String(best));
    }

    // advance tiles
    setCurrentTile(nextTile);
    setNextTile(genTile());
    setDropping(false);
  }, [phase, dropping, currentTile, nextTile, highScore, flashCells]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'idle') { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPhase('playing'); } return; }
      if (phase === 'gameover') { if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); } return; }
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); setSelectedCol(c => Math.max(0, c - 1)); break;
        case 'ArrowRight': e.preventDefault(); setSelectedCol(c => Math.min(4, c + 1)); break;
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          e.preventDefault();
          drop(selectedCol);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, selectedCol, drop]);

  // ── Restart ───────────────────────────────────────────────────────────────
  function restart() {
    setGrid(emptyGrid());
    setCurrentTile(genTile());
    setNextTile(genTile());
    setSelectedCol(2);
    setScore(0);
    setMergeFlash(new Set());
    setLandFlash(null);
    setDropping(false);
    setPhase('playing');
  }

  // ── Column click: first click selects, second click drops ─────────────────
  const lastClickCol = useRef<number | null>(null);
  const lastClickTime = useRef<number>(0);

  function handleColClick(col: number) {
    if (phase !== 'playing') return;
    const now = Date.now();
    if (selectedCol === col && now - lastClickTime.current < 600) {
      // double-click or fast second click → drop
      drop(col);
      lastClickCol.current = null;
    } else {
      setSelectedCol(col);
      lastClickCol.current = col;
      lastClickTime.current = now;
    }
  }

  // ── Cell render ───────────────────────────────────────────────────────────
  function renderCell(val: number | null, r: number, c: number) {
    const key = `${r}-${c}`;
    const style = getTileStyle(val);
    const isFlash = mergeFlash.has(key);
    const isLand  = landFlash === key;

    return (
      <div
        key={key}
        style={{
          width: CELL,
          height: CELL,
          background: val ? style.bg : 'rgba(255,255,255,0.03)',
          border: isFlash
            ? '2px solid #FFA586'
            : isLand
            ? '2px solid rgba(255,165,134,0.5)'
            : '1px solid rgba(240,235,227,0.07)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.08s, border 0.06s',
          boxShadow: isFlash
            ? '0 0 12px rgba(255,165,134,0.6)'
            : val
            ? '0 2px 6px rgba(0,0,0,0.4)'
            : 'none',
        }}
      >
        {val ? (
          <span
            style={{
              fontFamily: '"Inter", sans-serif',
              fontWeight: 700,
              fontSize: val >= 1024 ? 14 : val >= 128 ? 17 : val >= 16 ? 20 : 24,
              color: style.text,
              userSelect: 'none',
            }}
          >
            {val}
          </span>
        ) : null}
      </div>
    );
  }

  // ── Floating current tile above grid ──────────────────────────────────────
  const tileStyle = getTileStyle(currentTile);
  const tileLeft  = selectedCol * (CELL + GAP); // offset from grid left edge (incl padding)

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#141416',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '"Inter", sans-serif',
        color: '#f0ebe3',
        padding: '24px 16px 40px',
      }}
    >
      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link
          to="/games"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a09a90', textDecoration: 'none', fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Games
        </Link>
        <h1 className="font-serif" style={{ margin: 0, fontSize: 22, color: '#f0ebe3' }}>
          Number Merge
        </h1>
        <button
          onClick={phase === 'playing' ? restart : restart}
          style={{ background: 'none', border: 'none', color: '#a09a90', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
          title="Restart"
        >
          <RotateCcw size={15} /> Restart
        </button>
      </div>

      {/* Score row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <ScoreBox label="Score" value={score} />
        <ScoreBox label="Best Tile" value={highScore || '—'} highlight />
        <NextTileBox value={nextTile} />
      </div>

      {/* ── Idle screen ── */}
      <AnimatePresence>
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', marginBottom: 24 }}
          >
            <p style={{ color: '#a09a90', fontSize: 14, marginBottom: 16, maxWidth: 300 }}>
              Drop numbered tiles into columns. Match two equal tiles to merge them!
            </p>
            <button
              className="btn-main"
              onClick={restart}
              style={{ padding: '10px 32px', fontSize: 16 }}
            >
              Play
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game over overlay ── */}
      <AnimatePresence>
        {phase === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(20,20,22,0.82)', zIndex: 50,
            }}
          >
            <div style={{
              background: '#1c1c1f', border: '1px solid rgba(240,235,227,0.12)', borderRadius: 16,
              padding: '36px 48px', textAlign: 'center',
            }}>
              <h2 className="font-serif" style={{ fontSize: 28, marginBottom: 8, color: '#FFA586' }}>Game Over</h2>
              <p style={{ color: '#a09a90', marginBottom: 4, fontSize: 14 }}>Score: <strong style={{ color: '#f0ebe3' }}>{score}</strong></p>
              <p style={{ color: '#a09a90', marginBottom: 24, fontSize: 14 }}>Best Tile: <strong style={{ color: '#ffd700' }}>{highScore}</strong></p>
              <button className="btn-main" onClick={restart} style={{ padding: '10px 32px', fontSize: 15 }}>
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game area ── */}
      {(phase === 'playing' || phase === 'gameover') && (
        <div style={{ position: 'relative', userSelect: 'none' }}>

          {/* Floating current tile */}
          <div
            style={{
              position: 'absolute',
              top: -72,
              left: 4 + tileLeft, // 4px = grid left padding
              width: CELL,
              height: CELL,
              background: tileStyle.bg,
              border: '2px solid rgba(255,165,134,0.6)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255,165,134,0.25)',
              transition: 'left 0.12s cubic-bezier(0.25,0.8,0.25,1)',
              zIndex: 10,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: currentTile >= 128 ? 17 : 24, color: tileStyle.text }}>
              {currentTile}
            </span>
          </div>

          {/* Column selector buttons */}
          <div
            style={{
              display: 'flex',
              gap: GAP,
              paddingLeft: 4,
              paddingRight: 4,
              marginBottom: GAP,
            }}
          >
            {Array.from({ length: 5 }, (_, c) => (
              <button
                key={c}
                onClick={() => handleColClick(c)}
                style={{
                  width: CELL,
                  height: 32,
                  background: selectedCol === c ? 'rgba(255,165,134,0.15)' : 'rgba(255,255,255,0.04)',
                  border: selectedCol === c
                    ? '2px solid #FFA586'
                    : '1px solid rgba(240,235,227,0.1)',
                  borderRadius: 6,
                  color: selectedCol === c ? '#FFA586' : '#a09a90',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border 0.1s, background 0.1s, color 0.1s',
                  padding: 0,
                }}
                aria-label={`Column ${c + 1}`}
                title={selectedCol === c ? 'Click again to drop' : 'Select column'}
              >
                ↓
              </button>
            ))}
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(5, ${CELL}px)`,
              gridTemplateRows: `repeat(8, ${CELL}px)`,
              gap: GAP,
              background: '#1c1c1f',
              padding: 4,
              borderRadius: 10,
              border: '1px solid rgba(240,235,227,0.08)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => renderCell(val, r, c))
            )}
          </div>

          {/* Keyboard hint */}
          <p style={{ textAlign: 'center', color: '#a09a90', fontSize: 12, marginTop: 14, lineHeight: 1.6 }}>
            ← → select &nbsp;·&nbsp; ↓ / Enter / Space drop &nbsp;·&nbsp; Click once → select, twice → drop
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Score box ───────────────────────────────────────────────────────────────
function ScoreBox({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div style={{
      background: '#1c1c1f',
      border: '1px solid rgba(240,235,227,0.1)',
      borderRadius: 10,
      padding: '8px 18px',
      textAlign: 'center',
      minWidth: 80,
    }}>
      <div style={{ fontSize: 11, color: '#a09a90', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: highlight ? '#ffd700' : '#f0ebe3' }}>{value}</div>
    </div>
  );
}

// ─── Next tile preview ────────────────────────────────────────────────────────
function NextTileBox({ value }: { value: number }) {
  const s = getTileStyle(value);
  return (
    <div style={{
      background: '#1c1c1f',
      border: '1px solid rgba(240,235,227,0.1)',
      borderRadius: 10,
      padding: '8px 14px',
      textAlign: 'center',
      minWidth: 80,
    }}>
      <div style={{ fontSize: 11, color: '#a09a90', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Next</div>
      <div style={{
        width: 40, height: 40, margin: '0 auto',
        background: s.bg,
        border: '1px solid rgba(240,235,227,0.12)',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: value >= 8 ? 15 : 18,
        color: s.text,
      }}>
        {value}
      </div>
    </div>
  );
}
