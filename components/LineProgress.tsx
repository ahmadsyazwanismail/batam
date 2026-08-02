'use client';

import { motion } from 'framer-motion';
import { lineById, type LineId } from '@/data/trip';
import { runningOrder } from '@/lib/route';
import { useHydrated, useTrip } from '@/lib/store';
import { SPRING, usePrefersReducedMotion } from '@/lib/motion';

/**
 * How much of a day is behind you, drawn as the line filling in.
 *
 * Hotels and the terminal are excluded — you do not "do" your own hotel, and
 * counting it would make every day start at one out of fifteen.
 */
export function LineProgress({
  line,
  showLabel = true,
}: {
  line: LineId;
  showLabel?: boolean;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();
  const reduced = usePrefersReducedMotion();
  const { colour } = lineById(line);

  const stations = runningOrder(line).filter(
    (s) => s.place.category !== 'hotel' && s.place.category !== 'ferry',
  );
  const total = stations.length;
  const complete = hydrated
    ? stations.filter((s) => done.includes(s.place.key)).length
    : 0;
  const fraction = total === 0 ? 0 : complete / total;

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="eyebrow">Ticked off</span>
          <span className="numeric text-caption font-semibold tabular-nums">
            {complete}<span className="text-muted">/{total}</span>
          </span>
        </div>
      )}
      <div
        className="h-[3px] w-full bg-rule"
        role="progressbar"
        aria-valuenow={complete}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${complete} of ${total} stations ticked off`}
      >
        <motion.div
          className="h-full w-full"
          // Grows from the left, the way the line runs.
          style={{ backgroundColor: colour, transformOrigin: 'left center' }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: fraction }}
          transition={reduced ? { duration: 0 } : SPRING}
        />
      </div>
    </div>
  );
}
