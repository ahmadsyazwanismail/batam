'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LottieMoment } from './LottieMoment';
import { Logo } from './Logo';
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

    setShowing(true);
    // The flag is set when the timer *finishes*, not when it starts. Setting it
    // up front means a cleanup that cancels the timer — which React's dev-mode
    // double-invoke does on every mount — leaves the flag set, so the re-run
    // returns early, the timer is never re-armed, and the splash covers the app
    // forever. Ask how I know.
    const id = window.setTimeout(() => {
      sessionStorage.setItem(SEEN, '1');
      setShowing(false);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [reduced]);

  // Belt and braces: a full-screen overlay must never be able to trap the app,
  // so it is always dismissable by touching it.
  const dismiss = () => {
    sessionStorage.setItem(SEEN, '1');
    setShowing(false);
  };

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-paper"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onPointerDown={dismiss}
          aria-hidden
        >
          <div className="w-40">
            <LottieMoment name="splash" loop={false} />
          </div>
          <Logo size={40} className="mt-1" />
          <p className="eyebrow mt-3 text-muted">21–25 Aug 2026 · five days</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
