import type { LatLon } from './geo';

/**
 * Looking a place up by name.
 *
 * The app is offline-first and has no backend, so this is the one thing it
 * genuinely cannot do on its own — a name is not a coordinate, and turning one
 * into the other needs somebody's index of the world. Nominatim is
 * OpenStreetMap's own geocoder: free, no key, no account, and usable from a
 * browser. The trade is coverage. OSM knows the malls, the hotels, the ferry
 * terminal and the mosques; it very often does not know the warung that opened
 * last year, which is exactly the sort of place you would be adding. So this is
 * offered as one route among four, never as the way in, and the empty result
 * says plainly that the other three still work.
 *
 * Nominatim's usage policy caps this at one request a second and forbids bulk
 * use. That is why there is no search-as-you-type here: you press a button, and
 * {@link MIN_GAP_MS} refuses to send a second request too soon after the first.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/**
 * The island, as a bounding box. Nominatim treats this as a preference rather
 * than a filter, so "Ranah Minang" finds the Batam one first without making a
 * place in Johor unfindable — the ferry does leave from there.
 */
const VIEWBOX = '103.94,0.95,104.09,1.19';

/** Roughly the middle of the island, for "is this result even near us". */
const BATAM: LatLon = { lat: 1.1301, lon: 104.0529 };

/** A result this far from Batam is not what you meant, but may still be right. */
const NEAR_KM = 60;

/** Nominatim asks for no more than one request a second. This honours it. */
export const MIN_GAP_MS = 1100;

export interface GeocodeHit {
  /** The name itself: "Nagoya Hill Shopping Mall". */
  readonly name: string;
  /** Where it is: "Lubuk Baja, Batam, Kepulauan Riau". Possibly empty. */
  readonly detail: string;
  readonly lat: number;
  readonly lon: number;
  /** True when it is on or near the island — the list puts these first. */
  readonly nearby: boolean;
}

export type GeocodeResult =
  | { readonly ok: true; readonly hits: readonly GeocodeHit[] }
  | { readonly ok: false; readonly reason: string };

/** One row of Nominatim's `jsonv2`, as much of it as is used. */
interface RawHit {
  readonly lat?: string;
  readonly lon?: string;
  readonly name?: string;
  readonly display_name?: string;
}

export function buildUrl(query: string, limit = 6): string {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: String(limit),
    'accept-language': 'en',
    viewbox: VIEWBOX,
    // Bias, not filter. `bounded=1` would make anywhere off the island
    // unfindable, and the trip starts in Malaysia.
    bounded: '0',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

function kmApart(a: LatLon, b: LatLon): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Splits Nominatim's one long comma-separated string into a name and a place.
 *
 * `display_name` is the full chain — "Nagoya Hill Shopping Mall, Jalan Teuku
 * Umar, Lubuk Baja, Batam, Kepulauan Riau, 29444, Indonesia" — which is too
 * long for a row and repeats the country on every result. Three segments after
 * the name is enough to tell two same-named places apart.
 */
function split(raw: RawHit): { name: string; detail: string } {
  const chain = (raw.display_name ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const name = raw.name?.trim() || chain[0] || 'Unnamed place';
  const rest = chain[0] === name ? chain.slice(1) : chain;
  return { name, detail: rest.slice(0, 3).join(', ') };
}

/**
 * Turns the raw response into rows, nearest-to-the-trip first.
 *
 * Nominatim orders by its own importance score, which is global: searching
 * "Sederhana" ranks a big place in Java above a small one on Batam. Anything
 * within {@link NEAR_KM} is promoted, and the service's ordering is kept inside
 * each group rather than being replaced by distance — importance is still the
 * better signal once you are on the right island.
 */
export function parseHits(payload: unknown): readonly GeocodeHit[] {
  if (!Array.isArray(payload)) return [];

  const hits: GeocodeHit[] = [];
  for (const raw of payload as RawHit[]) {
    const lat = Number(raw?.lat);
    const lon = Number(raw?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const { name, detail } = split(raw);
    // Two entries for the same building — a node and its way — land within a
    // few metres of each other and read as a duplicate.
    if (hits.some((h) => h.name === name && kmApart(h, { lat, lon }) < 0.05)) continue;

    hits.push({ name, detail, lat, lon, nearby: kmApart(BATAM, { lat, lon }) <= NEAR_KM });
  }

  return [...hits.filter((h) => h.nearby), ...hits.filter((h) => !h.nearby)];
}

/** Maps a failure onto something worth reading, with a way forward in it. */
export function reasonFor(kind: 'offline' | 'busy' | 'unreachable' | 'broken'): string {
  switch (kind) {
    case 'offline':
      return 'Looking a name up needs a connection — it is the one part of this app that does. Paste a link or drop a pin instead; both work with no signal.';
    case 'busy':
      return 'The free lookup service is rate-limiting us. Give it a few seconds, or paste a link instead.';
    case 'unreachable':
      return 'Could not reach the lookup service. Paste a Maps link or drop a pin instead.';
    case 'broken':
      return 'The lookup service sent something unreadable. Paste a Maps link or drop a pin instead.';
  }
}

let lastCallAt = 0;

/** Exposed so tests can run without waiting out the real gap. */
export function resetRateLimit(): void {
  lastCallAt = 0;
}

/**
 * Runs the search. Rejects nothing — every failure comes back as `ok: false`
 * with something to read, because a thrown error inside a form is a blank box.
 */
export async function searchByName(
  query: string,
  options: { signal?: AbortSignal; now?: () => number; fetcher?: typeof fetch } = {},
): Promise<GeocodeResult> {
  const q = query.trim();
  if (q.length < 3) {
    return { ok: false, reason: 'Type a bit more of the name first.' };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: reasonFor('offline') };
  }

  const now = options.now ?? Date.now;
  const since = now() - lastCallAt;
  if (lastCallAt !== 0 && since < MIN_GAP_MS) {
    return { ok: false, reason: reasonFor('busy') };
  }
  lastCallAt = now();

  const doFetch = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await doFetch(buildUrl(q), {
      signal: options.signal ?? null,
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { ok: false, reason: reasonFor('unreachable') };
  }

  if (response.status === 429 || response.status === 503) {
    return { ok: false, reason: reasonFor('busy') };
  }
  if (!response.ok) {
    return { ok: false, reason: reasonFor('unreachable') };
  }

  try {
    return { ok: true, hits: parseHits(await response.json()) };
  } catch {
    return { ok: false, reason: reasonFor('broken') };
  }
}

/** OpenStreetMap's licence requires the credit. It goes under the results. */
export const ATTRIBUTION = 'Results from OpenStreetMap';
