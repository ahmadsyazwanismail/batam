'use client';

import { restOfToday } from '@/lib/spend';
import { useHydrated, useTrip } from '@/lib/store';
import type { LatLon } from '@/lib/geo';
import type { DayId } from '@/data/trip';

const myr = (n: number): string => n.toLocaleString('en-MY');

/**
 * What the rest of today costs from where you are standing.
 *
 * Recalculates as you move, because the Grab legs are measured from your
 * actual position. No per-restaurant prices — those do not exist in the data,
 * and inventing them would be worse than a range.
 */
export function RestOfDayCard({
  now,
  from,
  day,
}: {
  now: Date;
  from: LatLon;
  day: DayId;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();
  const rest = restOfToday(now, from, hydrated ? done : [], day);

  if (rest.empty) {
    return (
      <div className="rounded-md border border-hairline border-rule bg-card p-4">
        <p className="eyebrow">From here</p>
        <p className="mt-2 text-lede font-semibold">Nothing left to pay for today.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-md border bg-card p-4"
      style={{ borderColor: 'var(--accent)' }}
    >
      <p className="eyebrow" style={{ color: 'var(--accent)' }}>
        Rest of today, from where you are
      </p>
      <p
        className="signboard numeric mt-1.5 text-display leading-none"
        style={{ color: 'var(--accent)' }}
      >
        RM {myr(rest.lowMYR)}–{myr(rest.highMYR)}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {rest.lines.map((line) => (
          <li
            key={line.label}
            className="flex items-baseline justify-between gap-3 text-caption"
          >
            <span className="min-w-0 text-muted">
              {line.label}
              {line.detail ? <span className="text-muted"> · {line.detail}</span> : null}
            </span>
            <span className="numeric shrink-0 font-semibold">
              {line.lowMYR === line.highMYR
                ? `RM ${myr(line.lowMYR)}`
                : `RM ${myr(line.lowMYR)}–${myr(line.highMYR)}`}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-eyebrow leading-relaxed text-muted">
        Grab fares are measured from your position and change as you move.
        {rest.surge ? ' Maulid Nabi adds about 20% today.' : ''} Meals are a range
        per head — there are no per-restaurant prices in the data, and a made-up
        one would be worse than a range.
      </p>
    </div>
  );
}
