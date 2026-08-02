'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Screen, SectionHeading } from '@/components/Screen';
import { LineBadge } from '@/components/LineBadge';
import { Countdown } from '@/components/Countdown';
import { PackingList } from '@/components/PackingList';
import { requirePlace, FERRY, LINES, WARNINGS } from '@/data/trip';
import { formatTripDate, mytClock, tripPhase, wibClock, type TripPhase } from '@/lib/time';
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
      title={<TodayTitle phase={phase} />}
      trailing={<Clock now={now} />}
    >
      {phase.phase === 'before' && <BeforeTheTrip phase={phase} />}
      {phase.phase === 'during' && <DuringTheTrip phase={phase} />}
      {phase.phase === 'after' && <AfterTheTrip />}
    </Screen>
  );
}

function TodayTitle({ phase }: { phase: TripPhase }): JSX.Element {
  if (phase.phase === 'before') return <>Not yet</>;
  if (phase.phase === 'after') return <>Home</>;
  return <>{phase.line.name}</>;
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
}: {
  phase: Extract<TripPhase, { phase: 'before' }>;
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
    </>
  );
}

function DuringTheTrip({
  phase,
}: {
  phase: Extract<TripPhase, { phase: 'during' }>;
}): JSX.Element {
  const { line, dayNumber } = phase;
  const base = requirePlace(line.base);

  return (
    <>
      <div className="flex items-center gap-3 px-gutter">
        <LineBadge line={line.id} size="lg" shared />
        <div>
          <p className="eyebrow">
            Day {dayNumber} of {LINES.length} · {formatTripDate(line.date)}
          </p>
          <p className="mt-1 font-semibold">Based at {base.name}</p>
        </div>
      </div>

      <div className="mt-6 px-gutter">
        <Card className="p-4">
          <p className="eyebrow">Still to build</p>
          <p className="mt-2 text-caption leading-relaxed text-muted">
            The running order, the nearest-to-you strip and the advisor land in
            steps 3 to 7. The shell, the data and the clock are done.
          </p>
        </Card>
      </div>
    </>
  );
}

function AfterTheTrip(): JSX.Element {
  return (
    <div className="px-gutter">
      <Card className="p-4">
        <p className="font-semibold">That was the trip.</p>
        <p className="mt-2 text-caption leading-relaxed text-muted">
          Five lines, thirty-eight stations, one hotel move. Everything is still
          here to look back at.
        </p>
      </Card>
    </div>
  );
}
