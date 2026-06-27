import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { loadState, saveState } from "../utils/storage";

interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cps: number;
  owned: number;
}

interface ClickUpgrade {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  cpcAdd: number;
  owned: number;
}

const initialUpgrades: Upgrade[] = [
  { id: "cursor", name: "Auto-Klicker", emoji: "👆", baseCost: 15, cps: 0.1, owned: 0 },
  { id: "grandma", name: "Oma", emoji: "👵", baseCost: 100, cps: 1, owned: 0 },
  { id: "farm", name: "Cookie-Farm", emoji: "🌾", baseCost: 500, cps: 5, owned: 0 },
  { id: "factory", name: "Fabrik", emoji: "🏭", baseCost: 3000, cps: 20, owned: 0 },
  { id: "bank", name: "Cookie-Bank", emoji: "🏦", baseCost: 15000, cps: 100, owned: 0 },
  { id: "portal", name: "Portal", emoji: "🌀", baseCost: 100000, cps: 500, owned: 0 },
  { id: "tea", name: "Tee-Maschine", emoji: "☕", baseCost: 500000, cps: 2500, owned: 0 },
  { id: "quantum", name: "Quanten-Ofen", emoji: "⚛️", baseCost: 2500000, cps: 12000, owned: 0 },
  { id: "galaxy", name: "Cookie-Galaxie", emoji: "🌌", baseCost: 15000000, cps: 80000, owned: 0 },
  { id: "time", name: "Zeitreise-Portal", emoji: "⏳", baseCost: 100000000, cps: 500000, owned: 0 },
];

const initialClickUpgrades: ClickUpgrade[] = [
  { id: "click1", name: "Super-Finger", emoji: "⚡", baseCost: 50, cpcAdd: 1, owned: 0 },
  { id: "click2", name: "Mega-Finger", emoji: "🚀", baseCost: 400, cpcAdd: 5, owned: 0 },
  { id: "click3", name: "Hyper-Finger", emoji: "💥", baseCost: 3000, cpcAdd: 25, owned: 0 },
  { id: "click4", name: "Ultra-Finger", emoji: "🪐", baseCost: 25000, cpcAdd: 120, owned: 0 },
  { id: "click5", name: "Omega-Finger", emoji: "👑", baseCost: 150000, cpcAdd: 750, owned: 0 },
];

export default function CookieClicker() {
  const [cookies, setCookies] = useState(() => Number(loadState("cc_cookies") || "0"));
  const [totalClicks, setTotalClicks] = useState(0);
  const [activeTab, setActiveTab] = useState<"buildings" | "clicks">("buildings");
  
  const [upgrades, setUpgrades] = useState<Upgrade[]>(() => {
    const saved = loadState("cc_upgrades");
    return saved ? JSON.parse(saved) : initialUpgrades;
  });

  const [clickUpgrades, setClickUpgrades] = useState<ClickUpgrade[]>(() => {
    const saved = loadState("cc_click_upgrades");
    return saved ? JSON.parse(saved) : initialClickUpgrades;
  });

  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  let clickId = 0;

  const cps = upgrades.reduce((sum, u) => sum + u.cps * u.owned, 0);
  const cpc = 1 + clickUpgrades.reduce((sum, u) => sum + u.cpcAdd * u.owned, 0);

  // Auto-generation
  useEffect(() => {
    if (cps <= 0) return;
    const interval = setInterval(() => {
      setCookies((c) => c + cps / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [cps]);

  // Save
  useEffect(() => {
    const save = setInterval(() => {
      saveState("cc_cookies", String(Math.floor(cookies)));
      saveState("cc_upgrades", JSON.stringify(upgrades));
      saveState("cc_click_upgrades", JSON.stringify(clickUpgrades));
    }, 2000);
    return () => clearInterval(save);
  }, [cookies, upgrades, clickUpgrades]);

  const handleClick = (e: React.MouseEvent) => {
    setCookies((c) => c + cpc);
    setTotalClicks((c) => c + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++clickId;
    setClicks((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setClicks((prev) => prev.filter((c) => c.id !== id)), 800);
  };

  const getCost = (u: Upgrade | ClickUpgrade) => Math.floor(u.baseCost * Math.pow(1.15, u.owned));

  const buyUpgrade = (id: string) => {
    const u = upgrades.find((up) => up.id === id);
    if (!u) return;
    const cost = getCost(u);
    if (cookies < cost) return;

    setCookies((c) => c - cost);
    setUpgrades((prev) =>
      prev.map((up) => (up.id === id ? { ...up, owned: up.owned + 1 } : up))
    );
  };

  const buyClickUpgrade = (id: string) => {
    const u = clickUpgrades.find((up) => up.id === id);
    if (!u) return;
    const cost = getCost(u);
    if (cookies < cost) return;

    setCookies((c) => c - cost);
    setClickUpgrades((prev) =>
      prev.map((up) => (up.id === id ? { ...up, owned: up.owned + 1 } : up))
    );
  };

  const resetAll = () => {
    if (window.confirm("Möchtest du deinen Spielstand wirklich zurücksetzen?")) {
      setCookies(0);
      setUpgrades(initialUpgrades);
      setClickUpgrades(initialClickUpgrades);
      saveState("cc_cookies", "0");
      saveState("cc_upgrades", JSON.stringify(initialUpgrades));
      saveState("cc_click_upgrades", JSON.stringify(initialClickUpgrades));
    }
  };

  const format = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return Math.floor(n).toString();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        <Link to="/games" className="inline-flex items-center gap-2 text-[#a09a90] hover:text-[#FFA586] transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Zurück zu Games
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Main clicker area */}
          <div className="flex flex-col items-center justify-center p-6 border border-[rgba(240,235,227,0.12)] bg-[#141416]/20">
            <h1 className="font-serif font-black text-3xl md:text-4xl mb-2 text-center">🍪 Cookie Clicker</h1>
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md my-6 text-center">
              <div className="border border-[rgba(240,235,227,0.12)] p-3">
                <div className="text-2xl md:text-3xl font-serif font-black text-[#FFA586]">{format(cookies)}</div>
                <div className="text-[10px] text-[#a09a90] uppercase tracking-wider">Cookies</div>
              </div>
              <div className="border border-[rgba(240,235,227,0.12)] p-3">
                <div className="text-xl font-serif font-bold text-[#f0ebe3]">{format(cpc)}</div>
                <div className="text-[10px] text-[#a09a90] uppercase tracking-wider">pro Klick</div>
              </div>
              <div className="border border-[rgba(240,235,227,0.12)] p-3">
                <div className="text-xl font-serif font-bold text-[#f0ebe3]">{cps.toFixed(1)}</div>
                <div className="text-[10px] text-[#a09a90] uppercase tracking-wider">pro Sek.</div>
              </div>
            </div>

            {/* Click Button */}
            <div className="relative my-8">
              <button
                onClick={handleClick}
                className="w-48 h-48 md:w-60 md:h-60 rounded-full border border-[rgba(240,235,227,0.12)] flex items-center justify-center text-8xl md:text-9xl active:scale-95 hover:scale-105 transition-transform select-none cursor-pointer relative overflow-hidden bg-transparent"
              >
                🍪
                {clicks.map((c) => (
                  <motion.span
                    key={c.id}
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -80, scale: 1.6 }}
                    transition={{ duration: 0.6 }}
                    className="absolute text-[#FFA586] font-serif font-bold text-xl pointer-events-none"
                    style={{ left: c.x, top: c.y }}
                  >
                    +{format(cpc)}
                  </motion.span>
                ))}
              </button>
            </div>

            <div className="text-center">
              <p className="text-[#a09a90] text-sm font-medium">{totalClicks} Klicks total</p>
              <p className="text-[10px] text-[#a09a90]/40 mt-1 font-mono">💾 Auto-Save in Cookies + LocalStorage</p>
              <button onClick={resetAll} className="text-xs text-red hover:underline mt-4 opacity-50 hover:opacity-100 transition-opacity">
                Spielstand zurücksetzen
              </button>
            </div>
          </div>

          {/* Upgrade & Shop panel */}
          <div className="border border-[rgba(240,235,227,0.12)] flex flex-col h-[600px]">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-[rgba(240,235,227,0.12)]">
              <button
                onClick={() => setActiveTab("buildings")}
                className={`py-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "buildings" ? "bg-[rgba(240,235,227,0.05)] text-[#FFA586]" : "text-[#a09a90] hover:text-[#f0ebe3]"
                }`}
              >
                Omas & Gebäude
              </button>
              <button
                onClick={() => setActiveTab("clicks")}
                className={`py-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "clicks" ? "bg-[rgba(240,235,227,0.05)] text-[#FFA586]" : "text-[#a09a90] hover:text-[#f0ebe3]"
                }`}
              >
                Klick-Upgrades
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
              {activeTab === "buildings" ? (
                upgrades.map((u) => {
                  const cost = getCost(u);
                  const canBuy = cookies >= cost;
                  return (
                    <button
                      key={u.id}
                      onClick={() => buyUpgrade(u.id)}
                      disabled={!canBuy}
                      className={`w-full flex items-center gap-3 p-3 transition-all text-left border ${
                        canBuy
                          ? "bg-[#141416]/60 hover:bg-[#FFA586]/10 border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 cursor-pointer"
                          : "bg-transparent opacity-30 cursor-not-allowed border-[rgba(240,235,227,0.06)]"
                      }`}
                    >
                      <span className="text-3xl shrink-0">{u.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-[#f0ebe3]">{u.name}</div>
                        <div className="text-[10px] text-[#a09a90] font-mono mt-0.5">+{u.cps}/s · Cost: {format(cost)}</div>
                      </div>
                      <span className="text-sm font-serif font-black text-[#a09a90] px-2">x{u.owned}</span>
                    </button>
                  );
                })
              ) : (
                clickUpgrades.map((u) => {
                  const cost = getCost(u);
                  const canBuy = cookies >= cost;
                  return (
                    <button
                      key={u.id}
                      onClick={() => buyClickUpgrade(u.id)}
                      disabled={!canBuy}
                      className={`w-full flex items-center gap-3 p-3 transition-all text-left border ${
                        canBuy
                          ? "bg-[#141416]/60 hover:bg-[#FFA586]/10 border-[rgba(240,235,227,0.12)] hover:border-[#FFA586]/30 cursor-pointer"
                          : "bg-transparent opacity-30 cursor-not-allowed border-[rgba(240,235,227,0.06)]"
                      }`}
                    >
                      <span className="text-3xl shrink-0">{u.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-[#f0ebe3]">{u.name}</div>
                        <div className="text-[10px] text-[#a09a90] font-mono mt-0.5">+{u.cpcAdd} klick · Cost: {format(cost)}</div>
                      </div>
                      <span className="text-sm font-serif font-black text-[#a09a90] px-2">x{u.owned}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
