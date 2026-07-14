/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import Layout from "./components/Layout";
import Home from "./screens/Home";
import KahootBot from "./screens/KahootBot";
import Games from "./screens/Games";
import CookieClicker from "./games/CookieClicker";
import CookieBanner from "./components/CookieBanner";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/kahoot" element={<KahootBot />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/cookie" element={<CookieClicker />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <AnimatedRoutes />
      </Layout>
      <CookieBanner />
    </Router>
  );
}
