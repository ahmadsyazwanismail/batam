import type { LatLon } from './geo';

/**
 * Looking a place up by name, as you type, on Batam only.
 *
 * **Why Photon and not Nominatim.** The first version of this used
 * OpenStreetMap's own Nominatim behind a Search button, because Nominatim's
 * usage policy names auto-complete as a forbidden use: "you must not implement
 * such a service on top of the API". A debounce would not have made that
 * acceptable — it is a prohibition, not a rate limit. Photon is Komoot's
 * geocoder over the same OpenStreetMap data and is *built* for typeahead, so
 * search-as-you-type is what it is for rather than something smuggled past it.
 * Same data, same coverage, no key, no account.
 *
 * **Batam only.** Every query is bounded to {@link SEARCH_BOUNDS}, and the
 * results are filtered against the same box again on the way back. Doing it
 * twice is the point: the box in the request is a request, and the app promises
 * the user that nothing outside Batam can be picked. That promise should hold
 * even if the service ignores the parameter, changes its meaning, or is swapped
 * for another one.
 */

/**
 * Batam, as the search understands it: the main island, Rempang and the Galang
 * chain the Barelang bridges run down, plus Belakang Padang to the west.
 *
 * Wider than the map's own bounds, because the map frames the trip and this has
 * to be able to find somewhere the trip does not already go. Tight enough at the
 * top to exclude Singapore — Sentosa is at 1.249 and Nongsa, the northern tip of
 * Batam, is at 1.183 — and tight enough at the east to exclude Bintan.
 *
 * `geocode.test.ts` holds it to containing all 38 places in the trip data: if
 * the app's own list falls outside the box it searches, the box is wrong.
 */
export const SEARCH_BOUNDS = {
  minLon: 103.82,
  minLat: 0.7,
  maxLon: 104.2,
  maxLat: 1.21,
} as const;

/** Roughly the middle of the island. Photon scores nearer results higher. */
const CENTRE: LatLon = { lat: 1.0966, lon: 104.01 };

const ENDPOINT = 'https://photon.komoot.io/api/';

/**
 * How long to wait after the last keystroke.
 *
 * Long enough that typing "Nagoya Hill" is two or three requests rather than
 * eleven, short enough that the list feels like it is keeping up.
 */
export const DEBOUNCE_MS = 350;

/** Below this a query matches half the island and the list is noise. */
export const MIN_QUERY = 3;

export interface GeocodeHit {
  /** The name itself: "Nagoya Hill Shopping Mall". */
  readonly name: string;
  /** Where it is: "Jalan Teuku Umar, Lubuk Baja, Batam". Possibly empty. */
  readonly detail: string;
  readonly lat: number;
  readonly lon: number;
}

export type GeocodeResult =
  | { readonly ok: true; readonly hits: readonly GeocodeHit[] }
  | { readonly ok: false; readonly reason: string }
  /** A newer keystroke replaced this one. The caller shows nothing. */
  | { readonly ok: false; readonly aborted: true; readonly reason: string };

export function inBatam(point: LatLon): boolean {
  return (
    point.lat >= SEARCH_BOUNDS.minLat &&
    point.lat <= SEARCH_BOUNDS.maxLat &&
    point.lon >= SEARCH_BOUNDS.minLon &&
    point.lon <= SEARCH_BOUNDS.maxLon
  );
}

export function buildUrl(query: string, limit = 8): string {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    lang: 'en',
    // Restrict, not merely prefer. The user asked to be sure they cannot pick
    // somewhere off the island by accident.
    bbox: `${SEARCH_BOUNDS.minLon},${SEARCH_BOUNDS.minLat},${SEARCH_BOUNDS.maxLon},${SEARCH_BOUNDS.maxLat}`,
    // Within the box, nearer to the middle of Batam scores higher.
    lat: String(CENTRE.lat),
    lon: String(CENTRE.lon),
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/** One Photon GeoJSON feature, as much of it as is used. */
interface Feature {
  readonly geometry?: { readonly coordinates?: unknown };
  readonly properties?: Record<string, unknown>;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Builds the line under the name.
 *
 * Street, then district, then city, deduplicated — Photon repeats the city as
 * the district on a lot of Batam entries, and "Batam, Batam" reads as a bug.
 */
function detailOf(props: Record<string, unknown>): string {
  const parts = [
    [text(props.housenumber), text(props.street)].filter(Boolean).join(' '),
    text(props.district),
    text(props.city),
  ].filter(Boolean);
  return [...new Set(parts)].slice(0, 3).join(', ');
}

/**
 * A name for a feature that has none.
 *
 * Photon returns address-only results — a house number on a street, no name.
 * Those are still a real point you might want, so they get called by their
 * street rather than dropped or shown blank.
 */
function nameOf(props: Record<string, unknown>): string {
  const name = text(props.name);
  if (name) return name;
  const street = [text(props.housenumber), text(props.street)].filter(Boolean).join(' ');
  return street || text(props.city) || 'Unnamed place';
}

export function parseHits(payload: unknown): readonly GeocodeHit[] {
  const features = (payload as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];

  const hits: GeocodeHit[] = [];
  for (const feature of features as Feature[]) {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    // GeoJSON is [lon, lat]. Getting this the wrong way round would put every
    // result in the Indian Ocean, so it is asserted in the tests.
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    // The second gate. See the note at the top: the promise is the app's, not
    // the service's.
    if (!inBatam({ lat, lon })) continue;

    const props = feature.properties ?? {};
    const name = nameOf(props);
    const detail = detailOf(props);

    // Photon returns a node and its building as two features metres apart.
    if (
      hits.some(
        (h) =>
          h.name === name &&
          Math.abs(h.lat - lat) < 0.0005 &&
          Math.abs(h.lon - lon) < 0.0005,
      )
    ) {
      continue;
    }

    hits.push({ name, detail, lat, lon });
  }
  return hits;
}

export function reasonFor(kind: 'offline' | 'busy' | 'unreachable' | 'broken'): string {
  switch (kind) {
    case 'offline':
      return 'Searching needs a connection — it is the one part of this app that does. Paste a link or drop a pin instead; both work with no signal.';
    case 'busy':
      return 'The free lookup service is rate-limiting us. Give it a few seconds, or paste a link instead.';
    case 'unreachable':
      return 'Could not reach the lookup service. Paste a Maps link or drop a pin instead.';
    case 'broken':
      return 'The lookup service sent something unreadable. Paste a Maps link or drop a pin instead.';
  }
}

const ABORTED: GeocodeResult = { ok: false, aborted: true, reason: '' };

/**
 * Runs one search. Never throws: a rejected promise inside a keystroke handler
 * is a form that silently stops responding.
 */
export async function searchByName(
  query: string,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<GeocodeResult> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return { ok: true, hits: [] };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: reasonFor('offline') };
  }

  const doFetch = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await doFetch(buildUrl(q), {
      signal: options.signal ?? null,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    // An abort is the normal case, not a failure: it means you kept typing.
    if (options.signal?.aborted || (error as Error)?.name === 'AbortError') return ABORTED;
    return { ok: false, reason: reasonFor('unreachable') };
  }

  if (options.signal?.aborted) return ABORTED;
  if (response.status === 429 || response.status === 503) {
    return { ok: false, reason: reasonFor('busy') };
  }
  if (!response.ok) return { ok: false, reason: reasonFor('unreachable') };

  try {
    return { ok: true, hits: parseHits(await response.json()) };
  } catch {
    if (options.signal?.aborted) return ABORTED;
    return { ok: false, reason: reasonFor('broken') };
  }
}

/** Photon's data is OpenStreetMap's, and its licence requires the credit. */
export const ATTRIBUTION = 'Batam only · OpenStreetMap';
