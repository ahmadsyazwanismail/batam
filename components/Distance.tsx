'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/motion';

/**
 * Kilometres that count to a new value rather than snapping to it.
 *
 * Walking around with the app open, positions arrive every few seconds. A
 * number that jumps reads as a glitch; one that travels reads as a measurement.
 */
export function Distance({ km }: { km: number }): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(km);
  const previous = useRef(km);

  useEffect(() => {
    if (reduced) {
      previous.current = km;
      setShown(km);
      return;
    }
    const controls = animate(previous.current, km, {
      duration: 0.45,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: setShown,
    });
    previous.current = km;
    return () => controls.stop();
  }, [km, reduced]);

  return (
    <span className="numeric tabular-nums">
      {shown.toFixed(1)}
      <span className="text-muted"> km</span>
    </span>
  );
}
