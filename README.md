# Moritzfreund Arcade

Retro-Browser-Spiele — Snake, Cookie Clicker und Hydraulische Presse — mit gemeinsamer Highscore-Datenbank via Supabase.

## Spiele

| Spiel | Status | Route |
|---|---|---|
| Snake | Spielbar | `/snake` |
| Cookie Clicker | Neu | `/clicker` |
| Hydraulische Presse | In Arbeit | `/press` |

## Einrichtung

### 1. Supabase-Datenbank

1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen
2. Im **SQL Editor** den Inhalt von `sql/schema.sql` ausführen
3. Unter **Project Settings → API** die **Project URL** und den **anon public key** kopieren

### 2. Keys eintragen

**Option A — .env-Datei (empfohlen für Entwicklung):**

```bash
cp .env.example .env
# .env bearbeiten und Keys eintragen
```

**Option B — Direkt in Code eintragen (für einfache Deploys):**

In `src/lib/supabase.js` die Konstanten `SUPABASE_URL_FALLBACK` und `SUPABASE_ANON_KEY_FALLBACK` anpassen.

### 3. Lokal starten

```bash
npm install
npm run dev
```

### 4. Deploy auf Netlify

1. Repo auf GitHub pushen
2. Auf [netlify.com](https://netlify.com): **"Import from Git"** → GitHub-Repo auswählen
3. Build-Einstellungen (werden automatisch aus `netlify.toml` gelesen):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Unter **Site Settings → Environment Variables** die Supabase-Keys setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Domain:** Netlify Site Settings → Domain Management → eigene Domain/Subdomain verknüpfen

## Pixel-Art Assets

Die Spiele laden Sprite-Sheets aus `public/assets/`. Wenn die Dateien fehlen, werden prozedurale Fallback-Formen gezeichnet.

Vorgesehene Assets (16×16 px, PNG, Pixel-Art):

**Snake:**
- `snake_head.png` — Schlangenkopf
- `snake_body.png` — Schlangensegment
- `apple.png` — Normaler Apfel
- `gold_apple.png` — Gold-Apfel
- `bg.png` — Hintergrundkachel (384×384)

**Clicker:** (32×32 px, PNG, Pixel-Art)
- Vollständige Liste am Ende von `src/games/clicker/skins.js`

Assets mit LibreSprite erstellen und in `public/assets/` ablegen.

## Datenbankschema

```sql
-- Highscores aller Spiele
scores (id, name, game, score, created_at)

-- Spielstände (JSONB, upsert per name+game)
game_states (id, name, game, state, updated_at)
```

## Tech Stack

- **Vite + React 18** — Build-Tool und UI-Framework
- **react-router-dom** — Client-seitiges Routing
- **@supabase/supabase-js** — Datenbank-Client
- **Web Audio API** — Prozedurale Sounds (kein Asset)
- **Press Start 2P** (Google Fonts) — Pixel-Art-Schrift
- **Netlify** — Hosting und Deployment
