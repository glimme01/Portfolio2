import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, SkipForward, X } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

// ─── Word List ────────────────────────────────────────────────────────────────
const WORDS = [
  // German
  "KATZE", "HUNDE", "BAUM", "FEUER", "WASSER", "STEIN", "STERN", "BLUME",
  "VOGEL", "TISCH", "STUHL", "LAMPE", "BUCH", "TRAUM", "MUSIK", "SPORT",
  "PIZZA", "SCHULE", "WINTER", "SOMMER",
  // English
  "PLANET", "GARDEN", "WINDOW", "CASTLE", "DRAGON", "BRIDGE", "ROCKET",
  "JUNGLE", "FROZEN", "PUZZLE", "SILVER", "GOLDEN", "COFFEE", "BUTTER",
  "DESERT", "FOREST", "ISLAND", "MIRROR", "SHADOW", "SPRING",
];

const TIMER_SECONDS = 30;
const STREAK_BONUS_AT = 3;
const STREAK_BONUS_PTS = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWord(exclude: string): string {
  const pool = WORDS.filter((w) => w !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Tile {
  id: string;
  letter: string;
}

function makeTiles(word: string): Tile[] {
  return shuffle(word.split("").map((letter, i) => ({ id: `${letter}-${i}`, letter })));
}

type Feedback = "correct" | "wrong" | null;
type GamePhase = "idle" | "playing" | "gameover";

// ─── Component ────────────────────────────────────────────────────────────────
export default function WordScramble() {
  const [highScore, setHighScore] = useState<number>(
    () => Number(loadState("wordscramble_high") || "0")
  );

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBonus, setStreakBonus] = useState<number | null>(null);

  const [word, setWord] = useState<string>(() => pickWord(""));
  const [tiles, setTiles] = useState<Tile[]>(() => makeTiles(pickWord("")));
  const [answer, setAnswer] = useState<Tile[]>([]);

  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wordKey, setWordKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakBonusRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startTimer = useCallback((onEnd: () => void) => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          onEnd();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Load next word ─────────────────────────────────────────────────────────
  const loadWord = useCallback(
    (currentWord: string) => {
      const next = pickWord(currentWord);
      setWord(next);
      setTiles(makeTiles(next));
      setAnswer([]);
      setFeedback(null);
      setWordKey((k) => k + 1);
      startTimer(() => setPhase("gameover"));
    },
    [startTimer]
  );

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setStreakBonus(null);
    setFeedback(null);
    setPhase("playing");
    const first = pickWord("");
    setWord(first);
    setTiles(makeTiles(first));
    setAnswer([]);
    setWordKey((k) => k + 1);
    startTimer(() => setPhase("gameover"));
  }, [startTimer]);

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    (currentAnswer: Tile[], currentWord: string, currentScore: number, currentStreak: number) => {
      const spelled = currentAnswer.map((t) => t.letter).join("");
      if (spelled === currentWord) {
        const newStreak = currentStreak + 1;
        const bonus = newStreak > 0 && newStreak % STREAK_BONUS_AT === 0 ? STREAK_BONUS_PTS : 0;
        const newScore = currentScore + 10 + bonus;

        setFeedback("correct");
        setStreak(newStreak);
        setScore(newScore);

        if (newScore > highScore) {
          setHighScore(newScore);
          saveState("wordscramble_high", String(newScore));
        }

        if (bonus > 0) {
          setStreakBonus(bonus);
          if (streakBonusRef.current) clearTimeout(streakBonusRef.current);
          streakBonusRef.current = setTimeout(() => setStreakBonus(null), 1800);
        }

        if (feedbackRef.current) clearTimeout(feedbackRef.current);
        feedbackRef.current = setTimeout(() => {
          loadWord(currentWord);
        }, 700);
      }
    },
    [highScore, loadWord]
  );

  // ── Auto-submit when answer fills the word ─────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (answer.length > 0 && answer.length === word.length) {
      submitAnswer(answer, word, score, streak);
    }
  }, [answer, word, phase, score, streak, submitAnswer]);

  // ── Tap tile from scramble area ────────────────────────────────────────────
  const selectTile = (tile: Tile) => {
    if (phase !== "playing" || feedback === "correct") return;
    setTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setAnswer((prev) => [...prev, tile]);
  };

  // ── Tap tile from answer area (deselect) ───────────────────────────────────
  const deselectTile = (tile: Tile) => {
    if (phase !== "playing" || feedback === "correct") return;
    setAnswer((prev) => prev.filter((t) => t.id !== tile.id));
    setTiles((prev) => [...prev, tile]);
    setFeedback(null);
  };

  // ── Skip ───────────────────────────────────────────────────────────────────
  const skip = () => {
    if (phase !== "playing") return;
    setStreak(0);
    loadWord(word);
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clear = () => {
    if (phase !== "playing" || feedback === "correct") return;
    setTiles(makeTiles(word));
    setAnswer([]);
    setFeedback(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timerPct > 50 ? "#FFA586" : timerPct > 25 ? "#f0c060" : "#B01A2B";

  const tileBase =
    "min-w-[48px] min-h-[48px] px-3 py-2 flex items-center justify-center font-serif font-bold text-xl rounded border select-none cursor-pointer transition-colors duration-150";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
      style={{ background: "#141416" }}
    >
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
          <h1 className="font-serif font-black text-3xl mb-1">🔤 Word Scramble</h1>
          <p className="text-[#a09a90] text-sm">
            Tippe die Buchstaben in der richtigen Reihenfolge
          </p>
        </div>

        {/* Score row */}
        <div className="flex justify-between mb-4 gap-3">
          <div className="flex-1 border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90]">Score</span>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{score}</div>
          </div>
          <div className="flex-1 border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90]">Streak</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">
              {streak > 0 ? `🔥 ${streak}` : String(streak)}
            </div>
          </div>
          <div className="flex-1 border border-[rgba(240,235,227,0.12)] px-4 py-2 rounded">
            <span className="text-xs text-[#a09a90]">Highscore</span>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{highScore}</div>
          </div>
        </div>

        {/* Timer bar */}
        <div
          className="relative w-full h-2 rounded-full mb-6 overflow-hidden"
          style={{ background: "rgba(240,235,227,0.08)" }}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${timerPct}%`,
              background: timerColor,
              transition: "width 0.9s linear, background-color 0.5s ease",
              boxShadow: phase === "playing" ? `0 0 8px ${timerColor}` : "none",
            }}
          />
        </div>

        {/* Game phases */}
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 py-12"
            >
              <p className="text-[#a09a90] text-center max-w-xs leading-relaxed">
                Du hast <strong className="text-[#f0ebe3]">30 Sekunden</strong> pro Wort.
                <br />
                3 richtige in Folge ={" "}
                <strong className="text-[#FFA586]">+{STREAK_BONUS_PTS} Bonus!</strong>
              </p>
              <button onClick={startGame} className="btn-main text-lg px-8 py-3">
                ▶ Starten
              </button>
            </motion.div>
          )}

          {phase === "gameover" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <div className="text-4xl font-serif font-black text-[#B01A2B]">Zeit ist um!</div>
              <div className="text-[#f0ebe3] text-lg">
                Endpunktzahl:{" "}
                <span className="font-bold text-[#FFA586] text-2xl">{score}</span>
              </div>
              {score > 0 && score >= highScore && (
                <div className="pill text-[#FFA586] font-bold text-sm">
                  🏆 Neuer Highscore!
                </div>
              )}
              <button
                onClick={startGame}
                className="btn-main flex items-center gap-2 mt-2"
              >
                <RotateCcw size={16} /> Nochmal
              </button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              {/* Answer area */}
              <div
                className="relative min-h-[70px] rounded border flex flex-wrap items-center justify-center gap-2 p-3"
                style={{
                  borderColor:
                    feedback === "correct"
                      ? "#22c55e"
                      : "rgba(240,235,227,0.18)",
                  background:
                    feedback === "correct"
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(240,235,227,0.03)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {answer.length === 0 && (
                    <motion.span
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[#a09a90] text-sm select-none pointer-events-none"
                    >
                      Wähle Buchstaben…
                    </motion.span>
                  )}
                  {answer.map((tile) => (
                    <motion.button
                      key={tile.id}
                      layout
                      initial={{ opacity: 0, scale: 0.6, y: -12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 12 }}
                      transition={{ duration: 0.18 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => deselectTile(tile)}
                      className={`${tileBase} border-[rgba(240,235,227,0.28)] bg-[#1e1e22] text-[#FFA586] hover:border-[#B01A2B] hover:text-[#f0ebe3]`}
                      aria-label={`Deselect letter ${tile.letter}`}
                    >
                      {tile.letter}
                    </motion.button>
                  ))}
                </AnimatePresence>

                {/* Correct badge overlay */}
                <AnimatePresence>
                  {feedback === "correct" && (
                    <motion.div
                      key="correct-badge"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <span className="pill font-bold text-lg px-5 py-1 shadow-lg"
                        style={{ background: "#22c55e", color: "#fff" }}>
                        ✓ Richtig!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Streak bonus toast */}
              <AnimatePresence>
                {streakBonus !== null && (
                  <motion.div
                    key="streak-bonus"
                    initial={{ opacity: 0, y: -16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-center"
                  >
                    <span
                      className="pill font-bold text-sm"
                      style={{ background: "#FFA586", color: "#141416" }}
                    >
                      🔥 Streak Bonus! +{streakBonus}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrambled tiles */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={wordKey}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-wrap justify-center gap-3 py-2"
                >
                  <AnimatePresence mode="popLayout">
                    {tiles.map((tile) => (
                      <motion.button
                        key={tile.id}
                        layout
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.4 }}
                        whileTap={{ scale: 0.88 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => selectTile(tile)}
                        className={`${tileBase} border-[rgba(240,235,227,0.18)] bg-[#1e1e22] text-[#f0ebe3] hover:border-[#FFA586] hover:bg-[#252529]`}
                        aria-label={`Select letter ${tile.letter}`}
                      >
                        {tile.letter}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex justify-center gap-3 mt-1 flex-wrap">
                <button
                  onClick={clear}
                  disabled={answer.length === 0 || feedback === "correct"}
                  className="pill flex items-center gap-1.5 text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#FFA586] hover:text-[#FFA586] transition-colors"
                  aria-label="Clear selection"
                >
                  <X size={14} /> Löschen
                </button>
                <button
                  onClick={skip}
                  className="pill flex items-center gap-1.5 text-sm hover:border-[#a09a90] hover:text-[#f0ebe3] transition-colors"
                  aria-label="Skip this word"
                >
                  <SkipForward size={14} /> Überspringen
                </button>
              </div>

              {/* Word length hint dots */}
              <div className="flex justify-center gap-1.5 mt-1">
                {word.split("").map((_, i) => (
                  <div
                    key={i}
                    className="h-0.5 rounded-full"
                    style={{
                      width: "24px",
                      background:
                        i < answer.length
                          ? "#FFA586"
                          : "rgba(240,235,227,0.15)",
                      transition: "background 0.15s",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
