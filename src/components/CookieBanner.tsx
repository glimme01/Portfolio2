import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { loadState, saveState } from "../utils/storage";

const CONSENT_KEY = "cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not yet decided
    const consent = loadState(CONSENT_KEY);
    if (!consent) {
      // Small delay so page loads first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    saveState(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    saveState(CONSENT_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-xl mx-auto"
          role="dialog"
          aria-label="Cookie-Einwilligung"
        >
          <div
            style={{
              background: "#1c1c1f",
              border: "1px solid rgba(240,235,227,0.14)",
              borderRadius: "12px",
              padding: "20px 24px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: "22px" }}>🍪</span>
              <span
                className="font-serif font-black"
                style={{ color: "#f0ebe3", fontSize: "17px" }}
              >
                Spielstand speichern
              </span>
            </div>

            {/* Body */}
            <p style={{ color: "#a09a90", fontSize: "13px", lineHeight: "1.6", marginBottom: "16px" }}>
              Diese Website speichert deinen{" "}
              <strong style={{ color: "#f0ebe3" }}>Highscore & Spielfortschritt</strong>{" "}
              (Cookie Clicker, Snake, Flappy Bird usw.) in Cookies &amp; localStorage auf
              deinem Gerät. Es werden keine Daten an Dritte weitergegeben.
            </p>

            {/* Buttons */}
            <div className="flex gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={accept}
                style={{
                  background: "#FFA586",
                  color: "#141416",
                  border: "none",
                  borderRadius: "999px",
                  padding: "10px 24px",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  flex: 1,
                  minWidth: "120px",
                }}
              >
                ✓ Akzeptieren
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={decline}
                style={{
                  background: "transparent",
                  color: "#a09a90",
                  border: "1px solid rgba(240,235,227,0.15)",
                  borderRadius: "999px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Ablehnen
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
