import { describe, expect, it } from 'vitest';
import {
  IS_PRAYER,
  PRAYER_ORDER,
  julianDay,
  nextPrayer,
  prayerTimes,
  sunPosition,
} from './prayer';
import { requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');
const KL = { lat: 3.139, lon: 101.6869 };

const at = (isoDate: string, place = radisson) => prayerTimes(isoDate, place);
const mins = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

describe('julianDay', () => {
  it('matches the standard epoch', () => {
    // J2000.0 is 2000-01-01 12:00 TT, i.e. JD 2451545.0 — so midnight is .5 less.
    expect(julianDay(2000, 1, 1)).toBe(2451544.5);
  });

  it('handles the January/February year rollback', () => {
    expect(julianDay(2026, 2, 1) - julianDay(2026, 1, 1)).toBe(31);
    expect(julianDay(2026, 3, 1) - julianDay(2026, 2, 1)).toBe(28);
  });
});

describe('sunPosition', () => {
  it('puts the sun near the equator at the equinoxes', () => {
    expect(Math.abs(sunPosition(julianDay(2026, 3, 20)).declination)).toBeLessThan(1);
    expect(Math.abs(sunPosition(julianDay(2026, 9, 23)).declination)).toBeLessThan(1);
  });

  it('reaches the tropics at the solstices', () => {
    expect(sunPosition(julianDay(2026, 6, 21)).declination).toBeCloseTo(23.4, 0);
    expect(sunPosition(julianDay(2026, 12, 21)).declination).toBeCloseTo(-23.4, 0);
  });

  it('keeps the equation of time within its real bounds', () => {
    // It never exceeds about ±16 minutes over a year.
    for (let d = 1; d <= 365; d += 7) {
      const jd = julianDay(2026, 1, 1) + d;
      expect(Math.abs(sunPosition(jd).equationOfTime)).toBeLessThan(0.28);
    }
  });
});

describe('prayer times on Batam', () => {
  it('runs in the right order', () => {
    for (const date of ['2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25']) {
      const { times } = at(date);
      const values = PRAYER_ORDER.map((n) => times[n]);
      for (const v of values) expect(v, date).not.toBeNull();
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i]!, `${date} ${PRAYER_ORDER[i]}`).toBeGreaterThan(values[i - 1]!);
      }
    }
  });

  it('lands where the equator puts them in August', () => {
    const { times } = at('2026-08-24');
    // Batam sits just north of the equator, so the day barely moves all year:
    // a little before six to a little after six, and Zohor just after noon.
    expect(times.fajr!).toBeGreaterThan(mins('04:20'));
    expect(times.fajr!).toBeLessThan(mins('05:10'));
    expect(times.sunrise!).toBeGreaterThan(mins('05:45'));
    expect(times.sunrise!).toBeLessThan(mins('06:20'));
    expect(times.dhuhr!).toBeGreaterThan(mins('11:50'));
    expect(times.dhuhr!).toBeLessThan(mins('12:25'));
    expect(times.maghrib!).toBeGreaterThan(mins('18:00'));
    expect(times.maghrib!).toBeLessThan(mins('18:30'));
  });

  it('barely changes across the five days, which is what the equator does', () => {
    const first = at('2026-08-21').times.maghrib!;
    const last = at('2026-08-25').times.maghrib!;
    expect(Math.abs(last - first)).toBeLessThan(6);
  });

  it('puts Zohor within a few minutes of local solar noon', () => {
    // Batam is at 104.03°E; WIB is referenced to 105°E, so solar noon falls
    // about four minutes after twelve, give or take the equation of time.
    const { times } = at('2026-08-24');
    expect(Math.abs(times.dhuhr! - mins('12:04'))).toBeLessThan(12);
  });

  it('agrees with JAKIM for Kuala Lumpur, which publishes its numbers', () => {
    // A location far from its timezone meridian is the case that catches a
    // longitude sign error, which Batam would not.
    const { times } = prayerTimes('2026-08-24', KL, 8);
    expect(Math.abs(times.dhuhr! - mins('13:16'))).toBeLessThan(4);
    expect(Math.abs(times.maghrib! - mins('19:22'))).toBeLessThan(4);
    expect(Math.abs(times.fajr! - mins('05:51'))).toBeLessThan(5);
  });

  it('marks Syuruk as not being a prayer', () => {
    expect(IS_PRAYER.sunrise).toBe(false);
    expect(PRAYER_ORDER.filter((n) => IS_PRAYER[n])).toHaveLength(5);
  });
});

describe('nextPrayer', () => {
  const times = at('2026-08-24');

  it('finds the next one through the day', () => {
    expect(nextPrayer(times, mins('03:00'))?.name).toBe('fajr');
    expect(nextPrayer(times, mins('09:00'))?.name).toBe('dhuhr');
    expect(nextPrayer(times, mins('13:00'))?.name).toBe('asr');
    expect(nextPrayer(times, mins('16:00'))?.name).toBe('maghrib');
    expect(nextPrayer(times, mins('18:30'))?.name).toBe('isha');
  });

  it('never offers Syuruk, which is not one', () => {
    // 05:00 is after Subuh and before sunrise.
    expect(nextPrayer(times, mins('05:00'))?.name).toBe('dhuhr');
  });

  it('rolls to tomorrow after Isyak', () => {
    const next = nextPrayer(times, mins('22:00'));
    expect(next?.name).toBe('fajr');
    expect(next?.tomorrow).toBe(true);
    expect(next!.inMinutes).toBeGreaterThan(0);
    expect(next!.inMinutes).toBeLessThan(9 * 60);
  });

  it('counts down rather than up', () => {
    for (const t of ['00:30', '07:00', '12:30', '17:00', '19:00', '23:30']) {
      const next = nextPrayer(times, mins(t));
      expect(next!.inMinutes, t).toBeGreaterThan(0);
    }
  });
});
