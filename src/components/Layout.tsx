/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Leaf } from "lucide-react";

type Theme = "light" | "green" | "dark-green";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  // Cursor spotlight state
  const [cursor, setCursor] = useState({ x: -300, y: -300 });
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const move = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const navItems = [
    { name: "Main", path: "/" },
    { name: "Projekte", path: "/projects" },
    { name: "Tools", path: "/services" },
    { name: "Kontakt", path: "/contact" },
  ];

  const toggleTheme = () => {
    if (theme === "light") setTheme("green");
    else if (theme === "green") setTheme("dark-green");
    else setTheme("light");
  };

  return (
    <div className={`min-h-screen theme-${theme} transition-colors duration-700`}>
      <div className="min-h-screen artistic-grid relative text-primary bg-surface transition-colors duration-500">

        {/* Cursor Spotlight */}
        <div
          ref={spotlightRef}
          className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(350px circle at ${cursor.x}px ${cursor.y}px, var(--color-primary) 0%, transparent 80%)`,
            opacity: 0.04,
          }}
        />

        {/* Sidebar - Desktop Only */}
        <nav className="fixed left-0 top-0 w-20 h-full border-r border-outline flex flex-col items-center py-12 justify-between z-50 bg-surface/80 backdrop-blur-sm hidden lg:flex">
          <Link to="/" className="font-serif italic text-3xl font-black hover:opacity-70 transition-opacity">
            MF.
          </Link>

          <div className="flex flex-col gap-10 items-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`vertical-text text-subtle transition-all duration-300 hover:opacity-100 ${location.pathname === item.path
                    ? "opacity-100 scale-105 font-bold underline decoration-primary/30"
                    : "opacity-40"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 border border-outline rounded-full flex items-center justify-center hover:bg-primary hover:text-surface transition-all cursor-pointer"
              title="Thema wechseln"
            >
              {theme === "light" && <Sun size={16} />}
              {theme === "green" && <Leaf size={16} />}
              {theme === "dark-green" && <Moon size={16} />}
            </button>
            <div className="w-1 h-8 bg-outline/30 rounded-full" />
          </div>
        </nav>

        <div className="flex flex-col min-h-screen lg:pl-20">
          {/* Header */}
          <header className="h-20 border-b border-outline flex items-center justify-between px-8 md:px-12 sticky top-0 bg-surface/80 backdrop-blur-sm z-40">
            <div className="flex gap-8 md:gap-12">
              <span className="text-subtle hidden sm:block">Digital</span>
              <span className="text-subtle">Ästhetik</span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={toggleTheme}
                className="lg:hidden w-10 h-10 border border-outline rounded-full flex items-center justify-center"
              >
                {theme === "light" && <Sun size={16} />}
                {theme === "green" && <Leaf size={16} />}
                {theme === "dark-green" && <Moon size={16} />}
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </main>

          {/* Footer */}
          <footer className="w-full border-t border-outline bg-surface-low/30 py-16 px-8 md:px-12">
            <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="font-serif italic text-3xl font-black">
                Moritz Freund
                <p className="text-[10px] font-sans not-italic uppercase tracking-[0.2em] opacity-40 mt-2 font-semibold">
                  Multidisziplinär // {new Date().getFullYear()}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-12 gap-y-4">
                <a href="https://www.instagram.com/glmn.media/" className="text-subtle hover:opacity-100 transition-opacity">Instagram</a>
                <span className="text-subtle opacity-30">Vimeo</span>
                <span className="text-subtle opacity-30">LinkedIn</span>
              </div>

              <div className="text-subtle font-bold opacity-30">
                Vol. 01 / Portfolio
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
