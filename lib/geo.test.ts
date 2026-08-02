import { describe, expect, it } from 'vitest';
import {
  BATAM_ANCHOR,
  BATAM_RADIUS_KM,
  directionsUrl,
  distanceVerdict,
  formatKm,
  grabFare,
  haversineKm,
  isInBatam,
  nearest,
  walkMinutes,
} from './geo';
import { getPlace, MAP_PLACES, requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');
const pagisore = requirePlace('pagisore');
const harris = requirePlace('harris');
const ferry = requirePlace('ferry');

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(radisson, radisson)).toBe(0);
  });

  it('is symmetric', () => {
    expect(haversineKm(radisson, harris)).toBeCloseTo(haversineKm(harris, radisson), 10);
  });

  it('matches the note on Pagi Sore, which is 500 m from the Radisson', () => {
    const km = haversineKm(radisson, pagisore);
    expect(km).toBeGreaterThan(0.3);
    expect(km).toBeLessThan(0.7);
  });

  it('gets the Harris to ferry terminal run about right', () => {
    // Barelang is right down the south of the island; the terminal is up north.
    const km = haversineKm(harris, ferry);
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(25);
  });

  it('handles a degree of latitude as roughly 111 km', () => {
    expect(haversineKm({ lat: 0, lon: 104 }, { lat: 1, lon: 104 })).toBeCloseTo(111.19, 1);
  });

  it('is well under a kilometre for two shops in the same mall', () => {
    expect(haversineKm(requirePlace('sociolla'), requirePlace('marugame'))).toBeLessThan(0.2);
  });
});

describe('formatKm', () => {
  it('always shows one decimal', () => {
    expect(formatKm(0.84)).toBe('0.8 km');
    expect(formatKm(12)).toBe('12.0 km');
    expect(formatKm(0.04)).toBe('0.0 km');
  });
});

describe('isInBatam', () => {
  it('accepts a position on the island', () => {
    expect(isInBatam(radisson)).toBe(true);
    expect(isInBatam(harris)).toBe(true);
  });

  it('rejects home', () => {
    expect(isInBatam({ lat: 3.139, lon: 101.6869 })).toBe(false);
  });

  it('reaches across the strait, which the 60 km rule cannot help', () => {
    // Puteri Harbour (~51 km) and Singapore (~26 km) both sit inside the
    // radius as specified, even though every distance measured from there is a
    // ferry ride rather than a Grab. See the note in geo.ts — the location
    // screen handles that case rather than the radius being widened.
    for (const across of [
      { lat: 1.4166, lon: 103.6613 }, // Puteri Harbour
      { lat: 1.3644, lon: 103.9915 }, // Changi
    ]) {
      expect(haversineKm(across, BATAM_ANCHOR)).toBeLessThan(BATAM_RADIUS_KM);
      expect(isInBatam(across)).toBe(true);
    }
  });

  it('draws the boundary at the stated radius', () => {
    expect(haversineKm(BATAM_ANCHOR, harris)).toBeLessThan(BATAM_RADIUS_KM);
  });

  it('anchors somewhere on the island', () => {
    expect(BATAM_ANCHOR.lat).toBeGreaterThan(0.9);
    expect(BATAM_ANCHOR.lat).toBeLessThan(1.3);
    expect(BATAM_ANCHOR.lon).toBeGreaterThan(103.9);
    expect(BATAM_ANCHOR.lon).toBeLessThan(104.1);
  });
});

describe('walkMinutes', () => {
  it('uses a stroller pace, not a brisk one', () => {
    // 1 km at 4.3 km/h is 14 minutes. At a brisk 5.5 it would be 11.
    expect(walkMinutes(1)).toBe(14);
  });

  it('never rounds down to zero', () => {
    expect(walkMinutes(0.001)).toBe(1);
  });
});

describe('distanceVerdict', () => {
  it('calls anything under 550 m an easy walk', () => {
    expect(distanceVerdict(0.1).text).toBe('an easy walk');
    expect(distanceVerdict(0.549).text).toBe('an easy walk');
  });

  it('gives minutes between 550 m and 1.2 km', () => {
    const v = distanceVerdict(0.9);
    expect(v.mode).toBe('walk');
    expect(v.text).toBe('about 13 minutes on foot');
  });

  it('includes 1.2 km in the walking band', () => {
    expect(distanceVerdict(1.2).mode).toBe('walk');
    expect(distanceVerdict(1.2).text).toContain('on foot');
  });

  it('sends you to Grab past 1.2 km', () => {
    const v = distanceVerdict(1.201);
    expect(v.mode).toBe('grab');
    expect(v.text).toMatch(/^take a Grab, RM \d+–\d+$/);
  });

  it('quotes a fare with the verdict', () => {
    const v = distanceVerdict(6);
    if (v.mode !== 'grab') throw new Error('expected a Grab verdict');
    expect(v.fare.lowMYR).toBeGreaterThan(5);
  });

  it('passes the trip date through so the holiday surge lands', () => {
    const plain = distanceVerdict(10, '2026-08-24');
    const holiday = distanceVerdict(10, '2026-08-25');
    if (plain.mode !== 'grab' || holiday.mode !== 'grab') {
      throw new Error('expected Grab verdicts');
    }
    expect(holiday.fare.lowMYR).toBeGreaterThan(plain.fare.lowMYR);
  });
});

describe('grabFare', () => {
  it('never goes below the floor', () => {
    expect(grabFare(0).lowMYR).toBe(5);
    expect(grabFare(0.2).lowMYR).toBe(5);
  });

  it('grows with distance', () => {
    expect(grabFare(20).lowMYR).toBeGreaterThan(grabFare(5).lowMYR);
  });

  it('is a range, low first', () => {
    const fare = grabFare(8);
    expect(fare.highMYR).toBeGreaterThan(fare.lowMYR);
    expect(fare.text).toBe(`RM ${fare.lowMYR}–${fare.highMYR}`);
  });

  it('adds about 20% on Maulid Nabi', () => {
    const plain = grabFare(15, '2026-08-24');
    const holiday = grabFare(15, '2026-08-25');
    expect(plain.surge).toBe(false);
    expect(holiday.surge).toBe(true);
    expect(holiday.lowMYR / plain.lowMYR).toBeCloseTo(1.2, 1);
  });

  it('leaves other days alone', () => {
    expect(grabFare(15).surge).toBe(false);
    expect(grabFare(15, '2026-08-21').surge).toBe(false);
  });
});

describe('nearest', () => {
  it('ranks from the given position outwards', () => {
    const results = nearest(MAP_PLACES, radisson, 3);
    expect(results[0]!.item.key).toBe('radisson');
    expect(results[0]!.km).toBe(0);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i]!.km).toBeGreaterThanOrEqual(results[i - 1]!.km);
    }
  });

  it('puts Pagi Sore among the closest things to the Radisson', () => {
    const keys = nearest(MAP_PLACES, radisson, 4).map((r) => r.item.key);
    expect(keys).toContain('pagisore');
  });

  it('respects the count', () => {
    expect(nearest(MAP_PLACES, radisson, 5)).toHaveLength(5);
  });

  it('carries a verdict on every row', () => {
    for (const row of nearest(MAP_PLACES, radisson, 5)) {
      expect(row.verdict.text.length).toBeGreaterThan(0);
    }
  });
});

describe('directionsUrl', () => {
  it('deep links to Google Maps with the coordinates', () => {
    const place = getPlace('pinkbeach')!;
    const url = directionsUrl(place);
    expect(url).toContain('google.com/maps/dir/');
    expect(url).toContain(encodeURIComponent(`${place.lat},${place.lon}`));
  });
});
