# MORITZFREUND TOOLS (moritzfreund.de/tools)

Eine kuratierte Sammlung von 12 nützlichen Alltags-Tools für den Browser — schnell, werbefrei, offline-fähig und 100% privat.

---

## 🛠 TECH-STACK
- **Framework:** React 18 + Vite
- **Routing:** `react-router-dom` (Lobby `/` sowie Routen `/qr`, `/passwort`, `/umrechner`, `/waehrung`, `/noten`, `/bilder`, `/farben`, `/wuerfel`, `/wordle`, `/speed`, `/cps`)
- **Bibliotheken:**
  - `qrcode` (npm) für performante Offline-QR-Code-Erzeugung
  - HTML5 Canvas & Web API für Bild-Kompression und Format-Konvertierung
  - Native `crypto.getRandomValues()` für kryptografisch fairen Zufall
  - `fetch` für tagesaktuelle EZB-Wechselkurse (mit lokalem Cache)
- **Typografie:** Google Fonts *Space Grotesk* (Überschriften) und *Inter* (Fließtext & Formulare)
- **Design:** Eigenes Vanilla-CSS-Designsystem ohne schwere Frameworks

---

## 🎨 DESIGN: "PAPIER-STUDIO" (NEO-BRUTALISMUS, HELL)
Das Erscheinungsbild folgt konsequent der „Papier-Studio“-Ästhetik:
- **Heller Canvas-Hintergrund:** Warmes Off-White (`#faf8f5`) mit subtiler Papier-Textur
- **Karten & Panels:** Weiß (`#ffffff`) mit dicken schwarzen Borders (`2.5px solid #111111`) und hartem Versatz-Schatten (`box-shadow: 5px 5px 0 #111111`) ohne Unschärfe oder Glaseffekte
- **Akzentfarben:** Kräftiges Signal-Orange (`#ff5b00`), kontrastierendes Schwarz/Weiß und Highlighter-Gelb (`#ffd400`) für Marker und Badges
- **Taktile Buttons:** Flache Elemente, die sich beim Klick spürbar in den Schatten drücken (`transform: translate(3px, 3px)` mit kleinerem Schatten)
- **Klare Strich-Icons:** Keine Emojis in der Benutzeroberfläche; alle Icons sind handgezeichnete Inline-SVGs mit einheitlicher 2px-Strichstärke (einzige Ausnahme: Wordle-Ergebnis-Freigabe als Raster)
- **Mobile-First & Touch:** Touch-Targets mindestens 48px, Inputs ab 16px (verhindert iOS-Autozoom), keine `100vh`-Sprünge dank modernem `100dvh`.

---

## 📦 DIE 12 TOOLS IM ÜBERBLICK

### Kategorie: SCHULE & LERNEN
1. **Noten-Schnitt-Rechner (`/noten`):**
   - *Tab A (Durchschnitt):* Noten-Chips von 1,0 bis 6,0 mit Gewichtungen (0.5x, 1x, 2x, 3x) und Live-Schnitt (1 Nachkommastelle).
   - *Tab B (Was brauche ich?):* Berechnet exakt, welche Note in der nächsten Prüfung für den Wunschschnitt nötig ist — inklusive Ampel-Bewertung (Locker / Machbar / Sportlich).

### Kategorie: ALLTAG & PRODUKTIVITÄT
2. **QR-Code-Generator (`/qr`):**
   - Live-Generierung für Links, Texte und WLAN.
   - Größen 256, 512 und 1024 px mit PNG-Download.
   - Farbwahl mit automatischer WCAG-Kontrastprüfung und Warnhinweis bei schlechter Lesbarkeit.
3. **Einheiten-Umrechner (`/umrechner`):**
   - 7 Kategorien: Länge, Gewicht, Temperatur, Volumen, Fläche, Zeit und Datengröße.
   - Echte Temperatur-Formeln (°C, °F, K), dezimale Datengrößen (1 GB = 1000 MB) mit Erläuterung zu Windows GiB.
   - Schnellwahl-Chips (z. B. cm ↔ ft, kg ↔ lbs, °C ↔ °F).
4. **Währungsrechner (`/waehrung`) — *Live-Online-Tool*:**
   - Tagesaktuelle Kurse über offene EZB-Schnittstelle (ohne API-Key).
   - Offline-Funktions-Cache via `localStorage`: Funktioniert auch ohne Internet mit zuletzt abgerufenen Kursen.
   - Schnell-Chips für EUR ↔ USD, EUR ↔ GBP, EUR ↔ JPY.
5. **Bild-Kompressor (`/bilder?tab=compress`):**
   - Drag & Drop für JPG, PNG und WebP.
   - Qualitätsregler (10–100%) und maximale Bildbreite (Full HD, HD, Web).
   - Vorher/Nachher-Größenanzeige mit prozentualer Ersparnis; 100% clientseitig im Browser.
6. **Bild-Format-Konverter (`/bilder?tab=convert`):**
   - Konvertierung zwischen PNG, JPG und WebP.
   - Sauberes Transparenz-Handling für JPG mit frei wählbarer Füllfarbe.

### Kategorie: SPIELEREI & PAUSENSPASS
7. **CPS-Klick-Test (`/cps`):**
   - 5-Sekunden-Klicktest mit Timer-Start ab dem *ersten* Klick.
   - Latenzfreie `pointerdown`-Erfassung (Maus & Touch gleichwertig).
   - Humorvolles Rangsystem (Normalo, Gamer, Profi, Klaviervirtuose, Nicht menschlich) und Historie der letzten 10 Versuche.
8. **Würfel & Münzwurf (`/wuerfel`):**
   - *Würfel:* 1 bis 6 Würfel mit echten CSS-Punkte-Flächen, Roll-Animation und Summe.
   - *Münzwurf:* 3D-CSS-Flip mit Kopf/Zahl-Bilanzstatistik.
   - *Entscheide für mich:* Animiertes Zufallsrad für 2 bis 8 frei wählbare Optionen.
9. **Wordle Deutsch (`/wordle`):**
   - Deutsches 5-Buchstaben-Wort des Tages (deterministischer Datums-Hash, für alle Spieler am selben Tag identisch).
   - 6 Versuche mit Farb-Feedback (Grün/Gelb/Grau), Touch-QWERTZ-Tastatur & Tastatur-Events.
   - Unbegrenzter Übungsmodus, lokale Gewinn-Statistik und Emoji-Teilen-Funktion.

### Kategorie: TECHNIK & ENTWICKLUNG
10. **Passwort-Generator (`/passwort`):**
    - Einstellbare Länge (8–64 Zeichen), 4 Zeichensätze, hardwarebasierter Zufall via `crypto.getRandomValues()`.
    - Live-Entropieberechnung in Bits mit Sicherheitsampel und Ein-Satz-Erklärung.
    - Modus für 5 Passwörter gleichzeitig mit separaten Kopier-Buttons.
11. **Farbe-Picker & Kontrast (`/farben`):**
    - Umrechnung zwischen HEX, RGB und HSL mit nativer Pipette.
    - WCAG 2.1 Barrierefreiheitsprüfung auf Weiß und Schwarz mit AAA/AA-Bewertung.
    - Persönliche 12-Farben-Palette im `localStorage` mit CSS-Export.
12. **Speed-Test Mini (`/speed`):**
    - Werbefreie Messung von Ping (ms), Download (Mbit/s) und Upload (Mbit/s) über Cloudflare Speed-Endpunkte.
    - Echtzeit-Fortschrittsbalken im Papier-Studio-Stil und Historie der letzten 5 Tests.

---

## 🚀 DEPLOYMENT AUF NETLIFY

Das Projekt ist für sofortiges Zero-Configuration-Deployment auf **Netlify** vorbereitet:

1. **Repository klonen und Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

2. **Produktions-Build erstellen:**
   ```bash
   npm run build
   ```
   Erzeugt den optimierten Produktions-Bundle im Ordner `dist/`.

3. **Netlify-Konfiguration (`netlify.toml`):**
   In der Datei `netlify.toml` ist das Ausgabeverzeichnis und das SPA-Routing für clientseitige React-Router-Routen konfiguriert:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

4. **Deploy-Befehl via Netlify CLI (optional):**
   ```bash
   npx netlify deploy --prod --dir=dist
   ```

---

## ➕ NEUES TOOL HINZUFÜGEN IN 3 SCHRITTEN

Dank der modularen Architektur kann ein neues Tool in weniger als 5 Minuten integriert werden:

### Schritt 1: Tool-Komponente anlegen
Erstelle eine neue React-Datei unter `src/tools/MeinNeuesTool.jsx`:
```jsx
import React from 'react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function MeinNeuesTool() {
  usePageMeta('Mein neues Tool', 'Kurze Beschreibung für SEO.');

  return (
    <div className="tool-workspace">
      <div className="tool-page-header">
        <h1>MEIN NEUES TOOL</h1>
      </div>
      <div className="card">
        {/* Tool-Inhalt hier */}
      </div>
    </div>
  );
}
```

### Schritt 2: Route in `src/App.jsx` und Icon registrieren
1. In `src/components/Icons.jsx` ein passendes 2px-Strich-SVG exportieren (z. B. `IconMeinTool`).
2. In `src/App.jsx` die Route einfügen:
```jsx
import MeinNeuesTool from './tools/MeinNeuesTool';
// ...
<Route path="/mein-tool" element={<MeinNeuesTool />} />
```

### Schritt 3: In `src/data/toolsData.js` eintragen
Füge das Tool zum Array `TOOLS_DATA` hinzu:
```javascript
{
  id: 'mein-tool',
  title: 'Mein neues Tool',
  category: 'ALLTAG', // SCHULE | ALLTAG | SPIELEREI | TECHNIK
  path: '/mein-tool',
  icon: 'IconMeinTool',
  description: 'Ein prägnanter Satz, der die Funktion auf den Punkt bringt.',
  badge: 'OFFLINE', // 'OFFLINE' oder 'LIVE'
  tags: ['stichwort1', 'stichwort2'],
}
```
*Fertig!* Das Tool erscheint automatisch in der Lobby, ist über das Suchfeld auffindbar und erhält die passende Kategorie und Breadcrumb-Navigation.

---

## 📱 TEST-MATRIX (RESPONSIVE VERHALTEN)

| Gerät / Ansicht | Auflösung | Layout-Verhalten |
| :--- | :--- | :--- |
| **iPhone SE / Mobil klein** | 375 × 667 px | 1 Spalte in Lobby, min. 48px Touch-Targets, 16px Inputs gegen Autozoom, Tastatur passt auf Screen |
| **Tablet hoch (iPad Mini)** | 768 × 1024 px | 2 Spalten im Lobby-Grid, zentrierter 720px Tool-Workspace, daumenfreundliche Bedienung |
| **Tablet quer / Laptop** | 1024 × 768 px | 3 Spalten im Lobby-Grid, zweispaltiger Bild-Editor (Optionen links, Vorschau rechts) |
| **Desktop 1080p** | 1920 × 1080 px | 4 Spalten im Lobby-Grid, max. 1240px Container, optimale Lesbarkeit durch Zeilenlängen-Begrenzung |

---

## 🔒 DATENSCHUTZ & TRANSPARENZ
- **Keine Tracking-Cookies, keine Werbenetzwerke, keine Analysedienste.**
- **Lokale Berechnung:** Sämtliche Passwörter, QR-Codes, Noten und Bilddateien werden ausschließlich im Arbeitsspeicher des Browsers auf dem Endgerät verarbeitet und zu keinem Zeitpunkt an externe Server übertragen.
- **Transparenter Funktions-Cache (`localStorage`):**
  - `mf_tools_cached_rates`: Zwischenspeicherung der letzten Währungskurse für den Offline-Betrieb.
  - `mf_tools_open_categories`: Merkt sich eingeklappte Kategorien in der Lobby.
  - `mf_tools_grades_list` & `mf_tools_grade_target`: Notenliste und Zieleinstellungen.
  - `mf_tools_color_palette`: Persönliche Farbpalette (max. 12 Farben).
  - `mf_tools_cps_best` & `mf_tools_cps_history`: CPS-Highscore und die letzten 10 Klicktests.
  - `mf_tools_speed_history`: Die letzten 5 Speedtests.
  - `mf_tools_wordle_stats` & `mf_wordle_daily_*`: Wordle-Tagesfortschritt und Spielstatistik.
