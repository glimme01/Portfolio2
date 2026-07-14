import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Games() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-5 md:px-10 py-12 md:py-20 relative overflow-hidden">
        {/* Background cookie particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl md:text-6xl opacity-[0.04] select-none"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 8 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "easeInOut",
              }}
            >
              🍪
            </motion.div>
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="label mb-6">Browser Game — 01</div>

          {/* Giant Cookie */}
          <motion.div
            className="text-[120px] md:text-[180px] leading-none mb-4 select-none"
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🍪
          </motion.div>

          <h1 className="font-serif text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] tracking-tight italic mb-6">
            Cookie
            <br />
            <span className="not-italic text-cream/40">Clicker</span>
          </h1>

          <p className="text-cream-dim text-sm md:text-base mb-10 max-w-md mx-auto leading-relaxed">
            Der ultimative Cookie Clicker mit 20 Gebäuden, 30+ Achievements,
            Goldenen Cookies, Prestige-System und über 25 versteckten Easter
            Eggs. Besser als das Original.
          </p>

          <Link
            to="/games/cookie"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-[#FFA586] text-[#141416] font-semibold text-base rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_40px_rgba(255,165,134,0.3)] hover:shadow-[0_0_60px_rgba(255,165,134,0.5)]"
          >
            Jetzt Spielen
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>

          {/* Stats teaser */}
          <div className="grid grid-cols-3 gap-4 mt-14 max-w-sm mx-auto text-center">
            <div>
              <div className="text-2xl font-serif font-black text-[#FFA586]">
                20
              </div>
              <div className="text-[10px] text-cream-dark uppercase tracking-wider mt-1">
                Gebäude
              </div>
            </div>
            <div>
              <div className="text-2xl font-serif font-black text-[#FFA586]">
                30+
              </div>
              <div className="text-[10px] text-cream-dark uppercase tracking-wider mt-1">
                Achievements
              </div>
            </div>
            <div>
              <div className="text-2xl font-serif font-black text-[#FFA586]">
                25+
              </div>
              <div className="text-[10px] text-cream-dark uppercase tracking-wider mt-1">
                Easter Eggs
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
