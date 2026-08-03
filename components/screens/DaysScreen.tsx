'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Screen } from '@/components/Screen';
import { DAYS, requirePlace } from '@/data/trip';
import { dayMenu } from '@/lib/meals';
import { formatTripDate, wibDate } from '@/lib/time';
import { useHydrated, useTrip } from '@/lib/store';
import { listVariants, stationVariants, usePrefersReducedMotion } from '@/lib/motion';

/**
 * Five days. Past ones fade, today is held, each shows its four courses as a
 * bar — so you always know how much of the trip is left without counting.
 */
export function DaysScreen(): JSX.Element {
  const [today, setToday] = useState<string | null>(null);
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();
  const reduced = usePrefersReducedMotion();

  useEffect(() => setToday(wibDate(new Date())), []);

  return (
    <Screen eyebrow="21–25 Aug 2026" title="Five days">
      <motion.ul
        variants={listVariants}
        initial={reduced ? false : 'hidden'}
        animate="show"
        className="flex flex-col gap-2.5 px-gutter"
      >
        {DAYS.map((day) => {
          const menu = dayMenu(day.id);
          const isToday = today === day.date;
          const isPast = today !== null && today > day.date;
          const base = requirePlace(day.base);

          const courses = menu.courses.map((c) => ({
            key: c.meal.key,
            colour: `var(--meal-${c.meal.key})`,
            filled:
              c.places.length > 0 &&
              hydrated &&
              c.places.every((p) => done.includes(p.place.key)),
            has: c.places.length > 0 || Boolean(c.included),
          }));
          const doneCount = courses.filter((c) => c.filled).length;
          // Arrival day has no meals on it at all, so "0 of 4" would be a
          // score against a total that was never really there.
          const totalCount = courses.filter((c) => c.has).length;

          return (
            <motion.li key={day.id} variants={stationVariants}>
              <Link
                href={`/days/${day.id}`}
                aria-current={isToday ? 'page' : undefined}
                className={`tap block rounded-md border bg-card p-3.5 transition-opacity ${
                  isPast ? 'opacity-55' : ''
                }`}
                style={{
                  borderColor: isToday ? 'var(--accent)' : 'var(--rule)',
                  borderWidth: isToday ? 2 : 1,
                }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="eyebrow"
                    style={isToday ? { color: 'var(--accent)' } : undefined}
                  >
                    {formatTripDate(day.date)}
                    {isToday ? ' · today' : ''}
                  </span>
                  {isPast && (
                    // "Done" here meant "the date has gone", but it sat one
                    // line above "0 of 4 courses done" and read as a claim.
                    <span className="eyebrow">Past</span>
                  )}
                </div>

                <p className="signboard mt-1 text-title leading-none">Day {day.id}</p>
                {/* The area and the base together: both answer "where is this
                    day", which is the second question after "which day". */}
                <p className="mt-1.5 text-caption text-muted">
                  {day.name} · based at {base.name}
                </p>

                <div className="mt-3 flex gap-1" aria-hidden>
                  {courses.map((c) => (
                    <span
                      key={c.key}
                      className="h-[4px] flex-1 rounded-full"
                      style={{
                        backgroundColor: c.has ? c.colour : 'var(--rule)',
                        opacity: c.has && !c.filled ? 0.42 : 1,
                      }}
                    />
                  ))}
                </div>
                <p className="numeric mt-1.5 text-eyebrow font-bold uppercase text-muted">
                  {totalCount === 0
                    ? 'A travelling day'
                    : `${doneCount} of ${totalCount} courses done`}
                </p>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </Screen>
  );
}
