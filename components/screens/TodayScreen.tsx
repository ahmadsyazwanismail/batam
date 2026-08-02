'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, Screen, SectionHeading } from '@/components/Screen';
import { DayMenu } from '@/components/DayMenu';
import { Advisor } from '@/components/Advisor';
import { NearestStrip } from '@/components/NearestStrip';
import { LocationBar } from '@/components/LocationBar';
import { DayComplete } from '@/components/DayComplete';
import { UpNext } from '@/components/UpNext';
import { PrayerCard } from '@/components/PrayerCard';
import { RestOfDayCard } from '@/components/RestOfDayCard';
import { useLocation } from '@/lib/useLocation';
import { Countdown } from '@/components/Countdown';
import { PackingList } from '@/components/PackingList';
import { requirePlace, FERRY, DAYS, MAP_PLACES, WARNINGS } from '@/data/trip';
import {
  formatTripDate,
  mytClock,
  tripPhase,
  wibClock,
  wibMinutes,
  type TripPhase,
} from '@/lib/time';
import { currentMeal, nextMeal } from '@/lib/meals';
import { listVariants, stationVariants } from '@/lib/motion';

/**
 * The default screen, and the one that gets opened most.
 *
 * Everything on it is computed from the clock, so it renders after mount
 * rather than on the server — a server-rendered "today" would be wrong the
 * moment the page was cached.
 */
export function TodayScreen(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) return <TodaySkeleton />;

  const phase = tripPhase(now);

  return (
    <Screen
      eyebrow="Batam · 21–25 Aug 2026"
      title={<TodayTitle phase={phase} now={now} />}
      trailing={<Clock now={now} />}
    >
      {phase.phase === 'before' && <BeforeTheTrip phase={phase} now={now} />}
      {phase.phase === 'during' && <DuringTheTrip phase={phase} now={now} />}
      {phase.phase === 'after' && <AfterTheTrip />}
    </Screen>
  );
}

/** The headline is the meal, when there is one. */
function TodayTitle({ phase, now }: { phase: TripPhase; now: Date }): JSX.Element {
  if (phase.phase === 'before') return <>Not yet</>;
  if (phase.phase === 'after') return <>Home</>;

  const meal = currentMeal(wibMinutes(now));
  if (meal) return <>{meal.name}</>;
  const next = nextMeal(wibMinutes(now));
  return next ? <>Before {next.name.toLowerCase()}</> : <>{phase.day.name}</>;
}

/**
 * Both clocks, always. The one-hour gap is the single most common source of
 * confusion on this trip, so the app never makes anyone work it out.
 */
function Clock({ now }: { now: Date }): JSX.Element {
  return (
    <div className="text-right">
      <p className="numeric text-[1.75rem] font-bold leading-none tracking-[-0.03em]">
        {wibClock(now)}
      </p>
      <p className="eyebrow mt-1">WIB</p>
      <p className="numeric mt-2 text-caption text-muted">{mytClock(now)} at home</p>
    </div>
  );
}

function TodaySkeleton(): JSX.Element {
  return (
    <Screen eyebrow="Batam · 21–25 Aug 2026" title="Today">
      <p className="px-gutter text-muted">Reading the clock…</p>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function BeforeTheTrip({
  phase,
  now,
}: {
  phase: Extract<TripPhase, { phase: 'before' }>;
  now: Date;
}): JSX.Element {
  const outbound = FERRY.legs[0];

  return (
    <>
      <div className="px-gutter">
        <Countdown days={phase.daysUntil} />
      </div>

      <SectionHeading>The ferry out</SectionHeading>
      <div className="px-gutter">
        <Card className="p-4">
          <p className="text-[1.0625rem] font-semibold">
            {outbound.from} → {outbound.to}
          </p>
          <p className="numeric mt-3 text-[1.375rem] font-bold tracking-[-0.02em]">
            {outbound.departs}{' '}
            <span className="text-caption font-semibold text-muted">
              {outbound.departsZone}
            </span>
            <span className="px-2 text-muted">→</span>
            {outbound.arrives}{' '}
            <span className="text-caption font-semibold text-muted">
              {outbound.arrivesZone}
            </span>
          </p>
          <p className="mt-3 text-caption leading-relaxed text-muted">
            One hour on the water. Batam is an hour behind, so the clock only
            appears to move once. {FERRY.operator}.
          </p>
        </Card>
      </div>

      <SectionHeading>Before you go</SectionHeading>
      <motion.ul variants={listVariants} initial="hidden" animate="show">
        {WARNINGS.map((w) => (
          <motion.li
            key={w.key}
            variants={stationVariants}
            className="rule-b px-gutter py-4"
          >
            <p className="font-semibold tracking-[-0.01em]">{w.title}</p>
            <p className="mt-1 text-caption leading-relaxed text-muted">{w.body}</p>
          </motion.li>
        ))}
      </motion.ul>

      <SectionHeading>Packing</SectionHeading>
      <PackingList />

      <SectionHeading>Prayer times on Batam</SectionHeading>
      <div className="px-gutter">
        <PrayerCard now={now} from={requirePlace('radisson')} />
      </div>
    </>
  );
}

function DuringTheTrip({
  phase,
  now,
}: {
  phase: Extract<TripPhase, { phase: 'during' }>;
  now: Date;
}): JSX.Element {
  const { day: line, dayNumber } = phase;
  const base = requirePlace(line.base);
  const location = useLocation(now);

  return (
    <>
      <p className="px-gutter text-caption text-muted">
        Day {dayNumber} of {DAYS.length} · {formatTripDate(line.date)} · based at{' '}
        {base.name}
      </p>

      {/* Job one: what should we do now. It goes above everything else. */}
      <div className="mt-5 px-gutter">
        <Advisor now={now} from={location.origin.point} />
      </div>

      <div className="mt-3 px-gutter">
        <LocationBar location={location} compact />
      </div>

      <SectionHeading>The rest of today</SectionHeading>
      <div className="px-gutter">
        <RestOfDayCard now={now} from={location.origin.point} day={line.id} />
      </div>

      <UpNext now={now} from={location.origin.point} />

      <NearestStrip from={location.origin.point} now={now} label={location.origin.label} />

      <SectionHeading>Prayer</SectionHeading>
      <div className="px-gutter">
        <PrayerCard now={now} from={location.origin.point} />
      </div>

      <SectionHeading>Today’s meals</SectionHeading>
      <DayMenu day={line.id} from={location.origin.point} />

      <div className="px-gutter pt-6">
        <Link href={`/days/${line.id}`} className="btn-ghost w-full py-3 text-caption">
          Open day {line.id} in full
        </Link>
      </div>

      <DayComplete line={line.id} />
    </>
  );
}

function AfterTheTrip(): JSX.Element {
  return (
    <div className="px-gutter">
      <Card className="p-4">
        <p className="font-semibold">That was the trip.</p>
        <p className="mt-2 text-caption leading-relaxed text-muted">
          Five days, {MAP_PLACES.length} places, one hotel move. Everything is
          still here to look back at.
        </p>
      </Card>
    </div>
  );
}
