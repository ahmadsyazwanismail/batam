'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker. Only in production — in dev it caches the
 * things you are trying to change.
 */
export function ServiceWorker(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // A blocked service worker costs offline support and nothing else.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
