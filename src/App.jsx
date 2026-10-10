// src/App.jsx
// Router & Layout: Header mit Breadcrumb, Main Content, Footer

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

// Seiten & Werkzeuge
import Lobby from './pages/Lobby';
import QrTool from './tools/QrTool';
import PasswordTool from './tools/PasswordTool';
import ConverterTool from './tools/ConverterTool';
import CurrencyTool from './tools/CurrencyTool';
import GradesTool from './tools/GradesTool';
import ImageTool from './tools/ImageTool';
import ColorTool from './tools/ColorTool';
import DiceTool from './tools/DiceTool';
import WordleTool from './tools/WordleTool';
import SpeedTool from './tools/SpeedTool';
import CpsTool from './tools/CpsTool';

// Scroll-Restoration bei Routenwechsel
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-wrapper">
      <ScrollToTop />
      <Header />
      <main className="main-content">
        <Routes>
          {/* Lobby */}
          <Route path="/" element={<Lobby />} />

          {/* Die 12 Tools */}
          <Route path="/qr" element={<QrTool />} />
          <Route path="/passwort" element={<PasswordTool />} />
          <Route path="/umrechner" element={<ConverterTool />} />
          <Route path="/waehrung" element={<CurrencyTool />} />
          <Route path="/noten" element={<GradesTool />} />
          <Route path="/bilder" element={<ImageTool />} />
          <Route path="/farben" element={<ColorTool />} />
          <Route path="/wuerfel" element={<DiceTool />} />
          <Route path="/wordle" element={<WordleTool />} />
          <Route path="/speed" element={<SpeedTool />} />
          <Route path="/cps" element={<CpsTool />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
