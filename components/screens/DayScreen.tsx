'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Screen } from '@/components/Screen';
import { DayMenu } from '@/components/DayMenu';
import { FixedPoints } from '@/components/FixedPoints';
import { DayWeatherRow } from '@/components/Weather';
import { DayComplete } from '@/components/DayComplete';
import { LocationBar } from '@/components/LocationBar';
import { DAYS, dayById, requirePlace, type DayId } from '@/data/trip';
import { dayMenu } from '@/lib/meals';
import { formatTripDate, wibDate } from '@/lib/time';
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
      <Screen
        eyebrow={formatTripDate(info.date)}
        title={`Day ${day}`}
        subtitle={info.name}
      >
        <p className="px-gutter text-muted">Working out where you are…</p>
      </Screen>
    );
  }

  // Looking at a day you are not on, with no live fix, the app used to say
  // "distances are from the Radisson" directly under "based at the Harris".
  // On another day the honest reference point is that day's own base.
  const isToday = wibDate(now) === info.date;
  const live = location.origin.kind === 'you';
  const from = live || isToday ? location.origin.point : { lat: base.lat, lon: base.lon };
  const hasCourses = dayMenu(day).courses.some(
    (c) => c.places.length > 0 || Boolean(c.included),
  );

  return (
    <>
      {/* "Day 3" leads and "Batam Centre" follows, everywhere a day is named.
          Which day you are on is what you navigate by; the area is what tells
          you what that day is. It used to be the other way round. */}
      <Screen
        eyebrow={`${formatTripDate(info.date)} · ${day} of ${DAYS.length}`}
        title={`Day ${day}`}
        subtitle={info.name}
      >
        <p className="px-gutter text-caption text-muted">Based at {base.name}</p>

        <div className="px-gutter">
          <DayWeatherRow date={info.date} />
        </div>

        <div className="mt-3 px-gutter">
          {live || isToday ? (
            <LocationBar location={location} compact />
          ) : (
            <p className="text-caption leading-snug text-muted">
              Distances are from {base.name}, where you are based this day.
            </p>
          )}
        </div>

        <FixedPoints day={day} />

        <DayMenu day={day} from={from} />

        {hasCourses && (
          <p className="px-gutter pt-7 text-caption leading-relaxed text-muted">
            A suggested order, not a booking. Which course a place lands in comes
            from its opening hours and from your own notes — “order am” is a
            breakfast, “pumpkin donuts” is tea, nasi padang is lunch.
          </p>
        )}

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
