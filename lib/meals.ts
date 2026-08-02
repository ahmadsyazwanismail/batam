import {
  BOOKINGS,
  dayById,
  requirePlace,
  type DayId,
  type MinutesOfDay,
  type Place,
} from '@/data/trip';
import { runningOrder } from './route';

/**
 * The day as four courses.
 *
 * Twenty of the thirty-eight places are food. The trip is a food trip, so the
 * day is structured the way the day is actually structured — sarapan, makan
 * tengahari, minum petang, makan malam — and everything that is not food slots
 * between the meals, which is honestly how you move around.
 *
 * Nothing here is invented. No place in the data says which meal it is for, so
 * a slot is *derived* from real signals in a fixed order of precedence, and the
 * screen says it is a suggestion. See `assignMeal` for the rules.
 */

export type MealKey = 'sarapan' | 'tengahari' | 'petang' | 'malam';

export interface Meal {
  readonly key: MealKey;
  /** What you would say out loud. */
  readonly name: string;
  readonly english: string;
  /** Roughly when, in WIB minutes. Used for ordering, not as a booking. */
  readonly from: MinutesOfDay;
  readonly to: MinutesOfDay;
  /** The fill: chips, pins, the swatch beside a course. */
  readonly colour: string;
  /** Text *on* that fill — ink on the light meals, white on the dark ones. */
  readonly onColour: string;
  /**
   * The same meal, dark enough to be read as text on paper. Sarapan amber is
   * 2.1:1 and petang green 2.9:1, so both need a darkened sibling — the same
   * problem the day colours had. `meals.test.ts` holds all four to the bar.
   */
  readonly textColour: string;
}

const INK = '#2A1A10';

export const MEALS: readonly Meal[] = [
  {
    key: 'sarapan',
    name: 'Sarapan',
    english: 'Breakfast',
    from: 7 * 60,
    to: 9 * 60 + 30,
    colour: '#E39B3C',
    onColour: INK,
    textColour: '#916326',
  },
  {
    key: 'tengahari',
    name: 'Makan tengahari',
    english: 'Lunch',
    from: 12 * 60,
    to: 14 * 60,
    colour: '#C2410C',
    onColour: '#FFFFFF',
    textColour: '#C2410C',
  },
  {
    key: 'petang',
    name: 'Minum petang',
    english: 'Tea',
    from: 15 * 60 + 30,
    to: 17 * 60 + 30,
    colour: '#7E9A4E',
    onColour: INK,
    textColour: '#60753B',
  },
  {
    key: 'malam',
    name: 'Makan malam',
    english: 'Dinner',
    from: 19 * 60,
    to: 21 * 60,
    colour: '#6B4A8C',
    onColour: '#FFFFFF',
    textColour: '#6B4A8C',
  },
];

export function mealByKey(key: MealKey): Meal {
  const meal = MEALS.find((m) => m.key === key);
  if (!meal) throw new Error(`No meal "${key}"`);
  return meal;
}

// ---------------------------------------------------------------------------
// Deriving a slot
// ---------------------------------------------------------------------------

/** Sweet things you eat standing up at four in the afternoon. */
const TEA_WORDS = /cake|bake|patisserie|brownie|donut|kue|matcha|layer/i;
/** Things you sit down for after dark. */
const DINNER_WORDS = /seafood|bakar|night/i;
/** Nasi padang is a lunch. You point at the dishes and they come to the table. */
const LUNCH_WORDS = /nasi padang|padang/i;

/**
 * Which course a place belongs to, and why.
 *
 * Precedence, highest first — each rule only fires on something actually
 * recorded in the data:
 *
 * 1. **Opens at or before 07:00.** Morning Bakery opens at six; that is a
 *    breakfast, whatever else it might be.
 * 2. **The note says morning.** Alya Layer Cakes says "order am".
 * 3. **The note names something sweet.** Pumpkin donuts and salted cream
 *    matcha are tea, not lunch.
 * 4. **The note says nasi padang.** That is a lunch, everywhere.
 * 5. **The note names something you eat at night.** Seafood, ikan bakar.
 * 6. **Opens after midday.** It cannot be breakfast.
 * 7. Otherwise it falls to lunch or dinner, alternating in route order so a
 *    day does not stack five restaurants into one sitting.
 */
export function assignMeal(place: Place, indexAmongUnassigned: number): {
  meal: MealKey;
  reason: string;
} {
  const note = place.note;

  if (place.opening && place.opening.opens <= 7 * 60) {
    return { meal: 'sarapan', reason: 'opens early' };
  }
  if (/\bam\b/i.test(note)) {
    return { meal: 'sarapan', reason: 'order in the morning' };
  }
  if (TEA_WORDS.test(note) || TEA_WORDS.test(place.name)) {
    return { meal: 'petang', reason: 'sweet' };
  }
  if (LUNCH_WORDS.test(note) || LUNCH_WORDS.test(place.name)) {
    return { meal: 'tengahari', reason: 'nasi padang' };
  }
  if (DINNER_WORDS.test(note) || DINNER_WORDS.test(place.name)) {
    return { meal: 'malam', reason: 'an evening sort of meal' };
  }
  if (place.opening && place.opening.opens >= 12 * 60) {
    return { meal: 'malam', reason: 'not open until the afternoon' };
  }
  return indexAmongUnassigned % 2 === 0
    ? { meal: 'tengahari', reason: 'on today’s route' }
    : { meal: 'malam', reason: 'on today’s route' };
}

export interface Course {
  readonly meal: Meal;
  readonly places: readonly { place: Place; reason: string }[];
  /** Set on breakfast when the hotel booking includes it — this one is a fact. */
  readonly included?: string;
}

export interface DayMenu {
  readonly day: DayId;
  /** The four courses, always all four, in order. Some may be empty. */
  readonly courses: readonly Course[];
  /** Everything on the day that is not a meal: malls, spas, the beach, dinosaurs. */
  readonly between: readonly Place[];
}

export function dayMenu(day: DayId): DayMenu {
  const stations = runningOrder(day);
  const ordered = stations.map((s) => s.place);

  const food = ordered.filter((p) => p.category === 'food');
  const between = ordered.filter(
    (p) => p.category !== 'food' && p.category !== 'hotel' && p.category !== 'ferry',
  );

  const buckets: Record<MealKey, { place: Place; reason: string }[]> = {
    sarapan: [],
    tengahari: [],
    petang: [],
    malam: [],
  };

  let fallbackIndex = 0;
  for (const place of food) {
    const { meal, reason } = assignMeal(place, fallbackIndex);
    if (reason === 'on today’s route') fallbackIndex += 1;
    buckets[meal].push({ place, reason });
  }

  // Breakfast is included at both hotels — that is in the booking, not a guess.
  //
  // But it is eaten at the hotel you *slept* in, which is the previous day's
  // base, not today's. On the 22nd you wake at the Harris and check out after
  // breakfast, even though the 22nd is a Radisson day. Day one has none at all:
  // you are on a ferry until ten.
  const sleptAt = day === 1 ? undefined : requirePlace(dayById((day - 1) as DayId).base);
  const booking = sleptAt
    ? BOOKINGS.find(
        (b) => b.hotel === sleptAt.key && b.room.toLowerCase().includes('breakfast'),
      )
    : undefined;

  return {
    day,
    between,
    courses: MEALS.map((meal) => ({
      meal,
      places: buckets[meal.key],
      ...(meal.key === 'sarapan' && booking && sleptAt
        ? { included: `Included at ${sleptAt.name}` }
        : {}),
    })),
  };
}

/** Which course is happening at this moment, if any. */
export function currentMeal(minutes: MinutesOfDay): Meal | null {
  return MEALS.find((m) => minutes >= m.from && minutes <= m.to) ?? null;
}

/** The next course due after this moment. */
export function nextMeal(minutes: MinutesOfDay): Meal | null {
  return MEALS.find((m) => m.from > minutes) ?? null;
}
