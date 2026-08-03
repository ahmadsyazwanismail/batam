import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ATTRIBUTION,
  buildUrl,
  MIN_GAP_MS,
  parseHits,
  resetRateLimit,
  searchByName,
} from './geocode';

/**
 * The live service cannot be reached from where this is built, so nothing here
 * touches the network: the URL is asserted directly, the parser is fed recorded
 * Nominatim shapes, and `searchByName` is given a fake fetch. What is *not*
 * proven here is that Nominatim still answers in this shape — that is a real
 * gap, and the reason every failure path returns something readable rather than
 * throwing.
 */

/** A trimmed real jsonv2 response for "Nagoya Hill". */
const NAGOYA = [
  {
    lat: '1.1461',
    lon: '104.0128',
    name: 'Nagoya Hill Shopping Mall',
    display_name:
      'Nagoya Hill Shopping Mall, Jalan Teuku Umar, Lubuk Baja, Batam, Kepulauan Riau, 29444, Indonesia',
  },
];

describe('the request', () => {
  it('asks for JSON and English, and keeps the list short', () => {
    const url = new URL(buildUrl('Nagoya Hill'));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Nagoya Hill');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('accept-language')).toBe('en');
    expect(Number(url.searchParams.get('limit'))).toBeLessThanOrEqual(6);
  });

  it('biases towards Batam without excluding anywhere else', () => {
    // bounded=1 would make Johor Bahru unfindable, and the ferry leaves there.
    const url = new URL(buildUrl('Ranah Minang'));
    expect(url.searchParams.get('viewbox')).toBe('103.94,0.95,104.09,1.19');
    expect(url.searchParams.get('bounded')).toBe('0');
  });

  it('encodes a name with spaces and punctuation', () => {
    const url = new URL(buildUrl('Mie Tarempa, Sungai Panas'));
    expect(url.searchParams.get('q')).toBe('Mie Tarempa, Sungai Panas');
  });

  it('trims, so a pasted name with a trailing space is the same search', () => {
    expect(new URL(buildUrl('  Nagoya Hill  ')).searchParams.get('q')).toBe('Nagoya Hill');
  });

  it('carries no key, account or token of any kind', () => {
    const url = buildUrl('anything');
    expect(url).not.toMatch(/key=|token=|apikey|api_key/i);
  });
});

describe('reading the response', () => {
  it('splits the one long string into a name and a place', () => {
    const [hit] = parseHits(NAGOYA);
    expect(hit).toMatchObject({
      name: 'Nagoya Hill Shopping Mall',
      lat: 1.1461,
      lon: 104.0128,
      nearby: true,
    });
    // Three segments: enough to tell two same-named places apart, and it does
    // not repeat "Indonesia" on every row.
    expect(hit!.detail).toBe('Jalan Teuku Umar, Lubuk Baja, Batam');
  });

  it('falls back to the first segment when there is no separate name', () => {
    const [hit] = parseHits([
      { lat: '1.13', lon: '104.05', display_name: 'Somewhere, Batam, Indonesia' },
    ]);
    expect(hit!.name).toBe('Somewhere');
    expect(hit!.detail).toBe('Batam, Indonesia');
  });

  it('marks what is on the island and what is not', () => {
    const hits = parseHits([
      { lat: '1.1461', lon: '104.0128', name: 'On Batam', display_name: 'On Batam' },
      { lat: '-6.1754', lon: '106.8272', name: 'In Jakarta', display_name: 'In Jakarta' },
    ]);
    expect(hits.map((h) => [h.name, h.nearby])).toEqual([
      ['On Batam', true],
      ['In Jakarta', false],
    ]);
  });

  it('promotes the local one, whatever order the service sent', () => {
    // Nominatim ranks by global importance, so a big place in Java outranks a
    // small one here. "Nearest to the trip" is the more useful question.
    const hits = parseHits([
      { lat: '-6.9', lon: '107.6', name: 'Sederhana', display_name: 'Sederhana, Bandung' },
      { lat: '1.14', lon: '104.01', name: 'Sederhana', display_name: 'Sederhana, Batam' },
    ]);
    expect(hits[0]!.detail).toMatch(/Batam/);
  });

  it('keeps the service’s own order inside the local group', () => {
    const hits = parseHits([
      { lat: '1.14', lon: '104.01', name: 'First', display_name: 'First, Batam' },
      { lat: '1.15', lon: '104.02', name: 'Second', display_name: 'Second, Batam' },
    ]);
    expect(hits.map((h) => h.name)).toEqual(['First', 'Second']);
  });

  it('drops the duplicate a node and its building make of one place', () => {
    const hits = parseHits([
      { lat: '1.14610', lon: '104.01280', name: 'Nagoya Hill', display_name: 'Nagoya Hill, Batam' },
      { lat: '1.14612', lon: '104.01283', name: 'Nagoya Hill', display_name: 'Nagoya Hill, Batam' },
    ]);
    expect(hits).toHaveLength(1);
  });

  it('keeps two genuinely different places that share a name', () => {
    const hits = parseHits([
      { lat: '1.14', lon: '104.01', name: 'Ranah Minang', display_name: 'Ranah Minang, Nagoya' },
      { lat: '1.08', lon: '104.03', name: 'Ranah Minang', display_name: 'Ranah Minang, Batu Aji' },
    ]);
    expect(hits).toHaveLength(2);
  });

  it('survives every shape a broken response could take', () => {
    expect(parseHits(null)).toEqual([]);
    expect(parseHits({})).toEqual([]);
    expect(parseHits('nope')).toEqual([]);
    expect(parseHits([])).toEqual([]);
    expect(parseHits([{ lat: 'x', lon: 'y' }])).toEqual([]);
    expect(parseHits([{ lat: '999', lon: '104' }])).toEqual([]);
    expect(parseHits([{}])).toEqual([]);
  });

  it('names an entry with nothing to call it rather than showing a blank row', () => {
    expect(parseHits([{ lat: '1.13', lon: '104.05' }])[0]!.name).toBe('Unnamed place');
  });
});

describe('searching', () => {
  beforeEach(() => {
    resetRateLimit();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: true },
    });
  });

  const ok = (body: unknown): typeof fetch =>
    (async () =>
      ({ ok: true, status: 200, json: async () => body }) as unknown as Response) as typeof fetch;

  it('returns rows for a name it knows', async () => {
    const result = await searchByName('Nagoya Hill', { fetcher: ok(NAGOYA) });
    expect(result.ok && result.hits[0]!.name).toBe('Nagoya Hill Shopping Mall');
  });

  it('returns an empty list rather than an error when nothing is found', async () => {
    // OSM will not know a warung that opened last year. That is not a failure,
    // and the form says so and points at the other three ways in.
    const result = await searchByName('Kopi Kenangan Batam Centre', { fetcher: ok([]) });
    expect(result).toEqual({ ok: true, hits: [] });
  });

  it('will not search on two letters', async () => {
    const fetcher = vi.fn();
    const result = await searchByName('na', { fetcher: fetcher as unknown as typeof fetch });
    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not even try when the phone is offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    const fetcher = vi.fn();
    const result = await searchByName('Nagoya Hill', {
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(!result.ok && result.reason).toMatch(/needs a connection/i);
    expect(!result.ok && result.reason).toMatch(/drop a pin/i);
  });

  it('honours the one-request-a-second the service asks for', async () => {
    const fetcher = vi.fn(ok(NAGOYA));
    let clock = 10_000;
    const now = (): number => clock;

    const first = await searchByName('Nagoya Hill', { fetcher, now });
    expect(first.ok).toBe(true);

    clock += MIN_GAP_MS - 100;
    const tooSoon = await searchByName('Nagoya Hill', { fetcher, now });
    expect(tooSoon.ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clock += 200;
    const later = await searchByName('Nagoya Hill', { fetcher, now });
    expect(later.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('says the service is busy on a 429 rather than "no results"', async () => {
    const fetcher = (async () => ({ ok: false, status: 429 }) as Response) as typeof fetch;
    const result = await searchByName('Nagoya Hill', { fetcher });
    expect(!result.ok && result.reason).toMatch(/rate-limiting|busy/i);
  });

  it('does not throw when the network drops mid-request', async () => {
    const fetcher = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const result = await searchByName('Nagoya Hill', { fetcher });
    expect(!result.ok && result.reason).toMatch(/Could not reach/i);
  });

  it('does not throw when the body is not JSON', async () => {
    const fetcher = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }) as unknown as Response) as typeof fetch;
    const result = await searchByName('Nagoya Hill', { fetcher });
    expect(!result.ok && result.reason).toMatch(/unreadable/i);
  });

  it('every failure names something else you can do instead', async () => {
    const fetchers: (typeof fetch)[] = [
      (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch,
      (async () => ({ ok: false, status: 429 }) as Response) as typeof fetch,
    ];
    for (const fetcher of fetchers) {
      resetRateLimit();
      const result = await searchByName('Nagoya Hill', { fetcher });
      expect(!result.ok && result.reason).toMatch(/paste a (maps )?link|drop a pin/i);
    }
  });
});

describe('the licence', () => {
  it('credits OpenStreetMap, which its data requires', () => {
    expect(ATTRIBUTION).toMatch(/OpenStreetMap/);
  });
});
