// src/components/Icons.jsx
// Selbstgezeichnete Inline-SVGs im einheitlichen 2px-Strich-Stil (Neo-Brutalismus)

import React from 'react';

const defaultProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// 1. QR-Code
export function IconQr(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="6" y="6" width="1" height="1" fill="currentColor" />
      <rect x="17" y="6" width="1" height="1" fill="currentColor" />
      <rect x="6" y="17" width="1" height="1" fill="currentColor" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v3h-1" />
      <path d="M14 20h7" />
    </svg>
  );
}

// 2. Passwort
export function IconPassword(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 3. Einheiten-Umrechner
export function IconConverter(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M4 7h16" />
      <path d="M7 4L4 7l3 3" />
      <path d="M20 17H4" />
      <path d="M17 14l3 3-3 3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// 4. Währungsrechner
export function IconCurrency(props) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9h-4a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9" />
      <path d="M12 7v2" />
      <path d="M12 19v2" />
    </svg>
  );
}

// 5. Noten-Schnitt
export function IconGrades(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

// 6. Bild-Kompressor
export function IconImageCompress(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
      <path d="M14 6l3 3" />
      <path d="M17 6h-3v3" />
    </svg>
  );
}

// 7. Bild-Format-Konverter
export function IconImageConvert(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M4 16l4-4 4 4" />
      <rect x="2" y="4" width="12" height="12" rx="2" />
      <path d="M14 8h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}

// 8. Farben
export function IconColor(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 2a10 10 0 1 0 10 10c0-1.5-.7-2-1.7-2h-1.8a2.5 2.5 0 0 1-2.5-2.5v-.5c0-1.5-1-2.5-2.5-2.5h-1.5z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

// 9. Würfel & Münzwurf
export function IconDice(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 10. Wordle Deutsch
export function IconWordle(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
      <path d="M6 7h2" />
      <path d="M16 7h2" />
      <path d="M6 17h2" />
      <path d="M16 17h2" />
    </svg>
  );
}

// 11. Speed-Test
export function IconSpeed(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 14l3-3" />
      <path d="M3.34 17a10 10 0 1 1 17.32 0" />
      <circle cx="12" cy="14" r="2" />
    </svg>
  );
}

// 12. CPS-Test
export function IconCps(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

// Allgemeine UI Icons
export function IconCopy(props) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...defaultProps} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconSearch(props) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconChevronDown(props) {
  return (
    <svg {...defaultProps} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconChevronUp(props) {
  return (
    <svg {...defaultProps} {...props}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function IconArrowLeft(props) {
  return (
    <svg {...defaultProps} {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function IconArrowRight(props) {
  return (
    <svg {...defaultProps} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21.5 2v6h-6" />
      <path d="M2.5 22v-6h6" />
      <path d="M21 11.5A9 9 0 0 0 5.7 6.3L2.5 8" />
      <path d="M3 12.5a9 9 0 0 0 15.3 5.2l3.2-1.7" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...defaultProps} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function IconSwap(props) {
  return (
    <svg {...defaultProps} {...props}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 5h18" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 19H3" />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg {...defaultProps} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconCoin(props) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconClear(props) {
  return (
    <svg {...defaultProps} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconShare(props) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
