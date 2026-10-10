// src/hooks/usePageMeta.js
// Setzt Dokument-Titel und Meta-Description dynamisch für sauberes SEO

import { useEffect } from 'react';

export function usePageMeta(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — Moritzfreund Tools`;
    } else {
      document.title = 'Moritzfreund Tools — 12 nützliche Alltags-Tools';
    }

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);
}
