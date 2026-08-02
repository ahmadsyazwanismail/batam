import { describe, expect, it } from 'vitest';
import { hasLanded, hotelFor, resolveOrigin, STALE_AFTER_MS, type Fix } from './location';
import { requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');
const harris = requirePlace('harris');

/** 2026-08-23 06:00 UTC is 13:00 WIB on the Batam Centre day. */
const midTrip = new Date('2026-08-23T06:00:00Z');
const fixAt = (point: { lat: number; lon: number }, now: Date): Fix => ({
  point,
  accuracy: 12,
  at: now.getTime(),
});

describe('hasLanded', () => {
  it('is false before the trip', () => {
    expect(hasLanded(new Date('2026-08-01T00:00:00Z'))).toBe(false);
  });

  it('is false on the morning of the first day, before the ferry docks', () => {
    // 02:00 UTC is 09:00 WIB — still on the water.
    expect(hasLanded(new Date('2026-08-21T02:00:00Z'))).toBe(false);
    // 02:59 UTC is 09:59 WIB.
    expect(hasLanded(new Date('2026-08-21T02:59:00Z'))).toBe(false);
  });

  it('is true from the moment it lands', () => {
    // 03:00 UTC is 10:00 WIB, the scheduled arrival.
    expect(hasLanded(new Date('2026-08-21T03:00:00Z'))).toBe(true);
  });

  it('is true for the rest of the trip', () => {
    expect(hasLanded(midTrip)).toBe(true);
    expect(hasLanded(new Date('2026-08-25T09:00:00Z'))).toBe(true);
  });
});

describe('hotelFor', () => {
  it('is the Harris on the first night and the Radisson after', () => {
    expect(hotelFor(new Date('2026-08-21T06:00:00Z')).key).toBe('harris');
    expect(hotelFor(new Date('2026-08-22T06:00:00Z')).key).toBe('radisson');
    expect(hotelFor(midTrip).key).toBe('radisson');
    expect(hotelFor(new Date('2026-08-25T06:00:00Z')).key).toBe('radisson');
  });

  it('falls back to a real hotel outside the trip', () => {
    expect(hotelFor(new Date('2026-01-01T00:00:00Z')).category).toBe('hotel');
    expect(hotelFor(new Date('2027-01-01T00:00:00Z')).category).toBe('hotel');
  });
});

describe('resolveOrigin', () => {
  it('measures from you when you are on the island and the fix is fresh', () => {
    const origin = resolveOrigin(fixAt({ lat: 1.1276, lon: 104.0466 }, midTrip), midTrip);
    expect(origin.kind).toBe('you');
    expect(origin.label).toBe('from you');
    expect(origin.reason).toBeUndefined();
  });

  it('falls back to the hotel when location was never granted', () => {
    const origin = resolveOrigin(null, midTrip);
    expect(origin.kind).toBe('hotel');
    expect(origin.point).toEqual({ lat: radisson.lat, lon: radisson.lon });
    expect(origin.reason).toMatch(/Location is off/);
  });

  it('falls back when the fix has gone stale', () => {
    const old: Fix = {
      point: { lat: 1.1276, lon: 104.0466 },
      accuracy: 12,
      at: midTrip.getTime() - STALE_AFTER_MS - 1000,
    };
    const origin = resolveOrigin(old, midTrip);
    expect(origin.kind).toBe('hotel');
    expect(origin.reason).toMatch(/few minutes old/);
  });

  it('does not measure across the strait before the ferry lands', () => {
    // Standing at Puteri Harbour at 09:00 WIB on departure morning. This is
    // the case a 60 km radius cannot catch — the terminal is inside it.
    const morning = new Date('2026-08-21T02:00:00Z');
    const origin = resolveOrigin(fixAt({ lat: 1.4166, lon: 103.6613 }, morning), morning);
    expect(origin.kind).toBe('hotel');
    expect(origin.reason).toMatch(/ferry has not landed/);
  });

  it('falls back to the hotel from properly far away', () => {
    const origin = resolveOrigin(fixAt({ lat: 3.139, lon: 101.6869 }, midTrip), midTrip);
    expect(origin.kind).toBe('hotel');
    expect(origin.reason).toMatch(/km from Batam/);
    // And says a number, rather than showing a useless "412 km away" per row.
    expect(origin.reason).toMatch(/about \d+ km/);
  });

  it('always names the hotel it fell back to', () => {
    const first = new Date('2026-08-21T06:00:00Z');
    expect(resolveOrigin(null, first).hotel.key).toBe('harris');
    expect(resolveOrigin(null, first).label).toBe(`from ${harris.name}`);
    expect(resolveOrigin(null, midTrip).hotel.key).toBe('radisson');
  });

  it('carries the hotel even when measuring from you', () => {
    const origin = resolveOrigin(fixAt({ lat: 1.1034, lon: 104.0318 }, midTrip), midTrip);
    expect(origin.kind).toBe('you');
    expect(origin.hotel.key).toBe('radisson');
  });
});
