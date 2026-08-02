'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Screen } from '@/components/Screen';
import { DayMenu } from '@/components/DayMenu';
import { DayComplete } from '@/components/DayComplete';
import { LocationBar } from '@/components/LocationBar';
import { DAYS, dayById, requirePlace, type DayId } from '@/data/trip';
import { formatTripDate } from '@/lib/time';
import { useLocation } from '@/lib/useLocation';

export function DayScreen({ day }: { day: DayId }): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const location = useLocation(now ?? new Date());
  const info = dayById(day);
  const base = requirePlace(info.base);

  // Distances and the clock both depend on the moment, and this page is
  // prerendered — so nothing time-dependent renders before mount.
  if (!now) {
    return (
      <Screen eyebrow={`Day ${day}`} title={info.name}>
        <p className="px-gutter text-muted">Working out where you are…</p>
      </Screen>
    );
  }

  return (
    <>
      <Screen
        eyebrow={`Day ${day} of ${DAYS.length} · ${formatTripDate(info.date)}`}
        title={info.name}
      >
        <p className="px-gutter text-caption text-muted">Based at {base.name}</p>

        <div className="mt-3 px-gutter">
          <LocationBar location={location} compact />
        </div>

        <DayMenu day={day} from={location.origin.point} />

        <p className="px-gutter pt-7 text-caption leading-relaxed text-muted">
          A suggested order, not a booking. Which course a place lands in comes
          from its opening hours and from your own notes — “order am” is a
          breakfast, “pumpkin donuts” is tea, nasi padang is lunch.
        </p>

        <nav className="flex items-center justify-between gap-3 px-gutter pt-6">
          {day > 1 ? (
            <Link
              href={`/days/${day - 1}`}
              className="tap flex items-center text-caption font-semibold"
            >
              ← Day {day - 1}
            </Link>
          ) : (
            <span />
          )}
          {day < DAYS.length ? (
            <Link
              href={`/days/${day + 1}`}
              className="tap flex items-center text-caption font-semibold"
            >
              Day {day + 1} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </Screen>
      <DayComplete line={day} />
    </>
  );
}
