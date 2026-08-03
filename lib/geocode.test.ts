import { describe, expect, it, vi } from 'vitest';
import {
  ATTRIBUTION,
  buildUrl,
  DEBOUNCE_MS,
  inBatam,
  MIN_QUERY,
  parseHits,
  searchByName,
  SEARCH_BOUNDS,
} from './geocode';
import { MAP_PLACES, PLACES } from '@/data/trip';

/**
 * The live service cannot be reached from where this is built, so nothing here
 * touches the network: the URL is asserted directly, the parser is fed recorded
 * Photon shapes, and `searchByName` is given a fake fetch. What is *not* proven
 * is that Photon still answers in this shape — hence the failure paths.
 */

/** A trimmed real Photon response. Note GeoJSON order: [lon, lat]. */
const NAGOYA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [104.0128, 1.1461] },
      properties: {
        name: 'Nagoya Hill Shopping Mall',
        street: 'Jalan Teuku Umar',
        district: 'Lubuk Baja',
        city: 'Batam',
        country: 'Indonesia',
        osm_key: 'shop',
        osm_value: 'mall',
      },
    },
  ],
};

const feature = (lon: number, lat: number, properties: Record<string, unknown> = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties,
});

describe('the box that means “Batam”', () => {
  it('contains every place the trip already goes to', () => {
    // If the app's own list falls outside the box it searches in, the box is
    // wrong — you would be unable to find somewhere next door to the hotel.
    for (const place of PLACES) {
      expect(inBatam(place), `${place.name} is outside the search box`).toBe(true);
    }
    expect(MAP_PLACES.length).toBeGreaterThan(0);
  });

  it('leaves room around the trip rather than hugging it', () => {
    // The point of searching is to find somewhere not already on the list.
    const lats = PLACES.map((p) => p.lat);
    const lons = PLACES.map((p) => p.lon);
    expect(SEARCH_BOUNDS.minLat).toBeLessThan(Math.min(...lats) - 0.05);
    expect(SEARCH_BOUNDS.maxLat).toBeGreaterThan(Math.max(...lats) + 0.02);
    expect(SEARCH_BOUNDS.minLon).toBeLessThan(Math.min(...lons) - 0.05);
    expect(SEARCH_BOUNDS.maxLon).toBeGreaterThan(Math.max(...lons) + 0.05);
  });

  it('reaches down the Barelang chain to Galang', () => {
    // Rempang and Galang are on the trip's own road south, so somewhere down
    // there has to be findable.
    expect(inBatam({ lat: 0.79, lon: 104.02 })).toBe(true);
  });

  it('excludes Singapore, including Sentosa', () => {
    expect(inBatam({ lat: 1.3521, lon: 103.8198 })).toBe(false);
    // The closest Singapore gets. Batam's northern tip is 1.183, so the edge
    // between them is real but narrow.
    expect(inBatam({ lat: 1.2494, lon: 103.8303 })).toBe(false);
  });

  it('excludes Johor Bahru, Bintan and Jakarta', () => {
    expect(inBatam({ lat: 1.4927, lon: 103.7414 })).toBe(false);
    expect(inBatam({ lat: 0.9186, lon: 104.4566 })).toBe(false);
    expect(inBatam({ lat: -6.1754, lon: 106.8272 })).toBe(false);
  });
});

describe('the request', () => {
  it('bounds the search to Batam', () => {
    const url = new URL(buildUrl('Nagoya'));
    expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/');
    expect(url.searchParams.get('bbox')).toBe('103.82,0.7,104.2,1.21');
  });

  it('biases towards the middle of the island inside that box', () => {
    const url = new URL(buildUrl('Kopi'));
    expect(Number(url.searchParams.get('lat'))).toBeGreaterThan(SEARCH_BOUNDS.minLat);
    expect(Number(url.searchParams.get('lat'))).toBeLessThan(SEARCH_BOUNDS.maxLat);
    expect(Number(url.searchParams.get('lon'))).toBeGreaterThan(SEARCH_BOUNDS.minLon);
    expect(Number(url.searchParams.get('lon'))).toBeLessThan(SEARCH_BOUNDS.maxLon);
  });

  it('asks for a list short enough to sit under the field', () => {
    expect(Number(new URL(buildUrl('x')).searchParams.get('limit'))).toBeLessThanOrEqual(8);
  });

  it('carries no key, account or token of any kind', () => {
    expect(buildUrl('anything')).not.toMatch(/key=|token=|apikey|api_key/i);
  });

  it('trims, so a trailing space is not a different search', () => {
    expect(new URL(buildUrl('  Nagoya  ')).searchParams.get('q')).toBe('Nagoya');
  });

  it('debounces long enough that a typed word is a few requests, not one each', () => {
    expect(DEBOUNCE_MS).toBeGreaterThanOrEqual(250);
    expect(DEBOUNCE_MS).toBeLessThanOrEqual(600);
  });
});

describe('reading the response', () => {
  it('reads GeoJSON’s [lon, lat] the right way round', () => {
    // Reversed, every result lands in the Indian Ocean — and would then be
    // filtered out as "not Batam", so the symptom would be an empty list
    // rather than a wrong pin. Worth pinning down.
    const [hit] = parseHits(NAGOYA);
    expect(hit).toMatchObject({ lat: 1.1461, lon: 104.0128 });
    expect(inBatam(hit!)).toBe(true);
  });

  it('builds the line under the name from street, district and city', () => {
    expect(parseHits(NAGOYA)[0]!.detail).toBe('Jalan Teuku Umar, Lubuk Baja, Batam');
  });

  it('does not print “Batam, Batam” when the district repeats the city', () => {
    const hits = parseHits({
      features: [feature(104.01, 1.1, { name: 'X', district: 'Batam', city: 'Batam' })],
    });
    expect(hits[0]!.detail).toBe('Batam');
  });

  it('calls an address-only result by its street rather than leaving it blank', () => {
    const hits = parseHits({
      features: [feature(104.01, 1.1, { housenumber: '12', street: 'Jalan Engku Putri' })],
    });
    expect(hits[0]!.name).toBe('12 Jalan Engku Putri');
  });

  it('drops anything outside Batam even when the service returns it', () => {
    // The second gate. The app promises "Batam only" — that promise is the
    // app's to keep, not the service's.
    const hits = parseHits({
      features: [
        feature(104.0128, 1.1461, { name: 'On Batam' }),
        feature(103.8198, 1.3521, { name: 'In Singapore' }),
        feature(106.8272, -6.1754, { name: 'In Jakarta' }),
        feature(104.4566, 0.9186, { name: 'On Bintan' }),
      ],
    });
    expect(hits.map((h) => h.name)).toEqual(['On Batam']);
  });

  it('folds the duplicate a node and its building make of one place', () => {
    const hits = parseHits({
      features: [
        feature(104.0128, 1.1461, { name: 'Nagoya Hill' }),
        feature(104.01282, 1.14612, { name: 'Nagoya Hill' }),
      ],
    });
    expect(hits).toHaveLength(1);
  });

  it('keeps two real places that share a name', () => {
    const hits = parseHits({
      features: [
        feature(104.01, 1.146, { name: 'Ranah Minang' }),
        feature(104.03, 1.08, { name: 'Ranah Minang' }),
      ],
    });
    expect(hits).toHaveLength(2);
  });

  it('survives every shape a broken response could take', () => {
    expect(parseHits(null)).toEqual([]);
    expect(parseHits({})).toEqual([]);
    expect(parseHits({ features: 'nope' })).toEqual([]);
    expect(parseHits({ features: [] })).toEqual([]);
    expect(parseHits({ features: [{}] })).toEqual([]);
    expect(parseHits({ features: [{ geometry: {} }] })).toEqual([]);
    expect(parseHits({ features: [feature(NaN, NaN)] })).toEqual([]);
  });
});

describe('searching', () => {
  const ok = (body: unknown): typeof fetch =>
    (async () =>
      ({ ok: true, status: 200, json: async () => body }) as unknown as Response) as typeof fetch;

  const online = (): void => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: true },
    });
  };

  it('returns rows for a name it knows', async () => {
    online();
    const result = await searchByName('Nagoya', { fetcher: ok(NAGOYA) });
    expect(result.ok && result.hits[0]!.name).toBe('Nagoya Hill Shopping Mall');
  });

  it('says nothing at all below the minimum, rather than erroring', async () => {
    online();
    const fetcher = vi.fn();
    const result = await searchByName('na', { fetcher: fetcher as unknown as typeof fetch });
    // An empty list, not a complaint: you are still typing.
    expect(result).toEqual({ ok: true, hits: [] });
    expect(fetcher).not.toHaveBeenCalled();
    expect(MIN_QUERY).toBe(3);
  });

  it('returns an empty list rather than an error when nothing matches', async () => {
    online();
    const result = await searchByName('Kopi Kenangan', { fetcher: ok({ features: [] }) });
    expect(result).toEqual({ ok: true, hits: [] });
  });

  it('does not try when the phone is offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    const fetcher = vi.fn();
    const result = await searchByName('Nagoya', { fetcher: fetcher as unknown as typeof fetch });
    expect(fetcher).not.toHaveBeenCalled();
    expect(!result.ok && result.reason).toMatch(/needs a connection/i);
    expect(!result.ok && result.reason).toMatch(/drop a pin/i);
  });

  it('treats an abort as “you kept typing”, not as a failure', async () => {
    online();
    const controller = new AbortController();
    controller.abort();
    const fetcher = (async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }) as typeof fetch;
    const result = await searchByName('Nagoya', { fetcher, signal: controller.signal });
    expect(result).toMatchObject({ ok: false, aborted: true, reason: '' });
  });

  it('says the service is busy on a 429 rather than “nothing found”', async () => {
    online();
    const fetcher = (async () => ({ ok: false, status: 429 }) as Response) as typeof fetch;
    const result = await searchByName('Nagoya', { fetcher });
    expect(!result.ok && result.reason).toMatch(/rate-limiting|busy/i);
  });

  it('does not throw when the network drops or the body is not JSON', async () => {
    online();
    const dropped = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    expect((await searchByName('Nagoya', { fetcher: dropped })).ok).toBe(false);

    const garbage = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }) as unknown as Response) as typeof fetch;
    const result = await searchByName('Nagoya', { fetcher: garbage });
    expect(!result.ok && result.reason).toMatch(/unreadable/i);
  });

  it('every real failure names something else you can do instead', async () => {
    online();
    for (const status of [429, 500, 502]) {
      const fetcher = (async () => ({ ok: false, status }) as Response) as typeof fetch;
      const result = await searchByName('Nagoya', { fetcher });
      expect(!result.ok && result.reason).toMatch(/paste a (maps )?link|drop a pin/i);
    }
  });
});

describe('what the list says about itself', () => {
  it('credits OpenStreetMap and states the restriction', () => {
    expect(ATTRIBUTION).toMatch(/OpenStreetMap/);
    expect(ATTRIBUTION).toMatch(/Batam only/i);
  });
});
