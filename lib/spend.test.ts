import { describe, expect, it } from 'vitest';
import { FOOD_ESTIMATE, ON_THE_DAY_HIGH, ON_THE_DAY_LOW, restOfToday } from './spend';
import { COSTS, MAP_PLACES, requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');
const at = (isoDate: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(
    Date.parse(`${isoDate}T00:00:00Z`) + (h! * 60 + m!) * 60_000 - 7 * 3_600_000,
  );
};

describe('restOfToday', () => {
  it('costs something at the start of a full day', () => {
    const rest = restOfToday(at('2026-08-24', '09:00'), radisson, [], 4);
    expect(rest.empty).toBe(false);
    expect(rest.lowMYR).toBeGreaterThan(0);
    expect(rest.highMYR).toBeGreaterThan(rest.lowMYR);
  });

  it('gets cheaper as you tick things off', () => {
    const now = at('2026-08-24', '09:00');
    const all = restOfToday(now, radisson, [], 4);
    const half = restOfToday(
      now,
      radisson,
      MAP_PLACES.filter((p) => p.day === 4).slice(0, 8).map((p) => p.key),
      4,
    );
    expect(half.highMYR).toBeLessThan(all.highMYR);
  });

  it('gets cheaper as the day runs out', () => {
    const morning = restOfToday(at('2026-08-24', '08:00'), radisson, [], 4);
    const evening = restOfToday(at('2026-08-24', '20:00'), radisson, [], 4);
    expect(evening.highMYR).toBeLessThan(morning.highMYR);
  });

  it('changes when you move — that is the whole point', () => {
    const now = at('2026-08-24', '09:00');
    const fromHotel = restOfToday(now, radisson, [], 4);
    // Standing at the far north of the day's stops rather than at the hotel.
    const fromPinkBeach = restOfToday(now, requirePlace('pinkbeach'), [], 4);
    expect(fromPinkBeach.lowMYR).not.toBe(fromHotel.lowMYR);
  });

  it('does not charge you for a walk', () => {
    // Standing on top of a stop, the first leg is free.
    const rest = restOfToday(at('2026-08-24', '09:00'), requirePlace('gbm'), [], 4);
    const rides = rest.lines.find((l) => l.label.includes('Grab'));
    expect(rides?.detail).toMatch(/km in total/);
  });

  it('adds the holiday surge on the 25th and says so', () => {
    const plain = restOfToday(at('2026-08-24', '09:00'), radisson, [], 4);
    const holiday = restOfToday(at('2026-08-25', '09:00'), radisson, [], 5);
    expect(plain.surge).toBe(false);
    expect(holiday.surge).toBe(true);
  });

  it('only charges an entry fee where one was actually recorded', () => {
    const rest = restOfToday(at('2026-08-24', '09:00'), radisson, [], 4);
    const fees = rest.lines.filter((l) => l.detail === 'entry, two adults');
    // Pink Beach is the only place in the data with a per-head price on it.
    expect(fees).toHaveLength(1);
    expect(fees[0]!.label).toContain('Pink Beach');
    expect(fees[0]!.lowMYR).toBe(24);
  });

  it('is empty once the day is over', () => {
    const rest = restOfToday(at('2026-08-24', '23:30'), radisson, MAP_PLACES.map((p) => p.key), 4);
    expect(rest.empty).toBe(true);
    expect(rest.lowMYR).toBe(0);
  });

  it('always totals its own lines', () => {
    for (const day of [1, 2, 3, 4, 5] as const) {
      const rest = restOfToday(at('2026-08-24', '09:00'), radisson, [], day);
      expect(rest.lowMYR).toBe(rest.lines.reduce((n, l) => n + l.lowMYR, 0));
      expect(rest.highMYR).toBe(rest.lines.reduce((n, l) => n + l.highMYR, 0));
    }
  });

  it('never quotes a price for a named restaurant', () => {
    const rest = restOfToday(at('2026-08-24', '09:00'), radisson, [], 4);
    const foodNames = MAP_PLACES.filter((p) => p.category === 'food').map((p) => p.name);
    for (const line of rest.lines) {
      expect(foodNames, line.label).not.toContain(line.label);
    }
  });
});

describe('the food range stays inside the trip’s own estimate', () => {
  it('does not exceed the RM 400–700 already budgeted', () => {
    const { perHeadLow, perHeadHigh, heads, coursesPerDay } = FOOD_ESTIMATE;
    const days = 5;
    // Breakfast is included at the hotels, so three paid courses a day.
    const paidCourses = coursesPerDay - 1;
    const low = perHeadLow * heads * paidCourses * days;
    const high = perHeadHigh * heads * paidCourses * days;

    const budget = COSTS.onTheDay.find((r) => r.label === 'Food')!;
    expect(low).toBeLessThanOrEqual(budget.highMYR);
    expect(high).toBeGreaterThanOrEqual(budget.lowMYR);
  });

  it('matches the trip totals it is drawn from', () => {
    expect(ON_THE_DAY_LOW).toBe(COSTS.totalLowMYR - COSTS.bookedTotalMYR);
    expect(ON_THE_DAY_HIGH).toBe(COSTS.totalHighMYR - COSTS.bookedTotalMYR);
  });
});
