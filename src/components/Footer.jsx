// src/components/Footer.jsx
// Transparenter, datenschutzfreundlicher Footer im Neo-Brutalismus

import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            MOOLS
          </span>
          <span className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            (Moritz und Tools checkst du? :/)
          </span>
          <span className="text-muted">·</span>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            und ja ich habe kein impressum
          </span>
        </div>

        <p className="footer-note">
          Chillen
        </p>

        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>

          <a
            href="https://moritzfreund.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline' }}
          >
            moritzfreund.de
          </a>
          <span className="text-muted">•</span>
          <span className="text-muted">Verity</span>
        </div>
      </div>
    </footer>
  );
}
