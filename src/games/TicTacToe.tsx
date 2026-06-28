import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

type Cell = "X" | "O" | null;

const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getWinner(board: Cell[]): { winner: Cell; line: number[] | null } {
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [scoreX, setScoreX] = useState(() => Number(loadState("ttt_x") || "0"));
  const [scoreO, setScoreO] = useState(() => Number(loadState("ttt_o") || "0"));
  const { winner, line: winLine } = useMemo(() => getWinner(board), [board]);
  const isDraw = !winner && board.every(Boolean);

  const play = (index: number) => {
    if (board[index] || winner) return;
    const next = [...board];
    next[index] = turn;
    setBoard(next);

    const result = getWinner(next);
    if (result.winner === "X") setScoreX((s) => { const n = s + 1; saveState("ttt_x", String(n)); return n; });
    else if (result.winner === "O") setScoreO((s) => { const n = s + 1; saveState("ttt_o", String(n)); return n; });

    setTurn(turn === "X" ? "O" : "X");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  const resetAll = () => {
    reset();
    setScoreX(0);
    setScoreO(0);
    saveState("ttt_x", "0");
    saveState("ttt_o", "0");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-md mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">❌ Tic Tac Toe</h1>
          <p className="text-[#a09a90] text-sm">2 Spieler — am selben Gerät</p>
        </div>

        {/* Score */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`border border-[rgba(240,235,227,0.12)] p-3 text-center ${turn === "X" && !winner && !isDraw ? "border-[#FFA586]/50" : ""}`}>
            <div className="text-2xl mb-1">❌</div>
            <div className="text-2xl font-serif font-bold text-[#FFA586]">{scoreX}</div>
            <div className="text-[10px] text-[#a09a90]">Spieler X</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] p-3 text-center flex flex-col items-center justify-center">
            <div className="text-xs text-[#a09a90]">
              {winner ? `${winner} gewinnt!` : isDraw ? "Unentschieden!" : `${turn} ist dran`}
            </div>
          </div>
          <div className={`border border-[rgba(240,235,227,0.12)] p-3 text-center ${turn === "O" && !winner && !isDraw ? "border-[#B01A2B]/50" : ""}`}>
            <div className="text-2xl mb-1">⭕</div>
            <div className="text-2xl font-serif font-bold text-[#B01A2B]">{scoreO}</div>
            <div className="text-[10px] text-[#a09a90]">Spieler O</div>
          </div>
        </div>

        {/* Board */}
        <div className="border border-[rgba(240,235,227,0.12)] p-4 mb-6">
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, i) => {
              const isWinCell = winLine?.includes(i);
              return (
                <motion.button
                  key={i}
                  onClick={() => play(i)}
                  whileTap={!cell && !winner ? { scale: 0.9 } : undefined}
                  className={`aspect-square rounded-xl flex items-center justify-center text-4xl font-bold transition-all select-none ${
                    cell
                      ? isWinCell
                        ? "bg-[#FFA586]/20 border-2 border-[#FFA586]"
                        : "bg-[#141416]/40 border border-[rgba(240,235,227,0.12)]"
                      : "bg-[#141416]/30 border border-[rgba(240,235,227,0.12)] hover:bg-[#2a2a2e]/30 hover:border-[#FFA586]/30 cursor-pointer"
                  }`}
                >
                  {cell === "X" && <span className={isWinCell ? "text-[#FFA586]" : "text-[#FFA586]/70"}>✕</span>}
                  {cell === "O" && <span className={isWinCell ? "text-[#B01A2B]" : "text-[#B01A2B]/70"}>○</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 btn-main flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Neue Runde
          </button>
          <button onClick={resetAll} className="pill flex items-center justify-center gap-2 px-4">
            Reset Score
          </button>
        </div>
      </div>
    </motion.div>
  );
}
