'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { lineById, type LineId } from '@/data/trip';
import { runningOrder } from '@/lib/route';
import { useHydrated, useTrip } from '@/lib/store';
import { LottieMoment } from './LottieMoment';
import { SPRING } from '@/lib/motion';

/**
 * The third and last Lottie moment: the last station of a day gets ticked.
 *
 * Fires on the transition into complete, once, and only for a day that was not
 * already finished when the screen mounted — otherwise it would go off every
 * time you opened the app on a finished day, which is the opposite of a
 * celebration.
 */
export function DayComplete({ line }: { line: LineId }): JSX.Element | null {
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

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
        >
          <motion.div
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={SPRING}
            className="flex flex-col items-center"
          >
            <div className="w-44">
              <LottieMoment
                name="celebrate"
                loop={false}
                onComplete={() => setShowing(false)}
              />
            </div>
            <p className="-mt-2 text-[1.25rem] font-bold tracking-[-0.02em]">
              {lineById(line).name} complete
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
