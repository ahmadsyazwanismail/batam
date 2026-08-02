'use client';

import { motion } from 'framer-motion';
import { fixedPoints } from '@/lib/fixedPoints';
import { stationVariants } from '@/lib/motion';
import type { DayId } from '@/data/trip';

/**
 * The day's booked events, above the food.
 *
 * Only days 1, 2 and 5 have any — the middle of the trip is entirely yours —
 * so this renders nothing at all on the days it has nothing to say.
 */
export function FixedPoints({ day }: { day: DayId }): JSX.Element | null {
  const points = fixedPoints(day);
  if (points.length === 0) return null;

  return (
    <motion.section variants={stationVariants} className="px-gutter pt-5">
      <h2 className="eyebrow">Booked</h2>
      <ol className="mt-2 overflow-hidden rounded-md border border-hairline border-rule bg-card">
        {points.map((point, i) => (
          <li
            key={point.label}
            className={`flex items-baseline gap-3 p-3 ${
              i > 0 ? 'border-t border-hairline border-rule' : ''
            }`}
          >
            <span className="numeric w-[74px] shrink-0 text-eyebrow font-bold uppercase text-muted">
              {point.clock ?? <span aria-hidden>—</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-semibold leading-snug">
                {point.label}
              </span>
              {point.detail && (
                <span className="mt-0.5 block text-eyebrow leading-snug text-muted">
                  {point.detail}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
