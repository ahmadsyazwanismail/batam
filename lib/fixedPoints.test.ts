import { describe, expect, it } from 'vitest';
import { fixedPoints } from './fixedPoints';
import { BOOKINGS, FERRY, dayById } from '@/data/trip';

describe('fixedPoints', () => {
  it('fills the arrival day, which has no food on it at all', () => {
    const points = fixedPoints(1);
    expect(points.length).toBeGreaterThan(0);
    expect(points.map((p) => p.label)).toEqual([
      'Ferry leaves Puteri Harbour',
      'Lands at Harbour Bay',
      'Check in at Harris Resort Barelang',
    ]);
  });

  it('reads the sailing out in its own timezone but orders it in WIB', () => {
    const [departs, lands] = fixedPoints(1);
    // 09:00 in Malaysia is 08:00 in Batam, so it must sort before the 10:00 landing.
    expect(departs!.clock).toBe('09:00 MYT');
    expect(departs!.at).toBe(8 * 60);
    expect(lands!.clock).toBe('10:00 WIB');
    expect(departs!.at!).toBeLessThan(lands!.at!);
  });

  it('puts the hotel swap on the 22nd in the order you do it', () => {
    const points = fixedPoints(2);
    expect(points.map((p) => p.label)).toEqual([
      'Check out of Harris Resort Barelang',
      'Check in at Radisson Golf & Convention Center',
    ]);
  });

  it('leaves the middle of the trip alone', () => {
    expect(fixedPoints(3)).toEqual([]);
    expect(fixedPoints(4)).toEqual([]);
  });

  it('carries the bag window and the sailing home on the last day', () => {
    const points = fixedPoints(5);
    expect(points.map((p) => p.label)).toEqual([
      'Check out of Radisson Golf & Convention Center',
      'Bag drop for the ferry home',
      'Ferry leaves Harbour Bay',
    ]);
    expect(points[1]!.clock).toBe('15:30–16:30');
    expect(points[2]!.clock).toBe('17:00 WIB');
  });

  it('never invents a time that was not booked', () => {
    for (const day of [1, 2, 3, 4, 5] as const) {
      for (const point of fixedPoints(day)) {
        const isHotel = point.label.startsWith('Check ');
        expect(point.clock === undefined, point.label).toBe(isHotel);
      }
    }
  });

  it('stays in step with the bookings it is drawn from', () => {
    const dates = new Set([1, 2, 3, 4, 5].map((d) => dayById(d as 1).date));
    for (const booking of BOOKINGS) {
      expect(dates.has(booking.checkIn)).toBe(true);
      expect(dates.has(booking.checkOut)).toBe(true);
    }
    for (const leg of FERRY.legs) expect(dates.has(leg.date)).toBe(true);
  });
});
