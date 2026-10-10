// src/components/CopyButton.jsx
// Taktiler Kopier-Button mit Flash-Bestätigung "KOPIERT!"

import React, { useState } from 'react';
import { IconCopy, IconCheck } from './Icons';

export default function CopyButton({
  textToCopy,
  label = 'KOPIEREN',
  copiedLabel = 'KOPIERT!',
  className = '',
  variant = 'secondary', // 'primary', 'secondary', 'accent', 'sm'
  size = 'md', // 'sm', 'md'
  ariaLabel = 'In die Zwischenablage kopieren',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      // Fallback für ältere Browser oder restriktive Kontexte
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e2) {
        console.error('Kopieren fehlgeschlagen', e2);
      }
    }
  };

  const btnClasses = [
    'btn',
    size === 'sm' ? 'btn-sm' : '',
    copied ? 'btn-accent' : `btn-${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={btnClasses}
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={!textToCopy}
    >
      {copied ? (
        <>
          <IconCheck width={size === 'sm' ? 16 : 18} height={size === 'sm' ? 16 : 18} />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <IconCopy width={size === 'sm' ? 16 : 18} height={size === 'sm' ? 16 : 18} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
