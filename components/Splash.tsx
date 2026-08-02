'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LottieMoment } from './LottieMoment';
import { usePrefersReducedMotion } from '@/lib/motion';

const SEEN = 'batam-splash-seen';

/**
 * First load only, and only once per session.
 *
 * It covers the moment the clock, the position and the store are all still
 * settling, so it earns its place rather than being a delay for its own sake.
 * Reduced motion skips it entirely.
 */
export function Splash(): JSX.Element | null {
  const reduced = usePrefersReducedMotion();
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (sessionStorage.getItem(SEEN)) return;
    sessionStorage.setItem(SEEN, '1');
    setShowing(true);
    const id = window.setTimeout(() => setShowing(false), 1500);
    return () => window.clearTimeout(id);
  }, [reduced]);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-paper"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          aria-hidden
        >
          <div className="w-40">
            <LottieMoment name="splash" loop={false} />
          </div>
          <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.03em]">Batam Lines</p>
          <p className="eyebrow mt-1">21–25 Aug 2026</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
