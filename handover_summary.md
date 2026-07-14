# 🍪 Cookie Clicker Handover & Project Summary (for AI Developer)

This document provides a comprehensive overview of the custom Cookie Clicker project implemented in this repository. It is designed to get any incoming AI developer up to speed on the codebase, architecture, custom systems, and rules.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React + TailwindCSS (Vite SPA inside the larger portfolio site).
- **Primary Game File:** `/src/games/CookieClicker.tsx` (Monolithic, handles game loop, state, rendering, settings, modals, and achievements).
- **Backend (Netlify Functions):**
  - `/netlify/functions/savegame.ts`: Handles secure Cloud Syncing (Save, Load, Delete, Admin Actions). Uses **Netlify Blobs** (`savegames` store) for persistence.
  - `/netlify/functions/leaderboard.ts`: Serves the active leaderboard (filters out players inactive for >20 days).
- **Persistence:** Dual-layer. Saves to `localStorage` (`cc_save_v2`) and syncs to Netlify Blobs if the player has active cloud credentials.

---

## 🌟 Custom Game Mechanics & Balance

1. **Prestige / Ascend System:**
   - **Heavenly Chips:** Formula calculated using lifetime baked cookies.
   - **Prestige Levels:** Each level adds a permanent `+10%` production bonus.
   - **Max Ascend Restriction:** A player can only prestige (+1 level) once per click to prevent stacking prestige points excessively. Requires active play.
   - **Max Prestige Cap:** Prestige is capped at Level 100 once all cookie skins are unlocked.

2. **Powerups (Rebalanced):**
   - **Golden Cookies / Stars:** Randomly spawn, fading out using exit transitions to prevent "ghost DOM elements".
   - **Frenzy:** Multiplies production by `7x` for a balanced duration.
   - **Click Frenzy:** Multiplies Click power by `10x` (reduced from `777x` to prevent breaking the game balance).
   - **Powerup Caps:** Finger upgrades (e.g., Super Finger) are capped at `999x`.

3. **Anti-Cheat / Anti-Autoclicker:**
   - **Rechenaufgabe (Captcha):** Shows up if the player has been clicking actively for 5+ hours straight. Requires solving a simple math equation to continue.

---

## ☁️ Real-time Cloud Sync System

- **Accounts:** Players choose an **Account Name** and a **Password** in the Cloud settings modal.
- **Autosave to Cloud:** Every local save triggers an automatic cloud save (throttled to a maximum of once every 15 seconds) if credentials exist.
- **Autoload from Cloud (Cross-device Sync):** A background polling routine fetches the database save every 20 seconds. If the cloud save timestamp is newer than the local save, it overrides the local state (ideal for switching from PC to iPad).
- **Credentials Persistence:** Account Name and Password are cached in `localStorage` (`cc_sync_username` and `cc_sync_password`) so players remain logged in across sessions.

---

## 🕵️ Admin Panel (`moritz2026`)

- **Master Password:** `moritz2026`.
- **How to access:**
  - **Option A:** Rapidly click the page title 5 times and enter `moritz2026`.
  - **Option B (Implicit Admin Account):** Log in using the Account Name `Möritz` (or any other name) and the password `moritz2026` via the Cloud settings modal. This automatically grants Admin rights to the UI.
- **Capabilities:**
  - Displays the active database accounts.
  - Allows deleting or editing any player's save state (Cookies, Prestige, Achievements) directly in Netlify Blobs.

---

## 🥚 Easter Eggs & Level 100 Reward

- **Level 100 Reward:** The final skin unlocked at Prestige level 100 is the **"67 Cookie"** (Emoji `6️⃣7️⃣`).
- **"67" Easter Eggs:** 5 hidden achievements related to the number `67`:
  1. **Die 67 Klicks:** Perform exactly 67 clicks.
  2. **Der 67. Keks:** Have exactly 67 cookies in bank.
  3. **67 pro Sekunde:** Reach exactly 67 CPS.
  4. **67 pro Klick:** Reach exactly 67 CPC.
  5. **Geheimnis der 67:** Type the sequence `67` on the keyboard.
