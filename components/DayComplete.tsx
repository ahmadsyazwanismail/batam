'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dayById, type DayId } from '@/data/trip';
import { runningOrder } from '@/lib/route';
import { useHydrated, useTrip } from '@/lib/store';
import { LottieMoment } from './LottieMoment';
import { SPRING } from '@/lib/motion';

/**
 * The third and last Lottie moment: the last stop of a day gets ticked.
 *
 * Fires on the transition into complete, once, and only for a day that was not
 * already finished when the screen mounted — otherwise it would go off every
 * time you opened the app on a finished day, which is the opposite of a
 * celebration.
 */
export function DayComplete({ line }: { line: DayId }): JSX.Element | null {
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();
  const [showing, setShowing] = useState(false);
  const wasComplete = useRef<boolean | null>(null);

  const stations = runningOrder(line).filter(
    (s) => s.place.category !== 'hotel' && s.place.category !== 'ferry',
  );
  const complete =
    stations.length > 0 && stations.every((s) => done.includes(s.place.key));

  useEffect(() => {
    if (!hydrated) return;
    // First run after hydration only records the starting state.
    if (wasComplete.current === null) {
      wasComplete.current = complete;
      return;
    }
    if (complete && !wasComplete.current) setShowing(true);
    wasComplete.current = complete;
  }, [complete, hydrated]);

  // It closes when the animation finishes — but under reduced motion the
  // animation never plays, so onComplete never fires, and if the Lottie chunk
  // fails to load there is nothing to fire it at all. A full-screen overlay
  // must never be able to sit there forever, so it also closes on a clock.
  useEffect(() => {
    if (!showing) return;
    const id = window.setTimeout(() => setShowing(false), 2600);
    return () => window.clearTimeout(id);
  }, [showing]);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/35 px-gutter backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onPointerDown={() => setShowing(false)}
          role="status"
        >
          {/* It floated bare over the page before, with no ground of its own,
              which read as a rendering fault rather than as a moment. */}
          <motion.div
            initial={{ scale: 0.9, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={SPRING}
            className="flex w-full max-w-[19rem] flex-col items-center rounded-sheet border border-hairline border-rule bg-card px-6 pb-7 pt-3 shadow-[var(--shadow-modal)]"
          >
            <div className="w-36">
              <LottieMoment
                name="celebrate"
                loop={false}
                onComplete={() => setShowing(false)}
              />
            </div>
            <p className="-mt-1 text-center text-[1.25rem] font-bold leading-tight tracking-[-0.02em]">
              {dayById(line).name} complete
            </p>
            <p className="eyebrow mt-2 text-muted">
              Day {line} · every stop ticked
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
