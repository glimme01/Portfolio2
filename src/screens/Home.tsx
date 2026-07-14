import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Cookie } from "lucide-react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

export default function Home() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ── Hero with GooeyText ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-5 md:px-10 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg-light/30 to-bg pointer-events-none" />

        {/* Floating accent dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[300px] h-[300px] rounded-full opacity-[0.03]"
              style={{
                background: "radial-gradient(circle, #FFA586, transparent 70%)",
                left: `${15 + i * 18}%`,
                top: `${20 + (i % 3) * 20}%`,
              }}
              animate={{
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 label mb-8"
        >
          Willkommen
        </motion.div>

        {/* GooeyText Morphing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 w-full"
        >
          <GooeyText
            texts={[
              "Das ist",
              "MoritzFreund.de",
              "Entertainment",
              "& Tools",
            ]}
            morphTime={1.2}
            cooldownTime={0.5}
            className="h-[120px] md:h-[160px] font-bold"
            textClassName="font-serif italic tracking-tight"
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 text-cream-dim text-sm md:text-base text-center max-w-md mt-8 leading-relaxed"
        >
          Was willst du machen?
        </motion.p>

        {/* ── Choice Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-10 md:mt-14 w-full max-w-2xl"
        >
          {/* Kahoot Bot Card */}
          <Link
            to="/kahoot"
            className="group relative border border-[rgba(240,235,227,0.12)] bg-[#141416]/60 backdrop-blur-sm p-6 md:p-8 flex flex-col items-center text-center hover:border-purple-500/40 transition-all duration-500 hover:bg-purple-500/[0.03] overflow-hidden"
          >
            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-b from-purple-500/5 to-transparent" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full border border-[rgba(240,235,227,0.15)] flex items-center justify-center mb-5 group-hover:border-purple-500/30 group-hover:bg-purple-500/10 transition-all duration-300">
                <Bot size={24} strokeWidth={1.5} className="text-cream-dim group-hover:text-purple-400 transition-colors" />
              </div>
              <h2 className="font-serif text-xl md:text-2xl italic mb-2 group-hover:text-purple-400 transition-colors">
                Kahoot Bot
              </h2>
              <p className="text-xs text-cream-dark leading-relaxed mb-5">
                Flood jedes Kahoot-Game mit Bots. Gib den PIN ein und leg los. Chaos guaranteed.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-cream-dim group-hover:text-purple-400 transition-colors">
                <span>Starten</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Cookie Clicker Card */}
          <Link
            to="/games/cookie"
            className="group relative border border-[rgba(240,235,227,0.12)] bg-[#141416]/60 backdrop-blur-sm p-6 md:p-8 flex flex-col items-center text-center hover:border-amber-500/40 transition-all duration-500 hover:bg-amber-500/[0.03] overflow-hidden"
          >
            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-b from-amber-500/5 to-transparent" />

            <div className="relative z-10">
              <motion.div
                className="w-16 h-16 rounded-full border border-[rgba(240,235,227,0.15)] flex items-center justify-center mb-5 group-hover:border-amber-500/30 group-hover:bg-amber-500/10 transition-all duration-300"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Cookie size={24} strokeWidth={1.5} className="text-cream-dim group-hover:text-amber-400 transition-colors" />
              </motion.div>
              <h2 className="font-serif text-xl md:text-2xl italic mb-2 group-hover:text-amber-400 transition-colors">
                Cookie Clicker
              </h2>
              <p className="text-xs text-cream-dark leading-relaxed mb-5">
                Der ultimative Cookie Clicker. 20 Gebäude, Prestige, 25+ Easter Eggs. Besser als das Original.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-cream-dim group-hover:text-amber-400 transition-colors">
                <span>Jetzt Spielen</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-cream-dark/40 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-cream-dim" />
          </motion.div>
        </motion.div>
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

        {/* Cookie Clicker */}
        <Link to="/games/cookie" className="group block py-16 md:py-24 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <div className="label mb-4">02 — Game</div>
              <h2 className="font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight italic">
                Cookie
                <br />
                <span className="not-italic text-cream/40">Clicker</span>
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <p className="text-sm text-cream-dim max-w-xs text-right hidden md:block">
                Der ultimative Cookie Clicker mit 
                Prestige, Achievements und 25+ Easter Eggs.
              </p>
              <div className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center group-hover:bg-cream group-hover:text-bg transition-all duration-300">
                <ArrowRight size={18} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Bottom spacer ── */}
      <div className="h-16" />
    </motion.div>
  );
}
