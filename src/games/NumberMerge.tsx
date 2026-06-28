import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 5;
const ROWS = 5;
const POWERS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

// ─── Tile colour map ──────────────────────────────────────────────────────────
const TILE_BG: Record<number, string> = {
  2:    "#706b63",
  4:    "#a09a90",
  8:    "#f0ebe3",
  16:   "#FFA586",
  32:   "#ff7043",
  64:   "#B01A2B",
  128:  "#9c27b0",
  256:  "#4a9eff",
  512:  "#4aff9e",
};

const TILE_FG: Record<number, string> = {
  2:    "#f0ebe3",
  4:    "#141416",
  8:    "#141416",
  16:   "#141416",
  32:   "#f0ebe3",
  64:   "#f0ebe3",
  128:  "#f0ebe3",
  256:  "#f0ebe3",
  512:  "#141416",
};

function getTileBg(val: number): string {
  if (val >= 1024) return "linear-gradient(135deg,#ffd700,#ffaa00)";
  return TILE_BG[val] ?? "#706b63";
}
function getTileFg(val: number): string {
  if (val >= 1024) return "#141416";
  return TILE_FG[val] ?? "#f0ebe3";
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Cell = { val: number; id: number };
type Grid = Cell[][];

let _nextId = 1;
function freshId() { return _nextId++; }
function emptyCell(): Cell { return { val: 0, id: freshId() }; }

// ─── Pure grid helpers ────────────────────────────────────────────────────────
function createGrid(): Grid {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => emptyCell())
  );
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => row.map(c => ({ ...c })));
}

function applyGravity(g: Grid): Grid {
  const out = cloneGrid(g);
  for (let c = 0; c < COLS; c++) {
    const col = out.map(row => row[c]);
    const nonZero = col.filter(cell => cell.val !== 0);
    const zeros   = col.filter(cell => cell.val === 0);
    const settled = [...zeros, ...nonZero];
    for (let r = 0; r < ROWS; r++) out[r][c] = settled[r];
  }
  return out;
}

function mergeCols(g: Grid): { grid: Grid; gained: number } {
  const out = cloneGrid(g);
  let gained = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 1; r > 0; r--) {
      if (out[r][c].val !== 0 && out[r][c].val === out[r - 1][c].val) {
        const merged = out[r][c].val * 2;
        gained += merged;
        out[r][c] = { val: merged, id: freshId() };
        out[r - 1][c] = emptyCell();
      }
    }
  }
  return { grid: out, gained };
}

function settle(g: Grid): { grid: Grid; gained: number } {
  let current = g;
  let total = 0;
  for (let i = 0; i < ROWS; i++) {
    current = applyGravity(current);
    const { grid: merged, gained } = mergeCols(current);
    total += gained;
    current = merged;
  }
  current = applyGravity(current);
  return { grid: current, gained: total };
}

function dropTile(g: Grid, col: number, val: number): Grid | null {
  const out = cloneGrid(g);
  for (let r = 0; r < ROWS; r++) {
    if (out[r][col].val === 0) {
      out[r][col] = { val, id: freshId() };
      return out;
    }
  }
  return null;
}

function isColumnFull(g: Grid, col: number): boolean {
  return g[0][col].val !== 0;
}

function isGameOver(g: Grid): boolean {
  for (let c = 0; c < COLS; c++) {
    if (!isColumnFull(g, c)) return false;
  }
  return true;
}

function maxTile(g: Grid): number {
  return Math.max(...g.flat().map(c => c.val), 0);
}

function nextPower(): number {
  const weights = [30, 30, 20, 10, 5, 3, 1, 1];
  const pool = POWERS.slice(0, weights.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return 2;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NumberMerge() {
  const [highScore, setHighScore] = useState(() => Number(loadState("merge_high") || "0"));
  const [grid, setGrid]           = useState<Grid>(createGrid);
  const [score, setScore]         = useState(0);
  const [selectedCol, setSelectedCol] = useState(2);
  const [nextTile, setNextTile]   = useState(() => nextPower());
  const [gameOver, setGameOver]   = useState(false);
  const [started, setStarted]     = useState(false);
  const [justMerged, setJustMerged] = useState<Set<number>>(new Set());

  const nextTileRef  = useRef(nextTile);
  const selectedRef  = useRef(selectedCol);
  const gridRef      = useRef(grid);
  const gameOverRef  = useRef(gameOver);
  const highScoreRef = useRef(highScore);

  nextTileRef.current  = nextTile;
  selectedRef.current  = selectedCol;
  gridRef.current      = grid;
  gameOverRef.current  = gameOver;
  highScoreRef.current = highScore;

  // ── Drop tile logic ─────────────────────────────────────────────────────────
  const drop = useCallback((col: number) => {
    if (gameOverRef.current) return;
    const g = gridRef.current;
    if (isColumnFull(g, col)) return;

    setStarted(true);

    const after = dropTile(g, col, nextTileRef.current);
    if (!after) return;

    const { grid: settled, gained } = settle(after);

    const prevFlat = g.flat();
    const nextFlat = settled.flat();
    const merged = new Set<number>();
    nextFlat.forEach((cell, i) => {
      if (cell.val !== 0 && cell.val !== prevFlat[i]?.val) {
        merged.add(cell.id);
      }
    });
    setJustMerged(merged);
    setTimeout(() => setJustMerged(new Set()), 380);

    setGrid(settled);

    const newScore = score + gained;
    const tileMax  = maxTile(settled);
    const bestVal  = Math.max(newScore, tileMax);
    if (bestVal > highScoreRef.current) {
      setHighScore(bestVal);
      saveState("merge_high", String(bestVal));
    }
    setScore(newScore);

    const nn = nextPower();
    setNextTile(nn);
    nextTileRef.current = nn;

    if (isGameOver(settled)) {
      setGameOver(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedCol(c => Math.max(0, c - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedCol(c => Math.min(COLS - 1, c + 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        drop(selectedRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drop]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    _nextId = 1;
    setGrid(createGrid());
    setScore(0);
    setSelectedCol(2);
    setNextTile(nextPower());
    setGameOver(false);
    setStarted(false);
    setJustMerged(new Set());
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-sm mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          to="/games"
          className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif font-black text-3xl leading-none">🔢 Number Merge</h1>
            <p className="text-[#a09a90] text-xs mt-1">Falling-tile gravity merge · 5×5</p>
          </div>
          <button onClick={reset} className="pill flex items-center gap-2 text-sm px-3 py-2">
            <RotateCcw size={14} /> Neu
          </button>
        </div>

        {/* Score bar + next tile preview */}
        <div className="flex gap-3 mb-5">
          <div
            className="flex-1 text-center py-2 px-3"
            style={{ border: "1px solid rgba(240,235,227,0.12)", borderRadius: "8px" }}
          >
            <div className="text-xs text-[#a09a90] mb-0.5">Score</div>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div
            className="flex-1 text-center py-2 px-3"
            style={{ border: "1px solid rgba(240,235,227,0.12)", borderRadius: "8px" }}
          >
            <div className="text-xs text-[#a09a90] mb-0.5">Best</div>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
          <div
            className="flex-1 text-center py-2 px-3 flex flex-col items-center justify-center gap-1"
            style={{ border: "1px solid rgba(240,235,227,0.12)", borderRadius: "8px" }}
          >
            <div className="text-xs text-[#a09a90]">Next</div>
            <motion.div
              key={nextTile}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                background:     getTileBg(nextTile),
                color:          getTileFg(nextTile),
                borderRadius:   "7px",
                width:          "38px",
                height:         "38px",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontWeight:     900,
                fontSize:       nextTile >= 100 ? "0.68rem" : "0.9rem",
                boxShadow:      nextTile >= 16 ? `0 0 14px 2px ${getTileBg(nextTile).split("(")[0] === "linear" ? "#FFA58688" : getTileBg(nextTile) + "88"}` : "none",
              }}
            >
              {nextTile}
            </motion.div>
          </div>
        </div>

        {/* Game area */}
        <div
          style={{
            border:       "1px solid rgba(240,235,227,0.12)",
            borderRadius: "14px",
            padding:      "10px",
            background:   "rgba(240,235,227,0.02)",
            position:     "relative",
          }}
        >
          {/* Column drop headers */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap:                 "6px",
              marginBottom:        "4px",
            }}
          >
            {Array.from({ length: COLS }, (_, col) => {
              const full   = isColumnFull(grid, col);
              const active = col === selectedCol;
              return (
                <div
                  key={col}
                  onClick={() => { setSelectedCol(col); drop(col); }}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    minHeight:      "30px",
                    borderRadius:   "6px 6px 0 0",
                    cursor:         full ? "not-allowed" : "pointer",
                    background:     active ? "rgba(255,165,134,0.18)" : "rgba(240,235,227,0.04)",
                    border:         active ? "1px solid rgba(255,165,134,0.4)" : "1px solid transparent",
                    transition:     "background 0.15s, border 0.15s",
                  }}
                  aria-label={`Drop in column ${col + 1}`}
                >
                  <span style={{
                    fontSize:   "0.85rem",
                    color:      full ? "#a09a90" : active ? "#FFA586" : "#a09a90",
                    opacity:    full ? 0.3 : 1,
                  }}>
                    ▼
                  </span>
                </div>
              );
            })}
          </div>

          {/* 5×5 grid */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap:                 "6px",
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isEmpty  = cell.val === 0;
                const isMerged = justMerged.has(cell.id);
                return (
                  <motion.div
                    key={`${r}-${c}-${cell.id}`}
                    initial={{ opacity: 0, scale: 0.55 }}
                    animate={{
                      opacity: isEmpty ? 0.3 : 1,
                      scale:   isMerged ? [1, 1.25, 1] : 1,
                    }}
                    transition={{ duration: isMerged ? 0.32 : 0.18, ease: "easeOut" }}
                    onClick={() => { setSelectedCol(c); drop(c); }}
                    style={{
                      background:     isEmpty ? "rgba(240,235,227,0.04)" : getTileBg(cell.val),
                      color:          isEmpty ? "transparent"             : getTileFg(cell.val),
                      border:         isEmpty ? "1px solid rgba(240,235,227,0.08)" : "none",
                      boxShadow:      (!isEmpty && cell.val >= 16)
                        ? `0 0 18px 2px ${getTileBg(cell.val).startsWith("linear") ? "#ffd70066" : getTileBg(cell.val) + "66"}`
                        : "none",
                      borderRadius:   "10px",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      fontWeight:     900,
                      fontFamily:     "serif",
                      fontSize:       cell.val >= 1000 ? "0.65rem"
                                    : cell.val >= 100  ? "0.82rem"
                                    : "1rem",
                      minHeight:      "56px",
                      cursor:         "pointer",
                      userSelect:     "none",
                    }}
                    data-col={c}
                    data-row={r}
                  >
                    {!isEmpty && cell.val}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Start overlay */}
          <AnimatePresence>
            {!started && !gameOver && (
              <motion.div
                key="start-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position:       "absolute",
                  inset:          0,
                  borderRadius:   "14px",
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "14px",
                  background:     "rgba(20,20,22,0.78)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div className="font-serif font-black text-2xl text-[#f0ebe3]">🔢 Number Merge</div>
                <p className="text-[#a09a90] text-sm text-center px-6 leading-relaxed">
                  Klicke eine Spalte · Gleiche Zahlen verschmelzen!<br />
                  ← → + Enter für Tastatur-Steuerung
                </p>
                <button onClick={() => drop(selectedCol)} className="btn-main">
                  ▶ Start
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game-over overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                key="gameover-overlay"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                style={{
                  position:       "absolute",
                  inset:          0,
                  borderRadius:   "14px",
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "12px",
                  background:     "rgba(20,20,22,0.88)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="font-serif font-black text-3xl text-[#B01A2B]">Game Over!</div>
                <div className="text-[#FFA586] text-lg font-bold">{score} Punkte</div>
                <div className="text-[#a09a90] text-sm">
                  Höchste Kachel:{" "}
                  <span
                    style={{
                      color:      getTileFg(maxTile(grid)),
                      background: getTileBg(maxTile(grid)),
                      padding:    "1px 8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                    }}
                  >
                    {maxTile(grid)}
                  </span>
                </div>
                <button onClick={reset} className="btn-main flex items-center gap-2">
                  <RotateCcw size={16} /> Nochmal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Column selector controls */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => setSelectedCol(c => Math.max(0, c - 1))}
            className="pill w-10 h-10 flex items-center justify-center text-lg font-bold active:bg-[#FFA586] active:text-[#141416]"
            aria-label="Select previous column"
          >
            ◀
          </button>

          {/* Dot indicator */}
          <div className="flex gap-2 items-center">
            {Array.from({ length: COLS }, (_, i) => (
              <button
                key={i}
                onClick={() => { setSelectedCol(i); drop(i); }}
                aria-label={`Drop in column ${i + 1}`}
                style={{
                  width:        i === selectedCol ? "28px" : "10px",
                  height:       "10px",
                  borderRadius: "9999px",
                  background:   i === selectedCol ? "#FFA586" : "rgba(240,235,227,0.2)",
                  border:       "none",
                  cursor:       "pointer",
                  transition:   "all 0.2s ease",
                  padding:      0,
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setSelectedCol(c => Math.min(COLS - 1, c + 1))}
            className="pill w-10 h-10 flex items-center justify-center text-lg font-bold active:bg-[#FFA586] active:text-[#141416]"
            aria-label="Select next column"
          >
            ▶
          </button>
        </div>

        {/* Drop button */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => drop(selectedCol)}
            disabled={gameOver}
            className="btn-main px-8 py-2 text-sm"
            style={{ opacity: gameOver ? 0.4 : 1 }}
          >
            ⬇ Drop (Enter / Space)
          </button>
        </div>

        <p className="text-center text-[#a09a90] text-xs mt-4">
          ← → Spalte wählen · Enter / Space fallen lassen · Tippe direkt aufs Grid
        </p>
      </div>
    </motion.div>
  );
}
