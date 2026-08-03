import { describe, expect, it } from 'vitest';
import { farFromTrip, parseLocation } from './parseLocation';

/** Narrows and returns the point, failing the test with the reason if it did not parse. */
function pointOf(input: string): { lat: number; lon: number } {
  const result = parseLocation(input);
  if (!result.ok) throw new Error(`expected a point, got: ${result.reason}`);
  return result.point;
}

describe('parseLocation — Google Maps', () => {
  it('reads the pin out of a full place link', () => {
    const url =
      'https://www.google.com/maps/place/Nagoya+Hill+Shopping+Mall/@1.1456,104.0122,17z/data=!4m6!3m5!1s0x31d989!8m2!3d1.1461!4d104.0128!16s%2Fg%2F1td';
    expect(pointOf(url)).toEqual({ lat: 1.1461, lon: 104.0128 });
  });

  it('prefers the pin over the camera when a link carries both', () => {
    // `@` is where the map was looking; `!3d!4d` is the place itself. Pan
    // before copying and they differ by streets, so the pin has to win.
    const url = 'https://www.google.com/maps/place/X/@1.2000,104.2000,17z/data=!3d1.1461!4d104.0128';
    expect(pointOf(url)).toEqual({ lat: 1.1461, lon: 104.0128 });
    expect(parseLocation(url)).toMatchObject({ source: 'google-pin' });
  });

  it('falls back to the camera when that is all there is', () => {
    const result = parseLocation('https://www.google.com/maps/@1.1456,104.0122,17z');
    expect(result).toMatchObject({ ok: true, source: 'google-camera' });
    expect(pointOf('https://www.google.com/maps/@1.1456,104.0122,17z')).toEqual({
      lat: 1.1456,
      lon: 104.0122,
    });
  });

  it('warns that a camera position is only the view', () => {
    const result = parseLocation('https://www.google.com/maps/@1.1456,104.0122,17z');
    expect(result.ok && result.source).toBe('google-camera');
  });

  it('reads the search and directions API forms', () => {
    expect(pointOf('https://www.google.com/maps/search/?api=1&query=1.1301,104.0529')).toEqual({
      lat: 1.1301,
      lon: 104.0529,
    });
    expect(
      pointOf('https://www.google.com/maps/dir/?api=1&destination=1.0836,104.0305'),
    ).toEqual({ lat: 1.0836, lon: 104.0305 });
    expect(pointOf('https://maps.google.com/?q=1.1301,104.0529')).toEqual({
      lat: 1.1301,
      lon: 104.0529,
    });
  });

  it('handles a URL-encoded comma', () => {
    expect(pointOf('https://maps.google.com/?q=1.1301%2C104.0529')).toEqual({
      lat: 1.1301,
      lon: 104.0529,
    });
  });

  it('does not mine coordinates out of a place-id hash', () => {
    // `0x31d98...` is an id, not a position. Nothing in it looks like a pair,
    // and nothing may be invented from it.
    const url = 'https://www.google.com/maps/place/Somewhere/data=!4m2!3m1!1s0x31d98916:0x4a2b';
    expect(parseLocation(url).ok).toBe(false);
  });
});

describe('parseLocation — other apps', () => {
  it('reads Apple Maps', () => {
    const result = parseLocation('https://maps.apple.com/?ll=1.1301,104.0529&q=Dropped%20Pin');
    expect(result).toMatchObject({ ok: true, source: 'apple' });
    expect(pointOf('https://maps.apple.com/?ll=1.1301,104.0529')).toEqual({
      lat: 1.1301,
      lon: 104.0529,
    });
  });

  it('reads Waze', () => {
    expect(parseLocation('https://waze.com/ul?ll=1.1301,104.0529&navigate=yes')).toMatchObject({
      ok: true,
      source: 'waze',
    });
  });

  it('reads OpenStreetMap', () => {
    expect(pointOf('https://www.openstreetmap.org/#map=17/1.1301/104.0529')).toEqual({
      lat: 1.1301,
      lon: 104.0529,
    });
  });

  it('reads a geo: URI, which is what an Android share sheet emits', () => {
    expect(pointOf('geo:1.1301,104.0529?z=17')).toEqual({ lat: 1.1301, lon: 104.0529 });
  });
});

describe('parseLocation — typed by hand', () => {
  it('takes a bare pair with or without a space', () => {
    expect(pointOf('1.1301, 104.0529')).toEqual({ lat: 1.1301, lon: 104.0529 });
    expect(pointOf('1.1301,104.0529')).toEqual({ lat: 1.1301, lon: 104.0529 });
  });

  it('takes a pair in brackets, which is how Maps copies them', () => {
    expect(pointOf('(1.1301, 104.0529)')).toEqual({ lat: 1.1301, lon: 104.0529 });
  });

  it('takes a negative pair, so the parser is not quietly Batam-only', () => {
    expect(pointOf('-6.1754, 106.8272')).toEqual({ lat: -6.1754, lon: 106.8272 });
  });

  it('refuses a pair with words around it, which is a half-copied address', () => {
    expect(parseLocation('Jalan Engku Putri 1.1301, 104.0529 Batam Centre').ok).toBe(false);
  });
});

describe('parseLocation — what it refuses, and what it says', () => {
  it('names the shortened-link problem instead of failing blankly', () => {
    const result = parseLocation('https://maps.app.goo.gl/aB3xY9zQ');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/shortened/i);
    expect(!result.ok && result.reason).toMatch(/drop a pin/i);
  });

  it('catches a swapped pair and says which way round it goes', () => {
    const result = parseLocation('104.0529, 1.1301');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/latitude/i);
  });

  it('rejects an out-of-range longitude', () => {
    expect(parseLocation('1.13, 204.05').ok).toBe(false);
  });

  it('says something useful about an empty box', () => {
    expect(parseLocation('   ')).toMatchObject({ ok: false });
  });

  it('tells you where the numbers are when a link has none', () => {
    const result = parseLocation('https://www.google.com/maps/place/Nagoya+Hill');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/press and hold/i);
  });
});

describe('farFromTrip', () => {
  it('says nothing about somewhere on the island', () => {
    expect(farFromTrip({ lat: 1.1456, lon: 104.0122 })).toBeNull();
  });

  it('says nothing about Singapore or Johor, which are genuinely on the way', () => {
    expect(farFromTrip({ lat: 1.3521, lon: 103.8198 })).toBeNull();
    expect(farFromTrip({ lat: 1.4927, lon: 103.7414 })).toBeNull();
  });

  it('speaks up about Jakarta', () => {
    const message = farFromTrip({ lat: -6.1754, lon: 106.8272 });
    expect(message).toMatch(/km from Batam/);
  });

  it('speaks up about a hemisphere mistake', () => {
    expect(farFromTrip({ lat: 1.1301, lon: -104.0529 })).not.toBeNull();
  });
});
