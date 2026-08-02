'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the browser thinks it has a network.
 *
 * Only the map tiles care — everything else in the app is bundled. Starts
 * optimistic so the offline notice never flashes on a good connection.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
