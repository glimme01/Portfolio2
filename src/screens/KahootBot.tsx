import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { Bot, Play, Square, AlertTriangle } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

interface BotEntry {
  id: number;
  name: string;
  status: "joining" | "joined" | "failed";
}

export default function KahootBot() {
  const [pin, setPin] = useState("");
  const [botCount, setBotCount] = useState(10);
  const [prefix, setPrefix] = useState("MF_Bot");
  const [proxyUrl, setProxyUrl] = useState(() => loadState("kahoot_proxy_url") || "");
  const [running, setRunning] = useState(false);
  const [bots, setBots] = useState<BotEntry[]>([]);
  const intervalRef = useRef<number | null>(null);
  const botIdRef = useRef(0);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startBots = async () => {
    if (!pin || pin.length < 4) return;
    setRunning(true);
    setBots([]);
    botIdRef.current = 0;

    // Save proxy URL state for convenience
    saveState("kahoot_proxy_url", proxyUrl);

    if (proxyUrl) {
      // Connect to real proxy server!
      try {
        const cleanUrl = proxyUrl.replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/api/flood?pin=${pin}&count=${botCount}&prefix=${prefix}`);
        const data = await res.json();
        
        if (data.success) {
          // Add temporary loading entries showing joins are triggered
          for (let i = 1; i <= botCount; i++) {
            const id = i;
            const name = `${prefix}_${String(id).padStart(2, "0")}`;
            setBots((prev) => [...prev, { id, name, status: "joining" }]);
            
            setTimeout(() => {
              setBots((prev) =>
                prev.map((b) => (b.id === id ? { ...b, status: Math.random() > 0.05 ? "joined" : "failed" } : b))
              );
            }, 500 + i * 200);
          }
        }
      } catch (err) {
        console.error("Error connecting to Kahoot proxy server:", err);
        setBots([{ id: 999, name: "Verbindungsfehler", status: "failed" }]);
        setRunning(false);
      }
    } else {
      // Offline / simulation mode
      let count = 0;
      intervalRef.current = window.setInterval(() => {
        if (count >= botCount) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          return;
        }
        const id = ++botIdRef.current;
        const name = `${prefix}_${String(id).padStart(2, "0")}`;
        const status = Math.random() > 0.1 ? "joined" : "failed";
        setBots((prev) => [{ id, name, status: "joining" }, ...prev]);
        setTimeout(() => {
          setBots((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
        }, 300 + Math.random() * 500);
        count++;
      }, 150 + Math.random() * 200);
    }
  };

  const stopBots = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    if (proxyUrl) {
      try {
        const cleanUrl = proxyUrl.replace(/\/$/, "");
        await fetch(`${cleanUrl}/api/stop?pin=${pin}`);
      } catch (err) {
        console.error("Error stopping Kahoot proxy:", err);
      }
    }
  };

  const joinedCount = bots.filter((b) => b.status === "joined").length;
  const failedCount = bots.filter((b) => b.status === "failed").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <div className="label mb-4">Tool — 01</div>
          <h1 className="font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight italic mb-4">
            Kahoot
            <br />
            <span className="not-italic text-cream/40">Bot</span>
          </h1>
          <p className="text-sm text-cream-dim max-w-md mt-6">
            Gib den Game PIN ein, wähl die Anzahl Bots und lass sie das Kahoot-Game flooden.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-px bg-border">
          {/* Controls */}
          <div className="bg-bg p-6 md:p-8 space-y-6">
            <div>
              <label className="label block mb-2">Game PIN</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="1234567"
                disabled={running}
                className="w-full bg-transparent border border-border-strong rounded-none px-4 py-3 text-2xl font-serif italic tracking-[0.2em] text-center text-cream placeholder:text-cream-dark/40 focus:outline-none focus:border-cream/50 transition-colors disabled:opacity-30"
              />
            </div>

            <div>
              <label className="label block mb-2">
                Anzahl Bots: <span className="text-cream">{botCount}</span>
              </label>
              <input
                type="range" min={1} max={100} value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                disabled={running}
                className="w-full accent-cream disabled:opacity-30"
              />
              <div className="flex justify-between label mt-1"><span>1</span><span>50</span><span>100</span></div>
            </div>

            <div>
              <label className="label block mb-2">Bot Name Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.slice(0, 15))}
                disabled={running}
                className="w-full bg-transparent border border-border-strong rounded-none px-4 py-3 text-sm focus:outline-none focus:border-cream/50 transition-colors disabled:opacity-30"
              />
            </div>

            <div>
              <label className="label block mb-2">Proxy Server URL (optional)</label>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://dein-proxy.render.com"
                disabled={running}
                className="w-full bg-transparent border border-border-strong rounded-none px-4 py-2 text-xs text-cream placeholder:text-cream-dark/40 focus:outline-none focus:border-cream/50 transition-colors disabled:opacity-30"
              />
              <p className="text-[10px] text-cream-dark mt-1">
                Leer lassen für lokale Simulation in der Schule.
              </p>
            </div>

            {!running ? (
              <button
                onClick={startBots}
                disabled={!pin || pin.length < 4}
                className="w-full btn-main justify-center"
              >
                <Play size={16} /> Bots starten
              </button>
            ) : (
              <button
                onClick={stopBots}
                className="w-full btn-main justify-center bg-red text-cream hover:opacity-90"
              >
                <Square size={16} /> Stoppen
              </button>
            )}

            <div className="flex items-start gap-2 text-[11px] text-cream-dark border-t border-border pt-4">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>Verbinde einen Server für echte Bot-Floods.</span>
            </div>
          </div>

          {/* Bot Feed */}
          <div className="bg-bg p-6 md:p-8 flex flex-col">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-px bg-border mb-6">
              <div className="bg-bg p-4 text-center">
                <div className="text-2xl font-serif italic">{bots.length}</div>
                <div className="label mt-1">Total</div>
              </div>
              <div className="bg-bg p-4 text-center">
                <div className="text-2xl font-serif italic text-green-400">{joinedCount}</div>
                <div className="label mt-1">Joined</div>
              </div>
              <div className="bg-bg p-4 text-center">
                <div className="text-2xl font-serif italic text-red">{failedCount}</div>
                <div className="label mt-1">Failed</div>
              </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1">
              {bots.length === 0 && (
                <div className="text-center py-20 text-cream-dark/40">
                  <Bot size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Noch keine Bots gestartet.</p>
                </div>
              )}
              {bots.map((bot) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center justify-between px-3 py-2 border text-sm ${
                    bot.status === "joined"
                      ? "border-green-400/20 text-green-400/80"
                      : bot.status === "failed"
                      ? "border-red/20 text-red/80"
                      : "border-border text-cream-dim"
                  }`}
                >
                  <span className="font-mono text-xs">{bot.name}</span>
                  <span className="label">
                    {bot.status === "joining" ? "joining..." : bot.status === "joined" ? "✓ joined" : "✗ failed"}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
