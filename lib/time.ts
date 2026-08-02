import { DAYS, TRIP, type Day, type MinutesOfDay, type OpeningHours } from '@/data/trip';

/**
 * Batam time.
 *
 * The phone will be on Malaysian time for most of this trip — it roams onto an
 * Indonesian network and may or may not shift. So nothing here reads the
 * device's timezone. Every clock in the app is computed from the UTC instant
 * and a fixed +7 offset, and is labelled WIB.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** The same instant, shifted so that UTC getters read as WIB wall-clock. */
function shifted(now: Date, offsetHours: number): Date {
  return new Date(now.getTime() + offsetHours * HOUR_MS);
}

export function wibDate(now: Date = new Date()): string {
  return shifted(now, TRIP.tzOffsetHours).toISOString().slice(0, 10);
}

export function wibMinutes(now: Date = new Date()): MinutesOfDay {
  const d = shifted(now, TRIP.tzOffsetHours);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** "14:05" */
export function formatMinutes(minutes: MinutesOfDay): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function wibClock(now: Date = new Date()): string {
  return formatMinutes(wibMinutes(now));
}

/** The same wall-clock moment back home, one hour ahead. */
export function mytClock(now: Date = new Date()): string {
  const d = shifted(now, TRIP.homeTzOffsetHours);
  return formatMinutes(d.getUTCHours() * 60 + d.getUTCMinutes());
}

export function parseHhmm(hhmm: string): MinutesOfDay {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m ?? 0);
}

// ---------------------------------------------------------------------------
// Where in the trip are we?
// ---------------------------------------------------------------------------

export type TripPhase =
  | { readonly phase: 'before'; readonly daysUntil: number; readonly firstDay: Day }
  | { readonly phase: 'during'; readonly day: Day; readonly dayNumber: number }
  | { readonly phase: 'after'; readonly lastDay: Day };

function midnightUtc(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

export function tripPhase(now: Date = new Date()): TripPhase {
  const today = wibDate(now);
  const firstDay = DAYS[0]!;
  const lastDay = DAYS[DAYS.length - 1]!;

  if (today < TRIP.startDate) {
    const daysUntil = Math.round(
      (midnightUtc(TRIP.startDate) - midnightUtc(today)) / DAY_MS,
    );
    return { phase: 'before', daysUntil, firstDay };
  }
  if (today > TRIP.endDate) {
    return { phase: 'after', lastDay };
  }

  const index = DAYS.findIndex((l) => l.date === today);
  const day = DAYS[index] ?? firstDay;
  return { phase: 'during', day, dayNumber: index + 1 };
}

/** The line whose colour the app should be wearing right now. */
export function activeDay(now: Date = new Date()): Day {
  const phase = tripPhase(now);
  if (phase.phase === 'during') return phase.day;
  if (phase.phase === 'before') return phase.firstDay;
  return phase.lastDay;
}

export function isOpenAt(
  opening: OpeningHours | undefined,
  minutes: MinutesOfDay,
): boolean {
  // No hours recorded means we do not know, and pretending otherwise would
  // send someone across town to a shutter.
  if (!opening) return true;
  if (minutes < opening.opens) return false;
  // A missing closing time means it was never given, not that it never shuts.
  return opening.closes === undefined || minutes < opening.closes;
}

/** "09:00–18:00", or "from 12:30" when only the opening time is known. */
export function formatOpening(opening: OpeningHours): string {
  return opening.closes === undefined
    ? `from ${formatMinutes(opening.opens)}`
    : `${formatMinutes(opening.opens)}–${formatMinutes(opening.closes)}`;
}

/** "Fri 21 Aug" */
export function formatTripDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${weekday} ${day} ${month}`;
}
