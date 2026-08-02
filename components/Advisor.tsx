'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { advise } from '@/lib/advisor';
import { directionsUrl } from '@/lib/geo';
import { useTrip } from '@/lib/store';
import { CategoryIcon } from './CategoryIcon';
import { LineBadge } from './LineBadge';
import { SPRING } from '@/lib/motion';
import type { LatLon } from '@/lib/geo';

/**
 * One recommendation. Never a list — a list is what you produce when nobody
 * will decide, and standing on a pavement in the heat is exactly when a
 * decision is the useful thing.
 *
 * The reasoning is in lib/advisor.ts and is a rules engine, so it works with no
 * signal and its promises — the nap, the heat, Pink Beach, the last ferry — are
 * guarantees rather than a model's good intentions.
 */
export function Advisor({ now, from }: { now: Date; from: LatLon }): JSX.Element {
  const done = useTrip((s) => s.done);
  const toggleDone = useTrip((s) => s.toggleDone);
  const [raining, setRaining] = useState(false);

  const advice = useMemo(
    () => advise({ now, from, done, raining }),
    [now, from, done, raining],
  );

  return (
    <section
      aria-labelledby="advisor-heading"
      className="border border-hairline border-rule bg-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-hairline border-rule px-4 py-3">
        <h2 id="advisor-heading" className="eyebrow">
          What should we do now?
        </h2>
        <label className="flex shrink-0 items-center gap-1.5 text-caption text-muted">
          <input
            type="checkbox"
            checked={raining}
            onChange={(e) => setRaining(e.target.checked)}
            className="h-4 w-4 accent-[var(--line)]"
          />
          Raining
        </label>
      </div>

      <motion.div
        key={advice.place?.key ?? 'none'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="p-4"
        aria-live="polite"
      >
        {advice.place ? (
          <>
            <div className="flex items-start gap-3">
              <span className="shrink-0 pt-0.5">
                <LineBadge line={advice.place.line} size="sm" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[1.375rem] font-bold leading-tight tracking-[-0.03em]">
                  {advice.place.name}
                  <span className="shrink-0 text-muted" aria-hidden>
                    <CategoryIcon category={advice.place.category} size={18} />
                  </span>
                </p>
                <p className="mt-1.5 leading-relaxed text-muted">{advice.reason}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={directionsUrl(advice.place)}
                target="_blank"
                rel="noreferrer"
                className="tap flex items-center justify-center bg-ink py-3 font-semibold text-card"
              >
                Directions
              </a>
              <button
                type="button"
                onClick={() => toggleDone(advice.place!.key)}
                className="tap flex items-center justify-center border border-hairline border-rule py-3 font-semibold"
              >
                Tick it off
              </button>
            </div>
          </>
        ) : (
          <p className="leading-relaxed">{advice.reason}</p>
        )}
      </motion.div>
    </section>
  );
}
