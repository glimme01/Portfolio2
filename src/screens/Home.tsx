import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const games = [
  { name: "Snake", emoji: "🐍", path: "/games/snake" },
  { name: "Reaktion", emoji: "⚡", path: "/games/reaction" },
  { name: "Cookie", emoji: "🍪", path: "/games/cookie" },
  { name: "2048", emoji: "🧊", path: "/games/2048" },
  { name: "Tic Tac Toe", emoji: "❌", path: "/games/tictactoe" },
  { name: "Flappy", emoji: "🐦", path: "/games/flappy" },
];

export default function Home() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-between px-5 md:px-10 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-light to-bg pointer-events-none" />

        {/* Top row */}
        <div className="relative z-10 max-w-[1400px] mx-auto w-full pt-12 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="label">Moritz Freund</div>
          <div className="text-right">
            <div className="label">2025</div>
            <div className="label mt-1">Entertainment & Tools</div>
          </div>
        </div>

        {/* Big title */}
        <div className="relative z-10 max-w-[1400px] mx-auto w-full py-8 md:py-0">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-serif text-[clamp(4rem,14vw,12rem)] leading-[0.85] tracking-tight"
          >
            <span className="text-cream">Lange</span>
            <br />
            <span className="italic text-cream/40">weile?</span>
          </motion.h1>
        </div>

        {/* Bottom info row */}
        <div className="relative z-10 max-w-[1400px] mx-auto w-full pb-10 flex flex-col md:flex-row justify-between items-end gap-8">
          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card max-w-sm"
          >
            <p className="text-sm text-cream/70 leading-relaxed">
              Kahoot Bots, geile Games und alles was du brauchst wenn dir in der
              Schule langweilig ist. Direkt im Browser, kein Download.
            </p>
          </motion.div>

          {/* Right side tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-right text-sm text-cream-dark space-y-1"
          >
            <div>— Kahoot Bot</div>
            <div>— 6 Browser Games</div>
            <div>— 100% Kostenlos</div>
          </motion.div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="divider" />

      {/* ── Feature Sections ── */}
      <section className="max-w-[1400px] mx-auto px-5 md:px-10">
        {/* Kahoot Bot */}
        <Link to="/kahoot" className="group block py-16 md:py-24 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <div className="label mb-4">01 — Tool</div>
              <h2 className="font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight italic">
                Kahoot
                <br />
                <span className="not-italic text-cream/40">Bot</span>
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <p className="text-sm text-cream-dim max-w-xs text-right hidden md:block">
                Gib den Game PIN ein, wähl die Anzahl
                Bots und lass sie das Game flooden.
              </p>
              <div className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center group-hover:bg-cream group-hover:text-bg transition-all duration-300">
                <ArrowRight size={18} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>

        {/* Games */}
        <Link to="/games" className="group block py-16 md:py-24 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <div className="label mb-4">02 — Sammlung</div>
              <h2 className="font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight italic">
                Browser
                <br />
                <span className="not-italic text-cream/40">Games</span>
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <p className="text-sm text-cream-dim max-w-xs text-right hidden md:block">
                Snake, 2048, Flappy Bird, Cookie Clicker
                und mehr. Kein Download nötig.
              </p>
              <div className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center group-hover:bg-cream group-hover:text-bg transition-all duration-300">
                <ArrowRight size={18} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Quick Access Grid ── */}
      <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 md:py-24">
        <div className="label mb-8">Direkt spielen</div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link
                to={game.path}
                className="block bg-bg p-6 md:p-8 text-center group hover:bg-bg-light transition-colors"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">
                  {game.emoji}
                </div>
                <div className="text-xs text-cream-dark group-hover:text-cream transition-colors">
                  {game.name}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
