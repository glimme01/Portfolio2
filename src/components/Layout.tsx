import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navItems = [
    { name: "Главная", label: "Home", path: "/" },
    { name: "Kahoot Bot", label: "Kahoot Bot", path: "/kahoot" },
    { name: "Games", label: "Games", path: "/games" },
  ];

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/games" && location.pathname.startsWith("/games"));

  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* ── Topbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
          {/* Left: Pill Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`pill ${isActive(item.path) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden pill px-3"
            aria-label="Menü"
          >
            <Menu size={18} />
          </button>

          {/* Center/Right: Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            {/* Grid icon like reference */}
            <div className="grid grid-cols-3 gap-[3px] opacity-60 group-hover:opacity-100 transition-opacity">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-[5px] h-[5px] bg-cream rounded-[1px]" />
              ))}
            </div>
            <div className="text-right leading-tight">
              <div className="text-sm font-medium tracking-wide">Moritz</div>
              <div className="text-sm font-medium tracking-wide">Freund</div>
            </div>
          </Link>
        </div>
      </header>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <div className="absolute inset-0 bg-bg/90" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[80%] max-w-xs bg-bg border-r border-border flex flex-col"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-border">
                <span className="text-sm font-medium">Moritz Freund</span>
                <button onClick={() => setMobileOpen(false)} className="pill px-2 py-2">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center px-6 gap-3">
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                  >
                    <Link
                      to={item.path}
                      className={`block py-3 font-serif text-3xl italic transition-opacity ${
                        isActive(item.path) ? "opacity-100" : "opacity-40 hover:opacity-80"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <main className="pt-16 min-h-screen">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-5 md:px-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="text-sm text-cream-dark">
            © {new Date().getFullYear()} Moritz Freund
          </div>
          <div className="flex gap-6 text-sm text-cream-dark">
            <a href="https://www.instagram.com/glmn.media/" target="_blank" rel="noopener noreferrer" className="hover:text-cream transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
