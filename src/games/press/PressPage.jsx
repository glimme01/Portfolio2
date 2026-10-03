import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HighscoreList from '../../components/HighscoreList.jsx';

// Mini-Demo: Knete-Objekt das sich beim Klick platt drückt
function PressDemo() {
  const canvasRef = useRef(null);
  const stateRef = useRef({ y: 60, pressing: false, progress: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 300;
    canvas.height = 220;

    function draw() {
      const ctx = canvas.getContext('2d');
      const s = stateRef.current;
      ctx.clearRect(0, 0, 300, 220);

      // Hintergrund
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 300, 220);

      // Basis-Platte
      ctx.fillStyle = '#555';
      ctx.fillRect(30, 180, 240, 16);

      // Presse-Zylinder
      ctx.fillStyle = '#777';
      ctx.fillRect(110, 10, 80, 20 + s.progress * 80);

      // Presse-Kopf
      ctx.fillStyle = '#aaa';
      ctx.fillRect(90, 30 + s.progress * 80, 120, 16);

      // Knete (wird flacher)
      const kH = Math.max(8, 50 - s.progress * 42);
      const kW = 80 + s.progress * 80;
      const kX = (300 - kW) / 2;
      const kY = 180 - kH;

      // Knete-Farbe (wird beim Quetschen dunkler)
      const r = Math.round(230 - s.progress * 80);
      ctx.fillStyle = `rgb(${r}, ${Math.round(100 - s.progress * 30)}, ${Math.round(160 - s.progress * 40)})`;
      ctx.beginPath();
      ctx.roundRect(kX, kY, kW, kH, 4);
      ctx.fill();

      // Quetsch-Partikel
      if (s.progress > 0.3) {
        ctx.fillStyle = `rgba(200, 80, 140, ${(s.progress - 0.3) * 0.6})`;
        for (let i = 0; i < 5; i++) {
          const px = kX - 4 - i * 3;
          const py = kY + Math.random() * kH;
          ctx.fillRect(px, py, 3, 3);
          ctx.fillRect(kX + kW + 1 + i * 3, py, 3, 3);
        }
      }

      // Pfeil-Hinweis
      if (!s.pressing && s.progress === 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KLICK ZUM DRUECKEN', 150, 205);
      }
    }

    function animate() {
      const s = stateRef.current;
      if (s.pressing && s.progress < 1) {
        s.progress = Math.min(1, s.progress + 0.02);
      } else if (!s.pressing && s.progress > 0) {
        s.progress = Math.max(0, s.progress - 0.03);
      }
      draw();
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  function handlePress(start) {
    stateRef.current.pressing = start;
  }

  return (
    <div
      className="press-canvas-wrap"
      onMouseDown={() => handlePress(true)}
      onMouseUp={() => handlePress(false)}
      onMouseLeave={() => handlePress(false)}
      onTouchStart={(e) => { e.preventDefault(); handlePress(true); }}
      onTouchEnd={(e) => { e.preventDefault(); handlePress(false); }}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      aria-label="Mini-Demo der hydraulischen Presse"
      role="button"
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={220}
        style={{ display: 'block', imageRendering: 'pixelated', width: '300px', height: '220px', maxWidth: '100%' }}
      />
    </div>
  );
}

// Platzhalter-Seite für die hydraulische Presse
export default function PressPage() {
  return (
    <main className="page-content" id="press-main">
      <div className="press-preview">
        <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: 'clamp(0.7rem, 3vw, 1rem)', color: 'var(--accent)', textAlign: 'center', lineHeight: 1.6 }}>
          HYDRAULISCHE PRESSE
        </h1>

        <div style={{ background: 'var(--card)', border: '1px solid #ff8c00', borderRadius: '10px', padding: '16px 20px', textAlign: 'center', width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.5rem', color: '#ff8c00', marginBottom: '10px' }}>IN ARBEIT</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            ASMR-Zerstörungs-Sandbox: 5 Objekt-Typen mit Material-Physik, Partikel-Systemen und prozeduralen Sounds. Jedes Material reagiert anders auf die Presse.
          </p>
        </div>

        <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--muted)', textAlign: 'center' }}>
          MINI-VORSCHAU — DRUECK DIE KNETE
        </p>

        <PressDemo />

        <div style={{ width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.45rem', color: 'var(--muted)', marginBottom: '12px' }}>
            TOP SCORES (WARTET AUF EUCH)
          </p>
          <HighscoreList game="press" compact limit={3} />
        </div>

        <Link to="/" className="btn btn-outline">ZURUECK ZUR LOBBY</Link>
      </div>
    </main>
  );
}
