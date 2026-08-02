import { HOLIDAY_DATE, MAP_PLACES, type Place } from '@/data/trip';

export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance in kilometres.
 *
 * Batam is small enough that a flat approximation would do, but haversine is
 * cheap and does not fall over when someone opens the app in Johor.
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** One decimal, always — "0.8 km", "12.0 km". */
export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// Is the phone anywhere near the trip?
// ---------------------------------------------------------------------------

/**
 * The centre of the trip, taken as the mean of every pinned place rather than
 * a made-up "Batam" coordinate.
 */
export const BATAM_ANCHOR: LatLon = (() => {
  const n = MAP_PLACES.length;
  let lat = 0;
  let lon = 0;
  for (const p of MAP_PLACES) {
    lat += p.lat;
    lon += p.lon;
  }
  return { lat: lat / n, lon: lon / n };
})();

/**
 * Past this, a live distance is worse than useless — "412 km away" tells you
 * nothing you want to know, so the app falls back to hotel-relative distances.
 *
 * Note the one soft spot: Puteri Harbour, where the trip starts, is about
 * 51 km from the anchor and so passes this test. A distance from there is real
 * but not actionable — it crosses a strait. The location screen handles that
 * case separately rather than by widening the radius.
 */
export const BATAM_RADIUS_KM = 60;

export function isInBatam(pos: LatLon): boolean {
  return haversineKm(pos, BATAM_ANCHOR) <= BATAM_RADIUS_KM;
}

// ---------------------------------------------------------------------------
// Grab fares
// ---------------------------------------------------------------------------

const GRAB_BASE_MYR = 4;
const GRAB_PER_KM_MYR = 1.6;
const GRAB_FLOOR_MYR = 5;
/** Maulid Nabi makes it a long weekend for Indonesia too. */
export const HOLIDAY_SURGE = 1.2;

export interface GrabFare {
  readonly lowMYR: number;
  readonly highMYR: number;
  readonly surge: boolean;
  /** "RM 8–11" */
  readonly text: string;
}

/**
 * A rough Grab fare. Deliberately a range: the point estimate is a straight
 * line through a handful of real fares, and quoting it to the ringgit would be
 * pretending to a precision nobody has.
 *
 * @param isoDate the day of travel, so the holiday surge can be applied
 */
export function grabFare(km: number, isoDate?: string): GrabFare {
  const surge = isoDate === HOLIDAY_DATE;
  const point =
    Math.max(GRAB_FLOOR_MYR, GRAB_BASE_MYR + GRAB_PER_KM_MYR * Math.max(0, km)) *
    (surge ? HOLIDAY_SURGE : 1);

  const lowMYR = Math.max(GRAB_FLOOR_MYR, Math.floor(point));
  const highMYR = Math.max(lowMYR + 2, Math.ceil(point * 1.25));

  return { lowMYR, highMYR, surge, text: `RM ${lowMYR}–${highMYR}` };
}

// ---------------------------------------------------------------------------
// Distance, in words
// ---------------------------------------------------------------------------

/** Pushing a stroller, not striding. */
export const WALK_KMH = 4.3;
export const EASY_WALK_KM = 0.55;
export const MAX_WALK_KM = 1.2;

export type Verdict =
  | { readonly mode: 'walk'; readonly text: string }
  | { readonly mode: 'walk'; readonly minutes: number; readonly text: string }
  | { readonly mode: 'grab'; readonly fare: GrabFare; readonly text: string };

export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / WALK_KMH) * 60));
}

/**
 * The number is not the useful part. "0.9 km" makes you do arithmetic in the
 * heat; "about 13 minutes on foot" does not.
 */
export function distanceVerdict(km: number, isoDate?: string): Verdict {
  if (km < EASY_WALK_KM) {
    return { mode: 'walk', text: 'an easy walk' };
  }
  if (km <= MAX_WALK_KM) {
    const minutes = walkMinutes(km);
    return { mode: 'walk', minutes, text: `about ${minutes} minutes on foot` };
  }
  const fare = grabFare(km, isoDate);
  return { mode: 'grab', fare, text: `take a Grab, ${fare.text}` };
}

// ---------------------------------------------------------------------------
// Nearest
// ---------------------------------------------------------------------------

export interface Nearby<T> {
  readonly item: T;
  readonly km: number;
  readonly verdict: Verdict;
}

export function withDistance<T extends LatLon>(
  items: readonly T[],
  from: LatLon,
  isoDate?: string,
): Nearby<T>[] {
  return items
    .map((item) => {
      const km = haversineKm(from, item);
      return { item, km, verdict: distanceVerdict(km, isoDate) };
    })
    .sort((a, b) => a.km - b.km);
}

export function nearest(
  places: readonly Place[],
  from: LatLon,
  count: number,
  isoDate?: string,
): Nearby<Place>[] {
  return withDistance(places, from, isoDate).slice(0, count);
}

/** Google Maps deep link. Works installed or in the browser, on both platforms. */
export function directionsUrl(place: LatLon & { name?: string }): string {
  const dest = `${place.lat},${place.lon}`;
  const params = new URLSearchParams({
    api: '1',
    destination: dest,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
