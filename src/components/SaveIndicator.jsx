import React, { useEffect, useState } from 'react';

// Kleines "GESPEICHERT"-Badge, das kurz erscheint und dann verschwindet
export default function SaveIndicator({ visible }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div className="save-indicator" role="status" aria-live="polite">
      GESPEICHERT
    </div>
  );
}
