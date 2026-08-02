'use client';

import { DAYS, TRIP } from '@/data/trip';
import { formatTripDate } from '@/lib/time';

/**
 * Transit signage: the number is the whole point, so it is set as large as the
 * column allows and everything else gets out of its way.
 */
export function Countdown({ days }: { days: number }): JSX.Element {
  return (
    <div className="rounded-md border border-hairline border-rule bg-card p-5">
      <p className="eyebrow">Departure in</p>
      <p className="numeric mt-2 flex items-baseline gap-3">
        <span
          className="signboard text-display-lg"
          style={{ color: 'var(--accent)' }}
        >
          {days}
        </span>
        <span className="text-[1.125rem] font-semibold text-muted">
          {days === 1 ? 'day' : 'days'}
        </span>
      </p>
      <p className="mt-3 text-caption text-muted">
        {formatTripDate(TRIP.startDate)} to {formatTripDate(TRIP.endDate)} ·{' '}
        {DAYS.length} days · {TRIP.travellers}
      </p>
    </div>
  );
}
