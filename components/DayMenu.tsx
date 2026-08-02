'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { dayMenu, type Course } from '@/lib/meals';
import { directionsUrl, formatKm, haversineKm, type LatLon } from '@/lib/geo';
import { runningOrder } from '@/lib/route';
import { formatMinutes } from '@/lib/time';
import { useHydrated, useTrip } from '@/lib/store';
import { listVariants, stationVariants, usePrefersReducedMotion } from '@/lib/motion';
import { CategoryIcon } from './CategoryIcon';
import { PlaceField } from './PlaceField';
import { PlaceSheet } from './PlaceSheet';
import type { DayId } from '@/data/trip';

/**
 * A day, as four courses.
 *
 * Which place lands in which course is derived — see lib/meals.ts — so the
 * heading says so. Everything that is not a meal is one quiet block at the
 * bottom rather than competing with the food.
 */
export function DayMenu({
  day,
  from,
}: {
  day: DayId;
  /** Where distances are measured from. */
  from: LatLon;
}): JSX.Element {
  const menu = dayMenu(day);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();

  // A course with nothing in it and nothing included has nothing to say. Four
  // of those in a row — which is exactly what arrival day is — reads as a bug.
  const courses = menu.courses.filter((c) => c.places.length > 0 || Boolean(c.included));

  const stations = runningOrder(day);
  const openStation = openKey
    ? (stations.find((s) => s.place.key === openKey) ?? null)
    : null;

  return (
    <>
      <motion.div
        variants={listVariants}
        initial={reduced ? false : 'hidden'}
        animate="show"
        key={day}
      >
        {courses.length > 0 ? (
          courses.map((course) => (
            <CourseBlock
              key={course.meal.key}
              course={course}
              from={from}
              done={hydrated ? done : []}
              onOpen={setOpenKey}
            />
          ))
        ) : (
          <p className="px-gutter pt-6 text-caption text-muted">
            No meals planned on this day — you are travelling through most of it.
          </p>
        )}

        {menu.between.length > 0 && (
          <motion.section variants={stationVariants} className="px-gutter pt-7">
            <h2 className="eyebrow">Between meals</h2>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {menu.between.map((place) => {
                const isDone = hydrated && done.includes(place.key);
                return (
                  <li key={place.key}>
                    <button
                      type="button"
                      onClick={() => setOpenKey(place.key)}
                      className="tap flex w-full items-center gap-2.5 rounded border border-hairline border-rule bg-card p-2.5 text-left"
                    >
                      <PlaceField
                        place={place}
                        className="h-9 w-9 shrink-0 rounded-sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-caption font-semibold leading-snug ${
                            isDone ? 'text-muted line-through' : ''
                          }`}
                        >
                          {place.name}
                        </span>
                        <span className="numeric mt-0.5 block text-eyebrow text-muted">
                          {formatKm(haversineKm(from, place))}
                        </span>
                      </span>
                      <span aria-hidden className="shrink-0 text-muted">
                        <CategoryIcon category={place.category} size={14} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}
      </motion.div>

      <PlaceSheet
        station={openStation}
        line={day}
        from={from}
        onClose={() => setOpenKey(null)}
      />
    </>
  );
}

function CourseBlock({
  course,
  from,
  done,
  onOpen,
}: {
  course: Course;
  from: LatLon;
  done: readonly string[];
  onOpen: (key: string) => void;
}): JSX.Element {
  const { meal, places, included } = course;

  return (
    <motion.section variants={stationVariants} className="px-gutter pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow" style={{ color: meal.textColour }}>
          {meal.name}
        </h2>
        <span className="numeric text-eyebrow font-bold uppercase text-muted">
          {formatMinutes(meal.from)}
        </span>
      </div>

      {included && (
        <p className="mt-1.5 flex items-center gap-2 text-caption text-muted">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meal.colour }}
          />
          {included}
        </p>
      )}

      <ul className="mt-2.5 flex flex-col gap-2">
        {places.map(({ place, reason }) => {
          const isDone = done.includes(place.key);
          const km = haversineKm(from, place);

          return (
            <li key={place.key}>
              <div className="overflow-hidden rounded-md border border-hairline border-rule bg-card">
                <button
                  type="button"
                  onClick={() => onOpen(place.key)}
                  className="tap flex w-full items-stretch gap-3 p-2.5 text-left"
                >
                  <PlaceField place={place} className="h-14 w-14 shrink-0 rounded-sm" />
                  <span className="flex min-w-0 flex-1 flex-col justify-center">
                    <span
                      className={`text-lede font-bold leading-tight tracking-[-0.015em] ${
                        isDone ? 'text-muted line-through' : ''
                      }`}
                    >
                      {place.name}
                    </span>
                    <span className="mt-0.5 block text-caption leading-snug text-muted">
                      {place.note}
                    </span>
                    <span className="numeric mt-1 text-eyebrow font-bold uppercase text-muted">
                      {formatKm(km)} · {reason}
                    </span>
                  </span>
                </button>
                <a
                  href={directionsUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn w-full border-t-hairline border-rule py-2.5 text-caption"
                  style={{ color: meal.textColour }}
                >
                  Open in Google Maps
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
