import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const games = [
  // Klassiker
  { name: "Snake", emoji: "🐍", path: "/games/snake", desc: "Klassiker. Friss und wachse.", category: "Klassiker" },
  { name: "Flappy Bird", emoji: "🐦", path: "/games/flappy", desc: "Tipp dich durch die Pipes.", category: "Klassiker" },
  { name: "Breakout", emoji: "🧱", path: "/games/breakout", desc: "Brick Breaker mit Power-ups.", category: "Klassiker" },
  // Reflex
  { name: "Reaktionstest", emoji: "⚡", path: "/games/reaction", desc: "Wie schnell bist du wirklich?", category: "Reflex" },
  { name: "Timberman", emoji: "🪓", path: "/games/timberman", desc: "Holz hacken, Äste ausweichen.", category: "Reflex" },
  // Puzzle
  { name: "2048", emoji: "🧩", path: "/games/2048", desc: "Slide die Tiles bis zur 2048.", category: "Puzzle" },
  { name: "Number Merge", emoji: "🔢", path: "/games/merge", desc: "Zahlen fallen und mergen.", category: "Puzzle" },
  { name: "Hextris", emoji: "🔷", path: "/games/hextris", desc: "Hexagon drehen, Blöcke clearen.", category: "Puzzle" },
  { name: "Word Scramble", emoji: "🔤", path: "/games/word", desc: "Buchstaben in 30 Sekunden ordnen.", category: "Puzzle" },
  // Entspannung
  { name: "Cookie Clicker", emoji: "🍪", path: "/games/cookie", desc: "Klick die Cookies. Kauf Upgrades.", category: "Entspannung" },
  { name: "Bubble Shooter", emoji: "🫧", path: "/games/bubble", desc: "Bubbles abschießen und matchen.", category: "Entspannung" },
  { name: "Tic Tac Toe", emoji: "❌", path: "/games/tictactoe", desc: "Gegen nen Kumpel am selben Gerät.", category: "Entspannung" },
];

const categories = ["Klassiker", "Reflex", "Puzzle", "Entspannung"];

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
          <div className="text-right">
            <p className="text-sm text-cream-dim max-w-xs pb-2">
              {games.length} Games — direkt im Browser.
              <br />
              Kein Download, kein Login.
            </p>
          </div>
        </div>

        {/* Games grouped by category */}
        {categories.map((cat) => {
          const catGames = games.filter((g) => g.category === cat);
          return (
            <div key={cat} className="mb-12">
              <div className="label mb-4 flex items-center gap-3">
                <span>{cat}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-cream-dark">{catGames.length}</span>
              </div>
              <div className="border-t border-border">
                {catGames.map((game, i) => (
                  <motion.div
                    key={game.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={game.path}
                      className="group flex items-center justify-between py-5 md:py-6 border-b border-border hover:bg-bg-light/50 transition-colors px-2 md:px-4"
                    >
                      <div className="flex items-center gap-5 md:gap-8">
                        <span className="text-2xl md:text-3xl group-hover:scale-110 transition-transform inline-block">
                          {game.emoji}
                        </span>
                        <div>
                          <h3 className="font-serif text-lg md:text-xl italic group-hover:text-accent transition-colors">
                            {game.name}
                          </h3>
                          <p className="text-xs text-cream-dark mt-0.5 hidden sm:block">{game.desc}</p>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center group-hover:bg-cream group-hover:text-bg transition-all duration-300 shrink-0">
                        <ArrowRight size={15} strokeWidth={1.5} />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
