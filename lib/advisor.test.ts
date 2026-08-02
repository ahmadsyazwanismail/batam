import { describe, expect, it } from 'vitest';
import { advise, travelMinutes, type AdvisorInput } from './advisor';
import { MAP_PLACES, requirePlace } from '@/data/trip';

const radisson = requirePlace('radisson');

/** A WIB wall-clock time on a given day, as the UTC instant it happens at. */
const at = (isoDate: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  const wibMidnight = Date.parse(`${isoDate}T00:00:00Z`);
  return new Date(wibMidnight + (h! * 60 + m!) * 60_000 - 7 * 3_600_000);
};

const ask = (over: Partial<AdvisorInput> & { now: Date }) =>
  advise({ from: radisson, done: [], ...over });

describe('the clock helper is right', () => {
  it('maps WIB wall clock onto the correct instant', () => {
    // 13:00 WIB on 23 Aug is 06:00 UTC.
    expect(at('2026-08-23', '13:00').toISOString()).toBe('2026-08-23T06:00:00.000Z');
  });
});

describe('outside the trip', () => {
  it('says nothing before it starts', () => {
    const advice = ask({ now: at('2026-08-01', '10:00') });
    expect(advice.place).toBeNull();
    expect(advice.reason).toMatch(/has not started/);
  });

  it('says nothing after it ends', () => {
    const advice = ask({ now: at('2026-08-30', '10:00') });
    expect(advice.place).toBeNull();
    expect(advice.reason).toMatch(/over/);
  });
});

describe('Pink Beach is never suggested before 12:30', () => {
  it('holds at every half hour of the morning', () => {
    for (const time of ['08:00', '09:00', '10:00', '11:00', '12:00', '12:29']) {
      const advice = ask({ now: at('2026-08-24', time) });
      expect(advice.place?.key, `at ${time}`).not.toBe('pinkbeach');
    }
  });

  it('is at least eligible once it opens', () => {
    // Standing right next to it, in the cool of the late afternoon, with
    // everything else on the line already done.
    const pinkbeach = requirePlace('pinkbeach');
    const done = MAP_PLACES.filter((p) => p.key !== 'pinkbeach').map((p) => p.key);
    const advice = advise({
      now: at('2026-08-24', '16:30'),
      from: pinkbeach,
      done,
    });
    expect(advice.place?.key).toBe('pinkbeach');
  });
});

describe('the nap is protected', () => {
  it('never suggests a drive between 13:00 and 15:00', () => {
    for (const time of ['13:00', '13:30', '14:00', '14:45']) {
      const advice = ask({ now: at('2026-08-24', time) });
      if (advice.place) {
        // Anything suggested has to be within a few minutes on foot.
        expect(advice.km, `at ${time}: ${advice.place.name}`).toBeLessThan(0.8);
      }
    }
  });

  it('is happy to suggest a drive at 15:30', () => {
    const advice = ask({ now: at('2026-08-24', '15:30') });
    expect(advice.place).not.toBeNull();
  });
});

describe('the last day', () => {
  it('sends them to the terminal after 15:00', () => {
    const advice = ask({ now: at('2026-08-25', '15:00') });
    expect(advice.place).toBeNull();
    expect(advice.reason).toMatch(/Harbour Bay/);
    expect(advice.reason).toMatch(/4:30 pm/);
  });

  it('never suggests anything that cannot be finished by 15:00', () => {
    for (const time of ['12:00', '13:30', '14:00', '14:30']) {
      const advice = ask({ now: at('2026-08-25', time) });
      if (!advice.place) continue;
      const [h, m] = time.split(':').map(Number);
      const start = h! * 60 + m!;
      // Getting there plus an hour has to land before the cutoff.
      expect(start + travelMinutes(advice.km) + 60, `at ${time}`).toBeLessThanOrEqual(
        15 * 60,
      );
    }
  });

  it('prices the Grab with the holiday surge', () => {
    const plain = ask({ now: at('2026-08-24', '09:00') });
    const holiday = ask({ now: at('2026-08-25', '09:00') });
    if (plain.place && plain.verdict.mode === 'grab') {
      expect(plain.verdict.fare.surge).toBe(false);
    }
    if (holiday.place && holiday.verdict.mode === 'grab') {
      expect(holiday.verdict.fare.surge).toBe(true);
    }
  });
});

describe('heat and dark', () => {
  it('does not send them outdoors in the middle of the day', () => {
    for (const time of ['11:00', '12:00', '15:30']) {
      const advice = ask({ now: at('2026-08-23', time) });
      if (advice.place) {
        expect(
          ['beach', 'land', 'dino'].includes(advice.place.category),
          `at ${time}: ${advice.place.name}`,
        ).toBe(false);
      }
    }
  });

  it('prefers indoors after 18:00', () => {
    const advice = ask({ now: at('2026-08-24', '19:00') });
    expect(advice.place).not.toBeNull();
    expect(['shop', 'spa', 'food', 'hotel']).toContain(advice.place!.category);
  });

  it('prefers indoors when it is raining', () => {
    const advice = ask({ now: at('2026-08-24', '09:00'), raining: true });
    expect(advice.place).not.toBeNull();
    expect(['beach', 'land', 'dino']).not.toContain(advice.place!.category);
  });
});

describe('what it recommends', () => {
  it('gives exactly one place, never a list', () => {
    const advice = ask({ now: at('2026-08-23', '09:00') });
    expect(advice.place).not.toBeNull();
    expect(Array.isArray(advice.place)).toBe(false);
  });

  it('says why, in one sentence', () => {
    const advice = ask({ now: at('2026-08-23', '09:00') });
    expect(advice.reason).toMatch(/ is .* and open — /);
    expect(advice.reason.split('. ').length).toBeLessThanOrEqual(2);
  });

  it('prefers today’s line', () => {
    const advice = ask({ now: at('2026-08-23', '09:00') });
    expect(advice.place?.day).toBe(3);
  });

  it('stops recommending what has been ticked off', () => {
    let done: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < 6; i += 1) {
      const advice = advise({ now: at('2026-08-23', '09:00'), from: radisson, done });
      if (!advice.place) break;
      expect(seen.has(advice.place.key), 'repeated a suggestion').toBe(false);
      seen.add(advice.place.key);
      done = [...done, advice.place.key];
    }

    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('never suggests a hotel or the ferry terminal', () => {
    for (const day of ['2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24']) {
      for (const time of ['08:00', '11:00', '16:00', '19:00']) {
        const advice = ask({ now: at(day, time) });
        if (advice.place) {
          expect(['hotel', 'ferry']).not.toContain(advice.place.category);
        }
      }
    }
  });

  it('runs out gracefully when everything is done', () => {
    const advice = advise({
      now: at('2026-08-23', '09:00'),
      from: radisson,
      done: MAP_PLACES.map((p) => p.key),
    });
    expect(advice.place).toBeNull();
    expect(advice.reason.length).toBeGreaterThan(10);
  });
});

describe('travelMinutes', () => {
  it('walks the short ones', () => {
    expect(travelMinutes(0.5)).toBe(7);
    expect(travelMinutes(1.2)).toBe(17);
  });

  it('drives the long ones, with a wait for the car', () => {
    expect(travelMinutes(12)).toBe(35);
    expect(travelMinutes(2)).toBeGreaterThan(5);
  });

  it('never returns less than two minutes', () => {
    expect(travelMinutes(0)).toBe(2);
  });
});
