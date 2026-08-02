'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MAP_PLACES } from '@/data/trip';
import { nearest, type LatLon } from '@/lib/geo';
import { wibDate } from '@/lib/time';
import { useHydrated, useTrip } from '@/lib/store';
import { Distance } from './Distance';
import { CategoryIcon } from './CategoryIcon';
import { PlaceField } from './PlaceField';
import { listVariants, stationVariants, usePrefersReducedMotion } from '@/lib/motion';

/** The live "what is near me" answer, in three rows. */
export function NearestStrip({
  from,
  now,
  label,
}: {
  from: LatLon;
  now: Date;
  label: string;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();
  const reduced = usePrefersReducedMotion();

  const rows = nearest(
    MAP_PLACES.filter((p) => p.category !== 'hotel' && p.category !== 'ferry'),
    from,
    3,
    wibDate(now),
  );

  return (
    <>
      <div className="flex items-baseline justify-between gap-3 px-gutter pb-2 pt-7">
        <h2 className="eyebrow">Nearest to you</h2>
        <span className="text-caption text-muted">{label}</span>
      </div>

      <motion.ul variants={listVariants} initial={reduced ? false : 'hidden'} animate="show">
        {rows.map(({ item, km, verdict }) => (
          <motion.li key={item.key} variants={stationVariants} className="rule-b">
            <Link
              href="/places"
              className="tap flex items-start gap-3 px-gutter py-3"
            >
              <PlaceField place={item} glyphSize={17} className="h-10 w-10 shrink-0 rounded-sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span
                    className={`font-semibold tracking-[-0.015em] ${
                      hydrated && done.includes(item.key) ? 'text-muted line-through' : ''
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="shrink-0 text-muted" aria-hidden>
                    <CategoryIcon category={item.category} />
                  </span>
                </span>
                <span className="mt-0.5 block text-caption text-muted">{item.note}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold">
                  <Distance km={km} />
                </span>
                <span className="mt-0.5 block text-caption text-muted">
                  {verdict.text}
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}
