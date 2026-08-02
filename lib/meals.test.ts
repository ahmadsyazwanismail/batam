import { describe, expect, it } from 'vitest';
import { MEALS, assignMeal, currentMeal, dayMenu, nextMeal } from './meals';
import { DAYS, MAP_PLACES, requirePlace, type DayId } from '@/data/trip';
import { AA_NORMAL, contrastRatio } from './contrast';

const mins = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

describe('the four courses', () => {
  it('runs in order and never overlaps', () => {
    for (let i = 1; i < MEALS.length; i += 1) {
      expect(MEALS[i]!.from).toBeGreaterThan(MEALS[i - 1]!.to);
    }
  });

  it('is named the way you would say it', () => {
    expect(MEALS.map((m) => m.name)).toEqual([
      'Sarapan',
      'Makan tengahari',
      'Minum petang',
      'Makan malam',
    ]);
  });
});

describe('assignMeal', () => {
  it('puts an early opener at breakfast', () => {
    // Morning Bakery opens at six.
    expect(assignMeal(requirePlace('mornbakery'), 0).meal).toBe('sarapan');
  });

  it('reads "order am" as breakfast', () => {
    const alya = requirePlace('alya');
    expect(alya.note).toContain('order am');
    expect(assignMeal(alya, 0).meal).toBe('sarapan');
  });

  it('sorts the sweet things into tea', () => {
    for (const key of ['maru', 'mula', 'amanda'] as const) {
      expect(assignMeal(requirePlace(key), 0).meal, key).toBe('petang');
    }
  });

  it('sends seafood and ikan bakar to dinner', () => {
    expect(assignMeal(requirePlace('loveseafood'), 0).meal).toBe('malam');
    expect(assignMeal(requirePlace('ikanbakar'), 0).meal).toBe('malam');
  });

  it('never puts an afternoon-only place at breakfast', () => {
    expect(assignMeal(requirePlace('pinkbeach'), 0).meal).not.toBe('sarapan');
  });

  it('alternates whatever is left, so a day does not stack into one sitting', () => {
    // Bandoeng's note is just "Sundanese" — no signal either way, so it falls
    // through to the alternation.
    const bandoeng = requirePlace('bandoeng');
    expect(assignMeal(bandoeng, 0).meal).toBe('tengahari');
    expect(assignMeal(bandoeng, 1).meal).toBe('malam');
  });

  it('always says why', () => {
    for (const place of MAP_PLACES.filter((p) => p.category === 'food')) {
      expect(assignMeal(place, 0).reason.length, place.key).toBeGreaterThan(3);
    }
  });
});

describe('dayMenu', () => {
  it('gives every day all four courses, in order', () => {
    for (const day of DAYS) {
      const menu = dayMenu(day.id);
      expect(menu.courses).toHaveLength(4);
      expect(menu.courses.map((c) => c.meal.key)).toEqual([
        'sarapan',
        'tengahari',
        'petang',
        'malam',
      ]);
    }
  });

  it('accounts for every food place on the day, exactly once', () => {
    for (const day of DAYS) {
      const menu = dayMenu(day.id);
      const placed = menu.courses.flatMap((c) => c.places.map((p) => p.place.key));
      const food = MAP_PLACES.filter(
        (p) => p.day === day.id && p.category === 'food',
      ).map((p) => p.key);

      expect(new Set(placed).size, `day ${day.id}`).toBe(placed.length);
      expect([...placed].sort(), `day ${day.id}`).toEqual([...food].sort());
    }
  });

  it('never puts a hotel or the terminal in a course or in between', () => {
    for (const day of DAYS) {
      const menu = dayMenu(day.id);
      const all = [
        ...menu.courses.flatMap((c) => c.places.map((p) => p.place)),
        ...menu.between,
      ];
      for (const place of all) {
        expect(['hotel', 'ferry']).not.toContain(place.category);
      }
    }
  });

  it('puts everything that is not food in "between"', () => {
    const menu = dayMenu(4);
    const keys = menu.between.map((p) => p.key);
    expect(keys).toContain('gbm');
    expect(keys).toContain('dinogate');
    expect(keys).toContain('pinkbeach');
    expect(keys).not.toContain('ranahminang');
  });

  it('puts breakfast at the hotel you slept in, not today’s base', () => {
    // Day one you are on a ferry until ten — there is no hotel breakfast.
    expect(dayMenu(1).courses[0]!.included).toBeUndefined();
    // Day two you wake at the Harris and check out after eating, even though
    // the 22nd is a Radisson day.
    expect(dayMenu(2).courses[0]!.included).toContain('Harris');
    for (const day of [3, 4, 5] as const) {
      expect(dayMenu(day).courses[0]!.included, `day ${day}`).toContain('Radisson');
    }
  });

  it('treats nasi padang as lunch', () => {
    for (const day of DAYS) {
      for (const course of dayMenu(day.id).courses) {
        for (const { place } of course.places) {
          if (/padang/i.test(place.note) || /padang/i.test(place.name)) {
            expect(course.meal.key, place.name).toBe('tengahari');
          }
        }
      }
    }
  });

  it('keeps the last day light — there is a ferry to catch', () => {
    const menu = dayMenu(5);
    const total = menu.courses.reduce((n, c) => n + c.places.length, 0);
    expect(total).toBeLessThanOrEqual(2);
  });

  it('rejects a day that does not exist without throwing', () => {
    expect(() => dayMenu(9 as DayId)).toThrow();
  });
});

describe('currentMeal and nextMeal', () => {
  it('knows when you are in one', () => {
    expect(currentMeal(mins('12:30'))?.key).toBe('tengahari');
    expect(currentMeal(mins('08:00'))?.key).toBe('sarapan');
    expect(currentMeal(mins('19:30'))?.key).toBe('malam');
  });

  it('knows when you are between them', () => {
    expect(currentMeal(mins('10:30'))).toBeNull();
    expect(currentMeal(mins('14:30'))).toBeNull();
  });

  it('points at the next one', () => {
    expect(nextMeal(mins('06:00'))?.key).toBe('sarapan');
    expect(nextMeal(mins('10:30'))?.key).toBe('tengahari');
    expect(nextMeal(mins('14:30'))?.key).toBe('petang');
    expect(nextMeal(mins('18:00'))?.key).toBe('malam');
  });

  it('has nothing left after dinner', () => {
    expect(nextMeal(mins('22:00'))).toBeNull();
  });
});

describe('meal colours', () => {
  const GROUND = '#FBF3E6';
  const CARD = '#FFFDF8';

  it('reads as text on paper and on card', () => {
    for (const meal of MEALS) {
      for (const bg of [GROUND, CARD]) {
        expect(
          contrastRatio(meal.textColour, bg),
          `${meal.name} on ${bg}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it('reads on its own fill', () => {
    for (const meal of MEALS) {
      expect(
        contrastRatio(meal.onColour, meal.colour),
        meal.name,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('shows why sarapan and petang need a darkened sibling at all', () => {
    const sarapan = MEALS[0]!;
    const petang = MEALS[2]!;
    expect(contrastRatio(sarapan.colour, GROUND)).toBeLessThan(AA_NORMAL);
    expect(contrastRatio(petang.colour, GROUND)).toBeLessThan(AA_NORMAL);
  });

  it('gives each course its own colour', () => {
    expect(new Set(MEALS.map((m) => m.colour)).size).toBe(MEALS.length);
  });
});
