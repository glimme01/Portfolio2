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
import SnakeGame from "./games/Snake";
import ReactionTest from "./games/ReactionTest";
import CookieClicker from "./games/CookieClicker";
import Game2048 from "./games/Game2048";
import TicTacToe from "./games/TicTacToe";
import FlappyBird from "./games/FlappyBird";
import Hextris from "./games/Hextris";
import Timberman from "./games/Timberman";
import Breakout from "./games/Breakout";
import NumberMerge from "./games/NumberMerge";
import WordScramble from "./games/WordScramble";
import BubbleShooter from "./games/BubbleShooter";
import CookieBanner from "./components/CookieBanner";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/kahoot" element={<KahootBot />} />
        <Route path="/games" element={<Games />} />
        {/* Existing games */}
        <Route path="/games/snake" element={<SnakeGame />} />
        <Route path="/games/reaction" element={<ReactionTest />} />
        <Route path="/games/cookie" element={<CookieClicker />} />
        <Route path="/games/2048" element={<Game2048 />} />
        <Route path="/games/tictactoe" element={<TicTacToe />} />
        <Route path="/games/flappy" element={<FlappyBird />} />
        {/* New games */}
        <Route path="/games/hextris" element={<Hextris />} />
        <Route path="/games/timberman" element={<Timberman />} />
        <Route path="/games/breakout" element={<Breakout />} />
        <Route path="/games/merge" element={<NumberMerge />} />
        <Route path="/games/word" element={<WordScramble />} />
        <Route path="/games/bubble" element={<BubbleShooter />} />
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
