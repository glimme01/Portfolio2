import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const games = [
  { name: "Snake", emoji: "🐍", path: "/games/snake", desc: "Klassiker. Friss und wachse." },
  { name: "Reaktionstest", emoji: "⚡", path: "/games/reaction", desc: "Wie schnell bist du wirklich?" },
  { name: "Cookie Clicker", emoji: "🍪", path: "/games/cookie", desc: "Klick die Cookies. Kauf Upgrades." },
  { name: "2048", emoji: "🧊", path: "/games/2048", desc: "Slide die Tiles bis zur 2048." },
  { name: "Tic Tac Toe", emoji: "❌", path: "/games/tictactoe", desc: "Gegen nen Kumpel am selben Gerät." },
  { name: "Flappy Bird", emoji: "🐦", path: "/games/flappy", desc: "Tipp dich durch die Pipes." },
];

export default function Games() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12 md:mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <div className="label mb-4">Sammlung — 02</div>
            <h1 className="font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight italic">
              Browser
              <br />
              <span className="not-italic text-cream/40">Games</span>
            </h1>
          </div>
          <p className="text-sm text-cream-dim max-w-xs pb-2">
            Alle Games laufen direkt im Browser.
            Kein Download, kein Login.
          </p>
        </div>

        {/* Games List */}
        <div className="border-t border-border">
          {games.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={game.path}
                className="group flex items-center justify-between py-6 md:py-8 border-b border-border hover:bg-bg-light/50 transition-colors px-2 md:px-4"
              >
                <div className="flex items-center gap-5 md:gap-8">
                  <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform inline-block">
                    {game.emoji}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl md:text-2xl italic group-hover:text-accent transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-cream-dark mt-1 hidden sm:block">{game.desc}</p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full border border-border-strong flex items-center justify-center group-hover:bg-cream group-hover:text-bg transition-all duration-300 shrink-0">
                  <ArrowRight size={16} strokeWidth={1.5} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
