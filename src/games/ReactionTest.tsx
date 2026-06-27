import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Target, RotateCcw } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

export default function ReactionTest() {
  const [state, setState] = useState<"idle" | "waiting" | "ready" | "done">("idle");
  const [message, setMessage] = useState("Klick um zu starten");
  const [time, setTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(() => {
    const saved = loadState("reaction_best");
    return saved ? Number(saved) : null;
  });
  const [attempts, setAttempts] = useState<number[]>([]);
  const timeout = useRef<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, []);

  const handleClick = () => {
    if (state === "idle" || state === "done") {
      setState("waiting");
      setMessage("Warte auf Grün...");
      setTime(null);
      timeout.current = window.setTimeout(() => {
        start.current = performance.now();
        setState("ready");
        setMessage("JETZT!");
      }, 1000 + Math.random() * 3000);
    } else if (state === "waiting") {
      if (timeout.current) clearTimeout(timeout.current);
      setState("idle");
      setMessage("Zu früh! 😅 Nochmal versuchen.");
    } else if (state === "ready") {
      const ms = Math.round(performance.now() - start.current);
      setTime(ms);
      setAttempts((prev) => [ms, ...prev].slice(0, 10));
      if (best === null || ms < best) {
        setBest(ms);
        saveState("reaction_best", String(ms));
      }
      setState("done");
      if (ms < 200) setMessage(`${ms}ms — Unmenschlich! 🤯`);
      else if (ms < 300) setMessage(`${ms}ms — Richtig schnell! ⚡`);
      else if (ms < 500) setMessage(`${ms}ms — Ganz okay 👍`);
      else setMessage(`${ms}ms — Da geht noch was 😴`);
    }
  };

  const getBgClass = () => {
    if (state === "ready") return "bg-green-500 cursor-pointer";
    if (state === "waiting") return "bg-[#B01A2B] cursor-pointer";
    return "bg-[#222225] hover:bg-[#2a2a2e] cursor-pointer";
  };

  const avg = attempts.length > 0 ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="text-center mb-6">
          <h1 className="font-serif font-black text-3xl mb-1">⚡ Reaktionstest</h1>
          <p className="text-[#a09a90] text-sm">Warte auf Grün, dann klick so schnell du kannst!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-[rgba(240,235,227,0.12)] p-3 text-center">
            <div className="text-xs text-[#a09a90] mb-1">Letzter</div>
            <div className="text-xl font-serif font-bold text-[#FFA586]">{time ? `${time}ms` : "—"}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] p-3 text-center">
            <div className="text-xs text-[#a09a90] mb-1">Bestwert</div>
            <div className="text-xl font-serif font-bold text-green-400">{best ? `${best}ms` : "—"}</div>
          </div>
          <div className="border border-[rgba(240,235,227,0.12)] p-3 text-center">
            <div className="text-xs text-[#a09a90] mb-1">Ø Schnitt</div>
            <div className="text-xl font-serif font-bold text-[#f0ebe3]">{avg ? `${avg}ms` : "—"}</div>
          </div>
        </div>

        {/* Click Area */}
        <button
          onClick={handleClick}
          className={`w-full aspect-[2/1] rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 select-none border border-[rgba(240,235,227,0.12)] ${getBgClass()}`}
        >
          <Target size={48} className={state === "ready" ? "text-white" : "text-[#a09a90]"} />
          <span className={`font-serif font-bold text-2xl ${state === "ready" ? "text-white" : "text-[#f0ebe3]"}`}>
            {message}
          </span>
        </button>

        {/* History */}
        {attempts.length > 0 && (
          <div className="mt-6 border border-[rgba(240,235,227,0.12)] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#a09a90] font-medium">Letzte Versuche</span>
              <button
                onClick={() => { setAttempts([]); setBest(null); saveState("reaction_best", "0"); setState("idle"); setMessage("Klick um zu starten"); setTime(null); }}
                className="text-[#a09a90] hover:text-[#FFA586] transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attempts.map((ms, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-md font-serif font-bold ${
                    ms < 250 ? "bg-green-500/20 text-green-400" :
                    ms < 400 ? "bg-[#FFA586]/20 text-[#FFA586]" :
                    "bg-[#B01A2B]/20 text-[#B01A2B]"
                  }`}
                >
                  {ms}ms
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
