import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PATCH_LOGS = [
  {
    version: 'v3.3',
    date: '6. Oktober 2026',
    title: '📈 Wallstreet-Revolution & Börsen-Downfall',
    tag: 'Aktuell',
    tagColor: '#00e5ff',
    summary: 'Dynamische Keks-Börsenskalierung im Verhältnis zum Kontostand, neues dramatisches Börsen-Downfall-Event, unterbrechungsfreier 6s-Ticker während Events und Fix für den MAX-Kaufbutton.',
    changes: [
      {
        type: 'feature',
        title: 'Dynamische Börsenkurse & Balance-Skalierung',
        desc: 'Die Börsenkurse passen sich ab sofort dynamisch an den aktuellen Kontostand (bzw. das Gesamtweltvermögen) des Spielers an. Egal ob 10.000 oder 50 Milliarden Cookies: Aktienhandel bleibt in jeder Spielphase wirtschaftlich hochgradig bedeutsam mit skalierenden Renditen und Dividenden.',
      },
      {
        type: 'feature',
        title: '🚨 Neues Event: Börsen-Downfall (Market Crash)',
        desc: 'Panik an den Märkten! Beim neuen Börsen-Downfall-Event stürzen alle Aktienkurse blitzartig um 70 % ab. Wer jetzt den Mut hat und den Dip kauft („Buy the Dip“), kann nach der Markterholung gigantische 3x–4x Gewinne realisieren.',
      },
      {
        type: 'bugfix',
        title: 'Ununterbrochener Börsen-Ticker bei Events',
        desc: 'Ein kritischer Spielfluss-Bug wurde behoben: Aktive Keks-Events (wie Kometen, Zuckerfeste oder Oma-Partys) unterbrechen und blockieren den Börsenticker nicht mehr. Die Kurse fluktuieren nun auf einem autarken Ticker verlässlich alle 6 Sekunden weiter.',
      },
      {
        type: 'bugfix',
        title: 'Aktien MAX-Kaufbutton repariert',
        desc: 'Der MAX-Button bei Aktien funktioniert nun einwandfrei. Er berechnet exakt die Anzahl aller mit dem aktuellen Kontostand leistbaren Anteile (z. B. „KAUFEN (MAX: 142x)“) und führt den Sofortkauf ohne Fehler aus.',
      },
      {
        type: 'feature',
        title: 'Live Marktstatus-Banner & Dev-Tools',
        desc: 'Im Börsen-Terminal warnen neue Neon-Banner mit Live-Countdown vor aktiven Börsen-Downfalls (-70 %) und Börsen-Rallyes (+100 %). Im Admin-Dashboard können Devs und Admins das Downfall-Event direkt auf Knopfdruck testen.',
      },
    ],
  },
  {
    version: 'v3.2',
    date: '6. Oktober 2026',
    title: '🎰 Kasino-Balancing & Polish Update',
    tag: 'Vorheriges',
    tagColor: '#39ff14',
    summary: 'Spannendes Slot-Balancing mit realistischer Verlustquote, Fix für die Mega-Gewinn-Karte und Reparatur der Spielerliste im Admin-Dashboard.',
    changes: [
      {
        type: 'balance',
        title: 'Slots Trefferquote & Verlust-Balance optimiert',
        desc: 'Die Slots gewinnen nicht mehr bei fast jedem Spin. Die Verlustquote liegt jetzt bei realistischen ~60 % und die Gewinnquote bei ~40 %, was für echte Casino-Spannung („hin und wieder verlieren“) und hohe Vorfreude sorgt.',
      },
      {
        type: 'feature',
        title: 'Klassische Las-Vegas 2er-Treffer-Regel',
        desc: 'Nur noch 2x Kirschen (🍒) und Wild Joker (🃏) zahlen als 2er-Kombination (2-facher Einsatz). Alle anderen Symbole (Zitronen, Melonen, Bars, 7er, Trophäen) benötigen jetzt wieder einen vollen 3er-Treffer auf einer Gewinnlinie.',
      },
      {
        type: 'bugfix',
        title: 'Mega-Gewinn-Karte teleportiert sich nicht mehr',
        desc: 'Der Ruckel- und Verschiebe-Bug der Feierkarte wurde behoben. Die Karte wird nun per React Portal unabhängig vom Screen-Shake gerendert. Nur noch das Spielautomaten-Gehäuse vibriert, während das Overlay seidenweich zentriert einblendet und ruhig pulsiert.',
      },
      {
        type: 'bugfix',
        title: 'Admin-Dashboard: Cloud-Spielerliste repariert',
        desc: 'Ein Schema-Konflikt mit fehlenden Datenbank-Spalten in Supabase wurde behoben. Das Admin-Dashboard lädt nun zuverlässig alle registrierten Spieler (Moritz, Daddy, binitmitsharaf etc.) und zeigt deren Live-Guthaben an.',
      },
    ],
  },
  {
    version: 'v3.1',
    date: '5. Oktober 2026',
    title: '🌌 Aufstiegs-Evolution & Taktile Live-Settings',
    tag: 'Grosses Update',
    tagColor: '#ffd700',
    summary: 'Komplettes Redesign des Ascension-Systems ohne alte Himmelchips, 8 Keks-Skins, 10 Fähigkeiten und sofort speichernde Taktil-Schalter.',
    changes: [
      {
        type: 'feature',
        title: 'Exponentielles Aufstiegssystem (Ascend)',
        desc: 'Alte Himmelchips wurden komplett entfernt. Ab 1 Milliarde gebackener Cookies kann aufgestiegen werden. Jede Aufstiegsstufe schaltet exponentiell steigende permanente CPS-Boni (+25 % pro Stufe) frei.',
      },
      {
        type: 'feature',
        title: '8 Legendäre Keks-Skins',
        desc: 'Skins wie Schoko-Traum, Regenbogen-Cookie, Cyber-Neon, Diamant-Kristall, Goldene Legende, Galaxie und Kosmischer Urkeks lassen sich über Meilensteine und Aufstiege freischalten und aktivieren.',
      },
      {
        type: 'feature',
        title: '10 Einzigartige Klicker-Fähigkeiten',
        desc: 'Fähigkeiten wie Cookie-Gott, Goldener Klicker, Keks-Magnet, Zeitkrümmung, Kosmischer Ofen, Zinseszins und Mehrfach-Klick bringen strategische Tiefe.',
      },
      {
        type: 'feature',
        title: 'Taktile Live-Settings mit Auto-Save',
        desc: 'Einstellungs-Menü mit interaktiven Schaltern für Sound-Effekte, Hintergrundmusik, Partikel, Auto-Save und Turbo-Modus. Einstellungen werden sofort in der Datenbank gespeichert – kein manueller Speichern-Klick mehr nötig.',
      },
    ],
  },
  {
    version: 'v3.0',
    date: '4. Oktober 2026',
    title: '🎲 Das Grosse Kasino & Multi-Währungen',
    tag: 'Meilenstein',
    tagColor: '#00e5ff',
    summary: 'Integration des Kasinos direkt in den Cookie Clicker, 3 Spielwährungen, Blackjack-Splitten und progressive Jackpots.',
    changes: [
      {
        type: 'feature',
        title: '3 Spielwährungen & Wechselstube',
        desc: 'Einführung von 🍪 Cookies, 💎 Diamanten (VIP) und 🪙 Casino-Chips. Über die Wechselstube können Währungen zu fairen Wechselkursen getauscht werden.',
      },
      {
        type: 'feature',
        title: 'Blackjack Pro mit Karten-Teilen (Split)',
        desc: 'Kartenpaare (z. B. 8-8, A-A) können in zwei eigenständige spielbare Hände gesplittet werden. Inklusive Doppeln (Double Down) und Soft-17-Dealer-Regeln.',
      },
      {
        type: 'feature',
        title: 'Progressiver Jackpot & 7 Gewinnlinien',
        desc: 'Spielautomaten mit wachsendem Jackpot-Pot pro Währung, Scatter-Sternen für Freispiele (3x Boost) und 2x Double-or-Nothing Karten-Risikospiel.',
      },
      {
        type: 'feature',
        title: 'Max-Buy-Button im Cookie Clicker',
        desc: 'Gebäude-Kaufumschalter für 1x, 10x, 100x und MAX mit exakter Kostenberechnung und Sofortkauf.',
      },
      {
        type: 'system',
        title: 'Single-Device-Lock & Multi-Tab-Schutz',
        desc: 'Automatischer Schutz vor Datenüberschreibungen, wenn dasselbe Konto auf mehreren Geräten oder Fenstern geöffnet wird.',
      },
    ],
  },
  {
    version: 'v2.5',
    date: '2. Oktober 2026',
    title: '⚖️ VIP Shop Balancing & Ranglisten-Schutz',
    tag: 'Balancing',
    tagColor: '#ff007f',
    summary: 'Schließen von Exploits und Endlosschleifen im VIP-Shop sowie faire globale Ranglisten.',
    changes: [
      {
        type: 'balance',
        title: 'VIP-Shop Loopholes geschlossen',
        desc: 'Unendliche Multiplikator-Schleifen und übermächtige Wechselstuben-Exploits wurden restlos ausbalanciert.',
      },
      {
        type: 'system',
        title: 'Ranglisten-Schutz für registrierte Spieler',
        desc: 'Gast-Konten können keine globalen Ranglisten mehr manipulieren. Nur verifizierte Konten zählen auf den Highscore-Boards.',
      },
    ],
  },
  {
    version: 'v2.0',
    date: '28. September 2026',
    title: '☁️ Cloud-Sync, Konten & Admin-Dashboard',
    tag: 'System',
    tagColor: '#a855f7',
    summary: 'Supabase Cloud-Datenbank, sicheres Passwort-Hashing, In-Game Bug-Tracker und Admin-Zentrale.',
    changes: [
      {
        type: 'feature',
        title: 'Benutzerkonten mit SHA-256 Cloud-Sync',
        desc: 'Registrierung und Login mit Passwort-Hashing und automatischem Spielstand-Abgleich in der Supabase Cloud.',
      },
      {
        type: 'feature',
        title: 'Admin-Dashboard & Spieler-Management',
        desc: 'Verwaltung aller registrierten Spieler, Guthabenanpassung, Rollenverwaltung und globale Server-Durchsagen.',
      },
      {
        type: 'feature',
        title: 'In-Game Feedback- & Bug-Reporting',
        desc: 'Spieler können direkt im Spiel Fehler melden oder Feedback einreichen, das vom Admin bearbeitet werden kann.',
      },
    ],
  },
  {
    version: 'v1.0',
    date: '20. September 2026',
    title: '🕹️ Moritzfreund Arcade Launch',
    tag: 'Release',
    tagColor: '#ffffff',
    summary: 'Erstes Release mit Retro-Klassikern Snake, Press and Clicker sowie lokaler Highscore-Tabelle.',
    changes: [
      {
        type: 'feature',
        title: 'Arcade-Klassiker',
        desc: 'Snake mit Pixel-Grafik, Press-Reaktionsspiel und Basis-Version des Keks-Klickers.',
      },
      {
        type: 'feature',
        title: 'Highscores & Bestenlisten',
        desc: 'Persönliche Bestleistungen und Top-Spieler-Ranking.',
      },
    ],
  },
];

const TYPE_BADGES = {
  feature: { label: '✨ NEU', color: '#39ff14', bg: 'rgba(57,255,20,0.12)' },
  balance: { label: '⚖️ BALANCE', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' },
  bugfix:  { label: '🐛 FIX', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' },
  system:  { label: '🔒 SYSTEM', color: '#ff70a6', bg: 'rgba(255,112,166,0.12)' },
};

export default function PatchLogModal({ isOpen, onClose }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVersions, setExpandedVersions] = useState({ 'v3.3': true, 'v3.2': true, 'v3.1': true, 'v3.0': true });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function toggleVersion(v) {
    setExpandedVersions(prev => ({ ...prev, [v]: !prev[v] }));
  }

  const filteredLogs = PATCH_LOGS.map(log => {
    const q = searchQuery.trim().toLowerCase();
    const matchingChanges = log.changes.filter(c => {
      const matchesType = filterType === 'all' || c.type === filterType;
      const matchesSearch = !q ||
        c.title.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        log.title.toLowerCase().includes(q) ||
        log.version.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });

    return {
      ...log,
      changes: matchingChanges,
      hasMatches: matchingChanges.length > 0,
    };
  }).filter(log => log.hasMatches || (!searchQuery && filterType === 'all'));

  const modalNode = (
    <div
      className="overlay-backdrop"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="overlay-panel"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          background: 'linear-gradient(180deg, #18140c 0%, #0d0a06 100%)',
          border: '2px solid var(--accent)',
          boxShadow: '0 0 40px rgba(255,215,0,0.25)',
          borderRadius: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #332600', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.88rem', color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              📜 PATCH-LOG & UPDATE-HISTORIE
            </h2>
            <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '4px' }}>
              Alle Neuerungen, Balancing-Anpassungen & Fehlerbehebungen im Detail
            </p>
          </div>
          <button
            className="btn btn-outline"
            style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.55rem' }}
            onClick={onClose}
          >
            ✕ SCHLIESSEN
          </button>
        </div>

        {/* Filter- & Suchleiste */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔎 Änderungen durchsuchen (z.B. Slots, Ascend, Split)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              background: '#0e0b04',
              border: '1px solid #3a2e10',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-pixel)',
              fontSize: '0.55rem',
            }}
          />

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'ALLE' },
              { id: 'feature', label: '✨ NEU' },
              { id: 'balance', label: '⚖️ BALANCE' },
              { id: 'bugfix', label: '🐛 FIXES' },
              { id: 'system', label: '🔒 SYSTEM' },
            ].map(f => (
              <button
                key={f.id}
                className={`btn ${filterType === f.id ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: '0.45rem',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  minHeight: '28px',
                }}
                onClick={() => setFilterType(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollbare Liste aller Versionen */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--muted)', fontFamily: 'var(--font-pixel)', fontSize: '0.6rem' }}>
              Keine Einträge für diese Suchanfrage gefunden.
            </div>
          ) : (
            filteredLogs.map(log => {
              const isOpen = expandedVersions[log.version] ?? true;
              return (
                <div
                  key={log.version}
                  style={{
                    background: '#120e06',
                    border: '1px solid #2e240c',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Versions-Kopfzeile */}
                  <div
                    onClick={() => toggleVersion(log.version)}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,215,0,0.04)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: isOpen ? '1px solid #241c08' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-pixel)',
                        fontSize: '0.72rem',
                        color: 'var(--accent)',
                        background: '#241a02',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #4a3806',
                      }}>
                        {log.version}
                      </span>
                      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.68rem', color: '#fff' }}>
                        {log.title}
                      </span>
                      {log.tag && (
                        <span style={{
                          fontSize: '0.45rem',
                          fontFamily: 'var(--font-pixel)',
                          color: log.tagColor,
                          background: `${log.tagColor}18`,
                          border: `1px solid ${log.tagColor}44`,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          {log.tag}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.55rem', color: 'var(--muted)', fontFamily: 'var(--font-pixel)' }}>
                        {log.date}
                      </span>
                      <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Versions-Inhalt */}
                  {isOpen && (
                    <div style={{ padding: '14px 16px' }}>
                      {log.summary && (
                        <p style={{ fontSize: '0.65rem', color: '#aaa', marginBottom: '12px', fontStyle: 'italic' }}>
                          {log.summary}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {log.changes.map((change, idx) => {
                          const badge = TYPE_BADGES[change.type] || TYPE_BADGES.feature;
                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#191308',
                                border: '1px solid #2b200a',
                                borderRadius: '8px',
                                padding: '10px 12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                  fontSize: '0.45rem',
                                  fontFamily: 'var(--font-pixel)',
                                  color: badge.color,
                                  background: badge.bg,
                                  border: `1px solid ${badge.color}33`,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {badge.label}
                                </span>
                                <h4 style={{ margin: 0, fontSize: '0.68rem', color: '#f0f0f0', fontWeight: 'bold' }}>
                                  {change.title}
                                </h4>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.62rem', color: '#bbb', lineHeight: '1.4', paddingLeft: '2px' }}>
                                {change.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #241c08', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.52rem', color: 'var(--muted)', fontFamily: 'var(--font-pixel)' }}>
            ✦ MORITZFREUND ARCADE v3.3 &bull; REGELMÄSSIGE UPDATES ✦
          </span>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.55rem', padding: '6px 16px' }}
            onClick={onClose}
          >
            VERSTANDEN & SPIELEN
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
