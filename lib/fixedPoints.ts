import {
  BOOKINGS,
  FERRY,
  TRIP,
  dayById,
  type DayId,
  type MinutesOfDay,
} from '@/data/trip';
import { formatMinutes, parseHhmm } from './time';

/**
 * The things on a day that are not up to you.
 *
 * Arrival and departure days have almost no food on them — you are on a boat
 * until ten on the 21st and back on one at five on the 25th — so a page that
 * only knows about meals shows those two days as four empty courses. These are
 * the events that actually fill them, and every one is read straight off the
 * ferry booking or the hotel booking. Where no time was booked (hotel check-in
 * and check-out never had one recorded) there is no time here either.
 */

export interface FixedPoint {
  /** WIB, for ordering. Absent where no time was ever recorded. */
  readonly at?: MinutesOfDay;
  /** As it should be read, with its zone. */
  readonly clock?: string;
  readonly label: string;
  readonly detail?: string;
}

/** Malaysia is one hour ahead of Batam. */
function mytToWib(minutes: MinutesOfDay): MinutesOfDay {
  return minutes - (TRIP.homeTzOffsetHours - TRIP.tzOffsetHours) * 60;
}

export function fixedPoints(day: DayId): readonly FixedPoint[] {
  const date = dayById(day).date;

  const checkOut: FixedPoint[] = [];
  const timed: FixedPoint[] = [];
  const checkIn: FixedPoint[] = [];

  for (const booking of BOOKINGS) {
    if (booking.checkOut === date) {
      checkOut.push({
        label: `Check out of ${booking.hotelName}`,
        detail: 'no time booked — ask at the desk',
      });
    }
    if (booking.checkIn === date) {
      checkIn.push({ label: `Check in at ${booking.hotelName}`, detail: booking.room });
    }
  }

  for (const leg of FERRY.legs) {
    if (leg.date !== date) continue;

    const departs = parseHhmm(leg.departs);
    timed.push({
      at: leg.departsZone === 'MYT' ? mytToWib(departs) : departs,
      // Shown in its own zone — the booking says nine o'clock Malaysian time,
      // and rewriting that into WIB is how people miss boats.
      clock: `${formatMinutes(departs)} ${leg.departsZone}`,
      label: `Ferry leaves ${leg.from.split(',')[0]}`,
      detail: FERRY.operator,
    });

    if (leg.arrives !== undefined) {
      timed.push({
        at: parseHhmm(leg.arrives),
        clock: `${formatMinutes(parseHhmm(leg.arrives))} ${leg.arrivesZone ?? 'WIB'}`,
        label: `Lands at ${leg.to.split(',')[0]}`,
        detail: 'camera collected here on arrival',
      });
    } else {
      // The sailing home is the one you cannot be late for, so its bag window
      // belongs on the day too.
      timed.push({
        at: FERRY.checkIn.opens,
        clock:
          FERRY.checkIn.closes === undefined
            ? `${formatMinutes(FERRY.checkIn.opens)} WIB`
            : `${formatMinutes(FERRY.checkIn.opens)}–${formatMinutes(FERRY.checkIn.closes)}`,
        label: 'Bag drop for the ferry home',
        detail: FERRY.baggage,
      });
    }
  }

  timed.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  return [...checkOut, ...timed, ...checkIn];
}
