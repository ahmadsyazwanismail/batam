import { COSTS, HOLIDAY_DATE, type DayId, type Place } from '@/data/trip';
import { grabFare, haversineKm, MAX_WALK_KM, type LatLon } from './geo';
import { dayMenu } from './meals';
import { runningOrder } from './route';
import { wibDate, wibMinutes } from './time';
import { MEALS } from './meals';

/**
 * What the rest of today costs, from where you are standing.
 *
 * Everything here is either measured or already in the trip data. Nothing
 * invents a price for a named restaurant — those numbers do not exist, and a
 * confident "RM 45 for two" on every card would be worse than saying nothing.
 * Food is a range per head per course, which is what the RM 400–700 estimate
 * already was, divided by meals rather than pretending to know the menu.
 */

/** The trip's own food estimate, spread over 5 days × 4 courses × 3 people. */
const FOOD_LOW_PER_HEAD = 12;
const FOOD_HIGH_PER_HEAD = 22;
const HEADS = 3;

export interface SpendLine {
  readonly label: string;
  readonly lowMYR: number;
  readonly highMYR: number;
  readonly detail?: string;
}

export interface RestOfDay {
  readonly lines: readonly SpendLine[];
  readonly lowMYR: number;
  readonly highMYR: number;
  /** True on 25 August, when Grab is dearer. */
  readonly surge: boolean;
  /** Nothing left to pay for today. */
  readonly empty: boolean;
}

/** Entry fees, only where one was actually recorded. Pink Beach says "~RM12 pax". */
function entryFee(place: Place): { lowMYR: number; highMYR: number } | null {
  const match = /~?RM\s*(\d+)\s*pax/i.exec(place.note);
  if (!match) return null;
  const perHead = Number(match[1]);
  // Two adults. A one-year-old does not pay an entry fee.
  return { lowMYR: perHead * 2, highMYR: perHead * 2 };
}

export function restOfToday(
  now: Date,
  from: LatLon,
  done: readonly string[],
  day: DayId,
): RestOfDay {
  const today = wibDate(now);
  const minutes = wibMinutes(now);
  const surge = today === HOLIDAY_DATE;

  const doneSet = new Set(done);
  const stations = runningOrder(day).filter(
    (s) =>
      !doneSet.has(s.place.key) &&
      s.place.category !== 'hotel' &&
      s.place.category !== 'ferry',
  );

  const lines: SpendLine[] = [];

  // --- getting about -------------------------------------------------------
  // Walk the remaining stops in order from where you are. Anything inside the
  // walking threshold costs nothing, because you would walk it.
  let cursor: LatLon = from;
  let rideKm = 0;
  let rides = 0;
  for (const station of stations) {
    const km = haversineKm(cursor, station.place);
    if (km > MAX_WALK_KM) {
      rideKm += km;
      rides += 1;
    }
    cursor = { lat: station.place.lat, lon: station.place.lon };
  }
  if (rides > 0) {
    const fare = grabFare(rideKm / rides, today);
    lines.push({
      label: `${rides} ${rides === 1 ? 'Grab' : 'Grabs'}`,
      lowMYR: fare.lowMYR * rides,
      highMYR: fare.highMYR * rides,
      detail: `${rideKm.toFixed(1)} km in total${surge ? ' · holiday surge' : ''}`,
    });
  }

  // --- meals still to come -------------------------------------------------
  const menu = dayMenu(day);
  const remainingCourses = menu.courses.filter(
    (c) => c.meal.to > minutes && c.places.some((p) => !doneSet.has(p.place.key)),
  );
  if (remainingCourses.length > 0) {
    lines.push({
      label: `${remainingCourses.length} ${
        remainingCourses.length === 1 ? 'meal' : 'meals'
      }`,
      lowMYR: remainingCourses.length * FOOD_LOW_PER_HEAD * HEADS,
      highMYR: remainingCourses.length * FOOD_HIGH_PER_HEAD * HEADS,
      detail: remainingCourses.map((c) => c.meal.name.toLowerCase()).join(', '),
    });
  }

  // --- anything with a recorded entry fee ----------------------------------
  for (const station of stations) {
    const fee = entryFee(station.place);
    if (!fee) continue;
    lines.push({
      label: station.place.name,
      lowMYR: fee.lowMYR,
      highMYR: fee.highMYR,
      detail: 'entry, two adults',
    });
  }

  return {
    lines,
    lowMYR: lines.reduce((n, l) => n + l.lowMYR, 0),
    highMYR: lines.reduce((n, l) => n + l.highMYR, 0),
    surge,
    empty: lines.length === 0,
  };
}

/** The whole trip's on-the-day budget, for the progress bar. */
export const ON_THE_DAY_LOW = COSTS.onTheDay.reduce((n, r) => n + r.lowMYR, 0);
export const ON_THE_DAY_HIGH = COSTS.onTheDay.reduce((n, r) => n + r.highMYR, 0);

/** Sanity: the per-course range should land inside the trip's own food estimate. */
export const FOOD_ESTIMATE = {
  perHeadLow: FOOD_LOW_PER_HEAD,
  perHeadHigh: FOOD_HIGH_PER_HEAD,
  heads: HEADS,
  coursesPerDay: MEALS.length,
};
