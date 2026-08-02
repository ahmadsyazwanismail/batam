import { describe, expect, it } from 'vitest';
import {
  activeDay,
  formatMinutes,
  formatTripDate,
  isOpenAt,
  mytClock,
  parseHhmm,
  tripPhase,
  wibClock,
  wibDate,
  wibMinutes,
} from './time';
import { requirePlace } from '@/data/trip';

/** 2026-08-23 06:30 UTC is 13:30 WIB and 14:30 MYT. */
const midTrip = new Date('2026-08-23T06:30:00Z');

describe('WIB clock', () => {
  it('reads UTC+7', () => {
    expect(wibClock(midTrip)).toBe('1:30 pm');
    expect(wibMinutes(midTrip)).toBe(13 * 60 + 30);
    expect(wibDate(midTrip)).toBe('2026-08-23');
  });

  it('keeps Malaysia an hour ahead', () => {
    expect(mytClock(midTrip)).toBe('2:30 pm');
  });

  it('rolls the date over at WIB midnight, not UTC midnight', () => {
    // 17:10 UTC on the 22nd is already 00:10 on the 23rd in Batam.
    expect(wibDate(new Date('2026-08-22T17:10:00Z'))).toBe('2026-08-23');
    expect(wibClock(new Date('2026-08-22T17:10:00Z'))).toBe('12:10 am');
  });

  it('does not read the device timezone', () => {
    // Same instant, and the answer must not depend on where the phone thinks
    // it is — this is the single most common source of confusion on this trip.
    const instant = new Date('2026-08-25T09:00:00Z');
    expect(wibClock(instant)).toBe('4:00 pm');
  });
});

describe('formatMinutes', () => {
  it('reads as a twelve-hour clock', () => {
    expect(formatMinutes(9 * 60)).toBe('9:00 am');
    expect(formatMinutes(12 * 60 + 30)).toBe('12:30 pm');
    expect(formatMinutes(15 * 60 + 5)).toBe('3:05 pm');
    expect(formatMinutes(23 * 60 + 59)).toBe('11:59 pm');
  });

  it('calls midnight and noon twelve, not zero', () => {
    expect(formatMinutes(0)).toBe('12:00 am');
    expect(formatMinutes(12 * 60)).toBe('12:00 pm');
  });

  it('pads the minutes but never the hour', () => {
    expect(formatMinutes(6 * 60 + 5)).toBe('6:05 am');
    expect(formatMinutes(parseHhmm('15:30'))).toBe('3:30 pm');
    expect(parseHhmm('06:00')).toBe(360);
  });
});

describe('tripPhase', () => {
  it('counts down before the trip', () => {
    const phase = tripPhase(new Date('2026-08-19T02:00:00Z'));
    if (phase.phase !== 'before') throw new Error('expected before');
    expect(phase.daysUntil).toBe(2);
    expect(phase.firstDay.id).toBe(1);
  });

  it('finds the running line on each day', () => {
    const cases: [string, number][] = [
      ['2026-08-21T04:00:00Z', 1],
      ['2026-08-22T04:00:00Z', 2],
      ['2026-08-23T04:00:00Z', 3],
      ['2026-08-24T04:00:00Z', 4],
      ['2026-08-25T04:00:00Z', 5],
    ];
    for (const [iso, id] of cases) {
      const phase = tripPhase(new Date(iso));
      if (phase.phase !== 'during') throw new Error(`expected during on ${iso}`);
      expect(phase.day.id).toBe(id);
      expect(phase.dayNumber).toBe(id);
    }
  });

  it('closes after the last ferry', () => {
    const phase = tripPhase(new Date('2026-08-26T04:00:00Z'));
    if (phase.phase !== 'after') throw new Error('expected after');
    expect(phase.lastDay.id).toBe(5);
  });

  it('always has a line to wear', () => {
    expect(activeDay(new Date('2026-01-01T00:00:00Z')).id).toBe(1);
    expect(activeDay(midTrip).id).toBe(3);
    expect(activeDay(new Date('2027-01-01T00:00:00Z')).id).toBe(5);
  });
});

describe('isOpenAt', () => {
  it('keeps Pink Beach shut until 12:30', () => {
    const pinkbeach = requirePlace('pinkbeach');
    expect(isOpenAt(pinkbeach.opening, parseHhmm('12:00'))).toBe(false);
    expect(isOpenAt(pinkbeach.opening, parseHhmm('12:29'))).toBe(false);
    expect(isOpenAt(pinkbeach.opening, parseHhmm('12:30'))).toBe(true);
  });

  it('closes Dino Gate at 18:00', () => {
    const dino = requirePlace('dinogate');
    expect(isOpenAt(dino.opening, parseHhmm('08:59'))).toBe(false);
    expect(isOpenAt(dino.opening, parseHhmm('09:00'))).toBe(true);
    expect(isOpenAt(dino.opening, parseHhmm('17:59'))).toBe(true);
    expect(isOpenAt(dino.opening, parseHhmm('18:00'))).toBe(false);
  });

  it('opens Morning Bakery at 06:00', () => {
    const bakery = requirePlace('mornbakery');
    expect(isOpenAt(bakery.opening, parseHhmm('05:59'))).toBe(false);
    expect(isOpenAt(bakery.opening, parseHhmm('06:00'))).toBe(true);
  });

  it('assumes open when the hours are not recorded', () => {
    expect(isOpenAt(undefined, parseHhmm('03:00'))).toBe(true);
  });
});

describe('formatTripDate', () => {
  it('prints the weekday the ticket says', () => {
    expect(formatTripDate('2026-08-21')).toBe('Fri 21 Aug');
    expect(formatTripDate('2026-08-25')).toBe('Tue 25 Aug');
  });
});
