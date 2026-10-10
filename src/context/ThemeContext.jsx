// src/context/ThemeContext.jsx
// Verwalter für Dark Mode & Light Mode mit Speicherung in localStorage

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('mf_tools_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // System-Präferenz als Fallback
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      console.warn('Theme localStorage Fehler', e);
    }
    return 'light';
  });

  useEffect(() => {
    // data-theme Attribut auf <html> setzen
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('mf_tools_theme', theme);
    } catch (e) {
      console.warn('Theme konnte nicht gespeichert werden', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
