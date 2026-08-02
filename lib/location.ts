import { LINES, TRIP, requirePlace, type Place } from '@/data/trip';
import { haversineKm, isInBatam, type LatLon } from './geo';
import { activeLine, parseHhmm, wibDate, wibMinutes } from './time';
import { FERRY } from '@/data/trip';

/**
 * Turning a raw browser position into something worth measuring from.
 *
 * The awkward cases are the point of this file. A distance is only useful once
 * you are actually on the island: standing at Puteri Harbour, "Renuin is 51 km
 * away" is true, useless, and quietly wrong, because the road it implies is a
 * ferry. So the app measures from the day's hotel until it is sure.
 */

export type Permission = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

export interface Fix {
  readonly point: LatLon;
  /** Metres, as reported by the browser. */
  readonly accuracy: number;
  /** Epoch ms. */
  readonly at: number;
}

/** Past this a fix is a memory, not a position. */
export const STALE_AFTER_MS = 5 * 60_000;

export type OriginKind = 'you' | 'hotel';

export interface Origin {
  readonly point: LatLon;
  readonly kind: OriginKind;
  /** "from you" / "from the Radisson" — goes next to the distances. */
  readonly label: string;
  /** Why it fell back to the hotel. Absent when measuring from you. */
  readonly reason?: string;
  readonly hotel: Place;
}

/**
 * Has the ferry landed?
 *
 * Derived from the ferry data rather than guessed: before 10:00 WIB on the
 * first day, they are on the boat or still in Johor, and the 60 km radius
 * cannot tell — Puteri Harbour sits inside it.
 */
export function hasLanded(now: Date): boolean {
  const today = wibDate(now);
  if (today < TRIP.startDate) return false;
  if (today > TRIP.startDate) return true;

  const arrival = FERRY.legs[0].arrives;
  return arrival ? wibMinutes(now) >= parseHhmm(arrival) : true;
}

/** The hotel distances fall back to: wherever they are sleeping that night. */
export function hotelFor(now: Date): Place {
  const today = wibDate(now);
  const line = LINES.find((l) => l.date === today) ?? activeLine(now);
  return requirePlace(line.base);
}

export function resolveOrigin(fix: Fix | null, now: Date = new Date()): Origin {
  const hotel = hotelFor(now);
  const fallback = (reason: string): Origin => ({
    // A bare point, not the Place — nothing downstream should be able to read
    // a name off the thing it is measuring from.
    point: { lat: hotel.lat, lon: hotel.lon },
    kind: 'hotel',
    label: `from ${hotel.name}`,
    reason,
    hotel,
  });

  if (!fix) {
    return fallback('Location is off, so distances are from your hotel.');
  }

  if (now.getTime() - fix.at > STALE_AFTER_MS) {
    return fallback('That position is a few minutes old, so distances are from your hotel.');
  }

  if (!hasLanded(now)) {
    return fallback(
      'The ferry has not landed yet, so distances are from your hotel rather than across the strait.',
    );
  }

  if (!isInBatam(fix.point)) {
    const km = Math.round(haversineKm(fix.point, hotel));
    return fallback(
      `You are about ${km} km from Batam, so distances are from your hotel instead.`,
    );
  }

  return { point: fix.point, kind: 'you', label: 'from you', hotel };
}
