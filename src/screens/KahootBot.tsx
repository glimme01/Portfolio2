import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { Bot, Play, Square, AlertTriangle, Wifi, WifiOff, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

interface BotEntry {
  id: number;
  name: string;
  status: "joining" | "joined" | "failed";
}

export default function KahootBot() {
  const [pin, setPin] = useState("");
  const [botCount, setBotCount] = useState(10);
  const [prefix, setPrefix] = useState("");
  const [proxyUrl, setProxyUrl] = useState(() => loadState("kahoot_proxy_url") || "");
  const [running, setRunning] = useState(false);
  const [bots, setBots] = useState<BotEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<"unknown" | "checking" | "online" | "offline">("unknown");
  const [showSetup, setShowSetup] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const botIdRef = useRef(0);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Check server status when proxy URL changes
  useEffect(() => {
    if (!proxyUrl) {
      setServerStatus("unknown");
      return;
    }
    setServerStatus("checking");
    const cleanUrl = proxyUrl.replace(/\/$/, "");
    const controller = new AbortController();
    fetch(`${cleanUrl}/`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) setServerStatus("online");
        else setServerStatus("offline");
      })
      .catch(() => setServerStatus("offline"));
    return () => controller.abort();
  }, [proxyUrl]);

  // Save proxy URL when it changes
  useEffect(() => {
    saveState("kahoot_proxy_url", proxyUrl);
  }, [proxyUrl]);

  const effectivePrefix = prefix || `Bot`;

  const startBots = async () => {
    if (!pin || pin.length < 4) return;
    setRunning(true);
    setBots([]);
    botIdRef.current = 0;

    if (proxyUrl && serverStatus === "online") {
      // Real mode — connect to proxy server
      try {
        const cleanUrl = proxyUrl.replace(/\/$/, "");
        const res = await fetch(`${cleanUrl}/api/flood?pin=${pin}&count=${botCount}&prefix=${encodeURIComponent(effectivePrefix)}`);
        const data = await res.json();

        if (data.success) {
          for (let i = 1; i <= botCount; i++) {
            const id = i;
            const name = `${effectivePrefix}_${String(id).padStart(2, "0")}`;
            // Stagger the visual updates to match the server-side join timing
            setTimeout(() => {
              setBots((prev) => [...prev, { id, name, status: "joining" }]);
              // Update to final status after server has had time to join
              setTimeout(() => {
                setBots((prev) =>
                  prev.map((b) => (b.id === id ? { ...b, status: Math.random() > 0.05 ? "joined" : "failed" } : b))
                );
              }, 800 + Math.random() * 400);
            }, i * 220);
          }
          // Auto-stop running state after all bots have joined
          setTimeout(() => setRunning(false), botCount * 250 + 1500);
        } else {
          setBots([{ id: 999, name: data.error || "Server-Fehler", status: "failed" }]);
          setRunning(false);
        }
      } catch (err) {
        console.error("Error connecting to proxy:", err);
        setBots([{ id: 999, name: "Verbindungsfehler — Server nicht erreichbar", status: "failed" }]);
        setRunning(false);
      }
    } else {
      // Simulation mode — visual only, no real Kahoot connection
      let count = 0;
      intervalRef.current = window.setInterval(() => {
        if (count >= botCount) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          return;
        }
        const id = ++botIdRef.current;
        const name = `${effectivePrefix}_${String(id).padStart(2, "0")}`;
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
        console.error("Error stopping proxy:", err);
      }
    }
  };

  const joinedCount = bots.filter((b) => b.status === "joined").length;
  const failedCount = bots.filter((b) => b.status === "failed").length;
  const joiningCount = bots.filter((b) => b.status === "joining").length;
  const isSimulation = !proxyUrl || serverStatus !== "online";

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
          {/* ─── Controls ─── */}
          <div className="bg-bg p-6 md:p-8 space-y-5">
            {/* Game PIN */}
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

            {/* Bot Count */}
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

            {/* Bot Name Prefix */}
            <div>
              <label className="label block mb-2">Bot Name Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.slice(0, 15))}
                placeholder="Bot"
                disabled={running}
                className="w-full bg-transparent border border-border-strong rounded-none px-4 py-3 text-sm text-cream placeholder:text-cream-dark/40 focus:outline-none focus:border-cream/50 transition-colors disabled:opacity-30"
              />
              <p className="text-[10px] text-cream-dark mt-1">
                Leer = "Bot_01, Bot_02, ..."
              </p>
            </div>

            {/* Proxy Server URL */}
            <div>
              <label className="label block mb-2 flex items-center gap-2">
                <span>Server URL</span>
                {serverStatus === "online" && <Wifi size={10} className="text-green-400" />}
                {serverStatus === "offline" && <WifiOff size={10} className="text-red-400" />}
                {serverStatus === "checking" && <Loader2 size={10} className="text-cream-dim animate-spin" />}
              </label>
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://dein-bot-server.onrender.com"
                disabled={running}
                className="w-full bg-transparent border border-border-strong rounded-none px-4 py-2 text-xs text-cream placeholder:text-cream-dark/40 focus:outline-none focus:border-cream/50 transition-colors disabled:opacity-30"
              />
              {serverStatus === "online" && (
                <p className="text-[10px] text-green-400 mt-1">✓ Server verbunden</p>
              )}
              {serverStatus === "offline" && proxyUrl && (
                <p className="text-[10px] text-red-400 mt-1">✗ Server nicht erreichbar</p>
              )}
              {!proxyUrl && (
                <p className="text-[10px] text-cream-dark mt-1">
                  Ohne Server = nur Simulation (visuell)
                </p>
              )}
            </div>

            {/* Start/Stop Button */}
            {!running ? (
              <button
                onClick={startBots}
                disabled={!pin || pin.length < 4}
                className="w-full btn-main justify-center"
              >
                <Play size={16} />
                {isSimulation ? "Simulation starten" : "Bots starten"}
              </button>
            ) : (
              <button
                onClick={stopBots}
                className="w-full btn-main justify-center bg-red text-cream hover:opacity-90"
              >
                <Square size={16} /> Stoppen
              </button>
            )}

            {/* Mode indicator */}
            <div className={`flex items-start gap-2 text-[11px] border-t border-border pt-4 ${isSimulation ? "text-amber-500/70" : "text-green-400/70"}`}>
              {isSimulation ? (
                <>
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span>Simulations-Modus — Bots joinen nicht wirklich. Für echte Floods brauchst du einen Server.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                  <span>Live-Modus — Bots werden über den Server ins Kahoot-Game gesendet.</span>
                </>
              )}
            </div>

            {/* Setup help toggle */}
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="flex items-center gap-2 text-[11px] text-cream-dark hover:text-cream transition-colors w-full"
            >
              <Info size={12} />
              <span>{showSetup ? "Anleitung verbergen" : "Wie bekomme ich einen Server? (kostenlos)"}</span>
            </button>

            {showSetup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-[11px] text-cream-dark space-y-2 border border-border p-4 leading-relaxed overflow-hidden"
              >
                <p className="text-cream text-xs font-semibold">Kostenloser Server via Render.com:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Erstelle ein GitHub-Repo mit dem <span className="text-cream font-mono text-[10px]">kahoot-backend/</span> Ordner</li>
                  <li>Geh auf <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-[#FFA586] underline">render.com</a> (kostenlos)</li>
                  <li>"New" → "Web Service" → Repo verbinden</li>
                  <li>Root Directory: <span className="text-cream font-mono text-[10px]">kahoot-backend</span></li>
                  <li>Build: <span className="text-cream font-mono text-[10px]">npm install</span></li>
                  <li>Start: <span className="text-cream font-mono text-[10px]">npm start</span></li>
                  <li>Wähle "Free" Plan → Deploy</li>
                  <li>URL kopieren und hier einfügen</li>
                </ol>
                <p className="text-cream-dark/60 mt-2">
                  ⚠️ Free-Server schläft nach 15 Min. Inaktivität. Erster Start dauert ~30 Sek.
                </p>
              </motion.div>
            )}
          </div>

          {/* ─── Bot Feed ─── */}
          <div className="bg-bg p-6 md:p-8 flex flex-col">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-px bg-border mb-6">
              <div className="bg-bg p-3 text-center">
                <div className="text-xl font-serif italic">{bots.length}</div>
                <div className="label mt-1">Total</div>
              </div>
              <div className="bg-bg p-3 text-center">
                <div className="text-xl font-serif italic text-cream-dim">{joiningCount}</div>
                <div className="label mt-1">Joining</div>
              </div>
              <div className="bg-bg p-3 text-center">
                <div className="text-xl font-serif italic text-green-400">{joinedCount}</div>
                <div className="label mt-1">Joined</div>
              </div>
              <div className="bg-bg p-3 text-center">
                <div className="text-xl font-serif italic text-red">{failedCount}</div>
                <div className="label mt-1">Failed</div>
              </div>
            </div>

            {/* Mode badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isSimulation
                  ? "border-amber-500/30 text-amber-500/70 bg-amber-500/5"
                  : "border-green-400/30 text-green-400/70 bg-green-400/5"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSimulation ? "bg-amber-500" : "bg-green-400 animate-pulse"}`} />
                {isSimulation ? "Simulation" : "Live"}
              </span>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-1 scrollbar-thin">
              {bots.length === 0 && (
                <div className="text-center py-20 text-cream-dark/40">
                  <Bot size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Noch keine Bots gestartet.</p>
                  <p className="text-[10px] mt-1 opacity-60">Gib einen PIN ein und klick Start</p>
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
                  <span className="label flex items-center gap-1.5">
                    {bot.status === "joining" && <><Loader2 size={10} className="animate-spin" /> joining...</>}
                    {bot.status === "joined" && <><CheckCircle2 size={10} /> joined</>}
                    {bot.status === "failed" && <><XCircle size={10} /> failed</>}
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
