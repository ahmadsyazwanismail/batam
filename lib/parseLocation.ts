import type { LatLon } from './geo';

/**
 * Turning whatever is on your clipboard into a point on the map.
 *
 * There is no backend and no geocoder, so the app cannot look up "that nice
 * seafood place near the bridge" by name. What it can do is read the thing you
 * already have when you find somewhere new: the Google Maps link. Every long
 * Maps URL carries the coordinates in it, and so do Apple Maps, Waze,
 * OpenStreetMap and a bare "1.1, 104.0" typed by hand.
 *
 * This is a pure string function on purpose — it runs offline, it is the part
 * most likely to meet a shape I have not seen, and it is the part worth having
 * tests for.
 */

export type LocationSource =
  | 'google-pin'
  | 'google-camera'
  | 'query'
  | 'apple'
  | 'waze'
  | 'osm'
  | 'geo'
  | 'typed';

export type LocationParse =
  | { readonly ok: true; readonly point: LatLon; readonly source: LocationSource }
  | { readonly ok: false; readonly reason: string };

/** Where the trip is, for the "that looks a long way off" check. */
const BATAM: LatLon = { lat: 1.1301, lon: 104.0529 };

/**
 * Malaysia and Singapore are both a short hop away and both plausible — the
 * ferry leaves from one of them. Anything beyond this is far more likely to be
 * a link to the wrong place than a genuine plan.
 */
const FAR_KM = 500;

const NUMBER = String.raw`[-+]?\d{1,3}(?:\.\d+)?`;
const PAIR = new RegExp(String.raw`(${NUMBER})\s*,\s*(${NUMBER})`);

/**
 * Google's own pin, from the data blob: `!3d<lat>!4d<lon>`.
 *
 * Worth preferring over the `@` in the same URL, which is where the *camera*
 * was — pan the map before copying the link and the two differ by streets.
 */
const GOOGLE_PIN = new RegExp(String.raw`!3d(${NUMBER})!4d(${NUMBER})`);
const GOOGLE_CAMERA = new RegExp(String.raw`@(${NUMBER}),(${NUMBER})`);
const OSM = new RegExp(String.raw`#map=[\d.]+/(${NUMBER})/(${NUMBER})`);
const GEO_URI = new RegExp(String.raw`^geo:(${NUMBER}),(${NUMBER})`, 'i');

/** `?q=`, `?query=`, `?destination=`, `?ll=`, `?sll=`, `?daddr=`, `?center=`. */
const PARAM = new RegExp(
  String.raw`[?&#](?:q|query|ll|sll|daddr|destination|center|mlat)=(${NUMBER})(?:,|%2C)(${NUMBER})`,
  'i',
);

/** A link that identifies a place but does not carry its coordinates. */
const SHORTENED = /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|bit\.ly|tinyurl\.com)/i;

function point(latText: string, lonText: string, source: LocationSource): LocationParse {
  const lat = Number(latText);
  const lon = Number(lonText);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, reason: 'Those are not numbers.' };
  }
  if (Math.abs(lat) > 90) {
    // Almost always a swapped pair: 104 is a longitude, and no latitude reaches it.
    return {
      ok: false,
      reason: `${lat} is not a latitude — it only goes up to 90. Latitude comes first, so around here it should start "1.".`,
    };
  }
  if (Math.abs(lon) > 180) {
    return { ok: false, reason: `${lon} is not a longitude — it only goes up to 180.` };
  }
  return { ok: true, point: { lat, lon }, source };
}

/**
 * Reads a point out of anything that has one in it.
 *
 * Ordered by how much the match can be trusted, not by how the string looks:
 * a Google URL contains both the pin and the camera, and the pin wins.
 */
export function parseLocation(input: string): LocationParse {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'Nothing pasted yet.' };

  const geo = GEO_URI.exec(text);
  if (geo) return point(geo[1]!, geo[2]!, 'geo');

  const pin = GOOGLE_PIN.exec(text);
  if (pin) return point(pin[1]!, pin[2]!, 'google-pin');

  const osm = OSM.exec(text);
  if (osm) return point(osm[1]!, osm[2]!, 'osm');

  const param = PARAM.exec(text);
  if (param) {
    const source: LocationSource = /apple/i.test(text)
      ? 'apple'
      : /waze/i.test(text)
        ? 'waze'
        : 'query';
    return point(param[1]!, param[2]!, source);
  }

  const camera = GOOGLE_CAMERA.exec(text);
  if (camera) return point(camera[1]!, camera[2]!, 'google-camera');

  // Only now consider a bare pair, and only when the whole string is one —
  // otherwise "…/data=!4m6!3m5!1s0x31d989…" starts yielding fragments of a hash.
  if (!/^https?:|^geo:/i.test(text)) {
    const bare = PAIR.exec(text);
    if (bare && text.replace(PAIR, '').trim().replace(/^[()]+|[()]+$/g, '') === '') {
      return point(bare[1]!, bare[2]!, 'typed');
    }
  }

  if (SHORTENED.test(text)) {
    return {
      ok: false,
      reason:
        'That is a shortened link — it names the place but does not carry its coordinates, and following it needs a connection. Open it in Maps first and copy the full link from the address bar, or use “Drop a pin” instead.',
    };
  }

  if (/^https?:/i.test(text)) {
    return {
      ok: false,
      reason:
        'No coordinates in that link. In Google Maps, press and hold the spot — the card that appears has the numbers on it — or use “Drop a pin”.',
    };
  }

  return {
    ok: false,
    reason: 'Paste a Maps link, or two numbers like 1.1301, 104.0529.',
  };
}

/** Rough great-circle km. Duplicated from geo.ts only to keep this module pure. */
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
 * A point that parsed cleanly but is nowhere near the trip.
 *
 * Not an error — Johor Bahru and Singapore are both legitimately on the way —
 * so this returns something to *say*, and the caller still saves the place.
 */
export function farFromTrip(p: LatLon): string | null {
  const km = kmApart(p, BATAM);
  if (km < FAR_KM) return null;
  return `That is about ${Math.round(km).toLocaleString('en-GB')} km from Batam. Worth a second look at the link.`;
}

/** What the app says it read, so you can tell a pin from a camera position. */
export const SOURCE_LABEL: Record<LocationSource, string> = {
  'google-pin': 'from the Google Maps pin',
  'google-camera': 'from the Google Maps view — check the pin landed right',
  query: 'from the link',
  apple: 'from the Apple Maps link',
  waze: 'from the Waze link',
  osm: 'from the OpenStreetMap link',
  geo: 'from the location link',
  typed: 'from the coordinates you typed',
};
