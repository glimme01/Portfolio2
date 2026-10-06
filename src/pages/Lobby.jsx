import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HighscoreList from '../components/HighscoreList.jsx';
import { getTotalScoreCount } from '../lib/scores.js';

// Prozedurales Snake-Icon (16x16 Pixel-Art auf Canvas)
function SnakeIcon() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    c.width = 48; c.height = 48;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 48, 48);

    // Schlangenkörper
    const cells = [
      [5,3],[4,3],[3,3],[2,3],[1,3],[1,4],[1,5],[2,5],[3,5],[3,4]
    ];
    const scale = 4;
    ctx.fillStyle = '#ccac00';
    cells.slice(1).forEach(([x,y]) => ctx.fillRect(x*scale+4, y*scale+4, scale-1, scale-1));

    // Kopf (helleres Gold)
    ctx.fillStyle = '#ffd700';
    const [hx,hy] = cells[0];
    ctx.fillRect(hx*scale+4, hy*scale+4, scale-1, scale-1);

    // Augen
    ctx.fillStyle = '#000';
    ctx.fillRect(hx*scale+5+1, hy*scale+4+1, 1, 1);

    // Apfel
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(5*scale+4, 5*scale+4, scale-1, scale-1);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(5*scale+6, 5*scale+3, 1, 1);
  }, []);
  return <canvas ref={ref} className="game-card-icon" width={48} height={48} aria-label="Snake Icon" />;
}

// Prozedurales Clicker-Icon (Cookie als Pixel-Art)
function ClickerIcon() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    c.width = 48; c.height = 48;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 48, 48);

    // Kreis-Cookie
    ctx.beginPath();
    ctx.arc(24, 24, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#c8832a';
    ctx.fill();
    // Chips
    ctx.fillStyle = '#5a3010';
    const chips = [[18,18],[28,20],[22,28],[30,28]];
    chips.forEach(([x,y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    // Glanz
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(18, 18, 6, 0, Math.PI * 2);
    ctx.fill();
  }, []);
  return <canvas ref={ref} className="game-card-icon" width={48} height={48} aria-label="Clicker Icon" />;
}

// Prozedurales Press-Icon (Presse-Plattform)
function PressIcon() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    c.width = 48; c.height = 48;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 48, 48);

    // Presse oben
    ctx.fillStyle = '#888';
    ctx.fillRect(8, 6, 32, 8);
    // Kolben
    ctx.fillStyle = '#aaa';
    ctx.fillRect(18, 14, 12, 16);
    // Objekt (Knete)
    ctx.fillStyle = '#ff6fa0';
    ctx.fillRect(10, 32, 28, 8);
    // Basis
    ctx.fillStyle = '#555';
    ctx.fillRect(6, 40, 36, 4);
  }, []);
  return <canvas ref={ref} className="game-card-icon" width={48} height={48} aria-label="Press Icon" />;
}

// Einzelne Spielkarte
function GameCard({ title, icon, description, status, statusClass, to, game }) {
  return (
    <article className="game-card" aria-label={`Spielkarte ${title}`}>
      <div className="game-card-header">
        {icon}
        <div className="game-card-title-wrap">
          <h2 className="game-card-title">{title}</h2>
          <span className={`game-card-status ${statusClass}`}>{status}</span>
        </div>
      </div>
      <div className="game-card-body">
        <p className="game-card-desc">{description}</p>
        <div className="game-card-scores">
          <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.4rem', color: 'var(--muted)', marginBottom: '8px' }}>
            TOP 3
          </p>
          <HighscoreList game={game} compact limit={3} />
        </div>
      </div>
      <div className="game-card-footer">
        <Link to={to} className="btn btn-primary" style={{ width: '100%' }} aria-label={`${title} spielen`}>
          SPIELEN
        </Link>
      </div>
    </article>
  );
}

// Lobby-Startseite
export default function Lobby() {
  const [totalScores, setTotalScores] = useState(null);

  useEffect(() => {
    getTotalScoreCount().then(({ count }) => setTotalScores(count));
  }, []);

  return (
    <main className="page-content" id="lobby-main">
      <div className="lobby-intro">
        <img
          src="/logo.png"
          alt="Moritzfreund Arcade Logo"
          className="lobby-logo"
          width={96}
          height={96}
        />
        <h1 className="lobby-title">MORITZFREUND ARCADE</h1>
        <p className="lobby-subtitle">
          SPIELE FUER UNTERWEGS &mdash; HIGHSCORES FUER ALLE
        </p>
        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => window.dispatchEvent(new CustomEvent('arcade-open-patchlog'))}
            style={{
              fontSize: '0.52rem',
              padding: '8px 18px',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
              background: 'rgba(255, 215, 0, 0.08)',
              boxShadow: '0 0 16px rgba(255, 215, 0, 0.2)',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📜</span>
            <span>RIESIGER PATCH-LOG (v3.2) &bull; ALLE UPDATES ANSEHEN</span>
            <span style={{ background: '#39ff14', color: '#000', padding: '1px 5px', borderRadius: '4px', fontSize: '0.42rem', fontWeight: 'bold' }}>NEU</span>
          </button>
        </div>
      </div>

      <div className="lobby-grid" role="list" aria-label="Spielauswahl">
        <div role="listitem">
          <GameCard
            title="SNAKE"
            icon={<SnakeIcon />}
            description="Das bessere Snake. Grid 24x24, Gold-Äpfel, ansteigendes Tempo. Schlag dich in die Highscore-Liste!"
            status="SPIELBAR"
            statusClass=""
            to="/snake"
            game="snake"
          />
        </div>
        <div role="listitem">
          <GameCard
            title="COOKIE CLICKER"
            icon={<ClickerIcon />}
            description="Klick dich reich. Gebäude, Upgrades, Skins, Achievements und ein endloser Strom aus Cookies."
            status="NEU"
            statusClass="status-new"
            to="/clicker"
            game="clicker"
          />
        </div>
        <div role="listitem">
          <GameCard
            title="HYDRAULISCHE PRESSE"
            icon={<PressIcon />}
            description="ASMR-Zerstörungs-Sandbox. 5 Objekt-Typen mit Material-Physik, Partikel und prozedurale Sounds. Kommt bald."
            status="IN ARBEIT"
            statusClass="status-wip"
            to="/press"
            game="press"
          />
        </div>
      </div>

      {totalScores !== null && (
        <div className="lobby-stats" aria-label="Gesamtstatistik">
          {totalScores.toLocaleString('de-DE')} SCORES EINGETRAGEN GESAMT
        </div>
      )}
    </main>
  );
}
