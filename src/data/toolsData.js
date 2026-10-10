// src/data/toolsData.js
// Strukturierte Daten aller 12 Alltags-Tools für Lobby, Navigation und Suche

export const CATEGORIES = [
  {
    id: 'SCHULE',
    title: 'SCHULE & LERNEN',
    shortDesc: 'Berechne Durchschnitte und Notenziele ohne Mathe-Frust',
  },
  {
    id: 'ALLTAG',
    title: 'ALLTAG & PRODUKTIVITÄT',
    shortDesc: 'Praktische Helfer für QR-Codes, Umrechnungen und Bilddateien',
  },
  {
    id: 'SPIELEREI',
    title: 'SPIELEREI & PAUSENSPASS',
    shortDesc: 'Schnelle Klicks, faire Würfel und das tägliche Worträtsel',
  },
  {
    id: 'TECHNIK',
    title: 'TECHNIK & ENTWICKLUNG',
    shortDesc: 'Sichere Passwörter, Farb-Kontraste und Leitungs-Geschwindigkeit',
  },
];

export const TOOLS_DATA = [
  // KATEGORIE: SCHULE
  {
    id: 'noten',
    title: 'Noten-Schnitt-Rechner',
    category: 'SCHULE',
    path: '/noten',
    icon: 'IconGrades',
    description: 'Berechne deinen exakten Notenschnitt mit Gewichtung und ermittle, welche Note du für dein Wunschziel brauchst.',
    badge: 'OFFLINE',
    tags: ['schule', 'noten', 'schnitt', 'durchschnitt', 'klausur', 'zeugnis', 'gewichtung', 'ziel'],
  },

  // KATEGORIE: ALLTAG
  {
    id: 'qr',
    title: 'QR-Code-Generator',
    category: 'ALLTAG',
    path: '/qr',
    icon: 'IconQr',
    description: 'Erstelle hochauflösende QR-Codes für Links oder Texte, mit Farbanpassung und sofortigem PNG-Download.',
    badge: 'OFFLINE',
    tags: ['qr', 'code', 'generator', 'link', 'download', 'png', 'bar-code'],
  },
  {
    id: 'umrechner',
    title: 'Einheiten-Umrechner',
    category: 'ALLTAG',
    path: '/umrechner',
    icon: 'IconConverter',
    description: 'Rechne Länge, Gewicht, Temperatur, Volumen, Fläche, Zeit und Dateigrößen in Echtzeit präzise um.',
    badge: 'OFFLINE',
    tags: ['einheiten', 'umrechner', 'gewicht', 'laenge', 'temperatur', 'celsius', 'fahrenheit', 'daten', 'zeit'],
  },
  {
    id: 'waehrung',
    title: 'Währungsrechner',
    category: 'ALLTAG',
    path: '/waehrung',
    icon: 'IconCurrency',
    description: 'Konvertiere weltweite Währungen mit tagesaktuellen EZB-Kursen, Offline-Cache und Schnellwahl-Paaren.',
    badge: 'LIVE',
    tags: ['waehrung', 'geld', 'euro', 'dollar', 'wechselkurs', 'kurs', 'finanzen', 'live'],
  },
  {
    id: 'bild-kompressor',
    title: 'Bild-Kompressor',
    category: 'ALLTAG',
    path: '/bilder?tab=compress',
    icon: 'IconImageCompress',
    description: 'Verkleinere Dateigrößen von JPG, PNG und WebP ohne Qualitätsverlust — komplett lokal in deinem Browser.',
    badge: 'OFFLINE',
    tags: ['bild', 'komprimieren', 'verkleinern', 'compress', 'jpg', 'png', 'webp', 'foto'],
  },
  {
    id: 'bild-konverter',
    title: 'Bild-Format-Konverter',
    category: 'ALLTAG',
    path: '/bilder?tab=convert',
    icon: 'IconImageConvert',
    description: 'Wandle Bildformate zwischen PNG, JPG und WebP um, inklusive sauberem Transparenz-Handling.',
    badge: 'OFFLINE',
    tags: ['bild', 'konvertieren', 'umwandeln', 'format', 'png', 'jpg', 'webp', 'transparenz'],
  },

  // KATEGORIE: SPIELEREI
  {
    id: 'cps',
    title: 'CPS-Klick-Test',
    category: 'SPIELEREI',
    path: '/cps',
    icon: 'IconCps',
    description: 'Miss deine Klick-Geschwindigkeit in 5 Sekunden mit verzögerungsfreier Erfassung und witzigem Rangsystem.',
    badge: 'OFFLINE',
    tags: ['cps', 'klick', 'speed', 'clicks per second', 'gaming', 'test', 'tempo', 'reaktion'],
  },
  {
    id: 'wuerfel',
    title: 'Würfel & Münzwurf',
    category: 'SPIELEREI',
    path: '/wuerfel',
    icon: 'IconDice',
    description: 'Wirf faire Würfel, drehe eine 3D-Münze oder lass das animierte Entscheidungsrad für dich entscheiden.',
    badge: 'OFFLINE',
    tags: ['wuerfel', 'muenze', 'muenzwurf', 'zufall', 'entscheide', 'dice', 'coin', 'spiel'],
  },
  {
    id: 'wordle',
    title: 'Wordle Deutsch',
    category: 'SPIELEREI',
    path: '/wordle',
    icon: 'IconWordle',
    description: 'Errate das deutsche 5-Buchstaben-Wort des Tages in 6 Versuchen mit Tastatur-Feedback und Statistik.',
    badge: 'OFFLINE',
    tags: ['wordle', 'wort', 'raetsel', 'deutsch', 'wortspiel', 'tageswort', 'buchstaben'],
  },

  // KATEGORIE: TECHNIK
  {
    id: 'passwort',
    title: 'Passwort-Generator',
    category: 'TECHNIK',
    path: '/passwort',
    icon: 'IconPassword',
    description: 'Erzeuge kryptografisch sichere Passwörter mit Entropie-Bewertung und Mehrfach-Modus direkt auf deinem Gerät.',
    badge: 'OFFLINE',
    tags: ['passwort', 'generator', 'sicherheit', 'crypto', 'zufall', 'pin', 'keys'],
  },
  {
    id: 'farben',
    title: 'Farbe-Picker & Kontrast',
    category: 'TECHNIK',
    path: '/farben',
    icon: 'IconColor',
    description: 'Konvertiere Hex, RGB und HSL, prüfe barrierefreie WCAG-Kontraste und verwalte deine persönliche Farbpalette.',
    badge: 'OFFLINE',
    tags: ['farben', 'color', 'picker', 'kontrast', 'wcag', 'hex', 'rgb', 'hsl', 'palette', 'barrierefreiheit'],
  },
  {
    id: 'speed',
    title: 'Speed-Test Mini',
    category: 'TECHNIK',
    path: '/speed',
    icon: 'IconSpeed',
    description: 'Prüfe Ping, Download- und Upload-Geschwindigkeit deiner Internetverbindung werbefrei und ohne Zusatzsoftware.',
    badge: 'LIVE',
    tags: ['speed', 'internet', 'dsl', 'ping', 'download', 'upload', 'mbit', 'netzwerk'],
  },
];
