import { describe, expect, it } from 'vitest';
import {
  BOOKINGS,
  COSTS,
  FERRY,
  DAYS,
  MAP_PLACES,
  PLACES,
  getPlace,
  dayByDate,
  placesOnDay,
  requirePlace,
  searchTerms,
  type DayId,
} from './trip';
import { formatTripDate } from '@/lib/time';

describe('places', () => {
  it('has all 38', () => {
    expect(PLACES).toHaveLength(38);
  });

  it('has unique keys', () => {
    expect(new Set(PLACES.map((p) => p.key)).size).toBe(PLACES.length);
  });

  it('sits every coordinate on Batam', () => {
    for (const p of PLACES) {
      expect(p.lat, p.key).toBeGreaterThan(0.9);
      expect(p.lat, p.key).toBeLessThan(1.3);
      expect(p.lon, p.key).toBeGreaterThan(103.9);
      expect(p.lon, p.key).toBeLessThan(104.1);
    }
  });

  it('puts every place on a real line', () => {
    for (const p of PLACES) {
      expect(DAYS.some((l) => l.id === p.day), p.key).toBe(true);
    }
  });
});

describe('malls', () => {
  it('folds tenants out of the map so there are no stacked pins', () => {
    const inside = PLACES.filter((p) => 'insideOf' in p);
    expect(inside.map((p) => p.key).sort()).toEqual([
      'chikuro',
      'marugame',
      'renuin',
      'sociolla',
      'top100',
    ]);
    expect(MAP_PLACES).toHaveLength(PLACES.length - inside.length);
    for (const p of inside) {
      expect(MAP_PLACES).not.toContain(p);
    }
  });

  it('resolves every insideOf to a real parent that lists it back', () => {
    for (const p of PLACES) {
      if (!p.insideOf) continue;
      const parent = getPlace(p.insideOf);
      expect(parent, p.key).toBeDefined();
      expect(parent!.tenants?.some((t) => t.placeKey === p.key), p.key).toBe(true);
    }
  });

  it('resolves every tenant placeKey', () => {
    for (const p of PLACES) {
      for (const tenant of p.tenants ?? []) {
        if (!tenant.placeKey) continue;
        expect(getPlace(tenant.placeKey), tenant.name).toBeDefined();
      }
    }
  });

  it('keeps the DC Mall tenants that are not places of their own', () => {
    const names = requirePlace('dcmall').tenants?.map((t) => t.name);
    expect(names).toEqual(['Zhuko', 'Diamond', 'Kue Jongkong']);
  });

  it('finds the mall when you search for a tenant', () => {
    const matches = (q: string) =>
      MAP_PLACES.filter((p) => searchTerms(p).some((t) => t.includes(q.toLowerCase())));

    expect(matches('Renuin').map((p) => p.key)).toContain('nagoyahill');
    expect(matches('Chikuro').map((p) => p.key)).toContain('gbm');
    expect(matches('Kue Jongkong').map((p) => p.key)).toContain('dcmall');
    expect(matches('Sociolla').map((p) => p.key)).toContain('gbm');
  });
});

describe('lines', () => {
  it('runs five consecutive days, 21 to 25 August', () => {
    expect(DAYS.map((l) => l.date)).toEqual([
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
    ]);
  });

  it('labels each day with the weekday it actually falls on', () => {
    for (const line of DAYS) {
      expect(formatTripDate(line.date).startsWith(line.weekday), line.date).toBe(true);
    }
  });

  it('bases every line at a hotel that exists', () => {
    for (const line of DAYS) {
      expect(requirePlace(line.base).category, `line ${line.id}`).toBe('hotel');
    }
  });

  it('moves hotel exactly once', () => {
    const bases = DAYS.map((l) => l.base);
    const moves = bases.filter((b, i) => i > 0 && b !== bases[i - 1]);
    expect(moves).toEqual(['radisson']);
  });

  it('gives every line a distinct colour', () => {
    expect(new Set(DAYS.map((l) => l.colour)).size).toBe(DAYS.length);
  });

  it('has at least one place on every line', () => {
    for (const line of DAYS) {
      expect(placesOnDay(line.id).length, `line ${line.id}`).toBeGreaterThan(0);
    }
  });

  it('looks up by date', () => {
    expect(dayByDate('2026-08-24')?.name).toBe('Northern loop');
    expect(dayByDate('2026-08-26')).toBeUndefined();
  });

  it('accounts for every place across the five lines', () => {
    const counted = DAYS.reduce((n, l) => n + placesOnDay(l.id).length, 0);
    expect(counted).toBe(PLACES.length);
  });

  it('rejects a line id that does not exist', () => {
    expect(placesOnDay(9 as DayId)).toHaveLength(0);
  });
});

describe('bookings and ferry', () => {
  it('covers all four nights', () => {
    expect(BOOKINGS.reduce((n, b) => n + b.nights, 0)).toBe(4);
  });

  it('matches the booked total', () => {
    const hotels = BOOKINGS.reduce((n, b) => n + b.priceMYR, 0);
    expect(hotels).toBe(1663);
    expect(hotels + FERRY.returnFareMYR).toBe(COSTS.bookedTotalMYR);
  });

  it('sails out on day one and back on day five', () => {
    const [out, back] = FERRY.legs;
    expect(out.date).toBe(DAYS[0]!.date);
    expect(back.date).toBe(DAYS[4]!.date);
  });

  it('crosses in an hour of wall clock, which is two hours of confusion', () => {
    // 09:00 MYT is 08:00 WIB; landing at 10:00 WIB is a one-hour crossing.
    expect(FERRY.legs[0].departs).toBe('09:00');
    expect(FERRY.legs[0].departsZone).toBe('MYT');
    expect(FERRY.legs[0].arrives).toBe('10:00');
    expect(FERRY.legs[0].arrivesZone).toBe('WIB');
  });

  it('closes bag check-in an hour before the 17:00 sailing', () => {
    expect(FERRY.checkIn.opens).toBe(15 * 60 + 30);
    expect(FERRY.checkIn.closes).toBe(16 * 60 + 30);
  });
});

describe('costs', () => {
  it('adds the booked rows up to the booked total', () => {
    const sum = COSTS.booked.reduce((n, r) => n + r.lowMYR, 0);
    expect(sum).toBe(COSTS.bookedTotalMYR);
  });

  it('adds booked plus on-the-day up to the quoted trip range', () => {
    const low = COSTS.onTheDay.reduce((n, r) => n + r.lowMYR, COSTS.bookedTotalMYR);
    const high = COSTS.onTheDay.reduce((n, r) => n + r.highMYR, COSTS.bookedTotalMYR);
    expect(low).toBe(COSTS.totalLowMYR);
    expect(high).toBe(COSTS.totalHighMYR);
  });
});
