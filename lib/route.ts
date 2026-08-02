import {
  BOOKINGS,
  FERRY,
  DAYS,
  MAP_PLACES,
  getPlace,
  dayById,
  requirePlace,
  type DayId,
  type MinutesOfDay,
  type Place,
} from '@/data/trip';
import { haversineKm } from './geo';
import { formatMinutes } from './time';

/**
 * The running order for a day, as a strip map reads it.
 *
 * There are no per-place times in the trip data and none are invented here.
 * What this builds is a *sequence*: where the day starts, a sensible route
 * through the stations, and where it ends. The only clock times that ever
 * appear are the real ones — the ferry, and published opening hours.
 */

export interface FixedTime {
  /** "Lands 10:00", "From 12:30", "Bags 15:30–16:30". */
  readonly label: string;
  /** For ordering. The moment the constraint starts to bite. */
  readonly minutes: MinutesOfDay;
}

export interface Station {
  readonly place: Place;
  /** 1-based position in the day. */
  readonly index: number;
  /** Hotels and the ferry terminal — the points where a day changes hands. */
  readonly interchange: boolean;
  readonly terminus: 'start' | 'end' | null;
  /** Straight-line km from the previous station, null for the first. */
  readonly fromPreviousKm: number | null;
  readonly fixedTime?: FixedTime;
  /**
   * Why this station opens or closes the day: "Ferry in", "Check out", "Base",
   * "Ferry home". Only ever on a terminus.
   */
  readonly connection?: string;
}

/** Anything from midday onward gets routed into the back half of the day. */
const AFTERNOON = 12 * 60;

/** How far off a straight line a stop can sit and still count as "on the way". */
const DETOUR_TOLERANCE = 1.25;

/**
 * Where the day starts.
 *
 * Derived from the ferry and the bookings, in that order of precedence: a
 * ferry that lands today beats a hotel you check out of today, which beats the
 * hotel you simply woke up in.
 *
 * The last of those is why the Radisson opens days three and four even though
 * it belongs to line 2 — that is exactly what an interchange is, and a day
 * that starts nowhere is not a running order.
 */
function openingConnection(lineId: DayId): { place: Place; note: string } {
  const line = dayById(lineId);

  const arriving = FERRY.legs.find((leg) => leg.date === line.date && leg.arrives);
  if (arriving) {
    const terminal = getPlace('ferry');
    if (terminal) return { place: terminal, note: 'Ferry in' };
  }

  const checkingOut = BOOKINGS.find((b) => b.checkOut === line.date);
  if (checkingOut) {
    const hotel = getPlace(checkingOut.hotel);
    if (hotel) return { place: hotel, note: 'Check out' };
  }

  return { place: requirePlace(line.base), note: 'Base' };
}

/** Where the day ends. Only the ferry home qualifies. */
function closingConnection(lineId: DayId): { place: Place; note: string } | null {
  const line = dayById(lineId);
  const leaving = FERRY.legs.find((leg) => leg.date === line.date && !leg.arrives);
  if (!leaving) return null;
  const terminal = getPlace('ferry');
  return terminal ? { place: terminal, note: 'Ferry home' } : null;
}

function fixedTimeFor(place: Place, lineId: DayId): FixedTime | undefined {
  const line = dayById(lineId);

  if (place.key === 'ferry') {
    const arriving = FERRY.legs.find((l) => l.date === line.date && l.arrives);
    if (arriving?.arrives) {
      return {
        label: `Lands ${arriving.arrives}`,
        minutes: Number(arriving.arrives.slice(0, 2)) * 60,
      };
    }
    const leaving = FERRY.legs.find((l) => l.date === line.date && !l.arrives);
    if (leaving) {
      return {
        label: `Bags ${formatMinutes(FERRY.checkIn.opens)}–${formatMinutes(
          FERRY.checkIn.closes ?? FERRY.checkIn.opens,
        )} · sails ${leaving.departs}`,
        minutes: FERRY.checkIn.opens,
      };
    }
  }

  if (place.opening) {
    const { opens, closes } = place.opening;
    return {
      label:
        closes === undefined
          ? `From ${formatMinutes(opens)}`
          : `${formatMinutes(opens)}–${formatMinutes(closes)}`,
      minutes: opens,
    };
  }

  return undefined;
}

/**
 * Greedy nearest-neighbour from an anchor.
 *
 * Not the optimal tour, and it does not need to be — it is a reading order for
 * a strip map, and the useful property is that consecutive stations are near
 * each other rather than bouncing across the island.
 */
function nearestNeighbour(places: readonly Place[], anchor: Place): Place[] {
  const remaining = [...places];
  const ordered: Place[] = [];
  let current = anchor;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestKm = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const km = haversineKm(current, remaining[i]!);
      if (km < bestKm) {
        bestKm = km;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next!);
    current = next!;
  }

  return ordered;
}

const isInterchange = (place: Place): boolean =>
  place.category === 'hotel' || place.category === 'ferry';

export function runningOrder(lineId: DayId): Station[] {
  const opening = openingConnection(lineId);
  const closing = closingConnection(lineId);

  // Mall tenants are contents, not stops — you walk into one building.
  const own = MAP_PLACES.filter((p) => p.day === lineId);

  // On a check-in day you drop the bags before you do anything else, so the
  // hotel being checked into today comes straight after the opening station.
  const checkingIn = BOOKINGS.find((b) => b.checkIn === dayById(lineId).date);
  const arrival =
    checkingIn && checkingIn.hotel !== opening.place.key
      ? own.find((p) => p.key === checkingIn.hotel)
      : undefined;

  // …with one exception: a landmark you cross on the way there. Barelang
  // Bridges are on the road down to the Harris and its own note says
  // "crossed on the drive down" — you do not drive past them and come back.
  // Only `land` qualifies. A mall on roughly the same road is still a
  // detour when you are carrying four bags and a toddler.
  const enRoute = arrival
    ? own.filter(
        (p) =>
          p.category === 'land' &&
          p.key !== opening.place.key &&
          haversineKm(opening.place, p) + haversineKm(p, arrival) <=
            haversineKm(opening.place, arrival) * DETOUR_TOLERANCE,
      )
    : [];

  const skip = new Set([
    opening.place.key,
    closing?.place.key,
    arrival?.key,
    ...enRoute.map((p) => p.key),
  ]);
  const toRoute = own.filter((p) => !skip.has(p.key));

  // Split before routing, not after: a place that is shut until the afternoon
  // belongs in the back half of the day, and routing each half as its own
  // chain keeps both halves geographically tidy. Pink Beach is why — it is
  // shut until 12:30 and can never open a day however near it happens to be.
  const anchor = arrival ?? opening.place;
  const morning = nearestNeighbour(
    toRoute.filter((p) => (p.opening?.opens ?? 0) < AFTERNOON),
    anchor,
  );
  const afternoon = nearestNeighbour(
    toRoute.filter((p) => (p.opening?.opens ?? 0) >= AFTERNOON),
    morning[morning.length - 1] ?? anchor,
  );

  const sequence: { place: Place; connection?: string }[] = [
    { place: opening.place, connection: opening.note },
    ...nearestNeighbour(enRoute, opening.place).map((place) => ({ place })),
    ...(arrival ? [{ place: arrival }] : []),
    ...[...morning, ...afternoon].map((place) => ({ place })),
    ...(closing ? [{ place: closing.place, connection: closing.note }] : []),
  ];

  return sequence.map((entry, i) => {
    const previous = sequence[i - 1]?.place;
    return {
      place: entry.place,
      index: i + 1,
      interchange: isInterchange(entry.place),
      terminus: i === 0 ? 'start' : i === sequence.length - 1 ? 'end' : null,
      fromPreviousKm: previous ? haversineKm(previous, entry.place) : null,
      fixedTime: fixedTimeFor(entry.place, lineId),
      ...(entry.connection ? { connection: entry.connection } : {}),
    } satisfies Station;
  });
}

/** Every day's order, for the Today screen and the advisor. */
export function allRunningOrders(): Record<DayId, Station[]> {
  const out = {} as Record<DayId, Station[]>;
  for (const line of DAYS) out[line.id] = runningOrder(line.id);
  return out;
}
